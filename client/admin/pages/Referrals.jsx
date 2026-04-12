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
        <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] animate-pulse">Loading Referrals...</p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-8">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tighter uppercase mb-1">Referrals</h1>
          <p className="text-slate-500 font-medium">Tracking and managing campus ambassador referral codes</p>
        </div>
        {isSuperadmin && (
          <button onClick={openCreate} className="btn-primary flex items-center gap-2 group px-8 py-3 text-[11px] font-black uppercase tracking-[0.2em] shadow-xl shadow-primary-900/40">
            <HiOutlinePlus className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" />
            <span>Add Code Mapping</span>
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 bg-slate-900/40 p-1.5 rounded-2xl border border-slate-700/30 backdrop-blur-xl w-fit shadow-xl">
        {visibleTabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${
              tab === id ? 'bg-primary-500 text-white shadow-lg shadow-primary-900/40' : 'text-slate-500 hover:text-slate-200'
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
            <div className="px-8 py-6 border-b border-white/[0.05] flex items-center justify-between">
              <h3 className="text-[11px] font-black text-slate-500 uppercase tracking-[0.3em]">Top Referral Codes</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-white/[0.01]">
                    <th className="px-8 py-5 text-[9px] font-black text-slate-600 uppercase tracking-widest">Referral Code</th>
                    <th className="px-8 py-5 text-[9px] font-black text-slate-600 uppercase tracking-widest">Name</th>
                    <th className="px-8 py-5 text-[9px] font-black text-slate-600 uppercase tracking-widest text-right">Count</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.02]">
                  {codeAnalytics.slice(0, 15).map((row) => (
                    <tr key={row.normalizedReferralCode} className="group hover:bg-white/[0.02] transition-all cursor-default">
                      <td className="px-8 py-4 font-mono text-[10px] font-black text-slate-400 uppercase tracking-tight group-hover:text-primary-400 transition-colors">{row.referralCode}</td>
                      <td className="px-8 py-4">
                        {row.caName ? (
                          <div className="flex items-center gap-2">
                             <span className="text-sm font-black text-white uppercase tracking-tight leading-none">{row.caName}</span>
                             {row.mappingInactive && <span className="text-[8px] px-1.5 bg-red-500/10 text-red-500 font-black rounded-lg uppercase tracking-widest border border-red-500/20">Inactive</span>}
                          </div>
                        ) : (
                          <span className="text-[9px] font-black text-amber-500 uppercase tracking-widest px-3 py-1 bg-amber-500/10 border border-amber-500/20 rounded-full">UNMAPPED</span>
                        )}
                      </td>
                      <td className="px-8 py-4 text-right font-black text-white text-lg tracking-tighter tabular-nums group-hover:scale-110 transition-transform origin-right">{row.count}</td>
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
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-4 bg-slate-900/40 p-3 rounded-2xl border border-slate-700/30 backdrop-blur-xl">
            <div className="relative flex-1 group">
              <HiOutlineSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-primary-400 w-5 h-5 transition-colors" />
              <input
                type="text"
                placeholder="Search by code or name..."
                value={mapSearch}
                onChange={(e) => { setMapSearch(e.target.value); setMapPage(1); }}
                className="input-field pl-12"
              />
            </div>
            <div className="flex items-center gap-6 px-4">
              <div className="h-8 w-px bg-slate-800 hidden lg:block"></div>
              <label className="inline-flex items-center gap-3 text-[10px] font-black text-slate-500 uppercase tracking-widest cursor-pointer group">
                <input
                  type="checkbox"
                  checked={includeInactive}
                  onChange={(e) => { setIncludeInactive(e.target.checked); setMapPage(1); }}
                  className="w-5 h-5 rounded-lg border-slate-700 bg-slate-950 text-primary-600 focus:ring-primary-500/20 transition-all cursor-pointer"
                />
                <span className="group-hover:text-slate-300 transition-colors">Show Inactive Codes</span>
              </label>
            </div>
          </div>

          <div className="card !p-0 overflow-hidden border-slate-700/30 shadow-2xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-white/[0.01]">
                    <th className="px-8 py-5 text-[9px] font-black text-slate-600 uppercase tracking-widest">Code</th>
                    <th className="px-8 py-5 text-[9px] font-black text-slate-600 uppercase tracking-widest">Name</th>
                    <th className="px-6 py-5 text-[9px] font-black text-slate-600 uppercase tracking-widest hidden md:table-cell">Email / Phone</th>
                    <th className="px-6 py-5 text-[9px] font-black text-slate-600 uppercase tracking-widest">Status</th>
                    <th className="px-8 py-5 text-[9px] font-black text-slate-600 uppercase tracking-widest text-right">Edit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.02]">
                  {mappings.map((m) => (
                    <tr key={m._id} className="group hover:bg-white/[0.02] transition-all cursor-default text-xs">
                      <td className="px-8 py-4 font-mono text-[10px] font-black text-white group-hover:text-primary-400 transition-colors uppercase tracking-tight">{m.referralCode}</td>
                      <td className="px-8 py-4 font-black text-white uppercase tracking-tight">{m.caName}</td>
                      <td className="px-6 py-4 text-slate-500 text-[10px] font-black uppercase tracking-widest hidden md:table-cell">
                        {[m.caEmail, m.caPhone].filter(Boolean).join(' // ') || '---'}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border ${m.isActive ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-red-500/10 border-red-500/30 text-red-400'}`}>
                           {m.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-8 py-4 text-right">
                        {isSuperadmin && (
                          <button onClick={() => openEdit(m)} className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 text-slate-500 hover:text-white hover:border-slate-700 transition-all inline-flex items-center justify-center shadow-xl active:scale-95">
                            <HiOutlinePencil className="w-5 h-5" />
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
            <div className="flex items-center justify-center gap-4 py-8 bg-white/[0.01] border-t border-white/[0.05] rounded-2xl shadow-xl">
              <button disabled={mapPage <= 1} onClick={() => setMapPage((p) => Math.max(1, p - 1))} className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 text-slate-500 hover:text-white disabled:opacity-20 transition-all shadow-lg active:scale-95">
                 ←
              </button>
              <div className="flex items-center gap-2 px-6 py-2 rounded-xl bg-slate-900 border border-slate-800">
                 <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">PAGE</span>
                 <span className="text-[10px] font-black text-white">{mapPage}</span>
              </div>
              <button disabled={mapPage * 20 >= mapTotal} onClick={() => setMapPage((p) => p + 1)} className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 text-slate-500 hover:text-white disabled:opacity-20 transition-all shadow-lg active:scale-95">
                 →
              </button>
            </div>
          )}
        </div>
      )}

      {tab === 'unmapped' && (
        <div className="animate-fade-in space-y-6">
          <div className="card border-amber-500/20 bg-amber-500/[0.02] backdrop-blur-xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 blur-[100px] pointer-events-none"></div>
            <div className="flex items-center gap-6 relative z-10 p-2">
              <div className="p-5 rounded-[2rem] bg-amber-500 shadow-2xl shadow-amber-900/40 text-white transform rotate-6 group-hover:rotate-0 transition-transform duration-500">
                <HiOutlineExclamation className="w-10 h-10" />
              </div>
              <div>
                <h3 className="text-xl font-black text-white uppercase tracking-tighter">Unknown Codes Found</h3>
                <p className="text-xs text-slate-400 mt-1.5 font-bold uppercase tracking-tight leading-relaxed max-w-xl">
                   The following codes have been used in registrations but don't have a name assigned to them. Map these codes to assign credit to a campus ambassador.
                </p>
              </div>
            </div>
          </div>
          
          <div className="card !p-0 overflow-hidden border-slate-700/30 transition-all shadow-2xl">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-white/[0.01]">
                  <th className="px-8 py-5 text-[9px] font-black text-slate-600 uppercase tracking-widest">Referral Code</th>
                  <th className="px-8 py-5 text-[9px] font-black text-slate-600 uppercase tracking-widest text-center">Count</th>
                  <th className="px-8 py-5 text-[9px] font-black text-slate-600 uppercase tracking-widest text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.02]">
                {unmapped.map((u) => (
                  <tr key={u.normalizedReferralCode} className="group hover:bg-white/[0.02] transition-all cursor-default">
                    <td className="px-8 py-5 font-mono text-[10px] font-black text-slate-400 group-hover:text-amber-400 transition-colors uppercase tracking-tight">{u.referralCodeDisplay}</td>
                    <td className="px-8 py-5 text-center font-black text-white text-lg tracking-tighter tabular-nums">{u.count}</td>
                    <td className="px-8 py-5 text-right">
                      {isSuperadmin && (
                        <button
                          className="px-6 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[9px] font-black text-amber-500 uppercase tracking-widest hover:bg-amber-500 hover:text-white transition-all shadow-xl active:scale-95"
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
                       <HiOutlineShieldCheck className="w-12 h-12 text-slate-800 mx-auto mb-4" />
                       <p className="text-[10px] font-black text-slate-700 uppercase tracking-[0.3em]">All Codes are Mapped</p>
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
                 <th className="px-8 py-5 text-[9px] font-black text-slate-600 uppercase tracking-widest w-24 text-center">Rank</th>
                 <th className="px-8 py-5 text-[9px] font-black text-slate-600 uppercase tracking-widest">Name</th>
                 <th className="px-8 py-5 text-[9px] font-black text-slate-600 uppercase tracking-widest">Code</th>
                 <th className="px-8 py-5 text-[9px] font-black text-slate-600 uppercase tracking-widest text-right">Total</th>
               </tr>
             </thead>
             <tbody className="divide-y divide-white/[0.02]">
               {leaderboard.map((row) => (
                 <tr key={row.normalizedReferralCode} className="group hover:bg-white/[0.01] transition-all cursor-default">
                   <td className="px-8 py-5">
                     <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-[11px] font-black mx-auto transition-all ${row.rank <= 3 ? 'bg-primary-500 text-white shadow-xl shadow-primary-900/40 scale-110' : 'bg-slate-900 border border-slate-800 text-slate-500'}`}>
                        {row.rank}
                     </div>
                   </td>
                   <td className="px-8 py-5">
                     {row.caName ? (
                       <span className="text-sm font-black text-white uppercase tracking-tight group-hover:text-primary-400 transition-colors">{row.caName}</span>
                     ) : (
                       <span className="text-[9px] font-black text-amber-500 uppercase tracking-widest px-3 py-1 bg-amber-500/10 border border-amber-500/20 rounded-full">UNMAPPED</span>
                     )}
                   </td>
                   <td className="px-8 py-5 font-mono text-[10px] font-black text-slate-600 uppercase tracking-tight">{row.referralCode}</td>
                   <td className="px-8 py-5 text-right font-black text-3xl text-white tracking-tighter group-hover:text-primary-400 transition-all tabular-nums">{row.count}</td>
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
                <div className="w-12 h-12 rounded-xl bg-primary-500 flex items-center justify-center text-white shadow-xl">
                   <HiOutlinePlus className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-white uppercase tracking-tighter">
                    {modal.editing ? 'Edit Mapping' : 'Add New Mapping'}
                  </h2>
                  <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mt-1">Configure code and ambassador details</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] px-1">Referral Code</label>
                  <input
                    className="input-field font-mono uppercase tracking-widest focus:ring-primary-500/20"
                    value={form.referralCode}
                    onChange={(e) => setForm((f) => ({ ...f, referralCode: e.target.value }))}
                    required
                    placeholder="e.g. LAKSHYA10"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] px-1">Name</label>
                  <input
                    className="input-field group"
                    value={form.caName}
                    onChange={(e) => setForm((f) => ({ ...f, caName: e.target.value }))}
                    required
                    placeholder="Ambassador Name"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] px-1">Email</label>
                  <input
                    type="email"
                    className="input-field"
                    value={form.caEmail}
                    onChange={(e) => setForm((f) => ({ ...f, caEmail: e.target.value }))}
                    placeholder="email@example.com"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] px-1">Phone</label>
                  <input className="input-field" value={form.caPhone} onChange={(e) => setForm((f) => ({ ...f, caPhone: e.target.value }))} placeholder="+91 XXXXX XXXXX" />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] px-1">Internal Notes</label>
                <textarea className="input-field min-h-[100px] py-4" value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} placeholder="Any notes about this mapping..." />
              </div>

              <div className="flex items-center gap-4 p-4 rounded-2xl bg-white/[0.02] border border-white/[0.05]">
                <label className="inline-flex items-center gap-4 text-[10px] font-black text-slate-500 uppercase tracking-widest cursor-pointer group w-full">
                  <input
                    type="checkbox"
                    checked={form.isActive}
                    onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
                    className="w-6 h-6 rounded-lg border-slate-700 bg-slate-950 text-primary-600 focus:ring-primary-500/20 cursor-pointer"
                  />
                  <span>STATUS: {form.isActive ? 'Active' : 'Inactive'}</span>
                </label>
              </div>

              <div className="flex justify-end gap-4 pt-4">
                <button type="button" className="btn-outline flex-1 py-4 text-[10px] font-black uppercase tracking-widest" onClick={closeModal}>Cancel</button>
                <button type="submit" className="btn-primary flex-1 py-4 text-[10px] font-black uppercase tracking-widest shadow-xl shadow-primary-900/40" disabled={saving}>
                  {saving ? 'Saving...' : modal.editing ? 'Save Changes' : 'Add Mapping'}
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
    <div className="card group relative overflow-hidden p-6 border-slate-700/30 hover:border-white/[0.1] transition-all duration-500">
      <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${accent} blur-3xl -mr-16 -mt-16 opacity-30 group-hover:opacity-100 transition-opacity duration-700`}></div>
      <div className="relative z-10 w-full">
        <div className="flex items-center gap-2 mb-3">
           <HiOutlineTrendingUp className={`w-3.5 h-3.5 ${color}`} />
           <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">{label}</p>
        </div>
        <p className={`text-3xl font-black text-white tracking-tighter group-hover:scale-105 transition-transform origin-left duration-500`}>{value}</p>
      </div>
    </div>
  );
}
