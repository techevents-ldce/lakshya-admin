import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../src/services/api';
import toast from 'react-hot-toast';
import {
  HiOutlineSpeakerphone, HiOutlinePlus, HiOutlineSearch, HiOutlineRefresh,
  HiOutlineEye, HiOutlineDuplicate, HiOutlinePencil, HiOutlinePause, HiOutlinePlay,
  HiOutlineX, HiOutlinePaperAirplane, HiOutlineChevronLeft, HiOutlineChevronRight,
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

const StatusBadge = ({ status }) => {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.draft;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${cfg.bg} ${cfg.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
};

export default function Campaigns() {
  const navigate = useNavigate();
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const fetchCampaigns = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 20 };
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      const { data } = await api.get('/campaigns', { params });
      setCampaigns(data.data.campaigns);
      setTotalPages(data.data.pages);
    } catch (err) {
      toast.error(err.userMessage || 'Failed to load campaigns');
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter]);

  useEffect(() => { fetchCampaigns(); }, [fetchCampaigns]);

  const handleDuplicate = async (id) => {
    try {
      const { data } = await api.post(`/campaigns/${id}/duplicate`);
      toast.success('Campaign duplicated as draft');
      navigate(`/campaigns/${data.data.campaign._id}/edit`);
    } catch (err) { toast.error(err.userMessage || 'Failed to duplicate'); }
  };

  const handleCancel = async (id) => {
    if (!window.confirm('Cancel this campaign? Unsent emails will not be sent.')) return;
    try {
      await api.post(`/campaigns/${id}/cancel`);
      toast.success('Campaign cancelled');
      fetchCampaigns();
    } catch (err) { toast.error(err.userMessage || 'Failed to cancel'); }
  };

  const handlePause = async (id) => {
    try { await api.post(`/campaigns/${id}/pause`); toast.success('Campaign paused'); fetchCampaigns(); }
    catch (err) { toast.error(err.userMessage || 'Failed to pause'); }
  };

  const handleResume = async (id) => {
    try { await api.post(`/campaigns/${id}/resume`); toast.success('Campaign resumed'); fetchCampaigns(); }
    catch (err) { toast.error(err.userMessage || 'Failed to resume'); }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2 text-gray-900">
          <HiOutlineSpeakerphone className="w-7 h-7 text-primary-600" />
          Email Campaigns
        </h1>
        <button onClick={() => navigate('/campaigns/new')} className="btn-primary flex items-center gap-2 text-sm">
          <HiOutlinePlus className="w-5 h-5" /> New Campaign
        </button>
      </div>

      {/* Filters */}
      <div className="card mb-6">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <HiOutlineSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input type="text" placeholder="Search campaigns..." value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="input-field pl-10 text-sm" />
          </div>
          <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="input-field w-auto text-sm">
            <option value="">All Statuses</option>
            {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <button onClick={fetchCampaigns} className="btn-secondary flex items-center gap-1.5 text-sm">
            <HiOutlineRefresh className="w-4 h-4" /> Refresh
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
          </div>
        ) : campaigns.length === 0 ? (
          <div className="text-center py-16">
            <HiOutlineSpeakerphone className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-600 mb-1">No campaigns yet</h3>
            <p className="text-sm text-gray-400 mb-4">Create your first email campaign to get started.</p>
            <button onClick={() => navigate('/campaigns/new')} className="btn-primary text-sm">
              <HiOutlinePlus className="w-4 h-4 inline mr-1" /> Create Campaign
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50/50">
                  <th className="text-left py-3 px-4 font-semibold text-gray-600">Campaign</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-600">Status</th>
                  <th className="text-center py-3 px-4 font-semibold text-gray-600">Recipients</th>
                  <th className="text-center py-3 px-4 font-semibold text-gray-600">Sent</th>
                  <th className="text-center py-3 px-4 font-semibold text-gray-600">Failed</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-600">Created</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {campaigns.map((c) => {
                  const progress = c.totalRecipients > 0 ? Math.round(((c.sentCount + c.failedCount + c.bouncedCount + c.complainedCount + c.suppressedCount) / c.totalRecipients) * 100) : 0;
                  return (
                    <tr key={c._id} className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors">
                      <td className="py-3 px-4">
                        <button onClick={() => navigate(`/campaigns/${c._id}`)}
                          className="text-left hover:text-primary-600 transition-colors">
                          <p className="font-semibold text-gray-800 truncate max-w-[250px]">{c.title}</p>
                          <p className="text-xs text-gray-500 truncate max-w-[250px]">{c.subject}</p>
                        </button>
                      </td>
                      <td className="py-3 px-4">
                        <StatusBadge status={c.status} />
                        {['processing', 'queued'].includes(c.status) && c.totalRecipients > 0 && (
                          <div className="mt-1.5 w-20 bg-gray-200 rounded-full h-1.5">
                            <div className="bg-primary-500 h-1.5 rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center font-medium text-gray-700">{c.totalRecipients}</td>
                      <td className="py-3 px-4 text-center font-medium text-green-700">{c.sentCount}</td>
                      <td className="py-3 px-4 text-center font-medium text-red-700">{c.failedCount + c.bouncedCount}</td>
                      <td className="py-3 px-4 text-gray-500 text-xs">{new Date(c.createdAt).toLocaleDateString()}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => navigate(`/campaigns/${c._id}`)} title="View"
                            className="p-1.5 rounded-lg text-gray-400 hover:text-primary-600 hover:bg-primary-50 transition-all">
                            <HiOutlineEye className="w-4 h-4" />
                          </button>
                          {c.status === 'draft' && (
                            <button onClick={() => navigate(`/campaigns/${c._id}/edit`)} title="Edit"
                              className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-all">
                              <HiOutlinePencil className="w-4 h-4" />
                            </button>
                          )}
                          <button onClick={() => handleDuplicate(c._id)} title="Duplicate"
                            className="p-1.5 rounded-lg text-gray-400 hover:text-violet-600 hover:bg-violet-50 transition-all">
                            <HiOutlineDuplicate className="w-4 h-4" />
                          </button>
                          {c.status === 'processing' && (
                            <button onClick={() => handlePause(c._id)} title="Pause"
                              className="p-1.5 rounded-lg text-gray-400 hover:text-orange-600 hover:bg-orange-50 transition-all">
                              <HiOutlinePause className="w-4 h-4" />
                            </button>
                          )}
                          {c.status === 'paused' && (
                            <button onClick={() => handleResume(c._id)} title="Resume"
                              className="p-1.5 rounded-lg text-gray-400 hover:text-green-600 hover:bg-green-50 transition-all">
                              <HiOutlinePlay className="w-4 h-4" />
                            </button>
                          )}
                          {['processing', 'queued', 'paused'].includes(c.status) && (
                            <button onClick={() => handleCancel(c._id)} title="Cancel"
                              className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-all">
                              <HiOutlineX className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
            <p className="text-xs text-gray-500">Page {page} of {totalPages}</p>
            <div className="flex gap-1">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 disabled:opacity-40">
                <HiOutlineChevronLeft className="w-4 h-4" />
              </button>
              <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 disabled:opacity-40">
                <HiOutlineChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
