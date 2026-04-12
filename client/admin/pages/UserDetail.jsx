import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';
import {
  HiOutlineChevronLeft,
  HiOutlineUserCircle,
  HiOutlineMail,
  HiOutlinePhone,
  HiOutlineOfficeBuilding,
  HiOutlineCalendar,
  HiOutlineIdentification,
  HiOutlineTicket,
  HiOutlineCreditCard,
  HiOutlineArrowRight,
  HiOutlineRefresh,
  HiOutlineShieldCheck,
  HiOutlineInformationCircle,
  HiOutlineChevronRight,
  HiOutlineAcademicCap,
  HiOutlineTrash,
} from 'react-icons/hi';
import ConfirmWithPassword from '../components/ConfirmWithPassword';
import { useAuth } from '../context/AuthContext';

export default function UserDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const isSuperadmin = currentUser?.role === 'superadmin';

  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [confirmModal, setConfirmModal] = useState({ open: false, title: '', message: '', confirmLabel: '', variant: 'warning', action: null });

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const { data } = await api.get(`/users/${id}/detail`);
        setUserData(data.data);
      } catch {
        toast.error('Failed to load user details');
        navigate('/users');
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, [id, navigate]);

  const formatDate = (date) => {
    if (!date) return 'N/A';
    const d = new Date(date);
    if (isNaN(d.getTime())) return 'INVALID DATE';
    return d.toLocaleString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    }).toUpperCase();
  };

  const handleDelete = () => {
    setConfirmModal({
      open: true,
      title: 'Delete User Permanently',
      message: `Are you sure you want to PERMANENTLY DELETE "${userData.name}"? This will also remove their registrations, tickets, and team memberships. THIS ACTION CANNOT BE UNDONE.`,
      confirmLabel: 'Permanently Delete',
      variant: 'danger',
      action: async (pw) => {
        await api.delete(`/users/${id}`, { data: { adminPassword: pw } });
        toast.success('User deleted permanently');
        navigate('/users');
      },
    });
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-40 gap-6">
        <HiOutlineRefresh className="w-12 h-12 text-primary-500 animate-spin" />
        <p className="text-[11px] font-black text-slate-500 uppercase tracking-[0.4em] animate-pulse">Synchronizing User Profile...</p>
      </div>
    );
  }

  if (!userData) return (
    <div className="flex flex-col items-center justify-center py-40 gap-4">
      <HiOutlineInformationCircle className="w-12 h-12 text-slate-800" />
      <p className="text-[11px] font-black text-slate-600 uppercase tracking-[0.4em]">User Profile Not Found</p>
      <button onClick={() => navigate('/users')} className="text-primary-500 text-[10px] font-black uppercase tracking-widest mt-4">Return to Users</button>
    </div>
  );

  const { registrations = [], orders = [] } = userData;

  return (
    <div className="animate-fade-in space-y-10 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 pb-10 border-b border-white/[0.05]">
        <div className="flex items-center gap-6">
          <button
            onClick={() => navigate('/users')}
            className="w-14 h-14 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500 hover:text-white hover:border-slate-700 transition-all shadow-2xl active:scale-95 group"
          >
            <HiOutlineChevronLeft className="w-6 h-6 group-hover:-translate-x-1 transition-transform" />
          </button>
          <div>
            <h1 className="text-3xl font-black text-white uppercase tracking-tighter leading-none mb-2">User Profile</h1>
            <p className="text-[10px] text-slate-600 font-bold uppercase tracking-[0.3em]">Protocol Reference: <span className="text-slate-400 font-mono">{userData._id}</span></p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {isSuperadmin && userData._id !== currentUser?._id && (
            <button 
              onClick={handleDelete}
              className="px-6 py-3 rounded-2xl bg-red-600/10 border border-red-500/30 text-[11px] font-black text-red-500 uppercase tracking-[0.2em] shadow-xl hover:bg-red-600 hover:text-white transition-all active:scale-95 flex items-center gap-2"
            >
              <HiOutlineTrash className="w-4 h-4" /> Permanently Delete
            </button>
          )}
          <div className="px-6 py-3 rounded-2xl bg-primary-500/10 border border-primary-500/30 text-[11px] font-black text-primary-400 uppercase tracking-[0.2em] shadow-xl">
             {userData.role} ACCESS LEVEL
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2 space-y-10">
          <div className="card space-y-10 border-slate-700/30 relative overflow-hidden bg-slate-900/40 backdrop-blur-3xl p-8 rounded-[2.5rem] shadow-2xl">
             <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary-500/5 blur-[150px] pointer-events-none"></div>
             
             <div className="flex flex-col md:flex-row items-center gap-8 relative z-10">
                <div className="w-32 h-32 rounded-[3.5rem] bg-gradient-to-br from-primary-500 to-primary-700 p-1 shadow-2xl shadow-primary-900/40 transform rotate-3 hover:rotate-0 transition-transform duration-700">
                   <div className="w-full h-full rounded-[3.4rem] bg-slate-950 flex items-center justify-center text-4xl font-black text-white uppercase tracking-tighter overflow-hidden">
                      {userData.name?.[0]}
                   </div>
                </div>
                <div className="text-center md:text-left space-y-3">
                   <h2 className="text-4xl font-black text-white uppercase tracking-tighter leading-none">{userData.name}</h2>
                   <div className="flex flex-wrap justify-center md:justify-start items-center gap-6">
                      <div className="flex items-center gap-2 text-slate-400 font-bold uppercase text-[10px] tracking-widest bg-white/[0.03] px-3 py-1.5 rounded-lg border border-white/[0.05]">
                         <HiOutlineMail className="w-4 h-4 text-primary-500" />
                         {userData.email}
                      </div>
                      <div className="flex items-center gap-2 text-slate-400 font-bold uppercase text-[10px] tracking-widest bg-white/[0.03] px-3 py-1.5 rounded-lg border border-white/[0.05]">
                         <HiOutlinePhone className="w-4 h-4 text-emerald-500" />
                         {userData.phone || 'NO CONTACT'}
                      </div>
                   </div>
                </div>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-10 pt-10 border-t border-white/[0.05]">
                <div className="space-y-6">
                   <h3 className="text-[11px] font-black text-slate-500 uppercase tracking-[0.3em] flex items-center gap-3">
                     <HiOutlineAcademicCap className="w-5 h-5 text-primary-400" /> Academic Profile
                   </h3>
                   <div className="p-8 rounded-[2rem] bg-white/[0.02] border border-white/[0.05] hover:border-primary-500/30 transition-all group shadow-xl">
                      <p className="text-lg font-black text-white uppercase tracking-tighter leading-tight group-hover:text-primary-400 transition-colors mb-4">{userData.college || 'Incomplete Profile'}</p>
                      <div className="flex items-center gap-4">
                         <span className="px-3 py-1 rounded-lg bg-slate-900 text-[9px] font-black text-slate-500 uppercase tracking-widest border border-slate-800">{userData.branch || 'N/A'}</span>
                         <span className="px-3 py-1 rounded-lg bg-slate-900 text-[9px] font-black text-slate-500 uppercase tracking-widest border border-slate-800">YEAR {userData.year || '—'}</span>
                      </div>
                   </div>
                </div>

                <div className="space-y-6">
                   <h3 className="text-[11px] font-black text-slate-500 uppercase tracking-[0.3em] flex items-center gap-3">
                     <HiOutlineShieldCheck className="w-5 h-5 text-emerald-500" /> Account Security
                   </h3>
                   <div className="p-8 rounded-[2rem] bg-slate-950/50 border border-slate-800 flex items-center justify-between group hover:border-emerald-500/30 transition-all shadow-xl">
                      <div>
                         <p className="text-[9px] font-black text-slate-700 uppercase tracking-[0.4em] mb-2 border-b border-white/[0.02] pb-2">ENCRYPTED CREDENTIALS</p>
                         <p className="text-[11px] font-mono text-slate-500 font-bold group-hover:text-white transition-colors tracking-widest">PRIVATE DATA</p>
                      </div>
                      <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-500/50 group-hover:text-emerald-500 transition-colors">
                        <HiOutlineIdentification className="w-6 h-6" />
                      </div>
                   </div>
                </div>
             </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
             <div className="card space-y-6 border-slate-700/30 p-8 rounded-[2.5rem] bg-slate-900/40 backdrop-blur-xl shadow-2xl">
                <h3 className="text-[11px] font-black text-slate-500 uppercase tracking-[0.3em] flex items-center gap-3 border-b border-white/[0.05] pb-6">
                   <HiOutlineTicket className="w-5 h-5 text-violet-500" /> Registrations ({registrations.length})
                </h3>
                <div className="space-y-4">
                   {registrations.length === 0 ? (
                     <div className="py-12 text-center opacity-20 grayscale filter">
                        <HiOutlineTicket className="w-12 h-12 mx-auto mb-4" />
                        <p className="text-[10px] font-black uppercase tracking-[0.2em]">NO DATA FOUND</p>
                     </div>
                   ) : registrations.map(reg => (
                     <div key={reg._id} className="p-5 rounded-[1.5rem] bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.05] hover:border-violet-500/30 transition-all cursor-pointer group flex items-center justify-between shadow-lg" onClick={() => navigate(`/registrations/${reg._id}`)}>
                        <div>
                           <p className="text-xs font-black text-white uppercase tracking-widest group-hover:text-violet-400 transition-colors mb-1.5">{reg.eventId?.title || 'Unknown Event'}</p>
                           <p className="text-[9px] text-slate-600 font-bold uppercase tracking-widest">{reg.teamName || 'Solo'}</p>
                        </div>
                        <HiOutlineChevronRight className="w-5 h-5 text-slate-800 group-hover:text-violet-500 transform group-hover:scale-110 transition-all" />
                     </div>
                   ))}
                </div>
             </div>

             <div className="card space-y-6 border-slate-700/30 p-8 rounded-[2.5rem] bg-slate-900/40 backdrop-blur-xl shadow-2xl">
                <h3 className="text-[11px] font-black text-slate-500 uppercase tracking-[0.3em] flex items-center gap-3 border-b border-white/[0.05] pb-6">
                   <HiOutlineCreditCard className="w-5 h-5 text-emerald-500" /> Payment History ({orders.length})
                </h3>
                <div className="space-y-4">
                   {orders.length === 0 ? (
                     <div className="py-12 text-center opacity-20 grayscale filter">
                        <HiOutlineCreditCard className="w-12 h-12 mx-auto mb-4" />
                        <p className="text-[10px] font-black uppercase tracking-[0.2em]">NO ORDERS</p>
                     </div>
                   ) : orders.map(order => (
                     <div key={order._id} className="p-5 rounded-[1.5rem] bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.05] hover:border-emerald-500/30 transition-all cursor-pointer group shadow-lg" onClick={() => navigate(`/orders/${order._id}`)}>
                        <div className="flex items-center justify-between mb-2">
                           <p className="text-[10px] font-mono text-slate-500 group-hover:text-white transition-colors">{order.razorpayOrderId || 'SYSTEM_GEN'}</p>
                           <span className="text-sm font-black text-white">₹{Number(order.totalAmount || order.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                        </div>
                        <div className="flex items-center justify-between">
                           <span className="text-[9px] text-slate-600 font-black uppercase tracking-widest font-mono">{formatDate(order.createdAt).split(' ')[0]}</span>
                           <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${order.status === 'success' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}`}>{order.status}</span>
                        </div>
                     </div>
                   ))}
                </div>
             </div>
          </div>
        </div>

        <div className="space-y-10">
           <div className="card space-y-8 border-slate-700/30 p-8 rounded-[2.5rem] bg-slate-900/40 backdrop-blur-xl shadow-2xl">
              <h3 className="text-[11px] font-black text-slate-500 uppercase tracking-[0.3em] flex items-center gap-3">
                 <HiOutlineCalendar className="w-5 h-5 text-amber-500" /> System Lifecycle
              </h3>
              <div className="space-y-6">
                 <div className="space-y-3 p-6 rounded-[1.5rem] bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.05] transition-all">
                    <span className="text-[9px] font-black text-slate-700 uppercase tracking-widest block mb-2">Registration Matrix</span>
                    <span className="text-[11px] font-black text-white uppercase tracking-widest font-mono">{formatDate(userData.createdAt)}</span>
                 </div>
                 <div className="space-y-3 p-6 rounded-[1.5rem] bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.05] transition-all">
                    <span className="text-[9px] font-black text-slate-700 uppercase tracking-widest block mb-2">Last Synchronization</span>
                    <span className="text-[11px] font-black text-white uppercase tracking-widest font-mono">{formatDate(userData.updatedAt)}</span>
                 </div>
              </div>
           </div>

           <div className="p-8 rounded-[2.5rem] bg-primary-500/[0.03] border border-primary-500/20 space-y-6 relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-32 h-32 bg-primary-500/10 blur-3xl pointer-events-none"></div>
              <h4 className="text-[12px] font-black text-primary-400 uppercase tracking-[0.4em] flex items-center gap-3 pb-4 border-b border-primary-500/20">
                <HiOutlineInformationCircle className="w-5 h-5" /> Admin Protocol
              </h4>
              <p className="text-[10px] text-slate-500 font-bold leading-relaxed uppercase tracking-[0.1em] group-hover:text-slate-300 transition-colors">
                Modification of user data via admin interface is logged. For permanent account deletion or role escalation, use the Super Admin console.
              </p>
           </div>
        </div>
      </div>
      <ConfirmWithPassword
        open={confirmModal.open}
        onClose={() => setConfirmModal((prev) => ({ ...prev, open: false }))}
        onConfirm={confirmModal.action}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmLabel={confirmModal.confirmLabel}
        variant={confirmModal.variant}
      />
    </div>
  );
}
