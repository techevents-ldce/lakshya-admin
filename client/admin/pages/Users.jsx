import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../src/services/api';
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
          <h1 className="text-3xl font-bold text-white tracking-tight leading-none mb-2">Users</h1>
          <p className="text-slate-500 font-medium text-sm">Manage user accounts, institutional roles, and access credentials</p>
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
          
          <div className="flex items-center gap-2 group px-4 py-2 hover:bg-white/[0.03] rounded-xl transition-all border border-transparent hover:border-slate-800 cursor-pointer">
             <HiOutlineFilter className="w-4 h-4 text-slate-500 group-hover:text-indigo-400" />
             <select value={roleFilter} onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }} className="bg-transparent text-xs font-semibold text-slate-400 outline-none cursor-pointer">
                <option value="" className="bg-slate-900">All Roles</option>
                <option value="participant" className="bg-slate-900">Participant</option>
                <option value="coordinator" className="bg-slate-900">Coordinator</option>
                <option value="admin" className="bg-slate-900">Admin</option>
             </select>
          </div>

          <div className="h-8 w-px bg-slate-800 hidden lg:block"></div>

          <div className="flex items-center gap-2 group px-4 py-2 hover:bg-white/[0.03] rounded-xl transition-all border border-transparent hover:border-slate-800 cursor-pointer">
             <HiOutlineShieldCheck className="w-4 h-4 text-slate-500 group-hover:text-indigo-400" />
             <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} className="bg-transparent text-xs font-semibold text-slate-400 outline-none cursor-pointer">
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
          <p className="text-[11px] font-bold text-slate-600 uppercase tracking-[0.4em] animate-pulse">Loading users...</p>
        </div>
      ) : (
        <div className="card !p-0 border-slate-700/30 overflow-hidden shadow-2xl bg-slate-900/20 backdrop-blur-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-white/[0.01]">
                <tr className="bg-white/[0.01]">
                  <th className="px-6 py-5 w-16 text-center text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-white/[0.05]">Expand</th>
                  <th className="px-6 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-white/[0.05]">User Identification</th>
                  <th className="px-6 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-white/[0.05] hidden sm:table-cell">Institution</th>
                  <th className="px-6 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-white/[0.05] hidden sm:table-cell">Role</th>
                  <th className="px-6 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-white/[0.05]">Status</th>
                  <th className="px-6 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-white/[0.05] text-right">Actions</th>
                </tr>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.02]">
                {users.map((u) => (
                  <React.Fragment key={u._id}>
                    <tr className={`group hover:bg-white/[0.02] transition-all cursor-pointer ${expanded === u._id ? 'bg-indigo-500/[0.03] border-l-2 border-l-indigo-500' : ''}`} onClick={() => toggleExpand(u._id)}>
                      <td className="px-6 py-5 text-center">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${expanded === u._id ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-900 text-slate-500 group-hover:text-white'}`}>
                          {expanded === u._id ? <HiOutlineChevronUp className="w-4 h-4" /> : <HiOutlineChevronDown className="w-4 h-4" />}
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-sm font-bold text-slate-500 group-hover:bg-indigo-600 group-hover:text-white group-hover:border-indigo-500 transition-all shadow-lg">
                            {u.name?.[0]?.toUpperCase() || <HiOutlineUser />}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-white group-hover:text-indigo-400 transition-colors tracking-tight leading-none mb-1.5">{u.name}</p>
                            <p className="text-[10px] text-slate-500/70 font-medium uppercase tracking-wider truncate max-w-[150px]">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5 text-xs font-medium text-slate-400 hidden sm:table-cell uppercase tracking-tight">{u.college || '—'}</td>
                      <td className="px-6 py-5 hidden sm:table-cell">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border ${u.role === 'admin' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' : u.role === 'coordinator' ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'}`}>
                           {u.role}
                        </span>
                      </td>
                      <td className="px-6 py-5">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${u.isActive ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-500 border-red-500/20'}`}>
                           {u.isActive ? 'Active' : 'Blocked'}
                        </span>
                      </td>
                      <td className="px-6 py-5 text-right" onClick={(ev) => ev.stopPropagation()}>
                        <div className="flex items-center justify-end gap-2.5">
                          {isSuperadmin && u._id !== user?._id && (
                            <>
                              <button onClick={() => toggleBlock(u._id, u.name, u.isActive)} className={`w-9 h-9 flex items-center justify-center rounded-lg transition-all active:scale-95 ${u.isActive ? 'bg-red-600/10 text-red-500 hover:bg-red-600 hover:text-white border border-red-600/20' : 'bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-white border border-emerald-500/20'}`} title={u.isActive ? 'Block User' : 'Unblock User'}>
                                {u.isActive ? <HiOutlineBan className="w-4 h-4" /> : <HiOutlineCheckCircle className="w-4 h-4" />}
                              </button>
                              <button onClick={() => setResetModal(u)} className="w-9 h-9 flex items-center justify-center rounded-lg bg-slate-900 border border-slate-800 text-slate-500 hover:text-white hover:border-slate-600 transition-all active:scale-95" title="Reset Password">
                                <HiOutlineKey className="w-4 h-4" />
                              </button>
                              <button onClick={() => handleDelete(u._id, u.name)} className="w-9 h-9 flex items-center justify-center rounded-lg bg-red-600/10 border border-red-600/20 text-red-500 hover:bg-red-600 hover:text-white transition-all active:scale-95" title="Delete User">
                                <HiOutlineTrash className="w-4 h-4" />
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
                                <h4 className="text-[10px] font-bold text-slate-600 uppercase tracking-[0.3em] flex items-center gap-2">
                                   <HiOutlineIdentification className="w-4 h-4 text-primary-500" /> Event Assignments
                                </h4>
                                <div className="flex flex-wrap gap-2">
                                   {u.assignedEvents?.length > 0 ? u.assignedEvents.map((ev, i) => (
                                     <span key={i} className="px-3 py-1 rounded-xl bg-white/[0.03] border border-white/[0.05] text-[10px] font-bold text-slate-300 uppercase tracking-tight">
                                        {typeof ev === 'object' ? ev.title : ev}
                                     </span>
                                   )) : (
                                     <span className="text-[10px] text-slate-700 font-bold uppercase tracking-wider italic opacity-40">No assignments</span>
                                   )}
                                </div>
                            </div>
                            <DetailNode label="Joined On" value={fmtDT(u.createdAt)} />
                          </div>
                          <div className="mt-10 pt-8 border-t border-white/[0.05] flex justify-between items-center bg-slate-900/40 p-5 rounded-2xl">
                            <button onClick={(e) => { e.stopPropagation(); navigate(`/users/${u._id}`); }} className="btn-primary py-3 px-6 text-[10px] font-bold uppercase tracking-widest shadow-lg shadow-indigo-500/10">
                               View Full Profile →
                            </button>
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest tabular-nums italic opacity-60">System ID: {u._id}</p>
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
                       <p className="text-[11px] font-bold text-slate-600 uppercase tracking-[0.4em]">No users found</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          
          {/* Pagination */}
          {total > 1 && (
            <div className="flex items-center justify-center gap-3 py-10 border-t border-white/[0.05] bg-white/[0.01]">
              {[...Array(total)].map((_, i) => (
                <button 
                  key={i} 
                  onClick={() => setPage(i + 1)} 
                  className={`w-10 h-10 rounded-lg text-[10px] font-bold transition-all ${page === i + 1 ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-900 text-slate-500 hover:text-white border border-slate-800'}`}
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
              <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mx-auto text-indigo-400 shadow-lg">
                <HiOutlineKey className="w-8 h-8" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-xl font-bold text-white tracking-tight leading-none">Reset Password</h3>
                <p className="text-xs text-slate-500 font-medium">Changing password for <span className="text-slate-300 font-semibold">{resetModal.name}</span></p>
              </div>
              <div className="space-y-2">
                <label className="text-[9px] font-bold text-slate-600 uppercase tracking-wider block text-left px-2">New Password</label>
                <input 
                  type="password" 
                  placeholder="Min 8 characters" 
                  value={newPassword} 
                  onChange={(e) => setNewPassword(e.target.value)} 
                  className="input-field text-center font-mono tracking-wider" 
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button onClick={() => { setResetModal(null); setNewPassword(''); }} className="btn-outline flex-1 py-3.5 text-xs tracking-widest uppercase">Cancel</button>
                <button 
                  onClick={handleResetPassword} 
                  disabled={newPassword.length < 8} 
                  className="btn-primary flex-1 py-3.5 text-xs tracking-widest uppercase disabled:opacity-20 active:scale-95"
                >
                  Confirm
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
    <div className="group space-y-1.5">
      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest group-hover:text-indigo-400 transition-colors">{label}</span>
      <p className="text-sm text-slate-200 font-semibold break-words leading-snug">{value}</p>
    </div>
  );
}
