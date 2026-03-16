import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';
import { HiOutlinePlus, HiOutlineKey, HiOutlineSearch } from 'react-icons/hi';
import ConfirmWithPassword from '../components/ConfirmWithPassword';

export default function Coordinators() {
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
      message: `You are about to change event assignments for "${assignModal.name}".`,
      confirmLabel: 'Save Assignments',
      variant: 'warning',
      action: async (password) => {
        await api.patch(`/users/${assignModal._id}/assign-events`, { eventIds: selectedEvents, adminPassword: password });
        toast.success('Events assigned');
        setAssignModal(null);
        fetchCoordinators();
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
        toast.success('Password reset');
        setResetModal(null);
        setNewPassword('');
      },
    });
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <h1 className="text-lg sm:text-2xl font-bold">Coordinator Management</h1>
        <Link to="/coordinators/new" className="btn-primary flex items-center gap-2 self-start sm:self-auto"><HiOutlinePlus className="w-5 h-5" /> Add Coordinator</Link>
      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-6 flex-wrap">
        <div className="relative w-full sm:max-w-xs">
          <HiOutlineSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input type="text" placeholder="Search coordinators..." value={search} onChange={(e) => setSearch(e.target.value)} className="input-field pl-10" />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="input-field w-full sm:w-auto sm:min-w-[140px]">
          <option value="">All Status</option>
          <option value="true">Active</option>
          <option value="false">Blocked</option>
        </select>
      </div>

      {loading ? <div className="text-center py-12 text-gray-400">Loading...</div> : (
        <div className="card overflow-hidden p-0 overflow-x-auto">
          <table className="w-full text-sm min-w-[500px]">
            <thead><tr className="table-header">
              <th className="px-5 py-3">Name</th><th className="px-5 py-3 hidden sm:table-cell">Email</th><th className="px-5 py-3">Status</th><th className="px-5 py-3">Assigned Events</th><th className="px-5 py-3">Actions</th>
            </tr></thead>
            <tbody>
              {coordinators.map((c) => (
                <tr key={c._id} className="border-t border-gray-100 hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3 font-medium">{c.name}</td>
                  <td className="px-5 py-3 text-gray-500 hidden sm:table-cell">{c.email}</td>
                  <td className="px-5 py-3"><span className={`badge ${c.isActive ? 'badge-green' : 'badge-red'}`}>{c.isActive ? 'Active' : 'Blocked'}</span></td>
                  <td className="px-5 py-3 text-gray-500">{c.assignedEvents?.length || 0} events</td>
                  <td className="px-5 py-3 flex items-center gap-2">
                    <button onClick={() => openAssign(c)} className="btn-outline text-xs px-3 py-1">Assign</button>
                    <button onClick={() => setResetModal(c)} className="text-primary-600 hover:text-primary-800"><HiOutlineKey className="w-4 h-4" /></button>
                  </td>
                </tr>
              ))}
              {coordinators.length === 0 && <tr><td colSpan="5" className="text-center py-8 text-gray-400">No coordinators found</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {/* Assign Events Modal */}
      {assignModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-5 sm:p-6 w-full max-w-md max-h-[80vh] overflow-y-auto">
            <h3 className="text-lg font-bold mb-4">Assign Events to {assignModal.name}</h3>
            <div className="space-y-2 mb-6">
              {events.map((ev) => (
                <label key={ev._id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer">
                  <input type="checkbox" checked={selectedEvents.includes(ev._id)} onChange={() => setSelectedEvents((prev) => prev.includes(ev._id) ? prev.filter((x) => x !== ev._id) : [...prev, ev._id])}
                    className="w-4 h-4 rounded text-primary-600 focus:ring-primary-500" />
                  <span className="text-sm">{ev.title}</span>
                </label>
              ))}
            </div>
            <div className="flex gap-3">
              <button onClick={handleAssign} className="btn-primary flex-1">Save</button>
              <button onClick={() => setAssignModal(null)} className="btn-outline flex-1">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {resetModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-5 sm:p-6 w-full max-w-sm">
            <h3 className="text-lg font-bold mb-4">Reset Password for {resetModal.name}</h3>
            <input type="password" placeholder="New password (min 8 chars)" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="input-field mb-4" />
            <div className="flex gap-3">
              <button onClick={handleResetPassword} disabled={newPassword.length < 8} className="btn-primary flex-1">Reset</button>
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
