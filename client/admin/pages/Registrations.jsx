import { useState, useEffect } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { HiOutlineLockClosed, HiOutlineShieldCheck, HiOutlineExclamation, HiOutlineSearch, HiOutlineChevronDown, HiOutlineChevronUp } from 'react-icons/hi';

const fmtDT = (d) => d ? new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

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
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [referralFilter, setReferralFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);

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
      if (statusFilter) params.status = statusFilter;
      if (search) params.search = search;
      if (referralFilter.trim()) params.referralCode = referralFilter.trim();
      const { data } = await api.get('/registrations', { params });
      setRegs(data.registrations);
      setTotal(data.pages);
    } catch { toast.error('Failed to load registrations'); }
    finally { setLoading(false); }
  };

  useEffect(() => { if (verified) fetchRegs(); }, [page, eventFilter, statusFilter, search, referralFilter, verified]);

  const statusColor = { confirmed: 'badge-green', pending: 'badge-yellow', cancelled: 'badge-red', waitlisted: 'badge-blue' };

  const toggleExpand = (id) => setExpanded(expanded === id ? null : id);

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

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-6 flex-wrap">
        <div className="relative w-full sm:max-w-xs">
          <HiOutlineSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input type="text" placeholder="Search by name or email..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="input-field pl-10" />
        </div>
        <select value={eventFilter} onChange={(e) => { setEventFilter(e.target.value); setPage(1); }} className="input-field w-full sm:w-auto sm:min-w-[160px]">
          <option value="">All Events</option>
          {events.map((ev) => <option key={ev._id} value={ev._id}>{ev.title}</option>)}
        </select>
        <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} className="input-field w-full sm:w-auto sm:min-w-[140px]">
          <option value="">All Status</option>
          <option value="pending">Pending</option>
          <option value="confirmed">Confirmed</option>
          <option value="cancelled">Cancelled</option>
          <option value="waitlisted">Waitlisted</option>
        </select>
        <input
          type="text"
          placeholder="Referral code…"
          value={referralFilter}
          onChange={(e) => { setReferralFilter(e.target.value); setPage(1); }}
          className="input-field w-full sm:w-auto sm:min-w-[120px] max-w-[160px]"
        />
      </div>

      {loading ? <div className="text-center py-12 text-gray-400">Loading...</div> : (
        <div className="card overflow-hidden p-0 overflow-x-auto">
          <table className="w-full text-sm min-w-[500px]">
            <thead><tr className="table-header">
              <th className="px-5 py-3 w-8"></th>
              <th className="px-5 py-3">Participant</th><th className="px-5 py-3 hidden sm:table-cell">Email</th><th className="px-5 py-3">Event</th><th className="px-5 py-3">Type</th><th className="px-5 py-3">Status</th><th className="px-5 py-3 hidden sm:table-cell">Date</th>
            </tr></thead>
            <tbody>
              {regs.map((r) => (
                <>
                  <tr key={r._id} className={`border-t border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer ${expanded === r._id ? 'bg-gray-50' : ''}`} onClick={() => toggleExpand(r._id)}>
                    <td className="px-5 py-3 text-gray-400">
                      {expanded === r._id ? <HiOutlineChevronUp className="w-4 h-4" /> : <HiOutlineChevronDown className="w-4 h-4" />}
                    </td>
                    <td className="px-5 py-3 font-medium">{r.userId?.name}</td>
                    <td className="px-5 py-3 text-gray-500 hidden sm:table-cell">{r.userId?.email}</td>
                    <td className="px-5 py-3">{r.eventId?.title}</td>
                    <td className="px-5 py-3"><span className={`badge ${r.eventId?.eventType === 'team' ? 'badge-blue' : 'badge-green'}`}>{r.eventId?.eventType || '—'}</span></td>
                    <td className="px-5 py-3"><span className={`badge ${statusColor[r.status] || 'badge-blue'}`}>{r.status}</span></td>
                    <td className="px-5 py-3 text-gray-500 hidden sm:table-cell">{new Date(r.createdAt).toLocaleDateString()}</td>
                  </tr>

                  {/* Expanded Detail Row */}
                  {expanded === r._id && (
                    <tr key={`${r._id}-detail`} className="bg-gray-50/80">
                      <td colSpan="7" className="px-5 py-4">
                        <div className="space-y-4">
                          {/* Participant Info */}
                          <div>
                            <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Participant Details</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-3 text-sm">
                              <DetailItem label="Full Name" value={r.userId?.name || '—'} />
                              <DetailItem label="Email" value={r.userId?.email || '—'} />
                              <DetailItem label="Phone" value={r.userId?.phone || '—'} />
                              <DetailItem label="College" value={r.userId?.college || '—'} />
                              <DetailItem label="Branch" value={r.userId?.branch || '—'} />
                              <DetailItem label="Year" value={r.userId?.year ? `Year ${r.userId.year}` : '—'} />
                            </div>
                          </div>

                          {/* Event Info */}
                          <div>
                            <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Event Details</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-3 text-sm">
                              <DetailItem label="Event" value={r.eventId?.title || '—'} />
                              <DetailItem label="Event Type" value={r.eventId?.eventType || '—'} />
                              <DetailItem label="Fee" value={r.eventId?.isPaid ? `₹${r.eventId.registrationFee}` : 'Free'} />
                              <DetailItem label="Registration Status" value={r.status} />
                              <DetailItem label="Registered On" value={fmtDT(r.createdAt)} />
                              <DetailItem label="Referral code" value={r.referralCodeUsed || '—'} />
                            </div>
                          </div>

                          {/* Team Info (only for team events) */}
                          {r.teamId && (
                            <div>
                              <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Team Details</h4>
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-3 text-sm mb-3">
                                <DetailItem label="Team Name" value={r.teamId.teamName || '—'} />
                                <DetailItem label="Leader" value={r.teamId.leaderId?.name ? `${r.teamId.leaderId.name} (${r.teamId.leaderId.email})` : '—'} />
                                <DetailItem label="Team Status" value={r.teamId.status || '—'} />
                              </div>
                              {r.teamMembers && r.teamMembers.length > 0 && (
                                <div>
                                  <span className="text-gray-400 text-xs uppercase tracking-wider">Team Members</span>
                                  <div className="mt-1.5 border border-gray-200 rounded-lg overflow-hidden">
                                    <table className="w-full text-sm">
                                      <thead><tr className="bg-gray-100">
                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">#</th>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Name</th>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Email</th>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Status</th>
                                      </tr></thead>
                                      <tbody>
                                        {r.teamMembers.map((m, idx) => (
                                          <tr key={m._id} className="border-t border-gray-100">
                                            <td className="px-4 py-2 text-gray-400">{idx + 1}</td>
                                            <td className="px-4 py-2 font-medium">
                                              {m.userId?.name || '—'}
                                              {r.teamId.leaderId?._id === m.userId?._id && (
                                                <span className="ml-2 text-xs text-amber-600 font-semibold">(Leader)</span>
                                              )}
                                            </td>
                                            <td className="px-4 py-2 text-gray-500">{m.userId?.email || '—'}</td>
                                            <td className="px-4 py-2"><span className={`badge ${m.status === 'accepted' ? 'badge-green' : m.status === 'pending' ? 'badge-yellow' : 'badge-red'}`}>{m.status}</span></td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
              {regs.length === 0 && <tr><td colSpan="7" className="text-center py-8 text-gray-400">No registrations found</td></tr>}
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

function DetailItem({ label, value, full }) {
  return (
    <div className={full ? 'md:col-span-2 lg:col-span-3' : ''}>
      <span className="text-gray-400 text-xs uppercase tracking-wider">{label}</span>
      <p className="text-gray-700 mt-0.5 break-words">{value}</p>
    </div>
  );
}
