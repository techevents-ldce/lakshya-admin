/**
 * sesMailService.js
 *
 * Amazon SES email service — completely isolated from Resend.
 * This file must NOT import from mailService.js or share any code with it.
 * Resend handles transactional mail; SES handles bulk campaigns only.
 */

const { SESClient, SendEmailCommand } = require('@aws-sdk/client-ses');
const AppError = require('../middleware/AppError');
const logger = require('../utils/logger');

// ─── Lazy SES Client ──────────────────────────────────────────────────────────
let _sesClient;

const getSESClient = () => {
  if (!_sesClient) {
    const region          = process.env.SES_REGION;
    const accessKeyId     = process.env.SES_ACCESS_KEY_ID;
    const secretAccessKey = process.env.SES_SECRET_ACCESS_KEY;

    if (!region || !accessKeyId || !secretAccessKey) {
      throw new AppError(
        'SES credentials not configured. Set SES_REGION, SES_ACCESS_KEY_ID, and SES_SECRET_ACCESS_KEY in .env',
        500,
        'SES_NOT_CONFIGURED'
      );
    }

    _sesClient = new SESClient({
      region,
      credentials: { accessKeyId, secretAccessKey },
    });
  }
  return _sesClient;
};

// ─── SES Sender Address ───────────────────────────────────────────────────────
const getDefaultFromAddress = () => {
  const name  = process.env.SES_FROM_NAME  || 'Lakshya 2026';
  const email = process.env.SES_FROM_EMAIL || 'updates@contact.lakshyaldce.in';
  return `${name} <${email}>`;
};

// ─── Placeholder Substitution ─────────────────────────────────────────────────
/**
 * Replace {{placeholder}} tokens in content with actual values.
 * Unmatched tokens are left as-is (safe — no data loss).
 */
const substitutePlaceholders = (content, placeholders = {}) => {
  if (!content) return '';
  return content.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return placeholders[key] !== undefined ? String(placeholders[key]) : match;
  });
};

// ─── Retry Helpers ────────────────────────────────────────────────────────────
const MAX_RETRIES    = 3;
const BASE_BACKOFF_MS = 1000;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function isRetryableSESError(err) {
  const code = (err.name || err.Code || '').toLowerCase();
  const msg  = (err.message || '').toLowerCase();
  return (
    code.includes('throttling')          ||
    code.includes('serviceunavailable')  ||
    code.includes('requesttimeout')      ||
    msg.includes('rate')                 ||
    msg.includes('throttl')             ||
    msg.includes('503')                  ||
    msg.includes('500')                  ||
    (err.$metadata && err.$metadata.httpStatusCode >= 500)
  );
}

// ─── Build Unsubscribe Footer ─────────────────────────────────────────────────
const buildUnsubscribeFooter = (recipientEmail) => {
  const token   = Buffer.from(recipientEmail.toLowerCase().trim()).toString('base64');
  const baseUrl = process.env.SERVER_BASE_URL || 'http://localhost:5000';
  const url     = `${baseUrl}/api/unsubscribe?token=${encodeURIComponent(token)}`;
  return `
<div style="margin-top:32px;padding-top:16px;border-top:1px solid #e2e8f0;text-align:center;">
  <p style="font-size:11px;color:#94a3b8;margin:0;">
    You received this email because you registered on
    <a href="https://lakshyaldce.in" style="color:#64748b;">lakshyaldce.in</a>.
    &nbsp;·&nbsp;
    <a href="${url}" style="color:#64748b;text-decoration:underline;">Unsubscribe</a>
  </p>
</div>`;
};

// ─── Primary SES Send Function ────────────────────────────────────────────────
/**
 * Send a single email via Amazon SES for a campaign recipient.
 *
 * This function is the SES equivalent of sendSingleEmail() in mailService.js.
 * It must NEVER be called from Resend flows, and mailService.js must never call this.
 *
 * @param {object} recipient - { recipientEmail, recipientName, placeholders }
 * @param {object} campaign  - { subject, htmlContent, textContent, fromName, fromEmail, replyTo }
 * @returns {{ success: boolean, messageId?: string, error?: string }}
 */
const sendSingleEmailViaSES = async (recipient, campaign) => {
  const { subject, htmlContent, textContent, fromName, fromEmail, replyTo } = campaign;

  const fromAddress = (fromEmail && fromName)
    ? `${fromName} <${fromEmail}>`
    : getDefaultFromAddress();

  // Substitute {{placeholders}} for this specific recipient
  const placeholders   = recipient.placeholders || {};
  const email          = recipient.recipientEmail || recipient.email || '';
  const personalizedHtml = substitutePlaceholders(htmlContent, { ...placeholders, email });
  const personalizedText = substitutePlaceholders(textContent || '', { ...placeholders, email });

  // Append unsubscribe footer if not already present
  const hasUnsub = personalizedHtml.toLowerCase().includes('unsubscribe');
  const finalHtml = hasUnsub
    ? personalizedHtml
    : personalizedHtml + buildUnsubscribeFooter(email);

  const params = {
    Source:      fromAddress,
    Destination: { ToAddresses: [email] },
    Message: {
      Subject: { Data: subject, Charset: 'UTF-8' },
      Body: {
        Html: { Data: finalHtml, Charset: 'UTF-8' },
        ...(personalizedText ? { Text: { Data: personalizedText, Charset: 'UTF-8' } } : {}),
      },
    },
    ...(replyTo ? { ReplyToAddresses: [replyTo] } : {}),
    ...(process.env.SES_CONFIGURATION_SET
      ? { ConfigurationSetName: process.env.SES_CONFIGURATION_SET }
      : {}),
  };

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const command = new SendEmailCommand(params);
      const result  = await getSESClient().send(command);
      return { success: true, messageId: result.MessageId };
    } catch (err) {
      const errMsg = err.message || 'Unknown SES error';

      if (attempt < MAX_RETRIES && isRetryableSESError(err)) {
        const delay = BASE_BACKOFF_MS * Math.pow(2, attempt);
        logger.warn(
          `[SES] Retryable error for ${email} (attempt ${attempt + 1}/${MAX_RETRIES}): ${errMsg}. Retrying in ${delay}ms`
        );
        await sleep(delay);
        continue;
      }

      logger.warn(`[SES] Non-retryable failure for ${email}: ${errMsg}`);
      return { success: false, error: errMsg };
    }
  }

  return { success: false, error: 'Max retries exceeded' };
};

// ─── Test Send (No Campaign Tracking) ────────────────────────────────────────
/**
 * Send a one-off test email via SES without any campaign/job tracking.
 * Used by the "Send Test Email" feature in the campaign composer.
 */
const sendTestEmailViaSES = async (toEmail, subject, htmlContent, textContent, fromOverride) => {
  const fromAddress = fromOverride || getDefaultFromAddress();
  const replyTo     = process.env.MAIL_REPLY_TO || 'contact@lakshyaldce.in';

  const params = {
    Source:      fromAddress,
    Destination: { ToAddresses: [toEmail] },
    Message: {
      Subject: { Data: `[TEST] ${subject}`, Charset: 'UTF-8' },
      Body: {
        Html: { Data: htmlContent, Charset: 'UTF-8' },
        ...(textContent ? { Text: { Data: textContent, Charset: 'UTF-8' } } : {}),
      },
    },
    ReplyToAddresses: [replyTo],
    ...(process.env.SES_CONFIGURATION_SET
      ? { ConfigurationSetName: process.env.SES_CONFIGURATION_SET }
      : {}),
  };

  const command = new SendEmailCommand(params);
  const result  = await getSESClient().send(command);
  logger.info(`[SES] Test email sent to ${toEmail} (MessageId: ${result.MessageId})`);
  return { success: true, messageId: result.MessageId };
};

// ─── Anti-Spam Content Validator ──────────────────────────────────────────────
/**
 * Warns about common spam patterns in subject/html content.
 * Returns { warnings: string[], blocked: boolean }
 */
const validateForSpam = (subject, htmlContent) => {
  const warnings = [];
  let blocked    = false;

  // Subject checks
  if (subject === subject.toUpperCase() && subject.length > 5) {
    warnings.push('Subject is ALL CAPS — high spam risk');
  }
  if ((subject.match(/!/g) || []).length > 2) {
    warnings.push('Subject has too many exclamation marks');
  }
  if (/FREE|URGENT|ACT NOW|CLICK HERE|WIN|WINNER|GUARANTEED/i.test(subject)) {
    warnings.push('Subject contains high-risk spam trigger words (FREE, URGENT, WIN, etc.)');
  }
  if (subject.length < 10) {
    warnings.push('Subject is very short — may trigger spam filters');
  }

  // HTML content checks
  if (!htmlContent || htmlContent.trim().length < 100) {
    warnings.push('Email body is too short');
    blocked = true;
  }
  const textContent = htmlContent.replace(/<[^>]+>/g, '').trim();
  if (textContent.length < 50) {
    warnings.push('Email appears to be image-only (very little text content) — high spam risk');
  }
  const linkCount = (htmlContent.match(/<a\s/gi) || []).length;
  if (linkCount > 10) {
    warnings.push(`Email contains ${linkCount} links — excessive links trigger spam filters`);
  }

  return { warnings, blocked };
};

module.exports = {
  sendSingleEmailViaSES,
  sendTestEmailViaSES,
  substitutePlaceholders,
  validateForSpam,
};
