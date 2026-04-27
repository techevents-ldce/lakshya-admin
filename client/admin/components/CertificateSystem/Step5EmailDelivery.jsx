import { useState } from 'react';
import { sendCertificates, validateEmailConfig } from './utils/emailService';
import styles from './Step5EmailDelivery.module.css';

export const Step5EmailDelivery = ({
  members,
  certificates,
  onEmailsSent,
  isLoading = false
}) => {
  const [subject, setSubject] = useState('Your Certificate from Lakshya TechFest 2026');
  const [body, setBody] = useState(
    'Dear {{name}},\n\nCongratulations! We are pleased to send you your certificate for participating in Lakshya TechFest 2026.\n\nBest regards,\nThe Lakshya Team'
  );
  const [showPreview, setShowPreview] = useState(false);
  const [sending, setSending] = useState(false);
  const [progress, setProgress] = useState(null);
  const [error, setError] = useState('');

  const handleSendAll = async () => {
    setError('');

    // Validate configuration
    const validation = validateEmailConfig(subject, body);
    if (!validation.isValid) {
      setError(validation.errors.join('; '));
      return;
    }

    setSending(true);
    // Create certificate map
    const certificateMap = new Map();
    certificates.forEach(({ member, certificate }) => {
      certificateMap.set(member.email, certificate);
    });

    try {
      const result = await sendCertificates(
        members,
        certificateMap,
        subject,
        body,
        (prog) => {
          setProgress({ ...prog });
          if (onEmailsSent) onEmailsSent(prog);
        }
      );

      setProgress(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send certificates');
    } finally {
      setSending(false);
    }
  };

  const handleRetryFailed = async () => {
    if (!progress?.failedRecipients || progress.failedRecipients.length === 0) {
      setError('No failed recipients to retry');
      return;
    }

    const failedMembers = members.filter((m) =>
      progress.failedRecipients.some((f) => f.email === m.email)
    );

    const certificateMap = new Map();
    certificates.forEach(({ member, certificate }) => {
      certificateMap.set(member.email, certificate);
    });

    setSending(true);
    try {
      const result = await sendCertificates(
        failedMembers,
        certificateMap,
        subject,
        body,
        (prog) => {
          setProgress((prev) =>
            prev
              ? {
                ...prev,
                sent: prev.sent + prog.sent,
                failed: (prev.failed || 0) - (prog.sent), // Rough update
                failedRecipients: [
                  ...prev.failedRecipients.filter(
                    (f) => !prog.failedRecipients.some((nf) => nf.email === f.email)
                  ),
                  ...prog.failedRecipients
                ]
              }
              : prog
          );
        }
      );

      // Final sync of progress
      setProgress(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to retry sending');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-slate-900/60 backdrop-blur-xl border border-white/[0.05] rounded-3xl p-8 shadow-2xl animate-fade-in">
        <h2 className="text-2xl font-extrabold text-white mb-2 tracking-tight">Step 5: Email Delivery to All Recipients</h2>
        <p className="text-slate-500 mb-8 text-sm leading-relaxed">
          Configure the email message and send certificates to all {members.length} members.
        </p>

        {/* Email Configuration */}
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
              <p className="text-[10px] text-slate-600 mb-1 font-bold uppercase tracking-widest">Use {'{{name}}'} placeholder for personalization</p>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                disabled={sending || isLoading}
                className="w-full px-5 py-3.5 rounded-xl border border-white/[0.05] bg-slate-950 text-white placeholder-slate-700 focus:border-indigo-500/50 focus:ring-4 focus:ring-indigo-500/5 outline-none transition-all duration-200 font-medium text-sm resize-none min-h-[150px]"
                rows={6}
              />
            </div>

            {/* Email Preview */}
            <button
              onClick={() => setShowPreview(!showPreview)}
              className="btn-secondary w-full"
              disabled={sending || isLoading}
            >
              {showPreview ? '✓ Hide Email Preview' : '👁️ Show Email Preview'}
            </button>

            {showPreview && (
              <div className={styles.previewEmail}>
                <h4 className="font-bold text-indigo-400 mb-2">Email Preview (for {members[0]?.fullName || 'Participant'}):</h4>
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

        {/* Sending Progress */}
        {progress && (
          <div className={styles.progressSection}>
            <h3 className="text-xl font-bold text-indigo-400 mb-4">📧 Delivery Status</h3>
            <div className={styles.stats}>
              <div className={styles.stat}>
                <span className={styles.statLabel}>Total:</span>
                <span className={styles.statValue}>{progress.total}</span>
              </div>
              <div className={`${styles.stat} ${styles.success}`}>
                <span className={styles.statLabel}>Sent:</span>
                <span className={styles.statValue}>{progress.sent}</span>
              </div>
              <div className={`${styles.stat} ${styles.failed}`}>
                <span className={styles.statLabel}>Failed:</span>
                <span className={styles.statValue}>{progress.failed}</span>
              </div>
            </div>

            {progress.failedRecipients.length > 0 && (
              <div className={styles.failedList}>
                <h4 className="font-bold text-red-400 mb-2">Failed Recipients:</h4>
                <div className="max-h-40 overflow-y-auto bg-slate-900/50 p-3 rounded-lg border border-slate-800 mb-4">
                  <ul className="text-xs space-y-1">
                    {progress.failedRecipients.map((recipient, idx) => (
                      <li key={idx} className="text-slate-400">
                        <span className="text-red-400 font-semibold">{recipient.email}</span>: {recipient.error}
                      </li>
                    ))}
                  </ul>
                </div>
                <button
                  onClick={handleRetryFailed}
                  disabled={sending || isLoading}
                  className={styles.retryBtn}
                >
                  🔄 Retry Failed Recipients
                </button>
              </div>
            )}

            {progress.total > 0 && progress.failed === 0 && progress.sent === progress.total && (
              <div className={styles.successMessage}>
                <p className="text-xl font-extrabold mb-2 uppercase tracking-tighter">✓ Delivery Complete</p>
                <p className="text-sm font-medium opacity-80">All {progress.sent} certificates sent successfully as PDF attachments.</p>
              </div>
            )}

            {progress.failed > 0 && !sending && (
              <div className="mt-4 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-xs font-bold text-center">
                ⚠️ Some deliveries failed. You can attempt to retry the failed recipients.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
