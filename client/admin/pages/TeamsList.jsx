import { useState, useEffect } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { HiOutlineSearch, HiOutlineUserGroup, HiOutlineBan } from 'react-icons/hi';
import ConfirmWithPassword from '../components/ConfirmWithPassword';

const STATUS_COLORS = { active: 'badge-green', disqualified: 'badge-red', withdrawn: 'badge-yellow' };

export default function TeamsList() {
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
    } catch { toast.error('Failed to load teams'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchTeams(); }, [page, eventFilter, search]);

  const viewTeamDetail = async (teamId) => {
    setTeamLoading(true);
    try {
      const { data } = await api.get(`/teams/${teamId}`);
      setSelectedTeam(data.data);
    } catch { toast.error('Failed to load team detail'); }
    finally { setTeamLoading(false); }
  };

  const handleCancelTeam = (teamId, teamName) => {
    setConfirmModal({
      open: true, title: 'Cancel Team Registration', confirmLabel: 'Cancel Team', variant: 'danger',
      message: `This will cancel team "${teamName}" registration and all linked tickets.`,
      action: async (pw) => {
        await api.patch(`/teams/${teamId}/cancel`, { adminPassword: pw });
        toast.success('Team registration cancelled');
        fetchTeams();
        if (selectedTeam?._id === teamId) setSelectedTeam(null);
      },
    });
  };

  const handleRemoveMember = (teamId, userId, memberName) => {
    setConfirmModal({
      open: true, title: 'Remove Member', confirmLabel: 'Remove', variant: 'warning',
      message: `Remove "${memberName}" from the team?`,
      action: async (pw) => {
        await api.delete(`/teams/${teamId}/members/${userId}`, { data: { adminPassword: pw } });
        toast.success('Member removed');
        viewTeamDetail(teamId);
      },
    });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg sm:text-2xl font-bold text-gray-900">Teams</h1>
          <p className="text-sm text-gray-500 mt-1">{total} total teams</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-6 flex-wrap">
        <div className="relative w-full sm:max-w-xs">
          <HiOutlineSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input type="text" placeholder="Search team name..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="input-field pl-10" />
        </div>
        <select value={eventFilter} onChange={(e) => { setEventFilter(e.target.value); setPage(1); }} className="input-field w-full sm:w-auto sm:min-w-[180px]">
          <option value="">All Events</option>
          {events.map((ev) => <option key={ev._id} value={ev._id}>{ev.title}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Teams List */}
        <div className="lg:col-span-2">
          {loading ? (
            <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600"></div></div>
          ) : (
            <div className="card overflow-hidden p-0 overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="table-header">
                  <th className="px-4 py-3">Team</th>
                  <th className="px-4 py-3 hidden sm:table-cell">Event</th>
                  <th className="px-4 py-3">Leader</th>
                  <th className="px-4 py-3">Members</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Actions</th>
                </tr></thead>
                <tbody>
                  {teams.map((t) => (
                    <tr key={t._id} className={`border-t border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer ${selectedTeam?._id === t._id ? 'bg-primary-50' : ''}`} onClick={() => viewTeamDetail(t._id)}>
                      <td className="px-4 py-3 font-medium">{t.teamName}</td>
                      <td className="px-4 py-3 hidden sm:table-cell text-sm">{t.eventId?.title || 'N/A'}</td>
                      <td className="px-4 py-3 text-sm">{t.leaderId?.name || 'N/A'}</td>
                      <td className="px-4 py-3"><span className="flex items-center gap-1"><HiOutlineUserGroup className="w-4 h-4 text-gray-400" />{t.memberCount || 0}</span></td>
                      <td className="px-4 py-3"><span className={`badge ${STATUS_COLORS[t.status] || 'badge-yellow'}`}>{t.status}</span></td>
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        {t.status === 'active' && (
                          <button onClick={() => handleCancelTeam(t._id, t.teamName)} className="text-red-600 hover:text-red-800 text-xs font-medium flex items-center gap-0.5"><HiOutlineBan className="w-3.5 h-3.5" /> Cancel</button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {teams.length === 0 && <tr><td colSpan="6" className="text-center py-8 text-gray-400">No teams found</td></tr>}
                </tbody>
              </table>
              {pages > 1 && (
                <div className="flex flex-wrap items-center justify-center gap-2 py-4 border-t border-gray-100">
                  {Array.from({ length: Math.min(pages, 10) }, (_, i) => (
                    <button key={i} onClick={() => setPage(i + 1)} className={`w-8 h-8 rounded-lg text-sm font-medium ${page === i + 1 ? 'bg-primary-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>{i + 1}</button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Team Detail Panel */}
        <div>
          {teamLoading && <div className="card"><div className="flex items-center justify-center h-32"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div></div></div>}
          {selectedTeam && !teamLoading && (
            <div className="card sticky top-4">
              <h3 className="font-semibold text-gray-900 mb-4">{selectedTeam.teamName}</h3>
              <dl className="space-y-2 text-sm mb-4">
                <div className="flex justify-between"><dt className="text-gray-500">Event</dt><dd>{selectedTeam.eventId?.title}</dd></div>
                <div className="flex justify-between"><dt className="text-gray-500">Leader</dt><dd>{selectedTeam.leaderId?.name}</dd></div>
                <div className="flex justify-between"><dt className="text-gray-500">Status</dt><dd><span className={`badge ${STATUS_COLORS[selectedTeam.status]}`}>{selectedTeam.status}</span></dd></div>
                {selectedTeam.registration && (
                  <div className="flex justify-between"><dt className="text-gray-500">Registration</dt><dd><span className={`badge ${selectedTeam.registration.status === 'confirmed' ? 'badge-green' : 'badge-yellow'}`}>{selectedTeam.registration.status}</span></dd></div>
                )}
              </dl>

              <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">Members ({selectedTeam.members?.length || 0})</h4>
              <div className="space-y-2">
                {(selectedTeam.members || []).map((m) => (
                  <div key={m._id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                    <div>
                      <span className="text-sm font-medium">{m.userId?.name || 'N/A'}</span>
                      {m.userId?._id?.toString() === selectedTeam.leaderId?._id?.toString() && (
                        <span className="ml-1.5 text-[10px] text-primary-600 font-bold">LEADER</span>
                      )}
                      <div className="text-xs text-gray-500">{m.userId?.email}</div>
                    </div>
                    {m.userId?._id?.toString() !== selectedTeam.leaderId?._id?.toString() && selectedTeam.status === 'active' && (
                      <button onClick={() => handleRemoveMember(selectedTeam._id, m.userId?._id, m.userId?.name)} className="text-red-500 hover:text-red-700 text-xs">Remove</button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
          {!selectedTeam && !teamLoading && (
            <div className="card text-center py-12 text-gray-400 text-sm">Click a team to view details</div>
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
