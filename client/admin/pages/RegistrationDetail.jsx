import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';
import { HiOutlineArrowLeft, HiOutlineBan, HiOutlineMail, HiOutlineCheckCircle } from 'react-icons/hi';
import ConfirmWithPassword from '../components/ConfirmWithPassword';

export default function RegistrationDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [reg, setReg] = useState(null);
  const [loading, setLoading] = useState(true);
  const [confirmModal, setConfirmModal] = useState({ open: false, title: '', message: '', confirmLabel: '', variant: 'warning', action: null });

  const fetchReg = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/registrations/${id}`);
      setReg(data.data);
    } catch { toast.error('Failed to load registration'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchReg(); }, [id]);

  const handleCancel = () => {
    setConfirmModal({
      open: true, title: 'Cancel Registration', confirmLabel: 'Cancel Registration', variant: 'danger',
      message: 'This will cancel the registration and any linked tickets. This action is irreversible.',
      action: async (pw) => {
        await api.patch(`/registrations/${id}/cancel`, { adminPassword: pw });
        toast.success('Registration cancelled');
        fetchReg();
      },
    });
  };

  const handleResendEmail = async () => {
    try {
      await api.post(`/registrations/${id}/resend-email`);
      toast.success('Ticket email resend triggered');
    } catch (err) { toast.error(err.userMessage || 'Failed to resend email'); }
  };

  const handleMarkAttendance = async () => {
    try {
      await api.patch(`/registrations/${id}/mark-attendance`);
      toast.success('Attendance marked');
      fetchReg();
    } catch (err) { toast.error(err.userMessage || 'Failed to mark attendance'); }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600"></div></div>;
  if (!reg) return <div className="text-center py-12 text-gray-400">Registration not found</div>;

  return (
    <div>
      <button onClick={() => navigate('/registrations')} className="flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-4 text-sm">
        <HiOutlineArrowLeft className="w-4 h-4" /> Back to Registrations
      </button>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h1 className="text-lg sm:text-2xl font-bold text-gray-900">Registration Detail</h1>
        <div className="flex flex-wrap gap-2">
          {reg.status !== 'cancelled' && (
            <button onClick={handleCancel} className="btn-danger text-sm flex items-center gap-1.5"><HiOutlineBan className="w-4 h-4" /> Cancel</button>
          )}
          {reg.status === 'confirmed' && (
            <button onClick={handleResendEmail} className="btn-outline text-sm flex items-center gap-1.5"><HiOutlineMail className="w-4 h-4" /> Resend Email</button>
          )}
          {!reg.checkedIn && reg.status === 'confirmed' && (
            <button onClick={handleMarkAttendance} className="btn-primary text-sm flex items-center gap-1.5"><HiOutlineCheckCircle className="w-4 h-4" /> Mark Attendance</button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Registration Info */}
        <div className="card">
          <h3 className="font-semibold text-gray-900 mb-4">Registration</h3>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between"><dt className="text-gray-500">Status</dt><dd><span className={`badge ${reg.status === 'confirmed' ? 'badge-green' : reg.status === 'cancelled' ? 'badge-red' : 'badge-yellow'}`}>{reg.status}</span></dd></div>
            <div className="flex justify-between"><dt className="text-gray-500">Event</dt><dd className="font-medium">{reg.eventId?.title || 'N/A'}</dd></div>
            <div className="flex justify-between"><dt className="text-gray-500">Mode</dt><dd>{reg.registrationMode || (reg.teamId ? 'team' : 'individual')}</dd></div>
            <div className="flex justify-between"><dt className="text-gray-500">Checked In</dt><dd className={reg.checkedIn ? 'text-emerald-600 font-medium' : 'text-gray-400'}>{reg.checkedIn ? `✓ Yes (${new Date(reg.checkedInAt).toLocaleString()})` : '✗ No'}</dd></div>
            <div className="flex justify-between"><dt className="text-gray-500">Registered</dt><dd>{new Date(reg.createdAt).toLocaleString()}</dd></div>
            {reg.referralCodeUsed && <div className="flex justify-between"><dt className="text-gray-500">Referral Code</dt><dd className="font-mono text-xs">{reg.referralCodeUsed}</dd></div>}
          </dl>
        </div>

        {/* User */}
        <div className="card">
          <h3 className="font-semibold text-gray-900 mb-4">User</h3>
          {reg.userId && typeof reg.userId === 'object' ? (
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between"><dt className="text-gray-500">Name</dt><dd className="font-medium">{reg.userId.name}</dd></div>
              <div className="flex justify-between"><dt className="text-gray-500">Email</dt><dd>{reg.userId.email}</dd></div>
              {reg.userId.phone && <div className="flex justify-between"><dt className="text-gray-500">Phone</dt><dd>{reg.userId.phone}</dd></div>}
              {reg.userId.college && <div className="flex justify-between"><dt className="text-gray-500">College</dt><dd>{reg.userId.college}</dd></div>}
              {reg.userId.branch && <div className="flex justify-between"><dt className="text-gray-500">Branch</dt><dd>{reg.userId.branch}</dd></div>}
              {reg.userId.year && <div className="flex justify-between"><dt className="text-gray-500">Year</dt><dd>{reg.userId.year}</dd></div>}
              <div><button onClick={() => navigate(`/users/${reg.userId._id}`)} className="text-primary-600 text-xs font-medium hover:text-primary-800">View User →</button></div>
            </dl>
          ) : <p className="text-gray-400 text-sm">User data not available</p>}
        </div>
      </div>

      {/* Team */}
      {reg.teamId && (
        <div className="card mb-6">
          <h3 className="font-semibold text-gray-900 mb-4">Team</h3>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between"><dt className="text-gray-500">Team Name</dt><dd className="font-medium">{reg.teamId.teamName || 'N/A'}</dd></div>
            <div className="flex justify-between"><dt className="text-gray-500">Status</dt><dd>{reg.teamId.status}</dd></div>
            <div><button onClick={() => navigate(`/teams?teamId=${reg.teamId._id}`)} className="text-primary-600 text-xs font-medium hover:text-primary-800">View Team →</button></div>
          </dl>
        </div>
      )}

      {/* Registration Data (dynamic form snapshot) */}
      {reg.registrationData && Object.keys(reg.registrationData).length > 0 && (
        <div className="card mb-6">
          <h3 className="font-semibold text-gray-900 mb-4">Registration Data</h3>
          <dl className="space-y-2 text-sm">
            {Object.entries(typeof reg.registrationData === 'object' ? reg.registrationData : {}).map(([k, v]) => (
              <div key={k} className="flex justify-between"><dt className="text-gray-500 capitalize">{k.replace(/([A-Z])/g, ' $1')}</dt><dd>{String(v)}</dd></div>
            ))}
          </dl>
        </div>
      )}

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
