import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';
import ConfirmWithPassword from '../components/ConfirmWithPassword';
import { HiOutlinePhotograph } from 'react-icons/hi';

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

const emptyForm = {
  fullName: '',
  email: '',
  team: '',
  linkedinUrl: '',
  githubUrl: '',
  instagramUrl: '',
  order: 0,
};

export default function OrganizerForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [form, setForm] = useState({ ...emptyForm });
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(isEdit);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    if (!isEdit) return;
    (async () => {
      try {
        const { data } = await api.get(`/organizers/${id}`);
        const org = data.data;
        setForm({
          fullName: org.fullName || '',
          email: org.email || '',
          team: org.team || '',
          linkedinUrl: org.linkedinUrl || '',
          githubUrl: org.githubUrl || '',
          instagramUrl: org.instagramUrl || '',
          order: org.order ?? 0,
        });
        if (org.image) setImagePreview(org.image);
      } catch {
        toast.error('Failed to load organizer');
        navigate('/organizers');
      } finally {
        setFetching(false);
      }
    })();
  }, [id, isEdit, navigate]);

  const onChange = (field) => (e) =>
    setForm((p) => ({ ...p, [field]: field === 'order' ? Number(e.target.value) || 0 : e.target.value }));

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be under 5 MB');
      return;
    }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setShowConfirm(true);
  };

  const handleConfirmed = async (password) => {
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('fullName', form.fullName);
      formData.append('email', form.email);
      formData.append('team', form.team);
      formData.append('linkedinUrl', form.linkedinUrl);
      formData.append('githubUrl', form.githubUrl);
      formData.append('instagramUrl', form.instagramUrl);
      formData.append('order', form.order);
      formData.append('adminPassword', password);
      if (imageFile) formData.append('image', imageFile);

      const config = { headers: { 'Content-Type': 'multipart/form-data' } };

      if (isEdit) {
        await api.put(`/organizers/${id}`, formData, config);
        toast.success('Organizer updated');
      } else {
        await api.post('/organizers', formData, config);
        toast.success('Organizer added');
      }
      navigate('/organizers');
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return <div className="text-center py-12 text-gray-400">Loading...</div>;
  }

  return (
    <div>
      <h1 className="text-lg sm:text-2xl font-bold mb-6">
        {isEdit ? 'Edit Organizer' : 'Add Organizer'}
      </h1>

      <form onSubmit={handleSubmit} className="card max-w-lg space-y-5 p-4 sm:p-6">
        {/* Full Name */}
        <div>
          <label className="label">Full Name *</label>
          <input className="input-field" value={form.fullName} onChange={onChange('fullName')} required />
        </div>

        {/* Email */}
        <div>
          <label className="label">Email</label>
          <input type="email" className="input-field" value={form.email} onChange={onChange('email')} />
        </div>

        {/* Team */}
        <div>
          <label className="label">Team</label>
          <select className="input-field" value={form.team} onChange={onChange('team')}>
            <option value="">Select Team</option>
            {TEAMS.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>

        {/* Image Upload */}
        <div>
          <label className="label">Photo</label>
          <div className="flex items-center gap-4">
            {imagePreview ? (
              <img
                src={imagePreview}
                alt="Preview"
                className="w-16 h-16 rounded-full object-cover border"
                onError={(e) => { e.target.style.display = 'none'; }}
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center text-gray-400">
                <HiOutlinePhotograph className="w-6 h-6" />
              </div>
            )}
            <div className="flex flex-col gap-2">
              <label className="btn-outline text-xs px-3 py-1.5 cursor-pointer inline-flex items-center gap-1.5">
                <HiOutlinePhotograph className="w-4 h-4" />
                {imagePreview ? 'Change Photo' : 'Upload Photo'}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp,image/svg+xml"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </label>
              {imagePreview && (
                <button type="button" onClick={handleRemoveImage} className="text-xs text-red-500 hover:text-red-700 text-left">
                  Remove
                </button>
              )}
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-1.5">JPEG, PNG, GIF, WebP, or SVG. Max 5 MB.</p>
        </div>

        {/* Social URLs */}
        <div>
          <label className="label">LinkedIn URL <span className="text-gray-400 font-normal">(optional)</span></label>
          <input
            type="url"
            className="input-field"
            placeholder="https://linkedin.com/in/..."
            value={form.linkedinUrl}
            onChange={onChange('linkedinUrl')}
          />
        </div>
        <div>
          <label className="label">GitHub URL <span className="text-gray-400 font-normal">(optional)</span></label>
          <input
            type="url"
            className="input-field"
            placeholder="https://github.com/..."
            value={form.githubUrl}
            onChange={onChange('githubUrl')}
          />
        </div>
        <div>
          <label className="label">Instagram URL <span className="text-gray-400 font-normal">(optional)</span></label>
          <input
            type="url"
            className="input-field"
            placeholder="https://instagram.com/..."
            value={form.instagramUrl}
            onChange={onChange('instagramUrl')}
          />
        </div>

        {/* Order */}
        <div>
          <label className="label">Display Order</label>
          <input
            type="number"
            className="input-field"
            value={form.order}
            onChange={onChange('order')}
            min={0}
          />
          <p className="text-xs text-gray-400 mt-1">
            Controls the sequence within a team category. Lower numbers appear first.
          </p>
        </div>

        {/* Buttons */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? 'Saving...' : isEdit ? 'Update Organizer' : 'Add Organizer'}
          </button>
          <button type="button" onClick={() => navigate('/organizers')} className="btn-outline">
            Cancel
          </button>
        </div>
      </form>

      {/* Confirm with Password Modal */}
      <ConfirmWithPassword
        open={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={handleConfirmed}
        title={isEdit ? 'Update Organizer' : 'Add Organizer'}
        message={
          isEdit
            ? `You are about to update "${form.fullName || 'unnamed'}". Please confirm your admin password.`
            : `You are about to add a new organizer "${form.fullName || 'unnamed'}". Please confirm your admin password.`
        }
        confirmLabel={isEdit ? 'Update' : 'Add Organizer'}
        variant="warning"
      />
    </div>
  );
}
