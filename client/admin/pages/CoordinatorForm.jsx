import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';
import { HiOutlineUserAdd, HiOutlineMail, HiOutlineLockClosed, HiOutlinePhone, HiOutlineAcademicCap, HiOutlineOfficeBuilding } from 'react-icons/hi';
import ConfirmWithPassword from '../components/ConfirmWithPassword';

export default function CoordinatorForm() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', phone: '', college: '', branch: '' });
  const [loading, setLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const onChange = (field) => (e) => setForm((p) => ({ ...p, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setShowConfirm(true);
  };

  const handleConfirmedCreate = async (password) => {
    setLoading(true);
    try {
      await api.post('/users/coordinators', { ...form, adminPassword: password });
      toast.success('Coordinator added successfully');
      navigate('/coordinators');
    } finally { setLoading(false); }
  };

  return (
    <div className="animate-fade-in space-y-8">
      <div>
        <h1 className="text-3xl font-black text-white tracking-tighter uppercase leading-none mb-2">Add Coordinator</h1>
        <p className="text-slate-500 font-medium">Create a new coordinator account for event management</p>
      </div>

      <div className="flex justify-center md:justify-start">
        <form onSubmit={handleSubmit} className="card max-w-lg w-full space-y-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary-600/5 blur-[100px] pointer-events-none"></div>

          <div className="space-y-6 relative z-10">
            <div className="flex items-center gap-3 border-l-2 border-primary-500 pl-4 py-1">
               <HiOutlineUserAdd className="w-5 h-5 text-primary-500" />
               <h3 className="text-[10px] font-black text-white uppercase tracking-[0.2em]">Account Details</h3>
            </div>

            <div className="space-y-4">
              <div className="group">
                <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest ml-1 mb-2 block">Full Name *</label>
                <input className="input-field py-3 text-sm font-bold bg-slate-900/50 border-slate-700/50 focus:border-primary-500/50" value={form.name} onChange={onChange('name')} required placeholder="e.g. John Doe" />
              </div>
              <div className="group">
                <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest ml-1 mb-2 block flex items-center gap-2"><HiOutlineMail className="w-3 h-3" /> Email Address *</label>
                <input type="email" className="input-field py-3 text-sm font-bold bg-slate-900/50 border-slate-700/50 transition-all" value={form.email} onChange={onChange('email')} required placeholder="coordinator@example.com" />
              </div>
              <div className="group">
                <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest ml-1 mb-2 block flex items-center gap-2"><HiOutlineLockClosed className="w-3 h-3" /> Password *</label>
                <input type="password" className="input-field py-3 text-sm font-bold bg-slate-900/50 border-slate-700/50" value={form.password} onChange={onChange('password')} required minLength={8} placeholder="Min. 8 characters" />
              </div>
            </div>
          </div>

          <div className="space-y-6 relative z-10">
            <div className="flex items-center gap-3 border-l-2 border-primary-500 pl-4 py-1">
               <HiOutlineOfficeBuilding className="w-5 h-5 text-primary-500" />
               <h3 className="text-[10px] font-black text-white uppercase tracking-[0.2em]">Personal Information</h3>
            </div>

            <div className="space-y-4">
              <div className="group">
                <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest ml-1 mb-2 block flex items-center gap-2"><HiOutlinePhone className="w-3 h-3" /> Phone Number</label>
                <input className="input-field py-3 text-sm font-bold bg-slate-900/50 border-slate-700/50" value={form.phone} onChange={onChange('phone')} placeholder="+91 XXXXX XXXXX" />
              </div>
              <div className="group">
                <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest ml-1 mb-2 block flex items-center gap-2"><HiOutlineAcademicCap className="w-3 h-3" /> College</label>
                <input className="input-field py-3 text-sm font-bold bg-slate-900/50 border-slate-700/50 uppercase tracking-widest" value={form.college} onChange={onChange('college')} placeholder="e.g. LDCE" />
              </div>
              <div className="group">
                <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest ml-1 mb-2 block">Branch</label>
                <input className="input-field py-3 text-sm font-bold bg-slate-900/50 border-slate-700/50 uppercase tracking-widest" value={form.branch} onChange={onChange('branch')} placeholder="e.g. Information Technology" />
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-4 pt-4 border-t border-slate-800">
            <button type="submit" disabled={loading} className="btn-primary flex-1 py-4 text-[10px] font-black uppercase tracking-[0.2em] shadow-xl shadow-primary-900/40 active:scale-95 disabled:opacity-50 transition-all">
              {loading ? 'Adding...' : 'ADD COORDINATOR'}
            </button>
            <button type="button" onClick={() => navigate('/coordinators')} className="btn-outline flex-1 py-4 text-[10px] font-black uppercase tracking-[0.2em] active:scale-95 transition-all">
              CANCEL
            </button>
          </div>
        </form>
      </div>

      {/* Confirm with Password Modal */}
      <ConfirmWithPassword
        open={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={handleConfirmedCreate}
        title="Confirm Addition"
        message={`You are about to create a coordinator account for "${form.name || 'this user'}". Please provide your admin password to authorize.`}
        confirmLabel="ADD COORDINATOR"
        variant="warning"
      />
    </div>
  );
}
