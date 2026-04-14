import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';
import {
  HiOutlineSearch, HiOutlineArrowLeft, HiOutlineFilter,
  HiOutlineCheck, HiOutlineX, HiOutlineBan, HiOutlineExclamation,
  HiOutlineRefresh, HiOutlineInformationCircle, HiOutlineUserGroup
} from 'react-icons/hi';

const STATUS_CONFIG = {
  present:   { label: 'Present',    icon: HiOutlineCheck,       color: 'bg-[#22C55E]/10 text-[#22C55E] border border-[#22C55E]/30' },
  absent:    { label: 'Absent',     icon: HiOutlineX,           color: 'bg-[#94A3B8]/10 text-[#94A3B8] border border-[#94A3B8]/30' },
  cancelled: { label: 'Cancelled',  icon: HiOutlineBan,         color: 'bg-[#EF4444]/10 text-[#EF4444] border border-[#EF4444]/30' },
  'no-ticket': { label: 'No Ticket', icon: HiOutlineExclamation, color: 'bg-[#F59E0B]/10 text-[#F59E0B] border border-[#F59E0B]/30' },
};

export default function Attendance() {
  const { id: eventId } = useParams();
  const [records, setRecords] = useState([]);
  const [summary, setSummary] = useState({ total: 0, present: 0, absent: 0, cancelled: 0, noTicket: 0 });
  const [eventTitle, setEventTitle] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [togglingId, setTogglingId] = useState(null);

  useEffect(() => {
    api.get(`/events/${eventId}`).then(({ data }) => setEventTitle(data.data.title)).catch(() => {});
  }, [eventId]);

  const fetchAttendance = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/attendance/${eventId}`, { params: { search, status: statusFilter } });
      setRecords(data.records);
      setSummary(data.summary);
    } catch { toast.error('Failed to load attendance'); }
    finally { setLoading(false); }
  }, [eventId, search, statusFilter]);

  useEffect(() => { fetchAttendance(); }, [fetchAttendance]);

  const handleToggle = async (ticketId, newStatus) => {
    setTogglingId(ticketId);
    try {
      await api.patch(`/attendance/ticket/${ticketId}`, { status: newStatus });
      toast.success(`Ticket marked as ${newStatus}`);
      fetchAttendance();
    } catch (err) {
      toast.error(err.userMessage || 'Failed to update ticket');
    } finally {
      setTogglingId(null);
    }
  };

  const statusFilterOptions = ['all', 'present', 'absent', 'cancelled', 'no-ticket'];

  return (
    <div className="animate-fade-in space-y-8 bg-[#0F1117] min-h-[700px]">
      <Link to="/dashboard" className="inline-flex items-center gap-1.5 text-[10px] font-bold tracking-widest uppercase text-[#94A3B8] hover:text-[#F1F5F9] transition-colors mb-2 rounded p-1 focus:outline-none focus:ring-2 focus:ring-[#6366F1]">
        <HiOutlineArrowLeft className="w-4 h-4" /> Back to Dashboard
      </Link>

      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold text-[#F1F5F9] tracking-tight uppercase leading-none mb-2">Attendance</h1>
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
          <p className="text-2xl font-bold text-[#F1F5F9] pl-1">{summary.total} <span className="text-xs font-normal text-[#64748B]">Reg</span></p>
        </div>
        <div className="bg-[#1A1D27] border border-[#2E3348] p-5 rounded-2xl shadow-lg hover:border-[#22C55E]/30 transition-all">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 rounded-lg bg-[#22C55E]/10 border border-[#22C55E]/30 flex items-center justify-center">
              <HiOutlineCheck className="w-4 h-4 text-[#22C55E]" />
            </div>
             <p className="text-[10px] font-bold text-[#22C55E] uppercase tracking-widest">Present</p>
          </div>
          <p className="text-2xl font-bold text-[#22C55E] pl-1">{summary.present} <span className="text-xs font-normal text-[#22C55E]/50">Checked In</span></p>
        </div>
        <div className="bg-[#1A1D27] border border-[#2E3348] p-5 rounded-2xl shadow-lg hover:border-[#F59E0B]/30 transition-all">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 rounded-lg bg-[#F59E0B]/10 border border-[#F59E0B]/30 flex items-center justify-center">
              <span className="text-[#F59E0B] font-bold text-sm">…</span>
            </div>
            <p className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-widest">Absent</p>
          </div>
          <p className="text-2xl font-bold text-[#F1F5F9] pl-1">{summary.absent} <span className="text-xs font-normal text-[#64748B]">Not Yet</span></p>
        </div>
        <div className="bg-[#1A1D27] border border-[#2E3348] p-5 rounded-2xl shadow-lg hover:border-[#EF4444]/30 transition-all">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 rounded-lg bg-[#EF4444]/10 border border-[#EF4444]/30 flex items-center justify-center">
              <HiOutlineBan className="w-4 h-4 text-[#EF4444]" />
            </div>
            <p className="text-[10px] font-bold text-[#EF4444] uppercase tracking-widest">Cancelled</p>
          </div>
          <p className="text-2xl font-bold text-[#EF4444] pl-1">{summary.cancelled} <span className="text-xs font-normal text-[#EF4444]/50">Invalid</span></p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative group flex-1">
          <HiOutlineSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-[#64748B] group-focus-within:text-[#3B82F6] w-5 h-5 transition-colors" />
          <input type="text" placeholder="Search by name, email..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full rounded-xl pl-12 pr-4 py-3 bg-[#1E2130] border border-[#2E3348] text-[#F1F5F9] placeholder-[#64748B] focus:ring-2 focus:ring-[#3B82F6] focus:border-[#3B82F6] outline-none transition-all shadow-sm" />
        </div>
        <div className="flex gap-4">
          <div className="relative w-48">
            <HiOutlineFilter className="absolute left-3 top-1/2 -translate-y-1/2 text-[#64748B] w-4 h-4 pointer-events-none" />
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-full rounded-xl pl-9 pr-8 py-3 bg-[#1E2130] border border-[#2E3348] text-[#F1F5F9] appearance-none cursor-pointer focus:ring-2 focus:ring-[#3B82F6] outline-none transition-all shadow-sm text-xs font-bold uppercase tracking-wider">
              {statusFilterOptions.map((s) => (
                <option key={s} value={s}>{s === 'all' ? 'ALL STATUS' : (STATUS_CONFIG[s]?.label || s).toUpperCase()}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-32 gap-6 bg-[#1A1D27] rounded-3xl border border-[#2E3348]">
          <HiOutlineRefresh className="w-12 h-12 text-[#6366F1] animate-spin" />
          <p className="text-[11px] font-bold text-[#64748B] uppercase tracking-[0.4em] animate-pulse">Loading Attendance...</p>
        </div>
      ) : (
        <div className="bg-[#1A1D27] border border-[#2E3348] rounded-2xl overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-[#22263A] border-b border-[#2E3348]">
                  <th className="px-6 py-4 text-[10px] font-bold text-[#64748B] uppercase tracking-wider">Name</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-[#64748B] uppercase tracking-wider">Email</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-[#64748B] uppercase tracking-wider hidden lg:table-cell">Contact</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-[#64748B] uppercase tracking-wider text-center">Status</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-[#64748B] uppercase tracking-wider hidden sm:table-cell text-center">Scanned At</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-[#64748B] uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2E3348]">
                {records.map((r, i) => {
                  const cfg = STATUS_CONFIG[r.attendanceStatus] || STATUS_CONFIG['no-ticket'];
                  const StatusIcon = cfg.icon;
                  const isToggling = togglingId === r.ticket?._id;
                  const rowBg = i % 2 === 0 ? 'bg-[#1A1D27]' : 'bg-[#22263A]/30';

                  return (
                    <tr key={r._id} className={`hover:bg-[#22263A] transition-colors group ${rowBg}`}>
                      <td className="px-6 py-4">
                        <p className="font-bold text-sm text-[#F1F5F9] group-hover:text-[#3B82F6] transition-colors uppercase tracking-tight">{r.user?.name}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-xs text-[#94A3B8] font-medium lowercase tracking-tight max-w-[150px] truncate">{r.user?.email}</p>
                      </td>
                      <td className="px-6 py-4 hidden lg:table-cell">
                        <p className="text-[10px] text-[#94A3B8] font-bold uppercase truncate max-w-[150px]">{r.user?.college || '—'}</p>
                        <p className="text-[9px] text-[#64748B] font-bold uppercase truncate">
                          {r.user?.phone ? `☎ ${r.user.phone}` : ''}
                        </p>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-[9px] font-bold uppercase tracking-wider border ${cfg.color}`}>
                          <StatusIcon className="w-3.5 h-3.5" /> {cfg.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-[9px] font-bold text-[#64748B] tracking-wider text-center hidden sm:table-cell">
                        {r.ticket?.scannedAt
                          ? new Date(r.ticket.scannedAt).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })
                          : '—'}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {r.ticket ? (
                          <div className="flex items-center justify-end gap-2 flex-wrap min-w-[200px]">
                            {r.attendanceStatus === 'absent' && (
                              <button
                                onClick={() => handleToggle(r.ticket._id, 'used')}
                                disabled={isToggling}
                                className="px-3 py-1.5 rounded-lg text-[10px] font-bold tracking-widest uppercase transition-all flex items-center gap-1.5 bg-[#22C55E]/10 text-[#22C55E] border border-[#22C55E]/30 hover:bg-[#22C55E] hover:text-[#F1F5F9] disabled:opacity-50"
                                title="Mark as Present"
                              >
                                <HiOutlineCheck className="w-3 h-3" /> Mark Present
                              </button>
                            )}
                            {r.attendanceStatus === 'present' && (
                              <button
                                onClick={() => handleToggle(r.ticket._id, 'valid')}
                                disabled={isToggling}
                                className="px-3 py-1.5 rounded-lg text-[10px] font-bold tracking-widest uppercase transition-all flex items-center gap-1.5 bg-[#2E3348] text-[#F1F5F9] border border-[#2E3348] hover:bg-[#22263A] disabled:opacity-50"
                                title="Mark as Absent (undo check-in)"
                              >
                                <HiOutlineRefresh className="w-3 h-3" /> Undo Check-in
                              </button>
                            )}
                            {r.attendanceStatus !== 'cancelled' && (
                              <button
                                onClick={() => handleToggle(r.ticket._id, 'cancelled')}
                                disabled={isToggling}
                                className="px-3 py-1.5 rounded-lg text-[10px] font-bold tracking-widest uppercase transition-all flex items-center gap-1.5 bg-[#EF4444]/10 text-[#EF4444] border border-[#EF4444]/30 hover:bg-[#EF4444] hover:text-[#F1F5F9] disabled:opacity-50"
                                title="Invalidate this entry"
                              >
                                <HiOutlineBan className="w-3 h-3" /> Invalidate
                              </button>
                            )}
                            {r.attendanceStatus === 'cancelled' && (
                              <button
                                onClick={() => handleToggle(r.ticket._id, 'valid')}
                                disabled={isToggling}
                                className="px-3 py-1.5 rounded-lg text-[10px] font-bold tracking-widest uppercase transition-all flex items-center gap-1.5 bg-[#6366F1]/10 text-[#6366F1] border border-[#6366F1]/30 hover:bg-[#6366F1] hover:text-[#F1F5F9] disabled:opacity-50"
                                title="Restore this ticket"
                              >
                                <HiOutlineRefresh className="w-3 h-3" /> Restore
                              </button>
                            )}
                          </div>
                        ) : (
                          <span className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider">No ticket</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {records.length === 0 && (
                  <tr>
                    <td colSpan="6" className="text-center py-24 bg-[#1A1D27]">
                      <div className="w-16 h-16 bg-[#22263A] rounded-full flex items-center justify-center mx-auto mb-4 border border-[#2E3348]">
                        <HiOutlineInformationCircle className="w-8 h-8 text-[#64748B]" />
                      </div>
                      <p className="text-[#F1F5F9] text-lg font-bold uppercase tracking-wider mb-2">No records found</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
