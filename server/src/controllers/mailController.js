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
    subject, body, template = 'raw', senderIdentity = 'updates',
    recipientEmails = [], roles = [], sourceType = 'manual_selection',
  } = req.body;

  if (!subject || !body) {
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

  // Add individually specified emails
  recipientEmails.forEach((email) => {
    const trimmed = (email || '').trim().toLowerCase();
    if (trimmed && EMAIL_REGEX.test(trimmed) && !recipientMap.has(trimmed)) {
      recipientMap.set(trimmed, { email: trimmed, name: '' });
    }
  });

  const recipients = Array.from(recipientMap.values());
  if (recipients.length === 0) {
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
    totalRecipients: recipients.length,
    pendingCount: recipients.length,
  });

  // Bulk-insert all recipients
  const recipientDocs = recipients.map((r) => ({
    jobId: job._id,
    email: r.email,
    name: r.name,
    status: 'pending',
  }));
  await BulkEmailRecipient.insertMany(recipientDocs, { ordered: false });

  logger.info(`[Mail] Bulk email job ${job._id} created by ${req.user.email} with ${recipients.length} recipients`);

  // Fire off the worker (non-blocking)
  setImmediate(() => processJob(job._id));

  res.status(201).json({
    success: true,
    message: `Bulk email job created with ${recipients.length} recipients`,
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
      const email = (entry || '').trim().toLowerCase();
      if (!email) continue;

      if (!EMAIL_REGEX.test(email)) {
        invalid.push(email);
        continue;
      }

      if (seen.has(email)) {
        duplicateCount++;
        continue;
      }

      seen.add(email);
      valid.push(email);
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

  // Try to detect if first line is a header
  const firstLine = lines[0]?.trim().toLowerCase();
  const startIndex = (firstLine === 'email' || firstLine === 'emails' || firstLine.includes('email')) ? 1 : 0;

  for (let i = startIndex; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Split by comma, semicolon, or tab
    const parts = line.split(/[,;\t]/);
    for (const part of parts) {
      const cleaned = part.trim().replace(/^["']|["']$/g, ''); // Remove quotes
      if (EMAIL_REGEX.test(cleaned)) {
        emails.push(cleaned);
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

  // Find the email column
  let emailColIndex = -1;
  const headerRow = sheet.getRow(1);

  headerRow.eachCell((cell, colNumber) => {
    const val = (cell.value || '').toString().toLowerCase().trim();
    if (val === 'email' || val === 'e-mail' || val === 'email address' || val === 'emailaddress') {
      emailColIndex = colNumber;
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

  if (emailColIndex === -1) return emails;

  // Start from row 2 if header was identified, else row 1
  const startRow = headerRow.getCell(emailColIndex).value &&
    !EMAIL_REGEX.test((headerRow.getCell(emailColIndex).value || '').toString().trim())
    ? 2 : 1;

  for (let i = startRow; i <= sheet.rowCount; i++) {
    const cell = sheet.getRow(i).getCell(emailColIndex);
    const val = (cell.value || '').toString().trim();
    if (val) emails.push(val);
  }

  return emails;
}
