import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';
import {
  HiOutlineSearch, HiOutlineArrowLeft, HiOutlineChevronDown,
  HiOutlineChevronUp, HiOutlineStar, HiOutlineFilter,
} from 'react-icons/hi';

export default function Teams() {
  const { id: eventId } = useParams();
  const [teams, setTeams] = useState([]);
  const [eventTitle, setEventTitle] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [expandedTeam, setExpandedTeam] = useState(null);

  useEffect(() => {
    api.get(`/events/${eventId}`).then(({ data }) => {
      setEventTitle(data.data.title);
    }).catch(() => {});
  }, [eventId]);

  useEffect(() => {
    const fetchTeams = async () => {
      setLoading(true);
      try {
        // Fetch registrations to get team data (the API already returns team + teamMembers)
        const { data } = await api.get('/registrations', { params: { eventId, limit: 500 } });
        // Group by team
        const teamMap = {};
        for (const reg of data.registrations) {
          if (reg.teamId) {
            const tid = reg.teamId._id;
            if (!teamMap[tid]) {
              teamMap[tid] = {
                ...reg.teamId,
                members: reg.teamMembers || [],
                registrations: [],
              };
            }
            teamMap[tid].registrations.push(reg);
          }
        }
        setTeams(Object.values(teamMap));
      } catch { toast.error('Failed to load teams'); }
      finally { setLoading(false); }
    };
    fetchTeams();
  }, [eventId]);

  const filtered = teams.filter((t) => {
    const matchesSearch = !search ||
      t.teamName?.toLowerCase().includes(search.toLowerCase()) ||
      t.leaderId?.name?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || t.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const statusOptions = ['all', 'active', 'disqualified', 'withdrawn'];

  return (
    <div>
      <Link to={`/events/${eventId}/participants`} className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-accent-600 mb-4">
        <HiOutlineArrowLeft className="w-4 h-4" /> Back to Participants
      </Link>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold">Teams</h1>
          <p className="text-sm text-gray-500 mt-1">{eventTitle} · {filtered.length} team{filtered.length !== 1 ? 's' : ''}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1 sm:max-w-md">
          <HiOutlineSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input type="text" placeholder="Search by team name or leader..." value={search} onChange={(e) => setSearch(e.target.value)} className="input-field pl-10" />
        </div>
        <div className="relative">
          <HiOutlineFilter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="input-field pl-9 pr-8 appearance-none cursor-pointer">
            {statusOptions.map((s) => (
              <option key={s} value={s}>{s === 'all' ? 'All Statuses' : s.charAt(0).toUpperCase() + s.slice(1)}</option>
            ))}
          </select>
        </div>
      </div>

      {loading ? <div className="text-center py-12 text-gray-400">Loading...</div> : (
        <div className="space-y-4">
          {filtered.length === 0 && (
            <div className="card text-center py-12">
              <p className="text-gray-400 text-lg">No teams found</p>
            </div>
          )}
          {filtered.map((team) => {
            const isExpanded = expandedTeam === team._id;
            return (
              <div key={team._id} className="card p-0 overflow-hidden">
                {/* Team Header */}
                <button
                  onClick={() => setExpandedTeam(isExpanded ? null : team._id)}
                  className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors text-left"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-accent-100 text-accent-700 flex items-center justify-center font-bold text-sm">
                      {team.teamName?.[0]?.toUpperCase() || 'T'}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{team.teamName}</h3>
                      <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                        <span className="inline-flex items-center gap-1">
                          <HiOutlineStar className="w-3 h-3 text-amber-500" />
                          {team.leaderId?.name || 'Unknown'}
                        </span>
                        <span>·</span>
                        <span>{team.members?.length || 0} member{(team.members?.length || 0) !== 1 ? 's' : ''}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`badge ${team.status === 'active' ? 'badge-green' : team.status === 'disqualified' ? 'badge-red' : 'badge-yellow'}`}>
                      {team.status}
                    </span>
                    {isExpanded ? <HiOutlineChevronUp className="w-5 h-5 text-gray-400" /> : <HiOutlineChevronDown className="w-5 h-5 text-gray-400" />}
                  </div>
                </button>

                {/* Expanded Members */}
                {isExpanded && (
                  <div className="border-t border-gray-100 bg-gray-50/50 px-5 py-4">
                    <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Team Members</div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {(team.members || []).map((tm) => {
                        const tmIsLeader = team.leaderId &&
                          ((team.leaderId._id || team.leaderId).toString() === (tm.userId?._id || tm.userId).toString());
                        return (
                          <div key={tm._id} className="bg-white rounded-lg border border-gray-100 p-3 flex items-start gap-3 shadow-sm">
                            <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 ${tmIsLeader ? 'bg-amber-500' : 'bg-accent-500'}`}>
                              {tm.userId?.name?.[0] || '?'}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5">
                                <span className="font-medium text-sm text-gray-900 truncate">{tm.userId?.name}</span>
                                {tmIsLeader && (
                                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-700">
                                    <HiOutlineStar className="w-3 h-3" /> LEADER
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-gray-500 truncate">{tm.userId?.email}</p>
                              <div className="flex gap-3 mt-1 text-xs text-gray-400">
                                {tm.userId?.phone && <span>{tm.userId.phone}</span>}
                                {tm.userId?.college && <span>{tm.userId.college}</span>}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
