import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';
import { 
  HiOutlineUser, 
  HiOutlineMail, 
  HiOutlinePhone, 
  HiOutlineAcademicCap, 
  HiOutlineTag, 
  HiOutlineCalendar, 
  HiOutlineShieldCheck,
  HiOutlineArrowLeft,
  HiOutlineCurrencyRupee,
  HiOutlineUserGroup,
  HiOutlineTrash,
  HiOutlineCheckCircle,
  HiOutlineXCircle,
  HiOutlineClock,
  HiOutlineInformationCircle,
} from 'react-icons/hi';
import ConfirmWithPassword from '../components/ConfirmWithPassword';
import { useAuth } from '../context/AuthContext';

const STATUS_CONFIG = {
  confirmed: { label: 'Confirmed', color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/30' },
  pending: { label: 'Pending', color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/30' },
  cancelled: { label: 'Cancelled', color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/30' },
  waitlisted: { label: 'Waitlisted', color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/30' },
};

export default function RegistrationDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [reg, setReg] = useState(null);
  const [loading, setLoading] = useState(true);
  const [confirmModal, setConfirmModal] = useState({ open: false, title: '', message: '', confirmLabel: '', variant: 'warning', action: null });

  const fetchDetail = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/registrations/${id}`);
      setReg(data.data);
    } catch { 
      toast.error('Failed to load registration details');
      navigate('/registrations');
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchDetail(); }, [id]);

  const fmtDT = (date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    }).toUpperCase();
  };

  const handleUpdateStatus = (newStatus) => {
    const config = STATUS_CONFIG[newStatus];
    setConfirmModal({
      open: true,
      title: 'Update Status',
      message: `Are you sure you want to change the status to "${config.label}"?`,
      confirmLabel: 'UPDATE STATUS',
      variant: 'warning',
      action: async (password) => {
        await api.patch(`/registrations/${id}/status`, { status: newStatus, adminPassword: password });
        toast.success('Status updated successfully');
        fetchDetail();
      },
    });
  };

  const handleDelete = () => {
    setConfirmModal({
      open: true,
      title: 'Delete Registration',
      message: 'Warning: This action is permanent and will delete all related tickets and team member links.',
      confirmLabel: 'DELETE REGISTRATION',
      variant: 'danger',
      action: async (password) => {
        await api.delete(`/registrations/${id}`, { data: { adminPassword: password } });
        toast.success('Registration deleted');
        navigate('/registrations');
      },
    });
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-40 gap-6">
      <div className="w-16 h-16 border-4 border-primary-500/20 border-t-primary-500 rounded-full animate-spin"></div>
      <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] animate-pulse">Loading Details...</p>
    </div>
  );

  if (!reg) return null;

  const currentCfg = STATUS_CONFIG[reg.status] || STATUS_CONFIG.pending;

  return (
    <div className="animate-fade-in space-y-8">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
        <button onClick={() => navigate('/registrations')} className="flex items-center gap-2 text-slate-500 hover:text-white transition-colors group">
          <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center group-hover:bg-slate-800 transition-all">
            <HiOutlineArrowLeft className="w-5 h-5" />
          </div>
          <span className="text-[10px] font-black uppercase tracking-widest">Back to Registry</span>
        </button>

        <div className="flex flex-wrap items-center gap-3">
          {Object.entries(STATUS_CONFIG).map(([status, cfg]) => (
            <button
              key={status}
              onClick={() => handleUpdateStatus(status)}
              disabled={reg.status === status}
              className={`px-6 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all active:scale-95 disabled:opacity-30 disabled:pointer-events-none ${cfg.bg} ${cfg.color} hover:shadow-lg`}
            >
              Set {cfg.label}
            </button>
          ))}
          {user?.role === 'superadmin' && (
            <button onClick={handleDelete} className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 flex items-center justify-center hover:bg-red-500 hover:text-white transition-all shadow-xl active:scale-95">
              <HiOutlineTrash className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
        <div className="xl:col-span-8 space-y-8">
          <div className="card border-slate-700/30 overflow-hidden relative group">
             <div className="absolute top-0 right-0 w-96 h-96 bg-primary-500/5 blur-[120px] pointer-events-none group-hover:bg-primary-500/10 transition-all duration-700"></div>
             
             <div className="relative z-10 flex flex-col md:flex-row gap-10">
                <div className="flex flex-col items-center gap-6">
                   <div className="w-32 h-32 rounded-[3.5rem] bg-gradient-to-br from-primary-500 to-primary-700 p-1 shadow-2xl shadow-primary-900/40 transform rotate-6 rotate-hover transition-transform duration-500">
                      <div className="w-full h-full rounded-[3.4rem] bg-slate-950 flex items-center justify-center text-4xl font-black text-white uppercase tracking-tighter">
                         {reg.userId?.name?.[0]}
                      </div>
                   </div>
                   <div className="text-center">
                      <p className="text-[10px] font-black text-primary-500 uppercase tracking-[0.3em] mb-1">Status</p>
                      <span className={`px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${currentCfg.bg} ${currentCfg.color}`}>
                         {currentCfg.label}
                      </span>
                   </div>
                </div>

                <div className="flex-1 space-y-10">
                   <div>
                      <h2 className="text-4xl font-black text-white uppercase tracking-tighter leading-none mb-4">{reg.userId?.name}</h2>
                      <p className="text-[11px] font-black text-slate-500 uppercase tracking-[0.4em] flex items-center gap-2">
                         <span className="w-2 h-2 rounded-full bg-primary-500 animate-pulse"></span>
                         Registration ID: {reg._id}
                      </p>
                   </div>

                   <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <DetailBlock icon={HiOutlineMail} label="Email Address" value={reg.userId?.email} />
                      <DetailBlock icon={HiOutlinePhone} label="Phone Number" value={reg.userId?.phone || 'Not provided'} />
                      <DetailBlock icon={HiOutlineAcademicCap} label="College Name" value={reg.userId?.college || 'Not specified'} />
                      <DetailBlock icon={HiOutlineTag} label="Branch / Year" value={reg.userId?.branch ? `${reg.userId.branch} (Year ${reg.userId.year})` : 'Not specified'} />
                   </div>
                </div>
             </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
             <div className="card border-slate-700/30 space-y-6">
                <h3 className="text-[11px] font-black text-slate-500 uppercase tracking-[0.3em] flex items-center gap-2 border-b border-white/[0.05] pb-4">
                   <HiOutlineCalendar className="w-5 h-5 text-primary-500" /> Event Details
                </h3>
                <div className="space-y-6">
                   <div className="flex items-center justify-between">
                      <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Event Name</p>
                      <p className="text-sm font-black text-white hover:text-primary-400 cursor-pointer transition-colors uppercase tracking-tight">{reg.eventId?.title}</p>
                   </div>
                   <div className="flex items-center justify-between">
                      <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Created At</p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{fmtDT(reg.createdAt)}</p>
                   </div>
                </div>
             </div>

             <div className="card border-slate-700/30 space-y-6">
                <h3 className="text-[11px] font-black text-slate-500 uppercase tracking-[0.3em] flex items-center gap-2 border-b border-white/[0.05] pb-4">
                   <HiOutlineCurrencyRupee className="w-5 h-5 text-emerald-500" /> Payment Info
                </h3>
                <div className="space-y-6 text-center py-4">
                   {reg.orderId ? (
                      <div className="space-y-6">
                         <div className="flex items-center justify-between px-2">
                            <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Order Amount</span>
                            <span className="text-2xl font-black text-white tabular-nums">₹{Number(reg.eventId?.registrationFee || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                         </div>
                         <div className={`p-4 rounded-2xl border transition-all ${reg.status === 'confirmed' ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-amber-500/10 border-amber-500/30'}`}>
                            <p className="text-[10px] font-black uppercase tracking-widest mb-1 opacity-50">Transaction Status</p>
                            <p className="text-xs font-black uppercase tracking-widest">{reg.status === 'confirmed' ? 'PAID & CONFIRMED' : 'PAYMENT PENDING'}</p>
                         </div>
                      </div>
                   ) : (
                      <div className="text-center py-6 opacity-30 grayscale filter">
                         <HiOutlineCurrencyRupee className="w-12 h-12 mx-auto mb-4" />
                         <p className="text-[10px] font-black uppercase tracking-widest">No transaction detected</p>
                      </div>
                   )}
                </div>
             </div>
          </div>
        </div>

        <div className="xl:col-span-4 space-y-8">
           {reg.teamId && (
             <div className="card border-slate-700/30 space-y-8 relative overflow-hidden group">
                <div className="absolute inset-0 bg-blue-500/[0.02] pointer-events-none"></div>
                <div className="flex items-center justify-between border-b border-white/[0.05] pb-6">
                   <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-500 border border-blue-500/20 group-hover:rotate-6 transition-transform">
                         <HiOutlineUserGroup className="w-6 h-6" />
                      </div>
                      <div>
                         <p className="text-[9px] font-black text-blue-500 uppercase tracking-[0.2em] mb-1">TEAM NAME</p>
                         <h4 className="text-xl font-black text-white uppercase tracking-tighter hover:text-blue-400 cursor-pointer transition-colors" onClick={() => navigate(`/teams?search=${reg.teamId.teamName}`)}>{reg.teamId.teamName}</h4>
                      </div>
                   </div>
                </div>

                <div className="space-y-3">
                   {reg.teamMembers?.map((m) => (
                      <div key={m._id} className="flex items-center justify-between p-4 bg-white/[0.02] border border-white/[0.05] rounded-2xl hover:bg-white/[0.05] transition-all">
                         <div className="flex items-center gap-3">
                            <span className="text-[11px] font-black text-white uppercase tracking-tight">{m.userId?.name}</span>
                            {reg.teamId?.leaderId?._id === m.userId?._id && (
                               <span className="px-2 py-0.5 rounded-lg bg-primary-500 text-white text-[8px] font-black uppercase tracking-widest">LEADER</span>
                            )}
                         </div>
                         <div className={`w-2 h-2 rounded-full ${m.status === 'accepted' ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'bg-amber-500 animate-pulse'}`}></div>
                      </div>
                   ))}
                </div>
             </div>
           )}

           <div className="card border-slate-700/30 space-y-6">
              <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] flex items-center gap-2">
                 <HiOutlineInformationCircle className="w-4 h-4 text-primary-500" /> Admin Advisory
              </h4>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tight leading-relaxed">
                Registration details are permanent once confirmed. Changes to status or team members should be verified manually.
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

function DetailBlock({ icon: Icon, label, value }) {
  return (
    <div className="space-y-3 p-4 rounded-2xl bg-white/[0.01] border border-white/[0.05] hover:border-white/[0.1] transition-all">
       <div className="flex items-center gap-2">
          <Icon className="w-4 h-4 text-primary-500" />
          <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">{label}</span>
       </div>
       <p className="text-sm font-black text-slate-300 uppercase tracking-tight break-words">{value}</p>
    </div>
  );
}
