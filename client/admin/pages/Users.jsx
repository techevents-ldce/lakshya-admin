import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';
import { HiOutlineSearch, HiOutlineBan, HiOutlineCheckCircle, HiOutlineChevronDown, HiOutlineChevronUp, HiOutlineKey } from 'react-icons/hi';
import ConfirmWithPassword from '../components/ConfirmWithPassword';

const fmtDT = (d) => d ? new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

export default function Users() {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);

  // Confirmation modal state
  const [confirmModal, setConfirmModal] = useState({ open: false, title: '', message: '', confirmLabel: '', variant: 'danger', action: null });

  // Reset password modal state
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
    } catch { toast.error('Failed to load users'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchUsers(); }, [page, search, roleFilter, statusFilter]);

  const toggleBlock = (id, name, isActive) => {
    const action = isActive ? 'block' : 'unblock';
    setConfirmModal({
      open: true,
      title: `${isActive ? 'Block' : 'Unblock'} User`,
      message: `You are about to ${action} "${name}". ${isActive ? 'This user will lose access to their account.' : 'This will restore access to their account.'}`,
      confirmLabel: `${isActive ? 'Block' : 'Unblock'} User`,
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
      message: `You are about to reset the password for "${resetModal.name}". This will immediately change their login credentials.`,
      confirmLabel: 'Reset Password',
      variant: 'danger',
      action: async (password) => {
        await api.patch(`/users/${resetModal._id}/reset-password`, { newPassword, adminPassword: password });
        toast.success('Password reset successfully');
        setResetModal(null);
        setNewPassword('');
      },
    });
  };

  const toggleExpand = (id) => setExpanded(expanded === id ? null : id);

  return (
    <div>
      <h1 className="text-lg sm:text-2xl font-bold mb-6">User Management</h1>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-6 flex-wrap">
        <div className="relative w-full sm:max-w-xs">
          <HiOutlineSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input type="text" placeholder="Search by name or email..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="input-field pl-10" />
        </div>
        <select value={roleFilter} onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }} className="input-field w-full sm:w-auto sm:min-w-[140px]">
          <option value="">All Roles</option>
          <option value="participant">Participant</option>
          <option value="coordinator">Coordinator</option>
          <option value="admin">Admin</option>
        </select>
        <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} className="input-field w-full sm:w-auto sm:min-w-[140px]">
          <option value="">All Status</option>
          <option value="true">Active</option>
          <option value="false">Blocked</option>
        </select>
      </div>

      {loading ? <div className="text-center py-12 text-gray-400">Loading...</div> : (
        <div className="card overflow-hidden p-0 overflow-x-auto">
          <table className="w-full text-sm min-w-[550px]">
            <thead><tr className="table-header">
              <th className="px-5 py-3 w-8"></th><th className="px-5 py-3">Name</th><th className="px-5 py-3">Email</th><th className="px-5 py-3 hidden sm:table-cell">College</th><th className="px-5 py-3 hidden sm:table-cell">Role</th><th className="px-5 py-3">Status</th><th className="px-5 py-3">Actions</th>
            </tr></thead>
            <tbody>
              {users.map((u) => (
                <>
                  <tr key={u._id} className={`border-t border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer ${expanded === u._id ? 'bg-gray-50' : ''}`} onClick={() => toggleExpand(u._id)}>
                    <td className="px-5 py-3 text-gray-400">
                      {expanded === u._id ? <HiOutlineChevronUp className="w-4 h-4" /> : <HiOutlineChevronDown className="w-4 h-4" />}
                    </td>
                    <td className="px-5 py-3 font-medium">{u.name}</td>
                    <td className="px-5 py-3 text-gray-500">{u.email}</td>
                    <td className="px-5 py-3 text-gray-500 hidden sm:table-cell">{u.college || '—'}</td>
                    <td className="px-5 py-3 hidden sm:table-cell"><span className={`badge ${u.role === 'admin' ? 'badge-yellow' : u.role === 'coordinator' ? 'badge-blue' : 'badge-green'}`}>{u.role}</span></td>
                    <td className="px-5 py-3"><span className={`badge ${u.isActive ? 'badge-green' : 'badge-red'}`}>{u.isActive ? 'Active' : 'Blocked'}</span></td>
                    <td className="px-5 py-3" onClick={(ev) => ev.stopPropagation()}>
                      <div className="flex items-center gap-2">
                        {u.role !== 'admin' && (
                          <button onClick={() => toggleBlock(u._id, u.name, u.isActive)} className={`flex items-center gap-1 text-xs font-medium ${u.isActive ? 'text-red-600 hover:text-red-800' : 'text-emerald-600 hover:text-emerald-800'}`}>
                            {u.isActive ? <><HiOutlineBan className="w-4 h-4" /> Block</> : <><HiOutlineCheckCircle className="w-4 h-4" /> Unblock</>}
                          </button>
                        )}
                        {u.role !== 'admin' && (
                          <button onClick={() => setResetModal(u)} className="text-primary-600 hover:text-primary-800" title="Reset Password">
                            <HiOutlineKey className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                  {/* Expanded Detail Row */}
                  {expanded === u._id && (
                    <tr key={`${u._id}-detail`} className="bg-gray-50/80">
                      <td colSpan="7" className="px-5 py-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-3 text-sm">
                          <DetailItem label="Full Name" value={u.name} />
                          <DetailItem label="Email" value={u.email} />
                          <DetailItem label="Phone" value={u.phone || '—'} />
                          <DetailItem label="College" value={u.college || '—'} />
                          <DetailItem label="Branch" value={u.branch || '—'} />
                          <DetailItem label="Year" value={u.year ? `Year ${u.year}` : '—'} />
                          <DetailItem label="Role" value={u.role} />
                          <DetailItem label="Account Status" value={u.isActive ? 'Active' : 'Blocked'} />
                          <DetailItem label="Assigned Events" value={u.assignedEvents?.length > 0 ? u.assignedEvents.map((ev) => typeof ev === 'object' ? ev.title : ev).join(', ') : 'None'} full />
                          <DetailItem label="Joined On" value={fmtDT(u.createdAt)} />
                          <DetailItem label="Last Updated" value={fmtDT(u.updatedAt)} />
                        </div>
                        <div className="mt-3 pt-3 border-t border-gray-200">
                          <button onClick={(e) => { e.stopPropagation(); navigate(`/users/${u._id}`); }} className="text-primary-600 hover:text-primary-800 text-sm font-medium">View Full Profile →</button>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
              {users.length === 0 && <tr><td colSpan="7" className="text-center py-8 text-gray-400">No users found</td></tr>}
            </tbody>
          </table>
          {total > 1 && (
            <div className="flex flex-wrap items-center justify-center gap-2 py-4 border-t border-gray-100">
              {Array.from({ length: total }, (_, i) => (
                <button key={i} onClick={() => setPage(i + 1)} className={`w-8 h-8 rounded-lg text-sm font-medium ${page === i + 1 ? 'bg-primary-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>{i + 1}</button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Reset Password Modal */}
      {resetModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-5 sm:p-6 w-full max-w-sm">
            <h3 className="text-lg font-bold mb-4">Reset Password for {resetModal.name}</h3>
            <input type="password" placeholder="New password (min 8 chars)" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="input-field mb-4" />
            <div className="flex gap-3">
              <button onClick={handleResetPassword} disabled={newPassword.length < 8} className="btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed">Reset</button>
              <button onClick={() => { setResetModal(null); setNewPassword(''); }} className="btn-outline flex-1">Cancel</button>
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
    </div>
  );
}

function DetailItem({ label, value, full }) {
  return (
    <div className={full ? 'md:col-span-2 lg:col-span-3' : ''}>
      <span className="text-gray-400 text-xs uppercase tracking-wider">{label}</span>
      <p className="text-gray-700 mt-0.5 break-words">{value}</p>
    </div>
  );
}
