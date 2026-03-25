import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../src/services/api';
import toast from 'react-hot-toast';
import ConfirmWithPassword from '../../src/components/ConfirmWithPassword';
import {
  HiOutlineArrowLeft,
  HiOutlineRefresh,
  HiOutlineCheckCircle,
  HiOutlineExclamationCircle,
  HiOutlineClock,
  HiOutlineXCircle,
  HiOutlineMail,
  HiOutlineExclamation,
} from 'react-icons/hi';

const STATUS_CONFIG = {
  queued: { label: 'Queued', color: 'bg-blue-100 text-blue-700', icon: HiOutlineClock },
  processing: { label: 'Processing', color: 'bg-amber-100 text-amber-700', icon: HiOutlineRefresh },
  completed: { label: 'Completed', color: 'bg-green-100 text-green-700', icon: HiOutlineCheckCircle },
  completed_with_failures: { label: 'Completed with Failures', color: 'bg-orange-100 text-orange-700', icon: HiOutlineExclamationCircle },
  failed: { label: 'Failed', color: 'bg-red-100 text-red-700', icon: HiOutlineXCircle },
  cancelled: { label: 'Cancelled', color: 'bg-gray-100 text-gray-600', icon: HiOutlineXCircle },
};

export default function BulkEmailJobDetail() {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const [job, setJob] = useState(null);
  const [recentFailures, setRecentFailures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [retryOpen, setRetryOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const fetchJob = async () => {
    try {
      const { data } = await api.get(`/mail/jobs/${jobId}`);
      setJob(data.data.job);
      setRecentFailures(data.data.recentFailures || []);
    } catch {
      toast.error('Failed to load job details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchJob(); }, [jobId]);

  // Auto-refresh while processing
  useEffect(() => {
    if (!job || !['queued', 'processing'].includes(job.status)) return;
    const interval = setInterval(fetchJob, 3000);
    return () => clearInterval(interval);
  }, [job?.status, jobId]);

  const handleRetry = async (password) => {
    try {
      const { data } = await api.post(`/mail/jobs/${jobId}/retry`, { adminPassword: password });
      toast.success(data.message);
      fetchJob();
    } catch (err) {
      toast.error(err.userMessage || 'Retry failed');
      throw err;
    }
  };

  const handleCancel = async () => {
    setCancelling(true);
    try {
      await api.post(`/mail/jobs/${jobId}/cancel`);
      toast.success('Job cancelled');
      fetchJob();
    } catch (err) {
      toast.error(err.userMessage || 'Cancel failed');
    } finally {
      setCancelling(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <HiOutlineRefresh className="w-8 h-8 text-gray-400 animate-spin" />
      </div>
    );
  }

  if (!job) {
    return (
      <div className="card text-center py-12">
        <p className="text-gray-500">Job not found</p>
      </div>
    );
  }

  const cfg = STATUS_CONFIG[job.status] || STATUS_CONFIG.queued;
  const StatusIcon = cfg.icon;
  const counts = job.liveCounts || { pending: job.pendingCount, processing: job.processingCount, sent: job.completedCount, failed: job.failedCount };
  const total = job.totalRecipients;
  const progressPct = total > 0 ? Math.round(((counts.sent + counts.failed) / total) * 100) : 0;
  const isActive = ['queued', 'processing'].includes(job.status);
  const canRetry = !isActive && counts.failed > 0;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate('/bulk-email/jobs')} className="text-gray-400 hover:text-gray-700 transition-colors">
          <HiOutlineArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold text-gray-900 truncate">{job.subject}</h1>
          <div className="flex items-center gap-2 mt-1">
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${cfg.color}`}>
              <StatusIcon className={`w-3.5 h-3.5 ${job.status === 'processing' ? 'animate-spin' : ''}`} />
              {cfg.label}
            </span>
            <span className="text-xs text-gray-500">
              Created {new Date(job.createdAt).toLocaleString('en-IN')}
              {job.createdBy && ` by ${job.createdBy.name}`}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isActive && (
            <button onClick={handleCancel} disabled={cancelling} className="btn-secondary text-sm text-red-600 hover:text-red-700">
              {cancelling ? 'Cancelling...' : 'Cancel'}
            </button>
          )}
          {canRetry && (
            <button onClick={() => setRetryOpen(true)} className="btn-primary text-sm flex items-center gap-1.5">
              <HiOutlineRefresh className="w-4 h-4" />
              Retry Failed ({counts.failed})
            </button>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="card mb-6">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-semibold text-gray-700">Progress</span>
          <span className="text-sm font-bold text-gray-900">{progressPct}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
          <div className="h-full rounded-full transition-all duration-500 ease-out relative overflow-hidden"
            style={{
              width: `${progressPct}%`,
              background: counts.failed > 0
                ? 'linear-gradient(90deg, #22c55e 0%, #f59e0b 100%)'
                : '#22c55e',
            }}
          >
            {isActive && (
              <div className="absolute inset-0 bg-white/20 animate-pulse" />
            )}
          </div>
        </div>
        {isActive && (
          <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
            <HiOutlineRefresh className="w-3 h-3 animate-spin" />
            Auto-refreshing every 3 seconds...
          </p>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <StatCard label="Total" value={total} color="text-gray-900" bg="bg-gray-50" />
        <StatCard label="Sent" value={counts.sent} color="text-green-700" bg="bg-green-50" icon={HiOutlineCheckCircle} />
        <StatCard label="Failed" value={counts.failed} color="text-red-700" bg="bg-red-50" icon={HiOutlineXCircle} />
        <StatCard label="Pending" value={counts.pending} color="text-blue-700" bg="bg-blue-50" icon={HiOutlineClock} />
        <StatCard label="Processing" value={counts.processing} color="text-amber-700" bg="bg-amber-50" icon={HiOutlineRefresh} spinning={isActive && counts.processing > 0} />
      </div>

      {/* Job Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Mail Info */}
        <div className="card">
          <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wider mb-3">Email Details</h2>
          <div className="space-y-3 text-sm">
            <div className="flex items-start gap-2">
              <span className="text-gray-500 font-medium w-20 flex-shrink-0">Sender</span>
              <span className="text-gray-900">{job.senderIdentity}</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-gray-500 font-medium w-20 flex-shrink-0">Template</span>
              <span className="text-gray-900 capitalize">{job.template}</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-gray-500 font-medium w-20 flex-shrink-0">Source</span>
              <span className="text-gray-900">{job.sourceType === 'excel_upload' ? 'File Upload' : 'Manual Selection'}</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-gray-500 font-medium w-20 flex-shrink-0">Body</span>
              <p className="text-gray-700 whitespace-pre-wrap line-clamp-4">{job.body}</p>
            </div>
          </div>
        </div>

        {/* Recent Failures */}
        <div className="card">
          <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wider mb-3">
            {counts.failed > 0 ? `Failed Recipients (${counts.failed})` : 'Recipients'}
          </h2>
          {recentFailures.length > 0 ? (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {recentFailures.map((r, i) => (
                <div key={i} className="flex items-start gap-2 p-2 bg-red-50 rounded-lg">
                  <HiOutlineExclamation className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm text-gray-900 font-medium truncate">{r.email}</p>
                    <p className="text-xs text-red-600 truncate">{r.errorMessage || 'Unknown error'}</p>
                    {r.retryCount > 0 && (
                      <p className="text-xs text-gray-500">Retried {r.retryCount} time{r.retryCount > 1 ? 's' : ''}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6">
              <HiOutlineMail className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-400">
                {isActive ? 'Processing...' : 'No failures — all emails sent successfully!'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Retry Password Confirm */}
      <ConfirmWithPassword
        open={retryOpen}
        onClose={() => setRetryOpen(false)}
        onConfirm={handleRetry}
        title="Retry Failed Emails"
        message={`This will retry sending to ${counts.failed} failed recipient${counts.failed !== 1 ? 's' : ''}. Already-sent emails will NOT be resent.`}
        confirmLabel="Retry Now"
        variant="warning"
      />
    </div>
  );
}

function StatCard({ label, value, color, bg, icon: Icon, spinning }) {
  return (
    <div className={`${bg} border border-gray-200 rounded-xl p-4 text-center`}>
      {Icon && <Icon className={`w-5 h-5 mx-auto mb-1 ${color} ${spinning ? 'animate-spin' : ''}`} />}
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      <p className="text-xs text-gray-500 font-medium mt-1">{label}</p>
    </div>
  );
}
