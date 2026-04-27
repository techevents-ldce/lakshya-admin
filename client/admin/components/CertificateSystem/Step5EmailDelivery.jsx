import { useState, useEffect, useCallback } from 'react';
import {
  sendCertificates,
  validateEmailConfig,
  loadCheckpoint,
  clearCheckpoint,
  exportProgressCSV
} from './utils/emailService';
import styles from './Step5EmailDelivery.module.css';

// ─── Stable session ID for this wizard run ────────────────────────────────────
const generateSessionId = () =>
  `cert_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

export const Step5EmailDelivery = ({
  members,
  certificates,
  onEmailsSent,
  isLoading = false
}) => {
  // ── Email form state ──────────────────────────────────────────────────────
  const [subject, setSubject] = useState('Your Certificate from Lakshya TechFest 2026');
  const [body, setBody] = useState(
    'Dear {{name}},\n\nCongratulations! We are pleased to send you your certificate for participating in Lakshya TechFest 2026.\n\nBest regards,\nThe Lakshya Team'
  );
  const [showPreview, setShowPreview] = useState(false);

  // ── Send state ────────────────────────────────────────────────────────────
  const [sending, setSending] = useState(false);
  const [progress, setProgress] = useState(null);
  const [error, setError] = useState('');
  const [sessionId] = useState(generateSessionId);

  // ── Checkpoint state ──────────────────────────────────────────────────────
  const [savedCheckpoint, setSavedCheckpoint] = useState(null);
  const [checkpointDismissed, setCheckpointDismissed] = useState(false);

  // ── Quota-stop banner ─────────────────────────────────────────────────────
  const [quotaStopped, setQuotaStopped] = useState(false);

  // ── On mount: check for a saved checkpoint ────────────────────────────────
  useEffect(() => {
    const cp = loadCheckpoint();
    if (cp && cp.sentEmails && cp.sentEmails.length > 0) {
      setSavedCheckpoint(cp);
    }
  }, []);

  // ── Helpers ───────────────────────────────────────────────────────────────
  const buildCertificateMap = useCallback(() => {
    const map = new Map();
    certificates.forEach(({ member, certificate }) => {
      map.set(member.email, certificate);
    });
    return map;
  }, [certificates]);

  // ── Handle: Start fresh ───────────────────────────────────────────────────
  const handleSendAll = async () => {
    setError('');
    setQuotaStopped(false);

    const validation = validateEmailConfig(subject, body);
    if (!validation.isValid) {
      setError(validation.errors.join('; '));
      return;
    }

    setSending(true);
    const certificateMap = buildCertificateMap();

    try {
      const result = await sendCertificates(
        members,
        certificateMap,
        subject,
        body,
        (prog) => {
          setProgress({ ...prog });
          if (onEmailsSent) onEmailsSent(prog);
        },
        sessionId,
        new Set(),
        (stoppedProg) => {
          setQuotaStopped(true);
          setProgress({ ...stoppedProg });
        }
      );
      setProgress(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send certificates');
    } finally {
      setSending(false);
    }
  };

  // ── Handle: Resume from checkpoint ────────────────────────────────────────
  const handleResume = async (checkpoint) => {
    setError('');
    setQuotaStopped(false);
    setSavedCheckpoint(null);

    const validation = validateEmailConfig(subject, body);
    if (!validation.isValid) {
      setError(validation.errors.join('; '));
      return;
    }

    const alreadySent = new Set(checkpoint.sentEmails || []);
    const certificateMap = buildCertificateMap();

    // Seed UI progress with previously sent count
    setProgress({
      total: members.length,
      sent: alreadySent.size,
      failed: 0,
      failedRecipients: [],
      sentEmails: [...alreadySent],
      stoppedAt: null,
      completed: false
    });

    setSending(true);
    try {
      const result = await sendCertificates(
        members,
        certificateMap,
        subject,
        body,
        (prog) => {
          setProgress({ ...prog });
          if (onEmailsSent) onEmailsSent(prog);
        },
        checkpoint.sessionId || sessionId,
        alreadySent,
        (stoppedProg) => {
          setQuotaStopped(true);
          setProgress({ ...stoppedProg });
        }
      );
      setProgress(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resume sending');
    } finally {
      setSending(false);
    }
  };

  // ── Handle: Retry only failed ─────────────────────────────────────────────
  const handleRetryFailed = async () => {
    if (!progress?.failedRecipients?.length) {
      setError('No failed recipients to retry');
      return;
    }

    setError('');
    setQuotaStopped(false);

    const failedEmails = new Set(progress.failedRecipients.map((r) => r.email));
    const failedMembers = members.filter((m) => failedEmails.has(m.email));
    const certificateMap = buildCertificateMap();

    // Already-sent = everyone NOT in failed list
    const alreadySent = new Set(members.map((m) => m.email).filter((e) => !failedEmails.has(e)));

    setSending(true);
    try {
      const result = await sendCertificates(
        members,
        certificateMap,
        subject,
        body,
        (prog) => {
          setProgress((prev) =>
            prev
              ? {
                  ...prev,
                  sent: prog.sent,
                  failed: prog.failed,
                  failedRecipients: prog.failedRecipients,
                  sentEmails: prog.sentEmails
                }
              : prog
          );
        },
        sessionId,
        alreadySent,
        (stoppedProg) => {
          setQuotaStopped(true);
          setProgress({ ...stoppedProg });
        }
      );
      setProgress(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to retry sending');
    } finally {
      setSending(false);
    }
  };

  // ── Handle: Discard saved checkpoint ─────────────────────────────────────
  const handleDiscardCheckpoint = () => {
    clearCheckpoint();
    setSavedCheckpoint(null);
    setCheckpointDismissed(true);
  };

  // ── Handle: Export CSV ────────────────────────────────────────────────────
  const handleExportCSV = () => {
    const cp = progress || savedCheckpoint;
    if (!cp) return;
    exportProgressCSV(members, cp, cp.sessionId || sessionId);
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────
  const sentCount = progress?.sentEmails?.length ?? progress?.sent ?? 0;
  const totalCount = progress?.total ?? members.length;
  const pct = totalCount > 0 ? Math.round((sentCount / totalCount) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="bg-slate-900/60 backdrop-blur-xl border border-white/[0.05] rounded-3xl p-8 shadow-2xl animate-fade-in">
        <h2 className="text-2xl font-extrabold text-white mb-2 tracking-tight">
          Step 5: Email Delivery to All Recipients
        </h2>
        <p className="text-slate-500 mb-8 text-sm leading-relaxed">
          Configure the email message and send certificates to all {members.length} members.
          Your progress is automatically saved after every email so you can safely resume if
          anything interrupts the delivery.
        </p>

        {/* ── Saved-Checkpoint Banner ──────────────────────────────────────── */}
        {savedCheckpoint && !checkpointDismissed && !progress && (
          <div className="mb-6 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5 space-y-3">
            <div className="flex items-start gap-3">
              <span className="text-2xl">⚡</span>
              <div className="flex-1">
                <p className="text-amber-300 font-bold text-sm mb-1">
                  Previous session detected — safe to resume!
                </p>
                <p className="text-amber-200/70 text-xs leading-relaxed">
                  The last delivery run was saved at{' '}
                  <span className="font-semibold text-amber-300">
                    {new Date(savedCheckpoint.savedAt).toLocaleString()}
                  </span>
                  .&nbsp;
                  <span className="font-bold text-emerald-400">
                    {savedCheckpoint.sentEmails?.length ?? 0} email
                    {savedCheckpoint.sentEmails?.length !== 1 ? 's' : ''} already sent
                  </span>
                  . Resuming will skip those recipients and continue strictly from where it
                  stopped ({savedCheckpoint.stoppedAt
                    ? <>next after <span className="font-mono text-amber-300">{savedCheckpoint.stoppedAt}</span></>
                    : 'the next unsent recipient'}).
                </p>
                {savedCheckpoint.stoppedAt && (
                  <p className="text-xs text-red-400/80 mt-1 font-semibold">
                    ⚠️ Stopped at: {savedCheckpoint.stoppedAt} — likely a quota / rate-limit error.
                  </p>
                )}
              </div>
            </div>

            {/* Checkpoint progress bar */}
            <div className="w-full bg-slate-800 rounded-full h-2">
              <div
                className="bg-emerald-500 h-2 rounded-full transition-all duration-500"
                style={{
                  width: `${Math.round(
                    ((savedCheckpoint.sentEmails?.length ?? 0) / members.length) * 100
                  )}%`
                }}
              />
            </div>
            <p className="text-xs text-slate-400 text-right">
              {savedCheckpoint.sentEmails?.length ?? 0} / {members.length} sent before stop
            </p>

            <div className="flex gap-3 flex-wrap">
              <button
                onClick={() => handleResume(savedCheckpoint)}
                disabled={sending || isLoading}
                className="flex-1 py-2 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold transition-colors duration-200"
              >
                ▶ Resume from checkpoint
              </button>
              <button
                onClick={handleDiscardCheckpoint}
                disabled={sending || isLoading}
                className="py-2 px-4 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm font-medium transition-colors duration-200"
              >
                ✕ Start fresh (discard)
              </button>
              <button
                onClick={handleExportCSV}
                className="py-2 px-4 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm font-medium transition-colors duration-200"
              >
                ↓ Export progress CSV
              </button>
            </div>
          </div>
        )}

        {/* ── Email Configuration (shown only before sending begins) ────────── */}
        {!progress && (
          <div className="grid gap-8">
            <div className="grid gap-3">
              <label className="block mb-2 text-xs font-bold uppercase tracking-widest text-slate-400">
                Email Subject:
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                disabled={sending || isLoading}
                className="w-full px-5 py-3.5 rounded-xl border border-white/[0.05] bg-slate-950 text-gray-100 placeholder-slate-700 focus:border-indigo-500/50 focus:ring-4 focus:ring-indigo-500/5 outline-none transition-all duration-200 font-medium text-sm"
              />
            </div>

            <div className="grid gap-3">
              <label className="block mb-2 text-xs font-bold uppercase tracking-widest text-slate-400">
                Email Body:
              </label>
              <p className="text-[10px] text-slate-600 mb-1 font-bold uppercase tracking-widest">
                Use {'{{name}}'} placeholder for personalization
              </p>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                disabled={sending || isLoading}
                className="w-full px-5 py-3.5 rounded-xl border border-white/[0.05] bg-slate-950 text-white placeholder-slate-700 focus:border-indigo-500/50 focus:ring-4 focus:ring-indigo-500/5 outline-none transition-all duration-200 font-medium text-sm resize-none min-h-[150px]"
                rows={6}
              />
            </div>

            {/* Preview toggle */}
            <button
              onClick={() => setShowPreview(!showPreview)}
              className="btn-secondary w-full"
              disabled={sending || isLoading}
            >
              {showPreview ? '✓ Hide Email Preview' : '👁️ Show Email Preview'}
            </button>

            {showPreview && (
              <div className={styles.previewEmail}>
                <h4 className="font-bold text-indigo-400 mb-2">
                  Email Preview (for {members[0]?.fullName || 'Participant'}):
                </h4>
                <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-lg text-sm text-slate-300 leading-relaxed">
                  <p className="mb-1"><strong>To:</strong> {members[0]?.email || 'participant@example.com'}</p>
                  <p className="mb-3"><strong>Subject:</strong> {subject}</p>
                  <hr className="border-slate-800 mb-3" />
                  <div className="whitespace-pre-wrap">
                    {body.replace('{{name}}', members[0]?.fullName || 'Participant')}
                  </div>
                  <div className="mt-4 p-2 bg-slate-800/50 rounded border border-slate-700 inline-flex items-center gap-2 text-xs">
                    <span className="text-xl">📄</span>
                    <span>{members[0]?.fullName.replace(/\s+/g, '_') || 'Participant'}_Certificate.pdf</span>
                  </div>
                </div>
              </div>
            )}

            {error && <div className={styles.error}>{error}</div>}

            <button
              onClick={handleSendAll}
              disabled={sending || isLoading}
              className="btn-primary w-full mt-10 !bg-emerald-600 hover:!bg-emerald-500 !shadow-emerald-900/20"
            >
              {sending ? '📧 Sending...' : '✓ Send Certificates to All Members'}
            </button>
          </div>
        )}

        {/* ── Sending / Progress View ───────────────────────────────────────── */}
        {progress && (
          <div className={styles.progressSection}>
            <h3 className="text-xl font-bold text-indigo-400 mb-4">📧 Delivery Status</h3>

            {/* Stat cards */}
            <div className={styles.stats}>
              <div className={styles.stat}>
                <span className={styles.statLabel}>Total:</span>
                <span className={styles.statValue}>{totalCount}</span>
              </div>
              <div className={`${styles.stat} ${styles.success}`}>
                <span className={styles.statLabel}>Sent:</span>
                <span className={styles.statValue}>{sentCount}</span>
              </div>
              <div className={`${styles.stat} ${styles.failed}`}>
                <span className={styles.statLabel}>Failed:</span>
                <span className={styles.statValue}>{progress.failed}</span>
              </div>
            </div>

            {/* Progress bar */}
            <div className="w-full bg-slate-800 rounded-full h-2.5 my-4">
              <div
                className="bg-indigo-500 h-2.5 rounded-full transition-all duration-500"
                style={{ width: `${pct}%` }}
              />
            </div>
            <p className="text-xs text-slate-400 mb-4 text-right">{pct}% delivered</p>

            {/* ── Quota / rate-limit stop banner ────────────────────────────── */}
            {quotaStopped && !sending && (
              <div className="mb-5 rounded-2xl border border-red-500/40 bg-red-500/10 p-5 space-y-2">
                <p className="text-red-300 font-bold text-sm flex items-center gap-2">
                  <span>🚫</span> Delivery paused — Resend quota / rate-limit reached
                </p>
                <p className="text-red-200/70 text-xs leading-relaxed">
                  Your checkpoint is saved. Once your Resend quota resets, click{' '}
                  <strong>Resume from checkpoint</strong> below and the system will
                  continue strictly from{' '}
                  <span className="font-mono text-red-300">{progress.stoppedAt}</span> —
                  no one who already received their certificate will be emailed again.
                </p>
                <div className="flex gap-3 flex-wrap mt-2">
                  <button
                    onClick={() => handleResume({ ...progress, sentEmails: progress.sentEmails })}
                    disabled={sending || isLoading}
                    className="py-2 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors duration-200"
                  >
                    ▶ Resume from checkpoint
                  </button>
                  <button
                    onClick={handleExportCSV}
                    className="py-2 px-4 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs font-medium transition-colors duration-200"
                  >
                    ↓ Export progress CSV
                  </button>
                </div>
              </div>
            )}

            {/* Sent list (scrollable) */}
            {progress.sentEmails && progress.sentEmails.length > 0 && (
              <details className="mb-4">
                <summary className="cursor-pointer text-xs font-bold text-emerald-400 mb-2 select-none">
                  ✓ Show {progress.sentEmails.length} successfully delivered recipients
                </summary>
                <div className="max-h-40 overflow-y-auto bg-slate-900/50 p-3 rounded-lg border border-slate-800 mt-2">
                  <ul className="text-xs space-y-1">
                    {progress.sentEmails.map((email, idx) => (
                      <li key={idx} className="text-emerald-400/80">✓ {email}</li>
                    ))}
                  </ul>
                </div>
              </details>
            )}

            {/* Failed list */}
            {progress.failedRecipients.length > 0 && (
              <div className={styles.failedList}>
                <h4 className="font-bold text-red-400 mb-2">Failed Recipients:</h4>
                <div className="max-h-40 overflow-y-auto bg-slate-900/50 p-3 rounded-lg border border-slate-800 mb-4">
                  <ul className="text-xs space-y-1">
                    {progress.failedRecipients.map((recipient, idx) => (
                      <li key={idx} className="text-slate-400">
                        <span className="text-red-400 font-semibold">{recipient.email}</span>:{' '}
                        {recipient.error}
                      </li>
                    ))}
                  </ul>
                </div>
                {!quotaStopped && (
                  <button
                    onClick={handleRetryFailed}
                    disabled={sending || isLoading}
                    className={styles.retryBtn}
                  >
                    🔄 Retry Failed Recipients
                  </button>
                )}
              </div>
            )}

            {/* All done */}
            {progress.completed && (
              <div className={styles.successMessage}>
                <p className="text-xl font-extrabold mb-2 uppercase tracking-tighter">
                  ✓ Delivery Complete
                </p>
                <p className="text-sm font-medium opacity-80">
                  All {sentCount} certificates sent successfully as PDF attachments.
                </p>
              </div>
            )}

            {/* Error */}
            {error && <div className={`${styles.error} mt-4`}>{error}</div>}

            {/* Export CSV always visible once progress starts */}
            <button
              onClick={handleExportCSV}
              className="mt-4 w-full py-2.5 rounded-xl border border-slate-700 bg-slate-800/50 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-colors duration-200"
            >
              ↓ Export Delivery Report (CSV)
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
