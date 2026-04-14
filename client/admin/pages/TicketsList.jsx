import { useState, useEffect } from 'react';
import api from '../../src/services/api';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { 
  HiOutlineSearch, 
  HiOutlineCheckCircle, 
  HiOutlineBan, 
  HiOutlineClipboardCopy, 
  HiOutlineUserGroup, 
  HiOutlineViewList, 
  HiOutlineViewBoards, 
  HiOutlineTrash, 
  HiOutlineTicket,
  HiOutlineRefresh,
  HiOutlineFilter,
  HiOutlineShieldCheck,
  HiOutlineQrcode,
} from 'react-icons/hi';

const STATUS_CONFIG = {
  valid: { label: 'Valid', color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
  used: { label: 'Used', color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20' },
  cancelled: { label: 'Cancelled', color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20' },
};

export default function TicketsList() {
  const { user } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [events, setEvents] = useState([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [eventFilter, setEventFilter] = useState('');
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState('flat'); // 'flat' or 'team'

  useEffect(() => {
    api.get('/events', { params: { limit: 200 } }).then(({ data }) => setEvents(data.events || [])).catch(() => {});
  }, []);

  const fetchTickets = async () => {
    setLoading(true);
    try {
      // Team view groups by team; a larger page reduces the same team split across pages.
      const params = { page, limit: viewMode === 'team' ? 200 : 40 };
      if (statusFilter) params.status = statusFilter;
      if (eventFilter) params.eventId = eventFilter;
      if (search) params.search = search;
      const { data } = await api.get('/tickets', { params });
      setTickets(data.tickets || []);
      setTotal(data.total || 0);
      setPages(data.pages || 0);
    } catch { toast.error('Failed to load tickets'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchTickets(); }, [page, statusFilter, eventFilter, search, viewMode]);

  const handleMarkUsed = async (ticketDbId) => {
    try {
      await api.patch(`/tickets/${ticketDbId}/mark-used`);
      toast.success('Ticket marked as used');
      fetchTickets();
    } catch (err) { toast.error(err.userMessage || 'Failed to update ticket'); }
  };

  const handleCancel = async (ticketDbId) => {
    try {
      await api.patch(`/tickets/${ticketDbId}/cancel`);
      toast.success('Ticket cancelled');
      fetchTickets();
    } catch (err) { toast.error(err.userMessage || 'Failed to cancel ticket'); }
  };
  
  const handleDelete = async (ticketDbId) => {
    if (!window.confirm('Are you sure you want to permanently delete this ticket?')) return;
    try {
      await api.delete(`/tickets/${ticketDbId}`);
      toast.success('Ticket deleted permanently');
      fetchTickets();
    } catch (err) { toast.error(err.userMessage || 'Delete failed'); }
  };

  const copyToClipboard = (text) => { 
    if (!text) return;
    navigator.clipboard.writeText(text); 
    toast.success('ID copied'); 
  };

  const groupedByTeam = () => {
    const teamTickets = [];
    const soloTickets = [];
    const teamMap = {};

    tickets.forEach((t) => {
      if (t.team) {
        const teamId = t.team._id;
        if (!teamMap[teamId]) {
          teamMap[teamId] = {
            team: t.team,
            event: t.eventId,
            tickets: [],
          };
        }
        teamMap[teamId].tickets.push(t);
      } else {
        soloTickets.push(t);
      }
    });

    Object.values(teamMap).forEach((g) => teamTickets.push(g));
    return { teamTickets, soloTickets };
  };

  const { teamTickets, soloTickets } = viewMode === 'team' ? groupedByTeam() : { teamTickets: [], soloTickets: [] };

  return (
    <div className="animate-fade-in space-y-8">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight leading-none mb-2">Tickets</h1>
          <p className="text-slate-500 font-medium text-sm">{total.toLocaleString()} active tickets</p>
        </div>
        <div className="flex items-center gap-1.5 bg-slate-900 border border-white/[0.05] p-1 rounded-xl shadow-lg">
          <button 
            onClick={() => setViewMode('flat')} 
            className={`flex items-center gap-2 px-5 py-2 rounded-lg text-xs font-semibold transition-all duration-200 ${viewMode === 'flat' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-900/40' : 'text-slate-400 hover:text-white hover:bg-white/[0.03]'}`}
          >
            <HiOutlineViewList className="w-4 h-4" /> 
            <span>List View</span>
          </button>
          <button 
            onClick={() => setViewMode('team')} 
            className={`flex items-center gap-2 px-5 py-2 rounded-lg text-xs font-semibold transition-all duration-200 ${viewMode === 'team' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-900/40' : 'text-slate-400 hover:text-white hover:bg-white/[0.03]'}`}
          >
            <HiOutlineViewBoards className="w-4 h-4" /> 
            <span>Team View</span>
          </button>
        </div>
      </div>

      {/* Control Panel */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-4 bg-slate-900 border border-white/[0.05] p-3 rounded-xl shadow-lg">
        <div className="relative w-full lg:max-w-sm group">
          <HiOutlineSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-400 w-5 h-5 transition-colors" />
          <input 
            type="text" 
            placeholder="Search tickets (ID, name, email)..." 
            value={search} 
            onChange={(e) => { setSearch(e.target.value); setPage(1); }} 
            className="input-field pl-12" 
          />
        </div>
        <div className="flex flex-wrap items-center gap-4 w-full lg:w-auto px-2">
          <div className="h-8 w-px bg-slate-800 hidden lg:block"></div>
          
          <div className="flex items-center gap-2 group px-4 py-2 hover:bg-white/[0.03] rounded-xl transition-all border border-transparent hover:border-slate-800 cursor-pointer">
             <HiOutlineFilter className="w-4 h-4 text-slate-500 group-hover:text-indigo-400" />
             <select 
               value={eventFilter} 
               onChange={(e) => { setEventFilter(e.target.value); setPage(1); }} 
               className="bg-transparent text-xs font-semibold text-slate-400 outline-none cursor-pointer"
             >
               <option value="" className="bg-slate-900">All Events</option>
               {events.map((ev) => <option key={ev._id} value={ev._id} className="bg-slate-900">{ev.title}</option>)}
             </select>
          </div>

          <div className="h-8 w-px bg-slate-800 hidden lg:block"></div>

          <div className="flex items-center gap-2 group px-4 py-2 hover:bg-white/[0.03] rounded-xl transition-all border border-transparent hover:border-slate-800 cursor-pointer">
             <HiOutlineShieldCheck className="w-4 h-4 text-slate-500 group-hover:text-indigo-400" />
             <select 
               value={statusFilter} 
               onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} 
               className="bg-transparent text-xs font-semibold text-slate-400 outline-none cursor-pointer"
             >
               <option value="" className="bg-slate-900">All Status</option>
               {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                 <option key={key} value={key} className="bg-slate-900">{cfg.label}</option>
               ))}
             </select>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <HiOutlineRefresh className="w-10 h-10 text-primary-500 animate-spin" />
          <p className="text-[10px] font-bold text-slate-600 uppercase tracking-[0.2em] animate-pulse">Loading Tickets...</p>
        </div>
      ) : viewMode === 'flat' ? (
        <div className="card !p-0 overflow-hidden border-slate-700/30">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-white/[0.01]">
                  <th className="px-6 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-white/[0.05]">Ticket ID</th>
                  <th className="px-6 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-white/[0.05]">User Info</th>
                  <th className="px-6 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-white/[0.05]">Event</th>
                  <th className="px-6 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-white/[0.05]">Team</th>
                  <th className="px-6 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-white/[0.05] text-center">Status</th>
                  <th className="px-6 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-white/[0.05] text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.02]">
                {tickets.map((t) => {
                  const cfg = STATUS_CONFIG[t.status] || STATUS_CONFIG.valid;
                  return (
                    <tr key={t._id} className="group hover:bg-white/[0.02] transition-all cursor-default">
                      <td className="px-6 py-6">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500 group-hover:text-indigo-400 group-hover:border-indigo-500 transition-all shadow-lg shadow-indigo-500/5">
                            <HiOutlineTicket className="w-4.5 h-4.5" />
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-[10px] font-bold text-slate-400 uppercase tracking-widest">{(t.ticketId || t._id)?.slice(0, 14)}</span>
                            <button onClick={() => copyToClipboard(t.ticketId)} className="opacity-0 group-hover:opacity-100 p-1 rounded-md hover:bg-white/[0.05] transition-all text-slate-600 hover:text-white">
                               <HiOutlineClipboardCopy className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-6">
                        <p className="text-sm font-bold text-white group-hover:text-indigo-400 transition-colors tracking-tight leading-none mb-1.5">{t.userId?.name || 'Guest User'}</p>
                        <p className="text-[10px] text-slate-500/70 font-medium uppercase tracking-widest">{t.userId?.email || 'N/A'}</p>
                      </td>
                      <td className="px-6 py-6">
                         <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest truncate max-w-[120px] leading-none">{t.eventId?.title || 'System core'}</p>
                      </td>
                      <td className="px-6 py-6 font-medium">
                        {t.team ? (
                          <div className="flex items-center gap-2.5">
                            <div className="p-1 rounded-md bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                               <HiOutlineUserGroup className="w-3 h-3" />
                            </div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest truncate max-w-[100px]">{t.team.teamName}</span>
                          </div>
                        ) : <span className="text-slate-700 text-[10px] font-bold uppercase tracking-widest opacity-30 italic leading-none">Individual</span>}
                      </td>
                      <td className="px-6 py-6 text-center">
                         <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest border ${cfg.bg} ${cfg.color} inline-flex items-center gap-1.5 leading-none`}>
                            {t.status === 'used' ? <HiOutlineCheckCircle className="w-3.5 h-3.5" /> : <HiOutlineShieldCheck className="w-3.5 h-3.5" />}
                            {cfg.label}
                         </span>
                      </td>
                      <td className="px-6 py-6 text-right">
                        <div className="flex items-center justify-end gap-2.5">
                          {t.status === 'valid' && (
                            <>
                              <button onClick={() => handleMarkUsed(t._id)} className="w-9 h-9 flex items-center justify-center rounded-lg bg-slate-950 border border-slate-800 text-slate-500 hover:text-emerald-400 hover:border-emerald-500/40 transition-all shadow-lg active:scale-95" title="Mark Used">
                                <HiOutlineQrcode className="w-5 h-5" />
                              </button>
                              <button onClick={() => handleCancel(t._id)} className="w-9 h-9 flex items-center justify-center rounded-lg bg-slate-950 border border-slate-800 text-slate-500 hover:text-red-400 hover:border-red-500/40 transition-all shadow-lg active:scale-95" title="Cancel Ticket">
                                <HiOutlineBan className="w-5 h-5" />
                              </button>
                            </>
                          )}
                          {user?.role === 'superadmin' && (
                            <button onClick={() => handleDelete(t._id)} className="w-9 h-9 flex items-center justify-center rounded-lg bg-red-600/10 border border-red-600/20 text-red-500 hover:bg-red-600 hover:text-white transition-all shadow-lg active:scale-95" title="Delete">
                              <HiOutlineTrash className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {pages > 1 && (
            <div className="flex items-center justify-center gap-3 py-10 bg-white/[0.01] border-t border-white/[0.05]">
              {[...Array(pages)].map((_, i) => (
                <button 
                  key={i} 
                  onClick={() => setPage(i + 1)} 
                  className={`w-10 h-10 rounded-lg text-xs font-bold transition-all ${page === i + 1 ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-900 text-slate-500 hover:text-white border border-slate-800'}`}
                >
                  {(i + 1).toString().padStart(2, '0')}
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* Team Cluster View */
        <div className="grid grid-cols-1 gap-12 animate-scale-in">
          {teamTickets.length > 0 && (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                {teamTickets.map((group) => (
                  <div key={group.team._id} className="card !p-0 overflow-hidden border-white/[0.05] bg-slate-900 shadow-xl relative group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 blur-[50px] pointer-events-none"></div>
                    <div className="flex items-center justify-between px-8 py-6 bg-white/[0.02] border-b border-white/[0.05]">
                      <div className="flex items-center gap-4">
                        <div className="w-11 h-11 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-900/30 transition-all duration-500">
                          <HiOutlineUserGroup className="w-6 h-6" />
                        </div>
                        <div>
                          <p className="text-lg font-bold text-white tracking-tight leading-none mb-1.5 uppercase">{group.team.teamName}</p>
                          <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest">{group.event?.title || 'General'}</p>
                        </div>
                      </div>
                      <div className="text-right flex flex-col items-end gap-1.5">
                         <span className="px-2.5 py-1 rounded-md bg-white/[0.05] border border-white/[0.05] text-[10px] font-bold text-slate-400 uppercase tracking-widest">{group.tickets.length} Tickets</span>
                         {group.team.leaderId && <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5 leading-none mt-1 opacity-70">LDR: {group.team.leaderId.name}</p>}
                      </div>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left">
                        <tbody className="divide-y divide-white/[0.02]">
                          {group.tickets.map((t) => {
                            const cfg = STATUS_CONFIG[t.status] || STATUS_CONFIG.valid;
                            return (
                              <tr key={t._id} className="group/row hover:bg-white/[0.01] transition-all">
                                <td className="px-8 py-5 w-[160px]">
                                  <div className="flex items-center gap-2">
                                    <span className="font-mono text-[10px] font-bold text-slate-600 uppercase tracking-widest">{(t.ticketId || t._id).slice(0, 12)}</span>
                                    <button onClick={() => copyToClipboard(t.ticketId)} className="opacity-0 group-hover/row:opacity-100 text-slate-700 hover:text-indigo-400 transition-all"><HiOutlineClipboardCopy className="w-3.5 h-3.5" /></button>
                                  </div>
                                </td>
                                <td className="px-8 py-5">
                                  <p className="text-xs font-bold text-slate-400 group-hover/row:text-white transition-colors leading-none mb-1">{t.userId?.name || '---'}</p>
                                  {t.userId?._id?.toString() === group.team.leaderId?._id?.toString() && (
                                    <span className="text-[9px] text-indigo-400 font-bold uppercase tracking-widest opacity-60">Team Leader</span>
                                  )}
                                </td>
                                <td className="px-8 py-5 text-center">
                                   <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest border border-transparent ${cfg.color}`}>{cfg.label}</span>
                                </td>
                                <td className="px-8 py-5 text-right">
                                   {t.status === 'valid' && (
                                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover/row:opacity-100 transition-all duration-200">
                                      <button onClick={() => handleMarkUsed(t._id)} title="Mark Used" className="w-8 h-8 flex items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-white transition-all shadow-md"><HiOutlineCheckCircle className="w-4 h-4" /></button>
                                      <button onClick={() => handleCancel(t._id)} title="Cancel" className="w-8 h-8 flex items-center justify-center rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all shadow-md"><HiOutlineBan className="w-4 h-4" /></button>
                                    </div>
                                   )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
            </div>
          )}

          {soloTickets.length > 0 && (
            <div className="card !p-0 overflow-hidden border-slate-700/30">
               <div className="px-8 py-6 bg-white/[0.02] border-b border-white/[0.05]">
                  <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-[0.3em] flex items-center gap-3">
                     <HiOutlineTicket className="w-5 h-5 text-emerald-500" /> Individual Entries ({soloTickets.length})
                  </h3>
               </div>
               <div className="overflow-x-auto">
                 <table className="w-full text-left">
                   <thead>
                      <tr className="bg-white/[0.01]">
                        <th className="px-8 py-5 text-[9px] font-bold text-slate-600 uppercase tracking-wider">Ticket ID</th>
                        <th className="px-8 py-5 text-[9px] font-bold text-slate-500 uppercase tracking-widest">User Info</th>
                        <th className="px-8 py-5 text-[9px] font-bold text-slate-600 uppercase tracking-widest text-right">Actions</th>
                      </tr>
                   </thead>
                   <tbody className="divide-y divide-white/[0.02]">
                     {soloTickets.map((t) => (
                       <tr key={t._id} className="group hover:bg-white/[0.02] transition-all">
                         <td className="px-8 py-5">
                            <div className="flex items-center gap-3">
                              <span className="font-mono text-[9px] font-bold text-slate-500 uppercase tracking-tight">{(t.ticketId || t._id).slice(0, 16)}</span>
                              <button onClick={() => copyToClipboard(t.ticketId)} className="opacity-0 group-hover:opacity-100 text-slate-600 hover:text-primary-400 transition-all"><HiOutlineClipboardCopy className="w-4 h-4" /></button>
                            </div>
                         </td>
                         <td className="px-8 py-5">
                            <p className="text-xs font-bold text-white uppercase group-hover:text-indigo-400 transition-colors leading-none mb-1">{t.userId?.name || '---'}</p>
                            <p className="text-[9px] text-slate-600 font-bold uppercase tracking-tight">{t.eventId?.title || 'GENERAL_INTAKE'}</p>
                         </td>
                         <td className="px-8 py-5 text-right">
                             {t.status === 'valid' && (
                               <div className="flex justify-end gap-2.5 opacity-0 group-hover:opacity-100 transition-all duration-200">
                                 <button onClick={() => handleMarkUsed(t._id)} className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center hover:bg-emerald-500 hover:text-white transition-all"><HiOutlineCheckCircle className="w-4 h-4" /></button>
                                 <button onClick={() => handleCancel(t._id)} className="w-8 h-8 rounded-lg bg-red-500/10 text-red-500 flex items-center justify-center hover:bg-red-500 hover:text-white transition-all"><HiOutlineBan className="w-4 h-4" /></button>
                               </div>
                             )}
                         </td>
                       </tr>
                     ))}
                   </tbody>
                 </table>
               </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
