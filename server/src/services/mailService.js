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

  if (templateMode === 'team_login') {
    const teamGreeting = recipient.teamName ? recipient.teamName : (recipient.name ? recipient.name : 'Team');
    return `<p style="margin: 0 0 16px 0; line-height: 1.6; color: #334155;">Hello <strong>${teamGreeting}</strong>,</p>`;
  }

  if (templateMode === 'formal') {
    const primaryName = recipient.name || recipient.teamName;
    if (primaryName) {
      const collegeText = recipient.college ? `<br><span style="font-size:13px;color:#64748b;">${recipient.college}</span>` : '';
      return `<p style="margin: 0 0 20px 0; line-height: 1.6; color: #1e293b; font-size: 15px;">Dear ${primaryName},${collegeText}</p>`;
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
  
  const defaultName = recipient.name || recipient.teamName;
  if (defaultName) {
    return `<p style="margin: 0 0 16px 0; line-height: 1.6; color: #334155;">Dear ${defaultName},</p>`;
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

  team_login: ({ subject, recipient }) => {
    const teamNameStr = recipient.teamName ? recipient.teamName : (recipient.name ? recipient.name : 'Team');
    const passObj = recipient.password || '{Generated Password}';

    const hardcodedBody = `
      <p style="margin: 0 0 16px 0; line-height: 1.6; color: #334155; font-size: 15px;">Welcome to <strong>Tark Shaastra 2K26</strong>, the official hackathon of Lakshya 2.0 &mdash; the Annual Tech Festival of LDCE. Your team has been successfully registered and your portal access is now ready.</p>

      <div style="margin: 32px 0; padding: 24px; background: linear-gradient(to bottom right, #f8fafc, #f1f5f9); border: 1px solid #e2e8f0; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
        <h3 style="margin: 0 0 16px 0; font-size: 16px; font-weight: 700; color: #0f172a; text-transform: uppercase; letter-spacing: 0.05em;">Your Login Credentials</h3>
        <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
          <p style="margin: 0 0 12px 0; font-size: 14px; color: #334155;"><strong>Team Name:</strong> <span style="color: #0f172a; font-weight: 600;">${teamNameStr}</span></p>
          <p style="margin: 0 0 12px 0; font-size: 14px; color: #334155;"><strong>Email:</strong> <span style="color: #0f172a; font-weight: 500;">${recipient.email}</span></p>
          <p style="margin: 0; font-size: 14px; color: #334155;"><strong>Default Password:</strong> <span style="font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; background: #e2e8f0; padding: 4px 8px; border-radius: 6px; font-weight: 600; color: #0f172a; letter-spacing: 0.05em;">${passObj}</span></p>
        </div>
        <div style="text-align: center;">
          <a href="https://www.lakshyaldce.in/" target="_blank" style="display: inline-block; padding: 12px 28px; background-color: #4f46e5; color: #ffffff; text-decoration: none; border-radius: 8px; font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; transition: all 0.2s;">Access Portal &rarr;</a>
        </div>
      </div>

      <div style="border-left: 4px solid #f59e0b; margin: 24px 0; background-color: #fffbeb; padding: 16px 20px; border-radius: 0 8px 8px 0;">
        <p style="margin: 0; color: #b45309; font-size: 14px; font-weight: 600; line-height: 1.6;">
          <strong>IMPORTANT:</strong> You are required to log in and change your default password immediately upon first login. Access to event resources and updates will only be available through the portal, so please ensure your account is set up at the earliest.
        </p>
      </div>

      <h3 style="margin: 0 0 16px 0; font-size: 16px; color: #0f172a; font-weight: 700;">Steps to get started:</h3>
      <ol style="margin: 0 0 24px 0; padding-left: 20px; color: #334155; line-height: 1.7; font-size: 15px;">
        <li>Visit <a href="https://www.lakshyaldce.in/" style="color: #4f46e5; text-decoration: underline; font-weight: 600;" target="_blank">lakshyaldce.in</a></li>
        <li>Log in using the credentials and your email above.</li>
        <li>Navigate to Account Settings and update your password.</li>
        <li>Complete your profile if prompted.</li>
      </ol>

      <p style="margin: 0 0 24px 0; line-height: 1.6; color: #334155; font-size: 15px;">Please note that these credentials are personal and must not be shared. All official communications, problem statements, schedules, and announcements for <strong>Tark Shaastra 2K26</strong> will be accessible through this portal.</p>

      <p style="margin: 0 0 32px 0; line-height: 1.6; color: #334155; font-weight: 600; font-size: 15px;">We look forward to seeing your ideas come to life.</p>

      <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #e2e8f0;">
        <p style="margin: 0 0 4px 0; line-height: 1.6; color: #334155; font-size: 15px;">Warm regards,</p>
        <p style="margin: 0; line-height: 1.6; color: #0f172a; font-weight: 700; font-size: 15px;">Tark Shaastra 2K26 Team Committee</p>
        <p style="margin: 0; line-height: 1.6; color: #64748b; font-size: 13px;">Lakshya 2.0 &mdash; Annual Tech Festival<br>L.D. College of Engineering, Ahmedabad</p>
      </div>
    `;

    return baseLayout(`
      <h2 style="margin: 0 0 24px 0; color: #0f172a; font-size: 22px; font-weight: 700; text-align: center;">${subject}</h2>
      <div style="margin: 0 0 32px 0; text-align: left;">
        <p style="margin: 0 0 16px 0; line-height: 1.6; color: #334155; font-size: 15px;">Hello <strong>${teamNameStr}</strong>,</p>
        ${hardcodedBody}
      </div>
    `, '#3b82f6', 'team_login');
  },
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
 * Send an email with one or more base64-encoded PDF attachments.
 * Designed for certificate delivery — supports multiple certs in a single email
 * when several members share the same email address.
 *
 * @param {Object}   opts
 * @param {string}   opts.to               – Recipient email address.
 * @param {string}   opts.subject
 * @param {string}   opts.html
 * @param {Array}    opts.attachments       – Array of { content: base64, filename }.
 * @param {string}   [opts.senderIdentity]
 */
const sendEmailWithAttachment = async ({ to, subject, html, attachments, senderIdentity = 'updates' }) => {
  const fromAddress = SENDER_IDENTITIES[senderIdentity];
  if (!fromAddress) return { success: false, error: 'Invalid sender identity' };

  if (!Array.isArray(attachments) || attachments.length === 0) {
    return { success: false, error: 'No attachments provided' };
  }

  // Map to Resend's expected shape: { filename, content }
  const resendAttachments = attachments.map((a) => ({
    filename: a.filename || 'Certificate.pdf',
    content: a.content,  // Base64 string
  }));

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const result = await getResend().emails.send({
        from: fromAddress,
        replyTo: REPLY_TO_EMAIL,
        to,
        subject,
        html,
        attachments: resendAttachments,
      });

      if (result.error) {
        const errMsg = result.error.message || result.error.name || 'Unknown Resend error';
        if (attempt < MAX_RETRIES && isRetryableError(result.error)) {
          const delay = BASE_BACKOFF_MS * Math.pow(2, attempt);
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

module.exports = { sendSingleEmail, sendEmailWithAttachment, templates, SENDER_IDENTITIES, REPLY_TO_EMAIL };
