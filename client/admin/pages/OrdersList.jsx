import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../src/services/api';
import toast from 'react-hot-toast';
import { 
  HiOutlineSearch, 
  HiOutlineClipboardCopy, 
  HiOutlineEye, 
  HiOutlineCurrencyRupee,
  HiOutlineFilter,
  HiOutlineCalendar,
  HiOutlineArrowsExpand,
  HiOutlineRefresh,
  HiOutlineCheckCircle,
  HiOutlineXCircle,
  HiOutlineClock,
} from 'react-icons/hi';

const STATUS_CONFIG = {
  pending: { label: 'Pending', color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20', icon: HiOutlineClock },
  payment_initiated: { label: 'Initiated', color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20', icon: HiOutlineRefresh },
  fulfilling: { label: 'Processing', color: 'text-indigo-400', bg: 'bg-indigo-500/10 border-indigo-500/20', icon: HiOutlineRefresh },
  success: { label: 'Paid', color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20', icon: HiOutlineCheckCircle },
  failed: { label: 'Failed', color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20', icon: HiOutlineXCircle },
  cancelled: { label: 'Cancelled', color: 'text-slate-500', bg: 'bg-slate-500/10 border-slate-500/20', icon: HiOutlineXCircle },
  refunded: { label: 'Refunded', color: 'text-violet-400', bg: 'bg-violet-500/10 border-violet-500/20', icon: HiOutlineRefresh },
};

export default function OrdersList() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const params = { page, limit: 20 };
      if (statusFilter) params.status = statusFilter;
      if (search) params.search = search;
      if (dateFrom) params.dateFrom = dateFrom;
      if (dateTo) params.dateTo = dateTo;
      const { data } = await api.get('/orders', { params });
      setOrders(data.orders || []);
      setTotal(data.total || 0);
      setPages(data.pages || 0);
    } catch {
      toast.error('Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchOrders(); }, [page, statusFilter, search, dateFrom, dateTo]);

  const copyToClipboard = (text) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    toast.success('ID copied to clipboard');
  };

  const formatDate = (d) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric'
    });
  };

  return (
    <div className="animate-fade-in space-y-8">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight leading-none mb-2">Orders</h1>
          <p className="text-slate-500 font-medium text-sm">{total.toLocaleString()} total orders recorded</p>
        </div>
      </div>

      {/* Control Panel */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-4 bg-slate-900 border border-white/[0.05] p-3 rounded-xl shadow-lg">
        <div className="relative w-full lg:max-w-xs group">
          <HiOutlineSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-400 w-5 h-5 transition-colors" />
          <input 
            type="text" 
            placeholder="Search by name, email, or order ID..." 
            value={search} 
            onChange={(e) => { setSearch(e.target.value); setPage(1); }} 
            className="input-field pl-12" 
          />
        </div>
        
        <div className="flex flex-wrap items-center gap-4 w-full lg:w-auto px-2">
          <div className="h-8 w-px bg-slate-800 hidden lg:block"></div>
          
          <div className="flex items-center gap-2 group px-3 py-2 hover:bg-white/[0.03] rounded-xl transition-all border border-transparent hover:border-slate-800 cursor-pointer">
             <HiOutlineFilter className="w-4 h-4 text-slate-500 group-hover:text-indigo-400" />
             <select 
               value={statusFilter} 
               onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} 
               className="bg-transparent text-xs font-semibold text-slate-400 outline-none cursor-pointer"
             >
               <option value="" className="bg-slate-900">All Status</option>
               {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                 <option key={key} value={key} className="bg-slate-900">{cfg.label}</option>
               ))}
             </select>
          </div>

          <div className="h-8 w-px bg-slate-800 hidden lg:block"></div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3 px-3 py-2 hover:bg-white/[0.03] rounded-xl transition-all border border-transparent hover:border-slate-800">
                <HiOutlineCalendar className="w-4 h-4 text-slate-500" />
                <input type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setPage(1); }} className="bg-transparent text-[11px] font-bold text-slate-500 uppercase tracking-wider outline-none cursor-pointer invert opacity-40 hover:opacity-80 transition-opacity" />
                <span className="text-slate-800 text-[10px]">→</span>
                <input type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setPage(1); }} className="bg-transparent text-[11px] font-bold text-slate-500 uppercase tracking-wider outline-none cursor-pointer invert opacity-40 hover:opacity-80 transition-opacity" />
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <HiOutlineRefresh className="w-10 h-10 text-primary-500 animate-spin" />
          <p className="text-[10px] font-bold text-slate-600 uppercase tracking-[0.2em] animate-pulse">Loading Orders...</p>
        </div>
      ) : (
        <div className="card overflow-hidden !p-0 border-slate-700/30">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-white/[0.01]">
                   <th className="px-6 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-white/[0.05]">Order ID / User</th>
                   <th className="px-6 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-white/[0.05]">Date</th>
                   <th className="px-6 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-white/[0.05]">Amount</th>
                   <th className="px-6 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-white/[0.05]">Status</th>
                   <th className="px-6 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-white/[0.05] text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.02]">
                {orders.map((order) => {
                  const cfg = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending;
                  return (
                    <tr key={order._id} className="group hover:bg-white/[0.02] transition-all cursor-default">
                      <td className="px-6 py-6">
                         <div className="flex flex-col gap-1.5">
                            <p className="text-[13px] font-bold text-white tracking-tight group-hover:text-indigo-400 transition-colors leading-none">{order.userId?.name || 'Unknown User'}</p>
                            <div className="flex items-center gap-2">
                               <p className="text-[10px] text-slate-500 font-mono tracking-widest leading-none border-b border-transparent group-hover:border-slate-800 transition-all">{order.razorpayOrderId || 'System Generation'}</p>
                               <button onClick={() => copyToClipboard(order.razorpayOrderId)} className="opacity-0 group-hover:opacity-100 p-1 rounded-md hover:bg-white/[0.05] transition-all text-slate-600 hover:text-white">
                                  <HiOutlineClipboardCopy className="w-3 h-3" />
                                </button>
                            </div>
                         </div>
                      </td>
                      <td className="px-6 py-6">
                         <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">{formatDate(order.createdAt)}</p>
                      </td>
                      <td className="px-6 py-6">
                         <div className="flex items-center gap-1.5 font-bold text-white text-[15px] tracking-tight text-emerald-400/90 tabular-nums">
                            <span className="text-xs font-medium">₹</span>
                            {Number(order.totalAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                         </div>
                      </td>
                      <td className="px-6 py-6">
                         <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest border ${cfg.bg} ${cfg.color} inline-flex items-center gap-1.5 leading-none`}>
                            <cfg.icon className="w-3.5 h-3.5" />
                            {cfg.label}
                         </span>
                      </td>
                      <td className="px-6 py-6 text-right">
                         <button 
                           onClick={() => navigate(`/orders/${order._id}`)}
                           className="w-9 h-9 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500 hover:text-white hover:border-slate-700 transition-all active:scale-95 shadow-lg"
                         >
                            <HiOutlineEye className="w-4 h-4" />
                         </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pages > 1 && (
            <div className="flex items-center justify-center gap-3 py-10 bg-white/[0.01] border-t border-white/[0.05]">
              <button 
                disabled={page === 1} 
                onClick={() => setPage(p => p - 1)} 
                className="w-10 h-10 flex items-center justify-center rounded-lg bg-slate-900 border border-slate-800 text-slate-500 hover:text-white disabled:opacity-20 disabled:pointer-events-none transition-all active:scale-95 shadow-md"
              >
                <HiOutlineArrowsExpand className="w-4 h-4 rotate-180" />
              </button>
              <div className="flex gap-2">
                {[...Array(pages)].map((_, i) => (
                  <button 
                    key={i} 
                    onClick={() => setPage(i + 1)} 
                    className={`w-10 h-10 rounded-lg text-xs font-bold transition-all ${page === i + 1 ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-900 text-slate-500 hover:text-white border border-white/[0.05]'}`}
                  >
                    {(i + 1).toString().padStart(2, '0')}
                  </button>
                ))}
              </div>
              <button 
                disabled={page === pages} 
                onClick={() => setPage(p => p + 1)} 
                className="w-10 h-10 flex items-center justify-center rounded-lg bg-slate-900 border border-slate-800 text-slate-500 hover:text-white disabled:opacity-20 disabled:pointer-events-none transition-all active:scale-95 shadow-md"
              >
                <HiOutlineArrowsExpand className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
