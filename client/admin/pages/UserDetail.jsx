import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';
import { HiOutlineArrowLeft, HiOutlineBan } from 'react-icons/hi';
import ConfirmWithPassword from '../components/ConfirmWithPassword';

export default function UserDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('registrations');
  const [confirmModal, setConfirmModal] = useState({ open: false, title: '', message: '', confirmLabel: '', variant: 'warning', action: null });

  useEffect(() => {
    setLoading(true);
    api.get(`/users/${id}/detail`).then(({ data }) => setUser(data.data)).catch(() => toast.error('Failed to load user')).finally(() => setLoading(false));
  }, [id]);

  const handleDeactivate = () => {
    setConfirmModal({
      open: true, title: 'Deactivate User', confirmLabel: 'Deactivate', variant: 'danger',
      message: 'This will deactivate the user account. They will not be able to log in.',
      action: async (pw) => {
        await api.patch(`/users/${id}/deactivate`, { adminPassword: pw });
        toast.success('User deactivated');
        setUser((prev) => ({ ...prev, isActive: false }));
      },
    });
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600"></div></div>;
  if (!user) return <div className="text-center py-12 text-gray-400">User not found</div>;

  const tabs = [
    { key: 'registrations', label: `Registrations (${user.registrations?.length || 0})` },
    { key: 'tickets', label: `Tickets (${user.tickets?.length || 0})` },
    { key: 'orders', label: `Orders (${user.orders?.length || 0})` },
  ];

  return (
    <div>
      <button onClick={() => navigate('/users')} className="flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-4 text-sm">
        <HiOutlineArrowLeft className="w-4 h-4" /> Back to Users
      </button>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-lg sm:text-2xl font-bold text-gray-900">{user.name}</h1>
          <p className="text-sm text-gray-500">{user.email}</p>
        </div>
        {user.isActive && (
          <button onClick={handleDeactivate} className="btn-danger text-sm flex items-center gap-1.5"><HiOutlineBan className="w-4 h-4" /> Deactivate</button>
        )}
      </div>

      {/* User Info Card */}
      <div className="card mb-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div><dt className="text-gray-500 text-xs">Role</dt><dd className={`font-medium badge ${user.role === 'admin' ? 'badge-yellow' : user.role === 'coordinator' ? 'badge-blue' : 'badge-green'} mt-1 inline-block`}>{user.role}</dd></div>
          <div><dt className="text-gray-500 text-xs">Status</dt><dd className={`font-medium ${user.isActive ? 'text-emerald-600' : 'text-red-600'}`}>{user.isActive ? 'Active' : 'Deactivated'}</dd></div>
          {user.phone && <div><dt className="text-gray-500 text-xs">Phone</dt><dd className="font-medium">{user.phone}</dd></div>}
          {user.college && <div><dt className="text-gray-500 text-xs">College</dt><dd className="font-medium">{user.college}</dd></div>}
          {user.branch && <div><dt className="text-gray-500 text-xs">Branch</dt><dd className="font-medium">{user.branch}</dd></div>}
          {user.year && <div><dt className="text-gray-500 text-xs">Year</dt><dd className="font-medium">{user.year}</dd></div>}
          <div><dt className="text-gray-500 text-xs">Joined</dt><dd className="font-medium">{new Date(user.createdAt).toLocaleDateString()}</dd></div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 border-b border-gray-200">
        {tabs.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 ${tab === t.key ? 'border-primary-600 text-primary-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Registrations Tab */}
      {tab === 'registrations' && (
        <div className="card overflow-hidden p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="table-header"><th className="px-4 py-3">Event</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 hidden sm:table-cell">Mode</th><th className="px-4 py-3 hidden sm:table-cell">Date</th><th className="px-4 py-3">Action</th></tr></thead>
            <tbody>
              {(user.registrations || []).map((r) => (
                <tr key={r._id} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{r.eventId?.title || 'N/A'}</td>
                  <td className="px-4 py-3"><span className={`badge ${r.status === 'confirmed' ? 'badge-green' : r.status === 'cancelled' ? 'badge-red' : 'badge-yellow'}`}>{r.status}</span></td>
                  <td className="px-4 py-3 hidden sm:table-cell">{r.teamId ? 'Team' : 'Solo'}</td>
                  <td className="px-4 py-3 text-xs text-gray-500 hidden sm:table-cell">{new Date(r.createdAt).toLocaleDateString()}</td>
                  <td className="px-4 py-3"><button onClick={() => navigate(`/registrations/${r._id}`)} className="text-primary-600 text-xs font-medium">View →</button></td>
                </tr>
              ))}
              {(!user.registrations || user.registrations.length === 0) && <tr><td colSpan="5" className="text-center py-8 text-gray-400">No registrations</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {/* Tickets Tab */}
      {tab === 'tickets' && (
        <div className="card overflow-hidden p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="table-header"><th className="px-4 py-3">Ticket ID</th><th className="px-4 py-3">Event</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 hidden sm:table-cell">Scanned</th></tr></thead>
            <tbody>
              {(user.tickets || []).map((t) => (
                <tr key={t._id} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs">{t.ticketId?.slice(0, 16)}...</td>
                  <td className="px-4 py-3">{t.eventId?.title || 'N/A'}</td>
                  <td className="px-4 py-3"><span className={`badge ${t.status === 'valid' ? 'badge-green' : t.status === 'used' ? 'badge-blue' : 'badge-red'}`}>{t.status === 'valid' ? 'Active' : t.status}</span></td>
                  <td className="px-4 py-3 text-xs text-gray-500 hidden sm:table-cell">{t.scannedAt ? new Date(t.scannedAt).toLocaleString() : '—'}</td>
                </tr>
              ))}
              {(!user.tickets || user.tickets.length === 0) && <tr><td colSpan="4" className="text-center py-8 text-gray-400">No tickets</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {/* Orders Tab */}
      {tab === 'orders' && (
        <div className="card overflow-hidden p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="table-header"><th className="px-4 py-3">Order ID</th><th className="px-4 py-3">Amount</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 hidden sm:table-cell">Date</th><th className="px-4 py-3">Action</th></tr></thead>
            <tbody>
              {(user.orders || []).map((o) => (
                <tr key={o._id} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs">{(o.orderId || o._id)?.slice(0, 12)}...</td>
                  <td className="px-4 py-3 font-semibold">₹{(o.totalAmount || 0).toLocaleString()}</td>
                  <td className="px-4 py-3"><span className={`badge ${o.status === 'success' ? 'badge-green' : o.status === 'failed' || o.status === 'cancelled' ? 'badge-red' : 'badge-yellow'}`}>{o.status}</span></td>
                  <td className="px-4 py-3 text-xs text-gray-500 hidden sm:table-cell">{new Date(o.createdAt).toLocaleDateString()}</td>
                  <td className="px-4 py-3"><button onClick={() => navigate(`/orders/${o._id}`)} className="text-primary-600 text-xs font-medium">View →</button></td>
                </tr>
              ))}
              {(!user.orders || user.orders.length === 0) && <tr><td colSpan="5" className="text-center py-8 text-gray-400">No orders</td></tr>}
            </tbody>
          </table>
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
