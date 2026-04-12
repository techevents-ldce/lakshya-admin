import { useState, useEffect } from 'react';
import api from '../../src/services/api';
import toast from 'react-hot-toast';
import { 
  HiOutlineSearch, 
  HiOutlineDocumentText,
  HiOutlineFilter,
  HiOutlineFingerPrint,
  HiOutlineRefresh,
  HiOutlineShieldCheck,
  HiOutlineClock,
  HiOutlineExternalLink,
} from 'react-icons/hi';

export default function AuditLogs() {
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [statusOptions, setStatusOptions] = useState([]);
  const [loading, setLoading] = useState(true);

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

  const formatDate = (d) => {
    const rawDate = d || null;
    if (!rawDate) return { date: '—', time: '—' };
    
    const date = new Date(rawDate);
    if (isNaN(date.getTime())) return { date: 'ERR', time: 'INVALID' };
    
    return {
      date: date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
      time: date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    };
  };

  return (
    <div className="animate-fade-in space-y-10 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 pb-10 border-b border-white/[0.05]">
        <div>
          <div className="flex items-center gap-4 mb-2">
             <h1 className="text-3xl font-bold text-white tracking-tight leading-none">System Audit Logs</h1>
             <span className="px-3 py-1 rounded text-[10px] font-bold text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 tracking-widest flex items-center gap-2">
                <HiOutlineShieldCheck className="w-4 h-4" /> STATUS_ACTIVE
             </span>
          </div>
          <p className="text-slate-500 font-medium text-sm">Comprehensive record of administrative actions and financial operations</p>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-4 bg-slate-900 border border-white/[0.05] p-3 rounded-xl shadow-lg">
        <div className="relative group flex-1">
          <HiOutlineSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-400 w-5 h-5 transition-colors" />
          <input 
            type="text" 
            placeholder="Search activity records..." 
            value={search} 
            onChange={(e) => { setSearch(e.target.value); setPage(1); }} 
            className="input-field pl-12" 
          />
        </div>
        <div className="flex items-center gap-3 px-4">
          <div className="h-8 w-px bg-slate-800 hidden lg:block"></div>
          <div className="flex items-center gap-2 group px-4 py-2 hover:bg-white/[0.03] rounded-xl transition-all border border-transparent hover:border-slate-800 cursor-pointer">
             <HiOutlineFilter className="w-4 h-4 text-slate-500 group-hover:text-indigo-400" />
             <select 
               value={statusFilter} 
               onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} 
               className="bg-transparent text-xs font-semibold text-slate-400 outline-none cursor-pointer"
             >
               <option value="" className="bg-slate-900">All Operations</option>
               {statusOptions.map((s) => <option key={s} value={s} className="bg-slate-900">{s}</option>)}
             </select>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-40 gap-6">
          <HiOutlineRefresh className="w-10 h-10 text-indigo-500 animate-spin" />
          <p className="text-[11px] font-bold text-slate-600 uppercase tracking-widest animate-pulse">Fetching Log Records...</p>
        </div>
      ) : (
        <div className="card !p-0 border-white/[0.05] overflow-hidden shadow-xl bg-slate-900">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-white/[0.01]">
                  <th className="px-8 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-white/[0.05]">Log Identifier</th>
                  <th className="px-8 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-white/[0.05]">Associated Resource</th>
                  <th className="px-8 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-white/[0.05] hidden sm:table-cell">Operation Key</th>
                  <th className="px-8 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-white/[0.05] hidden md:table-cell text-center">Status</th>
                  <th className="px-8 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-white/[0.05] text-right">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.02]">
                {logs.map((log) => {
                   const { date, time } = formatDate(log.createdAt || log.timestamp);
                   return (
                    <tr key={log._id} className="group hover:bg-white/[0.02] transition-colors cursor-default">
                      <td className="px-8 py-6 border-b border-white/[0.02]">
                        <div className="flex items-center gap-4">
                          <div className="w-9 h-9 rounded-lg bg-slate-950 border border-white/[0.05] flex items-center justify-center text-slate-500 group-hover:text-indigo-400 group-hover:border-indigo-500/30 transition-all shadow-lg">
                            <HiOutlineDocumentText className="w-4.5 h-4.5" />
                          </div>
                          <div className="space-y-1">
                             <span className="text-[12px] font-bold font-mono text-white group-hover:text-indigo-400 transition-colors uppercase tracking-tight leading-none">{log.log_id || (log._id && log._id.slice(-8).toUpperCase()) || 'SYSTEM'}</span>
                             <p className="text-[10px] text-slate-700 font-bold uppercase tracking-widest">Action Logged</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-6 border-b border-white/[0.02]">
                         <span className="text-[11px] font-bold font-mono text-slate-500 uppercase tracking-tight truncate max-w-[150px] block">{log.order_id || 'ID_N/A'}</span>
                      </td>
                      <td className="px-8 py-6 border-b border-white/[0.02] hidden sm:table-cell">
                         <span className="text-[11px] font-bold font-mono text-slate-600 uppercase tracking-widest">{log.payment_id || 'EXTERNAL_OP'}</span>
                      </td>
                      <td className="px-8 py-6 border-b border-white/[0.02] hidden md:table-cell text-center">
                        <span className={`px-3 py-1 rounded text-[10px] font-bold uppercase tracking-widest border ${log.status === 'SUCCESS' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400'}`}>
                           {log.status || 'SYSTEM'}
                        </span>
                      </td>
                      <td className="px-8 py-6 border-b border-white/[0.02] text-right">
                        <div className="flex flex-col items-end gap-1">
                           <div className="flex items-center gap-2 text-[11px] font-bold text-white tabular-nums">
                              <HiOutlineClock className="w-3.5 h-3.5 text-slate-700" />
                              {date}
                           </div>
                           <p className="text-[10px] text-slate-600 font-bold uppercase tracking-widest">{time}</p>
                        </div>
                      </td>
                    </tr>
                 );
                })}
                {logs.length === 0 && (
                  <tr>
                    <td colSpan="5" className="text-center py-40">
                       <div className="w-16 h-16 rounded-2xl bg-slate-950 border border-white/[0.05] flex items-center justify-center text-slate-800 mx-auto mb-6">
                            <HiOutlineExternalLink className="w-8 h-8" />
                         </div>
                         <h4 className="text-[11px] font-bold text-slate-600 uppercase tracking-widest">Archive is currently empty</h4>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          
          {total > 1 && (
            <div className="flex items-center justify-center gap-4 py-10 bg-white/[0.01] border-t border-white/[0.05]">
              {[...Array(total)].map((_, i) => (
                <button 
                  key={i} 
                  onClick={() => setPage(i + 1)} 
                  className={`w-10 h-10 rounded-lg text-xs font-bold transition-all ${page === i + 1 ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/40' : 'bg-slate-950 text-slate-500 hover:text-white border border-white/[0.05]'}`}
                >
                  {String(i + 1).padStart(2, '0')}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
