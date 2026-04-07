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

// ─── Body Processor (linkify URLs + preserve whitespace) ──────────────────────
const getSmartLabel = (url) => {
  try {
    const hostname = new URL(url).hostname.replace(/^www\./, '');
    if (hostname.includes('unstop.com')) return 'Register Now';
    if (hostname.includes('drive.google.com')) return 'Download Brochure';
    return hostname;
  } catch { return url; }
};

const processBody = (text) => {
  if (!text) return '';
  // 1. Escape HTML special chars
  let html = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  // 2. Linkify URLs → styled pill buttons with smart labels
  html = html.replace(
    /https?:\/\/[^\s<>"']+/gi,
    (url) => {
      const label = getSmartLabel(url);
      return `</span><a href="${url}" target="_blank" style="display:inline-block;padding:8px 20px;background:#2563eb;color:#ffffff;border-radius:6px;text-decoration:none;font-size:13px;font-weight:600;margin:4px 0;">${label} →</a><span>`;
    }
  );
  html = html.replace(/Lakshya 2\.0/gi, 'Lakshya&nbsp;2.0');
  html = html.replace(/Tark Shaastra/gi, 'Tark&nbsp;Shaastra');
  html = html.replace(/L\.D\. College of Engineering/gi, 'L.D.&nbsp;College&nbsp;of&nbsp;Engineering');
  // 3. Preserve whitespace: newlines → <br>, spaces → &nbsp;
  html = html.replace(/\n/g, '<br>');
  html = html.replace(/ {2}/g, '&nbsp;&nbsp;');
  return `<span>${html}</span>`;
};

// ─── Email Templates ──────────────────────────────────────────────────────────
const baseLayout = (content, accentColor = '#334155', templateMode = 'default') => `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light">
  <meta name="supported-color-schemes" content="light">
  <title>Lakshya</title>
  <style>
  :root { color-scheme: light; supported-color-schemes: light; }
  u + .body .lakshya-header { background-color: #ffffff !important; }
  [data-ogsc] .lakshya-header { background-color: #ffffff !important; }
</style>
</head>
<body style="margin: 0; padding: 20px 0; background-color: #f1f5f9; -webkit-font-smoothing: antialiased;">
  <div style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 10px 25px rgba(0, 0, 0, 0.05);">
    <!-- Brand Header -->
    <!-- Brand Header -->
    <div style="background-color: #ffffff; text-align: center; border-bottom: 1px solid #f1f5f9;">
      <img src="https://lakshyaldce.in/mail-head.png" alt="Lakshya - Where Legacy meets Innovation" style="display: block; width: 100%; max-width: 600px; height: auto; border: none; margin: 0 auto;" />
    </div>

    <!-- Main Content Area -->
    <div style="padding: 48px 40px; color: #334155; line-height: 1.8; font-size: 15px;">
      <div style="margin-bottom: 32px;">
        ${content}
      </div>
    </div>

    <!-- Branded Footer -->
    <div style="background: linear-gradient(135deg, #F5A623 0%, #4DD9E8 50%, #1A8C8C 100%); padding: 32px 32px; text-align: center;">
      <p style="margin: 0 0 4px 0; color: #ffffff; font-size: 14px; font-weight: 600;">Team Lakshya</p>
      <p style="margin: 0 0 8px 0; color: rgba(255,255,255,0.85); font-size: 13px;">L.D. College of Engineering, Ahmedabad – 380015</p>
      <a href="https://lakshyaldce.in" target="_blank" style="color: #ffffff; font-size: 13px; font-weight: 600; text-decoration: underline; text-underline-offset: 3px; opacity: 0.95;">lakshyaldce.in</a>
    </div>
  </div>
</body>
</html>
`;

const getPersonalizedHeader = (recipient, templateMode = 'default') => {
  if (!recipient) return '';
  
  if (templateMode === 'club') {
    if (!recipient.clubName) return ''; // No club name — skip auto-greeting to avoid duplication
    const collegeText = recipient.college ? `<span style="font-size:13px;color:#64748b;">${recipient.college}</span><br>` : '';
    return `<p style="margin: 0 0 16px 0; line-height: 1.6; color: #334155;"><strong>${recipient.clubName}</strong><br>${collegeText}</p>`;
  }
  
  if (templateMode === 'marketing') {
    const deptText = recipient.department ? `Department of ${recipient.department}<br>` : '';
    const collegeText = recipient.college ? `${recipient.college}<br>` : '';
    return `<p style="margin: 0 0 16px 0; line-height: 1.6; color: #334155;">Dear Head of Department,<br>${deptText}${collegeText}</p>`;
  }

  if (templateMode === 'formal') {
    if (recipient.name) {
      const collegeText = recipient.college ? `<br><span style="font-size:13px;color:#64748b;">${recipient.college}</span>` : '';
      return `<p style="margin: 0 0 20px 0; line-height: 1.6; color: #1e293b; font-size: 15px;">Dear ${recipient.name},${collegeText}</p>`;
    }
    if (recipient.clubName) {
      const collegeText = recipient.college ? `<br><span style="font-size:13px;color:#64748b;">${recipient.college}</span>` : '';
      return `<p style="margin: 0 0 20px 0; line-height: 1.6; color: #1e293b; font-size: 15px;">Dear ${recipient.clubName} Team,${collegeText}</p>`;
    }
    if (recipient.department) {
      const collegeText = recipient.college ? `<br><span style="font-size:13px;color:#64748b;">${recipient.college}</span>` : '';
      return `<p style="margin: 0 0 20px 0; line-height: 1.6; color: #1e293b; font-size: 15px;">Dear Head of Department,<br><span style="font-size:13px;color:#64748b;">Department of ${recipient.department}</span>${collegeText}</p>`;
    }
    if (recipient.college) {
      return `<p style="margin: 0 0 20px 0; line-height: 1.6; color: #1e293b; font-size: 15px;">Respected Sir/Ma'am,<br><span style="font-size:13px;color:#64748b;">${recipient.college}</span></p>`;
    }
    return `<p style="margin: 0 0 20px 0; line-height: 1.6; color: #1e293b; font-size: 15px;">Respected Sir/Ma'am,</p>`;
  }
  
  if (recipient.clubName) {
    return `<p style="margin: 0 0 16px 0; line-height: 1.6; color: #334155;">Dear ${recipient.clubName} Team,</p>`;
  }
  
  if (recipient.department) {
    return `<p style="margin: 0 0 16px 0; line-height: 1.6; color: #334155;">Dear Head of Department,<br>Department of ${recipient.department}</p>`;
  }
  
  if (recipient.name) {
    return `<p style="margin: 0 0 16px 0; line-height: 1.6; color: #334155;">Dear ${recipient.name},</p>`;
  }
  
  return `<p style="margin: 0 0 16px 0; line-height: 1.6; color: #334155;">Respected Sir/Ma'am,</p>`;
};

const templates = {
  raw: ({ body, recipient }) => baseLayout(`
    <div style="margin: 0; line-height: 1.7;">${getPersonalizedHeader(recipient)}${processBody(body)}</div>
  `, '#334155'),

  success: ({ subject, body, recipient }) => baseLayout(`
    <h2 style="margin: 0 0 20px 0; color: #0f172a; font-size: 20px; font-weight: 700;">${subject}</h2>
    <div style="margin: 0; line-height: 1.7;">${getPersonalizedHeader(recipient)}${processBody(body)}</div>
  `, '#059669'),

  congratulations: ({ subject, body, recipient }) => baseLayout(`
    <h2 style="margin: 0 0 20px 0; color: #0f172a; font-size: 20px; font-weight: 700;">${subject}</h2>
    <div style="margin: 0; line-height: 1.7;">${getPersonalizedHeader(recipient)}${processBody(body)}</div>
  `, '#d97706'),

  important: ({ subject, body, recipient }) => baseLayout(`
    <div style="border-left: 4px solid #dc2626; padding-left: 20px; margin-bottom: 32px;">
      <p style="margin: 0 0 6px 0; font-weight: 700; color: #dc2626; font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em;">Urgent Notice</p>
      <h2 style="margin: 0; color: #0f172a; font-size: 20px; font-weight: 700;">${subject}</h2>
    </div>
    <div style="margin: 0; line-height: 1.7;">${getPersonalizedHeader(recipient)}${processBody(body)}</div>
  `, '#dc2626'),

  formal: ({ subject, body, recipient }) => {
    const divider = `<hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0;">`;
    return baseLayout(`
    <h2 style="margin: 0 0 24px 0; color: #0f172a; font-size: 22px; font-weight: 700; text-align: center; letter-spacing: -0.3px;">${subject}</h2>
    ${divider}
    <div style="margin: 0 0 32px 0; line-height: 1.8; color: #1e293b;">${getPersonalizedHeader(recipient, 'formal')}${processBody(body)}</div>
  `);
  },

  marketing: ({ subject, body, recipient }) => baseLayout(`
    <h2 style="margin: 0 0 24px 0; color: #0f172a; font-size: 22px; font-weight: 700; text-align: center;">${subject}</h2>
    <div style="margin: 0 0 32px 0; line-height: 1.7;">${getPersonalizedHeader(recipient, 'marketing')}${processBody(body)}</div>
  `, '#334155', 'marketing'),

  club: ({ subject, body, recipient }) => baseLayout(`
    <h2 style="margin: 0 0 24px 0; color: #0f172a; font-size: 22px; font-weight: 700; text-align: center;">${subject}</h2>
    <div style="margin: 0 0 32px 0; line-height: 1.7;">${getPersonalizedHeader(recipient, 'club')}${processBody(body)}</div>
  `, '#334155', 'club'),
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
  const html = templateFn({ subject, body, recipientName: recipient.name, recipient });

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const result = await getResend().emails.send({
        from: fromAddress,
        replyTo: REPLY_TO_EMAIL,
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
