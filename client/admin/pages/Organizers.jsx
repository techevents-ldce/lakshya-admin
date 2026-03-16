import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';
import {
  HiOutlinePlus,
  HiOutlineSearch,
  HiOutlinePencil,
  HiOutlineTrash,
  HiOutlineChevronDown,
  HiOutlineChevronUp,
  HiOutlineExternalLink,
} from 'react-icons/hi';
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
  const [expandedId, setExpandedId] = useState(null);

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

  const toggleExpand = (id) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const SocialLink = ({ url, label }) => {
    if (!url) return <span className="text-gray-400 text-sm">Not provided</span>;
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-primary-600 hover:text-primary-800 text-sm inline-flex items-center gap-1 underline underline-offset-2"
      >
        {label} <HiOutlineExternalLink className="w-3.5 h-3.5" />
      </a>
    );
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
        <span className="text-xs text-gray-500 ml-auto hidden sm:inline">
          {filtered.length} organizer{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading...</div>
      ) : (
        <div className="card overflow-hidden p-0 overflow-x-auto">
          <table className="w-full text-sm min-w-[700px]">
            <thead>
              <tr className="table-header">
                <th className="px-5 py-3 w-8"></th>
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
                <>
                  <tr
                    key={o._id}
                    className={`border-t border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer ${expandedId === o._id ? 'bg-primary-50/40' : ''}`}
                    onClick={() => toggleExpand(o._id)}
                  >
                    <td className="px-3 py-3 text-gray-400">
                      {expandedId === o._id ? (
                        <HiOutlineChevronUp className="w-4 h-4" />
                      ) : (
                        <HiOutlineChevronDown className="w-4 h-4" />
                      )}
                    </td>
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
                        onClick={(e) => { e.stopPropagation(); handleToggleActive(o); }}
                        className={`badge cursor-pointer ${o.isActive ? 'badge-green' : 'badge-red'}`}
                      >
                        {o.isActive ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
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

                  {/* ── Expanded Detail Row ── */}
                  {expandedId === o._id && (
                    <tr key={`${o._id}-detail`} className="bg-gray-50/80">
                      <td colSpan="8" className="px-6 py-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                          {/* Image (larger) */}
                          <div className="flex flex-col items-center gap-2 sm:col-span-1 row-span-2">
                            {o.image ? (
                              <img
                                src={o.image}
                                alt={o.fullName}
                                className="w-24 h-24 rounded-xl object-cover shadow-sm border border-gray-200"
                                onError={(e) => { e.target.style.display = 'none'; }}
                              />
                            ) : (
                              <div className="w-24 h-24 rounded-xl bg-primary-100 flex items-center justify-center text-primary-600 font-bold text-2xl">
                                {o.fullName?.[0] || '?'}
                              </div>
                            )}
                            <span className="text-xs text-gray-500 font-medium">{o.fullName}</span>
                          </div>

                          {/* Basic Info */}
                          <div className="space-y-2">
                            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Basic Info</h4>
                            <div>
                              <span className="text-xs text-gray-400">Full Name</span>
                              <p className="text-sm font-medium text-gray-800">{o.fullName}</p>
                            </div>
                            <div>
                              <span className="text-xs text-gray-400">Email</span>
                              <p className="text-sm text-gray-800">{o.email || '—'}</p>
                            </div>
                            <div>
                              <span className="text-xs text-gray-400">Team</span>
                              <p className="text-sm text-gray-800">{o.team || '—'}</p>
                            </div>
                          </div>

                          {/* Social Links */}
                          <div className="space-y-2">
                            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Social Links</h4>
                            <div>
                              <span className="text-xs text-gray-400">LinkedIn</span>
                              <div><SocialLink url={o.linkedinUrl} label="LinkedIn Profile" /></div>
                            </div>
                            <div>
                              <span className="text-xs text-gray-400">GitHub</span>
                              <div><SocialLink url={o.githubUrl} label="GitHub Profile" /></div>
                            </div>
                            <div>
                              <span className="text-xs text-gray-400">Instagram</span>
                              <div><SocialLink url={o.instagramUrl} label="Instagram Profile" /></div>
                            </div>
                          </div>

                          {/* Meta */}
                          <div className="space-y-2">
                            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Meta</h4>
                            <div>
                              <span className="text-xs text-gray-400">Display Order</span>
                              <p className="text-sm font-medium text-gray-800">{o.order}</p>
                            </div>
                            <div>
                              <span className="text-xs text-gray-400">Status</span>
                              <p className="text-sm">
                                <span className={`badge ${o.isActive ? 'badge-green' : 'badge-red'}`}>
                                  {o.isActive ? 'Active' : 'Inactive'}
                                </span>
                              </p>
                            </div>
                            <div>
                              <span className="text-xs text-gray-400">Added On</span>
                              <p className="text-sm text-gray-800">{formatDate(o.createdAt)}</p>
                            </div>
                            <div>
                              <span className="text-xs text-gray-400">Last Updated</span>
                              <p className="text-sm text-gray-800">{formatDate(o.updatedAt)}</p>
                            </div>
                          </div>
                        </div>

                        {/* Quick actions */}
                        <div className="flex items-center gap-3 mt-4 pt-3 border-t border-gray-200">
                          <Link
                            to={`/organizers/${o._id}/edit`}
                            className="btn-primary text-xs px-3 py-1.5 flex items-center gap-1.5"
                          >
                            <HiOutlinePencil className="w-3.5 h-3.5" /> Edit
                          </Link>
                          <button
                            onClick={() => handleDelete(o)}
                            className="btn-danger text-xs px-3 py-1.5 flex items-center gap-1.5"
                          >
                            <HiOutlineTrash className="w-3.5 h-3.5" /> Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan="8" className="text-center py-8 text-gray-400">
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
