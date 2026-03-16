import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';
import {
  HiOutlineSearch, HiOutlineArrowLeft, HiOutlineFilter,
  HiOutlineCheck, HiOutlineX, HiOutlineBan, HiOutlineExclamation,
} from 'react-icons/hi';

const STATUS_CONFIG = {
  present:   { label: 'Present',    icon: HiOutlineCheck,       color: 'bg-emerald-100 text-emerald-800', dot: 'bg-emerald-500' },
  absent:    { label: 'Absent',     icon: HiOutlineX,           color: 'bg-gray-100 text-gray-700',       dot: 'bg-gray-400' },
  cancelled: { label: 'Cancelled',  icon: HiOutlineBan,         color: 'bg-red-100 text-red-800',         dot: 'bg-red-500' },
  'no-ticket': { label: 'No Ticket', icon: HiOutlineExclamation, color: 'bg-amber-100 text-amber-800',    dot: 'bg-amber-500' },
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
    <div>
      <Link to="/dashboard" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-accent-600 mb-4">
        <HiOutlineArrowLeft className="w-4 h-4" /> Back to Events
      </Link>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold">Attendance</h1>
          <p className="text-sm text-gray-500 mt-1">{eventTitle}</p>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div className="stat-card">
          <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
            <span className="text-blue-700 font-bold text-sm">{summary.total}</span>
          </div>
          <div>
            <p className="text-xs text-gray-400">Total</p>
            <p className="font-semibold text-gray-900">Registered</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
            <span className="text-emerald-700 font-bold text-sm">{summary.present}</span>
          </div>
          <div>
            <p className="text-xs text-gray-400">Checked In</p>
            <p className="font-semibold text-emerald-700">Present</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
            <span className="text-gray-700 font-bold text-sm">{summary.absent}</span>
          </div>
          <div>
            <p className="text-xs text-gray-400">Not Yet</p>
            <p className="font-semibold text-gray-700">Absent</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
            <span className="text-red-700 font-bold text-sm">{summary.cancelled}</span>
          </div>
          <div>
            <p className="text-xs text-gray-400">Invalidated</p>
            <p className="font-semibold text-red-700">Cancelled</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1 sm:max-w-md">
          <HiOutlineSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input type="text" placeholder="Search by name or email..." value={search} onChange={(e) => setSearch(e.target.value)} className="input-field pl-10" />
        </div>
        <div className="relative">
          <HiOutlineFilter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="input-field pl-9 pr-8 appearance-none cursor-pointer">
            {statusFilterOptions.map((s) => (
              <option key={s} value={s}>{s === 'all' ? 'All Statuses' : STATUS_CONFIG[s]?.label || s}</option>
            ))}
          </select>
        </div>
      </div>

      {loading ? <div className="text-center py-12 text-gray-400">Loading...</div> : (
        <div className="card overflow-hidden p-0 overflow-x-auto">
          <table className="w-full text-sm min-w-[650px]">
            <thead><tr className="table-header">
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3 hidden md:table-cell">Phone</th>
              <th className="px-4 py-3 hidden md:table-cell">College</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 hidden sm:table-cell">Scanned At</th>
              <th className="px-4 py-3">Actions</th>
            </tr></thead>
            <tbody>
              {records.map((r) => {
                const cfg = STATUS_CONFIG[r.attendanceStatus] || STATUS_CONFIG['no-ticket'];
                const StatusIcon = cfg.icon;
                const isToggling = togglingId === r.ticket?._id;

                return (
                  <tr key={r._id} className="border-t border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-900">{r.user?.name}</td>
                    <td className="px-4 py-3 text-gray-500">{r.user?.email}</td>
                    <td className="px-4 py-3 text-gray-500 hidden md:table-cell">{r.user?.phone || '—'}</td>
                    <td className="px-4 py-3 text-gray-500 hidden md:table-cell">{r.user?.college || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`badge ${cfg.color} gap-1`}>
                        <StatusIcon className="w-3.5 h-3.5" /> {cfg.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs hidden sm:table-cell">
                      {r.ticket?.scannedAt
                        ? new Date(r.ticket.scannedAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
                        : '—'}
                    </td>
                    <td className="px-4 py-3">
                      {r.ticket ? (
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {r.attendanceStatus === 'absent' && (
                            <button
                              onClick={() => handleToggle(r.ticket._id, 'used')}
                              disabled={isToggling}
                              className="text-xs px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-medium transition-colors disabled:opacity-50"
                              title="Mark as Present"
                            >
                              ✅ Mark Present
                            </button>
                          )}
                          {r.attendanceStatus === 'present' && (
                            <button
                              onClick={() => handleToggle(r.ticket._id, 'valid')}
                              disabled={isToggling}
                              className="text-xs px-2.5 py-1 rounded-md bg-gray-100 text-gray-600 hover:bg-gray-200 font-medium transition-colors disabled:opacity-50"
                              title="Mark as Absent (undo check-in)"
                            >
                              ↩️ Undo Check-in
                            </button>
                          )}
                          {r.attendanceStatus !== 'cancelled' && (
                            <button
                              onClick={() => handleToggle(r.ticket._id, 'cancelled')}
                              disabled={isToggling}
                              className="text-xs px-2.5 py-1 rounded-md bg-red-50 text-red-600 hover:bg-red-100 font-medium transition-colors disabled:opacity-50"
                              title="Invalidate this entry"
                            >
                              🚫 Invalidate
                            </button>
                          )}
                          {r.attendanceStatus === 'cancelled' && (
                            <button
                              onClick={() => handleToggle(r.ticket._id, 'valid')}
                              disabled={isToggling}
                              className="text-xs px-2.5 py-1 rounded-md bg-blue-50 text-blue-600 hover:bg-blue-100 font-medium transition-colors disabled:opacity-50"
                              title="Restore this ticket"
                            >
                              🔄 Restore
                            </button>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400 italic">No ticket</span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {records.length === 0 && <tr><td colSpan="7" className="text-center py-8 text-gray-400">No records found</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
