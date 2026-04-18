import { useState, useEffect, Fragment } from 'react';
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

  const handleManualCheckIn = async (regId, e) => {
    e.stopPropagation();
    try {
      await api.patch(`/registrations/${regId}/mark-attendance`);
      toast.success('Successfully checked in');
      fetchRegs();
    } catch (err) {
      toast.error('Failed to manually check in');
    }
  };

  useEffect(() => {
    api.get(`/events/${eventId}`).then(({ data }) => {
      setEventTitle(data.data.title);
      setEventType(data.data.eventType || 'solo');
    }).catch(() => { });
  }, [eventId]);

  const fetchRegs = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/registrations', {
        params: { eventId, page, limit: 20, groupTeams: true }
      });
      setRegs(data.registrations);
      setTotalPages(data.pages);
      if (data.stats) {
        setStatsTotalCount(data.stats.totalParticipants);
        setStatsCheckedInCount(data.stats.totalCheckedIn);
      }
    } catch { toast.error('Failed to load participants'); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    setPage(1);
    fetchRegs();
  }, [search]);

  useEffect(() => { fetchRegs(); }, [eventId, page]);

  const filtered = regs;

  const displayTotal = statsTotalCount || filtered.length;
  const displayCheckedIn = statsCheckedInCount || filtered.filter((r) => r.checkedIn).length;
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
          <div className="w-12 h-12 rounded-xl bg-[#3B82F6]/10 border border-[#3B82F6]/30 flex items-center justify-center text-[#3B82F6]"><HiOutlineUsers className="w-6 h-6" /></div>
        </div>
        <div className="bg-[#1A1D27] border border-[#2E3348] p-6 rounded-2xl flex items-center justify-between shadow-lg">
          <div>
            <p className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-widest mb-1">Scanned</p>
            <p className="text-2xl font-bold text-[#22C55E] leading-none">{displayCheckedIn} <span className="text-xs font-medium text-[#22C55E]/50 ml-1">Checked In</span></p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-[#22C55E]/10 border border-[#22C55E]/30 flex items-center justify-center text-[#22C55E]"><HiOutlineCheckCircle className="w-6 h-6" /></div>
        </div>
        <div className="bg-[#1A1D27] border border-[#2E3348] p-6 rounded-2xl flex items-center justify-between shadow-lg">
          <div>
            <p className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-widest mb-1">Pending</p>
            <p className="text-2xl font-bold text-[#F1F5F9] leading-none">{pendingCount} <span className="text-xs font-medium text-[#64748B] ml-1">Not Yet</span></p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-[#F59E0B]/10 border border-[#F59E0B]/30 flex items-center justify-center text-[#F59E0B]"><HiOutlineSearch className="w-6 h-6" /></div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative group flex-1">
          <HiOutlineSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-[#64748B] group-focus-within:text-[#3B82F6] w-5 h-5 transition-colors" />
          <input
            type="text"
            placeholder="Search by name, email or team..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
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
                {filtered.map((r, i) => {
                  const leader = isLeader(r);
                  const hasTeamMembers = r.teamMembers && r.teamMembers.length > 0;
                  const rowBg = expandedRow === r._id ? 'bg-[#6366F1]/10 border-l-2 border-l-[#6366F1]' : (i % 2 === 0 ? 'bg-transparent' : 'bg-[#22263A]/30');
                  return (
                    // FIX 1: replaced React.Fragment with Fragment (imported above)
                    <Fragment key={r._id}>
                      <tr
                        className={`group hover:bg-[#22263A] transition-colors cursor-pointer ${rowBg}`}
                        onClick={() => toggleExpand(r._id)}
                      >
                        <td className="px-6 py-4 text-center text-[#64748B]">
                          {expandedRow === r._id
                            ? <HiOutlineChevronUp className="w-4 h-4 group-hover:text-[#F1F5F9] transition-colors" />
                            : <HiOutlineChevronDown className="w-4 h-4 group-hover:text-[#F1F5F9] transition-colors" />}
                        </td>
                        <td className="px-6 py-4">
                          {isTeamEvent && r.teamId ? (
                            <div>
                              <p className="font-bold text-sm text-[#F1F5F9] group-hover:text-[#6366F1] transition-colors uppercase tracking-tight">
                                {r.teamId.teamName}
                              </p>
                              <div className="flex items-center gap-1.5 mt-1">
                                <span className="text-[9px] text-[#F59E0B] font-bold uppercase tracking-widest flex items-center gap-1">
                                  <HiOutlineStar className="w-2.5 h-2.5" /> {r.userId?.name}
                                </span>
                                <span className="text-[9px] text-[#64748B] uppercase tracking-widest leading-none">· Leader</span>
                              </div>
                            </div>
                          ) : (
                            <p className="font-bold text-sm text-[#F1F5F9] group-hover:text-[#3B82F6] transition-colors uppercase tracking-tight">
                              {r.userId?.name}
                            </p>
                          )}
                        </td>
                        <td className="px-6 py-4 hidden sm:table-cell">
                          <p className="text-xs text-[#94A3B8] font-medium lowercase tracking-tight max-w-[150px] truncate">{r.userId?.email}</p>
                          {r.userId?.phone && <p className="text-[10px] text-[#64748B] font-bold mt-1 tracking-wider">☎ {r.userId.phone}</p>}
                        </td>
                        <td className="px-6 py-4 hidden lg:table-cell space-y-1">
                          <p className="text-[10px] text-[#94A3B8] font-bold uppercase truncate max-w-[150px]">{r.userId?.college || '—'}</p>
                          <p className="text-[9px] text-[#64748B] font-bold uppercase truncate">
                            {r.userId?.branch ? `${r.userId.branch}` : ''} {r.userId?.year ? `· Year ${r.userId.year}` : ''}
                          </p>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className={`px-3 py-1 rounded-full text-[8px] font-bold uppercase tracking-wider border ${r.status === 'confirmed' ? 'bg-[#22C55E]/10 border-[#22C55E]/30 text-[#22C55E]' : r.status === 'pending' ? 'bg-[#F59E0B]/10 border-[#F59E0B]/30 text-[#F59E0B]' : 'bg-[#EF4444]/10 border-[#EF4444]/30 text-[#EF4444]'}`}>
                            {r.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          {isTeamEvent ? (
                            <div className="flex flex-col items-end gap-1">
                              <span className="text-[9px] font-bold text-[#64748B] uppercase tracking-wider">
                                {r.teamMembers ? r.teamMembers.filter(m => m.status === 'accepted').length : 0} Connected
                              </span>
                              <div className="flex items-center gap-1 text-[#22C55E]">
                                <span className="text-[10px] font-bold">
                                  {r.teamMembers ? r.teamMembers.filter(m => m.checkedIn).length : (r.checkedIn ? 1 : 0)} Checked In
                                </span>
                              </div>
                            </div>
                          ) : r.checkedIn ? (
                            <div className="flex flex-col items-end gap-1">
                              <div className="flex items-center gap-1.5 text-[#22C55E]">
                                <span className="text-[9px] font-bold uppercase tracking-wider">Entered</span>
                                <HiOutlineCheckCircle className="w-4 h-4" />
                              </div>
                              {r.checkedInAt && (
                                <p className="text-[9px] text-[#64748B] font-bold tracking-tight">
                                  {new Date(r.checkedInAt).toLocaleString('en-IN', { timeStyle: 'short', dateStyle: 'short' })}
                                </p>
                              )}
                            </div>
                          ) : (
                            <div className="flex flex-col items-end gap-2">
                              <span className="text-[9px] font-bold text-[#64748B] uppercase tracking-wider">Pending</span>
                              <button 
                                onClick={(e) => handleManualCheckIn(r._id, e)}
                                className="bg-[#22C55E]/10 hover:bg-[#22C55E]/20 text-[#22C55E] border border-[#22C55E]/30 px-3 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-widest transition-colors flex items-center justify-center gap-1 outline-none focus:ring-2 focus:ring-[#22C55E]"
                              >
                                <HiOutlineCheckCircle className="w-3 h-3" /> Check In
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>

                      {expandedRow === r._id && (
                        <tr className="bg-[#22263A] shadow-inner relative z-10 border-b border-[#2E3348]">
                          <td colSpan={6} className="px-10 py-8">
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                              {/* Column 1: Core Info */}
                              <div className="space-y-6">
                                <div className="text-[10px] font-bold text-[#64748B] uppercase tracking-widest flex items-center gap-2">
                                  <div className="w-1.5 h-1.5 rounded-full bg-[#3B82F6]"></div> Profile Information
                                </div>
                                <div className="bg-[#1A1D27] rounded-2xl border border-[#2E3348] p-5 space-y-4 shadow-sm">
                                  <div>
                                    <p className="text-[9px] font-bold text-[#64748B] uppercase tracking-widest mb-1">Full Name</p>
                                    <p className="text-sm font-bold text-[#F1F5F9] uppercase">{r.userId?.name || '—'}</p>
                                  </div>
                                  <div className="grid grid-cols-2 gap-4">
                                    <div>
                                      <p className="text-[9px] font-bold text-[#64748B] uppercase tracking-widest mb-1">Email</p>
                                      <p className="text-xs font-medium text-[#94A3B8] lowercase break-all">{r.userId?.email || '—'}</p>
                                    </div>
                                    <div>
                                      <p className="text-[9px] font-bold text-[#64748B] uppercase tracking-widest mb-1">Phone</p>
                                      <p className="text-xs font-bold text-[#F1F5F9]">{r.userId?.phone || '—'}</p>
                                    </div>
                                  </div>
                                  <div>
                                    <p className="text-[9px] font-bold text-[#64748B] uppercase tracking-widest mb-1">Institution</p>
                                    <p className="text-xs font-bold text-[#F1F5F9] uppercase leading-relaxed">{r.userId?.college || '—'}</p>
                                    <p className="text-[10px] font-medium text-[#64748B] mt-1 italic">{r.userId?.branch || 'General'} · Year {r.userId?.year || '—'}</p>
                                  </div>
                                </div>
                              </div>

                              {/* Column 2: Custom Registration Data */}
                              <div className="space-y-6">
                                <div className="text-[10px] font-bold text-[#64748B] uppercase tracking-widest flex items-center gap-2">
                                  <div className="w-1.5 h-1.5 rounded-full bg-[#22C55E]"></div> Event Specific Data
                                </div>
                                <div className="bg-[#1A1D27] rounded-2xl border border-[#2E3348] p-5 shadow-sm min-h-[100px]">
                                  {r.registrationData && Object.keys(r.registrationData).length > 0 ? (
                                    <div className="space-y-4">
                                      {Object.entries(r.registrationData).map(([key, value]) => (
                                        <div key={key} className="border-b border-[#2E3348] last:border-0 pb-3 last:pb-0">
                                          <p className="text-[9px] font-bold text-[#64748B] uppercase tracking-widest mb-1">{key.replace(/([A-Z])/g, ' $1').trim()}</p>
                                          <p className="text-xs font-bold text-[#F1F5F9] break-words">
                                            {typeof value === 'boolean' ? (value ? '✅ Yes' : '❌ No') : (value?.toString() || '—')}
                                          </p>
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <div className="h-full flex flex-col items-center justify-center py-4 text-center">
                                      <p className="text-[10px] font-bold text-[#475569] uppercase tracking-widest">No additional data</p>
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Column 3: Team Info (if applicable) */}
                              {isTeamEvent && (
                                <div className="space-y-6">
                                  <div className="text-[10px] font-bold text-[#64748B] uppercase tracking-widest flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-[#F59E0B]"></div> Team Roster
                                  </div>
                                  <div className="space-y-3">
                                    {hasTeamMembers ? (
                                      r.teamMembers.map((tm) => {
                                        const tmIsLeader = r.teamId?.leaderId &&
                                          ((r.teamId.leaderId._id || r.teamId.leaderId).toString() === (tm.userId?._id || tm.userId).toString());
                                        return (
                                          <div key={tm._id} className="bg-[#1A1D27] rounded-xl border border-[#2E3348] p-3 flex items-center gap-3 hover:border-[#6366F1]/50 transition-all shadow-sm">
                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-[#F1F5F9] text-xs font-bold flex-shrink-0 shadow-lg ${tmIsLeader ? 'bg-[#F59E0B]' : 'bg-[#2E3348]'}`}>
                                              {tm.userId?.name?.[0]?.toUpperCase() || '?'}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                              <div className="flex items-center gap-1.5 mb-0.5">
                                                <span className="font-bold text-[11px] text-[#F1F5F9] uppercase tracking-tight truncate">{tm.userId?.name}</span>
                                                {tmIsLeader && <HiOutlineStar className="w-2.5 h-2.5 text-[#F59E0B]" />}
                                              </div>
                                              <p className="text-[9px] font-medium text-[#64748B] truncate lowercase">{tm.userId?.email}</p>
                                            </div>
                                            <div className={`w-2 h-2 rounded-full ${tm.checkedIn ? 'bg-[#22C55E]' : 'bg-[#475569]'}`}></div>
                                          </div>
                                        );
                                      })
                                    ) : (
                                      <div className="bg-[#1A1D27] rounded-xl border border-[#2E3348] p-6 text-center">
                                        <p className="text-[10px] font-bold text-[#475569] uppercase tracking-widest leading-relaxed">No members found</p>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
                {filtered.length === 0 && (
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