import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../src/services/api';
import {
  HiOutlineClipboardList,
  HiOutlinePlus,
  HiOutlineRefresh,
  HiOutlineCheckCircle,
  HiOutlineExclamationCircle,
  HiOutlineClock,
  HiOutlineXCircle,
  HiOutlineMail,
} from 'react-icons/hi';

const STATUS_CONFIG = {
  queued: { label: 'Queued', color: 'bg-blue-100 text-blue-700', icon: HiOutlineClock },
  processing: { label: 'Processing', color: 'bg-amber-100 text-amber-700', icon: HiOutlineRefresh },
  completed: { label: 'Completed', color: 'bg-green-100 text-green-700', icon: HiOutlineCheckCircle },
  completed_with_failures: { label: 'Partial', color: 'bg-orange-100 text-orange-700', icon: HiOutlineExclamationCircle },
  failed: { label: 'Failed', color: 'bg-red-100 text-red-700', icon: HiOutlineXCircle },
  cancelled: { label: 'Cancelled', color: 'bg-gray-100 text-gray-600', icon: HiOutlineXCircle },
};

export default function BulkEmailJobs() {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchJobs = async (p = page) => {
    try {
      setLoading(true);
      const { data } = await api.get('/mail/jobs', { params: { page: p, limit: 20 } });
      setJobs(data.data.jobs);
      setTotalPages(data.data.pages);
    } catch {
      // silently handle
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchJobs(page); }, [page]);

  // Auto-refresh if any job is processing
  useEffect(() => {
    const hasActive = jobs.some((j) => ['queued', 'processing'].includes(j.status));
    if (!hasActive) return;
    const interval = setInterval(() => fetchJobs(page), 4000);
    return () => clearInterval(interval);
  }, [jobs, page]);

  const formatDate = (d) => {
    if (!d) return '—';
    return new Date(d).toLocaleString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2 text-gray-900">
          <HiOutlineClipboardList className="w-7 h-7 text-primary-600" />
          Email Jobs
        </h1>
        <div className="flex items-center gap-2">
          <button onClick={() => fetchJobs(page)} className="btn-secondary flex items-center gap-1.5 text-sm">
            <HiOutlineRefresh className="w-4 h-4" />
            Refresh
          </button>
          <button onClick={() => navigate('/bulk-email')} className="btn-primary flex items-center gap-1.5 text-sm">
            <HiOutlinePlus className="w-4 h-4" />
            New Email
          </button>
        </div>
      </div>

      {loading && jobs.length === 0 ? (
        <div className="card text-center py-12">
          <HiOutlineRefresh className="w-8 h-8 text-gray-400 mx-auto animate-spin" />
          <p className="text-gray-500 mt-3">Loading jobs...</p>
        </div>
      ) : jobs.length === 0 ? (
        <div className="card text-center py-12">
          <HiOutlineMail className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">No email jobs yet</p>
          <p className="text-sm text-gray-400 mt-1">Create your first bulk email to get started.</p>
        </div>
      ) : (
        <>
          <div className="card overflow-hidden p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs uppercase tracking-wider">Subject</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs uppercase tracking-wider">Status</th>
                  <th className="text-center px-4 py-3 font-semibold text-gray-600 text-xs uppercase tracking-wider">Total</th>
                  <th className="text-center px-4 py-3 font-semibold text-gray-600 text-xs uppercase tracking-wider">Sent</th>
                  <th className="text-center px-4 py-3 font-semibold text-gray-600 text-xs uppercase tracking-wider">Failed</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs uppercase tracking-wider">Created</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs uppercase tracking-wider">By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {jobs.map((job) => {
                  const cfg = STATUS_CONFIG[job.status] || STATUS_CONFIG.queued;
                  const StatusIcon = cfg.icon;
                  return (
                    <tr
                      key={job._id}
                      onClick={() => navigate(`/bulk-email/jobs/${job._id}`)}
                      className="hover:bg-gray-50 cursor-pointer transition-colors"
                    >
                      <td className="px-4 py-3 font-medium text-gray-900 max-w-[200px] truncate">{job.subject}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${cfg.color}`}>
                          <StatusIcon className={`w-3.5 h-3.5 ${job.status === 'processing' ? 'animate-spin' : ''}`} />
                          {cfg.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center text-gray-700 font-medium">{job.totalRecipients}</td>
                      <td className="px-4 py-3 text-center text-green-700 font-medium">{job.completedCount}</td>
                      <td className="px-4 py-3 text-center text-red-700 font-medium">{job.failedCount}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{formatDate(job.createdAt)}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{job.createdBy?.name || '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-4">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="btn-secondary text-sm px-3 py-1.5"
              >
                Previous
              </button>
              <span className="text-sm text-gray-500">Page {page} of {totalPages}</span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="btn-secondary text-sm px-3 py-1.5"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
