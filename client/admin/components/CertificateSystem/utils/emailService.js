import api from '../../../../src/services/api';

// ─── LocalStorage checkpoint key ─────────────────────────────────────────────
const LS_KEY = 'cert_send_checkpoint';

// ─── Member key helper ────────────────────────────────────────────────────────
/**
 * Returns a unique string key for a member.
 * Using "email|fullName" instead of just email means two people who share an
 * inbox (e.g. siblings) are treated as distinct recipients and each get their
 * own correctly-named certificate.
 */
export const memberKey = (member) => `${member.email}|${member.fullName}`;

// ─── Checkpoint helpers ───────────────────────────────────────────────────────

export function saveCheckpoint(sessionId, checkpoint) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify({
      sessionId,
      savedAt: new Date().toISOString(),
      ...checkpoint
    }));
  } catch (_) {}
}

export function loadCheckpoint() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (_) {
    return null;
  }
}

export function clearCheckpoint() {
  try { localStorage.removeItem(LS_KEY); } catch (_) {}
}

// ─── Blob → Base64 ───────────────────────────────────────────────────────────

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result.split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// ─── Core email send ──────────────────────────────────────────────────────────
/**
 * Send ONE email to ONE member with THEIR specific certificate PDF.
 * Each member — even those sharing an email address — gets a separate email
 * so payloads stay small and names are always correct.
 */
export async function sendCertificateEmail(member, certificateBlob, subject, body) {
  try {
    const personalizedBody = body.replace(/\{\{name\}\}/g, member.fullName);
    const base64Content = await blobToBase64(certificateBlob);

    const response = await api.post('/mail/send-certificate', {
      to: member.email,
      subject,
      html: personalizedBody.replace(/\n/g, '<br/>'),
      // Single-attachment shape — always small, one cert per call
      attachment: base64Content,
      filename: `${member.fullName.replace(/\s+/g, '_')}_Certificate.pdf`,
    });

    return { success: true, data: response.data };
  } catch (error) {
    console.error('API error in sendCertificateEmail:', error);
    return {
      success: false,
      error: error.userMessage || error.message || 'Failed to send email'
    };
  }
}

// ─── Batch send with checkpoint ───────────────────────────────────────────────
/**
 * Send certificates to all members, one email per member.
 *
 * Progress is tracked by memberKey ("email|fullName") — NOT by raw email — so
 * two people who share the same inbox are never confused and neither is skipped.
 *
 * @param {Array}    members              Full member list.
 * @param {Map}      certificateBlobs     memberKey → Blob.
 * @param {string}   subject
 * @param {string}   body
 * @param {Function} onProgress           Called after every send.
 * @param {string}   sessionId
 * @param {Set}      alreadySentKeys      memberKey strings already delivered (resume).
 * @param {Function} [onStopped]          Called on quota/rate-limit stop.
 * @param {Map}      [certHashes]         memberKey → hash for DB registration.
 * @param {string}   [eventName]
 * @returns {Promise<Object>} Final progress snapshot.
 */
export async function sendCertificates(
  members,
  certificateBlobs,
  subject,
  body,
  onProgress,
  sessionId,
  alreadySentKeys = new Set(),
  onStopped = null,
  certHashes = new Map(),
  eventName = ''
) {
  const progress = {
    total: members.length,
    sent: alreadySentKeys.size,
    failed: 0,
    failedRecipients: [],
    // sentEmails stores memberKey strings so checkpoint resume is per-member,
    // not per-email-address.
    sentEmails: [...alreadySentKeys],
    stoppedAt: null,
    completed: false
  };

  // Filter out already-delivered members by their unique memberKey
  const remaining = members.filter((m) => !alreadySentKeys.has(memberKey(m)));

  for (const member of remaining) {
    const blob = certificateBlobs.get(memberKey(member));
    if (!blob) {
      progress.failed++;
      progress.failedRecipients.push({
        email: member.email,
        name: member.fullName,
        error: 'Certificate not found'
      });
      saveCheckpoint(sessionId, progress);
      if (onProgress) onProgress({ ...progress });
      continue;
    }

    const result = await sendCertificateEmail(member, blob, subject, body);

    if (result.success) {
      progress.sent++;
      progress.sentEmails.push(memberKey(member));

      // Register hash in DB for future certificate verification
      const hash = certHashes.get(memberKey(member));
      if (hash) {
        try {
          await api.post('/certificates/register', {
            hash,
            recipientName: member.fullName,
            recipientEmail: member.email,
            eventName,
          });
        } catch (regErr) {
          console.warn('[Cert] Hash registration failed:', regErr?.message);
        }
      }
    } else {
      progress.failed++;
      progress.failedRecipients.push({
        email: member.email,
        name: member.fullName,
        error: result.error || 'Unknown error'
      });

      // Detect Resend quota / rate-limit errors → pause and save checkpoint
      const errLower = (result.error || '').toLowerCase();
      const isQuotaError =
        errLower.includes('429') ||
        errLower.includes('quota') ||
        errLower.includes('rate limit') ||
        errLower.includes('too many');

      if (isQuotaError) {
        progress.stoppedAt = memberKey(member);
        saveCheckpoint(sessionId, progress);
        if (onProgress) onProgress({ ...progress });
        if (onStopped) onStopped({ ...progress });
        return progress;
      }
    }

    saveCheckpoint(sessionId, progress);
    if (onProgress) onProgress({ ...progress });
  }

  progress.completed = progress.failed === 0;
  if (progress.completed) {
    clearCheckpoint();
  } else {
    saveCheckpoint(sessionId, progress);
  }

  return progress;
}

// ─── Validate email config ────────────────────────────────────────────────────

export function validateEmailConfig(subject, body) {
  const errors = [];
  if (!subject.trim()) errors.push('Subject line cannot be empty');
  if (!body.trim()) errors.push('Email body cannot be empty');
  if (!body.includes('{{name}}'))
    errors.push('Email body should include {{name}} placeholder for personalization');
  return { isValid: errors.length === 0, errors };
}

// ─── Export progress as CSV ───────────────────────────────────────────────────

export function exportProgressCSV(members, progress, sessionId) {
  // sentEmails now contains memberKey strings ("email|fullName")
  const sentSet = new Set(progress.sentEmails || []);
  const failedMap = new Map(
    (progress.failedRecipients || []).map((r) => [
      memberKey({ email: r.email, fullName: r.name || '' }),
      r.error
    ])
  );

  const rows = [
    ['Name', 'Email', 'Status', 'Note'],
    ...members.map((m) => {
      const key = memberKey(m);
      let status = 'Pending';
      let note = '';
      if (sentSet.has(key)) {
        status = 'Sent';
      } else if (failedMap.has(key)) {
        status = 'Failed';
        note = failedMap.get(key);
      }
      return [m.fullName, m.email, status, note];
    })
  ];

  const csv = rows
    .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))
    .join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `certificate_delivery_${sessionId}_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
