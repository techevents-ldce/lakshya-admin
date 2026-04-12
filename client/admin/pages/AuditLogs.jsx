import { useState, useEffect } from 'react';
import api from '../services/api';
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
    // Audit logs sometimes use 'timestamp' or 'createdAt'
    const rawDate = d || null;
    if (!rawDate) return { date: '—', time: '—' };
    
    const date = new Date(rawDate);
    if (isNaN(date.getTime())) return { date: 'ERR', time: 'INVALID' };
    
    return {
      date: date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase(),
      time: date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }).toUpperCase()
    };
  };

  return (
    <div className="animate-fade-in space-y-10 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 pb-10 border-b border-white/[0.05]">
        <div>
          <div className="flex items-center gap-4 mb-3">
             <h1 className="text-3xl font-black text-white tracking-tighter uppercase leading-none">Security Audit Logs</h1>
             <span className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-[9px] font-black text-emerald-400 tracking-[0.2em] flex items-center gap-2">
                <HiOutlineShieldCheck className="w-4 h-4" /> SECURE_NODE
             </span>
          </div>
          <p className="text-slate-500 font-medium">Immutable registry of administrative interactions and payment transactions</p>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-4 bg-slate-900/40 p-3 rounded-2xl border border-slate-700/30 backdrop-blur-xl transition-all shadow-2xl">
        <div className="relative group flex-1">
          <HiOutlineSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-primary-400 w-5 h-5 transition-colors" />
          <input 
            type="text" 
            placeholder="Search log references..." 
            value={search} 
            onChange={(e) => { setSearch(e.target.value); setPage(1); }} 
            className="input-field pl-12" 
          />
        </div>
        <div className="flex items-center gap-3 px-4">
          <div className="h-8 w-px bg-slate-800 hidden lg:block"></div>
          <div className="flex items-center gap-2 group px-4 py-2 hover:bg-white/[0.02] rounded-xl transition-all cursor-pointer">
             <HiOutlineFilter className="w-4 h-4 text-slate-500 group-hover:text-primary-400" />
             <select 
               value={statusFilter} 
               onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} 
               className="bg-transparent text-[10px] font-black text-slate-400 uppercase tracking-widest outline-none cursor-pointer"
             >
               <option value="" className="bg-slate-900">All Levels</option>
               {statusOptions.map((s) => <option key={s} value={s} className="bg-slate-900">{s}</option>)}
             </select>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-40 gap-6">
          <HiOutlineRefresh className="w-12 h-12 text-primary-500 animate-spin" />
          <p className="text-[11px] font-black text-slate-600 uppercase tracking-[0.4em] animate-pulse">Scanning Registry...</p>
        </div>
      ) : (
        <div className="card !p-0 border-slate-700/30 overflow-hidden shadow-2xl bg-slate-900/20 backdrop-blur-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-white/[0.01]">
                  <th className="px-8 py-6 text-[10px] font-black text-slate-600 uppercase tracking-widest">Protocol ID</th>
                  <th className="px-8 py-6 text-[10px] font-black text-slate-600 uppercase tracking-widest">Resource Link</th>
                  <th className="px-8 py-6 text-[10px] font-black text-slate-600 uppercase tracking-widest hidden sm:table-cell">Transaction Key</th>
                  <th className="px-8 py-6 text-[10px] font-black text-slate-600 uppercase tracking-widest hidden md:table-cell text-center">Status</th>
                  <th className="px-8 py-6 text-[10px] font-black text-slate-600 uppercase tracking-widest text-right">Synchronization</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.02]">
                {logs.map((log) => {
                   const { date, time } = formatDate(log.createdAt || log.timestamp);
                   return (
                    <tr key={log._id} className="group hover:bg-white/[0.02] transition-all cursor-default">
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500 group-hover:text-primary-400 group-hover:border-primary-500/30 transition-all shadow-xl">
                            <HiOutlineDocumentText className="w-5 h-5" />
                          </div>
                          <div className="space-y-1">
                             <span className="text-[11px] font-black font-mono text-white group-hover:text-primary-400 transition-colors uppercase tracking-tight leading-none">{log.log_id || log._id.slice(-8)}</span>
                             <p className="text-[9px] text-slate-700 font-black uppercase tracking-widest">Entry Verfied</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                         <div className="flex items-center gap-3">
                            <span className="text-[11px] font-black font-mono text-slate-400 uppercase tracking-tighter truncate max-w-[150px] block">{log.order_id || 'GENERAL_SYSTEM'}</span>
                            <HiOutlineFingerPrint className="w-4 h-4 text-slate-800" />
                         </div>
                      </td>
                      <td className="px-8 py-6 hidden sm:table-cell">
                         <span className="text-[11px] font-black font-mono text-slate-600 uppercase tracking-widest">{log.payment_id || 'NON_TRANS'}</span>
                      </td>
                      <td className="px-8 py-6 hidden md:table-cell text-center">
                        <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${log.status === 'SUCCESS' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-blue-500/10 border-blue-500/20 text-blue-400'}`}>
                           {log.status || 'SYSTEM'}
                        </span>
                      </td>
                      <td className="px-8 py-6 text-right">
                        <div className="flex flex-col items-end gap-1.5">
                           <div className="flex items-center gap-2 text-[11px] font-black text-white uppercase tracking-tight">
                              <HiOutlineClock className="w-4 h-4 text-slate-700" />
                              {date}
                           </div>
                           <p className="text-[10px] text-slate-600 font-bold uppercase tracking-[0.2em]">{time}</p>
                        </div>
                      </td>
                    </tr>
                 );
                })}
                {logs.length === 0 && (
                  <tr>
                    <td colSpan="5" className="text-center py-40">
                       <HiOutlineExternalLink className="w-16 h-16 text-slate-800 mx-auto mb-6" />
                       <p className="text-[11px] font-black text-slate-600 uppercase tracking-[0.4em]">Registry is currently empty</p>
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
                  className={`w-12 h-12 rounded-2xl text-[11px] font-black tracking-tighter transition-all ${page === i + 1 ? 'bg-primary-500 text-white shadow-2xl scale-110' : 'bg-slate-900 text-slate-500 hover:text-white border border-slate-800'}`}
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
