import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../src/services/api';
import toast from 'react-hot-toast';
import ConfirmWithPassword from '../../src/components/ConfirmWithPassword';
import {
  HiOutlineArrowLeft, HiOutlineEye, HiOutlineRefresh, HiOutlinePause,
  HiOutlinePlay, HiOutlineX, HiOutlineDownload, HiOutlineSearch,
  HiOutlineChevronLeft, HiOutlineChevronRight,
} from 'react-icons/hi';

const STATUS_CONFIG = {
  draft:                    { label: 'Draft',       bg: 'bg-gray-100',    text: 'text-gray-700',   dot: 'bg-gray-400' },
  queued:                   { label: 'Queued',      bg: 'bg-blue-100',    text: 'text-blue-700',   dot: 'bg-blue-500' },
  processing:               { label: 'Sending',    bg: 'bg-amber-100',   text: 'text-amber-700',  dot: 'bg-amber-500 animate-pulse' },
  paused:                   { label: 'Paused',      bg: 'bg-orange-100',  text: 'text-orange-700', dot: 'bg-orange-500' },
  completed:                { label: 'Completed',   bg: 'bg-green-100',   text: 'text-green-700',  dot: 'bg-green-500' },
  completed_with_failures:  { label: 'Partial',     bg: 'bg-yellow-100',  text: 'text-yellow-700', dot: 'bg-yellow-500' },
  failed:                   { label: 'Failed',      bg: 'bg-red-100',     text: 'text-red-700',    dot: 'bg-red-500' },
  cancelled:                { label: 'Cancelled',   bg: 'bg-gray-100',    text: 'text-gray-500',   dot: 'bg-gray-400' },
};

const RECIPIENT_STATUS = {
  pending:      { label: 'Pending',      color: 'bg-gray-100 text-gray-600' },
  processing:   { label: 'Processing',   color: 'bg-blue-100 text-blue-600' },
  sent:         { label: 'Sent',         color: 'bg-green-100 text-green-700' },
  failed:       { label: 'Failed',       color: 'bg-red-100 text-red-700' },
  bounced:      { label: 'Bounced',      color: 'bg-orange-100 text-orange-700' },
  complained:   { label: 'Complained',   color: 'bg-red-100 text-red-700' },
  unsubscribed: { label: 'Unsub',        color: 'bg-violet-100 text-violet-700' },
  suppressed:   { label: 'Suppressed',   color: 'bg-gray-100 text-gray-500' },
};

export default function CampaignDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [campaign, setCampaign] = useState(null);
  const [liveCounts, setLiveCounts] = useState({});
  const [recentFailures, setRecentFailures] = useState([]);
  const [loading, setLoading] = useState(true);

  // Recipients
  const [recipients, setRecipients] = useState([]);
  const [recipPage, setRecipPage] = useState(1);
  const [recipTotalPages, setRecipTotalPages] = useState(1);
  const [recipStatusFilter, setRecipStatusFilter] = useState('');
  const [recipSearch, setRecipSearch] = useState('');
  const [recipLoading, setRecipLoading] = useState(false);

  // Preview
  const [previewOpen, setPreviewOpen] = useState(false);

  // Retry confirm
  const [retryOpen, setRetryOpen] = useState(false);

  // Auto-refresh
  const [autoRefresh, setAutoRefresh] = useState(false);

  const fetchCampaign = useCallback(async () => {
    try {
      const { data } = await api.get(`/campaigns/${id}`);
      setCampaign(data.data.campaign);
      setLiveCounts(data.data.campaign.liveCounts || {});
      setRecentFailures(data.data.recentFailures || []);
    } catch (err) {
      toast.error('Campaign not found');
      navigate('/campaigns');
    } finally { setLoading(false); }
  }, [id, navigate]);

  const fetchRecipients = useCallback(async () => {
    setRecipLoading(true);
    try {
      const params = { page: recipPage, limit: 50 };
      if (recipStatusFilter) params.status = recipStatusFilter;
      if (recipSearch) params.search = recipSearch;
      const { data } = await api.get(`/campaigns/${id}/recipients`, { params });
      setRecipients(data.data.recipients);
      setRecipTotalPages(data.data.pages);
    } catch { /* ignore */ }
    finally { setRecipLoading(false); }
  }, [id, recipPage, recipStatusFilter, recipSearch]);

  useEffect(() => { fetchCampaign(); }, [fetchCampaign]);
  useEffect(() => { if (campaign && campaign.totalRecipients > 0) fetchRecipients(); }, [campaign?.totalRecipients, fetchRecipients]);

  // Auto-refresh for active campaigns
  useEffect(() => {
    if (!campaign || !['processing', 'queued'].includes(campaign.status)) {
      setAutoRefresh(false);
      return;
    }
    setAutoRefresh(true);
    const interval = setInterval(() => { fetchCampaign(); fetchRecipients(); }, 5000);
    return () => clearInterval(interval);
  }, [campaign?.status, fetchCampaign, fetchRecipients]);

  const handlePause  = async () => { try { await api.post(`/campaigns/${id}/pause`);  toast.success('Paused');  fetchCampaign(); } catch(e) { toast.error(e.response?.data?.message || 'Error'); } };
  const handleResume = async () => { try { await api.post(`/campaigns/${id}/resume`); toast.success('Resumed'); fetchCampaign(); } catch(e) { toast.error(e.response?.data?.message || 'Error'); } };
  const handleCancel = async () => { if(!window.confirm('Cancel?')) return; try { await api.post(`/campaigns/${id}/cancel`); toast.success('Cancelled'); fetchCampaign(); } catch(e) { toast.error(e.response?.data?.message || 'Error'); } };

  const handleRetry = async (password) => {
    try {
      const { data } = await api.post(`/campaigns/${id}/retry`, { adminPassword: password });
      toast.success(data.message);
      fetchCampaign();
    } catch (err) { toast.error(err.response?.data?.message || 'Retry failed'); throw err; }
  };

  const handleExport = async () => {
    try {
      const resp = await api.get(`/campaigns/${id}/export`, { responseType: 'blob' });
      const url  = window.URL.createObjectURL(new Blob([resp.data]));
      const link = document.createElement('a');
      link.href = url;
      link.download = `campaign-${id}-logs.csv`;
      link.click();
      window.URL.revokeObjectURL(url);
      toast.success('Logs exported');
    } catch { toast.error('Export failed'); }
  };

  if (loading || !campaign) {
    return <div className="flex justify-center py-24"><div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" /></div>;
  }

  const cfg     = STATUS_CONFIG[campaign.status] || STATUS_CONFIG.draft;
  const total   = campaign.totalRecipients || 1;
  const done    = (liveCounts.sent || 0) + (liveCounts.failed || 0) + (liveCounts.bounced || 0) + (liveCounts.complained || 0) + (liveCounts.suppressed || 0) + (liveCounts.unsubscribed || 0);
  const pct     = Math.round((done / total) * 100);
  const isActive = ['processing', 'queued'].includes(campaign.status);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/campaigns')} className="text-gray-400 hover:text-gray-600"><HiOutlineArrowLeft className="w-5 h-5" /></button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">{campaign.title}</h1>
            <p className="text-sm text-gray-500">{campaign.subject}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {autoRefresh && <span className="text-[10px] text-green-600 bg-green-50 px-2 py-0.5 rounded-full font-medium animate-pulse">Live</span>}
          <button onClick={() => { fetchCampaign(); fetchRecipients(); }} className="btn-secondary text-sm flex items-center gap-1.5">
            <HiOutlineRefresh className="w-4 h-4" /> Refresh
          </button>
        </div>
      </div>

      {/* Status + Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-6">
        <div className="card col-span-1 lg:col-span-4">
          <div className="flex items-center gap-3 mb-4">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold ${cfg.bg} ${cfg.text}`}>
              <span className={`w-2 h-2 rounded-full ${cfg.dot}`} /> {cfg.label}
            </span>
            <span className="text-xs text-gray-500">
              Provider: <strong className="text-blue-700">Amazon SES</strong>
            </span>
            {campaign.createdBy && (
              <span className="text-xs text-gray-400">by {campaign.createdBy.name || campaign.createdBy.email}</span>
            )}
          </div>

          {/* Progress bar */}
          {campaign.totalRecipients > 0 && (
            <div className="mb-4">
              <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span>{done} / {campaign.totalRecipients} processed</span>
                <span>{pct}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div className={`h-2.5 rounded-full transition-all duration-700 ${isActive ? 'bg-primary-500' : 'bg-green-500'}`} style={{ width: `${pct}%` }} />
              </div>
            </div>
          )}

          {/* Stats grid */}
          <div className="grid grid-cols-4 md:grid-cols-8 gap-2 text-center">
            {[
              { label: 'Total',       value: campaign.totalRecipients,  color: 'text-gray-800' },
              { label: 'Pending',     value: liveCounts.pending    || 0, color: 'text-gray-500' },
              { label: 'Sending',     value: liveCounts.processing || 0, color: 'text-blue-600' },
              { label: 'Sent',        value: liveCounts.sent       || 0, color: 'text-green-600' },
              { label: 'Failed',      value: liveCounts.failed     || 0, color: 'text-red-600' },
              { label: 'Bounced',     value: liveCounts.bounced    || 0, color: 'text-orange-600' },
              { label: 'Complained',  value: liveCounts.complained || 0, color: 'text-red-500' },
              { label: 'Suppressed',  value: (liveCounts.suppressed || 0) + (liveCounts.unsubscribed || 0), color: 'text-gray-500' },
            ].map((s) => (
              <div key={s.label} className="bg-gray-50 rounded-lg p-2">
                <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
                <p className="text-[10px] text-gray-500">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-2 mb-6">
        <button onClick={() => setPreviewOpen(true)} className="btn-secondary text-sm flex items-center gap-1.5">
          <HiOutlineEye className="w-4 h-4" /> Preview Email
        </button>
        {campaign.status === 'processing' && (
          <button onClick={handlePause} className="btn-secondary text-sm flex items-center gap-1.5 text-orange-600 border-orange-200 hover:bg-orange-50">
            <HiOutlinePause className="w-4 h-4" /> Pause
          </button>
        )}
        {campaign.status === 'paused' && (
          <button onClick={handleResume} className="btn-secondary text-sm flex items-center gap-1.5 text-green-600 border-green-200 hover:bg-green-50">
            <HiOutlinePlay className="w-4 h-4" /> Resume
          </button>
        )}
        {['processing', 'queued', 'paused'].includes(campaign.status) && (
          <button onClick={handleCancel} className="btn-secondary text-sm flex items-center gap-1.5 text-red-600 border-red-200 hover:bg-red-50">
            <HiOutlineX className="w-4 h-4" /> Cancel
          </button>
        )}
        {['completed_with_failures', 'failed'].includes(campaign.status) && (liveCounts.failed > 0) && (
          <button onClick={() => setRetryOpen(true)} className="btn-primary text-sm flex items-center gap-1.5">
            <HiOutlineRefresh className="w-4 h-4" /> Retry {liveCounts.failed} Failed
          </button>
        )}
        {campaign.totalRecipients > 0 && (
          <button onClick={handleExport} className="btn-secondary text-sm flex items-center gap-1.5 ml-auto">
            <HiOutlineDownload className="w-4 h-4" /> Export Logs
          </button>
        )}
      </div>

      {/* Recipient table */}
      {campaign.totalRecipients > 0 && (
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
            <h2 className="text-sm font-semibold text-gray-700">Recipients</h2>
            <div className="flex gap-2">
              <div className="relative">
                <HiOutlineSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 w-3.5 h-3.5" />
                <input type="text" placeholder="Search..." value={recipSearch}
                  onChange={(e) => { setRecipSearch(e.target.value); setRecipPage(1); }}
                  className="input-field pl-8 text-xs w-40 py-1.5" />
              </div>
              <select value={recipStatusFilter} onChange={(e) => { setRecipStatusFilter(e.target.value); setRecipPage(1); }}
                className="input-field text-xs w-auto py-1.5">
                <option value="">All</option>
                {Object.entries(RECIPIENT_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
          </div>

          {recipLoading ? (
            <div className="flex justify-center py-8"><div className="w-6 h-6 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" /></div>
          ) : recipients.length === 0 ? (
            <p className="text-center py-8 text-sm text-gray-400">No recipients match the filter.</p>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50/50 border-b border-gray-200">
                  <th className="text-left py-2.5 px-4 font-semibold text-gray-600">Email</th>
                  <th className="text-left py-2.5 px-4 font-semibold text-gray-600">Name</th>
                  <th className="text-left py-2.5 px-4 font-semibold text-gray-600">Status</th>
                  <th className="text-left py-2.5 px-4 font-semibold text-gray-600">Sent At</th>
                  <th className="text-left py-2.5 px-4 font-semibold text-gray-600">Failure</th>
                </tr>
              </thead>
              <tbody>
                {recipients.map((r) => {
                  const rs = RECIPIENT_STATUS[r.status] || { label: r.status, color: 'bg-gray-100 text-gray-500' };
                  return (
                    <tr key={r._id} className="border-b border-gray-50 hover:bg-gray-50/50">
                      <td className="py-2 px-4 font-medium text-gray-700">{r.recipientEmail}</td>
                      <td className="py-2 px-4 text-gray-500">{r.recipientName || '—'}</td>
                      <td className="py-2 px-4">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${rs.color}`}>{rs.label}</span>
                      </td>
                      <td className="py-2 px-4 text-gray-400">{r.sentAt ? new Date(r.sentAt).toLocaleString() : '—'}</td>
                      <td className="py-2 px-4 text-red-500 truncate max-w-[200px]">{r.failureReason || ''}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}

          {recipTotalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-2.5 border-t border-gray-200">
              <p className="text-[10px] text-gray-500">Page {recipPage} of {recipTotalPages}</p>
              <div className="flex gap-1">
                <button onClick={() => setRecipPage((p) => Math.max(1, p - 1))} disabled={recipPage <= 1} className="p-1 text-gray-400 disabled:opacity-40"><HiOutlineChevronLeft className="w-3.5 h-3.5" /></button>
                <button onClick={() => setRecipPage((p) => Math.min(recipTotalPages, p + 1))} disabled={recipPage >= recipTotalPages} className="p-1 text-gray-400 disabled:opacity-40"><HiOutlineChevronRight className="w-3.5 h-3.5" /></button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Recent Failures */}
      {recentFailures.length > 0 && (
        <div className="card mt-4">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Recent Failures</h2>
          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            {recentFailures.map((f) => (
              <div key={f._id} className="flex items-center gap-3 text-xs bg-red-50 border border-red-100 rounded-lg p-2">
                <span className="font-medium text-gray-700">{f.recipientEmail}</span>
                <span className="text-red-600 truncate flex-1">{f.failureReason}</span>
                <span className="text-gray-400 flex-shrink-0">×{f.retryCount}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {previewOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setPreviewOpen(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h3 className="text-lg font-bold text-gray-900">Email Preview</h3>
              <button onClick={() => setPreviewOpen(false)} className="text-gray-400 hover:text-gray-600"><HiOutlineX className="w-5 h-5" /></button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[calc(85vh-72px)]">
              <div dangerouslySetInnerHTML={{ __html: campaign.htmlContent }} />
            </div>
          </div>
        </div>
      )}

      {/* Retry Confirm */}
      <ConfirmWithPassword
        open={retryOpen}
        onClose={() => setRetryOpen(false)}
        onConfirm={handleRetry}
        title="Retry Failed Recipients"
        message={`This will retry sending to ${liveCounts.failed || 0} failed recipients via Amazon SES.`}
        confirmLabel="Retry"
        variant="warning"
      />
    </div>
  );
}
