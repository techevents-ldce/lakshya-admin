import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';
import { 
  HiOutlineCheckCircle, 
  HiOutlineLockClosed, 
  HiOutlineShieldCheck, 
  HiOutlineExclamation, 
  HiOutlineSearch,
  HiOutlineCurrencyRupee,
  HiOutlineRefresh,
  HiOutlineFilter,
  HiOutlineFingerPrint,
} from 'react-icons/hi';
import ConfirmWithPassword from '../components/ConfirmWithPassword';
import { useAuth } from '../context/AuthContext';

const STATUS_CONFIG = {
  completed: { label: 'Paid', color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/30' },
  pending: { label: 'Pending', color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/30' },
  failed: { label: 'Failed', color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/30' },
  refunded: { label: 'Refunded', color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/30' },
};

export default function Payments() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [verified, setVerified] = useState(false);
  const [password, setPassword] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState('');

  const [payments, setPayments] = useState([]);
  const [events, setEvents] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [eventFilter, setEventFilter] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  // Confirmation modal state (for verify payment action)
  const [confirmModal, setConfirmModal] = useState({ open: false, title: '', message: '', confirmLabel: '', variant: 'warning', action: null });

  // Auto-verify for superadmin
  useEffect(() => {
    if (user?.role === 'superadmin') {
      setVerified(true);
    }
  }, [user]);

  const handleVerifyPassword = async () => {
    if (!password.trim()) { setVerifyError('Password is required'); return; }
    setVerifying(true);
    setVerifyError('');
    try {
      await api.post('/auth/verify-password', { password });
      setVerified(true);
    } catch (err) {
      setVerifyError(err?.response?.data?.message || 'Incorrect password. Verification failed.');
    } finally { setVerifying(false); }
  };

  useEffect(() => {
    if (verified) {
      api.get('/events', { params: { limit: 200 } }).then(({ data }) => setEvents(data.events)).catch(() => {});
    }
  }, [verified]);

  const fetchPayments = async () => {
    setLoading(true);
    try {
      const params = { page, limit: 15 };
      if (statusFilter) params.status = statusFilter;
      if (eventFilter) params.eventId = eventFilter;
      if (search) params.search = search;
      const { data } = await api.get('/payments', { params });
      setPayments(data.payments);
      setTotal(data.pages);
    } catch { toast.error('Failed to load payment records'); }
    finally { setLoading(false); }
  };

  useEffect(() => { if (verified) fetchPayments(); }, [page, statusFilter, eventFilter, search, verified]);

  const handleVerify = (id, participantName) => {
    setConfirmModal({
      open: true,
      title: 'Confirm Payment',
      message: `You are about to manually confirm the payment for "${participantName || 'Unknown User'}". This will update the payment status permanently.`,
      confirmLabel: 'CONFIRM PAYMENT',
      variant: 'warning',
      action: async (password) => {
        await api.patch(`/payments/${id}/verify`, { adminPassword: password });
        toast.success('Payment confirmed successfully');
        fetchPayments();
      },
    });
  };

  // --- Password Gate ---
  if (!verified) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] animate-fade-in px-4">
        <div className="card max-w-sm w-full p-10 text-center space-y-10 relative overflow-hidden group border-slate-700/50 bg-slate-900/40 backdrop-blur-3xl shadow-2xl">
          <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/10 blur-[100px] -mr-24 -mt-24 group-hover:bg-emerald-500/20 transition-all duration-700"></div>
          <div className="mx-auto w-20 h-20 rounded-[2.5rem] bg-slate-900 border border-slate-800 flex items-center justify-center relative z-10 shadow-2xl group-hover:rotate-0 rotate-12 transition-transform duration-500">
            <HiOutlineLockClosed className="w-10 h-10 text-primary-500" />
          </div>
          <div className="relative z-10 space-y-3">
            <h2 className="text-2xl font-black text-white uppercase tracking-tighter">Payment Security</h2>
            <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.3em] leading-relaxed max-w-[200px] mx-auto">Authorized access only to view and manage transactions</p>
          </div>
          <div className="relative group/input">
            <HiOutlineFingerPrint className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within/input:text-primary-400 w-5 h-5 transition-colors" />
            <input
              type="password"
              placeholder="Enter Admin Password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setVerifyError(''); }}
              onKeyDown={(e) => { if (e.key === 'Enter' && !verifying) handleVerifyPassword(); }}
              className="input-field pl-12 py-4 focus:ring-primary-500/20"
              autoComplete="current-password"
              autoFocus
            />
          </div>
          {verifyError && (
            <div className="p-4 rounded-2xl bg-red-400/10 border border-red-500/20 animate-shake">
               <p className="text-red-400 text-[10px] font-black uppercase tracking-widest leading-tight">{verifyError}</p>
            </div>
          )}
          <button
            onClick={handleVerifyPassword}
            disabled={verifying || !password.trim()}
            className="btn-primary w-full py-4 uppercase tracking-[0.3em] text-[10px] font-black shadow-2xl shadow-primary-900/50 relative z-10 active:scale-95"
          >
            {verifying ? 'Verifying...' : 'Verify Access'}
          </button>
        </div>
      </div>
    );
  }

  // --- Main Content ---
  return (
    <div className="animate-fade-in space-y-8">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tighter uppercase mb-2">Payment Management</h1>
          <p className="text-slate-500 font-medium">Monitor and manage all payment transactions across the system</p>
        </div>
      </div>

      {/* Control Panel */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-4 bg-slate-900/40 p-3 rounded-2xl border border-slate-700/30 backdrop-blur-xl transition-all shadow-xl">
        <div className="relative group flex-1 min-w-[300px]">
          <HiOutlineSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-primary-400 w-5 h-5 transition-colors" />
          <input type="text" placeholder="Search by name, email, or transaction ID..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="input-field pl-12" />
        </div>
        <div className="flex flex-wrap items-center gap-4 px-2">
           <div className="h-8 w-px bg-slate-800 hidden lg:block"></div>
           
           <div className="flex items-center gap-2 group px-4 py-2 hover:bg-white/[0.02] rounded-xl transition-all cursor-pointer">
              <HiOutlineFilter className="w-4 h-4 text-slate-500 group-hover:text-primary-400" />
              <select value={eventFilter} onChange={(e) => { setEventFilter(e.target.value); setPage(1); }} className="bg-transparent text-[10px] font-black text-slate-400 uppercase tracking-widest outline-none cursor-pointer">
                <option value="" className="bg-slate-900">All Events</option>
                {events.map((ev) => <option key={ev._id} value={ev._id} className="bg-slate-900">{ev.title}</option>)}
              </select>
           </div>

           <div className="h-8 w-px bg-slate-800 hidden lg:block"></div>

           <div className="flex items-center gap-2 group px-4 py-2 hover:bg-white/[0.02] rounded-xl transition-all cursor-pointer">
              <HiOutlineShieldCheck className="w-4 h-4 text-slate-500 group-hover:text-primary-400" />
              <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} className="bg-transparent text-[10px] font-black text-slate-400 uppercase tracking-widest outline-none cursor-pointer">
                <option value="" className="bg-slate-900">All Statuses</option>
                {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                  <option key={key} value={key} className="bg-slate-900">{cfg.label}</option>
                ))}
              </select>
           </div>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-32 gap-6">
          <HiOutlineRefresh className="w-12 h-12 text-primary-500 animate-spin" />
          <p className="text-[11px] font-black text-slate-600 uppercase tracking-[0.4em] animate-pulse">Loading Payments...</p>
        </div>
      ) : (
        <div className="card !p-0 border-slate-700/30 overflow-hidden shadow-2xl bg-slate-900/20 backdrop-blur-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-white/[0.01]">
                  <th className="px-8 py-6 text-[10px] font-black text-slate-600 uppercase tracking-[0.2em]">Payer Name</th>
                  <th className="px-8 py-6 text-[10px] font-black text-slate-600 uppercase tracking-[0.2em]">Event Name</th>
                  <th className="px-8 py-6 text-[10px] font-black text-slate-600 uppercase tracking-[0.2em]">Amount</th>
                  <th className="px-8 py-6 text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] text-center">Status</th>
                  <th className="px-8 py-6 text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] hidden md:table-cell">Details</th>
                  <th className="px-8 py-6 text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.02]">
                {payments.map((p) => {
                  const cfg = STATUS_CONFIG[p.status] || STATUS_CONFIG.pending;
                  return (
                    <tr key={p._id} className="group hover:bg-white/[0.02] transition-all cursor-default">
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-4">
                          <div className="w-11 h-11 rounded-[1.25rem] bg-slate-900 border border-slate-800 flex items-center justify-center text-[11px] font-black text-slate-500 group-hover:bg-primary-500 group-hover:text-white group-hover:border-primary-500/30 transition-all shadow-xl">
                            {p.userId?.name?.[0].toUpperCase() || 'U'}
                          </div>
                          <div>
                            <p className="text-sm font-black text-white group-hover:text-primary-400 transition-colors uppercase tracking-tight leading-none mb-2">{p.userId?.name || 'Unknown User'}</p>
                            <p className="text-[10px] text-slate-600 font-bold uppercase tracking-widest truncate max-w-[150px]">{p.userId?.email || 'No Email'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest truncate max-w-[200px]">{p.eventId?.title || 'General Payment'}</p>
                      </td>
                      <td className="px-8 py-6">
                         <div className="flex items-center gap-2 text-base font-black text-white tabular-nums tracking-tighter hover:text-emerald-400 transition-colors">
                            <HiOutlineCurrencyRupee className="w-5 h-5 text-emerald-500" />
                            {Number(p.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                         </div>
                      </td>
                      <td className="px-8 py-6 text-center">
                        <span className={`px-4 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${cfg.bg} ${cfg.color} shadow-lg shadow-black/20`}>
                           {cfg.label}
                        </span>
                      </td>
                      <td className="px-8 py-6 hidden md:table-cell">
                        <p className="text-[10px] font-black font-mono text-slate-600 uppercase tracking-widest truncate max-w-[120px] mb-2">{p.transactionId || 'No ID'}</p>
                        <p className="text-[9px] text-slate-700 font-black uppercase tracking-tighter">{p.createdAt ? new Date(p.createdAt).toLocaleDateString() : 'Unknown Date'}</p>
                      </td>
                      <td className="px-8 py-6 text-right">
                        {p.status === 'pending' && p.canVerify !== false && (
                          <button onClick={() => handleVerify(p._id, p.userId?.name)} 
                                  className="px-6 py-2.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase tracking-[0.2em] hover:bg-emerald-500 hover:text-white transition-all shadow-2xl active:scale-95 group-hover:animate-pulse">
                            Verify Payment
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {payments.length === 0 && (
                  <tr>
                    <td colSpan="6" className="text-center py-40">
                       <HiOutlineExclamation className="w-16 h-16 text-slate-800 mx-auto mb-6" />
                       <p className="text-[11px] font-black text-slate-700 uppercase tracking-[0.4em] mb-4">No payments found</p>
                       <button onClick={() => navigate('/orders')} className="text-[10px] font-black text-primary-500 hover:text-primary-400 uppercase tracking-[0.3em] border-b border-primary-500/30 pb-1 transition-all">View All Orders</button>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {/* Pagination */}
          {total > 1 && (
            <div className="flex items-center justify-center gap-4 py-10 bg-white/[0.01] border-t border-white/[0.05] shadow-2xl rounded-2xl">
              {[...Array(total)].map((_, i) => (
                <button
                  key={i}
                  onClick={() => setPage(i + 1)}
                  className={`w-11 h-11 rounded-2xl text-[11px] font-black tracking-tighter transition-all ${page === i + 1 ? 'bg-primary-500 text-white shadow-2xl shadow-primary-900/50 scale-110 z-10' : 'bg-slate-900 text-slate-500 hover:text-white border border-slate-800'}`}
                >
                  {(i + 1).toString().padStart(2, '0')}
                </button>
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
