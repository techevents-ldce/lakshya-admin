import { useState, useEffect } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { 
  HiOutlineSearch, 
  HiOutlineUserGroup, 
  HiOutlineBan, 
  HiOutlineShieldCheck, 
  HiOutlineUserCircle, 
  HiOutlineDotsVertical,
  HiOutlineInformationCircle,
  HiOutlineRefresh,
  HiOutlineFilter,
} from 'react-icons/hi';
import ConfirmWithPassword from '../components/ConfirmWithPassword';
import { useAuth } from '../context/AuthContext';

const STATUS_CONFIG = {
  active: { label: 'Active', color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
  disqualified: { label: 'Disqualified', color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20' },
  withdrawn: { label: 'Withdrawn', color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
};

export default function TeamsList() {
  const { user } = useAuth();
  const [teams, setTeams] = useState([]);
  const [events, setEvents] = useState([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [eventFilter, setEventFilter] = useState('');
  const [search, setSearch] = useState('');
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [teamLoading, setTeamLoading] = useState(false);
  const [confirmModal, setConfirmModal] = useState({ open: false, title: '', message: '', confirmLabel: '', variant: 'warning', action: null });

  useEffect(() => {
    api.get('/events', { params: { limit: 200 } }).then(({ data }) => setEvents(data.events || [])).catch(() => {});
  }, []);

  const fetchTeams = async () => {
    setLoading(true);
    try {
      const params = { page, limit: 20 };
      if (eventFilter) params.eventId = eventFilter;
      if (search) params.search = search;
      const { data } = await api.get('/teams', { params });
      setTeams(data.teams || []);
      setTotal(data.total || 0);
      setPages(data.pages || 0);
    } catch { toast.error('Failed to load team list'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchTeams(); }, [page, eventFilter, search]);

  const viewTeamDetail = async (teamId) => {
    setTeamLoading(true);
    try {
      const { data } = await api.get(`/teams/${teamId}`);
      setSelectedTeam(data.data);
    } catch { toast.error('Failed to load team details'); }
    finally { setTeamLoading(false); }
  };

  const handleCancelTeam = (teamId, teamName) => {
    setConfirmModal({
      open: true, title: 'Cancel Registration', confirmLabel: 'CANCEL REGISTRATION', variant: 'danger',
      message: `Are you sure you want to cancel the registration for "${teamName}"? All team member tickets will be cancelled.`,
      action: async (pw) => {
        await api.patch(`/teams/${teamId}/cancel`, { adminPassword: pw });
        toast.success('Registration cancelled');
        fetchTeams();
        if (selectedTeam?._id === teamId) setSelectedTeam(null);
      },
    });
  };

  const handleRemoveMember = (teamId, userId, memberName) => {
    setConfirmModal({
      open: true, title: 'Remove Member', confirmLabel: 'REMOVE', variant: 'warning',
      message: `You are about to remove "${memberName}" from the team.`,
      action: async (pw) => {
        await api.delete(`/teams/${teamId}/members/${userId}`, { data: { adminPassword: pw } });
        toast.success('Member removed');
        viewTeamDetail(teamId);
      },
    });
  };

  return (
    <div className="animate-fade-in space-y-8">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tighter uppercase mb-1">Teams</h1>
          <p className="text-slate-500 font-medium">{total.toLocaleString()} registered teams found</p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center gap-4 bg-slate-900/40 p-3 rounded-2xl border border-slate-700/30 backdrop-blur-xl">
           <div className="relative w-full sm:max-w-xs group">
             <HiOutlineSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-primary-400 w-5 h-5 transition-colors" />
             <input 
               type="text" 
               placeholder="Search by team name or leader..." 
               value={search} 
               onChange={(e) => { setSearch(e.target.value); setPage(1); }} 
               className="input-field pl-12" 
             />
           </div>
           <div className="h-8 w-px bg-slate-800 hidden sm:block"></div>
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
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
        {/* Teams List */}
        <div className="xl:col-span-8 space-y-6">
          {loading ? (
             <div className="flex flex-col items-center justify-center py-24 gap-4">
               <HiOutlineRefresh className="w-10 h-10 text-primary-500 animate-spin" />
               <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] animate-pulse">Loading Teams...</p>
             </div>
          ) : (
            <div className="card !p-0 overflow-hidden border-slate-700/30">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-white/[0.01]">
                      <th className="px-6 py-5 text-[9px] font-black text-slate-600 uppercase tracking-widest">Team Name</th>
                      <th className="px-6 py-5 text-[9px] font-black text-slate-600 uppercase tracking-widest hidden sm:table-cell">Event</th>
                      <th className="px-6 py-5 text-[9px] font-black text-slate-600 uppercase tracking-widest">Leader</th>
                      <th className="px-6 py-5 text-[9px] font-black text-slate-600 uppercase tracking-widest">Members</th>
                      <th className="px-6 py-5 text-[9px] font-black text-slate-600 uppercase tracking-widest text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.02]">
                    {teams.map((t) => (
                      <tr 
                        key={t._id} 
                        className={`group hover:bg-white/[0.02] transition-all cursor-pointer ${selectedTeam?._id === t._id ? 'bg-primary-500/[0.05] border-l-2 border-l-primary-500' : ''}`} 
                        onClick={() => viewTeamDetail(t._id)}
                      >
                        <td className="px-6 py-5">
                          <p className="text-sm font-black text-white uppercase tracking-tight group-hover:text-primary-400 transition-colors leading-none">{t.teamName}</p>
                          <span className={`inline-flex mt-2 px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest border ${(STATUS_CONFIG[t.status] || STATUS_CONFIG.withdrawn).bg} ${(STATUS_CONFIG[t.status] || STATUS_CONFIG.withdrawn).color}`}>
                             {t.status}
                          </span>
                        </td>
                        <td className="px-6 py-5 hidden sm:table-cell">
                          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest truncate max-w-[120px]">{t.eventId?.title || 'No Event'}</p>
                        </td>
                        <td className="px-6 py-5">
                          <p className="text-xs font-black text-slate-300 tracking-tight uppercase leading-none">{t.leaderId?.name || 'Unknown'}</p>
                        </td>
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-3">
                             <div className="w-8 h-8 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500 group-hover:border-primary-500/30 group-hover:text-primary-400 transition-all shadow-lg">
                               <HiOutlineUserGroup className="w-4 h-4" />
                             </div>
                             <span className="text-[10px] font-black text-white">{t.memberCount || 0}</span>
                          </div>
                        </td>
                        <td className="px-6 py-5 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-2">
                            {t.status === 'active' && (
                              <button onClick={() => handleCancelTeam(t._id, t.teamName)} className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-900 border border-slate-800 text-slate-500 hover:text-red-400 hover:border-red-500/30 transition-all shadow-xl active:scale-95">
                                <HiOutlineBan className="w-5 h-5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {pages > 1 && (
                <div className="flex items-center justify-center gap-3 py-8 bg-white/[0.01] border-t border-white/[0.05]">
                  {[...Array(pages)].map((_, i) => (
                    <button 
                      key={i} 
                      onClick={() => setPage(i + 1)} 
                      className={`w-10 h-10 rounded-xl text-[10px] font-black transition-all ${page === i + 1 ? 'bg-primary-500 text-white shadow-lg shadow-primary-900/40 scale-110 z-10' : 'bg-slate-900 text-slate-500 hover:text-white border border-slate-800'}`}
                    >
                      {i + 1}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Team Details Panel */}
        <div className="xl:col-span-4 lg:sticky lg:top-8">
          {teamLoading ? (
             <div className="card h-64 flex flex-col items-center justify-center gap-4 border-slate-700/30 bg-slate-900/40 backdrop-blur-xl">
               <HiOutlineRefresh className="w-10 h-10 text-primary-500 animate-spin" />
               <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest animate-pulse">Loading Details...</p>
             </div>
          ) : selectedTeam ? (
            <div className="card space-y-8 animate-scale-in relative border-slate-700/30 bg-slate-900/40 backdrop-blur-xl overflow-hidden shadow-2xl">
              <div className="absolute top-0 right-0 w-64 h-64 bg-primary-500/10 blur-[100px] pointer-events-none"></div>
              
              <div className="relative z-10">
                <div className="flex items-center gap-5 mb-8">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-white shadow-2xl shadow-primary-900/40 transform rotate-3 hover:rotate-0 transition-transform duration-500">
                    <HiOutlineUserGroup className="w-10 h-10" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-white uppercase tracking-tighter leading-tight">{selectedTeam.teamName}</h3>
                    <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em] mt-1.5 flex items-center gap-2">
                       <span className="w-1 h-3 bg-primary-500 rounded-full"></span>
                       Team ID: {selectedTeam._id.slice(-8)}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.05] hover:border-white/[0.1] transition-all">
                    <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-3">Status</p>
                    <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${(STATUS_CONFIG[selectedTeam.status] || STATUS_CONFIG.withdrawn).bg} ${(STATUS_CONFIG[selectedTeam.status] || STATUS_CONFIG.withdrawn).color}`}>
                       {selectedTeam.status}
                    </span>
                  </div>
                  <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.05] hover:border-white/[0.1] transition-all">
                     <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-3">Registration</p>
                     {selectedTeam.registration ? (
                       <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border border-emerald-500/30 bg-emerald-500/10 text-emerald-400`}>Confirmed</span>
                     ) : <span className="text-[10px] font-black text-slate-700 uppercase tracking-widest">Not Registered</span>}
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                 <div className="flex items-center justify-between px-2">
                   <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] flex items-center gap-2">
                      <HiOutlineDotsVertical className="w-3 h-3 text-primary-500" />
                      Team Members ({selectedTeam.members?.length || 0})
                   </h4>
                 </div>
                 <div className="space-y-3">
                   {(selectedTeam.members || []).map((m) => (
                     <div key={m._id} className="group flex items-center justify-between p-4 bg-white/[0.02] border border-white/[0.05] rounded-2xl hover:bg-white/[0.05] hover:border-primary-500/20 transition-all duration-500">
                       <div className="flex items-center gap-4">
                         <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-500 ${m.userId?._id?.toString() === selectedTeam.leaderId?._id?.toString() ? 'bg-primary-500 text-white shadow-xl shadow-primary-900/40 rotate-6 group-hover:rotate-0' : 'bg-slate-900 border border-slate-800 text-slate-600'}`}>
                            {m.userId?._id?.toString() === selectedTeam.leaderId?._id?.toString() ? <HiOutlineShieldCheck className="w-5 h-5" /> : <HiOutlineUserCircle className="w-6 h-6" />}
                         </div>
                         <div>
                            <p className="text-sm font-black text-white uppercase tracking-tight group-hover:text-primary-400 transition-colors leading-none">{m.userId?.name || 'Hidden Name'}</p>
                            <p className="text-[9px] text-slate-500 font-bold tracking-tight mt-1.5 uppercase">{m.userId?._id?.toString() === selectedTeam.leaderId?._id?.toString() ? 'Team Leader' : 'Member'}</p>
                         </div>
                       </div>
                       {m.userId?._id?.toString() !== selectedTeam.leaderId?._id?.toString() && selectedTeam.status === 'active' && (
                         <button 
                           onClick={() => handleRemoveMember(selectedTeam._id, m.userId?._id, m.userId?.name)} 
                           className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-700 hover:text-red-500 hover:bg-red-500/10 transition-all opacity-0 group-hover:opacity-100"
                         >
                           <HiOutlineBan className="w-4 h-4" />
                         </button>
                       )}
                     </div>
                   ))}
                 </div>
              </div>

              <div className="p-6 rounded-2xl border border-primary-500/20 bg-primary-500/[0.02] mt-8 group cursor-default">
                 <div className="flex items-center gap-3 mb-2">
                    <HiOutlineInformationCircle className="w-4 h-4 text-primary-500" />
                    <p className="text-[9px] font-black text-primary-500 uppercase tracking-[0.2em]">Event Name</p>
                 </div>
                 <p className="text-sm font-black text-white tracking-tighter uppercase leading-tight group-hover:text-primary-400 transition-colors">{selectedTeam.eventId?.title}</p>
              </div>
            </div>
          ) : (
            <div className="card h-80 flex flex-col items-center justify-center text-center p-12 border-dashed border-slate-700/50 bg-transparent group overflow-hidden">
              <div className="relative mb-6">
                <div className="absolute inset-0 bg-primary-500 blur-2xl opacity-0 group-hover:opacity-20 transition-opacity duration-700"></div>
                <div className="bg-slate-900 shadow-2xl p-6 rounded-[2.5rem] border border-slate-800 group-hover:scale-110 transition-transform duration-700 relative z-10">
                  <HiOutlineUserGroup className="w-12 h-12 text-slate-700 group-hover:text-primary-500 transition-colors" />
                </div>
              </div>
              <h4 className="text-[11px] font-black text-slate-500 uppercase tracking-[0.3em] leading-relaxed mb-3">Team Details</h4>
              <p className="text-[10px] font-bold text-slate-700 leading-relaxed max-w-[200px] uppercase tracking-tighter">Select a team from the list to view its members and manage status</p>
            </div>
          )}
        </div>
      </div>

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
