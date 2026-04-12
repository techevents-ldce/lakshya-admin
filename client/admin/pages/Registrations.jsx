import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';
import { 
  HiOutlineLockClosed, 
  HiOutlineShieldCheck, 
  HiOutlineExclamation, 
  HiOutlineSearch, 
  HiOutlineChevronDown, 
  HiOutlineChevronUp, 
  HiOutlineTrash, 
  HiOutlineUserGroup,
  HiOutlineFilter,
  HiOutlineRefresh,
  HiOutlineIdentification,
  HiOutlineCalendar,
} from 'react-icons/hi';
import ConfirmWithPassword from '../components/ConfirmWithPassword';
import { useAuth } from '../context/AuthContext';

const fmtDT = (d) => d ? new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

const STATUS_CONFIG = {
  confirmed: { label: 'Confirmed', color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/30' },
  pending: { label: 'Pending', color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/30' },
  cancelled: { label: 'Cancelled', color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/30' },
  waitlisted: { label: 'Waitlisted', color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/30' },
};

export default function Registrations() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [verified, setVerified] = useState(false);
  const [password, setPassword] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState('');

  const [regs, setRegs] = useState([]);
  const [events, setEvents] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [eventFilter, setEventFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [referralFilter, setReferralFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);
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
      setVerifyError(err?.response?.data?.message || 'Incorrect password. Please try again.');
    } finally { setVerifying(false); }
  };

  useEffect(() => {
    if (verified) {
      api.get('/events', { params: { limit: 200 } }).then(({ data }) => setEvents(data.events)).catch(() => {});
    }
  }, [verified]);

  const fetchRegs = async () => {
    setLoading(true);
    try {
      const params = { page, limit: 15 };
      if (eventFilter) params.eventId = eventFilter;
      if (statusFilter) params.status = statusFilter;
      if (search) params.search = search;
      if (referralFilter.trim()) params.referralCode = referralFilter.trim();
      const { data } = await api.get('/registrations', { params });
      setRegs(data.registrations);
      setTotal(data.pages);
    } catch { toast.error('Failed to load registrations'); }
    finally { setLoading(false); }
  };

  useEffect(() => { if (verified) fetchRegs(); }, [page, eventFilter, statusFilter, search, referralFilter, verified]);

  const toggleExpand = (id) => setExpanded(expanded === id ? null : id);

  const handleDelete = (regId) => {
    setConfirmModal({
      open: true, title: 'Delete Registration', confirmLabel: 'DELETE PERMANENTLY', variant: 'danger',
      message: 'Warning: You are about to permanently delete this registration and all related data (tickets, teams, etc.). This action cannot be undone.',
      action: async (pw) => {
        await api.delete(`/registrations/${regId}`, { data: { adminPassword: pw } });
        toast.success('Registration deleted');
        fetchRegs();
      },
    });
  };

  // --- Password Gate ---
  if (!verified) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] animate-fade-in px-4">
        <div className="card max-w-sm w-full p-10 text-center space-y-8 relative overflow-hidden group border-slate-700/50 bg-slate-900/40 backdrop-blur-xl shadow-2xl">
          <div className="absolute top-0 right-0 w-48 h-48 bg-primary-500/10 blur-[100px] -mr-24 -mt-24 group-hover:bg-primary-500/20 transition-all duration-700"></div>
          <div className="mx-auto w-20 h-20 rounded-[2rem] bg-slate-900 border border-slate-800 flex items-center justify-center relative z-10 shadow-2xl transform rotate-6 group-hover:rotate-0 transition-transform duration-500">
            <HiOutlineShieldCheck className="w-10 h-10 text-primary-500" />
          </div>
          <div className="relative z-10 space-y-2">
            <h2 className="text-2xl font-black text-white uppercase tracking-tighter">Admin Access</h2>
            <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] leading-relaxed max-w-[200px] mx-auto">Please enter your password to access registration records</p>
          </div>
          <div className="relative group/input">
            <HiOutlineLockClosed className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within/input:text-primary-400 w-5 h-5 transition-colors" />
            <input
              type="password"
              placeholder="Enter Password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setVerifyError(''); }}
              onKeyDown={(e) => { if (e.key === 'Enter' && !verifying) handleVerifyPassword(); }}
              className="input-field pl-12 py-3.5 focus:ring-primary-500/20"
              autoComplete="current-password"
              autoFocus
            />
          </div>
          {verifyError && (
            <div className="p-3 rounded-xl bg-red-400/10 border border-red-500/20 animate-fade-in">
               <p className="text-red-400 text-[9px] font-black uppercase tracking-widest leading-tight">{verifyError}</p>
            </div>
          )}
          <button
            onClick={handleVerifyPassword}
            disabled={verifying || !password.trim()}
            className="btn-primary w-full py-4 uppercase tracking-[0.2em] text-[10px] font-black shadow-2xl shadow-primary-900/40 relative z-10 active:scale-95"
          >
            {verifying ? 'Verifying...' : 'Verify Password'}
          </button>
        </div>
      </div>
    );
  }

  // --- Main Content ---
  return (
    <div className="animate-fade-in space-y-8">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight uppercase mb-1">Registrations</h1>
          <p className="text-slate-500 font-medium">Monitor and manage all event registrations and participants</p>
        </div>
      </div>

      {/* Control Panel */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-4 bg-slate-900/40 p-3 rounded-2xl border border-slate-700/30 backdrop-blur-xl transition-all shadow-xl">
        <div className="relative group flex-1 min-w-[300px]">
          <HiOutlineSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-primary-400 w-5 h-5 transition-colors" />
          <input type="text" placeholder="Search by name or email..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="input-field pl-12" />
        </div>
        
        <div className="flex flex-wrap items-center gap-4 px-2">
          <div className="h-8 w-px bg-slate-800 hidden lg:block"></div>
          
          <div className="flex items-center gap-2 group px-3 py-2 hover:bg-white/[0.02] rounded-xl transition-all cursor-pointer">
             <HiOutlineFilter className="w-4 h-4 text-slate-500 group-hover:text-primary-400" />
             <select 
               value={eventFilter} 
               onChange={(e) => { setEventFilter(e.target.value); setPage(1); }} 
               className="bg-transparent text-[10px] font-black text-slate-400 uppercase tracking-widest outline-none cursor-pointer"
             >
               <option value="" className="bg-slate-900">All Events</option>
               {events.map((ev) => <option key={ev._id} value={ev._id} className="bg-slate-900">{ev.title}</option>)}
             </select>
          </div>

          <div className="h-8 w-px bg-slate-800 hidden lg:block"></div>

          <div className="flex items-center gap-2 group px-3 py-2 hover:bg-white/[0.02] rounded-xl transition-all cursor-pointer">
             <HiOutlineShieldCheck className="w-4 h-4 text-slate-500 group-hover:text-primary-400" />
             <select 
               value={statusFilter} 
               onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} 
               className="bg-transparent text-[10px] font-black text-slate-400 uppercase tracking-widest outline-none cursor-pointer"
             >
               <option value="" className="bg-slate-900">All Statuses</option>
               {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                 <option key={key} value={key} className="bg-slate-900">{cfg.label}</option>
               ))}
             </select>
          </div>

          <div className="h-8 w-px bg-slate-800 hidden lg:block"></div>

          <div className="relative group min-w-[120px]">
             <HiOutlineRefresh className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-3.5 h-3.5" />
             <input
              type="text"
              placeholder="Referral Code…"
              value={referralFilter}
              onChange={(e) => { setReferralFilter(e.target.value); setPage(1); }}
              className="bg-slate-900/50 border border-slate-800 rounded-xl pl-8 pr-3 py-2 text-[10px] font-black text-slate-300 uppercase tracking-widest focus:ring-primary-500/20 w-full"
            />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-32 gap-4">
          <HiOutlineRefresh className="w-10 h-10 text-primary-500 animate-spin" />
          <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] animate-pulse">Loading Registrations...</p>
        </div>
      ) : (
        <div className="card !p-0 overflow-hidden border-slate-700/30 shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-white/[0.01]">
                  <th className="px-6 py-5 w-16 text-center text-[9px] font-black text-slate-600 uppercase tracking-widest">Details</th>
                  <th className="px-6 py-5 text-[9px] font-black text-slate-600 uppercase tracking-widest">User</th>
                  <th className="px-6 py-5 text-[9px] font-black text-slate-600 uppercase tracking-widest hidden sm:table-cell">College</th>
                  <th className="px-6 py-5 text-[9px] font-black text-slate-600 uppercase tracking-widest">Event</th>
                  <th className="px-4 py-5 text-[9px] font-black text-slate-600 uppercase tracking-widest">Status</th>
                  <th className="px-6 py-5 text-[9px] font-black text-slate-600 uppercase tracking-widest hidden md:table-cell">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.02]">
                {regs.map((r) => (
                  <React.Fragment key={r._id}>
                    <tr className={`group hover:bg-white/[0.02] transition-all cursor-pointer ${expanded === r._id ? 'bg-primary-500/[0.03] border-l-2 border-l-primary-500' : ''}`} onClick={() => toggleExpand(r._id)}>
                      <td className="px-6 py-5 text-center">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${expanded === r._id ? 'bg-primary-500 text-white shadow-lg shadow-primary-900/20' : 'bg-slate-900 text-slate-500 group-hover:text-white'}`}>
                          {expanded === r._id ? <HiOutlineChevronUp className="w-4 h-4" /> : <HiOutlineChevronDown className="w-4 h-4" />}
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-sm font-bold text-slate-500 group-hover:bg-primary-500 group-hover:text-white group-hover:border-primary-500/30 transition-all shadow-xl">
                            {r.userId?.name?.[0]?.toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-white group-hover:text-primary-400 transition-colors tracking-tight uppercase leading-none">{r.userId?.name}</p>
                            <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mt-1.5">{r.userId?.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5 hidden sm:table-cell">
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest line-clamp-1">{r.userId?.college || '---'}</p>
                      </td>
                      <td className="px-6 py-5">
                        <p className="text-xs font-black text-slate-300 group-hover:text-primary-400 transition-colors leading-none uppercase tracking-tight">{r.eventId?.title}</p>
                        <span className={`inline-flex items-center gap-1.5 mt-2 px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest border ${r.eventId?.eventType === 'team' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'}`}>
                           <HiOutlineUserGroup className="w-3 h-3" />
                           {r.eventId?.eventType || 'SOLO'}
                        </span>
                      </td>
                      <td className="px-4 py-5">
                        <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border ${(STATUS_CONFIG[r.status] || STATUS_CONFIG.waitlisted).bg} ${(STATUS_CONFIG[r.status] || STATUS_CONFIG.waitlisted).color}`}>
                           {(STATUS_CONFIG[r.status] || STATUS_CONFIG.waitlisted).label}
                        </span>
                      </td>
                      <td className="px-6 py-5 hidden md:table-cell">
                        <div className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-widest tabular-nums">
                           <HiOutlineCalendar className="w-3 h-3 text-slate-700" />
                           {new Date(r.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                        </div>
                      </td>
                    </tr>

                    {expanded === r._id && (
                      <tr className="bg-slate-900/40 backdrop-blur-3xl animate-fade-in relative z-10">
                        <td colSpan="6" className="px-12 py-12">
                          <div className="flex flex-col gap-12 max-h-[600px] overflow-y-auto custom-scrollbar pr-4">
                            {/* Detailed layout */}
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                               <div className="space-y-8">
                                  <h4 className="text-[10px] font-black text-slate-600 uppercase tracking-[0.3em] flex items-center gap-2 border-b border-white/[0.05] pb-4">
                                     <HiOutlineIdentification className="w-4 h-4 text-primary-500" /> User Profile
                                  </h4>
                                  <div className="grid grid-cols-1 gap-6">
                                     <DetailNode label="Full Name" value={r.userId?.name || '---'} />
                                     <DetailNode label="College" value={r.userId?.college || '---'} />
                                     <DetailNode label="Branch / Year" value={`${r.userId?.branch || '---'} (Year ${r.userId?.year || '?'})`} />
                                  </div>
                               </div>
                               <div className="space-y-8">
                                  <h4 className="text-[10px] font-black text-slate-600 uppercase tracking-[0.3em] flex items-center gap-2 border-b border-white/[0.05] pb-4">
                                     <HiOutlineRefresh className="w-4 h-4 text-violet-500" /> Registration Details
                                  </h4>
                                  <div className="grid grid-cols-1 gap-6">
                                     <DetailNode label="Event" value={r.eventId?.title || '---'} />
                                     <DetailNode label="Referral Used" value={r.referralCodeUsed || 'None'} />
                                     <DetailNode label="Fee Amount" value={r.eventId?.isPaid ? `₹${Number(r.eventId.registrationFee || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : 'Free'} />
                                  </div>
                               </div>
                               <div className="space-y-8">
                                  <h4 className="text-[10px] font-black text-slate-600 uppercase tracking-[0.3em] flex items-center gap-2 border-b border-white/[0.05] pb-4">
                                     <HiOutlineShieldCheck className="w-4 h-4 text-emerald-500" /> Timing & ID
                                  </h4>
                                  <div className="grid grid-cols-1 gap-6">
                                     <DetailNode label="Registration Date" value={fmtDT(r.createdAt)} />
                                     <DetailNode label="Current Status" value={(STATUS_CONFIG[r.status] || STATUS_CONFIG.waitlisted).label.toUpperCase()} />
                                     <DetailNode label="Registration ID" value={r._id} />
                                  </div>
                               </div>
                            </div>

                            {/* Team info */}
                            {r.teamId && (
                              <div className="p-8 rounded-[2rem] bg-white/[0.02] border border-white/[0.05] relative overflow-hidden group">
                                <div className="absolute top-0 right-0 w-64 h-64 bg-primary-500/5 blur-[100px] pointer-events-none"></div>
                                <div className="flex items-center justify-between mb-8 relative z-10">
                                   <div className="flex items-center gap-4">
                                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 text-white flex items-center justify-center shadow-2xl shadow-blue-900/40 rotate-3 group-hover:rotate-0 transition-transform duration-500">
                                        <HiOutlineUserGroup className="w-6 h-6" />
                                      </div>
                                      <div>
                                         <p className="text-[9px] font-black text-blue-500 uppercase tracking-[0.2em] mb-1">TEAM INFO</p>
                                         <h4 className="text-lg font-black text-white uppercase tracking-tighter leading-tight">{r.teamId.teamName}</h4>
                                      </div>
                                   </div>
                                   <span className={`px-4 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${r.teamId.status === 'confirmed' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-amber-500/10 border-amber-500/30 text-amber-400'}`}>
                                      {r.teamId.status}
                                   </span>
                                </div>
                                <div className="overflow-hidden rounded-2xl border border-white/[0.05] relative z-10">
                                   <table className="w-full text-left text-xs">
                                      <thead>
                                         <tr className="bg-white/[0.02] text-[9px] font-black text-slate-600 uppercase tracking-[0.2em]">
                                            <th className="px-6 py-4">Name</th>
                                            <th className="px-6 py-4">Email</th>
                                            <th className="px-6 py-4 text-right">Status</th>
                                         </tr>
                                      </thead>
                                      <tbody className="divide-y divide-white/[0.02]">
                                         {r.teamMembers?.map((m) => (
                                            <tr key={m._id} className="hover:bg-white/[0.03] transition-colors">
                                               <td className="px-6 py-4 flex items-center gap-3">
                                                  <span className="font-black text-white uppercase tracking-tight">{m.userId?.name}</span>
                                                  {r.teamId.leaderId?._id === m.userId?._id && (
                                                    <span className="px-2 py-0.5 rounded-lg bg-primary-500 text-white text-[8px] font-black uppercase tracking-widest shadow-lg">LEADER</span>
                                                  )}
                                               </td>
                                               <td className="px-6 py-4 text-slate-500 font-bold uppercase tracking-widest text-[9px]">{m.userId?.email}</td>
                                               <td className="px-6 py-4 text-right">
                                                  <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border ${m.status === 'accepted' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'}`}>
                                                     {m.status}
                                                  </span>
                                               </td>
                                            </tr>
                                         ))}
                                      </tbody>
                                   </table>
                                </div>
                              </div>
                            )}

                            {/* Control Bar */}
                            <div className="flex items-center justify-between pt-10 border-t border-white/[0.05]">
                               <button onClick={(e) => { e.stopPropagation(); navigate(`/registrations/${r._id}`); }} 
                                       className="px-8 py-3.5 rounded-2xl bg-primary-500/10 border border-primary-500/20 text-primary-400 hover:bg-primary-500 hover:text-white font-black text-[11px] uppercase tracking-[0.3em] transition-all shadow-2xl shadow-primary-900/40 active:scale-95">
                                 View Registration Details →
                               </button>
                               {user?.role === 'superadmin' && (
                                 <button
                                   onClick={(e) => { e.stopPropagation(); handleDelete(r._id); }}
                                   className="flex items-center gap-3 px-8 py-3.5 rounded-2xl bg-red-500/5 text-red-500 hover:bg-red-500 hover:text-white font-black text-[11px] uppercase tracking-[0.3em] transition-all border border-red-500/20 shadow-2xl shadow-red-900/20 active:scale-95"
                                 >
                                   <HiOutlineTrash className="w-5 h-5" /> Delete Registration
                                 </button>
                               )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
                {regs.length === 0 && (
                  <tr>
                    <td colSpan="6" className="text-center py-32">
                       <HiOutlineSearch className="w-16 h-16 text-slate-800 mx-auto mb-6" />
                       <p className="text-[11px] font-black text-slate-600 uppercase tracking-[0.4em]">No registrations found</p>
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
                  className={`w-11 h-11 rounded-2xl text-[11px] font-black transition-all ${page === i + 1 ? 'bg-primary-500 text-white shadow-2xl shadow-primary-900/40 scale-110 z-10' : 'bg-slate-900 text-slate-500 hover:text-white border border-slate-800'}`}
                >
                  {(i + 1).toString().padStart(2, '0')}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

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

function DetailNode({ label, value }) {
  return (
    <div className="group space-y-2">
      <span className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] group-hover:text-primary-400 transition-colors">{label}</span>
      <p className="text-sm text-slate-200 font-bold break-words leading-tight uppercase tracking-tight">{value}</p>
    </div>
  );
}
