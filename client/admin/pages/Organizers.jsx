import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';
import { HiOutlinePlus, HiOutlineSearch, HiOutlinePencil, HiOutlineTrash } from 'react-icons/hi';
import ConfirmWithPassword from '../components/ConfirmWithPassword';

const TEAMS = [
  'Core Committee',
  'Technical',
  'Design',
  'Marketing',
  'Logistics',
  'Content',
  'Sponsorship',
  'Finance',
  'Registration',
  'Hospitality',
];

export default function Organizers() {
  const [organizers, setOrganizers] = useState([]);
  const [search, setSearch] = useState('');
  const [teamFilter, setTeamFilter] = useState('');
  const [loading, setLoading] = useState(true);

  // Confirmation modal state
  const [confirmModal, setConfirmModal] = useState({
    open: false, title: '', message: '', confirmLabel: '', variant: 'warning', action: null,
  });

  const fetchOrganizers = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/organizers');
      setOrganizers(data.data);
    } catch {
      toast.error('Failed to load organizers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrganizers();
  }, []);

  // Client-side search & filter
  const filtered = organizers.filter((o) => {
    const matchesSearch =
      !search ||
      o.fullName.toLowerCase().includes(search.toLowerCase()) ||
      (o.email && o.email.toLowerCase().includes(search.toLowerCase()));
    const matchesTeam = !teamFilter || o.team === teamFilter;
    return matchesSearch && matchesTeam;
  });

  const handleDelete = (org) => {
    setConfirmModal({
      open: true,
      title: 'Delete Organizer',
      message: `You are about to permanently delete "${org.fullName}". This action cannot be undone.`,
      confirmLabel: 'Delete',
      variant: 'danger',
      action: async (password) => {
        await api.delete(`/organizers/${org._id}`, { data: { adminPassword: password } });
        toast.success('Organizer deleted');
        fetchOrganizers();
      },
    });
  };

  const handleToggleActive = (org) => {
    const newStatus = !org.isActive;
    setConfirmModal({
      open: true,
      title: newStatus ? 'Activate Organizer' : 'Deactivate Organizer',
      message: `You are about to ${newStatus ? 'activate' : 'deactivate'} "${org.fullName}".`,
      confirmLabel: newStatus ? 'Activate' : 'Deactivate',
      variant: 'warning',
      action: async (password) => {
        await api.put(`/organizers/${org._id}`, { isActive: newStatus, adminPassword: password });
        toast.success(`Organizer ${newStatus ? 'activated' : 'deactivated'}`);
        fetchOrganizers();
      },
    });
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <h1 className="text-lg sm:text-2xl font-bold">Organizer Management</h1>
        <Link to="/organizers/new" className="btn-primary flex items-center gap-2 self-start sm:self-auto">
          <HiOutlinePlus className="w-5 h-5" /> Add Organizer
        </Link>
      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-6 flex-wrap">
        <div className="relative w-full sm:max-w-xs">
          <HiOutlineSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field pl-10"
          />
        </div>
        <select
          value={teamFilter}
          onChange={(e) => setTeamFilter(e.target.value)}
          className="input-field w-full sm:w-auto sm:min-w-[160px]"
        >
          <option value="">All Teams</option>
          {TEAMS.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading...</div>
      ) : (
        <div className="card overflow-hidden p-0 overflow-x-auto">
          <table className="w-full text-sm min-w-[700px]">
            <thead>
              <tr className="table-header">
                <th className="px-5 py-3">Image</th>
                <th className="px-5 py-3">Full Name</th>
                <th className="px-5 py-3 hidden sm:table-cell">Email</th>
                <th className="px-5 py-3">Team</th>
                <th className="px-5 py-3">Order</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((o) => (
                <tr key={o._id} className="border-t border-gray-100 hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3">
                    {o.image ? (
                      <img
                        src={o.image}
                        alt={o.fullName}
                        className="w-10 h-10 rounded-full object-cover"
                        onError={(e) => { e.target.style.display = 'none'; }}
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 font-bold text-sm">
                        {o.fullName?.[0] || '?'}
                      </div>
                    )}
                  </td>
                  <td className="px-5 py-3 font-medium">{o.fullName}</td>
                  <td className="px-5 py-3 text-gray-500 hidden sm:table-cell">{o.email || '—'}</td>
                  <td className="px-5 py-3">
                    {o.team ? (
                      <span className="badge badge-blue">{o.team}</span>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-gray-500">{o.order}</td>
                  <td className="px-5 py-3">
                    <button
                      onClick={() => handleToggleActive(o)}
                      className={`badge cursor-pointer ${o.isActive ? 'badge-green' : 'badge-red'}`}
                    >
                      {o.isActive ? 'Active' : 'Inactive'}
                    </button>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <Link
                        to={`/organizers/${o._id}/edit`}
                        className="text-primary-600 hover:text-primary-800"
                        title="Edit"
                      >
                        <HiOutlinePencil className="w-4 h-4" />
                      </Link>
                      <button
                        onClick={() => handleDelete(o)}
                        className="text-red-500 hover:text-red-700"
                        title="Delete"
                      >
                        <HiOutlineTrash className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan="7" className="text-center py-8 text-gray-400">
                    No organizers found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
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
