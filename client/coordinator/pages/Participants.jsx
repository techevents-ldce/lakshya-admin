import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';
import {
  HiOutlineSearch, HiOutlineArrowLeft, HiOutlineDocumentDownload,
  HiOutlineChevronDown, HiOutlineChevronUp, HiOutlineUserGroup,
  HiOutlineStar, HiOutlineUsers, HiOutlineCheckCircle,
} from 'react-icons/hi';

export default function Participants() {
  const { id: eventId } = useParams();
  const [regs, setRegs] = useState([]);
  const [eventTitle, setEventTitle] = useState('');
  const [eventType, setEventType] = useState('solo');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [expandedRow, setExpandedRow] = useState(null);

  useEffect(() => {
    api.get(`/events/${eventId}`).then(({ data }) => {
      setEventTitle(data.data.title);
      setEventType(data.data.eventType || 'solo');
    }).catch(() => {});
  }, [eventId]);

  const fetchRegs = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/registrations', { params: { eventId, page, limit: 20 } });
      setRegs(data.registrations);
      setTotalPages(data.pages);
    } catch { toast.error('Failed to load participants'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchRegs(); }, [eventId, page]);

  const filtered = search
    ? regs.filter((r) =>
        r.userId?.name?.toLowerCase().includes(search.toLowerCase()) ||
        r.userId?.email?.toLowerCase().includes(search.toLowerCase()) ||
        r.teamId?.teamName?.toLowerCase().includes(search.toLowerCase())
      )
    : regs;

  // Attendance stats
  const totalCount = filtered.length;
  const checkedInCount = filtered.filter((r) => r.checkedIn).length;
  const pendingCount = totalCount - checkedInCount;

  const handleExport = async (format) => {
    try {
      const { data } = await api.get('/export/participants', { params: { eventId, format }, responseType: 'blob' });
      const ext = format === 'excel' ? 'xlsx' : 'csv';
      const blob = new Blob([data]);
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `participants_${eventId}.${ext}`;
      link.click();
      toast.success('Exported');
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
    <div>
      <Link to="/dashboard" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-accent-600 mb-4">
        <HiOutlineArrowLeft className="w-4 h-4" /> Back to Events
      </Link>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">Participants</h1>
            <span className={`badge ${isTeamEvent ? 'badge-blue' : 'badge-green'}`}>
              {isTeamEvent ? '👥 Team Event' : '👤 Solo Event'}
            </span>
          </div>
          <p className="text-sm text-gray-500 mt-1">{eventTitle}</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {isTeamEvent && (
            <Link to={`/events/${eventId}/teams`} className="btn-accent-outline text-xs px-3 py-1.5 flex items-center gap-1">
              <HiOutlineUserGroup className="w-4 h-4" /> View Teams
            </Link>
          )}
          <button onClick={() => handleExport('csv')} className="btn-accent-outline text-xs px-3 py-1.5 flex items-center gap-1"><HiOutlineDocumentDownload className="w-4 h-4" /> CSV</button>
          <button onClick={() => handleExport('excel')} className="btn-accent text-xs px-3 py-1.5 flex items-center gap-1"><HiOutlineDocumentDownload className="w-4 h-4" /> Excel</button>
        </div>
      </div>

      {/* Attendance Summary Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="stat-card">
          <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
            <span className="text-blue-700 font-bold text-sm">{totalCount}</span>
          </div>
          <div>
            <p className="text-xs text-gray-400">Total</p>
            <p className="font-semibold text-gray-900">Registered</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
            <span className="text-emerald-700 font-bold text-sm">{checkedInCount}</span>
          </div>
          <div>
            <p className="text-xs text-gray-400">Scanned</p>
            <p className="font-semibold text-emerald-700">Checked In</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
            <span className="text-gray-700 font-bold text-sm">{pendingCount}</span>
          </div>
          <div>
            <p className="text-xs text-gray-400">Not Yet</p>
            <p className="font-semibold text-gray-700">Pending</p>
          </div>
        </div>
      </div>

      <div className="relative mb-6 w-full sm:max-w-md">
        <HiOutlineSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
        <input type="text" placeholder="Search by name, email or team..." value={search} onChange={(e) => setSearch(e.target.value)} className="input-field pl-10" />
      </div>

      {loading ? <div className="text-center py-12 text-gray-400">Loading...</div> : (
        <div className="card overflow-hidden p-0 overflow-x-auto">
          <table className="w-full text-sm min-w-[700px]">
            <thead><tr className="table-header">
              <th className="px-4 py-3 w-8"></th>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3 hidden md:table-cell">Phone</th>
              <th className="px-4 py-3 hidden md:table-cell">College</th>
              <th className="px-4 py-3 hidden lg:table-cell">Branch</th>
              <th className="px-4 py-3 hidden lg:table-cell">Year</th>
              {isTeamEvent && <th className="px-4 py-3">Team</th>}
              {isTeamEvent && <th className="px-4 py-3">Role</th>}
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Check-in</th>
            </tr></thead>
            <tbody>
              {filtered.map((r) => {
                const leader = isLeader(r);
                const hasTeamMembers = r.teamMembers && r.teamMembers.length > 0;
                return (
                  <>
                    <tr key={r._id} className="border-t border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => hasTeamMembers && toggleExpand(r._id)}>
                      <td className="px-4 py-3 text-gray-400">
                        {hasTeamMembers && (
                          expandedRow === r._id
                            ? <HiOutlineChevronUp className="w-4 h-4" />
                            : <HiOutlineChevronDown className="w-4 h-4" />
                        )}
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-900">{r.userId?.name}</td>
                      <td className="px-4 py-3 text-gray-500">{r.userId?.email}</td>
                      <td className="px-4 py-3 text-gray-500 hidden md:table-cell">{r.userId?.phone || '—'}</td>
                      <td className="px-4 py-3 text-gray-500 hidden md:table-cell">{r.userId?.college || '—'}</td>
                      <td className="px-4 py-3 text-gray-500 hidden lg:table-cell">{r.userId?.branch || '—'}</td>
                      <td className="px-4 py-3 text-gray-500 hidden lg:table-cell">{r.userId?.year || '—'}</td>
                      {isTeamEvent && (
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center gap-1 text-gray-700 font-medium">
                            <HiOutlineUsers className="w-3.5 h-3.5 text-accent-600" />
                            {r.teamId?.teamName || '—'}
                          </span>
                        </td>
                      )}
                      {isTeamEvent && (
                        <td className="px-4 py-3">
                          {leader ? (
                            <span className="inline-flex items-center gap-1 text-amber-700 font-semibold text-xs">
                              <HiOutlineStar className="w-3.5 h-3.5" /> Leader
                            </span>
                          ) : (
                            <span className="text-gray-400 text-xs">Member</span>
                          )}
                        </td>
                      )}
                      <td className="px-4 py-3">
                        <span className={`badge ${r.status === 'confirmed' ? 'badge-green' : r.status === 'pending' ? 'badge-yellow' : 'badge-red'}`}>{r.status}</span>
                      </td>
                      <td className="px-4 py-3">
                        {r.checkedIn ? (
                          <div className="flex items-center gap-1.5">
                            <HiOutlineCheckCircle className="w-5 h-5 text-emerald-500" />
                            <div>
                              <p className="text-xs font-semibold text-emerald-700">Entered</p>
                              {r.checkedInAt && (
                                <p className="text-[10px] text-gray-400">
                                  {new Date(r.checkedInAt).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}
                                </p>
                              )}
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400 italic">pending</span>
                        )}
                      </td>
                    </tr>
                    {/* Expanded team members */}
                    {expandedRow === r._id && hasTeamMembers && (
                      <tr key={`${r._id}-members`} className="bg-accent-50/30">
                        <td colSpan={isTeamEvent ? 12 : 10} className="px-6 py-4">
                          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                            Team Members — {r.teamId?.teamName}
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                            {r.teamMembers.map((tm) => {
                              const tmIsLeader = r.teamId?.leaderId &&
                                ((r.teamId.leaderId._id || r.teamId.leaderId).toString() === (tm.userId?._id || tm.userId).toString());
                              return (
                                <div key={tm._id} className="bg-white rounded-lg border border-gray-100 p-3 flex items-start gap-3">
                                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 ${tmIsLeader ? 'bg-amber-500' : 'bg-accent-500'}`}>
                                    {tm.userId?.name?.[0] || '?'}
                                  </div>
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-1.5">
                                      <span className="font-medium text-sm text-gray-900 truncate">{tm.userId?.name}</span>
                                      {tmIsLeader && <HiOutlineStar className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />}
                                    </div>
                                    <p className="text-xs text-gray-500 truncate">{tm.userId?.email}</p>
                                    {tm.userId?.phone && <p className="text-xs text-gray-400">{tm.userId.phone}</p>}
                                    {tm.userId?.college && <p className="text-xs text-gray-400">{tm.userId.college}</p>}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
              {filtered.length === 0 && <tr><td colSpan={isTeamEvent ? 12 : 10} className="text-center py-8 text-gray-400">No participants found</td></tr>}
            </tbody>
          </table>
          {totalPages > 1 && (
            <div className="flex flex-wrap items-center justify-center gap-2 py-4 border-t border-gray-100">
              {Array.from({ length: totalPages }, (_, i) => (
                <button key={i} onClick={() => setPage(i + 1)} className={`w-8 h-8 rounded-lg text-sm font-medium ${page === i + 1 ? 'bg-accent-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>{i + 1}</button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
