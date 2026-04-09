import { useState, useEffect } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { HiOutlineSearch } from 'react-icons/hi';

export default function AuditLogs() {
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [statusOptions, setStatusOptions] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch distinct status values for filter dropdown
  useEffect(() => {
    api.get('/audit-logs/actions').then(({ data }) => setStatusOptions(data.data || [])).catch(() => {});
  }, []);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params = { page, limit: 20 };
      if (search) params.search = search;
      if (statusFilter) params.action = statusFilter;
      const { data } = await api.get('/audit-logs', { params });
      setLogs(data.data);
      setTotal(data.pages);
    } catch { toast.error('Failed to load audit logs'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchLogs(); }, [page, search, statusFilter]);

  return (
    <div>
      <h1 className="text-lg sm:text-2xl font-bold mb-6">Audit Logs</h1>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-6 flex-wrap">
        <div className="relative w-full sm:max-w-xs">
          <HiOutlineSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input type="text" placeholder="Search by log/order/payment ID..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="input-field pl-10" />
        </div>
        <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} className="input-field w-full sm:w-auto sm:min-w-[180px]">
          <option value="">All Status</option>
          {statusOptions.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {loading ? <div className="text-center py-12 text-gray-400">Loading...</div> : (
        <div className="card overflow-hidden p-0 overflow-x-auto">
          <table className="w-full text-sm min-w-[400px]">
            <thead><tr className="table-header">
              <th className="px-5 py-3">Log ID</th><th className="px-5 py-3">Order ID</th><th className="px-5 py-3 hidden sm:table-cell">Payment ID</th><th className="px-5 py-3 hidden md:table-cell">Status</th><th className="px-5 py-3">Time</th>
            </tr></thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log._id} className="border-t border-gray-100 hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3 font-medium text-xs font-mono">{log.log_id || '—'}</td>
                  <td className="px-5 py-3 text-xs font-mono">{log.order_id || '—'}</td>
                  <td className="px-5 py-3 text-gray-500 text-xs font-mono hidden sm:table-cell">{log.payment_id || '—'}</td>
                  <td className="px-5 py-3 hidden md:table-cell"><span className="badge badge-blue">{log.status || '—'}</span></td>
                  <td className="px-5 py-3 text-gray-500 text-xs">{new Date(log.createdAt).toLocaleString()}</td>
                </tr>
              ))}
              {logs.length === 0 && <tr><td colSpan="5" className="text-center py-8 text-gray-400">No audit logs</td></tr>}
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
