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
  HiOutlineBriefcase,
  HiOutlineAcademicCap,
  HiOutlinePhone,
  HiOutlineMail,
  HiOutlineRefresh,
  HiOutlineChevronRight,
  HiOutlineLightningBolt,
  HiOutlineIdentification,
} from 'react-icons/hi';

const ENGAGEMENT_ROLES = ['Guest', 'Judge', 'Speaker', 'Donor', 'Sponsor'];

const ROLE_CONFIG = {
  Guest: { label: 'Guest', color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20' },
  Judge: { label: 'Judge', color: 'text-violet-400', bg: 'bg-violet-500/10 border-violet-500/20' },
  Speaker: { label: 'Speaker', color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
  Donor: { label: 'Donor', color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
  Sponsor: { label: 'Sponsor', color: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/20' },
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
    <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/[0.05] hover:border-white/[0.1] transition-all">
      <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-5 border-b border-white/[0.05] pb-3">{title}</h4>
      {typeof data !== 'object' || Array.isArray(data) ? (
        <p className="text-sm text-slate-300 whitespace-pre-wrap break-words font-medium leading-relaxed">{String(data)}</p>
      ) : (
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-y-6 gap-x-8 text-sm">
          {Object.entries(data).map(([k, v]) => (
            <div key={k} className="sm:col-span-2">
              <dt className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-1">{k.replace(/([A-Z])/g, ' $1').trim()}</dt>
              <dd className="text-sm font-bold text-slate-200 break-words">
                {v != null && typeof v === 'object' ? (
                  <pre className="text-[10px] font-mono bg-slate-950/80 border border-slate-800 rounded-xl p-4 overflow-x-auto mt-2 text-primary-400">
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
      toast.error('Failed to synchronize alumni registry');
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
        toast.success(data.message || 'Priority protocol shifted');
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Update failure');
    }
  };

  const openDetail = async (id) => {
    setDetailLoading(true);
    setDetail(null);
    try {
      const { data } = await api.get(`/admin/alumni/${id}`);
      if (data.success) setDetail(data.data);
    } catch {
      toast.error('Failed to extract detail nodes');
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
        a.download = 'alumni-registry.csv';
        a.click();
        URL.revokeObjectURL(a.href);
        toast.success('Registry export initiated');
      })
      .catch(() => toast.error('Export protocol failed'));
  };

  return (
    <div className="flex flex-col lg:flex-row gap-10 animate-fade-in items-start">
      {/* Filters navigation */}
      <aside
        className={`lg:w-80 flex-shrink-0 space-y-6 transition-all duration-500 lg:sticky lg:top-8 ${filtersOpen ? '' : 'hidden lg:block opacity-40'}`}
      >
        <div className="card space-y-8 bg-slate-900/40 backdrop-blur-xl border-slate-700/30 shadow-2xl">
          <div className="flex items-center justify-between border-b border-white/[0.05] pb-5">
            <span className="text-[11px] font-black text-white uppercase tracking-[0.3em] flex items-center gap-3">
              <HiOutlineFilter className="w-5 h-5 text-primary-500" /> Operational Matrix
            </span>
            <button type="button" onClick={() => setFiltersOpen(false)} className="lg:hidden text-slate-500 hover:text-white transition-all transform active:scale-95">
              <HiOutlineX className="w-6 h-6" />
            </button>
          </div>

          <div className="space-y-4">
            <label className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] block px-1">Branch Constraint</label>
            <div className="flex flex-col gap-3">
              <div className="relative group">
                <HiOutlineSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-primary-500 transition-colors w-4 h-4" />
                <input
                  type="text"
                  value={branchInput}
                  onChange={(e) => setBranchInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && applyBranchFilter()}
                  placeholder="e.g. IT, CP, ME"
                  className="input-field pl-12 text-[10px] font-black uppercase tracking-widest py-3.5"
                />
              </div>
              <button type="button" onClick={applyBranchFilter} className="btn-primary group py-3 text-[10px] font-black uppercase tracking-widest shadow-xl shadow-primary-900/20 active:scale-95">
                Apply Vector
              </button>
            </div>
          </div>

          <div className="space-y-5">
            <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] block px-1">Role Attributions</p>
            <div className="space-y-3.5">
              {ENGAGEMENT_ROLES.map((role) => (
                <label key={role} className="flex items-center gap-4 text-[10px] font-black text-slate-400 hover:text-white transition-all cursor-pointer group select-none">
                  <div className="relative flex items-center justify-center">
                    <input
                      type="checkbox"
                      checked={selectedRoles.includes(role)}
                      onChange={() => toggleRole(role)}
                      className="w-5 h-5 rounded-lg border-slate-700 bg-slate-950 text-primary-600 focus:ring-primary-500/20 cursor-pointer transition-all"
                    />
                  </div>
                  <span className="uppercase tracking-widest group-hover:translate-x-1 transition-transform duration-300">{role}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="pt-4">
             <button type="button" onClick={clearFilters} className="w-full py-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.05] hover:border-white/[0.1] text-[10px] font-black text-slate-500 hover:text-white uppercase tracking-[0.2em] transition-all active:scale-95 shadow-xl">
               Reset System Matrix
             </button>
          </div>
        </div>
      </aside>

      <div className="flex-1 min-w-0 space-y-10">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-8">
          <div>
            <h1 className="text-4xl font-black text-white tracking-tighter uppercase mb-2">Legacy Registry</h1>
            <p className="text-slate-500 font-medium">Full nodal management of high-value alumni engagement and strategic assets</p>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <button
              type="button"
              className={`lg:hidden w-12 h-12 flex items-center justify-center rounded-2xl bg-slate-900/40 border transition-all ${filtersOpen ? 'bg-primary-500/10 text-primary-400 border-primary-500/20 shadow-lg' : 'text-slate-500 border-slate-800'}`}
              onClick={() => setFiltersOpen(!filtersOpen)}
            >
              <HiOutlineFilter className="w-6 h-6" />
            </button>
            <button onClick={exportCsv} className="btn-primary group flex items-center gap-3 px-8 py-3.5 text-[11px] font-black uppercase tracking-[0.2em] shadow-2xl shadow-primary-900/40 active:scale-95">
              <HiOutlineDownload className="w-5 h-5 group-hover:-translate-y-1 transition-transform" /> 
              <span>Export Manifest</span>
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-40 gap-6">
             <HiOutlineRefresh className="w-12 h-12 text-primary-500 animate-spin" />
             <p className="text-[11px] font-black text-slate-600 uppercase tracking-[0.4em] animate-pulse">Syncing Nodal Registers...</p>
          </div>
        ) : (
          <div className="card !p-0 overflow-hidden border-slate-700/30 shadow-2xl bg-slate-900/20 backdrop-blur-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-white/[0.01]">
                    <th className="px-8 py-6 w-20 text-center text-[10px] font-black text-slate-600 uppercase tracking-[0.2em]">Prio</th>
                    <th className="px-8 py-6 text-[10px] font-black text-slate-600 uppercase tracking-[0.2em]">Identity Profile</th>
                    <th className="px-8 py-6 text-[10px] font-black text-slate-600 uppercase tracking-[0.2em]">Vector (BN)</th>
                    <th className="px-8 py-6 text-[10px] font-black text-slate-600 uppercase tracking-[0.2em]">Era</th>
                    <th className="px-8 py-6 text-[10px] font-black text-slate-600 uppercase tracking-[0.2em]">Engagement Roles</th>
                    <th className="px-8 py-6 text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] text-right">Synchronization</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.02]">
                  {submissions.map((row) => (
                    <tr
                      key={row._id}
                      className="group hover:bg-white/[0.02] cursor-pointer transition-all duration-300"
                      onClick={() => openDetail(row._id)}
                    >
                      <td className="px-8 py-6 text-center" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={(e) => togglePriority(row._id, e)}
                          className={`w-10 h-10 rounded-xl transition-all flex items-center justify-center ${row.priority ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30 shadow-xl shadow-amber-900/20 scale-110' : 'bg-slate-900 border border-slate-800 text-slate-700 hover:text-white hover:border-slate-600'}`}
                          title="Priority Protocol"
                        >
                          {row.priority ? <HiStar className="w-6 h-6" /> : <HiOutlineStar className="w-6 h-6" />}
                        </button>
                      </td>
                      <td className="px-8 py-6">
                         <p className="text-sm font-black text-white group-hover:text-primary-400 transition-colors uppercase tracking-tight leading-none mb-2">{row.name}</p>
                         <div className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-primary-500"></span>
                            <span className="text-[9px] text-slate-600 font-bold tracking-widest uppercase">ID: {row._id.slice(-10)}</span>
                         </div>
                      </td>
                      <td className="px-8 py-6 text-[11px] font-black text-slate-400 uppercase tracking-widest">{row.branch || '—'}</td>
                      <td className="px-8 py-6">
                         <span className="px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-[10px] font-black text-white shadow-xl">
                            {row.yearOfPassing ?? '—'}
                         </span>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex flex-wrap gap-2 max-w-[200px]">
                          {(row.engagementRoles || []).map((r) => {
                             const cfg = ROLE_CONFIG[r] || { label: r, color: 'text-slate-400', bg: 'bg-slate-800' };
                             return (
                              <span key={r} className={`px-2.5 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest border ${cfg.bg} ${cfg.color}`}>
                                {cfg.label}
                              </span>
                            );
                          })}
                          {(!row.engagementRoles || row.engagementRoles.length === 0) && (
                            <span className="text-slate-800 text-[10px] font-black tracking-widest uppercase italic opacity-40">Zero_Roles</span>
                          )}
                        </div>
                      </td>
                      <td className="px-8 py-6 text-right">
                        <div className="flex flex-col items-end gap-2">
                           <button className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 text-slate-500 group-hover:text-white group-hover:border-primary-500/30 transition-all flex items-center justify-center shadow-xl">
                              <HiOutlineChevronRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
                           </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {submissions.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-8 py-40 text-center">
                         <div className="w-20 h-20 rounded-[2.5rem] bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-700 mx-auto mb-6">
                            <HiOutlineSearch className="w-10 h-10" />
                         </div>
                         <h4 className="text-[11px] font-black text-slate-500 uppercase tracking-[0.4em]">Zero alignment return</h4>
                         <p className="text-[10px] text-slate-700 font-bold mt-2 uppercase">Adjust system matrix filters to detect alumni nodes</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-4 py-8 bg-white/[0.01] border-t border-white/[0.05] shadow-xl">
                {[...Array(totalPages)].map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setPage(i + 1)}
                    className={`w-11 h-11 rounded-2xl text-[10px] font-black tracking-tighter transition-all ${page === i + 1 ? 'bg-primary-500 text-white shadow-2xl shadow-primary-900/50 scale-110 z-10' : 'bg-slate-900 text-slate-500 hover:text-white border border-slate-800 hover:border-slate-600'}`}
                  >
                    {(i + 1).toString().padStart(2, '0')}
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
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in"
          onClick={() => { setDetail(null); setDetailLoading(false); }}
        >
          <div
            className="card w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col border-slate-700/50 shadow-2xl relative bg-slate-900/60"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary-600/5 blur-[150px] pointer-events-none"></div>
            
            <div className="sticky top-0 z-20 bg-slate-900/60 backdrop-blur-2xl border-b border-white/[0.05] px-8 py-6 flex items-center justify-between">
              <div className="flex items-center gap-4">
                 <div className="w-1.5 h-8 bg-primary-500 rounded-full shadow-lg shadow-primary-900/40"></div>
                 <div>
                   <h2 className="text-2xl font-black text-white uppercase tracking-tighter leading-none">Identity Insight</h2>
                   <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.3em] mt-2">Deep Nodal Parameter Access</p>
                 </div>
              </div>
              <button
                onClick={() => { setDetail(null); setDetailLoading(false); }}
                className="w-12 h-12 rounded-2xl bg-white/[0.02] border border-white/[0.05] text-slate-500 hover:text-white hover:bg-red-500/10 hover:border-red-500/20 transition-all flex items-center justify-center shadow-xl transform active:scale-95"
              >
                <HiOutlineX className="w-6 h-6" />
              </button>
            </div>

            <div className="p-8 space-y-10 overflow-y-auto relative z-10 custom-scrollbar">
              {detailLoading && (
                 <div className="flex flex-col items-center justify-center py-32 gap-6">
                   <HiOutlineRefresh className="w-12 h-12 text-primary-500 animate-spin" />
                   <p className="text-[11px] font-black text-slate-600 uppercase tracking-[0.4em] animate-pulse">Initializing Brain-Scan...</p>
                 </div>
              )}
              {!detailLoading && detail && (
                <>
                  <div className="flex flex-wrap items-center justify-between gap-10 p-8 rounded-[2.5rem] bg-gradient-to-br from-primary-500/[0.05] to-primary-600/[0.02] border border-primary-500/20 shadow-2xl relative group">
                    <div className="absolute top-0 right-0 w-40 h-40 bg-primary-500/10 blur-[80px] pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
                    <div className="flex items-center gap-8">
                       <div className="w-24 h-24 rounded-[2.5rem] bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-white shadow-2xl shadow-primary-900/50 relative transform rotate-6 group-hover:rotate-0 transition-transform duration-700">
                          <HiOutlineAcademicCap className="w-12 h-12" />
                          {detail.priority && (
                             <div className="absolute -top-2 -right-2 bg-amber-500 p-2 rounded-2xl shadow-2xl border border-white/20 animate-pulse">
                                <HiStar className="w-5 h-5 text-white" />
                             </div>
                          )}
                       </div>
                       <div>
                         <h3 className="text-3xl font-black text-white uppercase tracking-tighter leading-tight mb-3">{detail.name}</h3>
                         <div className="flex flex-wrap gap-2.5">
                            {(detail.engagementRoles || []).map((r) => {
                               const cfg = ROLE_CONFIG[r] || { label: r, color: 'text-slate-400', bg: 'bg-slate-800' };
                               return (
                                <span key={r} className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${cfg.bg} ${cfg.color} shadow-lg shadow-black/20`}>
                                  {cfg.label}
                                </span>
                              );
                            })}
                         </div>
                       </div>
                    </div>
                    <button 
                       onClick={() => togglePriority(detail._id)}
                       className={`flex items-center gap-2 group px-7 py-3.5 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all shadow-2xl active:scale-95 ${detail.priority ? 'bg-amber-500 text-white shadow-amber-900/40' : 'bg-slate-900 border border-slate-700 text-slate-500 hover:text-white'}`}
                    >
                       <HiOutlineLightningBolt className={`w-5 h-5 ${detail.priority ? 'animate-pulse' : ''}`} />
                       {detail.priority ? 'High Yield node' : 'Elevate Protocol'}
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="p-6 rounded-3xl bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.04] transition-all group">
                       <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] mb-3 flex items-center gap-2">
                          <HiOutlineMail className="w-4 h-4 text-primary-500" /> Interaction Portal
                       </p>
                       <p className="text-base font-bold text-white tracking-tight">{detail.email || 'SYSTEM_NODE_ANON'}</p>
                    </div>
                    <div className="p-6 rounded-3xl bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.04] transition-all group">
                       <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] mb-3 flex items-center gap-2">
                          <HiOutlinePhone className="w-4 h-4 text-emerald-500" /> Voice Proxy
                       </p>
                       <p className="text-base font-bold text-white tracking-tight">{detail.contactNumber || 'LINK_SEVERED'}</p>
                    </div>
                    <div className="p-6 rounded-3xl bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.04] transition-all group">
                       <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] mb-3 flex items-center gap-2">
                          <HiOutlineIdentification className="w-4 h-4 text-violet-500" /> Vector Deployment
                       </p>
                       <p className="text-base font-black text-white uppercase tracking-tighter">{detail.branch || 'ORPHAN_BN'}</p>
                    </div>
                    <div className="p-6 rounded-3xl bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.04] transition-all group">
                       <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] mb-3 flex items-center gap-2">
                          <HiOutlineRefresh className="w-4 h-4 text-amber-500 rotate-45" /> Graduation Sync
                       </p>
                       <p className="text-base font-black text-white tracking-tighter">{detail.yearOfPassing ?? 'ERA_UNDEFINED'}</p>
                    </div>
                  </div>

                  <div className="space-y-6 pt-6 border-t border-white/[0.05]">
                    <div className="flex items-center gap-4">
                       <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-primary-500 shadow-xl">
                          <HiOutlineBriefcase className="w-6 h-6" />
                       </div>
                       <div>
                          <h4 className="text-[11px] font-black text-white uppercase tracking-[0.3em]">Professional Connection</h4>
                          <p className="text-[9px] text-slate-600 font-bold uppercase tracking-widest mt-1">Economic sector attribution</p>
                       </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                       <div className="p-7 rounded-[2.5rem] bg-white/[0.02] border border-white/[0.05] sm:col-span-2 group">
                          <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] mb-3">Host Entity / Organization</p>
                          <p className="text-2xl font-black text-white tracking-tighter uppercase group-hover:text-primary-400 transition-colors">{detail.companyName || 'INDEPENDENT_STRUCTURE'}</p>
                       </div>
                       <div className="p-6 rounded-3xl bg-white/[0.02] border border-white/[0.05]">
                          <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] mb-3">Operating Designation</p>
                          <p className="text-base font-bold text-slate-300 uppercase tracking-tight">{detail.designation || 'NODAL_AGENT_LEVEL_0'}</p>
                       </div>
                       <div className="p-6 rounded-3xl bg-white/[0.02] border border-white/[0.05]">
                          <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] mb-3">Certification Level</p>
                          <p className="text-base font-black text-slate-300 uppercase tracking-[0.2em] leading-none">{detail.qualification || 'NULL_DATA'}</p>
                       </div>
                    </div>
                  </div>

                  <div className="space-y-8 pt-8 border-t border-white/[0.05]">
                    {Object.keys(ROLE_CONFIG).map((role) => {
                      const key = `${role.toLowerCase()}Details`;
                      if ((detail.engagementRoles || []).includes(role)) {
                        return <DetailSection key={role} title={`${role} Protocol Parameters`} data={detail[key]} />;
                      }
                      return null;
                    })}
                  </div>

                  <div className="flex flex-col sm:flex-row justify-between items-center py-10 px-4 rounded-3xl bg-slate-900/40 border border-white/[0.02] text-[10px] font-black text-slate-700 uppercase tracking-[0.3em] gap-4">
                     <span className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-slate-800"></span> LOG_ATTR: {fmtDT(detail.submittedAt)}</span>
                     <span className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-slate-800"></span> GRID_COORD: {detail._id}</span>
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
