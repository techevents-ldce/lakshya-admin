import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
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
    <div className="animate-fade-in space-y-8">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tighter uppercase mb-1">Event Management</h1>
          <p className="text-slate-500 font-medium">Manage and monitor event activities and categories</p>
        </div>
        {isSuperadmin && (
          <Link to="/events/new" className="btn-primary flex items-center gap-2 group px-8 py-3 text-[11px] font-black uppercase tracking-[0.2em] shadow-xl shadow-primary-900/40">
            <HiOutlinePlus className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" />
            <span>Create New Event</span>
          </Link>
        )}
      </div>

      {/* Control Panel */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center gap-4 bg-slate-900/40 p-3 rounded-2xl border border-slate-700/30 backdrop-blur-xl">
        <div className="relative group flex-1">
          <HiOutlineSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-primary-400 w-5 h-5 transition-colors" />
          <input 
            type="text" 
            placeholder="Search events..." 
            value={search} 
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="input-field pl-12" 
          />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 px-4 py-2 hover:bg-white/[0.02] rounded-xl group transition-all border border-transparent hover:border-slate-800">
             <HiOutlineFilter className="w-4 h-4 text-slate-500 group-hover:text-primary-400" />
             <select value={categoryFilter} onChange={(e) => { setCategoryFilter(e.target.value); setPage(1); }} className="bg-transparent text-[10px] font-black text-slate-400 uppercase tracking-widest outline-none cursor-pointer">
               <option value="" className="bg-slate-900">All Categories</option>
               {categories.map((c) => <option key={c} value={c} className="bg-slate-900">{c}</option>)}
             </select>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 hover:bg-white/[0.02] rounded-xl group transition-all border border-transparent hover:border-slate-800">
             <HiOutlineUserGroup className="w-4 h-4 text-slate-500 group-hover:text-primary-400" />
             <select value={typeFilter} onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }} className="bg-transparent text-[10px] font-black text-slate-400 uppercase tracking-widest outline-none cursor-pointer">
               <option value="" className="bg-slate-900">All Types</option>
               <option value="solo" className="bg-slate-900">SOLO</option>
               <option value="team" className="bg-slate-900">TEAM</option>
             </select>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <HiOutlineRefresh className="w-10 h-10 text-primary-500 animate-spin" />
          <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest animate-pulse">Loading events...</p>
        </div>
      ) : (
        <div className="card overflow-hidden !p-0 border-slate-700/30">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-white/[0.01]">
                  <th className="px-6 py-5 w-12"></th>
                  <th className="px-6 py-5 text-[9px] font-black text-slate-600 uppercase tracking-widest">Event Title</th>
                  <th className="px-6 py-5 text-[9px] font-black text-slate-600 uppercase tracking-widest hidden sm:table-cell">Event Type</th>
                  <th className="px-6 py-5 text-[9px] font-black text-slate-600 uppercase tracking-widest">Capacity</th>
                  <th className="px-6 py-5 text-[9px] font-black text-slate-600 uppercase tracking-widest">Registration</th>
                  <th className="px-6 py-5 text-[9px] font-black text-slate-600 uppercase tracking-widest text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.02]">
                {events.map((e) => (
                  <React.Fragment key={e._id}>
                    <tr className={`group hover:bg-white/[0.02] transition-all cursor-pointer ${expanded === e._id ? 'bg-white/[0.03]' : ''}`} onClick={() => toggleExpand(e._id)}>
                      <td className="px-6 py-5 text-center">
                        <div className={`p-1.5 rounded-lg transition-colors ${expanded === e._id ? 'bg-primary-500/20 text-primary-400' : 'text-slate-500 group-hover:text-slate-300'}`}>
                          {expanded === e._id ? <HiOutlineChevronUp className="w-4 h-4" /> : <HiOutlineChevronDown className="w-4 h-4" />}
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <p className="text-sm font-black text-white uppercase tracking-tight group-hover:text-primary-400 transition-colors leading-none">{e.title}</p>
                        <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest mt-1.5">{e.category || 'General'}</p>
                      </td>
                      <td className="px-6 py-5 hidden sm:table-cell">
                        <div className="flex items-center gap-3">
                           <span className={`px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-widest border ${e.eventType === 'team' ? 'bg-blue-500/10 border-blue-500/30 text-blue-400' : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'}`}>{e.eventType}</span>
                           <span className="text-[9px] font-black text-slate-500 uppercase tracking-tighter">{e.isPaid ? `₹${e.registrationFee}` : 'Free'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                         <div className="flex items-center gap-3">
                            <span className="text-xs font-black text-white">{e.capacity}</span>
                            <span className="text-[9px] font-black text-slate-700 uppercase tracking-widest">Limit</span>
                         </div>
                      </td>
                      <td className="px-6 py-5">
                        {isSuperadmin ? (
                          <button onClick={(ev) => { ev.stopPropagation(); handleToggle(e._id, e.title, e.isRegistrationOpen); }} 
                                  className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border transition-all hover:scale-105 active:scale-95 ${e.isRegistrationOpen ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-red-500/10 border-red-500/30 text-red-400'}`}>
                            {e.isRegistrationOpen ? 'OPEN' : 'CLOSED'}
                          </button>
                        ) : (
                          <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border ${e.isRegistrationOpen ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-red-500/10 border-red-500/30 text-red-400'}`}>
                            {e.isRegistrationOpen ? 'OPEN' : 'CLOSED'}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-5 text-right" onClick={(ev) => ev.stopPropagation()}>
                        {isSuperadmin && (
                          <div className="flex items-center justify-end gap-2">
                            <Link to={`/events/${e._id}/edit`} className="w-9 h-9 flex items-center justify-center rounded-xl bg-slate-900 border border-slate-800 text-slate-500 hover:text-white hover:border-slate-700 transition-all shadow-xl">
                              <HiOutlinePencil className="w-4 h-4" />
                            </Link>
                            <button onClick={() => handleDelete(e._id, e.title)} className="w-9 h-9 flex items-center justify-center rounded-xl bg-slate-900 border border-slate-800 text-slate-500 hover:text-red-400 hover:border-red-500/30 transition-all shadow-xl">
                              <HiOutlineTrash className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                    {expanded === e._id && (
                      <tr className="bg-white/[0.01] animate-scale-in">
                        <td colSpan="6" className="px-8 py-10">
                          <div className="grid grid-cols-1 lg:grid-cols-4 gap-12 border-l-2 border-primary-500/30 pl-8">
                            <div className="col-span-1 lg:col-span-1">
                              <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                                <HiOutlineInformationCircle className="w-4 h-4 text-primary-400" /> Description
                              </h4>
                              <p className="text-xs text-slate-400 leading-relaxed font-bold uppercase tracking-tight">{e.description || 'No description provided.'}</p>
                            </div>
                            
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 col-span-1 lg:col-span-2">
                               <div className="space-y-6">
                                  <DetailNode label="Event Slug" value={e.slug} icon={HiOutlineTicket} />
                                  <DetailNode label="Location" value={e.venue || 'Not specified'} icon={HiOutlineLocationMarker} />
                                  <DetailNode label="Date & Time" value={fmtDT(e.eventDate)} icon={HiOutlineCalendar} />
                               </div>
                               <div className="space-y-6">
                                  <DetailNode label="Deadline" value={fmtDT(e.registrationDeadline)} icon={HiOutlineClock} />
                                  <DetailNode label="Team Size" value={e.eventType === 'team' ? `${e.teamSizeMin} - ${e.teamSizeMax} Members` : 'Solo Event'} icon={HiOutlineUserGroup} />
                                  <DetailNode label="Coordinators" value={e.coordinators?.length > 0 ? `${e.coordinators.length} Assigned` : 'None'} icon={HiOutlineUsers} />
                               </div>
                            </div>

                            <div className="col-span-1 flex flex-col justify-between items-end border-l border-white/[0.05] pl-8">
                               <div className="text-right space-y-4">
                                  <div className="space-y-1">
                                     <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Created At</p>
                                     <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">{fmtDT(e.createdAt)}</p>
                                  </div>
                                  <div className="space-y-1">
                                     <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Updated At</p>
                                     <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">{fmtDT(e.updatedAt)}</p>
                                  </div>
                               </div>
                               <Link 
                                 to={`/registrations?eventId=${e._id}`} 
                                 className="btn-primary w-full py-4 text-[10px] font-black uppercase tracking-[0.3em] flex items-center justify-center gap-2 shadow-xl shadow-primary-900/40"
                               >
                                  <HiOutlineSearch className="w-4 h-4" /> VIEW REGISTRATIONS
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
                       <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.3em]">No Events Found</p>
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
                    className={`w-10 h-10 rounded-xl text-[10px] font-black uppercase tracking-tighter transition-all ${page === i + 1 ? 'bg-primary-500 text-white shadow-lg shadow-primary-900/40 scale-110 z-10' : 'bg-slate-900 text-slate-500 hover:text-white border border-slate-800'}`}
                  >
                    {i + 1}
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
    <div className="group space-y-1.5 p-3 rounded-2xl bg-white/[0.02] border border-white/[0.05] hover:border-primary-500/20 transition-all">
      <div className="flex items-center gap-2">
         <Icon className="w-3.5 h-3.5 text-primary-500" />
         <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest">{label}</span>
      </div>
      <p className="text-xs text-slate-200 font-bold uppercase tracking-tight pl-5">{value}</p>
    </div>
  );
}
