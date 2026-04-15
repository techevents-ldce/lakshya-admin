import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../src/services/api';
import toast from 'react-hot-toast';
import { 
  HiOutlinePlus, 
  HiOutlinePencil, 
  HiOutlineTrash, 
  HiOutlineSearch, 
  HiOutlineChevronDown, 
  HiOutlineChevronUp,
  HiOutlineFilter,
  HiOutlineUserGroup,
  HiOutlineCalendar,
  HiOutlineLocationMarker,
  HiOutlineClock,
  HiOutlineTicket,
  HiOutlineInformationCircle,
  HiOutlineRefresh,
  HiOutlineUsers,
} from 'react-icons/hi';
import ConfirmWithPassword from '../components/ConfirmWithPassword';
import { useAuth } from '../context/AuthContext';

const fmtDT = (d) => d ? new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

export default function Events() {
  const { user } = useAuth();
  const isSuperadmin = user?.role === 'superadmin';
  const [events, setEvents] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);

  const [confirmModal, setConfirmModal] = useState({ open: false, title: '', message: '', confirmLabel: '', variant: 'danger', action: null });

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const params = { page, limit: 10, search };
      if (categoryFilter) params.category = categoryFilter;
      if (typeFilter) params.eventType = typeFilter;
      const { data } = await api.get('/events', { params });
      setEvents(data.events);
      setTotal(data.pages);
    } catch { toast.error('Failed to sync event list'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchEvents(); }, [page, search, categoryFilter, typeFilter]);

  const categories = [...new Set(events.map((e) => e.category).filter(Boolean))];

  const handleDelete = (id, title) => {
    setConfirmModal({
      open: true,
      title: 'Delete Event',
      message: `Warning: You are about to permanently delete "${title}". This action cannot be undone.`,
      confirmLabel: 'DELETE EVENT',
      variant: 'danger',
      action: async (password) => {
        await api.delete(`/events/${id}`, { data: { adminPassword: password } });
        toast.success('Event deleted');
        fetchEvents();
      },
    });
  };

  const handleToggle = (id, title, isOpen) => {
    const action = isOpen ? 'CLOSE' : 'OPEN';
    setConfirmModal({
      open: true,
      title: `${action} Registration`,
      message: `You are about to ${action.toLowerCase()} registrations for "${title}".`,
      confirmLabel: `${action} REGISTRATION`,
      variant: 'warning',
      action: async (password) => {
        await api.patch(`/events/${id}/toggle-registration`, { isOpen: !isOpen, adminPassword: password });
        toast.success('Registration status updated');
        fetchEvents();
      },
    });
  };

  const toggleExpand = (id) => setExpanded(expanded === id ? null : id);

  return (
    <div className="animate-fade-in space-y-6 sm:space-y-8">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 lg:gap-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight leading-none mb-2">Event Portfolio</h1>
          <p className="text-slate-500 font-medium text-xs sm:text-sm">Configure, monitor, and audit festival event specifications</p>
        </div>
        {isSuperadmin && (
          <Link to="/events/new" className="btn-primary flex items-center gap-2 sm:gap-2.5 shadow-lg shadow-indigo-500/10 active:scale-95 transition-all">
            <HiOutlinePlus className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-widest">Create Event</span>
          </Link>
        )}
      </div>

      {/* Control Panel */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3 sm:gap-4 bg-slate-900 border border-white/[0.05] p-2.5 sm:p-3 rounded-xl shadow-lg">
        <div className="relative group flex-1 min-w-[200px]">
          <HiOutlineSearch className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-400 w-4 h-4 sm:w-5 sm:h-5 transition-colors" />
          <input 
            type="text" 
            placeholder="Search event registry..." 
            value={search} 
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="input-field pl-10 sm:pl-12 text-sm" 
          />
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-2 px-3 sm:px-4 py-2 hover:bg-white/[0.03] rounded-xl group transition-all border border-transparent hover:border-slate-800 cursor-pointer flex-1 sm:flex-none">
             <HiOutlineFilter className="w-4 h-4 text-slate-500 group-hover:text-indigo-400" />
             <select value={categoryFilter} onChange={(e) => { setCategoryFilter(e.target.value); setPage(1); }} className="bg-transparent text-xs font-semibold text-slate-400 outline-none cursor-pointer w-full sm:w-auto">
                <option value="" className="bg-slate-900">All Categories</option>
                {categories.map((c) => <option key={c} value={c} className="bg-slate-900">{c}</option>)}
             </select>
          </div>
          <div className="flex items-center gap-2 px-3 sm:px-4 py-2 hover:bg-white/[0.03] rounded-xl group transition-all border border-transparent hover:border-slate-800 cursor-pointer flex-1 sm:flex-none">
             <HiOutlineUserGroup className="w-4 h-4 text-slate-500 group-hover:text-indigo-400" />
             <select value={typeFilter} onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }} className="bg-transparent text-xs font-semibold text-slate-400 outline-none cursor-pointer w-full sm:w-auto">
                <option value="" className="bg-slate-900">All Types</option>
                <option value="solo" className="bg-slate-900">Solo</option>
                <option value="team" className="bg-slate-900">Team</option>
             </select>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <HiOutlineRefresh className="w-10 h-10 text-indigo-500 animate-spin" />
          <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest animate-pulse">Synchronizing Event Data...</p>
        </div>
      ) : (
        <div className="card overflow-hidden !p-0 border-white/[0.05] shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-white/[0.01]">
                  <th className="px-6 py-5 w-12 border-b border-white/[0.05]"></th>
                  <th className="px-6 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-white/[0.05]">Event Specification</th>
                  <th className="px-6 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-white/[0.05] hidden sm:table-cell">Participation</th>
                  <th className="px-6 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-white/[0.05]">Capacity</th>
                  <th className="px-6 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-white/[0.05]">Auditing</th>
                  <th className="px-6 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-white/[0.05] text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.02]">
                {events.map((e) => (
                  <React.Fragment key={e._id}>
                    <tr className={`group hover:bg-white/[0.02] transition-colors cursor-pointer ${expanded === e._id ? 'bg-indigo-600/[0.05]' : 'border-b border-white/[0.02]'}`} onClick={() => toggleExpand(e._id)}>
                      <td className="px-6 py-6 text-center">
                        <div className={`p-1 rounded transition-colors ${expanded === e._id ? 'text-indigo-500' : 'text-slate-700'}`}>
                          {expanded === e._id ? <HiOutlineChevronUp className="w-4 h-4" /> : <HiOutlineChevronDown className="w-4 h-4" />}
                        </div>
                      </td>
                      <td className="px-6 py-6">
                        <p className="text-sm font-bold text-white group-hover:text-indigo-400 transition-colors tracking-tight leading-none uppercase">{e.title}</p>
                        <p className="text-[10px] text-slate-600 font-bold uppercase tracking-widest mt-2">{e.category || 'Institutional'}</p>
                      </td>
                      <td className="px-6 py-6 hidden sm:table-cell">
                        <div className="flex items-center gap-3">
                           <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest border ${e.eventType === 'team' ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'}`}>{e.eventType}</span>
                           <span className="text-[10px] font-bold text-slate-500 tracking-wider tabular-nums">{e.isPaid ? `₹${e.registrationFee}` : 'FREE ENTRY'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-6">
                         <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-white tabular-nums">{e.capacity}</span>
                            <span className="text-[9px] font-bold text-slate-700 uppercase tracking-widest">LIMIT</span>
                         </div>
                      </td>
                      <td className="px-6 py-6">
                        {isSuperadmin ? (
                          <button onClick={(ev) => { ev.stopPropagation(); handleToggle(e._id, e.title, e.isRegistrationOpen); }} 
                                  className={`px-3 py-1 rounded text-[10px] font-bold uppercase tracking-widest border transition-all active:scale-95 ${e.isRegistrationOpen ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border-red-500/20 text-red-500'}`}>
                            {e.isRegistrationOpen ? 'Verified' : 'Paused'}
                          </button>
                        ) : (
                          <span className={`px-3 py-1 rounded text-[10px] font-bold uppercase tracking-widest border ${e.isRegistrationOpen ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border-red-500/20 text-red-500'}`}>
                            {e.isRegistrationOpen ? 'Verified' : 'Paused'}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-6 text-right" onClick={(ev) => ev.stopPropagation()}>
                        {isSuperadmin && (
                          <div className="flex items-center justify-end gap-2">
                            <Link to={`/events/${e._id}/edit`} className="w-9 h-9 flex items-center justify-center rounded-lg bg-slate-900 border border-white/[0.05] text-slate-500 hover:text-white hover:border-indigo-500/40 transition-all shadow-lg active:scale-95">
                              <HiOutlinePencil className="w-4.5 h-4.5" />
                            </Link>
                            <button onClick={() => handleDelete(e._id, e.title)} className="w-9 h-9 flex items-center justify-center rounded-lg bg-red-600/10 border border-red-600/20 text-red-500 hover:bg-red-600 hover:text-white transition-all shadow-lg active:scale-95">
                              <HiOutlineTrash className="w-4.5 h-4.5" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                    {expanded === e._id && (
                      <tr className="bg-white/[0.01] animate-scale-in">
                        <td colSpan="6" className="px-8 py-12 border-b border-white/[0.02]">
                          <div className="grid grid-cols-1 lg:grid-cols-4 gap-12 border-l-2 border-indigo-500/30 pl-8 max-h-[500px] overflow-y-auto custom-scrollbar">
                            <div className="col-span-1 lg:col-span-1">
                              <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-6 flex items-center gap-2">
                                <HiOutlineInformationCircle className="w-4 h-4 text-indigo-400" /> Operational Context
                              </h4>
                              <p className="text-xs text-slate-400 leading-relaxed font-semibold">{e.description || 'No descriptive nodes provided for this entity.'}</p>
                            </div>
                            
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 col-span-1 lg:col-span-2">
                               <div className="space-y-6">
                                  <DetailNode label="Access Slug" value={e.slug} icon={HiOutlineTicket} />
                                  <DetailNode label="Campus Venue" value={e.venue || 'Global Campus'} icon={HiOutlineLocationMarker} />
                                  <DetailNode label="Scheduled Period" value={fmtDT(e.eventDate)} icon={HiOutlineCalendar} />
                               </div>
                               <div className="space-y-6">
                                  <DetailNode label="Fulfillment Deadline" value={fmtDT(e.registrationDeadline)} icon={HiOutlineClock} />
                                  <DetailNode label="Deployment Profile" value={e.eventType === 'team' ? `${e.teamSizeMin} - ${e.teamSizeMax} Personnel` : 'Solo Participant'} icon={HiOutlineUserGroup} />
                                  <DetailNode label="Audit Personnel" value={e.coordinators?.length > 0 ? `${e.coordinators.length} Assumed` : 'Unassigned'} icon={HiOutlineUsers} />
                               </div>
                            </div>

                            <div className="col-span-1 flex flex-col justify-between items-end border-l border-white/[0.05] pl-8">
                               <div className="text-right space-y-6 w-full">
                                  <div className="space-y-2">
                                     <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">Temporal Metrics</p>
                                     <div className="flex flex-col gap-1.5 opacity-60">
                                       <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-tighter">Initialized: {fmtDT(e.createdAt)}</p>
                                       <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-tighter">Last_Sync: {fmtDT(e.updatedAt)}</p>
                                     </div>
                                  </div>
                               </div>
                               <Link 
                                 to={`/registrations?eventId=${e._id}`} 
                                 className="btn-primary w-full py-3.5 text-[10px] font-bold uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/10 active:scale-95 mt-8"
                               >
                                  <HiOutlineSearch className="w-4 h-4" /> Review Registrations
                                </Link>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
                {events.length === 0 && (
                  <tr>
                    <td colSpan="6" className="text-center py-24">
                       <HiOutlineInformationCircle className="w-10 h-10 text-slate-700 mx-auto mb-4" />
                       <p className="text-[10px] font-bold text-slate-600 uppercase tracking-[0.3em]">No Events Found</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          
          {/* Pagination */}
          {total > 1 && (
            <div className="flex items-center justify-center gap-4 py-8 bg-white/[0.01] border-t border-white/[0.05]">
              <button 
                disabled={page === 1} 
                onClick={() => setPage(p => p - 1)} 
                className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-900 border border-slate-800 text-slate-500 hover:text-white disabled:opacity-20 disabled:pointer-events-none transition-all shadow-xl"
              >
                <HiOutlineChevronDown className="w-5 h-5 rotate-90" />
              </button>
              <div className="flex gap-2">
                {[...Array(total)].map((_, i) => (
                  <button 
                    key={i} 
                    onClick={() => setPage(i + 1)} 
                    className={`w-10 h-10 rounded-lg text-xs font-bold transition-all ${page === i + 1 ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-950 text-slate-500 hover:text-white border border-white/[0.05]'}`}
                  >
                    {(i + 1).toString().padStart(2, '0')}
                  </button>
                ))}
              </div>
              <button 
                disabled={page === total} 
                onClick={() => setPage(p => p + 1)} 
                className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-900 border border-slate-800 text-slate-500 hover:text-white disabled:opacity-20 disabled:pointer-events-none transition-all shadow-xl"
              >
                <HiOutlineChevronDown className="w-5 h-5 -rotate-90" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Confirmation Modal */}
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

function DetailNode({ label, value, icon: Icon }) {
  return (
    <div className="group space-y-1.5 p-4 rounded-xl bg-white/[0.02] border border-white/[0.05] hover:border-indigo-500/20 transition-all">
      <div className="flex items-center gap-3">
         <Icon className="w-4 h-4 text-indigo-500" />
         <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">{label}</span>
      </div>
      <p className="text-sm text-slate-200 font-bold pl-7 tracking-tight">{value}</p>
    </div>
  );
}
