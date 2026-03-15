import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';

const defaultData = { title: '', description: '', category: '', eventType: 'solo', capacity: 100, registrationFee: 0, isPaid: false, teamSizeMin: 1, teamSizeMax: 4, registrationDeadline: '', venue: '', eventDate: '' };

export default function EventForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const [form, setForm] = useState(defaultData);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isEdit) {
      api.get(`/events/${id}`).then(({ data }) => {
        const e = data.data;
        setForm({ title: e.title, description: e.description || '', category: e.category || '', eventType: e.eventType, capacity: e.capacity, registrationFee: e.registrationFee, isPaid: e.isPaid, teamSizeMin: e.teamSizeMin, teamSizeMax: e.teamSizeMax, registrationDeadline: e.registrationDeadline ? e.registrationDeadline.slice(0, 16) : '', venue: e.venue || '', eventDate: e.eventDate ? e.eventDate.slice(0, 16) : '' });
      });
    }
  }, [id]);

  const onChange = (field) => (e) => {
    const val = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setForm((p) => ({ ...p, [field]: val }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = { ...form, capacity: Number(form.capacity), registrationFee: Number(form.registrationFee), teamSizeMin: Number(form.teamSizeMin), teamSizeMax: Number(form.teamSizeMax) };
      if (isEdit) await api.put(`/events/${id}`, payload);
      else await api.post('/events', payload);
      toast.success(isEdit ? 'Event updated' : 'Event created');
      navigate('/events');
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setLoading(false); }
  };

  return (
    <div>
      <h1 className="text-lg sm:text-2xl font-bold mb-6">{isEdit ? 'Edit Event' : 'Create Event'}</h1>
      <form onSubmit={handleSubmit} className="card max-w-3xl space-y-5 p-4 sm:p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="md:col-span-2">
            <label className="label">Title *</label>
            <input className="input-field" value={form.title} onChange={onChange('title')} required />
          </div>
          <div className="md:col-span-2">
            <label className="label">Description</label>
            <textarea className="input-field" rows="3" value={form.description} onChange={onChange('description')} />
          </div>
          <div>
            <label className="label">Category</label>
            <input className="input-field" value={form.category} onChange={onChange('category')} placeholder="e.g. Technical, Cultural" />
          </div>
          <div>
            <label className="label">Event Type</label>
            <select className="input-field" value={form.eventType} onChange={onChange('eventType')}>
              <option value="solo">Solo</option><option value="team">Team</option>
            </select>
          </div>
          <div>
            <label className="label">Capacity</label>
            <input type="number" className="input-field" value={form.capacity} onChange={onChange('capacity')} min="1" />
          </div>
          <div>
            <label className="label">Venue</label>
            <input className="input-field" value={form.venue} onChange={onChange('venue')} />
          </div>
          {form.eventType === 'team' && (
            <>
              <div>
                <label className="label">Min Team Size</label>
                <input type="number" className="input-field" value={form.teamSizeMin} onChange={onChange('teamSizeMin')} min="1" />
              </div>
              <div>
                <label className="label">Max Team Size</label>
                <input type="number" className="input-field" value={form.teamSizeMax} onChange={onChange('teamSizeMax')} min="1" />
              </div>
            </>
          )}
          <div className="flex items-center gap-3 md:col-span-2">
            <input type="checkbox" id="isPaid" checked={form.isPaid} onChange={onChange('isPaid')} className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500" />
            <label htmlFor="isPaid" className="text-sm font-medium text-gray-700">Paid Event</label>
          </div>
          {form.isPaid && (
            <div>
              <label className="label">Registration Fee (₹)</label>
              <input type="number" className="input-field" value={form.registrationFee} onChange={onChange('registrationFee')} min="0" />
            </div>
          )}
          <div>
            <label className="label">Registration Deadline</label>
            <input type="datetime-local" className="input-field" value={form.registrationDeadline} onChange={onChange('registrationDeadline')} />
          </div>
          <div>
            <label className="label">Event Date</label>
            <input type="datetime-local" className="input-field" value={form.eventDate} onChange={onChange('eventDate')} />
          </div>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
          <button type="submit" disabled={loading} className="btn-primary">{loading ? 'Saving...' : (isEdit ? 'Update Event' : 'Create Event')}</button>
          <button type="button" onClick={() => navigate('/events')} className="btn-outline">Cancel</button>
        </div>
      </form>
    </div>
  );
}
