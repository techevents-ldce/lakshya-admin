import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import {
  HiOutlineSearch,
  HiOutlinePlus,
  HiOutlinePencil,
  HiOutlineChartBar,
  HiOutlineCollection,
  HiOutlineExclamation,
  HiOutlineClipboardList,
} from 'react-icons/hi';

const TABS = [
  { id: 'overview', label: 'Overview', icon: HiOutlineChartBar },
  { id: 'mappings', label: 'Mappings', icon: HiOutlineCollection },
  { id: 'unmapped', label: 'Unmapped codes', icon: HiOutlineExclamation },
  { id: 'leaderboard', label: 'Leaderboard', icon: HiOutlineClipboardList },
];

const emptyForm = {
  referralCode: '',
  caName: '',
  caEmail: '',
  caPhone: '',
  notes: '',
  isActive: true,
};

export default function Referrals() {
  const [tab, setTab] = useState('overview');
  const [summary, setSummary] = useState(null);
  const [codeAnalytics, setCodeAnalytics] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [unmapped, setUnmapped] = useState([]);
  const [mappings, setMappings] = useState([]);
  const [mapTotal, setMapTotal] = useState(0);
  const [mapPage, setMapPage] = useState(1);
  const [mapSearch, setMapSearch] = useState('');
  const [includeInactive, setIncludeInactive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState({ open: false, editing: null });
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const fetchSummary = useCallback(async () => {
    const { data } = await api.get('/referrals/analytics/summary');
    setSummary(data.data);
  }, []);

  const fetchCodeAnalytics = useCallback(async () => {
    const { data } = await api.get('/referrals/analytics/codes');
    setCodeAnalytics(data.data);
  }, []);

  const fetchLeaderboard = useCallback(async () => {
    const { data } = await api.get('/referrals/leaderboard', { params: { unmappedAtBottom: true } });
    setLeaderboard(data.data);
  }, []);

  const fetchUnmapped = useCallback(async () => {
    const { data } = await api.get('/referrals/unmapped-codes');
    setUnmapped(data.data);
  }, []);

  const fetchMappings = useCallback(async () => {
    const { data } = await api.get('/referrals/mappings', {
      params: {
        page: mapPage,
        limit: 20,
        search: mapSearch.trim(),
        includeInactive: includeInactive ? 'true' : 'false',
      },
    });
    setMappings(data.data.items);
    setMapTotal(data.data.total);
  }, [mapPage, mapSearch, includeInactive]);

  const refreshAnalytics = useCallback(async () => {
    await Promise.all([fetchSummary(), fetchCodeAnalytics(), fetchLeaderboard(), fetchUnmapped()]);
  }, [fetchSummary, fetchCodeAnalytics, fetchLeaderboard, fetchUnmapped]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        await refreshAnalytics();
      } catch {
        if (!cancelled) toast.error('Failed to load referral data');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshAnalytics]);

  useEffect(() => {
    fetchMappings().catch(() => {});
  }, [mapPage, mapSearch, includeInactive, fetchMappings]);

  const openCreate = () => {
    setForm(emptyForm);
    setModal({ open: true, editing: null });
  };

  const openEdit = (m) => {
    setForm({
      referralCode: m.referralCode,
      caName: m.caName,
      caEmail: m.caEmail || '',
      caPhone: m.caPhone || '',
      notes: m.notes || '',
      isActive: m.isActive,
    });
    setModal({ open: true, editing: m });
  };

  const closeModal = () => {
    setModal({ open: false, editing: null });
    setForm(emptyForm);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (modal.editing) {
        await api.put(`/referrals/mappings/${modal.editing._id}`, form);
        toast.success('Mapping updated');
      } else {
        await api.post('/referrals/mappings', form);
        toast.success('Mapping created');
      }
      closeModal();
      await Promise.all([refreshAnalytics(), fetchMappings()]);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  if (loading && !summary) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h1 className="text-lg sm:text-2xl font-bold">Referral codes &amp; CA mapping</h1>
        <button type="button" onClick={openCreate} className="btn-primary inline-flex items-center gap-2 self-start">
          <HiOutlinePlus className="w-5 h-5" />
          Add mapping
        </button>
      </div>

      <p className="text-sm text-gray-500 mb-6 max-w-3xl">
        Counts come from participant registrations (<code className="text-xs bg-gray-100 px-1 rounded">referralCodeUsed</code>).
        Map each code to a campus ambassador so you can report and rank by person.
      </p>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-gray-200 mb-6">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === id ? 'border-primary-600 text-primary-700' : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            <Icon className="w-5 h-5" />
            {label}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="space-y-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Registrations with a code" value={summary?.totalRegistrationsWithReferral ?? '—'} />
            <StatCard label="Distinct codes used" value={summary?.distinctCodesUsed ?? '—'} />
            <StatCard label="Mapped (registrations)" value={summary?.registrationsMapped ?? '—'} accent="text-emerald-700" />
            <StatCard label="Unmapped (registrations)" value={summary?.registrationsUnmapped ?? '—'} accent="text-amber-700" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <StatCard label="Codes with active mapping" value={summary?.distinctMappedCodes ?? '—'} sub="Distinct normalized codes" />
            <StatCard label="Codes used but not mapped" value={summary?.distinctUnmappedCodes ?? '—'} sub="Needs admin mapping" />
          </div>

          <div>
            <h2 className="text-base font-semibold mb-3">Referrals by code</h2>
            <div className="card overflow-hidden p-0 overflow-x-auto">
              <table className="w-full text-sm min-w-[480px]">
                <thead>
                  <tr className="table-header">
                    <th className="px-4 py-3 text-left">Code</th>
                    <th className="px-4 py-3 text-left">CA / mapped name</th>
                    <th className="px-4 py-3 text-right">Count</th>
                  </tr>
                </thead>
                <tbody>
                  {codeAnalytics.slice(0, 15).map((row) => (
                    <tr key={row.normalizedReferralCode} className="border-t border-gray-100">
                      <td className="px-4 py-2.5 font-mono text-xs">{row.referralCode}</td>
                      <td className="px-4 py-2.5">
                        {row.caName ? (
                          <span>{row.caName}</span>
                        ) : (
                          <span className="text-amber-700">Unmapped</span>
                        )}
                        {row.mappingInactive && (
                          <span className="ml-2 text-xs text-gray-400">(inactive mapping)</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-right font-medium">{row.count}</td>
                    </tr>
                  ))}
                  {codeAnalytics.length === 0 && (
                    <tr>
                      <td colSpan={3} className="px-4 py-8 text-center text-gray-400">
                        No referral codes recorded on registrations yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {tab === 'mappings' && (
        <div>
          <div className="flex flex-col sm:flex-row gap-3 mb-4 flex-wrap">
            <div className="relative flex-1 min-w-[200px] max-w-md">
              <HiOutlineSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search by code or CA name…"
                value={mapSearch}
                onChange={(e) => {
                  setMapSearch(e.target.value);
                  setMapPage(1);
                }}
                className="input-field pl-10 w-full"
              />
            </div>
            <label className="inline-flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
              <input
                type="checkbox"
                checked={includeInactive}
                onChange={(e) => {
                  setIncludeInactive(e.target.checked);
                  setMapPage(1);
                }}
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              Show inactive
            </label>
          </div>

          <div className="card overflow-hidden p-0 overflow-x-auto">
            <table className="w-full text-sm min-w-[640px]">
              <thead>
                <tr className="table-header">
                  <th className="px-4 py-3 text-left">Code</th>
                  <th className="px-4 py-3 text-left">CA name</th>
                  <th className="px-4 py-3 text-left hidden md:table-cell">Contact</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-right w-24">Actions</th>
                </tr>
              </thead>
              <tbody>
                {mappings.map((m) => (
                  <tr key={m._id} className="border-t border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-2.5 font-mono text-xs">{m.referralCode}</td>
                    <td className="px-4 py-2.5 font-medium">{m.caName}</td>
                    <td className="px-4 py-2.5 text-gray-500 text-xs hidden md:table-cell">
                      {[m.caEmail, m.caPhone].filter(Boolean).join(' · ') || '—'}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={`badge ${m.isActive ? 'badge-green' : 'badge-yellow'}`}>{m.isActive ? 'Active' : 'Inactive'}</span>
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <button type="button" onClick={() => openEdit(m)} className="text-primary-600 hover:text-primary-800 p-1" title="Edit">
                        <HiOutlinePencil className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                ))}
                {mappings.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-gray-400">
                      No mappings yet. Use &quot;Add mapping&quot; or import from your CA list.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {mapTotal > 20 && (
            <div className="flex justify-center gap-2 mt-4">
              <button
                type="button"
                disabled={mapPage <= 1}
                onClick={() => setMapPage((p) => Math.max(1, p - 1))}
                className="btn-secondary text-sm disabled:opacity-40"
              >
                Previous
              </button>
              <span className="text-sm text-gray-500 py-2">Page {mapPage}</span>
              <button
                type="button"
                disabled={mapPage * 20 >= mapTotal}
                onClick={() => setMapPage((p) => p + 1)}
                className="btn-secondary text-sm disabled:opacity-40"
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}

      {tab === 'unmapped' && (
        <div>
          <p className="text-sm text-gray-600 mb-4">
            These codes appear on registrations but have no <strong>active</strong> CA mapping. Add a mapping to attach a name for reporting.
          </p>
          <div className="card overflow-hidden p-0 overflow-x-auto">
            <table className="w-full text-sm min-w-[400px]">
              <thead>
                <tr className="table-header">
                  <th className="px-4 py-3 text-left">Code (as stored)</th>
                  <th className="px-4 py-3 text-right">Registrations</th>
                  <th className="px-4 py-3 text-right w-36">Action</th>
                </tr>
              </thead>
              <tbody>
                {unmapped.map((u) => (
                  <tr key={u.normalizedReferralCode} className="border-t border-gray-100">
                    <td className="px-4 py-2.5 font-mono text-xs">{u.referralCodeDisplay}</td>
                    <td className="px-4 py-2.5 text-right font-medium">{u.count}</td>
                    <td className="px-4 py-2.5 text-right">
                      <button
                        type="button"
                        className="text-sm text-primary-600 hover:underline"
                        onClick={() => {
                          setForm({ ...emptyForm, referralCode: u.referralCodeDisplay });
                          setModal({ open: true, editing: null });
                        }}
                      >
                        Map now
                      </button>
                    </td>
                  </tr>
                ))}
                {unmapped.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-4 py-10 text-center text-gray-400">
                      All used codes are mapped, or no referral data yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'leaderboard' && (
        <div>
          <p className="text-sm text-gray-600 mb-4">
            Sorted by referral count. Mapped rows appear first; unmapped codes follow (same sort by count within each group).
          </p>
          <div className="card overflow-hidden p-0 overflow-x-auto">
            <table className="w-full text-sm min-w-[520px]">
              <thead>
                <tr className="table-header">
                  <th className="px-4 py-3 w-14 text-left">Rank</th>
                  <th className="px-4 py-3 text-left">CA name</th>
                  <th className="px-4 py-3 text-left">Code</th>
                  <th className="px-4 py-3 text-right">Referrals</th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.map((row) => (
                  <tr key={row.normalizedReferralCode} className="border-t border-gray-100">
                    <td className="px-4 py-2.5 text-gray-500">{row.rank}</td>
                    <td className="px-4 py-2.5">
                      {row.caName ? (
                        row.caName
                      ) : (
                        <span className="text-amber-700">Unmapped</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 font-mono text-xs">{row.referralCode}</td>
                    <td className="px-4 py-2.5 text-right font-semibold">{row.count}</td>
                  </tr>
                ))}
                {leaderboard.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-10 text-center text-gray-400">
                      No referral activity yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal */}
      {modal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={closeModal}>
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <h2 className="text-lg font-bold">{modal.editing ? 'Edit mapping' : 'New referral mapping'}</h2>

              <div>
                <label className="label">Referral code</label>
                <input
                  className="input-field w-full font-mono"
                  value={form.referralCode}
                  onChange={(e) => setForm((f) => ({ ...f, referralCode: e.target.value }))}
                  required
                  placeholder="e.g. CA123"
                />
                <p className="text-xs text-gray-400 mt-1">Matching is case-insensitive; spaces are trimmed.</p>
              </div>

              <div>
                <label className="label">CA / display name</label>
                <input
                  className="input-field w-full"
                  value={form.caName}
                  onChange={(e) => setForm((f) => ({ ...f, caName: e.target.value }))}
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="label">Email (optional)</label>
                  <input
                    type="email"
                    className="input-field w-full"
                    value={form.caEmail}
                    onChange={(e) => setForm((f) => ({ ...f, caEmail: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="label">Phone (optional)</label>
                  <input className="input-field w-full" value={form.caPhone} onChange={(e) => setForm((f) => ({ ...f, caPhone: e.target.value }))} />
                </div>
              </div>

              <div>
                <label className="label">Notes (optional)</label>
                <textarea className="input-field w-full min-h-[80px]" value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
              </div>

              <label className="inline-flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
                  className="rounded border-gray-300 text-primary-600"
                />
                Active (inactive mappings do not resolve a CA for analytics)
              </label>

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" className="btn-secondary" onClick={closeModal}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={saving}>
                  {saving ? 'Saving…' : modal.editing ? 'Save changes' : 'Create mapping'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, sub, accent }) {
  return (
    <div className="card p-4">
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${accent || 'text-gray-900'}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}
