const BulkEmailJob = require('../models/BulkEmailJob');
const BulkEmailRecipient = require('../models/BulkEmailRecipient');
const User = require('../models/User');
const { SENDER_IDENTITIES } = require('../services/mailService');
const { processJob, syncJobCounts } = require('../services/bulkEmailWorker');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../middleware/AppError');
const logger = require('../utils/logger');
const multer = require('multer');
const ExcelJS = require('exceljs');
const path = require('path');
const fs = require('fs');

// ─── Multer config for file uploads ───────────────────────────────────────────
const upload = multer({
  dest: path.join(__dirname, '../../uploads/temp'),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (req, file, cb) => {
    const allowedMimes = [
      'text/csv',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'application/csv',
      'text/plain',
    ];
    if (allowedMimes.includes(file.mimetype) || /\.(csv|xlsx|xls)$/i.test(file.originalname)) {
      cb(null, true);
    } else {
      cb(new AppError('Only CSV, XLSX, and XLS files are allowed', 400, 'INVALID_FILE_TYPE'));
    }
  },
});

// ─── Email validation regex ───────────────────────────────────────────────────
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ─── POST /api/mail/jobs — Create a new bulk email job ────────────────────────
exports.createBulkEmailJob = asyncHandler(async (req, res) => {
  const {
    subject, body = '', template = 'raw', senderIdentity = 'updates',
    recipients = [], roles = [], sourceType = 'manual_selection', // using renamed `recipients` array
  } = req.body;

  if (!subject || (!body && template !== 'club')) {
    throw new AppError('Subject and body are required', 400, 'MISSING_FIELDS');
  }
  if (!SENDER_IDENTITIES[senderIdentity]) {
    throw new AppError('Invalid sender identity', 400, 'INVALID_SENDER');
  }

  // Build deduplicated recipient list
  const recipientMap = new Map();

  // Add users from selected roles
  if (roles.length > 0) {
    const users = await User.find({ role: { $in: roles }, isActive: true }).select('email name');
    users.forEach((u) => recipientMap.set(u.email.toLowerCase(), { email: u.email.toLowerCase(), name: u.name }));
  }

  // Add individually specified users mapping
  recipients.forEach((r) => {
    // Handling case where old format array of strings is sent
    const emailStr = typeof r === 'string' ? r : r.email;
    const name = typeof r === 'string' ? '' : (r.name || '');
    const college = typeof r === 'string' ? '' : (r.college || '');
    const department = typeof r === 'string' ? '' : (r.department || '');
    const clubName = typeof r === 'string' ? '' : (r.clubName || '');

    const trimmed = (emailStr || '').trim().toLowerCase();
    if (trimmed && EMAIL_REGEX.test(trimmed) && !recipientMap.has(trimmed)) {
      recipientMap.set(trimmed, { email: trimmed, name, college, department, clubName });
    }
  });

  const finalRecipients = Array.from(recipientMap.values());
  if (finalRecipients.length === 0) {
    throw new AppError('No valid recipients specified', 400, 'NO_RECIPIENTS');
  }

  // Create the job
  const job = await BulkEmailJob.create({
    createdBy: req.user.id,
    senderIdentity,
    subject,
    body,
    template,
    sourceType,
    totalRecipients: finalRecipients.length,
    pendingCount: finalRecipients.length,
  });

  // Bulk-insert all recipients
  const recipientDocs = finalRecipients.map((r) => ({
    jobId: job._id,
    email: r.email,
    name: r.name,
    college: r.college,
    department: r.department,
    clubName: r.clubName,
    status: 'pending',
  }));
  await BulkEmailRecipient.insertMany(recipientDocs, { ordered: false });

  logger.info(`[Mail] Bulk email job ${job._id} created by ${req.user.email} with ${finalRecipients.length} recipients`);

  // Fire off the worker (non-blocking)
  setImmediate(() => processJob(job._id));

  res.status(201).json({
    success: true,
    message: `Bulk email job created with ${finalRecipients.length} recipients`,
    data: { jobId: job._id },
  });
});

// ─── GET /api/mail/jobs — List all jobs ───────────────────────────────────────
exports.getJobs = asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(50, parseInt(req.query.limit) || 20);
  const skip = (page - 1) * limit;

  const [jobs, total] = await Promise.all([
    BulkEmailJob.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('createdBy', 'name email')
      .lean(),
    BulkEmailJob.countDocuments(),
  ]);

  res.json({
    success: true,
    data: { jobs, total, page, pages: Math.ceil(total / limit) },
  });
});

// ─── GET /api/mail/jobs/:jobId — Job detail with recipient breakdown ─────────
exports.getJobDetail = asyncHandler(async (req, res) => {
  const job = await BulkEmailJob.findById(req.params.jobId)
    .populate('createdBy', 'name email')
    .lean();

  if (!job) throw new AppError('Job not found', 404, 'JOB_NOT_FOUND');

  // Get recent failures for display
  const recentFailures = await BulkEmailRecipient.find({ jobId: job._id, status: 'failed' })
    .sort({ updatedAt: -1 })
    .limit(50)
    .select('email errorMessage retryCount updatedAt')
    .lean();

  // Get status breakdown
  const statusBreakdown = await BulkEmailRecipient.aggregate([
    { $match: { jobId: job._id } },
    { $group: { _id: '$status', count: { $sum: 1 } } },
  ]);

  const counts = { pending: 0, processing: 0, sent: 0, failed: 0 };
  statusBreakdown.forEach((row) => {
    if (counts.hasOwnProperty(row._id)) counts[row._id] = row.count;
  });

  res.json({
    success: true,
    data: {
      job: { ...job, liveCounts: counts },
      recentFailures,
    },
  });
});

// ─── POST /api/mail/jobs/:jobId/retry — Retry failed recipients ──────────────
exports.retryFailedRecipients = asyncHandler(async (req, res) => {
  const job = await BulkEmailJob.findById(req.params.jobId);
  if (!job) throw new AppError('Job not found', 404, 'JOB_NOT_FOUND');

  if (['processing', 'queued'].includes(job.status)) {
    throw new AppError('Job is still processing, cannot retry yet', 400, 'JOB_STILL_PROCESSING');
  }

  // Reset failed recipients to pending
  const result = await BulkEmailRecipient.updateMany(
    { jobId: job._id, status: 'failed' },
    { status: 'pending', errorMessage: '' }
  );

  if (result.modifiedCount === 0) {
    throw new AppError('No failed recipients to retry', 400, 'NO_FAILED_RECIPIENTS');
  }

  // Update job status back to queued
  await BulkEmailJob.updateOne(
    { _id: job._id },
    { status: 'queued' }
  );
  await syncJobCounts(job._id);

  logger.info(`[Mail] Retrying ${result.modifiedCount} failed recipients for job ${job._id}`);

  // Fire off the worker
  setImmediate(() => processJob(job._id));

  res.json({
    success: true,
    message: `Retrying ${result.modifiedCount} failed recipients`,
    data: { retriedCount: result.modifiedCount },
  });
});

// ─── POST /api/mail/jobs/:jobId/cancel — Cancel a running job ─────────────────
exports.cancelJob = asyncHandler(async (req, res) => {
  const job = await BulkEmailJob.findById(req.params.jobId);
  if (!job) throw new AppError('Job not found', 404, 'JOB_NOT_FOUND');

  if (['completed', 'failed', 'cancelled'].includes(job.status)) {
    throw new AppError(`Cannot cancel a job with status "${job.status}"`, 400, 'INVALID_STATUS');
  }

  await BulkEmailJob.updateOne({ _id: job._id }, { status: 'cancelled' });

  // Reset any "processing" recipients back to pending so state is clean
  await BulkEmailRecipient.updateMany(
    { jobId: job._id, status: 'processing' },
    { status: 'pending' }
  );
  await syncJobCounts(job._id);

  logger.info(`[Mail] Job ${job._id} cancelled by ${req.user.email}`);

  res.json({ success: true, message: 'Job cancelled' });
});

// ─── POST /api/mail/upload-recipients — Parse CSV/Excel for recipient preview ─
exports.uploadMiddleware = upload.single('file');

exports.uploadRecipients = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new AppError('No file uploaded', 400, 'NO_FILE');
  }

  const filePath = req.file.path;
  const originalName = req.file.originalname.toLowerCase();

  try {
    let emails = [];

    if (originalName.endsWith('.csv') || originalName.endsWith('.txt')) {
      emails = await parseCSV(filePath);
    } else if (originalName.endsWith('.xlsx') || originalName.endsWith('.xls')) {
      emails = await parseExcel(filePath);
    } else {
      throw new AppError('Unsupported file format', 400, 'UNSUPPORTED_FORMAT');
    }

    // Validate & deduplicate
    const seen = new Set();
    const valid = [];
    const invalid = [];
    let duplicateCount = 0;

    for (const entry of emails) {
      const emailObj = typeof entry === 'string' ? { email: entry } : entry;
      const email = (emailObj.email || '').trim().toLowerCase();
      if (!email) continue;

      if (!EMAIL_REGEX.test(email)) {
        invalid.push(typeof entry === 'string' ? entry : (entry.email || 'Unknown'));
        continue;
      }

      if (seen.has(email)) {
        duplicateCount++;
        continue;
      }

      seen.add(email);
      valid.push({
        email,
        name: typeof emailObj.name === 'string' ? emailObj.name.trim() : '',
        college: typeof emailObj.college === 'string' ? emailObj.college.trim() : '',
        department: typeof emailObj.department === 'string' ? emailObj.department.trim() : '',
        clubName: typeof emailObj.clubName === 'string' ? emailObj.clubName.trim() : ''
      });
    }

    res.json({
      success: true,
      data: {
        validEmails: valid,
        invalidEmails: invalid,
        validCount: valid.length,
        invalidCount: invalid.length,
        duplicateCount,
        totalParsed: emails.length,
      },
    });
  } finally {
    // Clean up temp file
    try { fs.unlinkSync(filePath); } catch { /* ignore */ }
  }
});

// ─── GET /api/mail/recipients — User search for picker (unchanged) ────────────
exports.getRecipients = asyncHandler(async (req, res) => {
  const { role, search } = req.query;
  const filter = { isActive: true };

  if (role) filter.role = role;
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
    ];
  }

  const users = await User.find(filter).select('name email role').sort({ name: 1 }).limit(200);
  res.json({ success: true, data: users });
});

// ─── GET /api/mail/sender-identities — Available senders ──────────────────────
exports.getSenderIdentities = asyncHandler(async (req, res) => {
  const identities = Object.entries(SENDER_IDENTITIES).map(([key, value]) => {
    // Extract display name and email from "Name <email>" format
    const match = value.match(/^(.+?)\s*<(.+)>$/);
    return {
      key,
      label: match ? match[1].trim() : key,
      email: match ? match[2] : value,
    };
  });
  res.json({ success: true, data: identities });
});

// ─── File Parsing Helpers ─────────────────────────────────────────────────────

async function parseCSV(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split(/\r?\n/);
  const emails = [];

  if (lines.length === 0) return emails;

  const headerRow = lines[0].toLowerCase().split(/[,;\t]/).map(h => h.trim().replace(/^["']|["']$/g, ''));
  
  let emailColIndex = headerRow.findIndex(h => h === 'email' || h === 'emails' || h.includes('email'));
  let nameColIndex = headerRow.findIndex(h => h === 'name' || h === 'full name' || h === 'fullname' || h === 'recipient name');
  let collegeColIndex = headerRow.findIndex(h => h === 'college' || h === 'college name' || h.includes('college'));
  let departmentColIndex = headerRow.findIndex(h => h === 'department' || h === 'department name' || h.includes('department'));
  let clubColIndex = headerRow.findIndex(h => h === 'club' || h === 'club name' || h.includes('club'));
  
  const startIndex = emailColIndex !== -1 ? 1 : 0;

  for (let i = startIndex; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Split by comma, semicolon, or tab
    const parts = line.split(/[,;\t]/);
    
    // If headers exist, try mapping by index
    if (emailColIndex !== -1 && EMAIL_REGEX.test(parts[emailColIndex]?.trim().replace(/^["']|["']$/g, ''))) {
      const email = parts[emailColIndex].trim().replace(/^["']|["']$/g, '');
      const name = nameColIndex !== -1 && parts[nameColIndex] ? parts[nameColIndex].trim().replace(/^["']|["']$/g, '') : '';
      const college = collegeColIndex !== -1 && parts[collegeColIndex] ? parts[collegeColIndex].trim().replace(/^["']|["']$/g, '') : '';
      const department = departmentColIndex !== -1 && parts[departmentColIndex] ? parts[departmentColIndex].trim().replace(/^["']|["']$/g, '') : '';
      const clubName = clubColIndex !== -1 && parts[clubColIndex] ? parts[clubColIndex].trim().replace(/^["']|["']$/g, '') : '';
      emails.push({ email, name, college, department, clubName });
      continue;
    }

    // fallback mapping if it doesn't align with headers or if there are no headers
    for (const part of parts) {
      const cleaned = part.trim().replace(/^["']|["']$/g, ''); // Remove quotes
      if (EMAIL_REGEX.test(cleaned)) {
        emails.push({ email: cleaned, college: '', department: '', clubName: '' });
        break; // take first email match
      }
    }
  }

  return emails;
}

async function parseExcel(filePath) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);

  const emails = [];
  const sheet = workbook.worksheets[0];
  if (!sheet) return emails;

  // Find the required columns
  let emailColIndex = -1;
  let nameColIndex = -1;
  let collegeColIndex = -1;
  let departmentColIndex = -1;
  let clubColIndex = -1;
  const headerRow = sheet.getRow(1);

  headerRow.eachCell((cell, colNumber) => {
    const rawVal = cell.value;
    const val = (rawVal || '').toString().toLowerCase().trim();
    logger.info(`[Mail/Excel] Header col ${colNumber}: rawType=${typeof rawVal} rawVal=${JSON.stringify(rawVal)} → normalized="${val}"`);
    if (
      val === 'email' || val === 'e-mail' || val === 'email address' ||
      val === 'emailaddress' || val === 'department email' || val.includes('email')
    ) {
      if (emailColIndex === -1) emailColIndex = colNumber; // take first match
    } else if (val === 'name' || val === 'full name' || val === 'fullname' || val === 'recipient name') {
      if (nameColIndex === -1) nameColIndex = colNumber;
    } else if (val === 'college' || val === 'college name' || val.includes('college')) {
      if (collegeColIndex === -1) collegeColIndex = colNumber;
    } else if (val === 'department' || val === 'department name' || val.includes('department')) {
      if (departmentColIndex === -1) departmentColIndex = colNumber;
    } else if (val === 'club' || val === 'club name' || val.includes('club')) {
      if (clubColIndex === -1) clubColIndex = colNumber;
    } else {
      logger.warn(`[Mail/Excel] Header col ${colNumber} did NOT match any known field: "${val}"`);
    }
  });

  // If no header match, try to find column with email-like values
  if (emailColIndex === -1) {
    // Check each column in first few rows for email patterns
    for (let col = 1; col <= (headerRow.cellCount || 10); col++) {
      for (let row = 1; row <= Math.min(5, sheet.rowCount); row++) {
        const val = (sheet.getRow(row).getCell(col).value || '').toString();
        if (EMAIL_REGEX.test(val.trim())) {
          emailColIndex = col;
          break;
        }
      }
      if (emailColIndex !== -1) break;
    }
  }

  logger.info(`[Mail/Excel] Detected columns — email:${emailColIndex} name:${nameColIndex} college:${collegeColIndex} dept:${departmentColIndex} club:${clubColIndex} | totalRows:${sheet.rowCount}`);

  if (emailColIndex === -1) return emails;

  // Start from row 2 if header was identified, else row 1
  const startRow = headerRow.getCell(emailColIndex).value &&
    !EMAIL_REGEX.test((headerRow.getCell(emailColIndex).value || '').toString().trim())
    ? 2 : 1;

  const getCellValue = (cell) => {
    if (!cell || !cell.value) return '';
    const v = cell.value;
    // Hyperlink cell: { text: '...', hyperlink: 'mailto:...' }
    if (typeof v === 'object' && v.text) return v.text.toString().trim();
    // Rich text cell: { richText: [{text: '...'}] }
    if (typeof v === 'object' && v.richText) return v.richText.map(r => r.text).join('').trim();
    return v.toString().trim();
  };

  const getEmailValue = (cell) => {
    if (!cell || !cell.value) return '';
    const v = cell.value;
    // Hyperlink mailto: cells store email in hyperlink property
    if (typeof v === 'object' && v.hyperlink) {
      const link = v.hyperlink.toString().replace(/^mailto:/i, '').trim();
      if (EMAIL_REGEX.test(link)) return link;
    }
    return getCellValue(cell);
  };

  for (let i = startRow; i <= sheet.rowCount; i++) {
    const row = sheet.getRow(i);
    const emailCell = row.getCell(emailColIndex);
    const emailVal = getEmailValue(emailCell);

    if (emailVal) {
      const nameVal = nameColIndex !== -1 ? getCellValue(row.getCell(nameColIndex)) : '';
      const collegeVal = collegeColIndex !== -1 ? getCellValue(row.getCell(collegeColIndex)) : '';
      const departmentVal = departmentColIndex !== -1 ? getCellValue(row.getCell(departmentColIndex)) : '';
      const clubVal = clubColIndex !== -1 ? getCellValue(row.getCell(clubColIndex)) : '';

      logger.info(`[Mail/Excel] Row ${i}: email=${emailVal} | name=${nameVal} | college=${collegeVal} | club=${clubVal}`);
      emails.push({ email: emailVal, name: nameVal, college: collegeVal, department: departmentVal, clubName: clubVal });
    }
  }

  return emails;
}
