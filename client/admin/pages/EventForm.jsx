import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../services/api';
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
        <h1 className="text-3xl font-black text-white tracking-tighter uppercase leading-none mb-2">
          {isEdit ? 'Nodal Modification' : 'Node Initialization'}
        </h1>
        <p className="text-slate-500 font-medium">Define parameters for event sovereignty and participant linkage</p>
      </div>

      <form onSubmit={handleSubmit} className="card max-w-4xl space-y-12 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary-600/5 blur-[120px] pointer-events-none"></div>

        {/* Basic Information */}
        <section className="space-y-6 relative z-10">
          <div className="flex items-center gap-3 border-l-2 border-primary-500 pl-4 py-1">
             <HiOutlineInformationCircle className="w-5 h-5 text-primary-500" />
             <h3 className="text-[10px] font-black text-white uppercase tracking-[0.2em]">Core Identity</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest ml-1 mb-2 block">Protocol Title *</label>
              <input className="input-field py-4 text-base font-black tracking-tight bg-slate-900/50 border-slate-700/50" value={form.title} onChange={onChange('title')} required placeholder="Enter event name..." />
            </div>
            <div className="md:col-span-2">
              <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest ml-1 mb-2 block">Instruction Log (Description)</label>
              <textarea className="input-field py-4 text-sm font-bold bg-slate-900/50 border-slate-700/50" rows="4" value={form.description} onChange={onChange('description')} placeholder="Detail event scope and requirements..." />
            </div>
            <div>
              <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest ml-1 mb-2 block">Sector (Category)</label>
              <input className="input-field py-3 text-sm font-bold bg-slate-900/50 border-slate-700/50 uppercase tracking-widest" value={form.category} onChange={onChange('category')} placeholder="e.g. TECHNICAL, CULTURAL" />
            </div>
            <div>
              <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest ml-1 mb-2 block">Nodal Geometry (Type)</label>
              <select className="input-field py-3 text-[10px] font-black uppercase tracking-widest bg-slate-900/50 border-slate-700/50" value={form.eventType} onChange={onChange('eventType')}>
                <option value="solo" className="bg-slate-950 font-black">SOLO_IDENTITY</option>
                <option value="team" className="bg-slate-950 font-black">CLUSTER_FORMATION</option>
              </select>
            </div>
          </div>
        </section>

        {/* Geometry & Capacity */}
        <section className="space-y-6 relative z-10">
          <div className="flex items-center gap-3 border-l-2 border-primary-500 pl-4 py-1">
             <HiOutlineUserGroup className="w-5 h-5 text-primary-500" />
             <h3 className="text-[10px] font-black text-white uppercase tracking-[0.2em]">Geometry & Capacity</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className={form.eventType === 'team' ? 'md:col-span-1' : 'md:col-span-3'}>
              <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest ml-1 mb-2 block flex items-center gap-2"><HiOutlineServer className="w-3 h-3" /> Max Load (Capacity)</label>
              <input type="number" className="input-field py-3 font-black bg-slate-900/50 border-slate-700/50" value={form.capacity} onChange={onChange('capacity')} min="1" />
            </div>
            {form.eventType === 'team' && (
              <>
                <div>
                  <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest ml-1 mb-2 block">Min Cluster Size</label>
                  <input type="number" className="input-field py-3 font-black bg-slate-900/50 border-slate-700/50" value={form.teamSizeMin} onChange={onChange('teamSizeMin')} min="1" />
                </div>
                <div>
                  <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest ml-1 mb-2 block">Max Cluster Size</label>
                  <input type="number" className="input-field py-3 font-black bg-slate-900/50 border-slate-700/50" value={form.teamSizeMax} onChange={onChange('teamSizeMax')} min="1" />
                </div>
              </>
            )}
            <div className="md:col-span-3">
              <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest ml-1 mb-2 block flex items-center gap-2"><HiOutlineLocationMarker className="w-3 h-3" /> Territorial Node (Venue)</label>
              <input className="input-field py-3 font-black bg-slate-900/50 border-slate-700/50 uppercase tracking-widest" value={form.venue} onChange={onChange('venue')} placeholder="e.g. MAIN AUDITORIUM, LAB-4" />
            </div>
          </div>
        </section>

        {/* Registration & Timing */}
        <section className="space-y-6 relative z-10">
          <div className="flex items-center gap-3 border-l-2 border-primary-500 pl-4 py-1">
             <HiOutlineCalendar className="w-5 h-5 text-primary-500" />
             <h3 className="text-[10px] font-black text-white uppercase tracking-[0.2em]">Temporal Coordinates</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest ml-1 mb-2 block">Access Deadline</label>
              <input type="datetime-local" className="input-field py-3 font-black bg-slate-900/50 border-slate-700/50" value={form.registrationDeadline} onChange={onChange('registrationDeadline')} />
            </div>
            <div>
              <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest ml-1 mb-2 block">Event Execution</label>
              <input type="datetime-local" className="input-field py-3 font-black bg-slate-900/50 border-slate-700/50" value={form.eventDate} onChange={onChange('eventDate')} />
            </div>
          </div>
        </section>

        {/* Transactional Logic */}
        <section className="space-y-6 relative z-10">
          <div className="flex items-center gap-3 border-l-2 border-primary-500 pl-4 py-1">
             <HiOutlineCurrencyRupee className="w-5 h-5 text-primary-500" />
             <h3 className="text-[10px] font-black text-white uppercase tracking-[0.2em]">Transactional Logic</h3>
          </div>
          <div className="p-6 rounded-3xl bg-slate-900/40 border border-slate-700/30 space-y-6">
            <div className="flex items-center gap-4">
              <input type="checkbox" id="isPaid" checked={form.isPaid} onChange={onChange('isPaid')} className="w-6 h-6 rounded-lg border-slate-700 bg-slate-950 text-primary-600 focus:ring-primary-500/20 transition-all cursor-pointer" />
              <label htmlFor="isPaid" className="text-xs font-black text-slate-300 uppercase tracking-widest cursor-pointer select-none">Encrypted Access (Paid Event)</label>
            </div>
            {form.isPaid && (
              <div className="animate-fade-in">
                <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest ml-1 mb-2 block">Access Credit Requirement (₹)</label>
                <div className="relative">
                   <HiOutlineCurrencyRupee className="absolute left-4 top-1/2 -translate-y-1/2 text-primary-500 w-5 h-5" />
                   <input type="number" className="input-field pl-12 py-4 text-lg font-black bg-slate-950/50 border-primary-500/20 focus:border-primary-500" value={form.registrationFee} onChange={onChange('registrationFee')} min="0" />
                </div>
              </div>
            )}
          </div>
        </section>

        <div className="flex flex-col sm:flex-row items-center gap-4 pt-8 border-t border-slate-800">
          <button type="submit" disabled={loading} className="btn-primary flex-1 py-4 text-[10px] font-black uppercase tracking-[0.2em] shadow-xl shadow-primary-900/40 active:scale-95 disabled:opacity-50 transition-all">
            {loading ? 'MODULATING...' : (isEdit ? 'OVERWRITE NODE' : 'INITIALIZE NODE')}
          </button>
          <button type="button" onClick={() => navigate('/events')} className="btn-outline flex-1 py-4 text-[10px] font-black uppercase tracking-[0.2em] active:scale-95 transition-all">
            ABORT MISSION
          </button>
        </div>
      </form>

      {/* Confirm with Password Modal */}
      <ConfirmWithPassword
        open={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={handleConfirmedSubmit}
        title={isEdit ? 'Nodal Modification' : 'Node Initialization'}
        message={isEdit ? `Synchronizing overrides for "${form.title}". Provide primary authorization key.` : `Establishing new sovereignty for "${form.title}". Provide primary authorization key.`}
        confirmLabel={isEdit ? 'OVERWRITE' : 'INITIALIZE'}
        variant="warning"
      />
    </div>
  );
}
