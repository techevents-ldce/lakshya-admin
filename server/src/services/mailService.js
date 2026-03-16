const { Resend } = require('resend');
const AppError = require('../middleware/AppError');

// Lazy-init: only create the Resend client when actually sending
let _resend;
const getResend = () => {
  if (!_resend) {
    const key = process.env.RESEND_API_KEY;
    if (!key) throw new AppError('RESEND_API_KEY is not configured in .env', 500, 'RESEND_NOT_CONFIGURED');
    _resend = new Resend(key);
  }
  return _resend;
};

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'Lakshya <noreply@yourdomain.com>';

// ─── HTML Email Templates ───────────────────────────────────────────────────────

const templates = {
  raw: ({ subject, body, recipientName }) => `
    <div style="font-family:'Segoe UI',Roboto,Arial,sans-serif;max-width:600px;margin:0 auto;padding:32px 24px;color:#1e293b;">
      <p style="margin:0 0 8px;">Hi ${recipientName || 'there'},</p>
      <p style="white-space:pre-wrap;line-height:1.7;margin:0 0 24px;">${body}</p>
      <p style="margin:0;color:#94a3b8;font-size:13px;">&mdash; Team Lakshya</p>
    </div>
  `,

  success: ({ subject, body, recipientName }) => `
    <div style="font-family:'Segoe UI',Roboto,Arial,sans-serif;max-width:600px;margin:0 auto;background:#f0fdf4;border-radius:16px;overflow:hidden;">
      <div style="background:linear-gradient(135deg,#16a34a,#15803d);padding:32px 24px;text-align:center;">
        <div style="font-size:48px;margin-bottom:8px;">✅</div>
        <h1 style="margin:0;color:#fff;font-size:22px;font-weight:700;">${subject}</h1>
      </div>
      <div style="padding:28px 24px;color:#1e293b;">
        <p style="margin:0 0 8px;font-weight:600;">Hi ${recipientName || 'there'},</p>
        <p style="white-space:pre-wrap;line-height:1.7;margin:0 0 24px;">${body}</p>
        <p style="margin:0;color:#94a3b8;font-size:13px;">&mdash; Team Lakshya</p>
      </div>
    </div>
  `,

  congratulations: ({ subject, body, recipientName }) => `
    <div style="font-family:'Segoe UI',Roboto,Arial,sans-serif;max-width:600px;margin:0 auto;background:linear-gradient(135deg,#fef3c7,#fef9c3);border-radius:16px;overflow:hidden;">
      <div style="background:linear-gradient(135deg,#f59e0b,#d97706);padding:32px 24px;text-align:center;">
        <div style="font-size:48px;margin-bottom:8px;">🎉</div>
        <h1 style="margin:0;color:#fff;font-size:22px;font-weight:700;">${subject}</h1>
      </div>
      <div style="padding:28px 24px;color:#1e293b;">
        <p style="margin:0 0 8px;font-weight:600;">Hi ${recipientName || 'there'},</p>
        <p style="white-space:pre-wrap;line-height:1.7;margin:0 0 24px;">${body}</p>
        <div style="text-align:center;padding:16px 0;">
          <span style="font-size:32px;">🏆</span>
        </div>
        <p style="margin:0;color:#94a3b8;font-size:13px;">&mdash; Team Lakshya</p>
      </div>
    </div>
  `,

  important: ({ subject, body, recipientName }) => `
    <div style="font-family:'Segoe UI',Roboto,Arial,sans-serif;max-width:600px;margin:0 auto;background:#fef2f2;border-radius:16px;overflow:hidden;border:2px solid #fca5a5;">
      <div style="background:linear-gradient(135deg,#dc2626,#b91c1c);padding:32px 24px;text-align:center;">
        <div style="font-size:48px;margin-bottom:8px;">⚠️</div>
        <h1 style="margin:0;color:#fff;font-size:22px;font-weight:700;">${subject}</h1>
      </div>
      <div style="padding:28px 24px;color:#1e293b;">
        <div style="background:#fee2e2;border-left:4px solid #dc2626;padding:12px 16px;border-radius:8px;margin-bottom:16px;">
          <p style="margin:0;font-weight:600;color:#991b1b;font-size:14px;">⚡ Important Notice</p>
        </div>
        <p style="margin:0 0 8px;font-weight:600;">Hi ${recipientName || 'there'},</p>
        <p style="white-space:pre-wrap;line-height:1.7;margin:0 0 24px;">${body}</p>
        <p style="margin:0;color:#94a3b8;font-size:13px;">&mdash; Team Lakshya</p>
      </div>
    </div>
  `,

  formal: ({ subject, body, recipientName }) => `
    <div style="font-family:'Segoe UI',Roboto,Arial,sans-serif;max-width:600px;margin:0 auto;background:#0f172a;border-radius:16px;overflow:hidden;border:1px solid #334155;">
      <div style="background:linear-gradient(135deg,#1e293b,#0f172a);padding:32px 24px;text-align:center;border-bottom:1px solid #334155;">
        <h1 style="margin:0;color:#f1f5f9;font-size:22px;font-weight:700;letter-spacing:0.5px;">${subject}</h1>
        <p style="margin:8px 0 0;color:#64748b;font-size:13px;">Official Communication</p>
      </div>
      <div style="padding:28px 24px;color:#e2e8f0;">
        <p style="margin:0 0 8px;font-weight:600;">Dear ${recipientName || 'Participant'},</p>
        <p style="white-space:pre-wrap;line-height:1.8;margin:0 0 24px;color:#cbd5e1;">${body}</p>
        <div style="border-top:1px solid #334155;padding-top:16px;margin-top:24px;">
          <p style="margin:0;color:#64748b;font-size:13px;">Warm regards,</p>
          <p style="margin:4px 0 0;color:#94a3b8;font-size:13px;font-weight:600;">Team Lakshya</p>
        </div>
      </div>
    </div>
  `,
};

// ─── Bulk Send ───────────────────────────────────────────────────────────────────

const BATCH_SIZE = 50;
const BATCH_DELAY_MS = 1100; // stay well within Resend rate limits

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * sendBulkEmail
 * @param {Array<{email: string, name?: string}>} recipients
 * @param {string} subject
 * @param {string} body
 * @param {string} template – one of 'raw','success','congratulations','important','formal'
 * @returns {{ sent: number, failed: number }}
 */
const sendBulkEmail = async (recipients, subject, body, template = 'raw') => {
  if (!recipients || recipients.length === 0) {
    throw new AppError('No recipients specified', 400, 'NO_RECIPIENTS');
  }
  if (!subject || !body) {
    throw new AppError('Subject and body are required', 400, 'MISSING_FIELDS');
  }

  const templateFn = templates[template] || templates.raw;

  let sent = 0;
  let failed = 0;
  const errors = [];

  // Process in batches
  for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
    const batch = recipients.slice(i, i + BATCH_SIZE);

    const promises = batch.map(async (recipient) => {
      try {
        const html = templateFn({ subject, body, recipientName: recipient.name });
        const result = await getResend().emails.send({
          from: FROM_EMAIL,
          to: recipient.email,
          subject,
          html,
        });

        // Resend returns { data, error } — check for error
        if (result.error) {
          console.error(`[Mail] Failed to send to ${recipient.email}:`, result.error);
          errors.push({ email: recipient.email, error: result.error.message || result.error.name });
          failed++;
        } else {
          console.log(`[Mail] Sent to ${recipient.email} — id: ${result.data?.id}`);
          sent++;
        }
      } catch (err) {
        console.error(`[Mail] Exception sending to ${recipient.email}:`, err.message);
        errors.push({ email: recipient.email, error: err.message });
        failed++;
      }
    });

    await Promise.all(promises);

    // Delay between batches (skip delay for the last batch)
    if (i + BATCH_SIZE < recipients.length) {
      await sleep(BATCH_DELAY_MS);
    }
  }

  // If ALL emails failed, throw so the frontend shows an error
  if (sent === 0 && failed > 0) {
    const firstError = errors[0]?.error || 'Unknown error';
    throw new AppError(
      `All ${failed} email(s) failed to send. Error: ${firstError}`,
      502,
      'EMAIL_SEND_FAILED'
    );
  }

  return { sent, failed, total: recipients.length, errors: errors.length > 0 ? errors : undefined };
};

module.exports = { sendBulkEmail, templates };
