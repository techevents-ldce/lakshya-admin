import { useState, useEffect } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { HiOutlineCheckCircle, HiOutlineLockClosed, HiOutlineShieldCheck, HiOutlineExclamation } from 'react-icons/hi';
import ConfirmWithPassword from '../components/ConfirmWithPassword';

export default function Payments() {
  const [verified, setVerified] = useState(false);
  const [password, setPassword] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState('');

  const [payments, setPayments] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);

  // Confirmation modal state (for verify payment action)
  const [confirmModal, setConfirmModal] = useState({ open: false, title: '', message: '', confirmLabel: '', variant: 'warning', action: null });

  const handleVerifyPassword = async () => {
    if (!password.trim()) { setVerifyError('Password is required'); return; }
    setVerifying(true);
    setVerifyError('');
    try {
      await api.post('/auth/verify-password', { password });
      setVerified(true);
    } catch (err) {
      setVerifyError(err?.response?.data?.message || 'Incorrect password. Please try again.');
    } finally { setVerifying(false); }
  };

  const fetchPayments = async () => {
    setLoading(true);
    try {
      const params = { page, limit: 15 };
      if (statusFilter) params.status = statusFilter;
      const { data } = await api.get('/payments', { params });
      setPayments(data.payments);
      setTotal(data.pages);
    } catch { toast.error('Failed to load payments'); }
    finally { setLoading(false); }
  };

  useEffect(() => { if (verified) fetchPayments(); }, [page, statusFilter, verified]);

  const handleVerify = (id, participantName) => {
    setConfirmModal({
      open: true,
      title: 'Verify Payment',
      message: `You are about to verify the payment from "${participantName || 'Unknown'}". This will mark the payment as completed.`,
      confirmLabel: 'Verify Payment',
      variant: 'warning',
      action: async (password) => {
        await api.patch(`/payments/${id}/verify`, { adminPassword: password });
        toast.success('Payment verified');
        fetchPayments();
      },
    });
  };

  const statusColor = { completed: 'badge-green', pending: 'badge-yellow', failed: 'badge-red', refunded: 'badge-blue' };

  // --- Password Gate ---
  if (!verified) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="card max-w-sm w-full p-6 text-center space-y-4">
          <div className="mx-auto w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center">
            <HiOutlineShieldCheck className="w-8 h-8 text-blue-600" />
          </div>
          <h2 className="text-lg font-bold text-gray-900">Verify Your Identity</h2>
          <p className="text-gray-500 text-sm">Enter your admin password to view payment data.</p>
          <div className="relative">
            <HiOutlineLockClosed className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setVerifyError(''); }}
              onKeyDown={(e) => { if (e.key === 'Enter' && !verifying) handleVerifyPassword(); }}
              className="input-field pl-10"
              autoComplete="current-password"
              autoFocus
            />
          </div>
          {verifyError && (
            <p className="text-red-500 text-xs flex items-center justify-center gap-1">
              <HiOutlineExclamation className="w-4 h-4 flex-shrink-0" />{verifyError}
            </p>
          )}
          <button
            onClick={handleVerifyPassword}
            disabled={verifying || !password.trim()}
            className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {verifying ? 'Verifying...' : 'Unlock Payments'}
          </button>
        </div>
      </div>
    );
  }

  // --- Main Content ---
  return (
    <div>
      <h1 className="text-lg sm:text-2xl font-bold mb-6">Payment Management</h1>

      <div className="mb-6">
        <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} className="input-field w-full sm:max-w-xs">
          <option value="">All Status</option>
          <option value="pending">Pending</option>
          <option value="completed">Completed</option>
          <option value="failed">Failed</option>
          <option value="refunded">Refunded</option>
        </select>
      </div>

      {loading ? <div className="text-center py-12 text-gray-400">Loading...</div> : (
        <div className="card overflow-hidden p-0 overflow-x-auto">
          <table className="w-full text-sm min-w-[450px]">
            <thead><tr className="table-header">
              <th className="px-5 py-3">Participant</th><th className="px-5 py-3 hidden sm:table-cell">Event</th><th className="px-5 py-3">Amount</th><th className="px-5 py-3">Status</th><th className="px-5 py-3 hidden md:table-cell">Transaction ID</th><th className="px-5 py-3">Action</th>
            </tr></thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p._id} className="border-t border-gray-100 hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3 font-medium">{p.userId?.name}</td>
                  <td className="px-5 py-3 hidden sm:table-cell">{p.eventId?.title}</td>
                  <td className="px-5 py-3 font-semibold">₹{p.amount}</td>
                  <td className="px-5 py-3"><span className={`badge ${statusColor[p.status]}`}>{p.status}</span></td>
                  <td className="px-5 py-3 text-gray-400 text-xs font-mono hidden md:table-cell">{p.transactionId || '—'}</td>
                  <td className="px-5 py-3">
                    {p.status === 'pending' && (
                      <button onClick={() => handleVerify(p._id, p.userId?.name)} className="text-emerald-600 hover:text-emerald-800 flex items-center gap-1 text-xs font-medium">
                        <HiOutlineCheckCircle className="w-4 h-4" /> Verify
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {payments.length === 0 && <tr><td colSpan="6" className="text-center py-8 text-gray-400">No payments found</td></tr>}
            </tbody>
          </table>
          {total > 1 && (
            <div className="flex flex-wrap items-center justify-center gap-2 py-4 border-t border-gray-100">
              {Array.from({ length: total }, (_, i) => (
                <button key={i} onClick={() => setPage(i + 1)} className={`w-8 h-8 rounded-lg text-sm font-medium ${page === i + 1 ? 'bg-primary-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>{i + 1}</button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Confirm with Password Modal */}
      <ConfirmWithPassword
        open={confirmModal.open}
        onClose={() => setConfirmModal((prev) => ({ ...prev, open: false }))}
        onConfirm={confirmModal.action}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmLabel={confirmModal.confirmLabel}
        variant={confirmModal.variant}
      />
    </div>
  );
}
