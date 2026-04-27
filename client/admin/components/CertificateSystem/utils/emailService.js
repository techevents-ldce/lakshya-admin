import api from '../../../../src/services/api';

// ─── LocalStorage checkpoint key ─────────────────────────────────────────────
const LS_KEY = 'cert_send_checkpoint';

// ─── Checkpoint helpers ───────────────────────────────────────────────────────

/**
 * Save current session state to localStorage.
 * Called after every individual send (success or failure).
 */
export function saveCheckpoint(sessionId, checkpoint) {
  try {
    const data = {
      sessionId,
      savedAt: new Date().toISOString(),
      ...checkpoint
    };
    localStorage.setItem(LS_KEY, JSON.stringify(data));
  } catch (_) {
    // localStorage unavailable – silently ignore (won't break sending)
  }
}

/**
 * Load the saved checkpoint from localStorage, if any.
 * Returns null when none exists.
 */
export function loadCheckpoint() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (_) {
    return null;
  }
}

/**
 * Wipe the saved checkpoint (call after a successful full delivery or manual discard).
 */
export function clearCheckpoint() {
  try {
    localStorage.removeItem(LS_KEY);
  } catch (_) {}
}

// ─── Core email send ──────────────────────────────────────────────────────────

/**
 * Send a single certificate email via the internal API.
 */
export async function sendCertificateEmail(member, certificateBlob, subject, body) {
  try {
    const personalizedBody = body.replace(/\{\{name\}\}/g, member.fullName);

    // Convert Blob → Base64
    const base64Content = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result.split(',')[1]);
      reader.onerror = reject;
      reader.readAsDataURL(certificateBlob);
    });

    const response = await api.post('/mail/send-certificate', {
      to: member.email,
      subject,
      html: personalizedBody.replace(/\n/g, '<br/>'),
      attachment: base64Content,
      filename: `${member.fullName.replace(/\s+/g, '_')}_Certificate.pdf`
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
 * Send certificates to a list of members with full checkpoint support.
 *
 * @param {Array}    members          – Full member list for this session.
 * @param {Map}      certificateBlobs – email → Blob map.
 * @param {string}   subject
 * @param {string}   body
 * @param {Function} onProgress       – Called with progress object after every send.
 * @param {string}   sessionId        – Unique ID for this delivery batch.
 * @param {Set}      alreadySentEmails – Emails already delivered (from a resumed checkpoint).
 * @param {Function} [onStopped]      – Called if the loop is interrupted (quota / abort).
 * @returns {Promise<Object>} Final progress snapshot.
 */
export async function sendCertificates(
  members,
  certificateBlobs,
  subject,
  body,
  onProgress,
  sessionId,
  alreadySentEmails = new Set(),
  onStopped = null
) {
  const progress = {
    total: members.length,
    sent: alreadySentEmails.size,   // seed with already-sent count
    failed: 0,
    failedRecipients: [],
    sentEmails: [...alreadySentEmails],   // track per-email for checkpoint
    stoppedAt: null,                      // email where sending halted
    completed: false
  };

  // Skip already-sent members (strict resume — never re-send)
  const remaining = members.filter((m) => !alreadySentEmails.has(m.email));

  for (const member of remaining) {
    const certificateBlob = certificateBlobs.get(member.email);
    if (!certificateBlob) {
      progress.failed++;
      progress.failedRecipients.push({ email: member.email, error: 'Certificate not found' });
      saveCheckpoint(sessionId, progress);
      if (onProgress) onProgress({ ...progress });
      continue;
    }

    const result = await sendCertificateEmail(member, certificateBlob, subject, body);

    if (result.success) {
      progress.sent++;
      progress.sentEmails.push(member.email);
    } else {
      progress.failed++;
      progress.failedRecipients.push({
        email: member.email,
        error: result.error || 'Unknown error'
      });

      // Detect quota / rate-limit errors from Resend (429 / quota keywords)
      const errLower = (result.error || '').toLowerCase();
      const isQuotaError =
        errLower.includes('429') ||
        errLower.includes('quota') ||
        errLower.includes('rate limit') ||
        errLower.includes('too many');

      if (isQuotaError) {
        // Save checkpoint BEFORE reporting so the UI shows the last safe state
        progress.stoppedAt = member.email;
        saveCheckpoint(sessionId, progress);
        if (onProgress) onProgress({ ...progress });
        if (onStopped) onStopped({ ...progress });
        // Stop the loop — do not send any more
        return progress;
      }
    }

    // Persist after every individual email
    saveCheckpoint(sessionId, progress);
    if (onProgress) onProgress({ ...progress });
  }

  progress.completed = progress.failed === 0;

  // If everything done without errors, clear the checkpoint automatically
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

  if (!subject.trim()) {
    errors.push('Subject line cannot be empty');
  }

  if (!body.trim()) {
    errors.push('Email body cannot be empty');
  }

  if (!body.includes('{{name}}')) {
    errors.push('Email body should include {{name}} placeholder for personalization');
  }

  return { isValid: errors.length === 0, errors };
}

// ─── Export progress as CSV ───────────────────────────────────────────────────

/**
 * Download the current progress state as a CSV report.
 * Gives a permanent paper trail of who received a certificate.
 */
export function exportProgressCSV(members, progress, sessionId) {
  const sentSet = new Set(progress.sentEmails || []);
  const failedMap = new Map(
    (progress.failedRecipients || []).map((r) => [r.email, r.error])
  );

  const rows = [
    ['Name', 'Email', 'Status', 'Note'],
    ...members.map((m) => {
      let status = 'Pending';
      let note = '';
      if (sentSet.has(m.email)) {
        status = 'Sent';
      } else if (failedMap.has(m.email)) {
        status = 'Failed';
        note = failedMap.get(m.email);
      }
      return [m.fullName, m.email, status, note];
    })
  ];

  const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `certificate_delivery_${sessionId}_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
