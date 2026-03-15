import { useState, useEffect } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';

export default function AuditLogs() {
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/audit-logs', { params: { page, limit: 20 } });
      setLogs(data.data);
      setTotal(data.pages);
    } catch { toast.error('Failed to load audit logs'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchLogs(); }, [page]);

  return (
    <div>
      <h1 className="text-lg sm:text-2xl font-bold mb-6">Audit Logs</h1>

      {loading ? <div className="text-center py-12 text-gray-400">Loading...</div> : (
        <div className="card overflow-hidden p-0 overflow-x-auto">
          <table className="w-full text-sm min-w-[400px]">
            <thead><tr className="table-header">
              <th className="px-5 py-3">Admin</th><th className="px-5 py-3">Action</th><th className="px-5 py-3 hidden sm:table-cell">Target</th><th className="px-5 py-3 hidden md:table-cell">IP Address</th><th className="px-5 py-3">Time</th>
            </tr></thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log._id} className="border-t border-gray-100 hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3 font-medium">{log.adminId?.name || '—'}</td>
                  <td className="px-5 py-3"><span className="badge badge-blue">{log.action}</span></td>
                  <td className="px-5 py-3 text-gray-500 text-xs font-mono hidden sm:table-cell">{log.targetId || '—'}</td>
                  <td className="px-5 py-3 text-gray-400 text-xs hidden md:table-cell">{log.ipAddress || '—'}</td>
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
