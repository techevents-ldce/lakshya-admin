import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';
import { 
  HiOutlineSearch, 
  HiOutlineBan, 
  HiOutlineCheckCircle, 
  HiOutlineChevronDown, 
  HiOutlineChevronUp, 
  HiOutlineKey, 
  HiOutlineShieldCheck, 
  HiOutlineUser,
  HiOutlineIdentification,
  HiOutlineRefresh,
  HiOutlineFilter,
  HiOutlineTrash,
} from 'react-icons/hi';
import ConfirmWithPassword from '../components/ConfirmWithPassword';
import { useAuth } from '../context/AuthContext';

const fmtDT = (d) => d ? new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

export default function Users() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isSuperadmin = user?.role === 'superadmin';
  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);

  const [confirmModal, setConfirmModal] = useState({ open: false, title: '', message: '', confirmLabel: '', variant: 'danger', action: null });
  const [resetModal, setResetModal] = useState(null);
  const [newPassword, setNewPassword] = useState('');

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const params = { page, limit: 15, search };
      if (roleFilter) params.role = roleFilter;
      if (statusFilter) params.isActive = statusFilter;
      const { data } = await api.get('/users', { params });
      setUsers(data.users);
      setTotal(data.pages);
    } catch { toast.error('Failed to load user records'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchUsers(); }, [page, search, roleFilter, statusFilter]);

  const toggleBlock = (id, name, isActive) => {
    const action = isActive ? 'block' : 'unblock';
    setConfirmModal({
      open: true,
      title: `${isActive ? 'Block User' : 'Unblock User'}`,
      message: `Are you sure you want to ${action} "${name}"? ${isActive ? 'This user will no longer be able to log in.' : 'This user will be allowed to log in again.'}`,
      confirmLabel: `${isActive ? 'BLOCK USER' : 'UNBLOCK USER'}`,
      variant: isActive ? 'danger' : 'warning',
      action: async (password) => {
        if (isActive) await api.patch(`/users/${id}/block`, { adminPassword: password });
        else await api.patch(`/users/${id}/unblock`, { adminPassword: password });
        toast.success(isActive ? 'User blocked' : 'User unblocked');
        fetchUsers();
      },
    });
  };

  const handleResetPassword = () => {
    if (newPassword.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    setConfirmModal({
      open: true,
      title: 'Reset Password',
      message: `You are about to reset the password for "${resetModal.name}". This action is permanent.`,
      confirmLabel: 'RESET PASSWORD',
      variant: 'danger',
      action: async (password) => {
        await api.patch(`/users/${resetModal._id}/reset-password`, { newPassword, adminPassword: password });
        toast.success('Password reset successfully');
        setResetModal(null);
        setNewPassword('');
      },
    });
  };

  const handleDelete = (id, name) => {
    setConfirmModal({
      open: true,
      title: 'Delete User',
      message: `PERMANENTLY DELETE user "${name}"? This will also remove their registrations, tickets, and team memberships. THIS ACTION CANNOT BE UNDONE.`,
      confirmLabel: 'Permanently Delete',
      variant: 'danger',
      action: async (password) => {
        await api.delete(`/users/${id}`, { data: { adminPassword: password } });
        toast.success('User deleted permanently');
        fetchUsers();
      },
    });
  };

  const toggleExpand = (id) => setExpanded(expanded === id ? null : id);

  return (
    <div className="animate-fade-in space-y-8">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight uppercase mb-1">User Management</h1>
          <p className="text-slate-500 font-medium">Manage user accounts, roles, and access permissions</p>
        </div>
      </div>

      {/* Control Panel */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-4 bg-slate-900/40 p-3 rounded-2xl border border-slate-700/30 backdrop-blur-xl transition-all shadow-xl">
        <div className="relative group flex-1 min-w-[300px]">
          <HiOutlineSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-primary-400 w-5 h-5 transition-colors" />
          <input 
            type="text" 
            placeholder="Search by name or email..." 
            value={search} 
            onChange={(e) => { setSearch(e.target.value); setPage(1); }} 
            className="input-field pl-12" 
          />
        </div>
        
        <div className="flex flex-wrap items-center gap-4 px-2">
          <div className="h-8 w-px bg-slate-800 hidden lg:block"></div>
          
          <div className="flex items-center gap-2 group px-4 py-2 hover:bg-white/[0.02] rounded-xl transition-all cursor-pointer">
             <HiOutlineFilter className="w-4 h-4 text-slate-500 group-hover:text-primary-400" />
             <select value={roleFilter} onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }} className="bg-transparent text-[10px] font-black text-slate-400 uppercase tracking-widest outline-none cursor-pointer">
               <option value="" className="bg-slate-900">All Roles</option>
               <option value="participant" className="bg-slate-900">Participant</option>
               <option value="coordinator" className="bg-slate-900">Coordinator</option>
               <option value="admin" className="bg-slate-900">Admin</option>
             </select>
          </div>

          <div className="h-8 w-px bg-slate-800 hidden lg:block"></div>

          <div className="flex items-center gap-2 group px-4 py-2 hover:bg-white/[0.02] rounded-xl transition-all cursor-pointer">
             <HiOutlineShieldCheck className="w-4 h-4 text-slate-500 group-hover:text-primary-400" />
             <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} className="bg-transparent text-[10px] font-black text-slate-400 uppercase tracking-widest outline-none cursor-pointer">
               <option value="" className="bg-slate-900">All Status</option>
               <option value="true" className="bg-slate-900">Active Only</option>
               <option value="false" className="bg-slate-900">Blocked Only</option>
             </select>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-32 gap-6">
          <HiOutlineRefresh className="w-12 h-12 text-primary-500 animate-spin" />
          <p className="text-[11px] font-black text-slate-600 uppercase tracking-[0.4em] animate-pulse">Loading users...</p>
        </div>
      ) : (
        <div className="card !p-0 border-slate-700/30 overflow-hidden shadow-2xl bg-slate-900/20 backdrop-blur-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-white/[0.01]">
                  <th className="px-6 py-6 w-16 text-center text-[9px] font-black text-slate-600 uppercase tracking-widest">Details</th>
                  <th className="px-6 py-6 text-[9px] font-black text-slate-600 uppercase tracking-widest">User Info</th>
                   <th className="px-6 py-6 text-[9px] font-black text-slate-600 uppercase tracking-widest hidden sm:table-cell">College</th>
                  <th className="px-6 py-6 text-[9px] font-black text-slate-600 uppercase tracking-widest hidden sm:table-cell">Role</th>
                  <th className="px-6 py-6 text-[9px] font-black text-slate-600 uppercase tracking-widest">Status</th>
                  <th className="px-6 py-6 text-[9px] font-black text-slate-600 uppercase tracking-widest text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.02]">
                {users.map((u) => (
                  <React.Fragment key={u._id}>
                    <tr className={`group hover:bg-white/[0.02] transition-all cursor-pointer ${expanded === u._id ? 'bg-primary-500/[0.03] border-l-2 border-l-primary-500' : ''}`} onClick={() => toggleExpand(u._id)}>
                      <td className="px-6 py-6 text-center">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${expanded === u._id ? 'bg-primary-500 text-white shadow-lg shadow-primary-900/20' : 'bg-slate-900 text-slate-500 group-hover:text-white'}`}>
                          {expanded === u._id ? <HiOutlineChevronUp className="w-4 h-4" /> : <HiOutlineChevronDown className="w-4 h-4" />}
                        </div>
                      </td>
                      <td className="px-6 py-6">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-sm font-black text-slate-500 group-hover:bg-primary-500 group-hover:text-white group-hover:border-primary-500/30 transition-all shadow-xl">
                            {u.name?.[0]?.toUpperCase() || <HiOutlineUser />}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-white group-hover:text-primary-400 transition-colors tracking-tight uppercase leading-none mb-1.5">{u.name}</p>
                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest truncate max-w-[150px]">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-6 text-[10px] font-black text-slate-400 hidden sm:table-cell uppercase tracking-widest">{u.college || '—'}</td>
                      <td className="px-6 py-6 hidden sm:table-cell">
                        <span className={`px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-widest border ${u.role === 'admin' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' : u.role === 'coordinator' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'}`}>
                           {u.role}
                        </span>
                      </td>
                      <td className="px-6 py-6">
                        <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border ${u.isActive ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 shadow-lg shadow-emerald-900/10' : 'bg-red-500/10 text-red-500 border-red-500/30 shadow-lg shadow-red-900/10'}`}>
                           {u.isActive ? 'ACTIVE' : 'BLOCKED'}
                        </span>
                      </td>
                      <td className="px-6 py-6 text-right" onClick={(ev) => ev.stopPropagation()}>
                        <div className="flex items-center justify-end gap-3">
                          {isSuperadmin && u._id !== user?._id && (
                            <>
                              <button onClick={() => toggleBlock(u._id, u.name, u.isActive)} className={`w-9 h-9 flex items-center justify-center rounded-xl transition-all shadow-xl active:scale-95 ${u.isActive ? 'bg-red-500/10 text-red-500 hover:bg-red-50 hover:text-white border border-red-500/20' : 'bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-white border border-emerald-500/20'}`} title={u.isActive ? 'Block User' : 'Unblock User'}>
                                {u.isActive ? <HiOutlineBan className="w-5 h-5" /> : <HiOutlineCheckCircle className="w-5 h-5" />}
                              </button>
                              <button onClick={() => setResetModal(u)} className="w-9 h-9 flex items-center justify-center rounded-xl bg-primary-500/10 text-primary-400 hover:bg-primary-500 hover:text-white border border-primary-500/20 transition-all shadow-xl active:scale-95" title="Reset Password">
                                <HiOutlineKey className="w-5 h-5" />
                              </button>
                              <button onClick={() => handleDelete(u._id, u.name)} className="w-9 h-9 flex items-center justify-center rounded-xl bg-red-600/10 text-red-500 hover:bg-red-600 hover:text-white border border-red-600/20 transition-all shadow-xl active:scale-95" title="Delete User">
                                <HiOutlineTrash className="w-5 h-5" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                    {expanded === u._id && (
                      <tr className="bg-slate-900/40 backdrop-blur-3xl animate-fade-in relative z-10">
                        <td colSpan="6" className="px-12 py-12">
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12 max-h-[500px] overflow-y-auto custom-scrollbar pr-4">
                            <DetailNode label="Phone Number" value={u.phone || 'Not provided'} />
                            <DetailNode label="Branch / Course" value={u.branch || 'Not specified'} />
                            <DetailNode label="Academic Year" value={u.year ? `Year ${u.year}` : 'Not specified'} />
                            <div className="lg:col-span-2 space-y-4 pt-4 border-t border-white/[0.05]">
                                <h4 className="text-[10px] font-black text-slate-600 uppercase tracking-[0.3em] flex items-center gap-2">
                                   <HiOutlineIdentification className="w-4 h-4 text-primary-500" /> Event Assignments
                                </h4>
                                <div className="flex flex-wrap gap-2">
                                   {u.assignedEvents?.length > 0 ? u.assignedEvents.map((ev, i) => (
                                     <span key={i} className="px-3 py-1 rounded-xl bg-white/[0.03] border border-white/[0.05] text-[10px] font-bold text-slate-300 uppercase tracking-tight">
                                        {typeof ev === 'object' ? ev.title : ev}
                                     </span>
                                   )) : (
                                     <span className="text-[10px] text-slate-700 font-black uppercase tracking-widest italic opacity-40">No assignments</span>
                                   )}
                                </div>
                            </div>
                            <DetailNode label="Joined On" value={fmtDT(u.createdAt)} />
                          </div>
                          <div className="mt-12 pt-8 border-t border-white/[0.05] flex justify-between items-center bg-slate-900/40 p-6 rounded-3xl">
                            <button onClick={(e) => { e.stopPropagation(); navigate(`/users/${u._id}`); }} className="px-8 py-3.5 rounded-2xl bg-primary-500/10 border border-primary-500/20 text-primary-400 hover:bg-primary-500 hover:text-white font-black text-[11px] uppercase tracking-[0.3em] transition-all shadow-2xl shadow-primary-900/40 active:scale-95">
                               View Full Profile →
                            </button>
                            <p className="text-[10px] font-black text-slate-700 uppercase tracking-[0.4em] tabular-nums">ID: {u._id}</p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
                {users.length === 0 && (
                  <tr>
                    <td colSpan="6" className="text-center py-40">
                       <HiOutlineSearch className="w-16 h-16 text-slate-800 mx-auto mb-6" />
                       <p className="text-[11px] font-black text-slate-600 uppercase tracking-[0.4em]">No users found</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          
          {/* Pagination */}
          {total > 1 && (
            <div className="flex items-center justify-center gap-4 py-10 bg-white/[0.01] border-t border-white/[0.05] shadow-2xl rounded-2xl">
              {[...Array(total)].map((_, i) => (
                <button 
                  key={i} 
                  onClick={() => setPage(i + 1)} 
                  className={`w-11 h-11 rounded-2xl text-[11px] font-black transition-all ${page === i + 1 ? 'bg-primary-500 text-white shadow-2xl shadow-primary-900/40 scale-110 z-10' : 'bg-slate-900 text-slate-500 hover:text-white border border-slate-800'}`}
                >
                  {(i + 1).toString().padStart(2, '0')}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Reset Password Modal Overlay */}
      {isSuperadmin && resetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in" onClick={() => { setResetModal(null); setNewPassword(''); }}>
          <div className="card w-full max-w-sm max-h-[90vh] overflow-y-auto custom-scrollbar border-slate-800 shadow-2xl relative bg-slate-900" onClick={(e) => e.stopPropagation()}>
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary-500/5 blur-[100px] -mr-16 -mt-16 pointer-events-none"></div>
            <div className="relative z-10 space-y-8 p-4 text-center">
              <div className="w-16 h-16 rounded-2xl bg-primary-500/10 border border-primary-500/20 flex items-center justify-center mx-auto text-primary-400 shadow-lg">
                <HiOutlineKey className="w-8 h-8" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-white uppercase tracking-tight leading-none">Reset Password</h3>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Changing password for {resetModal.name}</p>
              </div>
              <div className="space-y-2">
                <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest block text-left px-2">New Password</label>
                <input 
                  type="password" 
                  placeholder="Min 8 characters" 
                  value={newPassword} 
                  onChange={(e) => setNewPassword(e.target.value)} 
                  className="input-field text-center font-mono tracking-widest" 
                />
              </div>
              <div className="flex gap-4 pt-4">
                <button onClick={() => { setResetModal(null); setNewPassword(''); }} className="btn-outline flex-1 py-4 text-[10px] font-black uppercase tracking-widest">Cancel</button>
                <button 
                  onClick={handleResetPassword} 
                  disabled={newPassword.length < 8} 
                  className="btn-primary flex-1 py-4 text-[10px] font-black uppercase tracking-widest shadow-2xl shadow-primary-900/40 disabled:opacity-20 active:scale-95"
                >
                  Save Password
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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

function DetailNode({ label, value }) {
  return (
    <div className="group space-y-2">
      <span className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] group-hover:text-primary-400 transition-colors uppercase">{label}</span>
      <p className="text-sm text-slate-300 font-bold break-words leading-tight uppercase tracking-tight">{value}</p>
    </div>
  );
}
