import { useState, useEffect } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { HiOutlineSearch, HiOutlineCheckCircle, HiOutlineBan, HiOutlineClipboardCopy, HiOutlineUserGroup, HiOutlineViewList, HiOutlineViewBoards } from 'react-icons/hi';

const STATUS_LABELS = { valid: 'Active', used: 'Used', cancelled: 'Cancelled' };
const STATUS_COLORS = { valid: 'badge-green', used: 'badge-blue', cancelled: 'badge-red' };

export default function TicketsList() {
  const [tickets, setTickets] = useState([]);
  const [events, setEvents] = useState([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [eventFilter, setEventFilter] = useState('');
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState('flat'); // 'flat' or 'team'

  useEffect(() => {
    api.get('/events', { params: { limit: 200 } }).then(({ data }) => setEvents(data.events || [])).catch(() => {});
  }, []);

  const fetchTickets = async () => {
    setLoading(true);
    try {
      const params = { page, limit: 40 };
      if (statusFilter) params.status = statusFilter;
      if (eventFilter) params.eventId = eventFilter;
      if (search) params.search = search;
      const { data } = await api.get('/tickets', { params });
      setTickets(data.tickets || []);
      setTotal(data.total || 0);
      setPages(data.pages || 0);
    } catch { toast.error('Failed to load tickets'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchTickets(); }, [page, statusFilter, eventFilter, search]);

  const handleMarkUsed = async (ticketDbId) => {
    try {
      await api.patch(`/tickets/${ticketDbId}/mark-used`);
      toast.success('Ticket marked as used');
      fetchTickets();
    } catch (err) { toast.error(err.userMessage || 'Failed'); }
  };

  const handleCancel = async (ticketDbId) => {
    try {
      await api.patch(`/tickets/${ticketDbId}/cancel`);
      toast.success('Ticket cancelled');
      fetchTickets();
    } catch (err) { toast.error(err.userMessage || 'Failed'); }
  };

  const copyToClipboard = (text) => { navigator.clipboard.writeText(text); toast.success('Copied'); };

  // Group tickets by team for "team" view
  const groupedByTeam = () => {
    const teamTickets = [];
    const soloTickets = [];
    const teamMap = {};

    tickets.forEach((t) => {
      if (t.team) {
        const teamId = t.team._id;
        if (!teamMap[teamId]) {
          teamMap[teamId] = {
            team: t.team,
            event: t.eventId,
            tickets: [],
          };
        }
        teamMap[teamId].tickets.push(t);
      } else {
        soloTickets.push(t);
      }
    });

    Object.values(teamMap).forEach((g) => teamTickets.push(g));
    return { teamTickets, soloTickets };
  };

  const { teamTickets, soloTickets } = viewMode === 'team' ? groupedByTeam() : { teamTickets: [], soloTickets: [] };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-3">
        <div>
          <h1 className="text-lg sm:text-2xl font-bold text-gray-900">Tickets</h1>
          <p className="text-sm text-gray-500 mt-1">{total} total tickets</p>
        </div>
        <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
          <button onClick={() => setViewMode('flat')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${viewMode === 'flat' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>
            <HiOutlineViewList className="w-4 h-4" /> Flat View
          </button>
          <button onClick={() => setViewMode('team')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${viewMode === 'team' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>
            <HiOutlineViewBoards className="w-4 h-4" /> Team View
          </button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-6 flex-wrap">
        <div className="relative w-full sm:max-w-xs">
          <HiOutlineSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input type="text" placeholder="Search by ticket ID, name, email..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="input-field pl-10" />
        </div>
        <select value={eventFilter} onChange={(e) => { setEventFilter(e.target.value); setPage(1); }} className="input-field w-full sm:w-auto sm:min-w-[160px]">
          <option value="">All Events</option>
          {events.map((ev) => <option key={ev._id} value={ev._id}>{ev.title}</option>)}
        </select>
        <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} className="input-field w-full sm:w-auto sm:min-w-[140px]">
          <option value="">All Status</option>
          <option value="valid">Active</option>
          <option value="used">Used</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600"></div></div>
      ) : viewMode === 'flat' ? (
        /* ── Flat View ── */
        <div className="card overflow-hidden p-0 overflow-x-auto">
          <table className="w-full text-sm min-w-[700px]">
            <thead><tr className="table-header">
              <th className="px-4 py-3">Ticket ID</th>
              <th className="px-4 py-3">User</th>
              <th className="px-4 py-3">Event</th>
              <th className="px-4 py-3">Team</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 hidden md:table-cell">Scanned At</th>
              <th className="px-4 py-3">Actions</th>
            </tr></thead>
            <tbody>
              {tickets.map((t) => (
                <tr key={t._id} className="border-t border-gray-100 hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-xs">{t.ticketId?.slice(0, 12)}...</span>
                      <button onClick={() => copyToClipboard(t.ticketId)} className="text-gray-400 hover:text-gray-600"><HiOutlineClipboardCopy className="w-3.5 h-3.5" /></button>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium">{t.userId?.name || 'N/A'}</div>
                    <div className="text-xs text-gray-500">{t.userId?.email || ''}</div>
                  </td>
                  <td className="px-4 py-3">{t.eventId?.title || 'N/A'}</td>
                  <td className="px-4 py-3">
                    {t.team ? (
                      <div className="flex items-center gap-1 text-xs">
                        <HiOutlineUserGroup className="w-3.5 h-3.5 text-blue-500" />
                        <span className="font-medium text-blue-700">{t.team.teamName}</span>
                      </div>
                    ) : <span className="text-gray-300 text-xs">Solo</span>}
                  </td>
                  <td className="px-4 py-3"><span className={`badge ${STATUS_COLORS[t.status]}`}>{STATUS_LABELS[t.status]}</span></td>
                  <td className="px-4 py-3 text-xs text-gray-500 hidden md:table-cell">{t.scannedAt ? new Date(t.scannedAt).toLocaleString() : '—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {t.status === 'valid' && (
                        <>
                          <button onClick={() => handleMarkUsed(t._id)} className="text-emerald-600 hover:text-emerald-800 text-xs font-medium flex items-center gap-0.5"><HiOutlineCheckCircle className="w-3.5 h-3.5" /> Use</button>
                          <button onClick={() => handleCancel(t._id)} className="text-red-600 hover:text-red-800 text-xs font-medium flex items-center gap-0.5"><HiOutlineBan className="w-3.5 h-3.5" /> Cancel</button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {tickets.length === 0 && <tr><td colSpan="7" className="text-center py-8 text-gray-400">No tickets found</td></tr>}
            </tbody>
          </table>
          {pages > 1 && (
            <div className="flex flex-wrap items-center justify-center gap-2 py-4 border-t border-gray-100">
              {Array.from({ length: Math.min(pages, 10) }, (_, i) => (
                <button key={i} onClick={() => setPage(i + 1)} className={`w-8 h-8 rounded-lg text-sm font-medium ${page === i + 1 ? 'bg-primary-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>{i + 1}</button>
              ))}
              {pages > 10 && <span className="text-gray-400 text-sm">...{pages} pages</span>}
            </div>
          )}
        </div>
      ) : (
        /* ── Team View ── */
        <div className="space-y-6">
          {teamTickets.length > 0 && (
            <>
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Team Tickets</h2>
              {teamTickets.map((group) => (
                <div key={group.team._id} className="card p-0 overflow-hidden">
                  <div className="flex items-center justify-between px-5 py-3 bg-blue-50 border-b border-blue-100">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center">
                        <HiOutlineUserGroup className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <span className="font-semibold text-gray-900">{group.team.teamName}</span>
                        <span className="text-xs text-gray-500 ml-2">• {group.event?.title || 'N/A'}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">{group.tickets.length} members</span>
                      {group.team.leaderId && <span className="text-[10px] text-blue-600 font-medium">Leader: {group.team.leaderId.name}</span>}
                    </div>
                  </div>
                  <table className="w-full text-sm">
                    <tbody>
                      {group.tickets.map((t) => (
                        <tr key={t._id} className="border-t border-gray-100 hover:bg-gray-50 transition-colors">
                          <td className="px-5 py-2.5 w-[180px]">
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono text-xs">{t.ticketId?.slice(0, 12)}...</span>
                              <button onClick={() => copyToClipboard(t.ticketId)} className="text-gray-400 hover:text-gray-600"><HiOutlineClipboardCopy className="w-3 h-3" /></button>
                            </div>
                          </td>
                          <td className="px-5 py-2.5">
                            <span className="font-medium text-sm">{t.userId?.name || 'N/A'}</span>
                            {t.userId?._id?.toString() === group.team.leaderId?._id?.toString() && (
                              <span className="ml-1.5 text-[10px] text-blue-600 font-bold">LEADER</span>
                            )}
                          </td>
                          <td className="px-5 py-2.5"><span className={`badge ${STATUS_COLORS[t.status]}`}>{STATUS_LABELS[t.status]}</span></td>
                          <td className="px-5 py-2.5 text-xs text-gray-500">{t.scannedAt ? new Date(t.scannedAt).toLocaleString() : '—'}</td>
                          <td className="px-5 py-2.5">
                            {t.status === 'valid' && (
                              <div className="flex items-center gap-2">
                                <button onClick={() => handleMarkUsed(t._id)} className="text-emerald-600 hover:text-emerald-800 text-xs font-medium">Use</button>
                                <button onClick={() => handleCancel(t._id)} className="text-red-600 hover:text-red-800 text-xs font-medium">Cancel</button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </>
          )}

          {soloTickets.length > 0 && (
            <>
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mt-6">Individual Tickets</h2>
              <div className="card overflow-hidden p-0 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="table-header">
                    <th className="px-4 py-3">Ticket ID</th>
                    <th className="px-4 py-3">User</th>
                    <th className="px-4 py-3">Event</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 hidden sm:table-cell">Scanned</th>
                    <th className="px-4 py-3">Actions</th>
                  </tr></thead>
                  <tbody>
                    {soloTickets.map((t) => (
                      <tr key={t._id} className="border-t border-gray-100 hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-xs">{t.ticketId?.slice(0, 12)}...</span>
                            <button onClick={() => copyToClipboard(t.ticketId)} className="text-gray-400 hover:text-gray-600"><HiOutlineClipboardCopy className="w-3.5 h-3.5" /></button>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-medium">{t.userId?.name || 'N/A'}</div>
                          <div className="text-xs text-gray-500">{t.userId?.email || ''}</div>
                        </td>
                        <td className="px-4 py-3">{t.eventId?.title || 'N/A'}</td>
                        <td className="px-4 py-3"><span className={`badge ${STATUS_COLORS[t.status]}`}>{STATUS_LABELS[t.status]}</span></td>
                        <td className="px-4 py-3 text-xs text-gray-500 hidden sm:table-cell">{t.scannedAt ? new Date(t.scannedAt).toLocaleString() : '—'}</td>
                        <td className="px-4 py-3">
                          {t.status === 'valid' && (
                            <div className="flex items-center gap-2">
                              <button onClick={() => handleMarkUsed(t._id)} className="text-emerald-600 hover:text-emerald-800 text-xs font-medium">Use</button>
                              <button onClick={() => handleCancel(t._id)} className="text-red-600 hover:text-red-800 text-xs font-medium">Cancel</button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {teamTickets.length === 0 && soloTickets.length === 0 && (
            <div className="card text-center py-12 text-gray-400">No tickets found</div>
          )}

          {pages > 1 && (
            <div className="flex flex-wrap items-center justify-center gap-2 py-4">
              {Array.from({ length: Math.min(pages, 10) }, (_, i) => (
                <button key={i} onClick={() => setPage(i + 1)} className={`w-8 h-8 rounded-lg text-sm font-medium ${page === i + 1 ? 'bg-primary-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>{i + 1}</button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
