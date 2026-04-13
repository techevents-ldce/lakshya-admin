import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../src/services/api';
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
  confirmed: { label: 'Confirmed', color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
  pending: { label: 'Pending', color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
  cancelled: { label: 'Cancelled', color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20' },
  waitlisted: { label: 'Waitlisted', color: 'text-indigo-400', bg: 'bg-indigo-500/10 border-indigo-500/20' },
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
        <div className="card max-w-sm w-full p-8 text-center space-y-6 relative overflow-hidden bg-slate-900 border-white/[0.05] shadow-2xl rounded-2xl">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-slate-950 border border-white/[0.05] flex items-center justify-center relative z-10 shadow-lg">
            <HiOutlineShieldCheck className="w-8 h-8 text-indigo-500" />
          </div>
          <div className="relative z-10 space-y-2">
            <h2 className="text-xl font-bold text-white tracking-tight">Security Credential Required</h2>
            <p className="text-slate-500 text-xs font-semibold leading-relaxed">System access restricted. Please provide administrative credentials to decrypt registry nodes.</p>
          </div>
          <div className="relative group">
            <HiOutlineLockClosed className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-400 w-5 h-5 transition-colors" />
            <input
              type="password"
              placeholder="System Password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setVerifyError(''); }}
              onKeyDown={(e) => { if (e.key === 'Enter' && !verifying) handleVerifyPassword(); }}
              className="input-field pl-12 py-3.5"
              autoComplete="current-password"
              autoFocus
            />
          </div>
          {verifyError && (
            <div className="p-3 rounded-lg bg-red-400/10 border border-red-500/20 animate-fade-in">
               <p className="text-red-400 text-[10px] font-bold uppercase tracking-wider">{verifyError}</p>
            </div>
          )}
          <button
            onClick={handleVerifyPassword}
            disabled={verifying || !password.trim()}
            className="btn-primary w-full py-4 text-[10px] font-bold uppercase tracking-widest shadow-lg shadow-indigo-500/10 active:scale-95 transition-all"
          >
            {verifying ? 'AUHTENTICATING...' : 'AUTHORIZE ACCESS'}
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
          <h1 className="text-3xl font-bold text-white tracking-tight uppercase leading-none mb-2">Registrations</h1>
          <p className="text-slate-500 font-medium">Manage participant registrations and statuses</p>
        </div>
      </div>

      {/* Control Panel */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-4 bg-slate-900 border border-white/[0.05] p-3 rounded-xl shadow-lg">
        <div className="relative group flex-1">
          <HiOutlineSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-400 w-5 h-5 transition-colors" />
          <input 
            type="text" 
            placeholder="Search by name, email, or order ID..." 
            value={search} 
            onChange={(e) => { setSearch(e.target.value); setPage(1); }} 
            className="input-field pl-12" 
          />
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <div className="h-8 w-px bg-slate-800 hidden lg:block"></div>
          
          <div className="flex items-center gap-2 px-4 py-2 hover:bg-white/[0.03] rounded-xl group transition-all border border-transparent hover:border-slate-800 cursor-pointer">
             <HiOutlineFilter className="w-4 h-4 text-slate-500 group-hover:text-indigo-400" />
             <select 
               value={eventFilter} 
               onChange={(e) => { setEventFilter(e.target.value); setPage(1); }} 
               className="bg-transparent text-xs font-semibold text-slate-400 outline-none cursor-pointer"
             >
               <option value="" className="bg-slate-900">All Event Specs</option>
               {events.map((ev) => <option key={ev._id} value={ev._id} className="bg-slate-900">{ev.title}</option>)}
             </select>
          </div>

          <div className="flex items-center gap-2 px-4 py-2 hover:bg-white/[0.03] rounded-xl group transition-all border border-transparent hover:border-slate-800 cursor-pointer">
             <HiOutlineShieldCheck className="w-4 h-4 text-slate-500 group-hover:text-indigo-400" />
             <select 
               value={statusFilter} 
               onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} 
               className="bg-transparent text-xs font-semibold text-slate-400 outline-none cursor-pointer"
             >
               <option value="" className="bg-slate-900">All Statuses</option>
               {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                 <option key={key} value={key} className="bg-slate-900">{cfg.label}</option>
               ))}
             </select>
          </div>

          <div className="relative group min-w-[160px]">
             <HiOutlineRefresh className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-indigo-500 w-4 h-4 transition-colors" />
             <input
              type="text"
              placeholder="REFERRAL_KEY"
              value={referralFilter}
              onChange={(e) => { setReferralFilter(e.target.value); setPage(1); }}
              className="bg-slate-950 border border-white/[0.05] rounded-xl pl-10 pr-4 py-2.5 text-xs font-bold text-slate-300 placeholder-slate-700 focus:ring-1 focus:ring-indigo-500/20 w-full outline-none transition-all"
            />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-32 gap-4">
          <HiOutlineRefresh className="w-10 h-10 text-primary-500 animate-spin" />
        </div>
      ) : (
        <div className="card !p-0 overflow-hidden border-white/[0.05] shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
            <thead>
              <tr className="bg-white/[0.01]">
                <th className="px-6 py-5 w-16 text-center border-b border-white/[0.05]"></th>
                <th className="px-6 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-white/[0.05]">User Info</th>
                <th className="px-6 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-white/[0.05] hidden sm:table-cell">College</th>
                <th className="px-6 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-white/[0.05]">Event</th>
                <th className="px-4 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-white/[0.05]">Status</th>
                <th className="px-6 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-white/[0.05] hidden md:table-cell">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
                {regs.map((r) => (
                  <React.Fragment key={r._id}>
                    <tr className={`group hover:bg-white/[0.02] transition-colors cursor-pointer ${expanded === r._id ? 'bg-indigo-600/[0.05]' : 'border-b border-white/[0.02]'}`} onClick={() => toggleExpand(r._id)}>
                      <td className="px-6 py-6 text-center">
                        <div className={`p-1 rounded transition-colors ${expanded === r._id ? 'text-indigo-500' : 'text-slate-700'}`}>
                          {expanded === r._id ? <HiOutlineChevronUp className="w-4 h-4" /> : <HiOutlineChevronDown className="w-4 h-4" />}
                        </div>
                      </td>
                      <td className="px-6 py-6">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-lg bg-slate-950 border border-white/[0.05] flex items-center justify-center text-sm font-bold text-slate-400 group-hover:text-indigo-400 group-hover:border-indigo-500/30 transition-all shadow-lg">
                            {r.userId?.name?.[0]?.toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-white group-hover:text-indigo-400 transition-colors tracking-tight leading-none">{r.userId?.name}</p>
                            <p className="text-[10px] text-slate-600 font-bold uppercase tracking-widest mt-1.5">{r.userId?.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-6 hidden sm:table-cell">
                        <p className="text-xs font-bold text-slate-500 line-clamp-1 uppercase tracking-tight">{r.userId?.college || '---'}</p>
                      </td>
                      <td className="px-6 py-6">
                        <p className="text-sm font-bold text-indigo-400 uppercase tracking-tight leading-none">{r.eventId?.title}</p>
                        <span className={`inline-flex items-center gap-1.5 mt-2.5 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest border ${r.eventId?.eventType === 'team' ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'}`}>
                           <HiOutlineUserGroup className="w-3.5 h-3.5" />
                           {r.eventId?.eventType || 'SOLO'}
                        </span>
                      </td>
                      <td className="px-4 py-6">
                        <span className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-widest border ${(STATUS_CONFIG[r.status] || STATUS_CONFIG.waitlisted).bg} ${(STATUS_CONFIG[r.status] || STATUS_CONFIG.waitlisted).color}`}>
                           {(STATUS_CONFIG[r.status] || STATUS_CONFIG.waitlisted).label}
                        </span>
                      </td>
                      <td className="px-6 py-6 hidden md:table-cell text-right">
                        <div className="flex flex-col items-end gap-1">
                           <div className="flex items-center gap-2 text-[11px] font-bold text-white tabular-nums">
                              <HiOutlineCalendar className="w-3.5 h-3.5 text-slate-700" />
                              {new Date(r.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }).toUpperCase()}
                           </div>
                        </div>
                      </td>
                    </tr>

                    {expanded === r._id && (
                      <tr className="bg-white/[0.01] animate-scale-in">
                        <td colSpan="6" className="px-8 py-12 border-b border-white/[0.02]">
                          <div className="flex flex-col gap-12 max-h-[600px] overflow-y-auto custom-scrollbar pr-4 border-l-2 border-indigo-500/30 pl-8">
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                               <div className="space-y-8">
                                  <h4 className="text-[10px] font-bold text-slate-600 uppercase tracking-widest flex items-center gap-3">
                                     <HiOutlineIdentification className="w-4.5 h-4.5 text-indigo-400" /> Participant Profile
                                  </h4>
                                  <div className="grid grid-cols-1 gap-6">
                                     <DetailNode label="Legal Identity" value={r.userId?.name || '---'} />
                                     <DetailNode label="Campus Affiliation" value={r.userId?.college || 'Institutional Global'} />
                                     <DetailNode label="Academic Vector" value={`${r.userId?.branch || '---'} — Level ${r.userId?.year || '?'}`} />
                                  </div>
                               </div>
                               <div className="space-y-8">
                                  <h4 className="text-[10px] font-bold text-slate-600 uppercase tracking-widest flex items-center gap-3">
                                     <HiOutlineRefresh className="w-4.5 h-4.5 text-indigo-400" /> Registration Specification
                                  </h4>
                                  <div className="grid grid-cols-1 gap-6">
                                     <DetailNode label="Event Target" value={r.eventId?.title || '---'} />
                                     <DetailNode label="Affiliate Key" value={r.referralCodeUsed || 'DIRECT_ENTRY'} />
                                     <DetailNode label="Transaction Value" value={r.eventId?.isPaid ? `₹${Number(r.eventId.registrationFee || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : 'SCHOLARSHIP/FREE'} />
                                  </div>
                               </div>
                               <div className="space-y-8">
                                  <h4 className="text-[10px] font-bold text-slate-600 uppercase tracking-widest flex items-center gap-3">
                                     <HiOutlineShieldCheck className="w-4.5 h-4.5 text-emerald-400" /> Auditing Metadata
                                  </h4>
                                  <div className="grid grid-cols-1 gap-6">
                                     <DetailNode label="Initialization" value={fmtDT(r.createdAt)} />
                                     <DetailNode label="Verified Status" value={(STATUS_CONFIG[r.status] || STATUS_CONFIG.waitlisted).label} />
                                     <DetailNode label="Internal UUID" value={r._id} />
                                  </div>
                               </div>
                            </div>

                             {/* Team info */}
                             {r.teamId && (
                               <div className="p-8 rounded-xl bg-slate-950 border border-white/[0.05] relative overflow-hidden group shadow-xl">
                                 <div className="flex items-center justify-between mb-8 relative z-10">
                                    <div className="flex items-center gap-4">
                                       <div className="w-12 h-12 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-lg">
                                         <HiOutlineUserGroup className="w-6 h-6" />
                                       </div>
                                       <div>
                                          <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-1.5 leading-none">Deployment Bundle</p>
                                          <h4 className="text-lg font-bold text-white tracking-tight leading-none uppercase">{r.teamId.teamName}</h4>
                                       </div>
                                    </div>
                                    <span className={`px-3 py-1 rounded text-[10px] font-bold uppercase tracking-widest border ${r.teamId.status === 'confirmed' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'}`}>
                                       {r.teamId.status}
                                    </span>
                                 </div>
                                 <div className="overflow-hidden rounded-lg border border-white/[0.05] relative z-10 shadow-lg">
                                    <table className="w-full text-left">
                                       <thead>
                                          <tr className="bg-white/[0.01]">
                                             <th className="px-6 py-4 text-[10px] font-bold text-slate-600 uppercase tracking-widest border-b border-white/[0.05]">Personnel Identity</th>
                                             <th className="px-6 py-4 text-[10px] font-bold text-slate-600 uppercase tracking-widest border-b border-white/[0.05]">Contact Vector</th>
                                             <th className="px-6 py-4 text-[10px] font-bold text-slate-600 uppercase tracking-widest border-b border-white/[0.05] text-right">Verification</th>
                                          </tr>
                                       </thead>
                                       <tbody className="divide-y divide-white/[0.02]">
                                          {r.teamMembers?.map((m) => (
                                             <tr key={m._id} className="hover:bg-white/[0.01] transition-colors">
                                                <td className="px-6 py-4 flex items-center gap-3">
                                                   <span className="text-xs font-bold text-slate-200">{m.userId?.name}</span>
                                                   {r.teamId.leaderId?._id === m.userId?._id && (
                                                     <span className="px-2 py-0.5 rounded bg-indigo-600 text-[9px] font-bold text-white uppercase tracking-tighter">BUNDLE_LEAD</span>
                                                   )}
                                                </td>
                                                <td className="px-6 py-4 text-slate-500 font-bold text-[10px] uppercase tracking-tighter tabular-nums">{m.userId?.email}</td>
                                                <td className="px-6 py-4 text-right">
                                                   <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest border ${m.status === 'accepted' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'}`}>
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
                                        className="btn-outline text-[10px] font-bold uppercase tracking-widest px-8 py-3 active:scale-95 transition-all">
                                  Full Audit Profile →
                                </button>
                                {user?.role === 'superadmin' && (
                                  <button
                                    onClick={(e) => { e.stopPropagation(); handleDelete(r._id); }}
                                    className="btn-danger text-[10px] font-bold uppercase tracking-widest px-8 py-3 flex items-center gap-2 active:scale-95 transition-all"
                                  >
                                    <HiOutlineTrash className="w-4 h-4" /> Delete Record
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
                       <p className="text-[11px] font-bold text-slate-600 uppercase tracking-[0.4em]">No registrations found</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          
          {/* Pagination */}
          {total > 1 && (
            <div className="flex items-center justify-center gap-3 py-8 bg-slate-900/40 border-t border-slate-800">
                {[...Array(total)].map((_, i) => (
                  <button 
                    key={i} 
                    onClick={() => setPage(i + 1)} 
                    className={`w-10 h-10 rounded-lg text-xs font-bold transition-all ${page === i + 1 ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/40' : 'bg-slate-950 text-slate-500 hover:text-white border border-white/[0.05]'}`}
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
        variant="danger"
      />
    </div>
  );
}

function DetailNode({ label, value }) {
  return (
    <div className="group space-y-2 p-4 rounded-xl bg-white/[0.02] border border-white/[0.05] hover:border-indigo-500/20 transition-all">
      <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest group-hover:text-indigo-400 transition-colors">{label}</span>
      <p className="text-sm text-slate-200 font-bold truncate tracking-tight">{value}</p>
    </div>
  );
}
