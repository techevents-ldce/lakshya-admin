import { useState, useEffect, useCallback } from 'react';
import api from '../../src/services/api';
import toast from 'react-hot-toast';
import {
  HiOutlineBan, HiOutlinePlus, HiOutlineSearch, HiOutlineTrash,
  HiOutlineX, HiOutlineChevronLeft, HiOutlineChevronRight, HiOutlineRefresh,
} from 'react-icons/hi';

const REASON_CONFIG = {
  unsubscribed: { label: 'Unsubscribed', color: 'bg-blue-100 text-blue-700' },
  bounced:      { label: 'Bounced',      color: 'bg-red-100 text-red-700' },
  complained:   { label: 'Complained',   color: 'bg-orange-100 text-orange-700' },
  manual:       { label: 'Manual',       color: 'bg-gray-100 text-gray-600' },
  other:        { label: 'Other',        color: 'bg-gray-100 text-gray-500' },
};

export default function SuppressionList() {
  const [suppressions, setSuppressions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [reasonFilter, setReasonFilter] = useState('');

  // Add modal
  const [addOpen, setAddOpen] = useState(false);
  const [addEmail, setAddEmail] = useState('');
  const [addReason, setAddReason] = useState('manual');
  const [addNotes, setAddNotes] = useState('');
  const [adding, setAdding] = useState(false);

  const fetchSuppressions = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 50 };
      if (search) params.search = search;
      if (reasonFilter) params.reason = reasonFilter;
      const { data } = await api.get('/suppressions', { params });
      setSuppressions(data.data.suppressions);
      setTotalPages(data.data.pages);
    } catch { toast.error('Failed to load suppressions'); }
    finally { setLoading(false); }
  }, [page, search, reasonFilter]);

  useEffect(() => { fetchSuppressions(); }, [fetchSuppressions]);

  const handleAdd = async () => {
    if (!addEmail) { toast.error('Email required'); return; }
    setAdding(true);
    try {
      await api.post('/suppressions', { email: addEmail, reason: addReason, notes: addNotes });
      toast.success(`${addEmail} suppressed`);
      setAddOpen(false);
      setAddEmail(''); setAddNotes('');
      fetchSuppressions();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to add'); }
    finally { setAdding(false); }
  };

  const handleRemove = async (email) => {
    if (!window.confirm(`Remove ${email} from suppression list? They will receive future campaign emails.`)) return;
    try {
      await api.delete(`/suppressions/${encodeURIComponent(email)}`);
      toast.success('Suppression removed');
      fetchSuppressions();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to remove'); }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2 text-gray-900">
          <HiOutlineBan className="w-7 h-7 text-primary-600" />
          Suppression List
        </h1>
        <button onClick={() => setAddOpen(true)} className="btn-primary flex items-center gap-2 text-sm">
          <HiOutlinePlus className="w-5 h-5" /> Add Suppression
        </button>
      </div>

      <div className="card mb-6">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <HiOutlineSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input type="text" placeholder="Search by email..." value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="input-field pl-10 text-sm" />
          </div>
          <select value={reasonFilter} onChange={(e) => { setReasonFilter(e.target.value); setPage(1); }} className="input-field w-auto text-sm">
            <option value="">All Reasons</option>
            {Object.entries(REASON_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <button onClick={fetchSuppressions} className="btn-secondary flex items-center gap-1.5 text-sm">
            <HiOutlineRefresh className="w-4 h-4" /> Refresh
          </button>
        </div>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" /></div>
        ) : suppressions.length === 0 ? (
          <div className="text-center py-16">
            <HiOutlineBan className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-600 mb-1">No suppressions</h3>
            <p className="text-sm text-gray-400">All emails are eligible to receive campaigns.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50/50">
                <th className="text-left py-3 px-4 font-semibold text-gray-600">Email</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-600">Reason</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-600">Source</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-600">Date</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-600">Action</th>
              </tr>
            </thead>
            <tbody>
              {suppressions.map((s) => {
                const r = REASON_CONFIG[s.reason] || REASON_CONFIG.other;
                return (
                  <tr key={s._id} className="border-b border-gray-100 hover:bg-gray-50/50">
                    <td className="py-3 px-4 font-medium text-gray-800">{s.email}</td>
                    <td className="py-3 px-4">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${r.color}`}>{r.label}</span>
                    </td>
                    <td className="py-3 px-4 text-gray-500 capitalize text-xs">{s.source}</td>
                    <td className="py-3 px-4 text-gray-500 text-xs">{new Date(s.createdAt).toLocaleDateString()}</td>
                    <td className="py-3 px-4 text-right">
                      <button onClick={() => handleRemove(s.email)} title="Remove"
                        className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-all">
                        <HiOutlineTrash className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
            <p className="text-xs text-gray-500">Page {page} of {totalPages}</p>
            <div className="flex gap-1">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} className="p-1.5 rounded-lg text-gray-400 disabled:opacity-40"><HiOutlineChevronLeft className="w-4 h-4" /></button>
              <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="p-1.5 rounded-lg text-gray-400 disabled:opacity-40"><HiOutlineChevronRight className="w-4 h-4" /></button>
            </div>
          </div>
        )}
      </div>

      {/* Add Suppression Modal */}
      {addOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setAddOpen(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">Add Suppression</h3>
              <button onClick={() => setAddOpen(false)} className="text-gray-400 hover:text-gray-600"><HiOutlineX className="w-5 h-5" /></button>
            </div>
            <div className="space-y-3">
              <input type="email" placeholder="Email address" value={addEmail} onChange={(e) => setAddEmail(e.target.value)} className="input-field text-sm" />
              <select value={addReason} onChange={(e) => setAddReason(e.target.value)} className="input-field text-sm">
                {Object.entries(REASON_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
              <input type="text" placeholder="Notes (optional)" value={addNotes} onChange={(e) => setAddNotes(e.target.value)} className="input-field text-sm" />
            </div>
            <div className="flex gap-2 justify-end mt-4">
              <button onClick={() => setAddOpen(false)} className="btn-secondary text-sm">Cancel</button>
              <button onClick={handleAdd} disabled={adding} className="btn-primary text-sm">{adding ? 'Adding...' : 'Suppress Email'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
