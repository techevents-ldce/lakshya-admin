/**
 * audienceResolverService.js
 *
 * Resolves campaign audience from database filters or CSV data.
 * Returns deduplicated, suppression-filtered recipient list.
 */

const User           = require('../models/User');
const Registration   = require('../models/Registration');
const Payment        = require('../models/Payment');
const EmailSuppression = require('../models/EmailSuppression');
const logger         = require('../utils/logger');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ─── Main Entry Point ─────────────────────────────────────────────────────────
/**
 * Resolve audience for a campaign.
 * @param {string} audienceType - 'db_filter' | 'csv_upload' | 'mixed'
 * @param {object} audienceConfig - Filter parameters
 * @returns {Array<{ recipientEmail, recipientName, userId?, eventId?, placeholders }>}
 */
async function resolveAudience(audienceType, audienceConfig = {}) {
  let rawRecipients = [];

  if (audienceType === 'db_filter') {
    rawRecipients = await resolveFromDBFilter(audienceConfig);
  } else if (audienceType === 'csv_upload') {
    rawRecipients = normalizeCsvRecipients(audienceConfig.recipients || []);
  } else if (audienceType === 'mixed') {
    const dbRecipients  = await resolveFromDBFilter(audienceConfig);
    const csvRecipients = normalizeCsvRecipients(audienceConfig.recipients || []);
    rawRecipients = [...dbRecipients, ...csvRecipients];
  }

  // ── Deduplicate by email ──────────────────────────────────────────────────
  const seen        = new Set();
  const deduplicated = rawRecipients.filter((r) => {
    const email = (r.recipientEmail || '').toLowerCase().trim();
    if (!email || !EMAIL_REGEX.test(email) || seen.has(email)) return false;
    r.recipientEmail = email;
    seen.add(email);
    return true;
  });

  if (deduplicated.length === 0) return [];

  // ── Filter suppressed emails ──────────────────────────────────────────────
  const emails        = deduplicated.map((r) => r.recipientEmail);
  const suppressed    = await EmailSuppression.find({ email: { $in: emails } }).select('email').lean();
  const suppressedSet = new Set(suppressed.map((s) => s.email));

  const filtered = deduplicated.filter((r) => !suppressedSet.has(r.recipientEmail));

  if (suppressedSet.size > 0) {
    logger.info(`[AudienceResolver] Filtered out ${suppressedSet.size} suppressed emails`);
  }
  logger.info(`[AudienceResolver] Resolved ${filtered.length} recipients (from ${rawRecipients.length} raw)`);

  return filtered;
}

// ─── DB Filter Resolution ─────────────────────────────────────────────────────

async function resolveFromDBFilter(config) {
  const filter = config.filter || 'all_users';
  const recipients = [];

  switch (filter) {
    case 'all_users': {
      const users = await User.find({ isActive: true })
        .select('email name college branch year').lean();
      users.forEach((u) => recipients.push(userToRecipient(u)));
      break;
    }

    case 'participant_users': {
      const users = await User.find({ isActive: true, role: 'participant' })
        .select('email name college branch year').lean();
      users.forEach((u) => recipients.push(userToRecipient(u)));
      break;
    }

    case 'coordinator_users': {
      const users = await User.find({ isActive: true, role: 'coordinator' })
        .select('email name college branch year').lean();
      users.forEach((u) => recipients.push(userToRecipient(u)));
      break;
    }

    case 'admin_users': {
      const users = await User.find({ isActive: true, role: 'admin' })
        .select('email name college branch year').lean();
      users.forEach((u) => recipients.push(userToRecipient(u)));
      break;
    }

    case 'paid_users': {
      const payments = await Payment.find({ status: 'paid' })
        .populate('userId', 'email name college branch year').lean();
      const seen = new Set();
      payments.forEach((p) => {
        if (p.userId && p.userId.email && !seen.has(p.userId.email)) {
          seen.add(p.userId.email);
          recipients.push(userToRecipient(p.userId));
        }
      });
      break;
    }

    case 'unpaid_users': {
      const paidIds = new Set(
        (await Payment.find({ status: 'paid' }).select('userId').lean())
          .map((p) => (p.userId || '').toString())
      );
      const users = await User.find({ isActive: true, role: 'participant' })
        .select('email name college branch year').lean();
      users
        .filter((u) => !paidIds.has(u._id.toString()))
        .forEach((u) => recipients.push(userToRecipient(u)));
      break;
    }

    case 'event_participants': {
      const eventId = config.eventId;
      if (eventId) {
        const regs = await Registration.find({ eventId })
          .populate('userId', 'email name college branch year').lean();
        const seen = new Set();
        regs.forEach((reg) => {
          const u = reg.userId;
          if (u && u.email && !seen.has(u.email)) {
            seen.add(u.email);
            recipients.push({
              ...userToRecipient(u),
              eventId: reg.eventId,
              placeholders: {
                ...userToRecipient(u).placeholders,
                eventName: config.eventName || '',
              },
            });
          }
        });
      }
      break;
    }

    case 'by_college': {
      if (config.college) {
        const users = await User.find({
          isActive: true,
          college: { $regex: config.college, $options: 'i' },
        }).select('email name college branch year').lean();
        users.forEach((u) => recipients.push(userToRecipient(u)));
      }
      break;
    }

    case 'by_branch': {
      if (config.branch) {
        const users = await User.find({
          isActive: true,
          branch: { $regex: config.branch, $options: 'i' },
        }).select('email name college branch year').lean();
        users.forEach((u) => recipients.push(userToRecipient(u)));
      }
      break;
    }

    case 'by_year': {
      if (config.year) {
        const users = await User.find({ isActive: true, year: Number(config.year) })
          .select('email name college branch year').lean();
        users.forEach((u) => recipients.push(userToRecipient(u)));
      }
      break;
    }

    default:
      logger.warn(`[AudienceResolver] Unknown filter type: ${filter}`);
      break;
  }

  return recipients;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function userToRecipient(user) {
  return {
    recipientEmail: (user.email || '').toLowerCase().trim(),
    recipientName:  user.name || '',
    userId:         user._id,
    eventId:        null,
    placeholders: {
      name:      user.name     || '',
      college:   user.college  || '',
      branch:    user.branch   || '',
      year:      user.year     ? String(user.year) : '',
      eventName: '',
      teamName:  '',
    },
  };
}

function normalizeCsvRecipients(recipients) {
  return recipients.map((r) => ({
    recipientEmail: (r.email || '').toLowerCase().trim(),
    recipientName:  r.name  || '',
    userId:         null,
    eventId:        null,
    placeholders: {
      name:      r.name      || '',
      college:   r.college   || '',
      branch:    r.branch    || '',
      year:      r.year      || '',
      eventName: r.eventName || '',
      teamName:  r.teamName  || '',
    },
  }));
}

/**
 * Get a count estimate for a given audience config (without building full list).
 * Used for preview UI before submitting.
 */
async function estimateAudienceCount(audienceType, audienceConfig = {}) {
  if (audienceType === 'csv_upload') {
    return (audienceConfig.recipients || []).length;
  }
  const resolved = await resolveAudience(audienceType, audienceConfig);
  return resolved.length;
}

module.exports = { resolveAudience, estimateAudienceCount };
