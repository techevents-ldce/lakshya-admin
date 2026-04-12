import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../src/services/api';
import toast from 'react-hot-toast';
import { HiOutlineCalendar, HiOutlineLocationMarker, HiOutlineUserGroup, HiOutlineCurrencyRupee, HiOutlineInformationCircle, HiOutlineServer } from 'react-icons/hi';
import ConfirmWithPassword from '../components/ConfirmWithPassword';

const defaultData = { title: '', description: '', category: '', eventType: 'solo', capacity: 100, registrationFee: 0, isPaid: false, teamSizeMin: 1, teamSizeMax: 4, registrationDeadline: '', venue: '', eventDate: '' };

export default function EventForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const [form, setForm] = useState(defaultData);
  const [loading, setLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

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
    setShowConfirm(true);
  };

  const handleConfirmedSubmit = async (password) => {
    setLoading(true);
    try {
      const payload = { ...form, capacity: Number(form.capacity), registrationFee: Number(form.registrationFee), teamSizeMin: Number(form.teamSizeMin), teamSizeMax: Number(form.teamSizeMax), adminPassword: password };
      if (isEdit) {
        await api.put(`/events/${id}`, payload);
        toast.success('Event updated');
      } else {
        await api.post('/events', payload);
        toast.success('Event created');
      }
      navigate('/events');
    } finally { setLoading(false); }
  };

  return (
    <div className="animate-fade-in space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight uppercase leading-none mb-2">
          {isEdit ? 'Edit Event' : 'Create Event'}
        </h1>
        <p className="text-slate-500 font-medium">Configure event details and registration parameters</p>
      </div>

      <form onSubmit={handleSubmit} className="card max-w-4xl space-y-12 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary-600/5 blur-[120px] pointer-events-none"></div>

        {/* Basic Information */}
        <section className="space-y-6 relative z-10">
          <div className="flex items-center gap-3 border-l-2 border-primary-500 pl-4 py-1">
             <HiOutlineInformationCircle className="w-5 h-5 text-primary-500" />
             <h3 className="text-[10px] font-bold text-white uppercase tracking-wider">Basic Information</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider ml-1 mb-2 block">Event Title *</label>
              <input className="input-field py-4 text-base font-bold tracking-tight bg-slate-950 border-slate-800" value={form.title} onChange={onChange('title')} required placeholder="Enter event name..." />
            </div>
            <div className="md:col-span-2">
              <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider ml-1 mb-2 block">Description</label>
              <textarea className="input-field py-4 text-sm font-semibold bg-slate-950 border-slate-800" rows="4" value={form.description} onChange={onChange('description')} placeholder="Detail event scope and requirements..." />
            </div>
            <div>
              <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider ml-1 mb-2 block">Category</label>
              <input className="input-field py-3 text-sm font-semibold bg-slate-950 border-slate-800 uppercase tracking-wider" value={form.category} onChange={onChange('category')} placeholder="e.g. TECHNICAL, CULTURAL" />
            </div>
            <div>
              <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider ml-1 mb-2 block">Event Type</label>
              <select className="input-field py-3 text-[10px] font-bold uppercase tracking-wider bg-slate-950 border-slate-800" value={form.eventType} onChange={onChange('eventType')}>
                <option value="solo" className="bg-slate-950 font-bold">SOLO EVENT</option>
                <option value="team" className="bg-slate-950 font-bold">TEAM EVENT</option>
              </select>
            </div>
          </div>
        </section>

        {/* Capacity & Logistics */}
        <section className="space-y-6 relative z-10">
          <div className="flex items-center gap-3 border-l-2 border-primary-500 pl-4 py-1">
             <HiOutlineUserGroup className="w-5 h-5 text-primary-500" />
             <h3 className="text-[10px] font-bold text-white uppercase tracking-wider">Capacity & Logistics</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className={form.eventType === 'team' ? 'md:col-span-1' : 'md:col-span-3'}>
              <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider ml-1 mb-2 block flex items-center gap-2"><HiOutlineServer className="w-3 h-3" /> Maximum Capacity</label>
              <input type="number" className="input-field py-3 font-bold bg-slate-950 border-slate-800" value={form.capacity} onChange={onChange('capacity')} min="1" />
            </div>
            {form.eventType === 'team' && (
              <>
                <div>
                  <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider ml-1 mb-2 block">Min Team Size</label>
                  <input type="number" className="input-field py-3 font-bold bg-slate-950 border-slate-800" value={form.teamSizeMin} onChange={onChange('teamSizeMin')} min="1" />
                </div>
                <div>
                  <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider ml-1 mb-2 block">Max Team Size</label>
                  <input type="number" className="input-field py-3 font-bold bg-slate-950 border-slate-800" value={form.teamSizeMax} onChange={onChange('teamSizeMax')} min="1" />
                </div>
              </>
            )}
            <div className="md:col-span-3">
              <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider ml-1 mb-2 block flex items-center gap-2"><HiOutlineLocationMarker className="w-3 h-3" /> Venue / Location</label>
              <input className="input-field py-3 font-bold bg-slate-950 border-slate-800 uppercase tracking-wider" value={form.venue} onChange={onChange('venue')} placeholder="e.g. MAIN AUDITORIUM, LAB-4" />
            </div>
          </div>
        </section>

        {/* Schedule & Deadlines */}
        <section className="space-y-6 relative z-10">
          <div className="flex items-center gap-3 border-l-2 border-primary-500 pl-4 py-1">
             <HiOutlineCalendar className="w-5 h-5 text-primary-500" />
             <h3 className="text-[10px] font-bold text-white uppercase tracking-wider">Schedule & Deadlines</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider ml-1 mb-2 block">Registration Deadline</label>
              <input type="datetime-local" className="input-field py-3 font-bold bg-slate-950 border-slate-800" value={form.registrationDeadline} onChange={onChange('registrationDeadline')} />
            </div>
            <div>
              <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider ml-1 mb-2 block">Event Date & Time</label>
              <input type="datetime-local" className="input-field py-3 font-bold bg-slate-950 border-slate-800" value={form.eventDate} onChange={onChange('eventDate')} />
            </div>
          </div>
        </section>

        {/* Pricing & Fees */}
        <section className="space-y-6 relative z-10">
          <div className="flex items-center gap-3 border-l-2 border-primary-500 pl-4 py-1">
             <HiOutlineCurrencyRupee className="w-5 h-5 text-primary-500" />
             <h3 className="text-[10px] font-bold text-white uppercase tracking-wider">Pricing & Fees</h3>
          </div>
          <div className="p-6 rounded-3xl bg-slate-950 border border-slate-900 space-y-6">
            <div className="flex items-center gap-4">
              <input type="checkbox" id="isPaid" checked={form.isPaid} onChange={onChange('isPaid')} className="w-5 h-5 rounded border-slate-800 bg-slate-900 text-primary-600 focus:ring-primary-500/20 transition-all cursor-pointer" />
              <label htmlFor="isPaid" className="text-xs font-bold text-slate-300 uppercase tracking-wider cursor-pointer select-none">Paid Event (Requires Payment)</label>
            </div>
            {form.isPaid && (
              <div className="animate-fade-in">
                <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider ml-1 mb-2 block">Registration Fee (₹)</label>
                <div className="relative">
                   <HiOutlineCurrencyRupee className="absolute left-4 top-1/2 -translate-y-1/2 text-primary-500 w-5 h-5" />
                   <input type="number" className="input-field pl-12 py-4 text-lg font-bold bg-slate-900/50 border-slate-800 focus:border-primary-500" value={form.registrationFee} onChange={onChange('registrationFee')} min="0" />
                </div>
              </div>
            )}
          </div>
        </section>

        <div className="flex flex-col sm:flex-row items-center gap-4 pt-8 border-t border-slate-900">
          <button type="submit" disabled={loading} className="btn-primary flex-1 py-4 text-[10px] font-bold uppercase tracking-wider">
            {loading ? 'SAVING...' : (isEdit ? 'UPDATE EVENT' : 'CREATE EVENT')}
          </button>
          <button type="button" onClick={() => navigate('/events')} className="btn-outline flex-1 py-4 text-[10px] font-bold uppercase tracking-wider">
            CANCEL
          </button>
        </div>
      </form>

      {/* Confirm with Password Modal */}
      <ConfirmWithPassword
        open={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={handleConfirmedSubmit}
        title={isEdit ? 'Update Event' : 'Create Event'}
        message={isEdit ? `You are about to save changes for "${form.title}". Please authorize to continue.` : `You are about to create the event "${form.title}". Please authorize to continue.`}
        confirmLabel={isEdit ? 'UPDATE' : 'CREATE'}
        variant="warning"
      />
    </div>
  );
}
