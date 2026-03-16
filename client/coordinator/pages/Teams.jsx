import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';
import {
  HiOutlineSearch, HiOutlineArrowLeft, HiOutlineChevronDown,
  HiOutlineChevronUp, HiOutlineStar, HiOutlineFilter,
  HiOutlineCheck, HiOutlineX, HiOutlineExclamation, HiOutlineUserGroup,
} from 'react-icons/hi';

const ATTENDANCE_BADGE = {
  present:    { label: 'Present',   color: 'bg-emerald-100 text-emerald-800', dot: 'bg-emerald-500', icon: HiOutlineCheck },
  absent:     { label: 'Absent',    color: 'bg-gray-100 text-gray-600',       dot: 'bg-gray-400',    icon: HiOutlineX },
  cancelled:  { label: 'Cancelled', color: 'bg-red-100 text-red-700',         dot: 'bg-red-500',     icon: HiOutlineX },
  'no-ticket':{ label: 'No Ticket', color: 'bg-amber-100 text-amber-800',     dot: 'bg-amber-500',   icon: HiOutlineExclamation },
};

export default function Teams() {
  const { id: eventId } = useParams();
  const [teams, setTeams] = useState([]);
  const [summary, setSummary] = useState({ totalTeams: 0, teamsWithFullAttendance: 0, totalMembers: 0, presentMembers: 0 });
  const [eventTitle, setEventTitle] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [attendanceFilter, setAttendanceFilter] = useState('all'); // all | some | none | full
  const [loading, setLoading] = useState(true);
  const [expandedTeam, setExpandedTeam] = useState(null);

  useEffect(() => {
    api.get(`/events/${eventId}`).then(({ data }) => setEventTitle(data.data.title)).catch(() => {});
  }, [eventId]);

  useEffect(() => {
    const fetchTeams = async () => {
      setLoading(true);
      try {
        const { data } = await api.get(`/attendance/${eventId}/teams`, { params: { search } });
        setTeams(data.teams || []);
        setSummary(data.summary || {});
      } catch { toast.error('Failed to load teams'); }
      finally { setLoading(false); }
    };
    fetchTeams();
  }, [eventId, search]);

  // Client-side filters
  const filtered = teams.filter((t) => {
    const matchesStatus = statusFilter === 'all' || t.status === statusFilter;
    let matchesAttendance = true;
    if (attendanceFilter === 'full') matchesAttendance = t.allPresent;
    else if (attendanceFilter === 'some') matchesAttendance = t.presentCount > 0 && !t.allPresent;
    else if (attendanceFilter === 'none') matchesAttendance = t.presentCount === 0;
    return matchesStatus && matchesAttendance;
  });

  const statusOptions = ['all', 'active', 'disqualified', 'withdrawn'];
  const attendanceOptions = [
    { value: 'all', label: 'All Attendance' },
    { value: 'full', label: 'All Members Present' },
    { value: 'some', label: 'Partially Present' },
    { value: 'none', label: 'No Members Present' },
  ];

  return (
    <div>
      <Link to="/dashboard" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-accent-600 mb-4">
        <HiOutlineArrowLeft className="w-4 h-4" /> Back to Events
      </Link>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold">Teams & Attendance</h1>
          <p className="text-sm text-gray-500 mt-1">{eventTitle}</p>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div className="stat-card">
          <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
            <HiOutlineUserGroup className="w-5 h-5 text-blue-700" />
          </div>
          <div>
            <p className="text-xs text-gray-400">Total</p>
            <p className="font-semibold text-gray-900">{summary.totalTeams} Teams</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
            <span className="text-emerald-700 font-bold text-sm">{summary.presentMembers}</span>
          </div>
          <div>
            <p className="text-xs text-gray-400">Checked In</p>
            <p className="font-semibold text-emerald-700">Present</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
            <span className="text-gray-700 font-bold text-sm">{summary.totalMembers - summary.presentMembers}</span>
          </div>
          <div>
            <p className="text-xs text-gray-400">Not Yet</p>
            <p className="font-semibold text-gray-700">Remaining</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="w-10 h-10 rounded-lg bg-accent-100 flex items-center justify-center">
            <span className="text-accent-700 font-bold text-sm">{summary.teamsWithFullAttendance}</span>
          </div>
          <div>
            <p className="text-xs text-gray-400">Complete</p>
            <p className="font-semibold text-accent-700">Full Teams</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1 sm:max-w-md">
          <HiOutlineSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input type="text" placeholder="Search by team name, leader, or member..." value={search} onChange={(e) => setSearch(e.target.value)} className="input-field pl-10" />
        </div>
        <div className="relative">
          <HiOutlineFilter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="input-field pl-9 pr-8 appearance-none cursor-pointer">
            {statusOptions.map((s) => (
              <option key={s} value={s}>{s === 'all' ? 'All Statuses' : s.charAt(0).toUpperCase() + s.slice(1)}</option>
            ))}
          </select>
        </div>
        <div className="relative">
          <select value={attendanceFilter} onChange={(e) => setAttendanceFilter(e.target.value)} className="input-field pr-8 appearance-none cursor-pointer">
            {attendanceOptions.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
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
            const pct = team.memberCount > 0 ? Math.round((team.presentCount / team.memberCount) * 100) : 0;
            return (
              <div key={team._id} className="card p-0 overflow-hidden">
                {/* Team Header */}
                <button
                  onClick={() => setExpandedTeam(isExpanded ? null : team._id)}
                  className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors text-left"
                >
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm flex-shrink-0 ${team.allPresent ? 'bg-emerald-100 text-emerald-700' : 'bg-accent-100 text-accent-700'}`}>
                      {team.teamName?.[0]?.toUpperCase() || 'T'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900">{team.teamName}</h3>
                      <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                        <span className="inline-flex items-center gap-1">
                          <HiOutlineStar className="w-3 h-3 text-amber-500" />
                          {team.leaderId?.name || 'Unknown'}
                        </span>
                        <span>·</span>
                        <span>{team.memberCount} member{team.memberCount !== 1 ? 's' : ''}</span>
                      </div>
                      {/* Attendance progress bar */}
                      <div className="flex items-center gap-2 mt-2">
                        <div className="flex-1 bg-gray-200 rounded-full h-1.5 max-w-[120px]">
                          <div
                            className={`h-1.5 rounded-full transition-all ${team.allPresent ? 'bg-emerald-500' : pct > 0 ? 'bg-accent-500' : 'bg-gray-300'}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className={`text-xs font-medium ${team.allPresent ? 'text-emerald-600' : 'text-gray-500'}`}>
                          {team.presentCount}/{team.memberCount} present
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0 ml-3">
                    <span className={`badge ${team.status === 'active' ? 'badge-green' : team.status === 'disqualified' ? 'badge-red' : 'badge-yellow'}`}>
                      {team.status}
                    </span>
                    {isExpanded ? <HiOutlineChevronUp className="w-5 h-5 text-gray-400" /> : <HiOutlineChevronDown className="w-5 h-5 text-gray-400" />}
                  </div>
                </button>

                {/* Expanded Members with Attendance */}
                {isExpanded && (
                  <div className="border-t border-gray-100 bg-gray-50/50 px-5 py-4">
                    <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Team Members — Attendance</div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {(team.members || []).map((tm) => {
                        const tmIsLeader = team.leaderId &&
                          ((team.leaderId._id || team.leaderId).toString() === (tm.userId?._id || tm.userId).toString());
                        const badge = ATTENDANCE_BADGE[tm.attendanceStatus] || ATTENDANCE_BADGE['no-ticket'];
                        const BadgeIcon = badge.icon;
                        return (
                          <div key={tm._id} className="bg-white rounded-lg border border-gray-100 p-3 flex items-start gap-3 shadow-sm">
                            <div className="relative flex-shrink-0">
                              <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold ${tmIsLeader ? 'bg-amber-500' : 'bg-accent-500'}`}>
                                {tm.userId?.name?.[0] || '?'}
                              </div>
                              {/* Attendance dot */}
                              <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${badge.dot}`} />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-medium text-sm text-gray-900 truncate">{tm.userId?.name}</span>
                                {tmIsLeader && (
                                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-700">
                                    <HiOutlineStar className="w-3 h-3" /> LEADER
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-gray-500 truncate">{tm.userId?.email}</p>
                              <div className="flex items-center gap-2 mt-1.5">
                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${badge.color}`}>
                                  <BadgeIcon className="w-3 h-3" /> {badge.label}
                                </span>
                                {tm.ticket?.scannedAt && (
                                  <span className="text-[10px] text-gray-400">
                                    {new Date(tm.ticket.scannedAt).toLocaleString('en-IN', { timeStyle: 'short' })}
                                  </span>
                                )}
                              </div>
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
