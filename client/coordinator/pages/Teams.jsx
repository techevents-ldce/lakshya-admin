import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';
import {
  HiOutlineSearch, HiOutlineArrowLeft, HiOutlineChevronDown,
  HiOutlineChevronUp, HiOutlineStar, HiOutlineFilter,
  HiOutlineCheck, HiOutlineX, HiOutlineExclamation, HiOutlineUserGroup,
  HiOutlineRefresh, HiOutlineInformationCircle
} from 'react-icons/hi';

const ATTENDANCE_BADGE = {
  present:    { label: 'Present',   color: 'bg-[#22C55E]/10 text-[#22C55E] border border-[#22C55E]/30', dot: 'bg-[#22C55E]', icon: HiOutlineCheck },
  absent:     { label: 'Absent',    color: 'bg-[#94A3B8]/10 text-[#94A3B8] border border-[#94A3B8]/30',       dot: 'bg-[#94A3B8]',    icon: HiOutlineX },
  cancelled:  { label: 'Cancelled', color: 'bg-[#EF4444]/10 text-[#EF4444] border border-[#EF4444]/30',         dot: 'bg-[#EF4444]',     icon: HiOutlineX },
  'no-ticket':{ label: 'No Ticket', color: 'bg-[#F59E0B]/10 text-[#F59E0B] border border-[#F59E0B]/30',     dot: 'bg-[#F59E0B]',   icon: HiOutlineExclamation },
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
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const debounceTimer = useRef(null);

  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearch(val);
    clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => setDebouncedSearch(val), 350);
  };

  useEffect(() => {
    api.get(`/events/${eventId}`).then(({ data }) => setEventTitle(data.data.title)).catch(() => {});
  }, [eventId]);

  useEffect(() => {
    const fetchTeams = async () => {
      setLoading(true);
      try {
        const { data } = await api.get(`/attendance/${eventId}/teams`, { params: { search: debouncedSearch } });
        setTeams(data.teams || []);
        setSummary(data.summary || {});
      } catch { toast.error('Failed to load teams'); }
      finally { setLoading(false); }
    };
    fetchTeams();
  }, [eventId, debouncedSearch]);

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
    <div className="animate-fade-in space-y-8 bg-[#0F1117] min-h-[700px]">
      <Link to="/dashboard" className="inline-flex items-center gap-1.5 text-[10px] font-bold tracking-widest uppercase text-[#94A3B8] hover:text-[#F1F5F9] transition-colors mb-2 rounded p-1 focus:outline-none focus:ring-2 focus:ring-[#6366F1]">
        <HiOutlineArrowLeft className="w-4 h-4" /> Back to Dashboard
      </Link>

      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold text-[#F1F5F9] tracking-tight uppercase leading-none mb-2">Teams & Attendance</h1>
          <p className="text-sm font-medium text-[#94A3B8]">{eventTitle}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-2">
        <div className="bg-[#1A1D27] border border-[#2E3348] p-5 rounded-2xl shadow-lg hover:border-[#6366F1]/30 transition-all">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 rounded-lg bg-[#3B82F6]/10 border border-[#3B82F6]/30 flex items-center justify-center">
              <HiOutlineUserGroup className="w-4 h-4 text-[#3B82F6]" />
            </div>
            <p className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-widest">Total</p>
          </div>
          <p className="text-2xl font-bold text-[#F1F5F9] pl-1">{summary.totalTeams} <span className="text-xs font-normal text-[#64748B]">Teams</span></p>
        </div>
        <div className="bg-[#1A1D27] border border-[#2E3348] p-5 rounded-2xl shadow-lg hover:border-[#22C55E]/30 transition-all">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 rounded-lg bg-[#22C55E]/10 border border-[#22C55E]/30 flex items-center justify-center">
              <HiOutlineCheck className="w-4 h-4 text-[#22C55E]" />
            </div>
             <p className="text-[10px] font-bold text-[#22C55E] uppercase tracking-widest">Present</p>
          </div>
          <p className="text-2xl font-bold text-[#22C55E] pl-1">{summary.presentMembers} <span className="text-xs font-normal text-[#22C55E]/50">Checked In</span></p>
        </div>
        <div className="bg-[#1A1D27] border border-[#2E3348] p-5 rounded-2xl shadow-lg hover:border-[#F59E0B]/30 transition-all">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 rounded-lg bg-[#F59E0B]/10 border border-[#F59E0B]/30 flex items-center justify-center">
              <span className="text-[#F59E0B] font-bold text-sm">…</span>
            </div>
            <p className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-widest">Remaining</p>
          </div>
          <p className="text-2xl font-bold text-[#F1F5F9] pl-1">{summary.totalMembers - summary.presentMembers} <span className="text-xs font-normal text-[#64748B]">Not Yet</span></p>
        </div>
        <div className="bg-[#1A1D27] border border-[#2E3348] p-5 rounded-2xl shadow-lg hover:border-[#A855F7]/30 transition-all">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 rounded-lg bg-[#A855F7]/10 border border-[#A855F7]/30 flex items-center justify-center">
              <HiOutlineStar className="w-4 h-4 text-[#A855F7]" />
            </div>
            <p className="text-[10px] font-bold text-[#A855F7] uppercase tracking-widest">Complete</p>
          </div>
          <p className="text-2xl font-bold text-[#A855F7] pl-1">{summary.teamsWithFullAttendance} <span className="text-xs font-normal text-[#A855F7]/50">Full Teams</span></p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative group flex-1">
          <HiOutlineSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-[#64748B] group-focus-within:text-[#3B82F6] w-5 h-5 transition-colors" />
          <input type="text" placeholder="Search by team name, leader, or member..." value={search} onChange={handleSearchChange} className="w-full rounded-xl pl-12 pr-4 py-3 bg-[#1E2130] border border-[#2E3348] text-[#F1F5F9] placeholder-[#64748B] focus:ring-2 focus:ring-[#3B82F6] focus:border-[#3B82F6] outline-none transition-all shadow-sm" />
        </div>
        <div className="flex gap-4">
          <div className="relative w-40">
            <HiOutlineFilter className="absolute left-3 top-1/2 -translate-y-1/2 text-[#64748B] w-4 h-4 pointer-events-none" />
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-full rounded-xl pl-9 pr-8 py-3 bg-[#1E2130] border border-[#2E3348] text-[#F1F5F9] appearance-none cursor-pointer focus:ring-2 focus:ring-[#3B82F6] outline-none transition-all shadow-sm text-xs font-bold uppercase tracking-wider">
              {statusOptions.map((s) => (
                <option key={s} value={s}>{s === 'all' ? 'ALL STATUS' : s.toUpperCase()}</option>
              ))}
            </select>
            <HiOutlineChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-[#64748B] w-4 h-4 pointer-events-none" />
          </div>
          <div className="relative w-48">
            <select value={attendanceFilter} onChange={(e) => setAttendanceFilter(e.target.value)} className="w-full rounded-xl px-4 pr-8 py-3 bg-[#1E2130] border border-[#2E3348] text-[#F1F5F9] appearance-none cursor-pointer focus:ring-2 focus:ring-[#3B82F6] outline-none transition-all shadow-sm text-xs font-bold uppercase tracking-wider">
              {attendanceOptions.map((o) => (
                <option key={o.value} value={o.value}>{o.label.toUpperCase()}</option>
              ))}
            </select>
            <HiOutlineChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-[#64748B] w-4 h-4 pointer-events-none" />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-32 gap-6 bg-[#1A1D27] rounded-3xl border border-[#2E3348]">
          <HiOutlineRefresh className="w-12 h-12 text-[#6366F1] animate-spin" />
          <p className="text-[11px] font-bold text-[#64748B] uppercase tracking-[0.4em] animate-pulse">Loading Teams...</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.length === 0 && (
            <div className="bg-[#1A1D27] rounded-3xl text-center py-24 border border-[#2E3348] shadow-sm flex flex-col items-center justify-center">
               <div className="w-24 h-24 bg-[#22263A] rounded-full flex items-center justify-center mx-auto mb-6 border border-[#2E3348]">
                 <HiOutlineInformationCircle className="w-12 h-12 text-[#64748B]" />
               </div>
              <p className="text-[#F1F5F9] text-xl font-bold mb-2">No teams match your filters</p>
              <p className="text-[#94A3B8] text-sm max-w-sm mx-auto">Try adjusting your search or filter settings to find what you're looking for.</p>
            </div>
          )}
          {filtered.map((team) => {
            const isExpanded = expandedTeam === team._id;
            const pct = team.memberCount > 0 ? Math.round((team.presentCount / team.memberCount) * 100) : 0;
            return (
              <div key={team._id} className="bg-[#1A1D27] p-0 rounded-2xl overflow-hidden border border-[#2E3348] shadow-lg transition-all">
                <button
                  onClick={() => setExpandedTeam(isExpanded ? null : team._id)}
                  className="w-full flex items-center justify-between px-6 py-5 hover:bg-[#22263A]/50 transition-colors text-left focus:outline-none focus:bg-[#22263A]"
                >
                  <div className="flex items-center gap-5 flex-1 min-w-0">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg flex-shrink-0 shadow-md ${team.allPresent ? 'bg-[#22C55E]/10 text-[#22C55E] border border-[#22C55E]/30' : 'bg-[#6366F1]/10 text-[#6366F1] border border-[#6366F1]/30'}`}>
                      {team.teamName?.[0]?.toUpperCase() || 'T'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-lg text-[#F1F5F9] mb-1 tracking-tight truncate">{team.teamName}</h3>
                      <div className="flex items-center gap-3 text-[10px] font-bold text-[#94A3B8] uppercase tracking-widest mt-0.5">
                        <span className="inline-flex items-center gap-1 bg-[#F59E0B]/10 text-[#F59E0B] px-2.5 py-0.5 rounded border border-[#F59E0B]/30">
                          <HiOutlineStar className="w-3 h-3" />
                          {team.leaderId?.name || 'Unknown'}
                        </span>
                        <span className="text-[#64748B]">•</span>
                        <span>{team.memberCount} member{team.memberCount !== 1 ? 's' : ''}</span>
                      </div>
                      
                      <div className="flex items-center gap-3 mt-3 w-full max-w-sm">
                        <div className="flex-1 bg-[#2E3348] rounded-full h-1.5 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${team.allPresent ? 'bg-[#22C55E]' : pct > 0 ? 'bg-[#6366F1]' : 'bg-[#64748B]'}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className={`text-[10px] font-bold uppercase tracking-wider ${team.allPresent ? 'text-[#22C55E]' : 'text-[#94A3B8]'}`}>
                          {team.presentCount} / {team.memberCount} Present
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-3 flex-shrink-0 ml-4">
                    <span className={`px-2.5 py-1 rounded text-[9px] font-bold uppercase tracking-wider border ${team.status === 'active' ? 'bg-[#22C55E]/10 text-[#22C55E] border-[#22C55E]/30' : team.status === 'disqualified' ? 'bg-[#EF4444]/10 text-[#EF4444] border-[#EF4444]/30' : 'bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B]/30'}`}>
                      {team.status}
                    </span>
                    {isExpanded ? <HiOutlineChevronUp className="w-5 h-5 text-[#94A3B8]" /> : <HiOutlineChevronDown className="w-5 h-5 text-[#94A3B8]" />}
                  </div>
                </button>

                {isExpanded && (
                  <div className="border-t border-[#2E3348] bg-[#22263A]/50 px-6 py-6 shadow-inner">
                    <div className="text-[10px] font-bold text-[#64748B] uppercase tracking-widest mb-4">Team Roster & Attendance Status</div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {(team.members || []).map((tm) => {
                        const isHackathonOnly = tm.hackathonMember && !tm.userId;
                        const memberName = isHackathonOnly ? tm.displayName : tm.userId?.name;
                        const memberEmail = isHackathonOnly ? tm.displayEmail : tm.userId?.email;
                        const memberPhone = isHackathonOnly ? tm.displayPhone : tm.userId?.phone;
                        const memberCollege = isHackathonOnly ? tm.displayCollege : tm.userId?.college;

                        const tmIsLeader = !isHackathonOnly && team.leaderId &&
                          ((team.leaderId._id || team.leaderId).toString() === (tm.userId?._id || tm.userId).toString());
                        const badge = ATTENDANCE_BADGE[tm.attendanceStatus] || ATTENDANCE_BADGE['no-ticket'];
                        const BadgeIcon = badge.icon;
                        return (
                          <div key={tm._id} className="bg-[#1A1D27] rounded-xl border border-[#2E3348] p-4 flex items-start gap-4 hover:border-[#6366F1]/50 transition-all relative overflow-hidden group shadow-sm">
                            {tmIsLeader && <div className="absolute top-0 left-0 w-1 h-full bg-[#F59E0B]" />}
                            {isHackathonOnly && <div className="absolute top-0 left-0 w-1 h-full bg-[#94A3B8]/40" />}
                            <div className="relative flex-shrink-0 mt-1">
                              <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-[#F1F5F9] text-sm font-bold shadow-md ${tmIsLeader ? 'bg-[#F59E0B]' : isHackathonOnly ? 'bg-[#334155]' : 'bg-[#2E3348]'}`}>
                                {memberName?.[0]?.toUpperCase() || '?'}
                              </div>
                              <span className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-[2.5px] border-[#1A1D27] ${badge.dot}`} />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 mb-1 flex-wrap">
                                <span className="font-bold text-sm text-[#F1F5F9] uppercase tracking-tight truncate">{memberName}</span>
                                {tmIsLeader && (
                                  <span className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-[#F59E0B]/10 text-[#F59E0B] border border-[#F59E0B]/30 uppercase tracking-widest flex items-center gap-1">
                                    <HiOutlineStar className="w-2.5 h-2.5" /> LEADER
                                  </span>
                                )}
                                {isHackathonOnly && (
                                  <span className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-[#94A3B8]/10 text-[#94A3B8] border border-[#94A3B8]/30 uppercase tracking-widest">
                                    IMPORTED
                                  </span>
                                )}
                              </div>
                              <p className="text-[10px] font-medium text-[#94A3B8] lowercase tracking-tight truncate mb-2">{memberEmail}</p>
                              <div className="flex items-center gap-3">
                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-[9px] font-bold uppercase tracking-wider ${badge.color}`}>
                                  <BadgeIcon className="w-3.5 h-3.5" /> {badge.label}
                                </span>
                                {tm.ticket?.scannedAt && (
                                  <span className="text-[9px] font-bold text-[#64748B] tracking-tight">
                                    {new Date(tm.ticket.scannedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute:'2-digit' })}
                                  </span>
                                )}
                              </div>
                              <div className="flex flex-col gap-1 mt-3">
                                {memberPhone && <span className="text-[9px] text-[#64748B] font-bold tracking-wider">☎ {memberPhone}</span>}
                                {memberCollege && <span className="text-[9px] text-[#64748B] font-bold uppercase tracking-tight truncate max-w-[180px]">{memberCollege}</span>}
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
