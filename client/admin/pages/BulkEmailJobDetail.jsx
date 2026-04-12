import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../src/services/api';
import toast from 'react-hot-toast';
import {
  HiOutlineMail,
  HiOutlineClock,
  HiOutlineCheckCircle,
  HiOutlineExclamationCircle,
  HiOutlineXCircle,
  HiOutlineRefresh,
  HiOutlineChevronLeft,
  HiOutlineDocumentText,
  HiOutlineUserGroup,
  HiOutlineInformationCircle,
  HiOutlineShieldCheck,
  HiOutlineExternalLink,
} from 'react-icons/hi';

const STATUS_CONFIG = {
  queued: { label: 'Queued', color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/30', icon: HiOutlineClock },
  processing: { label: 'Processing', color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/30', icon: HiOutlineRefresh },
  completed: { label: 'Completed', color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/30', icon: HiOutlineCheckCircle },
  completed_with_failures: { label: 'Partial', color: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/30', icon: HiOutlineExclamationCircle },
  failed: { label: 'Failed', color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/30', icon: HiOutlineXCircle },
  cancelled: { label: 'Cancelled', color: 'text-slate-400', bg: 'bg-slate-500/10 border-slate-500/30', icon: HiOutlineXCircle },
};

const RECIPIENT_STATUS_CONFIG = {
  pending: { label: 'Pending', color: 'text-slate-500', bg: 'bg-slate-500/10 border-slate-500/20' },
  sent: { label: 'Sent', color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
  failed: { label: 'Failed', color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20' },
};

export default function BulkEmailJobDetail() {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const [job, setJob] = useState(null);
  const [recipients, setRecipients] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchDetail = async () => {
    try {
      const { data } = await api.get(`/mail/jobs/${jobId}`);
      setJob(data.data.job);
      setRecipients(data.data.recipients);
    } catch {
      toast.error('Failed to resolve job node');
      navigate('/bulk-email/jobs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetail();
    // Auto-refresh if processing
    let interval;
    if (job && ['queued', 'processing'].includes(job.status)) {
      interval = setInterval(fetchDetail, 3000);
    }
    return () => clearInterval(interval);
  }, [jobId, job?.status]);

  if (loading && !job) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <HiOutlineRefresh className="w-10 h-10 text-primary-500 animate-spin" />
        <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mt-4">Analyzing job node...</p>
      </div>
    );
  }

  const cfg = STATUS_CONFIG[job.status] || STATUS_CONFIG.queued;
  const StatusIcon = cfg.icon;

  const formatDate = (d) => {
    if (!d) return '—';
    return new Date(d).toLocaleString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    });
  };

  return (
    <div className="animate-fade-in space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/bulk-email/jobs')}
            className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500 hover:text-white hover:border-slate-700 transition-all"
          >
            <HiOutlineChevronLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-black text-white uppercase tracking-tighter">Transmission Detail</h1>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Nodal ID: <span className="text-slate-400">{job._id}</span></p>
          </div>
        </div>
        <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border ${cfg.bg} ${cfg.color}`}>
          <StatusIcon className={`w-4 h-4 ${job.status === 'processing' ? 'animate-spin' : ''}`} />
          {cfg.label}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Execution Metrics */}
        <div className="lg:col-span-2 space-y-6">
          <div className="card space-y-6 border-slate-700/30 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary-500/5 blur-[50px] pointer-events-none"></div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div className="space-y-1">
                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Total Nodes</p>
                <p className="text-2xl font-black text-white">{job.totalRecipients}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">Successful</p>
                <p className="text-2xl font-black text-emerald-400">{job.completedCount}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[9px] font-black text-red-600 uppercase tracking-widest">Failures</p>
                <p className="text-2xl font-black text-red-400">{job.failedCount}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[9px] font-black text-blue-600 uppercase tracking-widest">Progress</p>
                <p className="text-2xl font-black text-blue-400">{Math.round((job.completedCount + job.failedCount) / job.totalRecipients * 100)}%</p>
              </div>
            </div>

            <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
               <div 
                 className="h-full bg-primary-500 shadow-[0_0_8px_rgba(59,130,246,0.5)] transition-all duration-1000"
                 style={{ width: `${(job.completedCount + job.failedCount) / job.totalRecipients * 100}%` }}
               ></div>
            </div>

            <div className="pt-6 border-t border-white/[0.05] space-y-4">
               <div>
                  <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-3 flex items-center gap-2">
                    <HiOutlineDocumentText className="w-4 h-4 text-primary-400" /> Transmission Payload
                  </h3>
                  <div className="p-4 rounded-2xl bg-slate-900/50 border border-slate-800">
                    <p className="text-sm font-black text-white mb-2 uppercase tracking-tight">{job.subject}</p>
                    <div className="text-[11px] text-slate-400 leading-relaxed font-bold break-words whitespace-pre-wrap opacity-80 max-h-48 overflow-y-auto custom-scrollbar pr-2">
                      {job.body}
                    </div>
                  </div>
               </div>
            </div>
          </div>

          <div className="card space-y-4 border-slate-700/30">
            <div className="flex items-center justify-between mb-2">
               <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2">
                 <HiOutlineUserGroup className="w-4 h-4 text-primary-400" /> Nodal Recipient List
               </h3>
               <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest">{recipients.length} Identified Units</span>
            </div>
            <div className="overflow-hidden rounded-2xl border border-white/[0.05]">
              <div className="max-h-[500px] overflow-y-auto custom-scrollbar divide-y divide-white/[0.02]">
                {recipients.map((r, i) => {
                  const rCfg = RECIPIENT_STATUS_CONFIG[r.status] || RECIPIENT_STATUS_CONFIG.pending;
                  return (
                    <div key={i} className="flex items-center justify-between p-4 bg-white/[0.01] hover:bg-white/[0.03] transition-all group">
                      <div className="min-w-0 pr-4">
                        <div className="flex items-center gap-2 mb-0.5">
                          <p className="text-[11px] font-black text-white uppercase truncate tracking-tight group-hover:text-primary-400 transition-colors">
                            {r.recipientName || r.recipientEmail.split('@')[0]}
                          </p>
                          {r.clubName && <span className="text-[8px] font-black text-primary-400 uppercase tracking-tighter">· {r.clubName}</span>}
                        </div>
                        <p className="text-[9px] text-slate-500 font-bold uppercase tracking-tight truncate">{r.recipientEmail}</p>
                      </div>
                      <div className="flex flex-col items-end gap-2 shrink-0">
                        <span className={`px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-widest border ${rCfg.bg} ${rCfg.color}`}>
                          {rCfg.label}
                        </span>
                        {r.error && (
                          <div className="group/err relative">
                             <HiOutlineInformationCircle className="w-3.5 h-3.5 text-red-400 cursor-help" />
                             <div className="absolute bottom-full right-0 mb-2 w-48 p-2 bg-slate-900 border border-slate-700 text-red-200 text-[8px] font-bold rounded-lg shadow-2xl opacity-0 invisible group-hover/err:opacity-100 group-hover/err:visible transition-all z-20">
                               {r.error}
                             </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Info & Strategy */}
        <div className="space-y-6">
          <div className="card space-y-6 border-slate-700/30">
            <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2">
              <HiOutlineShieldCheck className="w-4 h-4 text-primary-400" /> Nodal Metadata
            </h3>
            
            <div className="space-y-4">
              <div className="space-y-1.5 p-3 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Protocol Type</p>
                <div className="flex items-center gap-2">
                   <div className="w-1.5 h-1.5 rounded-full bg-primary-500"></div>
                   <p className="text-[11px] font-black text-white uppercase tracking-tight">{job.template} Matrix</p>
                </div>
              </div>
              
              <div className="space-y-1.5 p-3 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Transmission Time</p>
                <p className="text-[11px] font-black text-white uppercase tracking-tight">{formatDate(job.createdAt)}</p>
              </div>

              <div className="space-y-1.5 p-3 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Sender Identity</p>
                <p className="text-[11px] font-black text-white uppercase tracking-tight">{job.senderIdentity || 'Lakshya Updates'}</p>
                <p className="text-[9px] text-slate-500 font-bold tracking-tight lowercase">{job.senderEmail || 'updates@notify.lakshyaldce.in'}</p>
              </div>

              <div className="space-y-1.5 p-3 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Primary Origin</p>
                <p className="text-[11px] font-black text-white uppercase tracking-tight">{job.createdBy?.name || 'SYSTEM OVERRIDE'}</p>
              </div>
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-indigo-500/5 border border-indigo-500/20 space-y-3">
             <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                   <HiOutlineExternalLink className="w-5 h-5" />
                </div>
                <h4 className="text-[11px] font-black text-indigo-200 uppercase tracking-widest">Nodal Intelligence</h4>
             </div>
             <p className="text-[10px] text-indigo-300/60 font-medium leading-relaxed uppercase tracking-tight">
               Background transmission threads are isolated. Multi-path delivery ensures 99.9% reach. Failures are automatically logged for re-transmission protocols.
             </p>
          </div>
        </div>
      </div>
    </div>
  );
}
