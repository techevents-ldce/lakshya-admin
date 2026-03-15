import { useState, useEffect, useRef } from 'react';
import { HiOutlineExclamation, HiOutlineLockClosed, HiOutlineShieldCheck } from 'react-icons/hi';

/**
 * ConfirmWithPassword – Two-step confirmation modal.
 *
 * Step 1: "Are you sure?" confirmation with action description.
 * Step 2: Admin password input to verify identity.
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

  const handleProceed = () => setStep(2);

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

  const iconColor = variant === 'danger' ? 'text-red-500' : 'text-amber-500';
  const btnClass = variant === 'danger'
    ? 'bg-red-600 hover:bg-red-700 focus:ring-red-300'
    : 'bg-amber-600 hover:bg-amber-700 focus:ring-amber-300';

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-[scaleIn_0.2s_ease-out]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 pt-6 pb-2 text-center">
          {step === 1 ? (
            <div className={`mx-auto w-14 h-14 rounded-full flex items-center justify-center mb-3 ${variant === 'danger' ? 'bg-red-100' : 'bg-amber-100'}`}>
              <HiOutlineExclamation className={`w-8 h-8 ${iconColor}`} />
            </div>
          ) : (
            <div className="mx-auto w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center mb-3">
              <HiOutlineShieldCheck className="w-8 h-8 text-blue-600" />
            </div>
          )}
          <h3 className="text-lg font-bold text-gray-900">{step === 1 ? title : 'Verify Your Identity'}</h3>
        </div>

        {/* Body */}
        <div className="px-6 py-4">
          {step === 1 ? (
            <>
              <p className="text-gray-600 text-sm text-center leading-relaxed">{message}</p>
              <p className="text-gray-400 text-xs text-center mt-2">You will need to confirm your admin password in the next step.</p>
            </>
          ) : (
            <>
              <p className="text-gray-600 text-sm text-center mb-4">
                Enter your admin password to confirm this action.
              </p>
              <div className="relative">
                <HiOutlineLockClosed className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  ref={passwordRef}
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(''); }}
                  onKeyDown={handleKeyDown}
                  className="input-field pl-10"
                  autoComplete="current-password"
                />
              </div>
              {error && (
                <p className="text-red-500 text-xs mt-2 flex items-center gap-1">
                  <HiOutlineExclamation className="w-4 h-4 flex-shrink-0" />
                  {error}
                </p>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="btn-outline flex-1"
          >
            Cancel
          </button>
          {step === 1 ? (
            <button
              type="button"
              onClick={handleProceed}
              className={`flex-1 text-white font-semibold px-5 py-2.5 rounded-lg transition-all duration-200 ${btnClass}`}
            >
              Proceed
            </button>
          ) : (
            <button
              type="button"
              onClick={handleConfirm}
              disabled={loading || !password.trim()}
              className={`flex-1 text-white font-semibold px-5 py-2.5 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${btnClass}`}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" /></svg>
                  Verifying...
                </span>
              ) : confirmLabel}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
