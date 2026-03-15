import { useState, useEffect } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { HiOutlineSearch, HiOutlineBan, HiOutlineCheckCircle, HiOutlineChevronDown, HiOutlineChevronUp } from 'react-icons/hi';
import ConfirmWithPassword from '../components/ConfirmWithPassword';

const fmtDT = (d) => d ? new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

export default function Users() {
  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);

  // Confirmation modal state
  const [confirmModal, setConfirmModal] = useState({ open: false, title: '', message: '', confirmLabel: '', variant: 'danger', action: null });

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/users', { params: { page, limit: 15, search } });
      setUsers(data.users);
      setTotal(data.pages);
    } catch { toast.error('Failed to load users'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchUsers(); }, [page, search]);

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

  const toggleExpand = (id) => setExpanded(expanded === id ? null : id);

  return (
    <div>
      <h1 className="text-lg sm:text-2xl font-bold mb-6">User Management</h1>

      <div className="relative mb-6 w-full sm:max-w-md">
        <HiOutlineSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
        <input type="text" placeholder="Search by name or email..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="input-field pl-10" />
      </div>

      {loading ? <div className="text-center py-12 text-gray-400">Loading...</div> : (
        <div className="card overflow-hidden p-0 overflow-x-auto">
          <table className="w-full text-sm min-w-[550px]">
            <thead><tr className="table-header">
              <th className="px-5 py-3 w-8"></th><th className="px-5 py-3">Name</th><th className="px-5 py-3">Email</th><th className="px-5 py-3 hidden sm:table-cell">College</th><th className="px-5 py-3 hidden sm:table-cell">Role</th><th className="px-5 py-3">Status</th><th className="px-5 py-3">Action</th>
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
                      {u.role !== 'admin' && (
                        <button onClick={() => toggleBlock(u._id, u.name, u.isActive)} className={`flex items-center gap-1 text-xs font-medium ${u.isActive ? 'text-red-600 hover:text-red-800' : 'text-emerald-600 hover:text-emerald-800'}`}>
                          {u.isActive ? <><HiOutlineBan className="w-4 h-4" /> Block</> : <><HiOutlineCheckCircle className="w-4 h-4" /> Unblock</>}
                        </button>
                      )}
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
