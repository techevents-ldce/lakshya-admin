const { Resend } = require('resend');
const AppError = require('../middleware/AppError');
const logger = require('../utils/logger');

// ─── Lazy Resend client ────────────────────────────────────────────────────────
let _resend;
const getResend = () => {
  if (!_resend) {
    const key = process.env.RESEND_API_KEY;
    if (!key) throw new AppError('RESEND_API_KEY is not configured in .env', 500, 'RESEND_NOT_CONFIGURED');
    _resend = new Resend(key);
  }
  return _resend;
};

// ─── Sender Identities ────────────────────────────────────────────────────────
const SENDER_IDENTITIES = {
  updates: process.env.MAIL_FROM_UPDATES || 'Lakshya Updates <updates@notify.lakshyaldce.in>',
  events: process.env.MAIL_FROM_EVENTS || 'Lakshya Events <events@notify.lakshyaldce.in>',
  tarkshaastra: process.env.MAIL_FROM_TARKSHAASTRA || 'Tarkshaastra <tarkshaastra@notify.lakshyaldce.in>',
};

const REPLY_TO_EMAIL = process.env.MAIL_REPLY_TO || 'contact@lakshyaldce.in';

// ─── Email Templates ──────────────────────────────────────────────────────────
const baseLayout = (content, accentColor = '#334155') => `
  <div style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
    <div style="padding: 24px 32px; border-bottom: 2px solid ${accentColor}; background-color: #f8fafc; text-align: left;">
      <h1 style="margin: 0; color: #0f172a; font-size: 24px; font-weight: 700; letter-spacing: -0.02em; text-transform: uppercase;">
        LAKSHYA
      </h1>
    </div>
    <div style="padding: 40px 32px; color: #334155; line-height: 1.6; font-size: 15px;">
      <div style="margin-bottom: 32px;">
        ${content}
      </div>
      <div style="margin-top: 40px; padding-top: 24px; border-top: 1px solid #e2e8f0;">
        <p style="margin: 0; color: #64748b; font-size: 14px;">Regards,</p>
        <p style="margin: 4px 0 0; color: #0f172a; font-size: 15px; font-weight: 600;">Team Lakshya</p>
      </div>
    </div>
    <div style="background-color: #f1f5f9; padding: 24px 32px; text-align: center; border-top: 1px solid #e2e8f0;">
      <p style="margin: 0 0 8px 0; color: #64748b; font-size: 12px;">This is an automated message from Lakshya Tech-Fest.</p>
      <a href="https://lakshyaldce.in" style="color: #0f172a; text-decoration: none; font-size: 13px; font-weight: 600; border-bottom: 1px solid #cbd5e1; padding-bottom: 2px;">lakshyaldce.in</a>
    </div>
  </div>
`;

const templates = {
  raw: ({ body }) => baseLayout(`
    <p style="white-space: pre-wrap; margin: 0;">${body}</p>
  `, '#334155'),

  success: ({ subject, body }) => baseLayout(`
    <h2 style="margin: 0 0 16px 0; color: #0f172a; font-size: 18px; font-weight: 600;">${subject}</h2>
    <p style="white-space: pre-wrap; margin: 0;">${body}</p>
  `, '#059669'),

  congratulations: ({ subject, body }) => baseLayout(`
    <h2 style="margin: 0 0 16px 0; color: #0f172a; font-size: 18px; font-weight: 600;">${subject}</h2>
    <p style="white-space: pre-wrap; margin: 0;">${body}</p>
  `, '#d97706'),

  important: ({ subject, body }) => baseLayout(`
    <div style="border-left: 3px solid #dc2626; padding-left: 16px; margin-bottom: 24px;">
      <p style="margin: 0 0 4px 0; font-weight: 600; color: #dc2626; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em;">Notice</p>
      <h2 style="margin: 0; color: #0f172a; font-size: 18px; font-weight: 600;">${subject}</h2>
    </div>
    <p style="white-space: pre-wrap; margin: 0;">${body}</p>
  `, '#dc2626'),

  formal: ({ subject, body }) => baseLayout(`
    <h2 style="margin: 0 0 16px 0; color: #0f172a; font-size: 18px; font-weight: 600; border-bottom: 1px solid #e2e8f0; padding-bottom: 12px;">${subject}</h2>
    <p style="white-space: pre-wrap; margin: 0; color: #475569;">${body}</p>
  `, '#1e293b'),
};

// ─── Single Email Send (with retry + backoff) ─────────────────────────────────

const MAX_RETRIES = 3;
const BASE_BACKOFF_MS = 1000;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Send a single email via Resend with automatic retry and exponential backoff.
 * @param {{ email: string, name?: string }} recipient
 * @param {string} subject
 * @param {string} body
 * @param {string} template
 * @param {string} senderIdentity
 * @returns {{ success: boolean, error?: string }}
 */
const sendSingleEmail = async (recipient, subject, body, template = 'raw', senderIdentity = 'updates') => {
  const fromAddress = SENDER_IDENTITIES[senderIdentity];
  if (!fromAddress) return { success: false, error: 'Invalid sender identity' };

  const templateFn = templates[template] || templates.raw;
  const html = templateFn({ subject, body, recipientName: recipient.name });

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const result = await getResend().emails.send({
        from: fromAddress,
        reply_to: REPLY_TO_EMAIL,
        to: recipient.email,
        subject,
        html,
      });

      if (result.error) {
        const errMsg = result.error.message || result.error.name || 'Unknown Resend error';

        // If rate limited or temporary error, retry
        if (attempt < MAX_RETRIES && isRetryableError(result.error)) {
          const delay = BASE_BACKOFF_MS * Math.pow(2, attempt);
          logger.warn(`[Mail] Retryable error for ${recipient.email} (attempt ${attempt + 1}/${MAX_RETRIES}): ${errMsg}. Retrying in ${delay}ms`);
          await sleep(delay);
          continue;
        }

        return { success: false, error: errMsg };
      }

      return { success: true, resendId: result.data?.id };
    } catch (err) {
      const errMsg = err.message || 'Unknown exception';

      if (attempt < MAX_RETRIES && isRetryableException(err)) {
        const delay = BASE_BACKOFF_MS * Math.pow(2, attempt);
        logger.warn(`[Mail] Retryable exception for ${recipient.email} (attempt ${attempt + 1}/${MAX_RETRIES}): ${errMsg}. Retrying in ${delay}ms`);
        await sleep(delay);
        continue;
      }

      return { success: false, error: errMsg };
    }
  }

  return { success: false, error: 'Max retries exceeded' };
};

/**
 * Check if a Resend error object is retryable (rate limit, server error).
 */
function isRetryableError(error) {
  const name = (error.name || '').toLowerCase();
  const message = (error.message || '').toLowerCase();
  return (
    name.includes('rate') ||
    name.includes('too_many') ||
    message.includes('rate') ||
    message.includes('too many') ||
    message.includes('429') ||
    name.includes('internal') ||
    message.includes('500') ||
    message.includes('503')
  );
}

/**
 * Check if a thrown exception is a retryable network/timeout error.
 */
function isRetryableException(err) {
  const msg = (err.message || '').toLowerCase();
  const code = (err.code || '').toLowerCase();
  return (
    code === 'econnreset' ||
    code === 'econnaborted' ||
    code === 'etimedout' ||
    code === 'epipe' ||
    msg.includes('timeout') ||
    msg.includes('socket hang up') ||
    msg.includes('network') ||
    (err.status && err.status >= 500)
  );
}

module.exports = { sendSingleEmail, templates, SENDER_IDENTITIES, REPLY_TO_EMAIL };
