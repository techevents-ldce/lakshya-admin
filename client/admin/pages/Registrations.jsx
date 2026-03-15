import { useState, useEffect } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { HiOutlineLockClosed, HiOutlineShieldCheck, HiOutlineExclamation } from 'react-icons/hi';

export default function Registrations() {
  const [verified, setVerified] = useState(false);
  const [password, setPassword] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState('');

  const [regs, setRegs] = useState([]);
  const [events, setEvents] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [eventFilter, setEventFilter] = useState('');
  const [loading, setLoading] = useState(true);

  const handleVerifyPassword = async () => {
    if (!password.trim()) { setVerifyError('Password is required'); return; }
    setVerifying(true);
    setVerifyError('');
    try {
      await api.post('/auth/verify-password', { password });
      setVerified(true);
    } catch (err) {
      setVerifyError(err?.response?.data?.message || 'Incorrect password. Please try again.');
    } finally { setVerifying(false); }
  };

  useEffect(() => {
    if (verified) {
      api.get('/events', { params: { limit: 200 } }).then(({ data }) => setEvents(data.events)).catch(() => {});
    }
  }, [verified]);

  const fetchRegs = async () => {
    setLoading(true);
    try {
      const params = { page, limit: 15 };
      if (eventFilter) params.eventId = eventFilter;
      const { data } = await api.get('/registrations', { params });
      setRegs(data.registrations);
      setTotal(data.pages);
    } catch { toast.error('Failed to load registrations'); }
    finally { setLoading(false); }
  };

  useEffect(() => { if (verified) fetchRegs(); }, [page, eventFilter, verified]);

  const statusColor = { confirmed: 'badge-green', pending: 'badge-yellow', cancelled: 'badge-red', waitlisted: 'badge-blue' };

  // --- Password Gate ---
  if (!verified) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="card max-w-sm w-full p-6 text-center space-y-4">
          <div className="mx-auto w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center">
            <HiOutlineShieldCheck className="w-8 h-8 text-blue-600" />
          </div>
          <h2 className="text-lg font-bold text-gray-900">Verify Your Identity</h2>
          <p className="text-gray-500 text-sm">Enter your admin password to view registration data.</p>
          <div className="relative">
            <HiOutlineLockClosed className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setVerifyError(''); }}
              onKeyDown={(e) => { if (e.key === 'Enter' && !verifying) handleVerifyPassword(); }}
              className="input-field pl-10"
              autoComplete="current-password"
              autoFocus
            />
          </div>
          {verifyError && (
            <p className="text-red-500 text-xs flex items-center justify-center gap-1">
              <HiOutlineExclamation className="w-4 h-4 flex-shrink-0" />{verifyError}
            </p>
          )}
          <button
            onClick={handleVerifyPassword}
            disabled={verifying || !password.trim()}
            className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {verifying ? 'Verifying...' : 'Unlock Registrations'}
          </button>
        </div>
      </div>
    );
  }

  // --- Main Content ---
  return (
    <div>
      <h1 className="text-lg sm:text-2xl font-bold mb-6">Registration Management</h1>

      <div className="flex items-center gap-4 mb-6 flex-wrap">
        <select value={eventFilter} onChange={(e) => { setEventFilter(e.target.value); setPage(1); }} className="input-field w-full sm:max-w-xs">
          <option value="">All Events</option>
          {events.map((ev) => <option key={ev._id} value={ev._id}>{ev.title}</option>)}
        </select>
      </div>

      {loading ? <div className="text-center py-12 text-gray-400">Loading...</div> : (
        <div className="card overflow-hidden p-0 overflow-x-auto">
          <table className="w-full text-sm min-w-[400px]">
            <thead><tr className="table-header">
              <th className="px-5 py-3">Participant</th><th className="px-5 py-3 hidden sm:table-cell">Email</th><th className="px-5 py-3">Event</th><th className="px-5 py-3">Status</th><th className="px-5 py-3 hidden sm:table-cell">Date</th>
            </tr></thead>
            <tbody>
              {regs.map((r) => (
                <tr key={r._id} className="border-t border-gray-100 hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3 font-medium">{r.userId?.name}</td>
                  <td className="px-5 py-3 text-gray-500 hidden sm:table-cell">{r.userId?.email}</td>
                  <td className="px-5 py-3">{r.eventId?.title}</td>
                  <td className="px-5 py-3"><span className={`badge ${statusColor[r.status] || 'badge-blue'}`}>{r.status}</span></td>
                  <td className="px-5 py-3 text-gray-500 hidden sm:table-cell">{new Date(r.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
              {regs.length === 0 && <tr><td colSpan="5" className="text-center py-8 text-gray-400">No registrations found</td></tr>}
            </tbody>
          </table>
          {total > 1 && (
            <div className="flex flex-wrap items-center justify-center gap-2 py-4 border-t border-gray-100">
              {Array.from({ length: total }, (_, i) => (
                <button key={i} onClick={() => setPage(i + 1)} className={`w-8 h-8 rounded-lg text-sm font-medium ${page === i + 1 ? 'bg-primary-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>{i + 1}</button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
