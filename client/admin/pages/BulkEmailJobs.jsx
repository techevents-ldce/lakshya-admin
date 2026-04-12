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
  HiOutlineChevronRight,
} from 'react-icons/hi';

const STATUS_CONFIG = {
  queued: { label: 'Queued', color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/30', icon: HiOutlineClock },
  processing: { label: 'Processing', color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/30', icon: HiOutlineRefresh },
  completed: { label: 'Completed', color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/30', icon: HiOutlineCheckCircle },
  completed_with_failures: { label: 'Partial', color: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/30', icon: HiOutlineExclamationCircle },
  failed: { label: 'Failed', color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/30', icon: HiOutlineXCircle },
  cancelled: { label: 'Cancelled', color: 'text-slate-400', bg: 'bg-slate-500/10 border-slate-500/30', icon: HiOutlineXCircle },
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
    <div className="animate-fade-in space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white uppercase tracking-tighter flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary-500/10 border border-primary-500/20">
              <HiOutlineClipboardList className="w-6 h-6 text-primary-400" />
            </div>
            Transmission Log
          </h1>
          <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-1 ml-11">Nodal Communication History</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => fetchJobs(page)} className="btn-outline flex items-center gap-2 text-[10px] font-black uppercase tracking-widest px-4 py-2.5">
            <HiOutlineRefresh className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button onClick={() => navigate('/bulk-email')} className="btn-primary flex items-center gap-2 text-[10px] font-black uppercase tracking-widest px-6 py-2.5 shadow-lg shadow-primary-900/20">
            <HiOutlinePlus className="w-4 h-4" />
            New Transmission
          </button>
        </div>
      </div>

      {loading && jobs.length === 0 ? (
        <div className="card py-24 flex flex-col items-center justify-center border-slate-700/30">
          <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center mb-4">
            <HiOutlineRefresh className="w-6 h-6 text-primary-500 animate-spin" />
          </div>
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Synchronizing nodes...</p>
        </div>
      ) : jobs.length === 0 ? (
        <div className="card py-24 flex flex-col items-center justify-center border-slate-700/30">
          <div className="w-16 h-16 rounded-3xl bg-slate-900 border border-slate-800 flex items-center justify-center mb-4">
            <HiOutlineMail className="w-8 h-8 text-slate-700" />
          </div>
          <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">No transmissions identified</p>
          <p className="text-[9px] text-slate-600 font-bold uppercase mt-2 tracking-tight">Initiate your first broadcast to populate the log.</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="card p-0 overflow-hidden border-slate-700/30">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/[0.05] bg-white/[0.02]">
                    <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Identity / Subject</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Status Matrix</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">Payload</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Nodal Origin</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Timestamp</th>
                    <th className="px-6 py-4"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.02]">
                  {jobs.map((job) => {
                    const cfg = STATUS_CONFIG[job.status] || STATUS_CONFIG.queued;
                    const StatusIcon = cfg.icon;
                    return (
                      <tr
                        key={job._id}
                        onClick={() => navigate(`/bulk-email/jobs/${job._id}`)}
                        className="group hover:bg-white/[0.02] cursor-pointer transition-all duration-200"
                      >
                        <td className="px-6 py-4">
                          <div className="min-w-0">
                            <p className="text-[11px] font-black text-white uppercase truncate tracking-tight group-hover:text-primary-400 transition-colors">
                              {job.subject}
                            </p>
                            <p className="text-[9px] text-slate-500 font-bold uppercase mt-0.5 opacity-60">ID: {job._id.slice(-8)}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${cfg.bg} ${cfg.color}`}>
                            <StatusIcon className={`w-3.5 h-3.5 ${job.status === 'processing' ? 'animate-spin' : ''}`} />
                            {cfg.label}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-center gap-4">
                            <div className="text-center">
                              <p className="text-xs font-black text-white">{job.totalRecipients}</p>
                              <p className="text-[8px] text-slate-600 font-black uppercase tracking-tighter">TOTAL</p>
                            </div>
                            <div className="w-px h-6 bg-white/[0.05]"></div>
                            <div className="text-center">
                              <p className="text-xs font-black text-emerald-400">{job.completedCount}</p>
                              <p className="text-[8px] text-emerald-900 font-black uppercase tracking-tighter">SENT</p>
                            </div>
                            {job.failedCount > 0 && (
                              <>
                                <div className="w-px h-6 bg-white/[0.05]"></div>
                                <div className="text-center">
                                  <p className="text-xs font-black text-red-400">{job.failedCount}</p>
                                  <p className="text-[8px] text-red-900 font-black uppercase tracking-tighter">FAIL</p>
                                </div>
                              </>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{job.createdBy?.name || 'SYSTEM'}</p>
                          <p className="text-[9px] text-slate-600 font-bold uppercase mt-0.5">Primary Admin</p>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-[10px] font-black text-slate-500 uppercase tracking-tight">{formatDate(job.createdAt)}</p>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-600 group-hover:text-primary-400 group-hover:border-primary-500/20 group-hover:bg-primary-500/10 transition-all opacity-0 group-hover:opacity-100">
                            <HiOutlineChevronRight className="w-4 h-4" />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 pt-4">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="w-10 h-10 rounded-xl border border-slate-700 bg-slate-900/50 flex items-center justify-center text-slate-400 hover:text-white hover:border-slate-500 disabled:opacity-20 disabled:cursor-not-allowed transition-all"
              >
                <HiOutlineChevronRight className="w-5 h-5 rotate-180" />
              </button>
              <div className="px-6 py-2 rounded-xl bg-slate-900/50 border border-slate-800 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">
                Matrix Page <span className="text-white mx-1">{page}</span> of <span className="text-white mx-1">{totalPages}</span>
              </div>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="w-10 h-10 rounded-xl border border-slate-700 bg-slate-900/50 flex items-center justify-center text-slate-400 hover:text-white hover:border-slate-500 disabled:opacity-20 disabled:cursor-not-allowed transition-all"
              >
                <HiOutlineChevronRight className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
