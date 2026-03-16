import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';
import ConfirmWithPassword from '../components/ConfirmWithPassword';

export default function CoordinatorForm() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', phone: '', college: '', branch: '' });
  const [loading, setLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const onChange = (field) => (e) => setForm((p) => ({ ...p, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setShowConfirm(true);
  };

  const handleConfirmedCreate = async (password) => {
    setLoading(true);
    try {
      await api.post('/users/coordinators', { ...form, adminPassword: password });
      toast.success('Coordinator added');
      navigate('/coordinators');
    } finally { setLoading(false); }
  };

  return (
    <div>
      <h1 className="text-lg sm:text-2xl font-bold mb-6">Add Coordinator</h1>
      <form onSubmit={handleSubmit} className="card max-w-lg space-y-5 p-4 sm:p-6">
        <div><label className="label">Name *</label><input className="input-field" value={form.name} onChange={onChange('name')} required /></div>
        <div><label className="label">Email *</label><input type="email" className="input-field" value={form.email} onChange={onChange('email')} required /></div>
        <div><label className="label">Password *</label><input type="password" className="input-field" value={form.password} onChange={onChange('password')} required minLength={8} /></div>
        <div><label className="label">Phone</label><input className="input-field" value={form.phone} onChange={onChange('phone')} /></div>
        <div><label className="label">College</label><input className="input-field" value={form.college} onChange={onChange('college')} /></div>
        <div><label className="label">Branch</label><input className="input-field" value={form.branch} onChange={onChange('branch')} /></div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
          <button type="submit" disabled={loading} className="btn-primary">{loading ? 'Saving...' : 'Add Coordinator'}</button>
          <button type="button" onClick={() => navigate('/coordinators')} className="btn-outline">Cancel</button>
        </div>
      </form>

      {/* Confirm with Password Modal */}
      <ConfirmWithPassword
        open={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={handleConfirmedCreate}
        title="Add Coordinator"
        message={`You are about to create a new coordinator account for "${form.name || 'unnamed'}". Please confirm your admin password.`}
        confirmLabel="Add Coordinator"
        variant="warning"
      />
    </div>
  );
}
