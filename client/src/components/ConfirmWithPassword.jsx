import { useState, useEffect, useRef } from 'react';
import { HiOutlineExclamation, HiOutlineLockClosed, HiOutlineShieldCheck } from 'react-icons/hi';
import { useAuth } from '../context/AuthContext';

/**
 * ConfirmWithPassword – Two-step confirmation modal.
 *
 * Step 1: "Are you sure?" confirmation with action description.
 * Step 2: Admin password input to verify identity.
 *
 * Step 2: Admin password input to verify identity.
 *
 * For superadmin, Step 2 is skipped.
 *
 * Props:
 *   open       – boolean to show/hide modal
 *   onClose    – callback when modal is cancelled/closed
 *   onConfirm  – async callback(password) called on final confirmation
 *   title      – e.g. "Delete Event"
 *   message    – e.g. "You are about to delete 'Hackathon'. This action cannot be undone."
 *   confirmLabel – text for the final confirm button (default: "Confirm")
 *   variant    – "danger" | "warning" (default: "danger")
 */
export default function ConfirmWithPassword({ open, onClose, onConfirm, title, message, confirmLabel = 'Confirm', variant = 'danger' }) {
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const passwordRef = useRef(null);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (open) {
      setStep(1);
      setPassword('');
      setError('');
      setLoading(false);
    }
  }, [open]);

  // Auto-focus password input on step 2
  useEffect(() => {
    if (step === 2 && passwordRef.current) {
      passwordRef.current.focus();
    }
  }, [step]);

  if (!open) return null;

  const handleProceed = async () => {
    if (user?.role === 'superadmin') {
      setLoading(true);
      setError('');
      try {
        await onConfirm(''); // Skip password re-verification
        onClose();
      } catch (err) {
        setError(err?.response?.data?.message || err?.userMessage || 'Action failed');
      } finally {
        setLoading(false);
      }
      return;
    }
    setStep(2);
  };

  const handleConfirm = async () => {
    if (!password.trim()) {
      setError('Password is required');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await onConfirm(password);
      onClose();
    } catch (err) {
      const msg = err?.response?.data?.message || err?.userMessage || 'Incorrect password. Please try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !loading) handleConfirm();
  };

  const iconColor = variant === 'danger' ? 'text-red-400' : 'text-amber-400';
  const iconBg = variant === 'danger' ? 'bg-red-400/10 border-red-500/20' : 'bg-amber-400/10 border-amber-500/20';
  const btnClass = variant === 'danger'
    ? 'bg-red-600 hover:bg-red-500 shadow-red-900/20'
    : 'bg-amber-600 hover:bg-amber-500 shadow-amber-900/20';

  return (
    <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md flex items-center justify-center z-[100] p-4 animate-fade-in" onClick={onClose}>
      <div
        className="bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto custom-scrollbar animate-slide-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-8 pt-10 pb-4 text-center">
          {step === 1 ? (
            <div className={`mx-auto w-16 h-16 rounded-2xl flex items-center justify-center mb-6 border ${iconBg} shadow-lg`}>
              <HiOutlineExclamation className={`w-8 h-8 ${iconColor}`} />
            </div>
          ) : (
            <div className="mx-auto w-16 h-16 rounded-2xl bg-primary-500/10 border border-primary-500/20 flex items-center justify-center mb-6 shadow-lg">
              <HiOutlineShieldCheck className="w-8 h-8 text-primary-400" />
            </div>
          )}
          <h3 className="text-xl font-bold text-white tracking-tight">{step === 1 ? title : 'Identity Verification'}</h3>
        </div>

        {/* Body */}
        <div className="px-8 py-4">
          {step === 1 ? (
            <>
              <p className="text-slate-400 text-sm text-center leading-relaxed font-medium">{message}</p>
              {user?.role !== 'superadmin' && (
                <div className="mt-6 p-3 rounded-xl bg-slate-800/30 border border-slate-700/30 text-center">
                  <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">Security Note</p>
                  <p className="text-slate-400 text-[11px] mt-1">Authentication required in the next step.</p>
                </div>
              )}
            </>
          ) : (
            <div className="space-y-6">
              <p className="text-slate-400 text-sm text-center font-medium">Please enter your admin credentials to authorize this action.</p>
              <div className="relative group">
                <HiOutlineLockClosed className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-primary-400 w-5 h-5 transition-colors" />
                <input
                  ref={passwordRef}
                  type="password"
                  placeholder="Admin Password"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(''); }}
                  onKeyDown={handleKeyDown}
                  className="input-field pl-12"
                  autoComplete="current-password"
                />
              </div>
            </div>
          )}
          {error && (
            <div className="mt-6 p-4 rounded-xl bg-red-400/10 border border-red-500/20 animate-fade-in">
               <p className="text-red-400 text-[11px] text-center font-bold uppercase tracking-wider">{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-8 py-8 flex gap-3">
          <button
            onClick={onClose}
            className="btn-outline flex-1 py-3 text-sm"
          >
            Cancel
          </button>
          {step === 1 ? (
            <button
              onClick={handleProceed}
              disabled={loading}
              className={`${btnClass} text-white flex-[1.5] py-3 rounded-xl font-bold transition-all shadow-xl active:scale-95 disabled:opacity-50 text-sm uppercase tracking-widest`}
            >
              {loading ? 'Processing...' : (user?.role === 'superadmin' ? confirmLabel : 'Continue')}
            </button>
          ) : (
            <button
              onClick={handleConfirm}
              disabled={loading || !password.trim()}
              className="bg-primary-600 hover:bg-primary-500 text-white flex-[1.5] py-3 rounded-xl font-bold transition-all shadow-xl shadow-primary-900/20 active:scale-95 disabled:opacity-50 text-sm uppercase tracking-widest"
            >
              {loading ? 'Verifying...' : confirmLabel}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
