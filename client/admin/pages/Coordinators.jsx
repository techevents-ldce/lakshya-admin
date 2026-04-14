import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../src/services/api';
import toast from 'react-hot-toast';
import { 
  HiOutlinePlus, 
  HiOutlineKey, 
  HiOutlineSearch, 
  HiOutlineShieldCheck, 
  HiOutlineUserCircle, 
  HiOutlineX,
  HiOutlineFilter,
  HiOutlineRefresh,
  HiOutlineUserGroup,
  HiOutlineTrash,
} from 'react-icons/hi';
import ConfirmWithPassword from '../components/ConfirmWithPassword';
import { useAuth } from '../context/AuthContext';

export default function Coordinators() {
  const { user } = useAuth();
  const isSuperadmin = user?.role === 'superadmin';
  const [coordinators, setCoordinators] = useState([]);
  const [events, setEvents] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [assignModal, setAssignModal] = useState(null);
  const [resetModal, setResetModal] = useState(null);
  const [selectedEvents, setSelectedEvents] = useState([]);
  const [newPassword, setNewPassword] = useState('');

  // Confirmation with password modal state
  const [confirmModal, setConfirmModal] = useState({ open: false, title: '', message: '', confirmLabel: '', variant: 'warning', action: null });

  const fetchCoordinators = async () => {
    setLoading(true);
    try {
      const params = { role: 'coordinator', search, limit: 100 };
      if (statusFilter) params.isActive = statusFilter;
      const { data } = await api.get('/users', { params });
      setCoordinators(data.users);
    } catch { toast.error('Failed to load coordinators'); }
    finally { setLoading(false); }
  };

  const fetchEvents = async () => {
    const { data } = await api.get('/events', { params: { limit: 200 } });
    setEvents(data.events);
  };

  useEffect(() => { fetchCoordinators(); fetchEvents(); }, [search, statusFilter]);

  const openAssign = (c) => { setAssignModal(c); setSelectedEvents(c.assignedEvents?.map((e) => e._id || e) || []); };

  const handleAssign = () => {
    setConfirmModal({
      open: true,
      title: 'Assign Events',
      message: `You are about to update the assigned events for "${assignModal.name}".`,
      confirmLabel: 'SAVE ASSIGNMENTS',
      variant: 'warning',
      action: async (password) => {
        await api.patch(`/users/${assignModal._id}/assign-events`, { eventIds: selectedEvents, adminPassword: password });
        toast.success('Assignments updated');
        setAssignModal(null);
        fetchCoordinators();
      },
    });
  };

  const handleResetPassword = () => {
    if (newPassword.length < 8) {
      toast.error('Password must be at least 8 characters long');
      return;
    }
    setConfirmModal({
      open: true,
      title: 'Reset Password',
      message: `Warning: You are about to reset the password for "${resetModal.name}".`,
      confirmLabel: 'RESET PASSWORD',
      variant: 'danger',
      action: async (password) => {
        await api.patch(`/users/${resetModal._id}/reset-password`, { newPassword, adminPassword: password });
        toast.success('Password reset successful');
        setResetModal(null);
        setNewPassword('');
      },
    });
  };

  const handleDelete = (id, name) => {
    setConfirmModal({
      open: true,
      title: 'Delete Coordinator',
      message: `PERMANENTLY DELETE "${name}"? This will also remove them from all assigned events. THIS ACTION CANNOT BE UNDONE.`,
      confirmLabel: 'Permanently Delete',
      variant: 'danger',
      action: async (password) => {
        await api.delete(`/users/${id}`, { data: { adminPassword: password } });
        toast.success('Coordinator deleted permanently');
        fetchCoordinators();
      },
    });
  };

  return (
    <>
      <div className="animate-fade-in space-y-8">
        {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight leading-none mb-2">Coordinators</h1>
          <p className="text-slate-500 font-medium text-sm">Manage institutional coordinators and event assignments</p>
        </div>
        {isSuperadmin && (
          <Link to="/coordinators/new" className="btn-primary flex items-center gap-2.5 shadow-lg shadow-indigo-500/10">
            <HiOutlinePlus className="w-5 h-5" />
            <span>Add Coordinator</span>
          </Link>
        )}
      </div>

      {/* Control Panel */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-4 bg-slate-900/40 p-3 rounded-2xl border border-slate-700/30 backdrop-blur-xl transition-all shadow-xl">
        <div className="relative group flex-1 min-w-[300px]">
          <HiOutlineSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-primary-400 w-5 h-5 transition-colors" />
          <input 
            type="text" 
            placeholder="Search by name or email..." 
            value={search} 
            onChange={(e) => setSearch(e.target.value)} 
            className="input-field pl-12" 
          />
        </div>
        
        <div className="flex flex-wrap items-center gap-4 px-2">
          <div className="h-8 w-px bg-slate-800 hidden lg:block"></div>
          
          <div className="flex items-center gap-2 group px-4 py-2 hover:bg-white/[0.03] rounded-xl transition-all cursor-pointer border border-transparent hover:border-slate-800">
             <HiOutlineFilter className="w-4 h-4 text-slate-500 group-hover:text-indigo-400" />
             <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="bg-transparent text-xs font-semibold text-slate-400 outline-none cursor-pointer">
                <option value="" className="bg-slate-900">All Status</option>
                <option value="true" className="bg-slate-900">Active</option>
                <option value="false" className="bg-slate-900">Inactive</option>
             </select>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-32 gap-6">
          <HiOutlineRefresh className="w-12 h-12 text-primary-500 animate-spin" />
          <p className="text-[11px] font-bold text-slate-600 uppercase tracking-[0.4em] animate-pulse">Loading Coordinators...</p>
        </div>
      ) : (
        <div className="card !p-0 border-slate-700/30 overflow-hidden shadow-2xl bg-slate-900/20 backdrop-blur-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-white/[0.01]">
                  <th className="px-8 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-white/[0.05]">Name</th>
                  <th className="px-8 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-white/[0.05] hidden sm:table-cell">Email</th>
                  <th className="px-8 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-white/[0.05]">Status</th>
                  <th className="px-8 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-white/[0.05]">Assignments</th>
                  <th className="px-8 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-white/[0.05] text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.02]">
                {coordinators.map((c) => (
                  <tr key={c._id} className="group hover:bg-white/[0.02] transition-all duration-300">
                     <td className="px-8 py-5">
                       <div className="flex items-center gap-4">
                         <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500 group-hover:bg-indigo-600 group-hover:text-white group-hover:border-indigo-500 transition-all shadow-lg">
                            <HiOutlineUserCircle className="w-6 h-6" />
                         </div>
                         <div>
                            <p className="text-sm font-bold text-white group-hover:text-indigo-400 transition-colors tracking-tight leading-none mb-1.5">{c.name}</p>
                            <p className="text-[10px] text-slate-500/80 font-medium uppercase tracking-wider">ID: {c._id.slice(-8)}</p>
                         </div>
                       </div>
                    </td>
                    <td className="px-8 py-5 hidden sm:table-cell">
                       <p className="text-xs font-medium text-slate-400 truncate max-w-[200px]">{c.email}</p>
                    </td>
                     <td className="px-8 py-5">
                       <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border ${c.isActive ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border-red-500/20 text-red-400'}`}>
                          {c.isActive ? 'Active' : 'Inactive'}
                       </span>
                    </td>
                    <td className="px-8 py-5">
                       <div className="flex items-center gap-2.5">
                          <div className={`w-1.5 h-1.5 rounded-full ${c.assignedEvents?.length > 0 ? 'bg-indigo-500 animate-pulse' : 'bg-slate-700'}`}></div>
                          <span className="text-[11px] font-bold text-slate-200 tracking-tight">{c.assignedEvents?.length || 0} Events</span>
                       </div>
                    </td>
                    <td className="px-8 py-5 text-right">
                      {isSuperadmin && (
                        <div className="flex items-center justify-end gap-2.5">
                          <button 
                            onClick={() => openAssign(c)} 
                            className="btn-primary py-2 text-[10px] font-bold uppercase tracking-widest"
                          >
                            Assign
                          </button>
                          <button 
                            onClick={() => setResetModal(c)} 
                            className="w-9 h-9 flex items-center justify-center rounded-lg bg-slate-900 border border-slate-800 text-slate-500 hover:text-white hover:border-slate-600 transition-all active:scale-95"
                            title="Reset Password"
                          >
                            <HiOutlineKey className="w-5 h-5" />
                          </button>
                          <button 
                            onClick={() => handleDelete(c._id, c.name)} 
                            className="w-9 h-9 flex items-center justify-center rounded-lg bg-red-600/10 border border-red-600/20 text-red-500 hover:bg-red-600 hover:text-white transition-all active:scale-95"
                            title="Delete Coordinator"
                          >
                            <HiOutlineTrash className="w-5 h-5" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
                {coordinators.length === 0 && (
                  <tr>
                    <td colSpan="5" className="px-8 py-40 text-center">
                       <HiOutlineUserGroup className="w-16 h-16 text-slate-800 mx-auto mb-6" />
                       <p className="text-[11px] font-bold text-slate-700 uppercase tracking-[0.4em]">No coordinators found</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
      </div>

      {/* Assign Events Modal Overlay */}
      {isSuperadmin && assignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in" onClick={() => setAssignModal(null)}>
          <div className="card w-full max-w-lg max-h-[85vh] overflow-hidden flex flex-col border-slate-700/50 shadow-2xl relative bg-slate-900/60" onClick={(e) => e.stopPropagation()}>
            <div className="absolute top-0 right-0 w-80 h-80 bg-primary-600/5 blur-[120px] pointer-events-none"></div>
            
            <div className="sticky top-0 z-20 bg-slate-900 border-b border-white/[0.05] px-8 py-6 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-white tracking-tight leading-none mb-1.5">Assign Events</h3>
                <p className="text-xs text-slate-500 font-medium">Updating assignments for <span className="text-slate-300 font-semibold">{assignModal.name}</span></p>
              </div>
              <button 
                onClick={() => setAssignModal(null)} 
                className="w-10 h-10 rounded-lg bg-white/[0.03] border border-white/[0.05] text-slate-500 hover:text-white transition-all flex items-center justify-center active:scale-95"
              >
                <HiOutlineX className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-3 overflow-y-auto custom-scrollbar">
              {events.map((ev) => (
                <label key={ev._id} className="group flex items-center gap-4 p-4 rounded-xl bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.04] hover:border-indigo-500/30 cursor-pointer transition-all">
                  <input 
                    type="checkbox" 
                    checked={selectedEvents.includes(ev._id)} 
                    onChange={() => setSelectedEvents((prev) => prev.includes(ev._id) ? prev.filter((x) => x !== ev._id) : [...prev, ev._id])}
                    className="w-5 h-5 rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-indigo-500/20 cursor-pointer transition-all" 
                  />
                  <div className="flex-1">
                     <span className="text-sm font-semibold text-slate-300 group-hover:text-white transition-colors">{ev.title}</span>
                     <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-1">Category: {ev.category || 'N/A'}</p>
                  </div>
                </label>
              ))}
            </div>

            <div className="p-6 bg-slate-900/50 border-t border-white/[0.05] flex gap-3">
              <button onClick={handleAssign} className="btn-primary flex-1 py-3 text-xs tracking-widest uppercase">Save Changes</button>
              <button onClick={() => setAssignModal(null)} className="btn-outline flex-1 py-3 text-xs tracking-widest uppercase">Go Back</button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Password Modal Overlay */}
      {isSuperadmin && resetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in" onClick={() => { setResetModal(null); setNewPassword(''); }}>
          <div className="card w-full max-sm border-slate-700/50 shadow-2xl relative overflow-hidden bg-slate-900/40" onClick={(e) => e.stopPropagation()}>
             <div className="absolute top-0 right-0 w-48 h-48 bg-red-600/5 blur-[100px] pointer-events-none"></div>
             
             <div className="p-8 text-center space-y-8 relative z-10">
                <div className="w-20 h-20 rounded-[2.5rem] bg-red-600 flex items-center justify-center text-white mx-auto shadow-2xl shadow-red-900/50 rotate-12 group-hover:rotate-0 transition-transform duration-700">
                   <HiOutlineKey className="w-10 h-10" />
                </div>
                <div className="space-y-2">
                   <h3 className="text-2xl font-bold text-white uppercase tracking-tight leading-none">Reset Password</h3>
                   <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em]">Setting new password for {resetModal.name}</p>
                </div>
                <div className="space-y-2">
                  <div className="relative group text-left">
                     <label className="text-[9px] font-bold text-slate-600 uppercase tracking-wider px-2 mb-2 block">New Password</label>
                     <input 
                        type="password" 
                        placeholder="Min 8 characters" 
                        value={newPassword} 
                        onChange={(e) => setNewPassword(e.target.value)} 
                        className="input-field py-4 text-center font-mono tracking-wider bg-slate-900/50" 
                     />
                  </div>
                </div>
                <div className="flex gap-4 pt-4">
                   <button 
                      onClick={handleResetPassword} 
                      disabled={newPassword.length < 8} 
                      className="btn-primary flex-1 py-4 bg-red-600 hover:bg-red-700 border-none text-[10px] font-bold uppercase tracking-[0.3em] shadow-2xl shadow-red-900/50 disabled:opacity-20 active:scale-95"
                   >
                     RESET PASSWORD
                   </button>
                   <button 
                      onClick={() => { setResetModal(null); setNewPassword(''); }} 
                      className="btn-outline flex-1 py-4 text-[10px] font-bold uppercase tracking-[0.3em] active:scale-95"
                   >
                     CANCEL
                   </button>
                </div>
             </div>
          </div>
        </div>
      )}

      {/* Confirm with Password Modal */}
      <ConfirmWithPassword
        open={confirmModal.open}
        onClose={() => setConfirmModal((prev) => ({ ...prev, open: false }))}
        onConfirm={confirmModal.action}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmLabel={confirmModal.confirmLabel}
        variant={confirmModal.variant}
      />
    </>
  );
}
