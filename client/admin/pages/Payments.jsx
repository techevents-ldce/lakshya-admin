import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../src/services/api';
import toast from 'react-hot-toast';
import Pagination from '../../src/components/Pagination';
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
  completed: { label: 'Paid', color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
  pending: { label: 'Pending', color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
  failed: { label: 'Failed', color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20' },
  refunded: { label: 'Refunded', color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20' },
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
        <div className="card max-w-sm w-full p-10 text-center space-y-10 relative overflow-hidden bg-slate-900 border-white/[0.05] shadow-2xl">
          <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-500/5 blur-[100px] -mr-24 -mt-24 pointer-events-none"></div>
          <div className="mx-auto w-16 h-16 rounded-2xl bg-slate-950 border border-white/[0.05] flex items-center justify-center relative z-10 shadow-lg group-hover:bg-slate-900 transition-colors duration-500">
            <HiOutlineLockClosed className="w-8 h-8 text-indigo-500" />
          </div>
          <div className="relative z-10 space-y-2">
            <h2 className="text-xl font-bold text-white tracking-tight leading-none">Security Authorization</h2>
            <p className="text-slate-500 text-xs font-medium leading-relaxed max-w-[200px] mx-auto">Admin credentials required to access financial auditing records</p>
          </div>
          <div className="relative group/input">
            <HiOutlineFingerPrint className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within/input:text-indigo-400 w-5 h-5 transition-colors" />
            <input
              type="password"
              placeholder="Admin Password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setVerifyError(''); }}
              onKeyDown={(e) => { if (e.key === 'Enter' && !verifying) handleVerifyPassword(); }}
              className="input-field pl-12 py-3.5"
              autoComplete="current-password"
              autoFocus
            />
          </div>
          {verifyError && (
            <div className="p-4 rounded-xl bg-red-400/10 border border-red-500/20 animate-shake">
               <p className="text-red-400 text-xs font-semibold leading-tight">{verifyError}</p>
            </div>
          )}
          <button
            onClick={handleVerifyPassword}
            disabled={verifying || !password.trim()}
            className="btn-primary w-full py-3.5 uppercase tracking-widest text-[10px] font-bold relative z-10 active:scale-95 shadow-lg shadow-indigo-500/10"
          >
            {verifying ? 'Authorizing...' : 'Authorize Access'}
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
          <h1 className="text-3xl font-bold text-white tracking-tight leading-none mb-2">Financials</h1>
          <p className="text-slate-500 font-medium text-sm">Audit trail and transaction management for all institutional payments</p>
        </div>
      </div>

      {/* Control Panel */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-4 bg-slate-900 border border-white/[0.05] p-3 rounded-xl shadow-lg">
        <div className="relative group flex-1 min-w-[300px]">
          <HiOutlineSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-400 w-5 h-5 transition-colors" />
          <input type="text" placeholder="Search by name, email, or transaction ID..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="input-field pl-12" />
        </div>
        <div className="flex flex-wrap items-center gap-4 px-2">
           <div className="h-8 w-px bg-slate-800 hidden lg:block"></div>
           
           <div className="flex items-center gap-2 group px-4 py-2 hover:bg-white/[0.03] rounded-xl transition-all border border-transparent hover:border-slate-800 cursor-pointer">
              <HiOutlineFilter className="w-4 h-4 text-slate-500 group-hover:text-indigo-400" />
              <select value={eventFilter} onChange={(e) => { setEventFilter(e.target.value); setPage(1); }} className="bg-transparent text-xs font-semibold text-slate-400 outline-none cursor-pointer">
                <option value="" className="bg-slate-900">All Events</option>
                {events.map((ev) => <option key={ev._id} value={ev._id} className="bg-slate-900">{ev.title}</option>)}
              </select>
           </div>

           <div className="h-8 w-px bg-slate-800 hidden lg:block"></div>

           <div className="flex items-center gap-2 group px-4 py-2 hover:bg-white/[0.03] rounded-xl transition-all border border-transparent hover:border-slate-800 cursor-pointer">
              <HiOutlineShieldCheck className="w-4 h-4 text-slate-500 group-hover:text-indigo-400" />
              <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} className="bg-transparent text-xs font-semibold text-slate-400 outline-none cursor-pointer">
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
          <HiOutlineRefresh className="w-10 h-10 text-primary-500 animate-spin" />
          <p className="text-[10px] font-bold text-slate-600 uppercase tracking-wider animate-pulse">Loading Records...</p>
        </div>
      ) : (
        <div className="card !p-0 border-slate-900 overflow-hidden shadow-2xl bg-slate-900/50">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-white/[0.01]">
                  <th className="px-8 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-white/[0.05]">Payer Information</th>
                  <th className="px-8 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-white/[0.05]">Event Attribution</th>
                  <th className="px-8 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-white/[0.05]">Amount</th>
                  <th className="px-8 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-white/[0.05] text-center">Status</th>
                  <th className="px-8 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-white/[0.05] hidden md:table-cell text-right">Transaction Details</th>
                  <th className="px-8 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-white/[0.05] text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.02]">
                {payments.map((p) => {
                  const cfg = STATUS_CONFIG[p.status] || STATUS_CONFIG.pending;
                  return (
                    <tr key={p._id} className="group hover:bg-white/[0.02] transition-all cursor-default text-slate-300">
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-xs font-bold text-slate-500 group-hover:bg-indigo-600 group-hover:text-white group-hover:border-indigo-500 transition-all shadow-lg">
                            {p.userId?.name?.[0].toUpperCase() || 'U'}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-white group-hover:text-indigo-400 transition-colors tracking-tight leading-none mb-1.5">{p.userId?.name || 'Unknown User'}</p>
                            <p className="text-[10px] text-slate-500/70 font-medium uppercase tracking-widest truncate max-w-[150px]">{p.userId?.email || 'No Email'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <p className="text-xs font-semibold text-slate-400 tracking-tight truncate max-w-[200px]">{p.eventId?.title || 'System Payment'}</p>
                      </td>
                      <td className="px-8 py-6">
                         <div className="flex items-center gap-1.5 text-lg font-bold text-white tabular-nums tracking-tighter">
                            <span className="text-sm text-emerald-500 font-medium">₹</span>
                            {Number(p.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                         </div>
                      </td>
                      <td className="px-8 py-6 text-center">
                        <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest border ${cfg.bg} ${cfg.color}`}>
                           {cfg.label}
                        </span>
                      </td>
                      <td className="px-8 py-6 hidden md:table-cell text-right">
                        <p className="text-[10px] font-bold font-mono text-slate-500 uppercase tracking-widest leading-none mb-1.5 tabular-nums italic opacity-60">ID: {p.transactionId || 'N/A'}</p>
                        <p className="text-[10px] text-slate-500/80 font-medium">{p.createdAt ? new Date(p.createdAt).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' }) : 'Unknown'}</p>
                      </td>
                      <td className="px-8 py-6 text-right">
                        {p.status === 'pending' && p.canVerify !== false && (
                          <button onClick={() => handleVerify(p._id, p.userId?.name)} 
                                  className="btn-primary py-2 px-4 shadow-lg shadow-emerald-500/10 text-[10px] font-bold uppercase tracking-widest bg-emerald-600 hover:bg-emerald-500 border-none transition-all active:scale-95">
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
                       <HiOutlineExclamation className="w-12 h-12 text-slate-800 mx-auto mb-6" />
                       <p className="text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-4">No payments found</p>
                       <button onClick={() => navigate('/orders')} className="text-[9px] font-bold text-primary-500 hover:text-primary-400 uppercase tracking-wider border-b border-primary-500/30 pb-1 transition-all">View All Orders</button>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {/* Pagination */}
          <Pagination page={page} pages={total} onPage={setPage} />
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
