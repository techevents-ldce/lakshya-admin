const mailService = require('../services/mailService');
const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');

/**
 * POST /api/mail/send
 * Body: { subject, body, template, recipientEmails[], roles[] }
 * Protected by: protect → authorize('admin') → verifyAdminPassword
 */
exports.sendBulkEmail = asyncHandler(async (req, res) => {
  const { subject, body, template, senderIdentity = 'updates', recipientEmails = [], roles = [] } = req.body;

  // Build recipient list
  const recipientMap = new Map(); // email → { email, name }

  // 1. Add users from selected roles
  if (roles.length > 0) {
    const users = await User.find({ role: { $in: roles }, isActive: true }).select('email name');
    users.forEach((u) => recipientMap.set(u.email, { email: u.email, name: u.name }));
  }

  // 2. Add individually specified emails (could be external)
  recipientEmails.forEach((email) => {
    const trimmed = email.trim().toLowerCase();
    if (trimmed && !recipientMap.has(trimmed)) {
      recipientMap.set(trimmed, { email: trimmed, name: '' });
    }
  });

  const recipients = Array.from(recipientMap.values());

  const result = await mailService.sendBulkEmail(recipients, subject, body, template, senderIdentity);

  res.json({
    success: true,
    message: `Email sent to ${result.sent} of ${result.total} recipients`,
    data: result,
  });
});

/**
 * GET /api/mail/recipients
 * Query: ?role=admin|coordinator|participant  &search=term
 * Returns a lightweight user list for the recipient picker.
 */
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
