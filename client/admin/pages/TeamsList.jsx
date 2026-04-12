import { useState, useEffect } from 'react';
import api from '../../src/services/api';
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
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight leading-none mb-2">Team Governance</h1>
          <p className="text-slate-500 font-medium text-sm">{total.toLocaleString()} institutional teams cataloged</p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center gap-4 bg-slate-900 border border-white/[0.05] p-3 rounded-xl shadow-lg">
           <div className="relative w-full sm:max-w-xs group">
             <HiOutlineSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-400 w-5 h-5 transition-colors" />
             <input 
               type="text" 
               placeholder="Search registry (Team, Leader)..." 
               value={search} 
               onChange={(e) => { setSearch(e.target.value); setPage(1); }} 
               className="input-field pl-12" 
             />
           </div>
           <div className="h-8 w-px bg-slate-800 hidden sm:block"></div>
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
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
        {/* Teams List */}
        <div className="xl:col-span-8 space-y-6">
          {loading ? (
             <div className="flex flex-col items-center justify-center py-24 gap-4">
               <HiOutlineRefresh className="w-10 h-10 text-primary-500 animate-spin" />
               <p className="text-[10px] font-bold text-slate-600 uppercase tracking-[0.2em] animate-pulse">Loading Teams...</p>
             </div>
          ) : (
            <div className="card !p-0 overflow-hidden border-slate-700/30">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-white/[0.01]">
                      <th className="px-6 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-white/[0.05]">Team Entity</th>
                      <th className="px-6 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-white/[0.05] hidden sm:table-cell">Event Attribution</th>
                      <th className="px-6 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-white/[0.05]">Lead Personnel</th>
                      <th className="px-6 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-white/[0.05]">Deployment</th>
                      <th className="px-6 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-white/[0.05] text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.02]">
                    {teams.map((t) => (
                      <tr 
                        key={t._id} 
                        className={`group hover:bg-white/[0.02] transition-all cursor-pointer ${selectedTeam?._id === t._id ? 'bg-indigo-600/5 border-l-2 border-l-indigo-500' : ''}`} 
                        onClick={() => viewTeamDetail(t._id)}
                      >
                        <td className="px-6 py-6 border-b border-white/[0.02]">
                          <p className="text-sm font-bold text-white tracking-tight group-hover:text-indigo-400 transition-colors leading-none uppercase">{t.teamName}</p>
                          <span className={`inline-flex mt-2 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest border ${(STATUS_CONFIG[t.status] || STATUS_CONFIG.withdrawn).bg} ${(STATUS_CONFIG[t.status] || STATUS_CONFIG.withdrawn).color}`}>
                             {t.status}
                          </span>
                        </td>
                        <td className="px-6 py-6 border-b border-white/[0.02] hidden sm:table-cell">
                          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest truncate max-w-[120px]">{t.eventId?.title || 'General Entry'}</p>
                        </td>
                        <td className="px-6 py-6 border-b border-white/[0.02]">
                          <p className="text-xs font-bold text-slate-300 tracking-tight leading-none">{t.leaderId?.name || 'Institutional Host'}</p>
                        </td>
                        <td className="px-6 py-6 border-b border-white/[0.02]">
                          <div className="flex items-center gap-3">
                             <div className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500 group-hover:border-indigo-500 group-hover:text-indigo-400 transition-all shadow-lg">
                               <HiOutlineUserGroup className="w-4 h-4" />
                             </div>
                             <span className="text-xs font-bold text-white tabular-nums">{t.memberCount || 0}</span>
                          </div>
                        </td>
                        <td className="px-6 py-6 border-b border-white/[0.02] text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-2">
                            {t.status === 'active' && (
                              <button onClick={() => handleCancelTeam(t._id, t.teamName)} className="w-9 h-9 flex items-center justify-center rounded-lg bg-slate-900 border border-slate-800 text-slate-500 hover:text-red-400 hover:border-red-500/30 transition-all shadow-lg active:scale-95" title="Revoke Registration">
                                <HiOutlineBan className="w-4.5 h-4.5" />
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
          )}
        </div>

        {/* Team Details Panel */}
        <div className="xl:col-span-4 lg:sticky lg:top-8">
          {teamLoading ? (
             <div className="card h-64 flex flex-col items-center justify-center gap-4 border-slate-700/30 bg-slate-900/40 backdrop-blur-xl">
               <HiOutlineRefresh className="w-10 h-10 text-primary-500 animate-spin" />
               <p className="text-[9px] font-bold text-slate-600 uppercase tracking-wider animate-pulse">Loading Details...</p>
             </div>
          ) : selectedTeam ? (
            <div className="card space-y-8 animate-scale-in relative border-white/[0.05] bg-slate-900 overflow-hidden shadow-2xl">
              <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 blur-[100px] pointer-events-none"></div>
              
              <div className="relative z-10">
                <div className="flex items-center gap-5 mb-10">
                  <div className="w-16 h-16 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-xl shadow-indigo-900/30">
                    <HiOutlineUserGroup className="w-10 h-10" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-white uppercase tracking-tight leading-none mb-2">{selectedTeam.teamName}</h3>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em] flex items-center gap-2">
                       <span className="w-1 h-3 bg-indigo-500 rounded-full"></span>
                       UID: {selectedTeam._id.slice(-12).toUpperCase()}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">Status</p>
                    <span className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-widest border ${(STATUS_CONFIG[selectedTeam.status] || STATUS_CONFIG.withdrawn).bg} ${(STATUS_CONFIG[selectedTeam.status] || STATUS_CONFIG.withdrawn).color}`}>
                       {selectedTeam.status}
                    </span>
                  </div>
                  <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                     <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">Auditing</p>
                     {selectedTeam.registration ? (
                       <span className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-widest border border-emerald-500/20 bg-emerald-500/10 text-emerald-400`}>Verified</span>
                     ) : <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest opacity-40">Unverified</span>}
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                  <div className="flex items-center justify-between px-1">
                    <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2">
                       Personnel Hierarchy ({selectedTeam.members?.length || 0})
                    </h4>
                  </div>
                  <div className="space-y-2">
                    {(selectedTeam.members || []).map((m) => (
                      <div key={m._id} className="group flex items-center justify-between p-4 bg-white/[0.01] border border-white/[0.05] rounded-xl hover:bg-white/[0.03] hover:border-indigo-500/30 transition-all duration-300">
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all duration-500 ${m.userId?._id?.toString() === selectedTeam.leaderId?._id?.toString() ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-900 border border-slate-800 text-slate-600'}`}>
                             {m.userId?._id?.toString() === selectedTeam.leaderId?._id?.toString() ? <HiOutlineShieldCheck className="w-5 h-5" /> : <HiOutlineUserCircle className="w-6 h-6" />}
                          </div>
                          <div>
                             <p className="text-sm font-bold text-white tracking-tight group-hover:text-indigo-400 transition-colors leading-none mb-1.5 uppercase">{m.userId?.name || 'Hidden User'}</p>
                             <p className="text-[10px] text-slate-500/60 font-medium uppercase tracking-widest">{m.userId?._id?.toString() === selectedTeam.leaderId?._id?.toString() ? 'Lead Admin' : 'Affiliate'}</p>
                          </div>
                        </div>
                        {m.userId?._id?.toString() !== selectedTeam.leaderId?._id?.toString() && selectedTeam.status === 'active' && (
                          <button 
                            onClick={() => handleRemoveMember(selectedTeam._id, m.userId?._id, m.userId?.name)} 
                            className="w-8 h-8 flex items-center justify-center rounded-md text-slate-700 hover:text-red-500 hover:bg-red-500/10 transition-all opacity-0 group-hover:opacity-100"
                          >
                            <HiOutlineBan className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
              </div>

               <div className="p-5 rounded-xl border border-indigo-500/20 bg-indigo-500/[0.02] mt-8 group cursor-default">
                  <div className="flex items-center gap-3 mb-2">
                     <HiOutlineInformationCircle className="w-4 h-4 text-indigo-500" />
                     <p className="text-[10px] font-bold text-indigo-500/80 uppercase tracking-widest leading-none">Registered Deployment</p>
                  </div>
                  <p className="text-sm font-bold text-white tracking-tight uppercase group-hover:text-indigo-400 transition-colors leading-relaxed">{selectedTeam.eventId?.title}</p>
               </div>
            </div>
          ) : (
            <div className="card h-80 flex flex-col items-center justify-center text-center p-12 border-dashed border-slate-800 bg-transparent group overflow-hidden">
              <div className="relative mb-6">
                <div className="absolute inset-0 bg-indigo-500 blur-2xl opacity-0 group-hover:opacity-10 transition-opacity duration-700"></div>
                <div className="bg-slate-900 shadow-2xl p-6 rounded-[2rem] border border-white/[0.05] group-hover:scale-105 transition-transform duration-700 relative z-10">
                  <HiOutlineUserGroup className="w-10 h-10 text-slate-700 group-hover:text-indigo-500 transition-colors" />
                </div>
              </div>
              <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-widest leading-none mb-3">Governance Summary</h4>
              <p className="text-[10px] font-bold text-slate-600 leading-relaxed max-w-[200px] uppercase tracking-tight">Select a team entity from the registry to view personnel hierarchy and manage deployment status</p>
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
