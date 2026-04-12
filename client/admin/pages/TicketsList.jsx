import { useState, useEffect } from 'react';
import api from '../services/api';
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
  valid: { label: 'Valid', color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/30' },
  used: { label: 'Used', color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/30' },
  cancelled: { label: 'Cancelled', color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/30' },
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
      const params = { page, limit: 40 };
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

  useEffect(() => { fetchTickets(); }, [page, statusFilter, eventFilter, search]);

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
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tighter uppercase mb-1">Tickets</h1>
          <p className="text-slate-500 font-medium">{total.toLocaleString()} total tickets found</p>
        </div>
        <div className="flex items-center gap-2 bg-slate-900/40 p-1.5 rounded-2xl border border-slate-700/30 backdrop-blur-xl transition-all shadow-xl">
          <button 
            onClick={() => setViewMode('flat')} 
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${viewMode === 'flat' ? 'bg-primary-500 text-white shadow-lg shadow-primary-900/40' : 'text-slate-500 hover:text-slate-200'}`}
          >
            <HiOutlineViewList className="w-4 h-4" /> List View
          </button>
          <button 
            onClick={() => setViewMode('team')} 
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${viewMode === 'team' ? 'bg-primary-500 text-white shadow-lg shadow-primary-900/40' : 'text-slate-500 hover:text-slate-200'}`}
          >
            <HiOutlineViewBoards className="w-4 h-4" /> Team View
          </button>
        </div>
      </div>

      {/* Control Panel */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-4 bg-slate-900/40 p-3 rounded-2xl border border-slate-700/30 backdrop-blur-xl">
        <div className="relative w-full lg:max-w-xs group">
          <HiOutlineSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-primary-400 w-5 h-5 transition-colors" />
          <input 
            type="text" 
            placeholder="Search by Ticket ID or Name..." 
            value={search} 
            onChange={(e) => { setSearch(e.target.value); setPage(1); }} 
            className="input-field pl-12" 
          />
        </div>
        <div className="flex flex-wrap items-center gap-4 w-full lg:w-auto px-2">
          <div className="h-8 w-px bg-slate-800 hidden lg:block"></div>
          
          <div className="flex items-center gap-2 group px-4 py-2 hover:bg-white/[0.02] rounded-xl transition-all cursor-pointer">
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

          <div className="flex items-center gap-2 group px-4 py-2 hover:bg-white/[0.02] rounded-xl transition-all cursor-pointer">
             <HiOutlineShieldCheck className="w-4 h-4 text-slate-500 group-hover:text-primary-400" />
             <select 
               value={statusFilter} 
               onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} 
               className="bg-transparent text-[10px] font-black text-slate-400 uppercase tracking-widest outline-none cursor-pointer"
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
          <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] animate-pulse">Loading Tickets...</p>
        </div>
      ) : viewMode === 'flat' ? (
        <div className="card !p-0 overflow-hidden border-slate-700/30">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-white/[0.01]">
                  <th className="px-6 py-5 text-[9px] font-black text-slate-600 uppercase tracking-widest">Ticket ID</th>
                  <th className="px-6 py-5 text-[9px] font-black text-slate-600 uppercase tracking-widest">User</th>
                  <th className="px-6 py-5 text-[9px] font-black text-slate-600 uppercase tracking-widest">Event</th>
                  <th className="px-6 py-5 text-[9px] font-black text-slate-600 uppercase tracking-widest">Team</th>
                  <th className="px-6 py-5 text-[9px] font-black text-slate-600 uppercase tracking-widest text-center">Status</th>
                  <th className="px-6 py-5 text-[9px] font-black text-slate-600 uppercase tracking-widest text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.02]">
                {tickets.map((t) => {
                  const cfg = STATUS_CONFIG[t.status] || STATUS_CONFIG.valid;
                  return (
                    <tr key={t._id} className="group hover:bg-white/[0.02] transition-all cursor-default text-xs">
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500 group-hover:text-primary-400 group-hover:border-primary-500/30 transition-all shadow-lg">
                            <HiOutlineTicket className="w-4 h-4" />
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-[9px] font-black text-slate-400 uppercase tracking-tight">{(t.ticketId || t._id)?.slice(0, 14)}</span>
                            <button onClick={() => copyToClipboard(t.ticketId)} className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-white/[0.05] transition-all text-slate-600 hover:text-white">
                              <HiOutlineClipboardCopy className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <p className="text-xs font-black text-white uppercase tracking-tight group-hover:text-primary-400 transition-colors leading-none">{t.userId?.name || 'Unknown User'}</p>
                        <p className="text-[9px] text-slate-500 font-bold tracking-tight mt-1.5 uppercase">{t.userId?.email || 'No Email'}</p>
                      </td>
                      <td className="px-6 py-5">
                         <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest truncate max-w-[120px]">{t.eventId?.title || 'No Event'}</p>
                      </td>
                      <td className="px-6 py-5">
                        {t.team ? (
                          <div className="flex items-center gap-2.5">
                            <div className="p-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 group-hover:bg-blue-500 group-hover:text-white transition-all duration-300">
                               <HiOutlineUserGroup className="w-3 h-3" />
                            </div>
                            <span className="text-[10px] font-black text-blue-400 uppercase tracking-tighter truncate max-w-[100px] group-hover:text-white transition-colors">{t.team.teamName}</span>
                          </div>
                        ) : <span className="text-slate-700 text-[9px] font-black uppercase tracking-[0.2em] opacity-40 italic">Solo</span>}
                      </td>
                      <td className="px-6 py-5 text-center">
                         <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border ${cfg.bg} ${cfg.color} inline-flex items-center gap-1.5`}>
                            {t.status === 'used' ? <HiOutlineCheckCircle className="w-3 h-3" /> : <HiOutlineShieldCheck className="w-3 h-3" />}
                            {cfg.label}
                         </span>
                      </td>
                      <td className="px-6 py-5 text-right">
                        <div className="flex items-center justify-end gap-2.5">
                          {t.status === 'valid' && (
                            <>
                              <button onClick={() => handleMarkUsed(t._id)} className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-900 border border-slate-800 text-slate-500 hover:text-emerald-400 hover:border-emerald-500/30 transition-all shadow-xl active:scale-95" title="MARK AS USED">
                                <HiOutlineQrcode className="w-5 h-5" />
                              </button>
                              <button onClick={() => handleCancel(t._id)} className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-900 border border-slate-800 text-slate-500 hover:text-red-400 hover:border-red-500/30 transition-all shadow-xl active:scale-95" title="CANCEL TICKET">
                                <HiOutlineBan className="w-5 h-5" />
                              </button>
                            </>
                          )}
                          {user?.role === 'superadmin' && (
                            <button onClick={() => handleDelete(t._id)} className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-900 border border-slate-800 text-slate-500 hover:text-white hover:bg-red-500/10 hover:border-red-500/30 transition-all shadow-xl active:scale-95" title="DELETE PERMANENTLY">
                              <HiOutlineTrash className="w-5 h-5" />
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
            <div className="flex items-center justify-center gap-4 py-8 bg-white/[0.01] border-t border-white/[0.05]">
              {[...Array(pages)].map((_, i) => (
                <button 
                  key={i} 
                  onClick={() => setPage(i + 1)} 
                  className={`w-10 h-10 rounded-xl text-[10px] font-black uppercase tracking-tighter transition-all ${page === i + 1 ? 'bg-primary-500 text-white shadow-lg shadow-primary-900/40 scale-110 z-10' : 'bg-slate-900 text-slate-500 hover:text-white border border-slate-800'}`}
                >
                  {i + 1}
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
                  <div key={group.team._id} className="card !p-0 overflow-hidden border-slate-700/30 bg-slate-900/40 backdrop-blur-xl relative group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-primary-500/5 blur-[50px] pointer-events-none"></div>
                    <div className="flex items-center justify-between px-8 py-6 bg-white/[0.02] border-b border-white/[0.05]">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 text-white flex items-center justify-center shadow-xl shadow-blue-900/30 transform rotate-3 group-hover:rotate-0 transition-all duration-500">
                          <HiOutlineUserGroup className="w-6 h-6" />
                        </div>
                        <div>
                          <p className="text-lg font-black text-white uppercase tracking-tighter leading-none">{group.team.teamName}</p>
                          <p className="text-[9px] text-blue-400 font-black uppercase tracking-widest mt-2">{group.event?.title || 'No Event'}</p>
                        </div>
                      </div>
                      <div className="text-right flex flex-col items-end gap-1.5">
                         <span className="px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-[9px] font-black text-blue-400 uppercase tracking-[0.2em]">{group.tickets.length} TICKETS</span>
                         {group.team.leaderId && <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5"><span className="w-1 h-1 rounded-full bg-blue-500 animate-pulse"></span> TEAM LEADER: {group.team.leaderId.name}</p>}
                      </div>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left">
                        <tbody className="divide-y divide-white/[0.02]">
                          {group.tickets.map((t) => {
                            const cfg = STATUS_CONFIG[t.status] || STATUS_CONFIG.valid;
                            return (
                              <tr key={t._id} className="group/row hover:bg-white/[0.01] transition-all">
                                <td className="px-8 py-4 w-[160px]">
                                  <div className="flex items-center gap-2">
                                    <span className="font-mono text-[9px] font-black text-slate-600 uppercase tracking-tight">{(t.ticketId || t._id).slice(0, 12)}</span>
                                    <button onClick={() => copyToClipboard(t.ticketId)} className="opacity-0 group-hover/row:opacity-100 text-slate-700 hover:text-primary-400 transition-all"><HiOutlineClipboardCopy className="w-3.5 h-3.5" /></button>
                                  </div>
                                </td>
                                <td className="px-8 py-4">
                                  <p className="text-xs font-black text-slate-300 group-hover/row:text-white transition-colors leading-none">{t.userId?.name || '---'}</p>
                                  {t.userId?._id?.toString() === group.team.leaderId?._id?.toString() && (
                                    <span className="inline-block mt-1 text-[7px] px-1.5 py-0.5 bg-primary-500 text-white font-black rounded-lg uppercase tracking-widest">TEAM LEADER</span>
                                  )}
                                </td>
                                <td className="px-8 py-4 text-center">
                                   <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest border border-white/[0.05] ${cfg.color}`}>{cfg.label}</span>
                                </td>
                                <td className="px-8 py-4 text-right">
                                   {t.status === 'valid' && (
                                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover/row:opacity-100 transition-opacity">
                                      <button onClick={() => handleMarkUsed(t._id)} title="Mark Used" className="w-8 h-8 flex items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-white transition-all shadow-lg"><HiOutlineCheckCircle className="w-4 h-4" /></button>
                                      <button onClick={() => handleCancel(t._id)} title="Cancel" className="w-8 h-8 flex items-center justify-center rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all shadow-lg"><HiOutlineBan className="w-4 h-4" /></button>
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
                  <h3 className="text-[11px] font-black text-slate-500 uppercase tracking-[0.3em] flex items-center gap-3">
                     <HiOutlineTicket className="w-5 h-5 text-emerald-500" /> Individual Tickets ({soloTickets.length})
                  </h3>
               </div>
               <div className="overflow-x-auto">
                 <table className="w-full text-left">
                   <thead>
                     <tr className="bg-white/[0.01]">
                       <th className="px-8 py-5 text-[9px] font-black text-slate-600 uppercase tracking-widest">Ticket ID</th>
                       <th className="px-8 py-5 text-[9px] font-black text-slate-600 uppercase tracking-widest">User</th>
                       <th className="px-8 py-5 text-[9px] font-black text-slate-600 uppercase tracking-widest text-right">Actions</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-white/[0.02]">
                     {soloTickets.map((t) => (
                       <tr key={t._id} className="group hover:bg-white/[0.02] transition-all">
                         <td className="px-8 py-5">
                            <div className="flex items-center gap-3">
                              <span className="font-mono text-[9px] font-black text-slate-500 uppercase tracking-tight">{(t.ticketId || t._id).slice(0, 16)}</span>
                              <button onClick={() => copyToClipboard(t.ticketId)} className="opacity-0 group-hover:opacity-100 text-slate-600 hover:text-primary-400 transition-all"><HiOutlineClipboardCopy className="w-4 h-4" /></button>
                            </div>
                         </td>
                         <td className="px-8 py-5">
                            <p className="text-xs font-black text-white uppercase tracking-tight group-hover:text-primary-400 transition-all leading-none">{t.userId?.name || 'Unknown User'}</p>
                            <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mt-1.5">{t.eventId?.title || 'No Event'}</p>
                         </td>
                         <td className="px-8 py-5 text-right">
                            {t.status === 'valid' && (
                              <div className="flex justify-end gap-3 opacity-0 group-hover:opacity-100 transition-all">
                                <button onClick={() => handleMarkUsed(t._id)} className="px-6 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[9px] font-black uppercase tracking-widest hover:bg-emerald-500 hover:text-white transition-all shadow-xl">Mark Used</button>
                                <button onClick={() => handleCancel(t._id)} className="px-6 py-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-[9px] font-black uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all shadow-xl">Cancel Ticket</button>
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
