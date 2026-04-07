/**
 * suppressionController.js
 *
 * Manages the email suppression/opt-out list for SES campaigns.
 * Includes a public unsubscribe endpoint (no auth required — compliance requirement).
 */

const EmailSuppression       = require('../models/EmailSuppression');
const EmailCampaign          = require('../models/EmailCampaign');
const EmailCampaignRecipient = require('../models/EmailCampaignRecipient');
const asyncHandler = require('../utils/asyncHandler');
const AppError     = require('../middleware/AppError');
const logger       = require('../utils/logger');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ─── GET /api/suppressions — List suppressions (Admin) ───────────────────────
exports.listSuppressions = asyncHandler(async (req, res) => {
  const page  = Math.max(1, parseInt(req.query.page)  || 1);
  const limit = Math.min(100, parseInt(req.query.limit) || 50);
  const skip  = (page - 1) * limit;
  const filter = {};

  if (req.query.reason) filter.reason = req.query.reason;
  if (req.query.search) {
    filter.email = { $regex: req.query.search, $options: 'i' };
  }

  const [suppressions, total] = await Promise.all([
    EmailSuppression.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    EmailSuppression.countDocuments(filter),
  ]);

  res.json({ success: true, data: { suppressions, total, page, pages: Math.ceil(total / limit) } });
});

// ─── POST /api/suppressions — Manually add suppression (Admin) ───────────────
exports.addSuppression = asyncHandler(async (req, res) => {
  const { email, reason = 'manual', notes = '' } = req.body;

  if (!email || !EMAIL_REGEX.test(email)) {
    throw new AppError('Valid email is required', 400, 'INVALID_EMAIL');
  }

  const normalizedEmail = email.toLowerCase().trim();

  const existing = await EmailSuppression.findOne({ email: normalizedEmail });
  if (existing) {
    throw new AppError(`${normalizedEmail} is already suppressed (reason: ${existing.reason})`, 409, 'ALREADY_SUPPRESSED');
  }

  const suppression = await EmailSuppression.create({
    email:  normalizedEmail,
    reason: reason || 'manual',
    source: 'admin',
    notes,
    provider: 'ses',
  });

  logger.info(`[Suppression] Added: ${normalizedEmail} by ${req.user.email}`);
  res.status(201).json({ success: true, message: 'Email suppressed', data: { suppression } });
});

// ─── DELETE /api/suppressions/:email — Remove suppression (Admin) ─────────────
exports.removeSuppression = asyncHandler(async (req, res) => {
  const email = decodeURIComponent(req.params.email).toLowerCase().trim();

  const result = await EmailSuppression.deleteOne({ email });
  if (result.deletedCount === 0) {
    throw new AppError('Suppression not found', 404, 'SUPPRESSION_NOT_FOUND');
  }

  logger.info(`[Suppression] Removed: ${email} by ${req.user.email}`);
  res.json({ success: true, message: 'Suppression removed' });
});

// ─── GET /api/suppressions/check?email=xxx (Admin) ───────────────────────────
exports.checkSuppression = asyncHandler(async (req, res) => {
  const email = (req.query.email || '').toLowerCase().trim();
  if (!email) throw new AppError('email query param required', 400, 'MISSING_EMAIL');

  const suppression = await EmailSuppression.findOne({ email }).lean();
  res.json({ success: true, data: { suppressed: !!suppression, suppression: suppression || null } });
});

// ─── GET /api/unsubscribe?token=xxx — Public unsubscribe endpoint ─────────────
// This endpoint is PUBLIC (no auth) — required for email compliance (CAN-SPAM / GDPR)
exports.unsubscribeHandler = asyncHandler(async (req, res) => {
  const { token, cid } = req.query; // cid = optional campaign ID

  if (!token) {
    return res.status(400).send(renderPage('Invalid Link', 'This unsubscribe link is invalid or has expired.', false));
  }

  let email;
  try {
    email = Buffer.from(decodeURIComponent(token), 'base64').toString('utf-8').toLowerCase().trim();
  } catch {
    return res.status(400).send(renderPage('Invalid Link', 'This unsubscribe link is invalid or has expired.', false));
  }

  if (!EMAIL_REGEX.test(email)) {
    return res.status(400).send(renderPage('Invalid Link', 'The unsubscribe link could not be verified.', false));
  }

  // Check if already suppressed
  const existing = await EmailSuppression.findOne({ email });
  if (existing) {
    return res.send(renderPage('Already Unsubscribed', `${email} is already unsubscribed from all campaign emails.`, true));
  }

  // Add to suppression list
  await EmailSuppression.create({
    email,
    reason: 'unsubscribed',
    source: 'self',
    campaignId: cid || null,
    provider:   'ses',
  });

  // Update recipient record if campaign ID provided
  if (cid) {
    await EmailCampaignRecipient.updateOne(
      { campaignId: cid, recipientEmail: email },
      { status: 'unsubscribed', unsubscribedAt: new Date() }
    );
    // Sync campaign counts
    const { syncCampaignCounts } = require('../services/sesCampaignWorker');
    await syncCampaignCounts(cid);
  }

  logger.info(`[Suppression] Unsubscribe: ${email} (campaign: ${cid || 'none'})`);
  res.send(renderPage('Successfully Unsubscribed', `${email} has been unsubscribed from all campaign emails from Lakshya.`, true));
});

// ─── Simple HTML page renderer for unsubscribe flow ──────────────────────────
function renderPage(title, message, success) {
  const color  = success ? '#059669' : '#dc2626';
  const icon   = success ? '✓' : '✗';
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>${title} – Lakshya</title>
  <style>
    body { margin:0; padding:40px 20px; background:#f1f5f9; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif; display:flex; align-items:center; justify-content:center; min-height:100vh; }
    .card { background:#fff; border-radius:16px; padding:48px 40px; max-width:480px; width:100%; text-align:center; box-shadow:0 10px 30px rgba(0,0,0,.08); }
    .icon { width:64px; height:64px; border-radius:50%; background:${color}20; display:flex; align-items:center; justify-content:center; margin:0 auto 24px; font-size:28px; color:${color}; }
    h1 { margin:0 0 12px; font-size:22px; color:#0f172a; }
    p  { margin:0 0 24px; color:#64748b; line-height:1.6; }
    a  { color:#2563eb; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">${icon}</div>
    <h1>${title}</h1>
    <p>${message}</p>
    <p><a href="https://lakshyaldce.in">Return to Lakshya →</a></p>
  </div>
</body>
</html>`;
}
