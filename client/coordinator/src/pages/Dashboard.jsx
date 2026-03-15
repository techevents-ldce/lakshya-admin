import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';
import { HiOutlineUsers, HiOutlineQrcode, HiOutlineDocumentDownload } from 'react-icons/hi';

export default function Dashboard() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAssigned = async () => {
      try {
        // Use dedicated profile endpoint that returns populated assignedEvents
        const { data } = await api.get('/users/me/profile');
        const user = data.data;
        setEvents(user.assignedEvents || []);
      } catch (err) {
        toast.error('Failed to load events');
      } finally { setLoading(false); }
    };
    fetchAssigned();
  }, []);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600"></div></div>;

  return (
    <div>
      <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">My Assigned Events</h1>
      <p className="text-sm text-gray-500 mb-8">Manage participants and verify tickets for your events</p>

      {events.length === 0 ? (
        <div className="card text-center py-16">
          <p className="text-gray-400 text-lg">No events assigned yet</p>
          <p className="text-gray-400 text-sm mt-2">Contact admin to get events assigned</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {events.map((ev) => (
            <div key={ev._id} className="card group">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-bold text-lg text-gray-900 group-hover:text-primary-700 transition-colors">{ev.title}</h3>
                  <p className="text-xs text-gray-400 mt-1">{ev.category || 'General'} · {ev.eventType}</p>
                </div>
                <span className={`badge ${ev.isRegistrationOpen ? 'badge-green' : 'badge-red'}`}>
                  {ev.isRegistrationOpen ? 'Open' : 'Closed'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-5 text-sm">
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-gray-400 text-xs">Capacity</p>
                  <p className="font-semibold text-gray-900">{ev.capacity}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-gray-400 text-xs">Fee</p>
                  <p className="font-semibold text-gray-900">{ev.isPaid ? `₹${ev.registrationFee}` : 'Free'}</p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <Link to={`/events/${ev._id}/participants`} className="btn-primary text-xs flex-1 text-center flex items-center justify-center gap-1.5 py-2">
                  <HiOutlineUsers className="w-4 h-4" /> Participants
                </Link>
                <Link to={`/events/${ev._id}/scan`} className="btn-outline text-xs flex-1 text-center flex items-center justify-center gap-1.5 py-2">
                  <HiOutlineQrcode className="w-4 h-4" /> Scan QR
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
