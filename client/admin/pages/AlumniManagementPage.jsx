import { useState, useEffect, useCallback, useMemo } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import {
  HiOutlineSearch,
  HiOutlineStar,
  HiStar,
  HiOutlineDownload,
  HiOutlineX,
  HiOutlineFilter,
} from 'react-icons/hi';

const ENGAGEMENT_ROLES = ['Guest', 'Judge', 'Speaker', 'Donor', 'Sponsor'];

const ROLE_BADGE = {
  Guest: 'badge badge-blue',
  Judge: 'badge bg-violet-100 text-violet-800',
  Speaker: 'badge badge-green',
  Donor: 'badge badge-yellow',
  Sponsor: 'badge bg-orange-100 text-orange-800',
};

const fmtDT = (d) =>
  d
    ? new Date(d).toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '—';

function DetailSection({ title, data }) {
  if (data == null || (typeof data === 'object' && Object.keys(data).length === 0)) return null;
  return (
    <div className="border border-gray-100 rounded-xl p-4 bg-gray-50/80">
      <h4 className="text-sm font-semibold text-gray-800 mb-3">{title}</h4>
      {typeof data !== 'object' || Array.isArray(data) ? (
        <p className="text-sm text-gray-700 whitespace-pre-wrap break-words">{String(data)}</p>
      ) : (
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
          {Object.entries(data).map(([k, v]) => (
            <div key={k} className="sm:col-span-2">
              <dt className="text-gray-500 text-xs uppercase tracking-wide">{k.replace(/([A-Z])/g, ' $1').trim()}</dt>
              <dd className="text-gray-900 mt-0.5 break-words">
                {v != null && typeof v === 'object' ? (
                  <pre className="text-xs bg-white border border-gray-100 rounded-lg p-2 overflow-x-auto mt-1">
                    {JSON.stringify(v, null, 2)}
                  </pre>
                ) : (
                  String(v ?? '—')
                )}
              </dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}

export default function AlumniManagementPage() {
  const [submissions, setSubmissions] = useState([]);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [branchFilter, setBranchFilter] = useState('');
  const [branchInput, setBranchInput] = useState('');
  const [selectedRoles, setSelectedRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(true);

  const engagementRolesParam = useMemo(
    () => (selectedRoles.length ? selectedRoles.join(',') : undefined),
    [selectedRoles]
  );

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 15, order: 'desc' };
      if (branchFilter.trim()) params.branch = branchFilter.trim();
      if (engagementRolesParam) params.engagementRoles = engagementRolesParam;
      const { data } = await api.get('/admin/alumni', { params });
      if (!data.success || !data.data) {
        setSubmissions([]);
        setTotalPages(1);
        return;
      }
      setSubmissions(data.data.submissions || []);
      setTotalPages(data.data.pages || 1);
    } catch {
      toast.error('Failed to load alumni submissions');
      setSubmissions([]);
    } finally {
      setLoading(false);
    }
  }, [page, branchFilter, engagementRolesParam]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  const applyBranchFilter = () => {
    setPage(1);
    setBranchFilter(branchInput);
  };

  const toggleRole = (role) => {
    setPage(1);
    setSelectedRoles((prev) => (prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]));
  };

  const clearFilters = () => {
    setBranchInput('');
    setBranchFilter('');
    setSelectedRoles([]);
    setPage(1);
  };

  const togglePriority = async (id, e) => {
    e?.stopPropagation();
    try {
      const { data } = await api.patch(`/admin/alumni/${id}/priority`, {});
      if (data.success && data.data) {
        setSubmissions((rows) =>
          rows.map((r) => (r._id === id ? { ...r, priority: data.data.priority } : r))
        );
        setDetail((d) => (d && d._id === id ? { ...d, priority: data.data.priority } : d));
        toast.success(data.message || 'Priority updated');
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Could not update priority');
    }
  };

  const openDetail = async (id) => {
    setDetailLoading(true);
    setDetail(null);
    try {
      const { data } = await api.get(`/admin/alumni/${id}`);
      if (data.success) setDetail(data.data);
    } catch {
      toast.error('Failed to load details');
    } finally {
      setDetailLoading(false);
    }
  };

  const exportCsv = () => {
    const params = new URLSearchParams();
    if (branchFilter.trim()) params.set('branch', branchFilter.trim());
    if (engagementRolesParam) params.set('engagementRoles', engagementRolesParam);
    const q = params.toString();
    const base = import.meta.env.VITE_API_URL || '/api';
    const url = `${base}/admin/alumni/export${q ? `?${q}` : ''}`;
    const token = localStorage.getItem('accessToken');
    fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
      .then((res) => {
        if (!res.ok) throw new Error('Export failed');
        return res.blob();
      })
      .then((blob) => {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'alumni-submissions.csv';
        a.click();
        URL.revokeObjectURL(a.href);
        toast.success('Download started');
      })
      .catch(() => toast.error('Export failed'));
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      {/* Filters sidebar */}
      <aside
        className={`lg:w-64 flex-shrink-0 space-y-4 ${filtersOpen ? '' : 'hidden lg:block'}`}
      >
        <div className="card p-4 space-y-4">
          <div className="flex items-center justify-between lg:hidden">
            <span className="font-semibold text-gray-900 flex items-center gap-2">
              <HiOutlineFilter className="w-5 h-5" /> Filters
            </span>
            <button type="button" onClick={() => setFiltersOpen(false)} className="text-gray-500">
              <HiOutlineX className="w-5 h-5" />
            </button>
          </div>
          <div>
            <label className="label text-xs">Branch contains</label>
            <div className="flex gap-2 mt-1">
              <div className="relative flex-1">
                <HiOutlineSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  value={branchInput}
                  onChange={(e) => setBranchInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && applyBranchFilter()}
                  placeholder="e.g. IT, CP"
                  className="input-field pl-8 text-sm py-2"
                />
              </div>
              <button type="button" onClick={applyBranchFilter} className="btn-secondary text-sm px-3 py-2">
                Apply
              </button>
            </div>
          </div>
          <div>
            <p className="label text-xs mb-2">Engagement roles</p>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {ENGAGEMENT_ROLES.map((role) => (
                <label key={role} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedRoles.includes(role)}
                    onChange={() => toggleRole(role)}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  {role}
                </label>
              ))}
            </div>
          </div>
          <button type="button" onClick={clearFilters} className="btn-outline w-full text-sm py-2">
            Clear filters
          </button>
        </div>
      </aside>

      <div className="flex-1 min-w-0">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
          <div>
            <h1 className="text-lg sm:text-2xl font-bold text-gray-900">Alumni management</h1>
            <p className="text-sm text-gray-500 mt-1">Lakshya 2026 — submissions and engagement roles</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              className="lg:hidden btn-outline text-sm flex items-center gap-2"
              onClick={() => setFiltersOpen(true)}
            >
              <HiOutlineFilter className="w-4 h-4" />
              Filters
            </button>
            <button type="button" onClick={exportCsv} className="btn-secondary text-sm flex items-center gap-2">
              <HiOutlineDownload className="w-4 h-4" />
              Export CSV
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-16 text-gray-400">Loading…</div>
        ) : (
          <div className="card overflow-hidden p-0 overflow-x-auto">
            <table className="w-full text-sm min-w-[720px]">
              <thead>
                <tr className="table-header">
                  <th className="px-4 py-3 w-12 text-center">★</th>
                  <th className="px-4 py-3 text-left">Name</th>
                  <th className="px-4 py-3 text-left">Branch</th>
                  <th className="px-4 py-3 text-left">Year</th>
                  <th className="px-4 py-3 text-left">Roles</th>
                  <th className="px-4 py-3 text-left hidden md:table-cell">Submitted</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {submissions.map((row) => (
                  <tr
                    key={row._id}
                    className="border-t border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => openDetail(row._id)}
                  >
                    <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={(e) => togglePriority(row._id, e)}
                        className="p-1 rounded-lg hover:bg-amber-50 text-amber-500"
                        title={row.priority ? 'Remove priority' : 'Mark priority'}
                      >
                        {row.priority ? <HiStar className="w-6 h-6" /> : <HiOutlineStar className="w-6 h-6 text-gray-400" />}
                      </button>
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-900">{row.name}</td>
                    <td className="px-4 py-3 text-gray-600">{row.branch || '—'}</td>
                    <td className="px-4 py-3 text-gray-600">{row.yearOfPassing ?? '—'}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {(row.engagementRoles || []).map((r) => (
                          <span key={r} className={`text-xs ${ROLE_BADGE[r] || 'badge bg-gray-100 text-gray-700'}`}>
                            {r}
                          </span>
                        ))}
                        {(!row.engagementRoles || row.engagementRoles.length === 0) && (
                          <span className="text-gray-400">—</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs hidden md:table-cell whitespace-nowrap">
                      {fmtDT(row.submittedAt)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button type="button" className="text-primary-600 hover:text-primary-800 text-sm font-medium">
                        View
                      </button>
                    </td>
                  </tr>
                ))}
                {submissions.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-gray-400">
                      No submissions match your filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            {totalPages > 1 && (
              <div className="flex flex-wrap justify-center gap-2 py-4 border-t border-gray-100">
                {Array.from({ length: totalPages }, (_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setPage(i + 1)}
                    className={`w-8 h-8 rounded-lg text-sm font-medium ${
                      page === i + 1 ? 'bg-primary-600 text-white' : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Detail modal */}
      {(detail || detailLoading) && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
          onClick={() => { setDetail(null); setDetailLoading(false); }}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white border-b border-gray-100 px-5 py-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">Alumni details</h2>
              <button
                type="button"
                onClick={() => { setDetail(null); setDetailLoading(false); }}
                className="p-2 rounded-lg hover:bg-gray-100 text-gray-500"
              >
                <HiOutlineX className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              {detailLoading && <p className="text-gray-500 text-sm">Loading…</p>}
              {!detailLoading && detail && (
                <>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-xl font-semibold text-gray-900">{detail.name}</h3>
                    {detail.priority && (
                      <span className="badge badge-yellow text-xs">Priority</span>
                    )}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                    <p>
                      <span className="text-gray-500">Email</span>
                      <br />
                      <span className="text-gray-900">{detail.email || '—'}</span>
                    </p>
                    <p>
                      <span className="text-gray-500">Phone</span>
                      <br />
                      <span className="text-gray-900">{detail.contactNumber || '—'}</span>
                    </p>
                    <p>
                      <span className="text-gray-500">Branch</span>
                      <br />
                      <span className="text-gray-900">{detail.branch || '—'}</span>
                    </p>
                    <p>
                      <span className="text-gray-500">Year of passing</span>
                      <br />
                      <span className="text-gray-900">{detail.yearOfPassing ?? '—'}</span>
                    </p>
                    <p>
                      <span className="text-gray-500">Qualification</span>
                      <br />
                      <span className="text-gray-900">{detail.qualification || '—'}</span>
                    </p>
                    <p>
                      <span className="text-gray-500">Submitted</span>
                      <br />
                      <span className="text-gray-900">{fmtDT(detail.submittedAt)}</span>
                    </p>
                    <p className="sm:col-span-2">
                      <span className="text-gray-500">Company</span>
                      <br />
                      <span className="text-gray-900">{detail.companyName || '—'}</span>
                    </p>
                    <p className="sm:col-span-2">
                      <span className="text-gray-500">Designation</span>
                      <br />
                      <span className="text-gray-900">{detail.designation || '—'}</span>
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs uppercase tracking-wide mb-2">Engagement roles</p>
                    <div className="flex flex-wrap gap-1">
                      {(detail.engagementRoles || []).map((r) => (
                        <span key={r} className={ROLE_BADGE[r] || 'badge bg-gray-100 text-gray-700'}>
                          {r}
                        </span>
                      ))}
                    </div>
                  </div>
                  {(detail.engagementRoles || []).includes('Guest') && (
                    <DetailSection title="Guest details" data={detail.guestDetails} />
                  )}
                  {(detail.engagementRoles || []).includes('Judge') && (
                    <DetailSection title="Judge details" data={detail.judgeDetails} />
                  )}
                  {(detail.engagementRoles || []).includes('Speaker') && (
                    <DetailSection title="Speaker details" data={detail.speakerDetails} />
                  )}
                  {(detail.engagementRoles || []).includes('Donor') && (
                    <DetailSection title="Donor details" data={detail.donorDetails} />
                  )}
                  {(detail.engagementRoles || []).includes('Sponsor') && (
                    <DetailSection title="Sponsor details" data={detail.sponsorDetails} />
                  )}
                  <div className="flex justify-end pt-2">
                    <button
                      type="button"
                      onClick={() => togglePriority(detail._id)}
                      className="btn-outline text-sm flex items-center gap-2"
                    >
                      {detail.priority ? <HiStar className="w-5 h-5 text-amber-500" /> : <HiOutlineStar className="w-5 h-5" />}
                      {detail.priority ? 'Remove priority' : 'Mark priority'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
