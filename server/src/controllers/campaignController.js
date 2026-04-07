/**
 * campaignController.js
 *
 * Controls SES bulk email campaigns. Completely separate from mailController.js.
 * Resend flows are untouched. All campaign sends go through SES only.
 */

const EmailCampaign          = require('../models/EmailCampaign');
const EmailCampaignRecipient = require('../models/EmailCampaignRecipient');
const EmailSuppression       = require('../models/EmailSuppression');
const { resolveAudience, estimateAudienceCount } = require('../services/audienceResolverService');
const { processCampaign, syncCampaignCounts }    = require('../services/sesCampaignWorker');
const { sendTestEmailViaSES, validateForSpam }   = require('../services/sesMailService');
const asyncHandler = require('../utils/asyncHandler');
const AppError     = require('../middleware/AppError');
const logger       = require('../utils/logger');
const multer       = require('multer');
const ExcelJS      = require('exceljs');
const path         = require('path');
const fs           = require('fs');

// ─── Multer config for audience CSV/Excel upload ──────────────────────────────
const upload = multer({
  dest: path.join(__dirname, '../../uploads/temp'),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (/\.(csv|xlsx|xls)$/i.test(file.originalname)) cb(null, true);
    else cb(new AppError('Only CSV/XLSX/XLS files allowed', 400, 'INVALID_FILE_TYPE'));
  },
});

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ─── GET /api/campaigns — List campaigns ─────────────────────────────────────
exports.listCampaigns = asyncHandler(async (req, res) => {
  const page   = Math.max(1, parseInt(req.query.page)  || 1);
  const limit  = Math.min(50, parseInt(req.query.limit) || 20);
  const skip   = (page - 1) * limit;
  const filter = {};

  if (req.query.status) filter.status = req.query.status;
  if (req.query.search) {
    filter.$or = [
      { title:   { $regex: req.query.search, $options: 'i' } },
      { subject: { $regex: req.query.search, $options: 'i' } },
    ];
  }

  const [campaigns, total] = await Promise.all([
    EmailCampaign.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('createdBy', 'name email')
      .lean(),
    EmailCampaign.countDocuments(filter),
  ]);

  res.json({ success: true, data: { campaigns, total, page, pages: Math.ceil(total / limit) } });
});

// ─── POST /api/campaigns — Create draft campaign ──────────────────────────────
exports.createCampaign = asyncHandler(async (req, res) => {
  const {
    title, description = '', subject, fromName, fromEmail, replyTo,
    htmlContent, textContent = '', audienceType, audienceConfig = {}, templateId,
  } = req.body;

  if (!title || !subject || !htmlContent || !audienceType) {
    throw new AppError('title, subject, htmlContent, and audienceType are required', 400, 'MISSING_FIELDS');
  }

  // Validate SES sender domain
  const sesFromEmail = fromEmail || process.env.SES_FROM_EMAIL || '';
  if (!sesFromEmail.endsWith('@contact.lakshyaldce.in') && sesFromEmail) {
    throw new AppError(
      'Bulk campaigns must use the SES verified domain: @contact.lakshyaldce.in',
      400, 'INVALID_SENDER_DOMAIN'
    );
  }

  const spamCheck = validateForSpam(subject, htmlContent);
  if (spamCheck.blocked) {
    throw new AppError(
      `Campaign blocked: ${spamCheck.warnings.join('; ')}`,
      400, 'SPAM_CONTENT_BLOCKED'
    );
  }

  const campaign = await EmailCampaign.create({
    title, description, subject,
    fromName:    fromName || process.env.SES_FROM_NAME || 'Lakshya 2026',
    fromEmail:   sesFromEmail || process.env.SES_FROM_EMAIL || 'updates@contact.lakshyaldce.in',
    replyTo:     replyTo || process.env.MAIL_REPLY_TO || 'contact@lakshyaldce.in',
    htmlContent, textContent,
    audienceType, audienceConfig,
    templateId:  templateId || null,
    createdBy:   req.user.id,
    status:      'draft',
  });

  logger.info(`[Campaign] Draft created: "${title}" by ${req.user.email}`);

  res.status(201).json({
    success: true,
    message: 'Campaign draft created',
    data: { campaign },
    spamWarnings: spamCheck.warnings,
  });
});

// ─── GET /api/campaigns/:id — Campaign detail ─────────────────────────────────
exports.getCampaignDetail = asyncHandler(async (req, res) => {
  const campaign = await EmailCampaign.findById(req.params.id)
    .populate('createdBy', 'name email')
    .populate('templateId', 'name slug')
    .lean();

  if (!campaign) throw new AppError('Campaign not found', 404, 'CAMPAIGN_NOT_FOUND');

  // Live recipient status breakdown
  const breakdown = await EmailCampaignRecipient.aggregate([
    { $match: { campaignId: campaign._id } },
    { $group: { _id: '$status', count: { $sum: 1 } } },
  ]);
  const liveCounts = {
    pending: 0, processing: 0, sent: 0, failed: 0,
    bounced: 0, complained: 0, unsubscribed: 0, suppressed: 0,
  };
  breakdown.forEach((r) => {
    if (Object.prototype.hasOwnProperty.call(liveCounts, r._id)) liveCounts[r._id] = r.count;
  });

  // Recent failures
  const recentFailures = await EmailCampaignRecipient.find({
    campaignId: campaign._id,
    status: { $in: ['failed', 'bounced', 'complained'] },
  })
    .sort({ updatedAt: -1 })
    .limit(50)
    .select('recipientEmail recipientName status failureReason retryCount updatedAt')
    .lean();

  res.json({ success: true, data: { campaign: { ...campaign, liveCounts }, recentFailures } });
});

// ─── PUT /api/campaigns/:id — Update draft campaign ──────────────────────────
exports.updateCampaign = asyncHandler(async (req, res) => {
  const campaign = await EmailCampaign.findById(req.params.id);
  if (!campaign) throw new AppError('Campaign not found', 404, 'CAMPAIGN_NOT_FOUND');

  if (!['draft'].includes(campaign.status)) {
    throw new AppError('Only draft campaigns can be edited', 400, 'CAMPAIGN_NOT_EDITABLE');
  }

  const allowed = [
    'title', 'description', 'subject', 'fromName', 'fromEmail', 'replyTo',
    'htmlContent', 'textContent', 'audienceType', 'audienceConfig', 'templateId',
    'scheduledAt',
  ];
  allowed.forEach((key) => {
    if (req.body[key] !== undefined) campaign[key] = req.body[key];
  });

  if (req.body.htmlContent || req.body.subject) {
    const spamCheck = validateForSpam(campaign.subject, campaign.htmlContent);
    if (spamCheck.blocked) {
      throw new AppError(`Campaign blocked: ${spamCheck.warnings.join('; ')}`, 400, 'SPAM_CONTENT_BLOCKED');
    }
  }

  await campaign.save();
  res.json({ success: true, message: 'Campaign updated', data: { campaign } });
});

// ─── POST /api/campaigns/:id/submit — Resolve audience + trigger worker ───────
exports.submitCampaign = asyncHandler(async (req, res) => {
  const campaign = await EmailCampaign.findById(req.params.id);
  if (!campaign) throw new AppError('Campaign not found', 404, 'CAMPAIGN_NOT_FOUND');

  if (!['draft', 'cancelled'].includes(campaign.status)) {
    throw new AppError(`Cannot submit campaign with status "${campaign.status}"`, 400, 'INVALID_STATUS');
  }

  // Spam check
  const spamCheck = validateForSpam(campaign.subject, campaign.htmlContent);
  if (spamCheck.blocked) {
    throw new AppError(`Spam check failed: ${spamCheck.warnings.join('; ')}`, 400, 'SPAM_CONTENT_BLOCKED');
  }

  // Resolve audience
  logger.info(`[Campaign] Resolving audience for campaign ${campaign._id}...`);
  const recipients = await resolveAudience(campaign.audienceType, campaign.audienceConfig);

  if (recipients.length === 0) {
    throw new AppError('Audience is empty after suppression filtering', 400, 'EMPTY_AUDIENCE');
  }

  // Delete any old recipients (for re-send after cancel)
  await EmailCampaignRecipient.deleteMany({ campaignId: campaign._id });

  // Bulk-insert all recipients
  const recipientDocs = recipients.map((r) => ({
    campaignId:     campaign._id,
    recipientEmail: r.recipientEmail,
    recipientName:  r.recipientName || '',
    userId:         r.userId  || null,
    eventId:        r.eventId || null,
    placeholders:   r.placeholders || {},
    status:         'pending',
    provider:       'ses',
  }));

  await EmailCampaignRecipient.insertMany(recipientDocs, { ordered: false });

  const isScheduled = campaign.scheduledAt && campaign.scheduledAt > new Date();

  await EmailCampaign.updateOne(
    { _id: campaign._id },
    {
      status:           isScheduled ? 'queued' : 'queued',
      totalRecipients:  recipients.length,
      sentCount:        0,
      failedCount:      0,
      bouncedCount:     0,
      complainedCount:  0,
      unsubscribedCount:0,
      suppressedCount:  0,
    }
  );

  logger.info(`[Campaign] ${campaign._id} queued with ${recipients.length} recipients`);

  // Fire the worker (non-blocking) unless scheduled for future
  if (!isScheduled) {
    setImmediate(() => processCampaign(campaign._id));
  }

  res.status(200).json({
    success: true,
    message: isScheduled
      ? `Campaign scheduled for ${campaign.scheduledAt.toISOString()} with ${recipients.length} recipients`
      : `Campaign queued with ${recipients.length} recipients — sending started`,
    data: { campaignId: campaign._id, totalRecipients: recipients.length },
    spamWarnings: spamCheck.warnings,
  });
});

// ─── POST /api/campaigns/:id/test-send — Send test email ─────────────────────
exports.sendTestEmail = asyncHandler(async (req, res) => {
  const campaign = await EmailCampaign.findById(req.params.id);
  if (!campaign) throw new AppError('Campaign not found', 404, 'CAMPAIGN_NOT_FOUND');

  const { toEmail } = req.body;
  if (!toEmail || !EMAIL_REGEX.test(toEmail)) {
    throw new AppError('Valid toEmail is required', 400, 'INVALID_EMAIL');
  }

  await sendTestEmailViaSES(toEmail, campaign.subject, campaign.htmlContent, campaign.textContent);

  logger.info(`[Campaign] Test email sent to ${toEmail} for campaign ${campaign._id}`);
  res.json({ success: true, message: `Test email sent to ${toEmail}` });
});

// ─── POST /api/campaigns/:id/pause ───────────────────────────────────────────
exports.pauseCampaign = asyncHandler(async (req, res) => {
  const campaign = await EmailCampaign.findById(req.params.id);
  if (!campaign) throw new AppError('Campaign not found', 404, 'CAMPAIGN_NOT_FOUND');

  if (campaign.status !== 'processing') {
    throw new AppError(`Cannot pause campaign with status "${campaign.status}"`, 400, 'INVALID_STATUS');
  }

  await EmailCampaign.updateOne({ _id: campaign._id }, { status: 'paused' });
  logger.info(`[Campaign] ${campaign._id} paused by ${req.user.email}`);
  res.json({ success: true, message: 'Campaign paused — worker will stop after current batch' });
});

// ─── POST /api/campaigns/:id/resume ──────────────────────────────────────────
exports.resumeCampaign = asyncHandler(async (req, res) => {
  const campaign = await EmailCampaign.findById(req.params.id);
  if (!campaign) throw new AppError('Campaign not found', 404, 'CAMPAIGN_NOT_FOUND');

  if (campaign.status !== 'paused') {
    throw new AppError(`Cannot resume campaign with status "${campaign.status}"`, 400, 'INVALID_STATUS');
  }

  await EmailCampaign.updateOne({ _id: campaign._id }, { status: 'queued' });
  setImmediate(() => processCampaign(campaign._id));

  logger.info(`[Campaign] ${campaign._id} resumed by ${req.user.email}`);
  res.json({ success: true, message: 'Campaign resumed' });
});

// ─── POST /api/campaigns/:id/cancel ──────────────────────────────────────────
exports.cancelCampaign = asyncHandler(async (req, res) => {
  const campaign = await EmailCampaign.findById(req.params.id);
  if (!campaign) throw new AppError('Campaign not found', 404, 'CAMPAIGN_NOT_FOUND');

  if (['completed', 'failed', 'cancelled'].includes(campaign.status)) {
    throw new AppError(`Cannot cancel campaign with status "${campaign.status}"`, 400, 'INVALID_STATUS');
  }

  await EmailCampaign.updateOne({ _id: campaign._id }, { status: 'cancelled', completedAt: new Date() });
  await EmailCampaignRecipient.updateMany(
    { campaignId: campaign._id, status: 'processing' },
    { status: 'pending' }
  );

  logger.info(`[Campaign] ${campaign._id} cancelled by ${req.user.email}`);
  res.json({ success: true, message: 'Campaign cancelled' });
});

// ─── POST /api/campaigns/:id/retry — Retry failed recipients ─────────────────
exports.retryFailedRecipients = asyncHandler(async (req, res) => {
  const campaign = await EmailCampaign.findById(req.params.id);
  if (!campaign) throw new AppError('Campaign not found', 404, 'CAMPAIGN_NOT_FOUND');

  if (['processing', 'queued'].includes(campaign.status)) {
    throw new AppError('Campaign is still running — wait for it to complete', 400, 'CAMPAIGN_RUNNING');
  }

  const result = await EmailCampaignRecipient.updateMany(
    { campaignId: campaign._id, status: { $in: ['failed'] } },
    { status: 'pending', failureReason: '' }
  );

  if (result.modifiedCount === 0) {
    throw new AppError('No failed recipients to retry', 400, 'NO_FAILED_RECIPIENTS');
  }

  await EmailCampaign.updateOne({ _id: campaign._id }, { status: 'queued' });
  await syncCampaignCounts(campaign._id);
  setImmediate(() => processCampaign(campaign._id));

  logger.info(`[Campaign] Retrying ${result.modifiedCount} failed recipients for ${campaign._id}`);
  res.json({
    success: true,
    message: `Retrying ${result.modifiedCount} failed recipients`,
    data: { retriedCount: result.modifiedCount },
  });
});

// ─── POST /api/campaigns/:id/duplicate ───────────────────────────────────────
exports.duplicateCampaign = asyncHandler(async (req, res) => {
  const source = await EmailCampaign.findById(req.params.id).lean();
  if (!source) throw new AppError('Campaign not found', 404, 'CAMPAIGN_NOT_FOUND');

  const copy = await EmailCampaign.create({
    title:          `Copy of ${source.title}`,
    description:    source.description,
    subject:        source.subject,
    fromName:       source.fromName,
    fromEmail:      source.fromEmail,
    replyTo:        source.replyTo,
    htmlContent:    source.htmlContent,
    textContent:    source.textContent,
    audienceType:   source.audienceType,
    audienceConfig: source.audienceConfig,
    templateId:     source.templateId,
    createdBy:      req.user.id,
    status:         'draft',
  });

  res.status(201).json({ success: true, message: 'Campaign duplicated', data: { campaign: copy } });
});

// ─── GET /api/campaigns/:id/recipients — Paginated recipient list ─────────────
exports.getCampaignRecipients = asyncHandler(async (req, res) => {
  const campaign = await EmailCampaign.findById(req.params.id).lean();
  if (!campaign) throw new AppError('Campaign not found', 404, 'CAMPAIGN_NOT_FOUND');

  const page    = Math.max(1, parseInt(req.query.page)  || 1);
  const limit   = Math.min(100, parseInt(req.query.limit) || 50);
  const skip    = (page - 1) * limit;
  const filter  = { campaignId: campaign._id };

  if (req.query.status) filter.status = req.query.status;
  if (req.query.search) {
    filter.$or = [
      { recipientEmail: { $regex: req.query.search, $options: 'i' } },
      { recipientName:  { $regex: req.query.search, $options: 'i' } },
    ];
  }

  const [recipients, total] = await Promise.all([
    EmailCampaignRecipient.find(filter)
      .sort({ createdAt: 1 })
      .skip(skip)
      .limit(limit)
      .select('recipientEmail recipientName status provider providerMessageId failureReason retryCount sentAt deliveredAt unsubscribedAt updatedAt')
      .lean(),
    EmailCampaignRecipient.countDocuments(filter),
  ]);

  res.json({ success: true, data: { recipients, total, page, pages: Math.ceil(total / limit) } });
});

// ─── GET /api/campaigns/:id/export — Export recipient logs as CSV ─────────────
exports.exportCampaignLogs = asyncHandler(async (req, res) => {
  const campaign = await EmailCampaign.findById(req.params.id).lean();
  if (!campaign) throw new AppError('Campaign not found', 404, 'CAMPAIGN_NOT_FOUND');

  const recipients = await EmailCampaignRecipient.find({ campaignId: campaign._id })
    .sort({ createdAt: 1 })
    .lean();

  const rows = [
    ['Email', 'Name', 'Status', 'Provider', 'Message ID', 'Failure Reason', 'Retry Count', 'Sent At', 'Updated At'].join(','),
    ...recipients.map((r) =>
      [
        r.recipientEmail,
        (r.recipientName || '').replace(/,/g, ' '),
        r.status,
        r.provider,
        r.providerMessageId || '',
        (r.failureReason || '').replace(/,/g, ' '),
        r.retryCount,
        r.sentAt ? r.sentAt.toISOString() : '',
        r.updatedAt ? r.updatedAt.toISOString() : '',
      ].join(',')
    ),
  ].join('\n');

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="campaign-${campaign._id}-logs.csv"`);
  res.send(rows);
});

// ─── POST /api/campaigns/upload-audience — Parse CSV for audience preview ─────
exports.uploadAudienceMiddleware = upload.single('file');

exports.uploadAudience = asyncHandler(async (req, res) => {
  if (!req.file) throw new AppError('No file uploaded', 400, 'NO_FILE');

  const filePath     = req.file.path;
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

    const seen     = new Set();
    const valid    = [];
    const invalid  = [];
    let dupeCount  = 0;

    for (const entry of emails) {
      const email = (entry.email || '').trim().toLowerCase();
      if (!email) continue;
      if (!EMAIL_REGEX.test(email)) { invalid.push(email); continue; }
      if (seen.has(email)) { dupeCount++; continue; }
      seen.add(email);
      valid.push({ email, name: entry.name || '', college: entry.college || '', branch: entry.branch || '', year: entry.year || '', eventName: entry.eventName || '', teamName: entry.teamName || '' });
    }

    res.json({
      success: true,
      data: { validRecipients: valid, invalidEmails: invalid, validCount: valid.length, invalidCount: invalid.length, duplicateCount: dupeCount, totalParsed: emails.length },
    });
  } finally {
    try { fs.unlinkSync(filePath); } catch { /* ignore */ }
  }
});

// ─── File parsing helpers ─────────────────────────────────────────────────────
async function parseCSV(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines   = content.split(/\r?\n/);
  if (!lines.length) return [];

  const header = lines[0].toLowerCase().split(/[,;\t]/).map((h) => h.trim().replace(/^["']|["']$/g, ''));
  const findCol = (...names) => header.findIndex((h) => names.some((n) => h === n || h.includes(n)));

  const emailCol  = findCol('email', 'emails', 'e-mail');
  const nameCol   = findCol('name', 'full name', 'fullname');
  const collegeCol = findCol('college');
  const branchCol  = findCol('branch');
  const yearCol    = findCol('year');

  const result = [];
  const start  = emailCol !== -1 ? 1 : 0;

  for (let i = start; i < lines.length; i++) {
    const line  = lines[i].trim();
    if (!line) continue;
    const parts = line.split(/[,;\t]/);
    const getVal = (idx) => idx !== -1 && parts[idx] ? parts[idx].trim().replace(/^["']|["']$/g, '') : '';

    if (emailCol !== -1) {
      const email = getVal(emailCol);
      if (email) result.push({ email, name: getVal(nameCol), college: getVal(collegeCol), branch: getVal(branchCol), year: getVal(yearCol) });
    } else {
      for (const part of parts) {
        const cleaned = part.trim().replace(/^["']|["']$/g, '');
        if (EMAIL_REGEX.test(cleaned)) { result.push({ email: cleaned }); break; }
      }
    }
  }
  return result;
}

async function parseExcel(filePath) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);
  const sheet = workbook.worksheets[0];
  if (!sheet) return [];

  let emailCol = -1, nameCol = -1, collegeCol = -1, branchCol = -1, yearCol = -1;

  sheet.getRow(1).eachCell((cell, col) => {
    const v = (cell.value || '').toString().toLowerCase().trim();
    if (v.includes('email') || v === 'e-mail')           { if (emailCol   === -1) emailCol   = col; }
    else if (v === 'name' || v.includes('full name'))     { if (nameCol    === -1) nameCol    = col; }
    else if (v.includes('college'))                        { if (collegeCol === -1) collegeCol = col; }
    else if (v.includes('branch'))                         { if (branchCol  === -1) branchCol  = col; }
    else if (v.includes('year'))                           { if (yearCol    === -1) yearCol    = col; }
  });

  if (emailCol === -1) return [];

  const getVal = (row, col) => {
    if (col === -1) return '';
    const cell = row.getCell(col);
    if (!cell.value) return '';
    const v = cell.value;
    if (typeof v === 'object' && v.text) return v.text.toString().trim();
    if (typeof v === 'object' && v.richText) return v.richText.map((r) => r.text).join('').trim();
    if (typeof v === 'object' && v.hyperlink) return v.hyperlink.replace(/^mailto:/i, '').trim();
    return v.toString().trim();
  };

  const startRow = EMAIL_REGEX.test(getVal(sheet.getRow(1), emailCol)) ? 1 : 2;
  const result   = [];

  for (let i = startRow; i <= sheet.rowCount; i++) {
    const row   = sheet.getRow(i);
    const email = getVal(row, emailCol);
    if (email) {
      result.push({ email, name: getVal(row, nameCol), college: getVal(row, collegeCol), branch: getVal(row, branchCol), year: getVal(row, yearCol) });
    }
  }
  return result;
}
