import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';
import {
  HiOutlineChevronLeft,
  HiOutlineCheckCircle,
  HiOutlineXCircle,
  HiOutlineClock,
  HiOutlineTicket,
  HiOutlineArrowsExpand,
  HiOutlineRefresh,
  HiOutlineCurrencyRupee,
  HiOutlineShieldCheck,
  HiOutlineInformationCircle,
  HiOutlineUser,
  HiOutlineLightningBolt,
  HiOutlineHashtag,
  HiOutlineCalendar,
} from 'react-icons/hi';

const STATUS_CONFIG = {
  success: { label: 'Paid', color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/30', icon: HiOutlineCheckCircle },
  failed: { label: 'Failed', color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/30', icon: HiOutlineXCircle },
  pending: { label: 'Pending', color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/30', icon: HiOutlineClock },
  created: { label: 'Created', color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/30', icon: HiOutlineLightningBolt },
};

export default function OrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const { data } = await api.get(`/orders/${id}`);
        setOrder(data.data);
      } catch {
        toast.error('Failed to load order details');
        navigate('/orders');
      } finally {
        setLoading(false);
      }
    };
    fetchOrder();
  }, [id, navigate]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
        <HiOutlineRefresh className="w-12 h-12 text-primary-500 animate-spin" />
        <p className="text-[11px] font-black text-slate-600 uppercase tracking-[0.4em] animate-pulse">Loading Order Details...</p>
      </div>
    );
  }

  if (!order) return null;

  const cfg = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending;
  const StatusIcon = cfg.icon;

  const formatDate = (date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    }).toUpperCase();
  };

  return (
    <div className="animate-fade-in space-y-10 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 border-b border-white/[0.05] pb-10">
        <div className="flex items-center gap-6">
          <button
            onClick={() => navigate('/orders')}
            className="w-14 h-14 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500 hover:text-white hover:border-slate-700 transition-all shadow-2xl active:scale-95 group"
          >
            <HiOutlineChevronLeft className="w-6 h-6 group-hover:-translate-x-1 transition-transform" />
          </button>
          <div>
            <div className="flex items-center gap-3 mb-2">
               <HiOutlineHashtag className="w-4 h-4 text-primary-500" />
               <h1 className="text-3xl font-black text-white uppercase tracking-tighter leading-none">Order Details</h1>
            </div>
            <p className="text-[10px] text-slate-600 font-bold uppercase tracking-[0.3em]">Razorpay Order ID: <span className="text-slate-400">{order.razorpayOrderId || 'System Generated'}</span></p>
          </div>
        </div>
        <div className={`inline-flex items-center gap-3 px-6 py-3 rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] border shadow-2xl ${cfg.bg} ${cfg.color}`}>
          <StatusIcon className="w-5 h-5" />
          {cfg.label}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2 space-y-10">
          <div className="card space-y-10 border-slate-700/30 relative overflow-hidden bg-slate-900/40 backdrop-blur-3xl shadow-2xl p-8 rounded-[2.5rem]">
             <div className="absolute top-0 right-0 w-96 h-96 bg-primary-500/5 blur-[120px] pointer-events-none"></div>
             
             <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-8">
                <div className="flex items-center gap-6">
                   <div className="w-20 h-20 rounded-[2.5rem] bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-white shadow-2xl shadow-primary-900/50 rotate-6 hover:rotate-0 transition-transform duration-700">
                      <HiOutlineCurrencyRupee className="w-10 h-10" />
                   </div>
                   <div>
                      <p className="text-[11px] font-black text-slate-500 uppercase tracking-[0.3em] mb-2 font-mono">Amount Paid</p>
                      <p className="text-5xl font-black text-white tracking-tighter tabular-nums">₹{Number(order.totalAmount || order.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
                   </div>
                </div>
                {order.status === 'success' && (
                  <div className="bg-emerald-500/10 border border-emerald-500/20 p-6 rounded-[2rem] text-right group">
                     <p className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.4em] mb-2 leading-none">PAYMENT SUCCESSFUL</p>
                     <p className="text-[11px] text-slate-400 font-black uppercase tracking-widest font-mono group-hover:text-white transition-colors">{formatDate(order.paidAt)}</p>
                  </div>
                )}
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-12 pt-10 border-t border-white/[0.05]">
                <div className="space-y-6">
                   <h3 className="text-[11px] font-black text-slate-600 uppercase tracking-[0.3em] flex items-center gap-3">
                     <HiOutlineUser className="w-5 h-5 text-primary-500" /> User Profile
                   </h3>
                   <div className="p-8 rounded-[2rem] bg-white/[0.02] border border-white/[0.05] hover:border-primary-500/40 hover:bg-white/[0.04] transition-all cursor-pointer group shadow-xl" onClick={() => navigate(`/users/${order.userId?._id}`)}>
                      <p className="text-xl font-black text-white uppercase tracking-tighter group-hover:text-primary-400 transition-colors mb-2">{order.userId?.name || 'Unknown User'}</p>
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest border-b border-white/[0.05] pb-3 mb-4">{order.userId?.email || 'No Email'}</p>
                      <div className="flex items-center gap-3">
                         <div className="w-1.5 h-1.5 rounded-full bg-slate-700 group-hover:bg-primary-500 transition-colors"></div>
                         <p className="text-[10px] text-slate-600 font-black uppercase tracking-widest leading-none">{order.userId?.college || 'No College'}</p>
                      </div>
                   </div>
                </div>

                <div className="space-y-6">
                   <h3 className="text-[11px] font-black text-slate-600 uppercase tracking-[0.3em] flex items-center gap-3">
                     <HiOutlineTicket className="w-5 h-5 text-violet-500" /> Registrations
                   </h3>
                   <div className="space-y-4">
                      {order.registrationIds?.map((reg, idx) => (
                        <div key={idx} className="p-6 rounded-[1.5rem] bg-white/[0.02] border border-white/[0.05] flex items-center justify-between hover:border-violet-500/40 hover:bg-white/[0.04] transition-all cursor-pointer group shadow-xl" onClick={() => navigate(`/registrations/${reg._id}`)}>
                           <div>
                              <p className="text-xs font-black text-white uppercase tracking-widest group-hover:text-violet-400 transition-colors mb-1.5">{reg.eventId?.title || 'Unknown Event'}</p>
                              <div className="flex items-center gap-2">
                                 <span className="w-1 h-1 rounded-full bg-slate-700"></span>
                                 <p className="text-[10px] text-slate-600 font-bold uppercase tracking-tight">{reg.teamName || 'Solo Participation'}</p>
                              </div>
                           </div>
                           <HiOutlineArrowsExpand className="w-5 h-5 text-slate-800 group-hover:text-violet-400 transform group-hover:scale-110 transition-all" />
                        </div>
                      ))}
                      {!order.registrationIds?.length && (
                        <div className="p-6 rounded-2xl border border-dashed border-slate-800 text-center">
                           <p className="text-[10px] font-black text-slate-700 uppercase tracking-widest">No Linked Registrations</p>
                        </div>
                      )}
                   </div>
                </div>
             </div>
          </div>

          <div className="card space-y-8 border-slate-700/30 p-8 rounded-[2.5rem] bg-slate-900/40 backdrop-blur-xl">
             <h3 className="text-[11px] font-black text-slate-600 uppercase tracking-[0.3em] flex items-center gap-4">
               <HiOutlineShieldCheck className="w-5 h-5 text-emerald-500" /> Transaction Support Info
             </h3>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-3 p-6 rounded-2xl bg-slate-950/50 border border-slate-800 group hover:border-slate-700 transition-all">
                   <p className="text-[9px] font-black text-slate-700 uppercase tracking-[0.3em] border-b border-white/[0.02] pb-2">System ID</p>
                   <p className="text-[11px] font-mono text-slate-400 font-bold group-hover:text-white transition-colors">{order._id}</p>
                </div>
                <div className="space-y-3 p-6 rounded-2xl bg-slate-950/50 border border-slate-800 group hover:border-slate-700 transition-all">
                   <p className="text-[9px] font-black text-slate-700 uppercase tracking-[0.3em] border-b border-white/[0.02] pb-2">Razorpay Payment ID</p>
                   <p className="text-[11px] font-mono text-slate-400 font-bold group-hover:text-white transition-colors">{order.razorpayPaymentId || 'Pending'}</p>
                </div>
             </div>
          </div>
        </div>

        <div className="space-y-8">
           <div className="card space-y-8 border-slate-700/30 p-8 rounded-[2.5rem] bg-slate-900/40 backdrop-blur-xl shadow-2xl">
              <h3 className="text-[11px] font-black text-slate-600 uppercase tracking-[0.3em] flex items-center gap-3">
                 <HiOutlineCalendar className="w-5 h-5 text-amber-500" /> Order History
              </h3>
              <div className="space-y-6">
                 <div className="space-y-3 p-6 rounded-[1.5rem] bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.04] transition-all">
                    <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest block mb-2">Order Created</span>
                    <span className="text-[11px] font-black text-white uppercase tracking-widest font-mono">{formatDate(order.createdAt)}</span>
                 </div>
                 <div className="space-y-3 p-6 rounded-[1.5rem] bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.04] transition-all">
                    <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest block mb-2">Last Updated</span>
                    <span className="text-[11px] font-black text-white uppercase tracking-widest font-mono">{formatDate(order.updatedAt)}</span>
                 </div>
              </div>
           </div>

           <div className="p-8 rounded-[2.5rem] bg-primary-500/[0.03] border border-primary-500/20 space-y-6 relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-32 h-32 bg-primary-500/10 blur-3xl pointer-events-none"></div>
              <h4 className="text-[12px] font-black text-primary-400 uppercase tracking-[0.4em] flex items-center gap-3 pb-4 border-b border-primary-500/20">
                <HiOutlineInformationCircle className="w-5 h-5 animate-pulse" /> Help & Support
              </h4>
              <p className="text-[10px] text-slate-500 font-bold leading-relaxed uppercase tracking-[0.1em] group-hover:text-slate-300 transition-colors">
                Order records are linked to Razorpay payments. For discrepancies, please check the Razorpay dashboard or contact support.
              </p>
              <div className="flex justify-end pt-4 opacity-20 group-hover:opacity-100 transition-opacity">
                 <HiOutlineRefresh className="w-5 h-5 text-primary-500" />
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}
