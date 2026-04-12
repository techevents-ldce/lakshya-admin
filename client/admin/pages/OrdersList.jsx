import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
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
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tighter uppercase mb-1">Orders</h1>
          <p className="text-slate-500 font-medium">{total.toLocaleString()} total orders found</p>
        </div>
      </div>

      {/* Control Panel */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-4 bg-slate-900/40 p-3 rounded-2xl border border-slate-700/30 backdrop-blur-xl">
        <div className="relative w-full lg:max-w-xs group">
          <HiOutlineSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-primary-400 w-5 h-5 transition-colors" />
          <input 
            type="text" 
            placeholder="Search by Order ID or name..." 
            value={search} 
            onChange={(e) => { setSearch(e.target.value); setPage(1); }} 
            className="input-field pl-12" 
          />
        </div>
        
        <div className="flex flex-wrap items-center gap-4 w-full lg:w-auto px-2">
          <div className="h-8 w-px bg-slate-800 hidden lg:block"></div>
          
          <div className="flex items-center gap-2 group px-3 py-2 hover:bg-white/[0.02] rounded-xl transition-all cursor-pointer">
             <HiOutlineFilter className="w-4 h-4 text-slate-500 group-hover:text-primary-400" />
             <select 
               value={statusFilter} 
               onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} 
               className="bg-transparent text-[10px] font-black text-slate-400 uppercase tracking-widest outline-none cursor-pointer"
             >
               <option value="" className="bg-slate-900">All Status</option>
               {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                 <option key={key} value={key} className="bg-slate-900">{cfg.label}</option>
               ))}
             </select>
          </div>

          <div className="h-8 w-px bg-slate-800 hidden lg:block"></div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3 px-3 py-2 hover:bg-white/[0.02] rounded-xl transition-all">
                <HiOutlineCalendar className="w-4 h-4 text-slate-500" />
                <input type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setPage(1); }} className="bg-transparent text-[10px] font-black text-slate-500 uppercase tracking-widest outline-none cursor-pointer invert opacity-60 hover:opacity-100 transition-opacity" />
                <span className="text-slate-800 text-[10px]">→</span>
                <input type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setPage(1); }} className="bg-transparent text-[10px] font-black text-slate-500 uppercase tracking-widest outline-none cursor-pointer invert opacity-60 hover:opacity-100 transition-opacity" />
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <HiOutlineRefresh className="w-10 h-10 text-primary-500 animate-spin" />
          <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] animate-pulse">Loading Orders...</p>
        </div>
      ) : (
        <div className="card overflow-hidden !p-0 border-slate-700/30">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-white/[0.01]">
                   <th className="px-6 py-5 text-[9px] font-black text-slate-600 uppercase tracking-widest">Order ID / User</th>
                   <th className="px-6 py-5 text-[9px] font-black text-slate-600 uppercase tracking-widest">Date</th>
                   <th className="px-6 py-5 text-[9px] font-black text-slate-600 uppercase tracking-widest">Amount</th>
                   <th className="px-6 py-5 text-[9px] font-black text-slate-600 uppercase tracking-widest">Status</th>
                   <th className="px-6 py-5 text-[9px] font-black text-slate-600 uppercase tracking-widest text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.02]">
                {orders.map((order) => {
                  const cfg = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending;
                  return (
                    <tr key={order._id} className="group hover:bg-white/[0.02] transition-all cursor-default">
                      <td className="px-6 py-5">
                         <div className="flex flex-col gap-1">
                            <p className="text-xs font-black text-white uppercase tracking-tight group-hover:text-primary-400 transition-colors">{order.userId?.name || 'Unknown User'}</p>
                            <div className="flex items-center gap-2">
                               <p className="text-[9px] text-slate-500 font-mono tracking-tight">{order.razorpayOrderId || 'System'}</p>
                               <button onClick={() => copyToClipboard(order.razorpayOrderId)} className="opacity-0 group-hover:opacity-100 p-1 rounded-md hover:bg-white/[0.05] transition-all text-slate-600 hover:text-white">
                                  <HiOutlineClipboardCopy className="w-3 h-3" />
                                </button>
                            </div>
                         </div>
                      </td>
                      <td className="px-6 py-5">
                         <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{formatDate(order.createdAt)}</p>
                      </td>
                      <td className="px-6 py-5">
                         <div className="flex items-center gap-1.5 font-black text-white text-sm tracking-tight text-emerald-400">
                            <HiOutlineCurrencyRupee className="w-4 h-4" />
                            {Number(order.totalAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                         </div>
                      </td>
                      <td className="px-6 py-5">
                         <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border ${cfg.bg} ${cfg.color} inline-flex items-center gap-1.5`}>
                            <cfg.icon className="w-3 h-3" />
                            {cfg.label}
                         </span>
                      </td>
                      <td className="px-6 py-5 text-right">
                         <button 
                           onClick={() => navigate(`/orders/${order._id}`)}
                           className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500 hover:text-white hover:border-slate-700 transition-all inline-flex shadow-xl"
                         >
                            <HiOutlineEye className="w-5 h-5" />
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
            <div className="flex items-center justify-center gap-4 py-8 bg-white/[0.01] border-t border-white/[0.05]">
              <button 
                disabled={page === 1} 
                onClick={() => setPage(p => p - 1)} 
                className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-900 border border-slate-800 text-slate-500 hover:text-white disabled:opacity-20 disabled:pointer-events-none transition-all shadow-xl"
              >
                <HiOutlineArrowsExpand className="w-5 h-5 rotate-180" />
              </button>
              <div className="flex gap-2">
                {[...Array(pages)].map((_, i) => (
                  <button 
                    key={i} 
                    onClick={() => setPage(i + 1)} 
                    className={`w-10 h-10 rounded-xl text-[10px] font-black uppercase tracking-tighter transition-all ${page === i + 1 ? 'bg-primary-500 text-white shadow-lg shadow-primary-900/40 scale-110 z-10' : 'bg-slate-900 text-slate-500 hover:text-white border border-slate-800'}`}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>
              <button 
                disabled={page === pages} 
                onClick={() => setPage(p => p + 1)} 
                className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-900 border border-slate-800 text-slate-500 hover:text-white disabled:opacity-20 disabled:pointer-events-none transition-all shadow-xl"
              >
                <HiOutlineArrowsExpand className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
