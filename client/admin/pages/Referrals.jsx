import { useState, useEffect, useCallback } from 'react';
import api from '../../src/services/api';
import toast from 'react-hot-toast';
import {
  HiOutlineSearch,
  HiOutlinePlus,
  HiOutlinePencil,
  HiOutlineChartBar,
  HiOutlineCollection,
  HiOutlineExclamation,
  HiOutlineClipboardList,
  HiOutlineFilter,
  HiOutlineRefresh,
  HiOutlineTrendingUp,
} from 'react-icons/hi';
import { useAuth } from '../context/AuthContext';

const TABS = [
  { id: 'overview', label: 'Overview', icon: HiOutlineChartBar },
  { id: 'mappings', label: 'All Codes', icon: HiOutlineCollection },
  { id: 'unmapped', label: 'Unknown Codes', icon: HiOutlineExclamation },
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
  const { user } = useAuth();
  const isSuperadmin = user?.role === 'superadmin';
  const visibleTabs = isSuperadmin ? TABS : [TABS[0]];
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
    if (isSuperadmin) {
      await Promise.all([fetchSummary(), fetchCodeAnalytics(), fetchLeaderboard(), fetchUnmapped()]);
      return;
    }
    await Promise.all([fetchSummary(), fetchCodeAnalytics()]);
  }, [isSuperadmin, fetchSummary, fetchCodeAnalytics, fetchLeaderboard, fetchUnmapped]);

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
    return () => { cancelled = true; };
  }, [refreshAnalytics]);

  useEffect(() => {
    if (!isSuperadmin) return;
    fetchMappings().catch(() => {});
  }, [isSuperadmin, mapPage, mapSearch, includeInactive, fetchMappings]);

  useEffect(() => {
    if (!isSuperadmin) setTab('overview');
  }, [isSuperadmin]);

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
        toast.success('Code mapping added');
      }
      closeModal();
      await Promise.all([refreshAnalytics(), fetchMappings()]);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Action failed');
    } finally {
      setSaving(false);
    }
  };

  if (loading && !summary) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <HiOutlineRefresh className="w-10 h-10 text-primary-500 animate-spin" />
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.3em] animate-pulse">Loading Referrals...</p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-8">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight leading-none mb-2">Referrals</h1>
          <p className="text-slate-500 font-medium text-sm">Monitor and manage campus ambassador performance and attribution</p>
        </div>
        {isSuperadmin && (
          <button onClick={openCreate} className="btn-primary flex items-center gap-2.5 shadow-lg shadow-indigo-500/10">
            <HiOutlinePlus className="w-5 h-5" />
            <span>Add Mapping</span>
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 bg-slate-900 border border-white/[0.05] p-1.5 rounded-xl w-fit shadow-lg">
        {visibleTabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex items-center gap-2 px-5 py-2 rounded-lg text-xs font-semibold transition-all duration-200 ${
              tab === id ? 'bg-indigo-600 text-white shadow-md shadow-indigo-900/40' : 'text-slate-400 hover:text-white hover:bg-white/[0.03]'
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="space-y-8 animate-fade-in">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            <StatNode label="Total Referrals" value={summary?.totalRegistrationsWithReferral ?? '—'} color="text-blue-400" accent="from-blue-500/10 to-blue-600/10" />
            <StatNode label="Distinct Codes" value={summary?.distinctCodesUsed ?? '—'} color="text-violet-400" accent="from-violet-500/10 to-violet-600/10" />
            <StatNode label="Mapped Codes" value={summary?.registrationsMapped ?? '—'} color="text-emerald-400" accent="from-emerald-500/10 to-emerald-600/10" />
            <StatNode label="Unmapped Codes" value={summary?.registrationsUnmapped ?? '—'} color="text-amber-400" accent="from-amber-500/10 to-amber-600/10" />
          </div>

          <div className="card !p-0 overflow-hidden border-slate-700/30 shadow-2xl">
            <div className="px-8 py-6 border-b border-white/[0.05]">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest leading-none">Top Referrals</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-white/[0.01]">
                    <th className="px-8 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-white/[0.05]">Referral Code</th>
                    <th className="px-8 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-white/[0.05]">Assignee</th>
                    <th className="px-8 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-white/[0.05] text-right">Attribution</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.02]">
                  {codeAnalytics.slice(0, 15).map((row) => (
                    <tr key={row.normalizedReferralCode} className="group hover:bg-white/[0.02] transition-all cursor-default">
                      <td className="px-8 py-5 font-mono text-[10px] font-bold text-slate-400 uppercase tracking-tight group-hover:text-indigo-400 transition-colors uppercase leading-none">{row.referralCode}</td>
                      <td className="px-8 py-5">
                        {row.caName ? (
                          <div className="flex items-center gap-2">
                             <span className="text-sm font-bold text-white tracking-tight leading-none">{row.caName}</span>
                             {row.mappingInactive && <span className="text-[9px] px-1.5 py-0.5 bg-red-500/10 text-red-500 font-bold rounded border border-red-500/20 uppercase tracking-wider">Inactive</span>}
                          </div>
                        ) : (
                          <span className="text-[10px] font-bold text-amber-500 uppercase tracking-widest px-2.5 py-1 bg-amber-500/10 border border-amber-500/20 rounded-md">Unmapped</span>
                        )}
                      </td>
                      <td className="px-8 py-5 text-right font-bold text-white text-xl tracking-tight tabular-nums group-hover:translate-x-[-4px] transition-transform origin-right">{row.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {tab === 'mappings' && (
        <div className="animate-fade-in space-y-6">
            <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-4 bg-slate-900 border border-white/[0.05] p-3 rounded-xl shadow-lg">
            <div className="relative flex-1 group">
              <HiOutlineSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-400 w-5 h-5 transition-colors" />
              <input
                type="text"
                placeholder="Search codes or names..."
                value={mapSearch}
                onChange={(e) => { setMapSearch(e.target.value); setMapPage(1); }}
                className="input-field pl-12"
              />
            </div>
            <div className="flex items-center gap-6 px-4">
              <div className="h-8 w-px bg-slate-800 hidden lg:block"></div>
              <label className="inline-flex items-center gap-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest cursor-pointer group">
                <input
                  type="checkbox"
                  checked={includeInactive}
                  onChange={(e) => { setIncludeInactive(e.target.checked); setMapPage(1); }}
                  className="w-5 h-5 rounded border-slate-700 bg-slate-950 text-indigo-600 focus:ring-indigo-500/20 transition-all cursor-pointer"
                />
                <span className="group-hover:text-slate-200 transition-colors">Show Inactive</span>
              </label>
            </div>
          </div>

          <div className="card !p-0 overflow-hidden border-slate-700/30 shadow-2xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-white/[0.01]">
                    <th className="px-8 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-white/[0.05]">Mapping Code</th>
                    <th className="px-8 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-white/[0.05]">Ambassador Name</th>
                    <th className="px-6 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-white/[0.05] hidden md:table-cell">Contact Details</th>
                    <th className="px-6 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-white/[0.05]">Status</th>
                    <th className="px-8 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-white/[0.05] text-right">Edit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.02]">
                  {mappings.map((m) => (
                    <tr key={m._id} className="group hover:bg-white/[0.02] transition-all cursor-default">
                      <td className="px-8 py-5 font-mono text-[11px] font-bold text-white group-hover:text-indigo-400 transition-colors uppercase tracking-widest">{m.referralCode}</td>
                      <td className="px-8 py-5 font-bold text-slate-200 tracking-tight text-sm uppercase leading-none">{m.caName}</td>
                      <td className="px-6 py-5 text-slate-500 text-[11px] font-medium hidden md:table-cell leading-none italic opacity-80">
                        {[m.caEmail, m.caPhone].filter(Boolean).join(' // ') || 'Not Provided'}
                      </td>
                      <td className="px-6 py-5">
                        <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest border ${m.isActive ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border-red-500/20 text-red-400'}`}>
                           {m.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-8 py-5 text-right">
                        {isSuperadmin && (
                          <button onClick={() => openEdit(m)} className="w-9 h-9 rounded-lg bg-slate-900 border border-slate-800 text-slate-500 hover:text-white hover:border-slate-700 transition-all inline-flex items-center justify-center active:scale-95 shadow-lg">
                            <HiOutlinePencil className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {mapTotal > 20 && (
            <div className="flex items-center justify-center gap-3 py-10 border-t border-white/[0.05] bg-white/[0.01]">
              <button disabled={mapPage <= 1} onClick={() => setMapPage((p) => Math.max(1, p - 1))} className="w-10 h-10 rounded-lg bg-slate-900 border border-slate-800 text-slate-500 hover:text-white disabled:opacity-20 transition-all active:scale-95">
                 ←
              </button>
              <div className="px-4 py-2 rounded-lg bg-slate-900 border border-slate-800 flex items-center gap-2">
                 <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">Page</span>
                 <span className="text-xs font-bold text-white">{mapPage}</span>
              </div>
              <button disabled={mapPage * 20 >= mapTotal} onClick={() => setMapPage((p) => p + 1)} className="w-10 h-10 rounded-lg bg-slate-900 border border-slate-800 text-slate-500 hover:text-white disabled:opacity-20 transition-all active:scale-95">
                 →
              </button>
            </div>
          )}
        </div>
      )}

      {tab === 'unmapped' && (
        <div className="animate-fade-in space-y-6">
          <div className="card border-amber-500/20 bg-amber-500/[0.02] relative overflow-hidden group p-6">
            <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 blur-[100px] pointer-events-none"></div>
            <div className="flex items-center gap-6 relative z-10">
              <div className="w-14 h-14 rounded-xl bg-amber-600/10 border border-amber-600/20 flex items-center justify-center text-amber-500 shadow-lg">
                <HiOutlineExclamation className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white tracking-tight leading-none mb-2">Unmapped Attribution</h3>
                <p className="text-xs text-slate-400 font-medium leading-relaxed max-w-xl">
                   These codes are active in the system but aren't assigned to an ambassador. Please map them to ensure correct credit distribution.
                </p>
              </div>
            </div>
          </div>
          
          <div className="card !p-0 overflow-hidden border-slate-700/30 transition-all shadow-2xl">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-white/[0.01]">
                  <th className="px-8 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-white/[0.05]">Referral Code</th>
                  <th className="px-8 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-white/[0.05] text-center">Attribution Count</th>
                  <th className="px-8 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-white/[0.05] text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.02]">
                {unmapped.map((u) => (
                  <tr key={u.normalizedReferralCode} className="group hover:bg-white/[0.02] transition-all cursor-default">
                    <td className="px-8 py-5 font-mono text-[10px] font-bold text-slate-400 group-hover:text-amber-400 transition-colors uppercase tracking-tight">{u.referralCodeDisplay}</td>
                    <td className="px-8 py-5 text-center font-bold text-white text-lg tracking-tight tabular-nums">{u.count}</td>
                    <td className="px-8 py-5 text-right">
                      {isSuperadmin && (
                        <button
                          className="px-5 py-2 rounded-lg bg-amber-600/10 border border-amber-600/20 text-[10px] font-bold text-amber-500 uppercase tracking-widest hover:bg-amber-600 hover:text-white transition-all active:scale-95 shadow-lg"
                          onClick={() => {
                            setForm({ ...emptyForm, referralCode: u.referralCodeDisplay });
                            setModal({ open: true, editing: null });
                          }}
                        >
                          Map Code
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {unmapped.length === 0 && (
                  <tr>
                    <td colSpan="3" className="text-center py-24">
                       <HiOutlineShieldCheck className="w-10 h-10 text-slate-800 mx-auto mb-4" />
                       <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">Everything is Attribution Perfect</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'leaderboard' && (
        <div className="animate-fade-in card !p-0 overflow-hidden border-slate-700/30 shadow-2xl">
           <table className="w-full text-left">
             <thead>
               <tr className="bg-white/[0.01]">
                 <th className="px-8 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-white/[0.05] w-24 text-center">Rank</th>
                 <th className="px-8 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-white/[0.05]">Ambassador Details</th>
                 <th className="px-8 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-white/[0.05]">Mapping Code</th>
                 <th className="px-8 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-white/[0.05] text-right">Total Reach</th>
               </tr>
             </thead>
             <tbody className="divide-y divide-white/[0.02]">
               {leaderboard.map((row) => (
                 <tr key={row.normalizedReferralCode} className="group hover:bg-white/[0.01] transition-all cursor-default">
                   <td className="px-8 py-6">
                     <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xs font-bold mx-auto transition-all ${row.rank <= 3 ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/40 scale-105' : 'bg-slate-900 border border-slate-800 text-slate-500'}`}>
                        {row.rank.toString().padStart(2, '0')}
                     </div>
                   </td>
                   <td className="px-8 py-6">
                     {row.caName ? (
                       <span className="text-sm font-bold text-white tracking-tight group-hover:text-indigo-400 transition-colors uppercase leading-none">{row.caName}</span>
                     ) : (
                       <span className="text-[10px] font-bold text-amber-500 uppercase tracking-widest px-2.5 py-1 bg-amber-500/10 border border-amber-500/20 rounded-md">Unmapped</span>
                     )}
                   </td>
                   <td className="px-8 py-6 font-mono text-[11px] font-bold text-slate-600 group-hover:text-indigo-500/60 transition-colors uppercase tracking-widest">{row.referralCode}</td>
                   <td className="px-8 py-6 text-right font-bold text-3xl text-white tracking-tight group-hover:text-indigo-400 transition-all tabular-nums leading-none">{row.count}</td>
                 </tr>
               ))}
             </tbody>
           </table>
        </div>
      )}

      {/* Modal Overlay */}
      {isSuperadmin && modal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in" onClick={closeModal}>
          <div className="card w-full max-w-xl border-slate-700/50 shadow-2xl relative overflow-hidden bg-slate-900/40" onClick={(e) => e.stopPropagation()}>
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary-500/10 blur-[100px] -mr-32 -mt-32 pointer-events-none"></div>
            <form onSubmit={handleSave} className="relative z-10 space-y-8 p-4">
              <div className="flex items-center gap-4 border-b border-white/[0.05] pb-6">
                <div className="w-12 h-12 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-900/20">
                   <HiOutlinePlus className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white tracking-tight leading-none mb-1.5">
                    {modal.editing ? 'Edit Configuration' : 'Create Code Mapping'}
                  </h2>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Institutional attribution & ambassador settings</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">Referral Code</label>
                  <input
                    className="input-field font-mono uppercase tracking-widest focus:ring-indigo-500/20 tabular-nums"
                    value={form.referralCode}
                    onChange={(e) => setForm((f) => ({ ...f, referralCode: e.target.value }))}
                    required
                    placeholder="e.g. LAKSHYA10"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">Ambassador Name</label>
                  <input
                    className="input-field group"
                    value={form.caName}
                    onChange={(e) => setForm((f) => ({ ...f, caName: e.target.value }))}
                    required
                    placeholder="Full Legal Name"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">Email Address</label>
                  <input
                    type="email"
                    className="input-field"
                    value={form.caEmail}
                    onChange={(e) => setForm((f) => ({ ...f, caEmail: e.target.value }))}
                    placeholder="ambassador@institution.edu"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">Phone Number</label>
                  <input className="input-field" value={form.caPhone} onChange={(e) => setForm((f) => ({ ...f, caPhone: e.target.value }))} placeholder="+91 XXXXX XXXXX" />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">Administrative Notes</label>
                <textarea className="input-field min-h-[100px] py-4" value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} placeholder="Internal comments or institutional mapping rules..." />
              </div>

              <div className="flex items-center gap-4 p-4 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                <label className="inline-flex items-center gap-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest cursor-pointer group w-full">
                  <input
                    type="checkbox"
                    checked={form.isActive}
                    onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
                    className="w-5 h-5 rounded border-slate-700 bg-slate-950 text-indigo-600 focus:ring-indigo-500/20 cursor-pointer transition-all"
                  />
                  <span>Attribution Enabled: {form.isActive ? 'Active' : 'Inactive'}</span>
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button type="button" className="btn-outline flex-1 py-3.5 text-xs tracking-widest uppercase" onClick={closeModal}>Cancel</button>
                <button type="submit" className="btn-primary flex-1 py-3.5 text-xs tracking-widest uppercase shadow-lg shadow-indigo-500/10" disabled={saving}>
                  {saving ? 'Processing...' : modal.editing ? 'Save Changes' : 'Create Mapping'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function StatNode({ label, value, color, accent }) {
  return (
    <div className="card group relative overflow-hidden p-6 border-white/[0.05] hover:border-indigo-500/30 transition-all duration-500 shadow-lg">
      <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${accent} blur-3xl -mr-16 -mt-16 opacity-10 group-hover:opacity-40 transition-opacity duration-700`}></div>
      <div className="relative z-10 w-full">
        <div className="flex items-center gap-2 mb-3">
           <HiOutlineTrendingUp className={`w-3.5 h-3.5 ${color}`} />
           <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{label}</p>
        </div>
        <p className={`text-3xl font-bold text-white tracking-tight leading-none tabular-nums`}>{value}</p>
      </div>
    </div>
  );
}
