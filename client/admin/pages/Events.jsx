import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';
import { HiOutlinePlus, HiOutlinePencil, HiOutlineTrash, HiOutlineSearch } from 'react-icons/hi';

export default function Events() {
  const [events, setEvents] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/events', { params: { page, limit: 10, search } });
      setEvents(data.events);
      setTotal(data.pages);
    } catch { toast.error('Failed to load events'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchEvents(); }, [page, search]);

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this event?')) return;
    try {
      await api.delete(`/events/${id}`);
      toast.success('Event deleted');
      fetchEvents();
    } catch { toast.error('Delete failed'); }
  };

  const handleToggle = async (id, isOpen) => {
    try {
      await api.patch(`/events/${id}/toggle-registration`, { isOpen: !isOpen });
      toast.success('Registration toggled');
      fetchEvents();
    } catch { toast.error('Toggle failed'); }
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <h1 className="text-lg sm:text-2xl font-bold">Event Management</h1>
        <Link to="/events/new" className="btn-primary flex items-center gap-2 self-start sm:self-auto"><HiOutlinePlus className="w-5 h-5" /> Create Event</Link>
      </div>

      {/* Search */}
      <div className="relative mb-6 w-full sm:max-w-md">
        <HiOutlineSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
        <input id="event-search" type="text" placeholder="Search events..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="input-field pl-10" />
      </div>

      {loading ? <div className="text-center py-12 text-gray-400">Loading...</div> : (
        <div className="card overflow-hidden p-0 overflow-x-auto">
          <table className="w-full text-sm min-w-[600px]">
            <thead><tr className="table-header">
              <th className="px-5 py-3">Title</th><th className="px-5 py-3 hidden sm:table-cell">Category</th><th className="px-5 py-3 hidden sm:table-cell">Type</th><th className="px-5 py-3">Cap.</th><th className="px-5 py-3">Fee</th><th className="px-5 py-3">Reg.</th><th className="px-5 py-3">Actions</th>
            </tr></thead>
            <tbody>
              {events.map((e) => (
                <tr key={e._id} className="border-t border-gray-100 hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3 font-medium">{e.title}</td>
                  <td className="px-5 py-3 text-gray-500 hidden sm:table-cell">{e.category || '—'}</td>
                  <td className="px-5 py-3 hidden sm:table-cell"><span className={`badge ${e.eventType === 'team' ? 'badge-blue' : 'badge-green'}`}>{e.eventType}</span></td>
                  <td className="px-5 py-3">{e.capacity}</td>
                  <td className="px-5 py-3">{e.isPaid ? `₹${e.registrationFee}` : 'Free'}</td>
                  <td className="px-5 py-3">
                    <button onClick={() => handleToggle(e._id, e.isRegistrationOpen)} className={`badge cursor-pointer ${e.isRegistrationOpen ? 'badge-green' : 'badge-red'}`}>
                      {e.isRegistrationOpen ? 'Open' : 'Closed'}
                    </button>
                  </td>
                  <td className="px-5 py-3 flex items-center gap-2">
                    <Link to={`/events/${e._id}/edit`} className="text-primary-600 hover:text-primary-800"><HiOutlinePencil className="w-4 h-4" /></Link>
                    <button onClick={() => handleDelete(e._id)} className="text-red-500 hover:text-red-700"><HiOutlineTrash className="w-4 h-4" /></button>
                  </td>
                </tr>
              ))}
              {events.length === 0 && <tr><td colSpan="7" className="text-center py-8 text-gray-400">No events found</td></tr>}
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
    </div>
  );
}
