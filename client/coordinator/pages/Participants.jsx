import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';
import {
  HiOutlineSearch, HiOutlineArrowLeft, HiOutlineDocumentDownload,
  HiOutlineChevronDown, HiOutlineChevronUp, HiOutlineUserGroup,
  HiOutlineStar, HiOutlineUsers, HiOutlineCheckCircle, HiOutlineRefresh
} from 'react-icons/hi';

export default function Participants() {
  const { id: eventId } = useParams();
  const [regs, setRegs] = useState([]);
  const [eventTitle, setEventTitle] = useState('');
  const [eventType, setEventType] = useState('solo');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [statsTotalCount, setStatsTotalCount] = useState(0);
  const [statsCheckedInCount, setStatsCheckedInCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [expandedRow, setExpandedRow] = useState(null);
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const debounceTimer = useRef(null);

  useEffect(() => {
    api.get(`/events/${eventId}`).then(({ data }) => {
      setEventTitle(data.data.title);
      setEventType(data.data.eventType || 'solo');
    }).catch(() => {});
  }, [eventId]);

  const fetchRegs = useCallback(async (currentPage, currentSearch) => {
    setLoading(true);
    try {
      const { data } = await api.get('/registrations', { 
        params: { eventId, page: currentPage, limit: 20, groupTeams: true, ...(currentSearch ? { search: currentSearch } : {}) } 
      });
      setRegs(data.registrations);
      setTotalPages(data.pages);
      if (data.stats) {
        setStatsTotalCount(data.stats.totalParticipants);
        setStatsCheckedInCount(data.stats.totalCheckedIn);
      }
    } catch { toast.error('Failed to load participants'); }
    finally { setLoading(false); }
  }, [eventId]);

  // Debounce the search input to avoid firing a request on every keystroke
  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearch(val);
    clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      setDebouncedSearch(val);
    }, 350);
  };

  // Single unified effect: reset page when search changes, then fetch
  useEffect(() => {
    setPage(1);
    fetchRegs(1, debouncedSearch);
  }, [debouncedSearch, eventId]);

  // Fetch when page changes (but not when search resets page, since above effect handles that)
  useEffect(() => {
    if (page !== 1) fetchRegs(page, debouncedSearch);
  }, [page]);

  const filtered = regs;
 
  // Flatten participants to just show individuals, not grouped teams
  const flattenedParticipants = [];
  filtered.forEach(r => {
    // Add leader/solo participant
    flattenedParticipants.push({
      ...r,
      rowKey: r._id + '_primary',
      displayUser: r.userId,
      isLeaderRole: isTeamEvent && !!r.teamId,
      teamRef: r.teamId
    });

    // Add remaining team members as individual rows
    if (isTeamEvent && r.teamMembers && r.teamMembers.length > 0) {
      r.teamMembers.forEach(tm => {
        // Ensure we don't duplicate the leader
        if (tm.userId?._id !== r.userId?._id) {
          flattenedParticipants.push({
            ...r, // Inherit registration info
            rowKey: tm._id,
            displayUser: tm.userId,
            status: tm.status === 'accepted' ? 'confirmed' : 'pending',
            checkedIn: tm.checkedIn, // Note: member attendance might rely on ticket scans
            checkedInAt: tm.checkedInAt,
            isLeaderRole: false,
            teamRef: r.teamId
          });
        }
      });
    }
  });

  const displayTotal = statsTotalCount || flattenedParticipants.length;
  const displayCheckedIn = statsCheckedInCount || flattenedParticipants.filter((p) => p.checkedIn).length;
  const pendingCount = displayTotal - displayCheckedIn;

  const handleExport = async (format) => {
    try {
      const { data } = await api.get('/export/participants', { params: { eventId, format }, responseType: 'blob' });
      const ext = format === 'excel' ? 'xlsx' : 'csv';
      const blob = new Blob([data]);
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `participants_${eventId}.${ext}`;
      link.click();
      toast.success('Exported successfully');
    } catch { toast.error('Export failed'); }
  };

  const isTeamEvent = eventType === 'team';

  const toggleExpand = (id) => {
    setExpandedRow(expandedRow === id ? null : id);
  };

  const isLeader = (reg) => {
    return reg.teamId && reg.teamId.leaderId &&
      (reg.teamId.leaderId._id || reg.teamId.leaderId) === (reg.userId?._id || reg.userId);
  };

  return (
    <div className="animate-fade-in space-y-8 bg-[#0F1117] min-h-[700px]">
      <Link to="/dashboard" className="inline-flex items-center gap-1.5 text-[10px] font-bold tracking-widest uppercase text-[#94A3B8] hover:text-[#F1F5F9] transition-colors rounded">
        <HiOutlineArrowLeft className="w-4 h-4" /> Back to Dashboard
      </Link>

      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold text-[#F1F5F9] tracking-tight uppercase leading-none">Participants</h1>
            <span className={`px-2.5 py-1 rounded-md text-[9px] font-bold uppercase tracking-wider border shrink-0 ${isTeamEvent ? 'bg-[#6366F1]/10 border-[#6366F1]/30 text-[#6366F1]' : 'bg-[#22C55E]/10 border-[#22C55E]/30 text-[#22C55E]'}`}>
              {isTeamEvent ? '👥 Team Event' : '👤 Solo Event'}
            </span>
          </div>
          <p className="text-sm font-medium text-[#94A3B8]">{eventTitle}</p>
        </div>
        <div className="flex gap-3 flex-wrap">
          {isTeamEvent && (
            <Link to={`/events/${eventId}/teams`} className="border-2 border-[#6366F1] text-[#6366F1] hover:bg-[#6366F1]/10 focus:ring-4 focus:ring-[#6366F1]/50 outline-none transition-all duration-150 rounded-xl py-2 px-4 shadow-sm font-semibold flex items-center justify-center gap-2">
              <HiOutlineUserGroup className="w-4 h-4" /> View Teams
            </Link>
          )}
          <button onClick={() => handleExport('csv')} className="border-2 border-[#22C55E] text-[#22C55E] hover:bg-[#22C55E]/10 focus:ring-4 focus:ring-[#22C55E]/50 outline-none transition-all duration-150 rounded-xl py-2 px-4 shadow-sm font-semibold flex items-center justify-center gap-2">
            <HiOutlineDocumentDownload className="w-4 h-4" /> CSV
          </button>
          <button onClick={() => handleExport('excel')} className="bg-[#3B82F6] text-[#F1F5F9] hover:bg-blue-600 focus:ring-4 focus:ring-[#3B82F6]/50 outline-none transition-all duration-150 rounded-xl py-2 px-4 shadow-sm font-semibold flex items-center justify-center gap-2">
            <HiOutlineDocumentDownload className="w-4 h-4" /> Excel
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-2">
        <div className="bg-[#1A1D27] border border-[#2E3348] p-6 rounded-2xl flex items-center justify-between shadow-lg">
          <div>
            <p className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-widest mb-1">Total</p>
            <p className="text-2xl font-bold text-[#F1F5F9] leading-none">{displayTotal} <span className="text-xs font-medium text-[#64748B] ml-1">Registered</span></p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-[#3B82F6]/10 border border-[#3B82F6]/30 flex items-center justify-center text-[#3B82F6]"><HiOutlineUsers className="w-6 h-6"/></div>
        </div>
        <div className="bg-[#1A1D27] border border-[#2E3348] p-6 rounded-2xl flex items-center justify-between shadow-lg">
          <div>
            <p className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-widest mb-1">Scanned</p>
            <p className="text-2xl font-bold text-[#22C55E] leading-none">{displayCheckedIn} <span className="text-xs font-medium text-[#22C55E]/50 ml-1">Checked In</span></p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-[#22C55E]/10 border border-[#22C55E]/30 flex items-center justify-center text-[#22C55E]"><HiOutlineCheckCircle className="w-6 h-6"/></div>
        </div>
        <div className="bg-[#1A1D27] border border-[#2E3348] p-6 rounded-2xl flex items-center justify-between shadow-lg">
          <div>
            <p className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-widest mb-1">Pending</p>
            <p className="text-2xl font-bold text-[#F1F5F9] leading-none">{pendingCount} <span className="text-xs font-medium text-[#64748B] ml-1">Not Yet</span></p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-[#F59E0B]/10 border border-[#F59E0B]/30 flex items-center justify-center text-[#F59E0B]"><HiOutlineSearch className="w-6 h-6"/></div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative group flex-1">
          <HiOutlineSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-[#64748B] group-focus-within:text-[#3B82F6] w-5 h-5 transition-colors" />
          <input 
            type="text" 
            placeholder="Search by name, email or team..." 
            value={search} 
            onChange={handleSearchChange} 
            className="w-full rounded-xl pl-12 pr-4 py-3 bg-[#1E2130] border border-[#2E3348] text-[#F1F5F9] placeholder-[#64748B] focus:ring-2 focus:ring-[#3B82F6] focus:border-[#3B82F6] outline-none transition-all shadow-sm" 
          />
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-32 gap-6 bg-[#1A1D27] rounded-3xl border border-[#2E3348]">
          <HiOutlineRefresh className="w-12 h-12 text-[#6366F1] animate-spin" />
          <p className="text-[11px] font-bold text-[#64748B] uppercase tracking-[0.4em] animate-pulse">Loading Participants...</p>
        </div>
      ) : (
        <div className="bg-[#1A1D27] border border-[#2E3348] rounded-2xl overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-[#22263A] border-b border-[#2E3348]">
                  <th className="px-6 py-4 w-12 text-center text-[10px] font-bold text-[#64748B] uppercase tracking-wider"></th>
                  <th className="px-6 py-4 text-[10px] font-bold text-[#64748B] uppercase tracking-wider">
                    {isTeamEvent ? 'Team / Leader' : 'Participant Name'}
                  </th>
                  <th className="px-6 py-4 text-[10px] font-bold text-[#64748B] uppercase tracking-wider hidden sm:table-cell">Contact</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-[#64748B] uppercase tracking-wider hidden lg:table-cell">Details</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-[#64748B] uppercase tracking-wider text-center">Status</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-[#64748B] uppercase tracking-wider text-right">Attendance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2E3348]">
                {flattenedParticipants.map((p, i) => {
                  const rowBg = i % 2 === 0 ? 'bg-transparent' : 'bg-[#22263A]/30';
                  return (
                    <tr key={p.rowKey} className={`group hover:bg-[#22263A] transition-colors ${rowBg}`}>
                      <td className="px-6 py-4 text-center text-[#64748B]">
                         <div className="w-8 h-8 rounded-full bg-[#1A1D27] border border-[#2E3348] flex items-center justify-center mx-auto shadow-sm">
                           {p.displayUser?.name?.[0]?.toUpperCase() || '?'}
                         </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-bold text-sm text-[#F1F5F9] group-hover:text-[#3B82F6] transition-colors uppercase tracking-tight">
                          {p.displayUser?.name || 'Unknown User'}
                        </p>
                        {isTeamEvent && p.teamRef && (
                          <div className="flex items-center gap-1.5 mt-1">
                            <span className={`text-[9px] font-bold uppercase tracking-widest flex items-center gap-1 ${p.isLeaderRole ? 'text-[#F59E0B]' : 'text-[#94A3B8]'}`}>
                              {p.isLeaderRole && <HiOutlineStar className="w-2.5 h-2.5" />}
                              Team: {p.teamRef.teamName}
                            </span>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 hidden sm:table-cell">
                         <p className="text-xs text-[#94A3B8] font-medium lowercase tracking-tight max-w-[150px] truncate">{p.displayUser?.email || 'N/A'}</p>
                         {p.displayUser?.phone && <p className="text-[10px] text-[#64748B] font-bold mt-1 tracking-wider">☎ {p.displayUser.phone}</p>}
                      </td>
                      <td className="px-6 py-4 hidden lg:table-cell space-y-1">
                        <p className="text-[10px] text-[#94A3B8] font-bold uppercase truncate max-w-[150px]">{p.displayUser?.college || '—'}</p>
                        <p className="text-[9px] text-[#64748B] font-bold uppercase truncate">
                           {p.displayUser?.branch ? `${p.displayUser.branch}` : ''} {p.displayUser?.year ? `· Year ${p.displayUser.year}` : ''}
                        </p>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`px-3 py-1 rounded-full text-[8px] font-bold uppercase tracking-wider border ${p.status === 'confirmed' ? 'bg-[#22C55E]/10 border-[#22C55E]/30 text-[#22C55E]' : p.status === 'pending' ? 'bg-[#F59E0B]/10 border-[#F59E0B]/30 text-[#F59E0B]' : 'bg-[#EF4444]/10 border-[#EF4444]/30 text-[#EF4444]'}`}>
                          {p.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        {p.checkedIn ? (
                          <div className="flex flex-col items-end gap-1">
                             <div className="flex items-center gap-1.5 text-[#22C55E]">
                                <span className="text-[9px] font-bold uppercase tracking-wider">Present</span>
                                <HiOutlineCheckCircle className="w-4 h-4" />
                             </div>
                            {p.checkedInAt && (
                              <p className="text-[9px] text-[#64748B] font-bold tracking-tight">
                                {new Date(p.checkedInAt).toLocaleString('en-IN', { timeStyle: 'short', dateStyle: 'short' })}
                              </p>
                            )}
                          </div>
                        ) : (
                          <span className="text-[9px] font-bold text-[#64748B] uppercase tracking-wider">Pending</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {flattenedParticipants.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center py-24 bg-[#1A1D27]">
                      <div className="w-16 h-16 bg-[#22263A] rounded-full flex items-center justify-center mx-auto mb-4 border border-[#2E3348]">
                        <HiOutlineUserGroup className="w-8 h-8 text-[#64748B]" />
                      </div>
                      <p className="text-[#F1F5F9] text-lg font-bold uppercase tracking-wider mb-2">No Participants Found</p>
                      <p className="text-[#94A3B8] text-sm max-w-sm mx-auto">Try adjusting your search criteria or clear the filters to see more results.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div className="flex flex-wrap items-center justify-center gap-3 py-6 bg-[#22263A]/50 border-t border-[#2E3348]">
              {Array.from({ length: totalPages }, (_, i) => (
                <button 
                  key={i} 
                  onClick={() => setPage(i + 1)} 
                  className={`w-10 h-10 rounded-xl text-[10px] font-bold transition-all shadow-md focus:outline-none focus:ring-2 focus:ring-[#6366F1] active:scale-95 ${page === i + 1 ? 'bg-[#6366F1] text-[#F1F5F9]' : 'bg-[#1A1D27] border border-[#2E3348] text-[#94A3B8] hover:text-[#F1F5F9] hover:border-[#6366F1]'}`}
                >
                  {(i + 1).toString().padStart(2, '0')}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
