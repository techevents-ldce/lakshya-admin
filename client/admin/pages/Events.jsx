import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';
import { HiOutlinePlus, HiOutlinePencil, HiOutlineTrash, HiOutlineSearch, HiOutlineChevronDown, HiOutlineChevronUp } from 'react-icons/hi';
import ConfirmWithPassword from '../components/ConfirmWithPassword';

const fmt = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
const fmtDT = (d) => d ? new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

export default function Events() {
  const [events, setEvents] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);

  // Confirmation modal state
  const [confirmModal, setConfirmModal] = useState({ open: false, title: '', message: '', confirmLabel: '', variant: 'danger', action: null });

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const params = { page, limit: 10, search };
      if (categoryFilter) params.category = categoryFilter;
      if (typeFilter) params.eventType = typeFilter;
      const { data } = await api.get('/events', { params });
      setEvents(data.events);
      setTotal(data.pages);
    } catch { toast.error('Failed to load events'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchEvents(); }, [page, search, categoryFilter, typeFilter]);

  // Extract unique categories from events for filter dropdown
  const categories = [...new Set(events.map((e) => e.category).filter(Boolean))];

  const handleDelete = (id, title) => {
    setConfirmModal({
      open: true,
      title: 'Delete Event',
      message: `You are about to permanently delete "${title}". This action cannot be undone.`,
      confirmLabel: 'Delete Event',
      variant: 'danger',
      action: async (password) => {
        await api.delete(`/events/${id}`, { data: { adminPassword: password } });
        toast.success('Event deleted');
        fetchEvents();
      },
    });
  };

  const handleToggle = (id, title, isOpen) => {
    const action = isOpen ? 'close' : 'open';
    setConfirmModal({
      open: true,
      title: `${isOpen ? 'Close' : 'Open'} Registration`,
      message: `You are about to ${action} registration for "${title}".`,
      confirmLabel: `${isOpen ? 'Close' : 'Open'} Registration`,
      variant: 'warning',
      action: async (password) => {
        await api.patch(`/events/${id}/toggle-registration`, { isOpen: !isOpen, adminPassword: password });
        toast.success('Registration toggled');
        fetchEvents();
      },
    });
  };

  const toggleExpand = (id) => setExpanded(expanded === id ? null : id);

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <h1 className="text-lg sm:text-2xl font-bold">Event Management</h1>
        <Link to="/events/new" className="btn-primary flex items-center gap-2 self-start sm:self-auto"><HiOutlinePlus className="w-5 h-5" /> Create Event</Link>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-6 flex-wrap">
        <div className="relative w-full sm:max-w-xs">
          <HiOutlineSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input id="event-search" type="text" placeholder="Search events..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="input-field pl-10" />
        </div>
        <select value={categoryFilter} onChange={(e) => { setCategoryFilter(e.target.value); setPage(1); }} className="input-field w-full sm:w-auto sm:min-w-[140px]">
          <option value="">All Categories</option>
          {categories.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={typeFilter} onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }} className="input-field w-full sm:w-auto sm:min-w-[120px]">
          <option value="">All Types</option>
          <option value="solo">Solo</option>
          <option value="team">Team</option>
        </select>
      </div>

      {loading ? <div className="text-center py-12 text-gray-400">Loading...</div> : (
        <div className="card overflow-hidden p-0 overflow-x-auto">
          <table className="w-full text-sm min-w-[600px]">
            <thead><tr className="table-header">
              <th className="px-5 py-3 w-8"></th><th className="px-5 py-3">Title</th><th className="px-5 py-3 hidden sm:table-cell">Category</th><th className="px-5 py-3 hidden sm:table-cell">Type</th><th className="px-5 py-3">Cap.</th><th className="px-5 py-3">Fee</th><th className="px-5 py-3">Reg.</th><th className="px-5 py-3">Actions</th>
            </tr></thead>
            <tbody>
              {events.map((e) => (
                <>
                  <tr key={e._id} className={`border-t border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer ${expanded === e._id ? 'bg-gray-50' : ''}`} onClick={() => toggleExpand(e._id)}>
                    <td className="px-5 py-3 text-gray-400">
                      {expanded === e._id ? <HiOutlineChevronUp className="w-4 h-4" /> : <HiOutlineChevronDown className="w-4 h-4" />}
                    </td>
                    <td className="px-5 py-3 font-medium">{e.title}</td>
                    <td className="px-5 py-3 text-gray-500 hidden sm:table-cell">{e.category || '—'}</td>
                    <td className="px-5 py-3 hidden sm:table-cell"><span className={`badge ${e.eventType === 'team' ? 'badge-blue' : 'badge-green'}`}>{e.eventType}</span></td>
                    <td className="px-5 py-3">{e.capacity}</td>
                    <td className="px-5 py-3">{e.isPaid ? `₹${e.registrationFee}` : 'Free'}</td>
                    <td className="px-5 py-3">
                      <button onClick={(ev) => { ev.stopPropagation(); handleToggle(e._id, e.title, e.isRegistrationOpen); }} className={`badge cursor-pointer ${e.isRegistrationOpen ? 'badge-green' : 'badge-red'}`}>
                        {e.isRegistrationOpen ? 'Open' : 'Closed'}
                      </button>
                    </td>
                    <td className="px-5 py-3 flex items-center gap-2" onClick={(ev) => ev.stopPropagation()}>
                      <Link to={`/events/${e._id}/edit`} className="text-primary-600 hover:text-primary-800"><HiOutlinePencil className="w-4 h-4" /></Link>
                      <button onClick={() => handleDelete(e._id, e.title)} className="text-red-500 hover:text-red-700"><HiOutlineTrash className="w-4 h-4" /></button>
                    </td>
                  </tr>
                  {/* Expanded Detail Row */}
                  {expanded === e._id && (
                    <tr key={`${e._id}-detail`} className="bg-gray-50/80">
                      <td colSpan="8" className="px-5 py-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-3 text-sm">
                          <DetailItem label="Slug" value={e.slug} />
                          <DetailItem label="Description" value={e.description || '—'} full />
                          <DetailItem label="Venue" value={e.venue || '—'} />
                          <DetailItem label="Event Date" value={fmtDT(e.eventDate)} />
                          <DetailItem label="Registration Deadline" value={fmtDT(e.registrationDeadline)} />
                          <DetailItem label="Event Type" value={e.eventType} />
                          {e.eventType === 'team' && (
                            <DetailItem label="Team Size" value={`${e.teamSizeMin || 1} – ${e.teamSizeMax || 1} members`} />
                          )}
                          <DetailItem label="Capacity" value={e.capacity} />
                          <DetailItem label="Paid" value={e.isPaid ? `Yes — ₹${e.registrationFee}` : 'No (Free)'} />
                          <DetailItem label="Registration" value={e.isRegistrationOpen ? 'Open' : 'Closed'} />
                          <DetailItem label="Coordinators" value={e.coordinators?.length > 0 ? e.coordinators.map((c) => `${c.name} (${c.email})`).join(', ') : 'None assigned'} full />
                          {e.banner && <DetailItem label="Banner URL" value={e.banner} full />}
                          <DetailItem label="Created" value={fmtDT(e.createdAt)} />
                          <DetailItem label="Last Updated" value={fmtDT(e.updatedAt)} />
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
              {events.length === 0 && <tr><td colSpan="8" className="text-center py-8 text-gray-400">No events found</td></tr>}
            </tbody>
          </table>
          {/* Pagination */}
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
