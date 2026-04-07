/**
 * templateController.js
 *
 * Manages reusable email templates for SES campaigns.
 * Includes anti-spam validation, starter template seeding, and CRUD.
 */

const EmailTemplate    = require('../models/EmailTemplate');
const { sendTestEmailViaSES, validateForSpam } = require('../services/sesMailService');
const asyncHandler = require('../utils/asyncHandler');
const AppError     = require('../middleware/AppError');
const logger       = require('../utils/logger');

// ─── GET /api/email-templates ─────────────────────────────────────────────────
exports.listTemplates = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.category) filter.category = req.query.category;
  if (req.query.search) {
    filter.$or = [
      { name:    { $regex: req.query.search, $options: 'i' } },
      { subject: { $regex: req.query.search, $options: 'i' } },
    ];
  }

  const templates = await EmailTemplate.find(filter)
    .sort({ isSystem: -1, createdAt: -1 })
    .populate('createdBy', 'name email')
    .lean();

  res.json({ success: true, data: { templates } });
});

// ─── GET /api/email-templates/:id ────────────────────────────────────────────
exports.getTemplate = asyncHandler(async (req, res) => {
  const template = await EmailTemplate.findById(req.params.id)
    .populate('createdBy', 'name email')
    .lean();
  if (!template) throw new AppError('Template not found', 404, 'TEMPLATE_NOT_FOUND');
  res.json({ success: true, data: { template } });
});

// ─── POST /api/email-templates ────────────────────────────────────────────────
exports.createTemplate = asyncHandler(async (req, res) => {
  const { name, category = 'general', subject, html, text = '', variables = [] } = req.body;

  if (!name || !subject || !html) {
    throw new AppError('name, subject, and html are required', 400, 'MISSING_FIELDS');
  }

  const spamCheck = validateForSpam(subject, html);
  if (spamCheck.blocked) {
    throw new AppError(`Template blocked: ${spamCheck.warnings.join('; ')}`, 400, 'SPAM_CONTENT_BLOCKED');
  }

  const slug = slugify(name);

  // Detect placeholders automatically
  const detectedVars = [...new Set([...(html.match(/\{\{(\w+)\}\}/g) || []).map((m) => m.slice(2, -2)), ...variables])];

  const template = await EmailTemplate.create({
    name, slug, category, subject, html, text,
    variables: detectedVars,
    isSystem:  false,
    createdBy: req.user.id,
  });

  logger.info(`[Template] Created: "${name}" by ${req.user.email}`);
  res.status(201).json({
    success: true,
    message: 'Template created',
    data: { template },
    spamWarnings: spamCheck.warnings,
  });
});

// ─── PUT /api/email-templates/:id ────────────────────────────────────────────
exports.updateTemplate = asyncHandler(async (req, res) => {
  const template = await EmailTemplate.findById(req.params.id);
  if (!template) throw new AppError('Template not found', 404, 'TEMPLATE_NOT_FOUND');

  if (template.isSystem) {
    throw new AppError('System templates cannot be edited', 403, 'SYSTEM_TEMPLATE');
  }

  const { name, category, subject, html, text, variables } = req.body;

  if (html || subject) {
    const spamCheck = validateForSpam(subject || template.subject, html || template.html);
    if (spamCheck.blocked) {
      throw new AppError(`Template blocked: ${spamCheck.warnings.join('; ')}`, 400, 'SPAM_CONTENT_BLOCKED');
    }
  }

  if (name)      { template.name = name; template.slug = slugify(name); }
  if (category)  template.category = category;
  if (subject)   template.subject  = subject;
  if (html)      template.html     = html;
  if (text !== undefined) template.text = text;

  const finalHtml = html || template.html;
  const detected  = [...new Set((finalHtml.match(/\{\{(\w+)\}\}/g) || []).map((m) => m.slice(2, -2)))];
  template.variables = detected.length > 0 ? detected : (variables || template.variables);

  await template.save();
  res.json({ success: true, message: 'Template updated', data: { template } });
});

// ─── DELETE /api/email-templates/:id ─────────────────────────────────────────
exports.deleteTemplate = asyncHandler(async (req, res) => {
  const template = await EmailTemplate.findById(req.params.id);
  if (!template) throw new AppError('Template not found', 404, 'TEMPLATE_NOT_FOUND');

  if (template.isSystem) {
    throw new AppError('System templates cannot be deleted', 403, 'SYSTEM_TEMPLATE');
  }

  await template.deleteOne();
  res.json({ success: true, message: 'Template deleted' });
});

// ─── POST /api/email-templates/:id/duplicate ─────────────────────────────────
exports.duplicateTemplate = asyncHandler(async (req, res) => {
  const source = await EmailTemplate.findById(req.params.id).lean();
  if (!source) throw new AppError('Template not found', 404, 'TEMPLATE_NOT_FOUND');

  const copy = await EmailTemplate.create({
    name:      `Copy of ${source.name}`,
    slug:      slugify(`Copy of ${source.name}`),
    category:  source.category,
    subject:   source.subject,
    html:      source.html,
    text:      source.text,
    variables: source.variables,
    isSystem:  false,
    createdBy: req.user.id,
  });

  res.status(201).json({ success: true, message: 'Template duplicated', data: { template: copy } });
});

// ─── POST /api/email-templates/:id/test-send ──────────────────────────────────
exports.sendTestFromTemplate = asyncHandler(async (req, res) => {
  const template = await EmailTemplate.findById(req.params.id).lean();
  if (!template) throw new AppError('Template not found', 404, 'TEMPLATE_NOT_FOUND');

  const { toEmail } = req.body;
  if (!toEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(toEmail)) {
    throw new AppError('Valid toEmail is required', 400, 'INVALID_EMAIL');
  }

  await sendTestEmailViaSES(toEmail, template.subject, template.html, template.text);
  res.json({ success: true, message: `Test email sent to ${toEmail}` });
});

// ─── Seed Starter Templates ────────────────────────────────────────────────────
exports.seedStarterTemplates = async () => {
  const count = await EmailTemplate.countDocuments({ isSystem: true });
  if (count > 0) return; // Already seeded

  const BASE_STYLES = `font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0;`;
  const HEADER_IMG  = `<div style="background:#fff;text-align:center;border-bottom:1px solid #f1f5f9;"><img src="https://lakshyaldce.in/mail-head.png" alt="Lakshya" style="display:block;width:100%;max-width:600px;height:auto;border:none;margin:0 auto;" /></div>`;
  const FOOTER      = `<div style="background:linear-gradient(135deg,#F5A623 0%,#4DD9E8 50%,#1A8C8C 100%);padding:32px;text-align:center;"><p style="margin:0 0 4px;color:#fff;font-size:14px;font-weight:600;">Team Lakshya</p><p style="margin:0 0 8px;color:rgba(255,255,255,0.85);font-size:13px;">L.D. College of Engineering, Ahmedabad – 380015</p><a href="https://lakshyaldce.in" style="color:#fff;font-size:13px;font-weight:600;text-decoration:underline;">lakshyaldce.in</a></div>`;
  const UNSUB_FOOTER = `<p style="font-size:11px;color:#94a3b8;text-align:center;margin-top:24px;">You received this email because you registered on lakshyaldce.in. <a href="{{unsubscribeUrl}}" style="color:#64748b;">Unsubscribe</a></p>`;

  const wrap = (content) => `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>Lakshya</title></head><body style="margin:0;padding:20px 0;background:#f1f5f9;"><div style="${BASE_STYLES}">${HEADER_IMG}<div style="padding:48px 40px;color:#334155;line-height:1.8;font-size:15px;">${content}${UNSUB_FOOTER}</div>${FOOTER}</div></body></html>`;

  const starters = [
    {
      name: 'Event Announcement',
      slug: 'event-announcement',
      category: 'announcement',
      subject: 'Announcing {{eventName}} – Register Now',
      variables: ['name', 'eventName', 'college'],
      html: wrap(`
        <p style="margin:0 0 16px;color:#334155;">Dear {{name}},</p>
        <h2 style="margin:0 0 16px;color:#0f172a;font-size:22px;font-weight:700;">🎉 {{eventName}} is here!</h2>
        <p style="margin:0 0 16px;">We are thrilled to announce <strong>{{eventName}}</strong> at Lakshya 2026 — the annual techfest of L.D. College of Engineering.</p>
        <p style="margin:0 0 16px;">This is your chance to showcase your skills, compete with the best, and win exciting prizes.</p>
        <p style="margin:0 0 24px;"><a href="https://lakshyaldce.in" style="display:inline-block;padding:12px 28px;background:#2563eb;color:#fff;border-radius:8px;text-decoration:none;font-size:14px;font-weight:600;">Register Now →</a></p>
        <p style="margin:0;color:#64748b;font-size:14px;">We look forward to seeing you participate!</p>
        <p style="margin:16px 0 0;color:#334155;font-size:14px;">Warm regards,<br><strong>Team Lakshya</strong></p>
      `),
      text: `Dear {{name}},\n\nWe are thrilled to announce {{eventName}} at Lakshya 2026.\n\nRegister at: https://lakshyaldce.in\n\nWarm regards,\nTeam Lakshya`,
    },
    {
      name: 'Workshop Reminder',
      slug: 'workshop-reminder',
      category: 'reminder',
      subject: 'Reminder: {{eventName}} is Tomorrow – Don\'t Miss It',
      variables: ['name', 'eventName'],
      html: wrap(`
        <p style="margin:0 0 16px;color:#334155;">Dear {{name}},</p>
        <div style="border-left:4px solid #f59e0b;padding-left:16px;margin-bottom:24px;">
          <p style="margin:0;font-weight:600;color:#92400e;font-size:13px;text-transform:uppercase;letter-spacing:.05em;">Reminder</p>
          <h2 style="margin:4px 0 0;color:#0f172a;font-size:20px;font-weight:700;">{{eventName}} – Tomorrow!</h2>
        </div>
        <p style="margin:0 0 16px;">This is a friendly reminder that <strong>{{eventName}}</strong> is scheduled for <strong>tomorrow</strong>. Please ensure you arrive on time with your college ID card.</p>
        <p style="margin:0 0 16px;">If you have any pre-event preparation requirements, please review the guidelines on our website.</p>
        <p style="margin:0 0 24px;"><a href="https://lakshyaldce.in" style="display:inline-block;padding:12px 28px;background:#2563eb;color:#fff;border-radius:8px;text-decoration:none;font-size:14px;font-weight:600;">View Details →</a></p>
        <p style="margin:0;color:#334155;font-size:14px;">See you there!<br><strong>Team Lakshya</strong></p>
      `),
      text: `Dear {{name}},\n\nThis is a reminder that {{eventName}} is tomorrow.\n\nSee you there!\nTeam Lakshya`,
    },
    {
      name: 'Team Shortlisted',
      slug: 'team-shortlisted',
      category: 'result',
      subject: 'Congratulations! Your Team has been Shortlisted for {{eventName}}',
      variables: ['name', 'teamName', 'eventName'],
      html: wrap(`
        <p style="margin:0 0 16px;color:#334155;">Dear {{name}},</p>
        <h2 style="margin:0 0 16px;color:#059669;font-size:22px;font-weight:700;">🙌 Congratulations! You're Shortlisted!</h2>
        <p style="margin:0 0 16px;">We are delighted to inform you that your team <strong>{{teamName}}</strong> has been shortlisted for <strong>{{eventName}}</strong> at Lakshya 2026.</p>
        <p style="margin:0 0 16px;">Please check the official website for further details regarding the next rounds, scheduling, and venue information.</p>
        <p style="margin:0 0 24px;"><a href="https://lakshyaldce.in" style="display:inline-block;padding:12px 28px;background:#059669;color:#fff;border-radius:8px;text-decoration:none;font-size:14px;font-weight:600;">View Schedule →</a></p>
        <p style="margin:0;color:#334155;font-size:14px;">Best of luck!<br><strong>Team Lakshya</strong></p>
      `),
      text: `Dear {{name}},\n\nCongratulations! Your team {{teamName}} has been shortlisted for {{eventName}}.\n\nBest of luck!\nTeam Lakshya`,
    },
    {
      name: 'Registration Reminder',
      slug: 'registration-reminder',
      category: 'reminder',
      subject: 'Last Chance to Register for {{eventName}} – Deadline Approaching',
      variables: ['name', 'eventName'],
      html: wrap(`
        <p style="margin:0 0 16px;color:#334155;">Dear {{name}},</p>
        <div style="background:#fef3c7;border:1px solid #f59e0b;border-radius:8px;padding:16px;margin-bottom:24px;">
          <p style="margin:0;color:#92400e;font-size:14px;font-weight:600;">⏰ Registration closing soon!</p>
        </div>
        <p style="margin:0 0 16px;">We noticed you haven't registered for <strong>{{eventName}}</strong> yet. This is your last chance — registration closes very soon!</p>
        <p style="margin:0 0 16px;">Don't miss this opportunity to participate in one of the most exciting events at Lakshya 2026.</p>
        <p style="margin:0 0 24px;"><a href="https://lakshyaldce.in" style="display:inline-block;padding:12px 28px;background:#dc2626;color:#fff;border-radius:8px;text-decoration:none;font-size:14px;font-weight:600;">Register Before It's Too Late →</a></p>
        <p style="margin:0;color:#334155;font-size:14px;">See you at the event!<br><strong>Team Lakshya</strong></p>
      `),
      text: `Dear {{name}},\n\nRegistration for {{eventName}} is closing soon. Register now at https://lakshyaldce.in\n\nTeam Lakshya`,
    },
    {
      name: 'Official Results Announcement',
      slug: 'results-announcement',
      category: 'result',
      subject: 'Official Results: {{eventName}} at Lakshya 2026',
      variables: ['name', 'eventName'],
      html: wrap(`
        <p style="margin:0 0 16px;color:#334155;">Dear {{name}},</p>
        <h2 style="margin:0 0 16px;color:#0f172a;font-size:22px;font-weight:700;text-align:center;">🏆 Official Results Announced</h2>
        <p style="margin:0 0 16px;">Thank you for your participation in <strong>{{eventName}}</strong> at Lakshya 2026. The event was a tremendous success, and we were truly impressed by all participants.</p>
        <p style="margin:0 0 16px;">The official results and winner announcements are now published on our website. Please visit the link below to view the complete results.</p>
        <p style="margin:0 0 24px;"><a href="https://lakshyaldce.in" style="display:inline-block;padding:12px 28px;background:#2563eb;color:#fff;border-radius:8px;text-decoration:none;font-size:14px;font-weight:600;">View Results →</a></p>
        <p style="margin:0 0 16px;">Whether you won or not, your participation made this event special. We hope to see you again next year!</p>
        <p style="margin:0;color:#334155;font-size:14px;">With gratitude,<br><strong>Team Lakshya</strong></p>
      `),
      text: `Dear {{name}},\n\nThe official results for {{eventName}} are now published. Visit https://lakshyaldce.in to view them.\n\nThank you for participating!\nTeam Lakshya`,
    },
  ];

  try {
    await EmailTemplate.insertMany(starters.map((t) => ({ ...t, isSystem: true })), { ordered: false });
    logger.info(`[Template] Seeded ${starters.length} starter templates`);
  } catch (err) {
    logger.warn('[Template] Seeding skipped (some may already exist):', err.message);
  }
};

// ─── Utility ──────────────────────────────────────────────────────────────────
function slugify(str) {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    + '-' + Date.now().toString(36);
}
