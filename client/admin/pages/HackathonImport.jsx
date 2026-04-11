import { useState, useEffect, useCallback, useRef } from 'react';
import api from '../../src/services/api';
import {
  HiOutlineUpload, HiOutlineRefresh, HiOutlineSearch,
  HiOutlineCheckCircle, HiOutlineBan, HiOutlineTrash,
  HiOutlineArrowCircleUp, HiOutlineInformationCircle,
  HiOutlineDocumentText, HiOutlineChevronDown, HiOutlineChevronUp,
  HiOutlineX, HiOutlineExclamation, HiOutlineLightningBolt,
} from 'react-icons/hi';
import toast from 'react-hot-toast';

// ─── Status helpers ───────────────────────────────────────────────────────────
const STATUS_META = {
  selected:   { label: 'Selected',  color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/30' },
  waitlisted: { label: 'Waitlist',  color: 'text-amber-400',   bg: 'bg-amber-500/10   border-amber-500/30'   },
  suspended:  { label: 'Suspended', color: 'text-orange-400',  bg: 'bg-orange-500/10  border-orange-500/30'  },
  removed:    { label: 'Removed',   color: 'text-red-400',     bg: 'bg-red-500/10     border-red-500/30'     },
};
const StatusBadge = ({ status }) => {
  const m = STATUS_META[status] || { label: status, color: 'text-slate-400', bg: 'bg-slate-500/10 border-slate-500/30' };
  return <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold border ${m.bg} ${m.color}`}>{m.label}</span>;
};
const PayBadge = ({ paid }) => paid
  ? <span className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">Paid</span>
  : <span className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-500/10 border border-slate-500/30 text-slate-400">Unpaid</span>;

// ─── Column reference data ────────────────────────────────────────────────────
const ALL_COLUMNS = [
  { col: 'teamName',     cat: 'Team',     req: true,  desc: 'All rows with same teamName form one team' },
  { col: 'teamRole',     cat: 'Team',     req: true,  desc: '"leader" or "member" — one leader per team required' },
  { col: 'unstopTeamId', cat: 'Team',     req: false, desc: 'Unstop ID — used for grouping instead of teamName if set' },
  { col: 'status',       cat: 'Team',     req: false, desc: '"selected" or "waitlisted" — overrides import toggle' },
  { col: 'name',         cat: 'Personal', req: true,  desc: 'Full name of this person' },
  { col: 'email',        cat: 'Personal', req: true,  desc: 'Email — login ID for leader; stored for members' },
  { col: 'phone',        cat: 'Personal', req: false, desc: 'Mobile number' },
  { col: 'gender',       cat: 'Personal', req: false, desc: 'Male / Female / Other' },
  { col: 'collegeName',  cat: 'Academic', req: false, desc: 'College or university name' },
  { col: 'department',   cat: 'Academic', req: false, desc: 'Branch / stream (e.g. "Computer Engineering")' },
  { col: 'year',         cat: 'Academic', req: false, desc: 'Current year of study (1, 2, 3, 4…)' },
  { col: 'linkedin',     cat: 'Profiles', req: false, desc: 'LinkedIn profile URL' },
  { col: 'github',       cat: 'Profiles', req: false, desc: 'GitHub profile URL' },
];

const CAT_COLORS = {
  Team:     'bg-violet-500/20 text-violet-300 border-violet-500/30',
  Personal: 'bg-sky-500/20    text-sky-300    border-sky-500/30',
  Academic: 'bg-teal-500/20   text-teal-300   border-teal-500/30',
  Profiles: 'bg-pink-500/20   text-pink-300   border-pink-500/30',
};

// ─── Root ─────────────────────────────────────────────────────────────────────
export default function HackathonImport() {
  const [tab, setTab] = useState('import');
  return (
    <div className="text-slate-100">
      {/* Page header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center flex-shrink-0">
            <HiOutlineLightningBolt className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Hackathon Management</h1>
            <p className="text-slate-400 text-sm">Import shortlisted teams from Unstop &amp; manage payment access</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-slate-700/60 pb-0">
          {[
            { id: 'import', label: 'Import Teams', icon: '📥' },
            { id: 'teams',  label: 'Manage Teams', icon: '🏆' },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-5 py-2.5 text-sm font-medium -mb-px border-b-2 transition-colors ${
                tab === t.id
                  ? 'border-primary-400 text-primary-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>
      </div>

      {tab === 'import' ? <ImportTab /> : <TeamsTab />}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// IMPORT TAB
// ═══════════════════════════════════════════════════════════════════════════════
function ImportTab() {
  const [hackathonEvent, setHackathonEvent] = useState(null); // auto-detected
  const [eventError, setEventError]         = useState('');
  const [defaultStatus, setDefaultStatus]   = useState('selected');
  const [file, setFile]                     = useState(null);
  const [dragging, setDragging]             = useState(false);
  const [loading, setLoading]               = useState(false);
  const [result, setResult]                 = useState(null);
  const [showFormat, setShowFormat]         = useState(false);
  const fileRef                             = useRef();

  // Auto-detect the hackathon event — no dropdown needed, it's the flagship event
  useEffect(() => {
    api.get('/events?limit=100').then(({ data }) => {
      const events = data.events || [];
      const found  = events.find((e) =>
        /hackathon/i.test(e.title) || /hackathon/i.test(e.slug)
      );
      if (found) {
        setHackathonEvent(found);
      } else {
        setEventError('No Hackathon event found in the database. Please create it in Events first.');
      }
    }).catch(() => setEventError('Failed to load events.'));
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault(); setDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f) setFile(f);
  }, []);

  const handleSubmit = async () => {
    if (!hackathonEvent) return toast.error('Hackathon event not found — create it in Events first');
    if (!file)           return toast.error('Please upload an Excel/CSV file');
    const fd = new FormData();
    fd.append('file', file);
    fd.append('eventId', hackathonEvent._id);
    fd.append('defaultStatus', defaultStatus);
    setLoading(true); setResult(null);
    try {
      const { data } = await api.post('/hackathon/import', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setResult(data.data);
      toast.success(`Import complete — ${data.data.created} teams created`);
      setFile(null);
    } catch (err) {
      toast.error(err.userMessage || 'Import failed');
    } finally { setLoading(false); }
  };

  return (
    <div className="max-w-4xl space-y-5">

      {/* ── Import Card ───────────────────────────────────────────────────── */}
      <div className="bg-slate-800/50 border border-slate-700/60 rounded-2xl p-6 space-y-6">

        {/* Hackathon event — auto-detected, not a dropdown */}
        <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${
          hackathonEvent
            ? 'bg-emerald-500/5 border-emerald-500/20'
            : eventError
            ? 'bg-red-500/5 border-red-500/20'
            : 'bg-slate-900 border-slate-700'
        }`}>
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
            hackathonEvent ? 'bg-emerald-500/10' : eventError ? 'bg-red-500/10' : 'bg-slate-800'
          }`}>
            <HiOutlineLightningBolt className={`w-4 h-4 ${
              hackathonEvent ? 'text-emerald-400' : eventError ? 'text-red-400' : 'text-slate-500 animate-pulse'
            }`} />
          </div>
          <div className="flex-1 min-w-0">
            {hackathonEvent ? (
              <>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Linked Event</p>
                <p className="text-sm font-bold text-emerald-300">{hackathonEvent.title}</p>
              </>
            ) : eventError ? (
              <>
                <p className="text-xs font-semibold text-red-400 uppercase tracking-wider">Event Not Found</p>
                <p className="text-xs text-slate-400 mt-0.5">{eventError}</p>
              </>
            ) : (
              <p className="text-sm text-slate-500">Detecting Hackathon event&hellip;</p>
            )}
          </div>
          {hackathonEvent && (
            <span className="text-[10px] font-mono text-slate-600 bg-slate-800 px-1.5 py-0.5 rounded flex-shrink-0">
              {hackathonEvent._id?.slice(-6)}
            </span>
          )}
        </div>

        {/* Step 1: Import type */}
        <div>
          <label className="block text-sm font-semibold text-slate-200 mb-2">
            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-primary-600 text-white text-xs font-bold mr-2">1</span>
            Import Type
          </label>
          <div className="grid grid-cols-2 gap-3 ml-7">
            {[
              { val: 'selected',   emoji: '✅', label: 'Selected Teams',   sub: 'Can pay immediately after import' },
              { val: 'waitlisted', emoji: '⏳', label: 'Waitlist Teams',   sub: 'Blocked from paying until promoted' },
            ].map((opt) => (
              <button
                key={opt.val}
                onClick={() => setDefaultStatus(opt.val)}
                className={`flex items-start gap-3 p-4 rounded-xl border text-left transition-all ${
                  defaultStatus === opt.val
                    ? 'border-primary-500 bg-primary-500/10 ring-2 ring-primary-500/20'
                    : 'border-slate-600 bg-slate-900 hover:border-slate-500'
                }`}
              >
                <span className="text-xl mt-0.5">{opt.emoji}</span>
                <div>
                  <p className={`text-sm font-semibold ${defaultStatus === opt.val ? 'text-primary-300' : 'text-slate-300'}`}>
                    {opt.label}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">{opt.sub}</p>
                </div>
              </button>
            ))}
          </div>
          <p className="text-xs text-slate-500 mt-2 ml-7">
            Per-team <code className="text-primary-300 bg-slate-900 px-1 rounded">status</code> column in the Excel overrides this setting.
          </p>
        </div>

        {/* Step 3: File */}
        <div>
          <label className="block text-sm font-semibold text-slate-200 mb-2">
            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-primary-600 text-white text-xs font-bold mr-2">2</span>
            Upload Excel / CSV File
          </label>
          <div
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileRef.current?.click()}
            className={`ml-7 border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
              dragging   ? 'border-primary-400 bg-primary-500/10 scale-[1.01]'
              : file     ? 'border-emerald-500 bg-emerald-500/10'
              : 'border-slate-600 hover:border-primary-500/50 hover:bg-slate-800 bg-slate-900'
            }`}
          >
            {file ? (
              <div className="flex items-center justify-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
                  <HiOutlineCheckCircle className="w-6 h-6 text-emerald-400" />
                </div>
                <div className="text-left">
                  <p className="font-semibold text-emerald-300 text-sm">{file.name}</p>
                  <p className="text-xs text-slate-500">{(file.size / 1024).toFixed(1)} KB · ready to import</p>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); setFile(null); }}
                  className="ml-auto text-slate-500 hover:text-red-400 transition-colors p-1"
                >
                  <HiOutlineX className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="w-12 h-12 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center mx-auto">
                  <HiOutlineUpload className="w-6 h-6 text-slate-400" />
                </div>
                <div>
                  <p className="text-slate-300 font-medium text-sm">Drop your file here, or click to browse</p>
                  <p className="text-slate-500 text-xs mt-1">.xlsx · .xls · .csv — max 10 MB</p>
                </div>
              </div>
            )}
          </div>
          <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden"
            onChange={(e) => setFile(e.target.files?.[0] || null)} />
        </div>

        {/* Submit */}
        <div className="ml-7 pt-2 border-t border-slate-700/50">
          <button
            onClick={handleSubmit}
            disabled={loading || !file || !hackathonEvent}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-primary-600 hover:bg-primary-700 disabled:opacity-40 disabled:cursor-not-allowed font-semibold text-white text-sm transition-all shadow-lg shadow-primary-900/20"
          >
            {loading
              ? <><div className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white" />Processing…</>
              : <><HiOutlineUpload className="w-4 h-4" />Run Import</>}
          </button>
        </div>
      </div>

      {/* ── Import Result ─────────────────────────────────────────────────── */}
      {result && <ImportResult result={result} />}

      {/* ── Format Reference (collapsed by default) ───────────────────────── */}
      <div className="bg-slate-800/30 border border-slate-700/40 rounded-2xl overflow-hidden">
        <button
          onClick={() => setShowFormat((v) => !v)}
          className="w-full flex items-center justify-between px-6 py-4 hover:bg-slate-800/50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <HiOutlineDocumentText className="w-5 h-5 text-slate-400" />
            <span className="text-sm font-semibold text-slate-300">Excel / CSV Format Reference</span>
            <span className="text-xs text-slate-500 hidden sm:block">— click to expand column guide &amp; example</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 bg-slate-800 px-2 py-0.5 rounded">13 columns</span>
            {showFormat
              ? <HiOutlineChevronUp className="w-4 h-4 text-slate-400" />
              : <HiOutlineChevronDown className="w-4 h-4 text-slate-400" />}
          </div>
        </button>

        {showFormat && (
          <div className="border-t border-slate-700/40 p-6 space-y-6">

            {/* How it works */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                { emoji: '1️⃣', title: 'One row per person', desc: 'Every team member, including the leader, needs their own row in the spreadsheet.' },
                { emoji: '2️⃣', title: 'Group by teamName', desc: 'Rows sharing the same teamName (or unstopTeamId) are automatically grouped.' },
                { emoji: '3️⃣', title: 'Mark the leader', desc: 'Exactly one row per team must have teamRole = "leader". Others are members.' },
                { emoji: '4️⃣', title: 'Leader gets login', desc: "Only the leader's email creates a login account. Member data is stored as-is." },
              ].map((c) => (
                <div key={c.title} className="bg-slate-900/60 rounded-xl p-4 border border-slate-700/40">
                  <div className="text-2xl mb-2">{c.emoji}</div>
                  <p className="text-sm font-semibold text-slate-200 mb-1">{c.title}</p>
                  <p className="text-xs text-slate-500 leading-relaxed">{c.desc}</p>
                </div>
              ))}
            </div>

            {/* Unified column table */}
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-3">All Columns</p>
              <div className="rounded-xl border border-slate-700/50 overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-slate-800/80">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 w-36">Column</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 w-24">Category</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 w-20">Required?</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400">Description</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/30">
                    {ALL_COLUMNS.map((c) => (
                      <tr key={c.col} className="hover:bg-slate-800/30 transition-colors">
                        <td className="px-4 py-3 font-mono text-xs text-primary-300 font-semibold">{c.col}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex px-2 py-0.5 rounded text-xs font-semibold border ${CAT_COLORS[c.cat]}`}>
                            {c.cat}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {c.req
                            ? <span className="text-xs font-semibold text-red-400">✦ Yes</span>
                            : <span className="text-xs text-slate-500">Optional</span>}
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-400">{c.desc}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* teamRole values */}
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-xs text-slate-400 font-semibold">teamRole values:</span>
              {['leader','lead','captain','head'].map((v) => (
                <code key={v} className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-2.5 py-1 rounded-lg text-xs">{v} → leader</code>
              ))}
              <code className="bg-amber-500/10 border border-amber-500/30 text-amber-400 px-2.5 py-1 rounded-lg text-xs">anything else → member</code>
            </div>

            {/* Example */}
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-3">Example — 2 teams, 5 rows</p>
              <div className="rounded-xl border border-slate-700/50 overflow-x-auto">
                <table className="text-xs font-mono min-w-max">
                  <thead className="bg-slate-800/80">
                    <tr>
                      {['teamName','teamRole','unstopTeamId','status','name','email','phone','gender','collegeName','department','year','linkedin','github'].map((h) => (
                        <th key={h} className="px-3 py-2.5 text-left text-primary-300 font-semibold whitespace-nowrap border-b border-slate-700/50">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/30">
                    {[
                      ['Team Alpha','leader','UST-10','selected',  'Ravi Sharma', 'ravi@ex.com', '9876543210','Male',  'LDCE',  'CE','3','linkedin.com/…','github.com/…'],
                      ['Team Alpha','member','UST-10','',          'Priya Patel', 'priya@ex.com','9988776655','Female','LDCE',  'IT','3','',''],
                      ['Team Alpha','member','UST-10','',          'Dev Modi',    'dev@ex.com',  '',          'Male',  'NIRMA', 'CE','2','','github.com/…'],
                      ['Tech Wave', 'leader','UST-11','waitlisted','Ankit Shah',  'ankit@ex.com','9123456789','Male',  'SVNIT', 'EC','4','linkedin.com/…',''],
                      ['Tech Wave', 'member','UST-11','',          'Mira Joshi',  'mira@ex.com', '',          'Female','SVNIT', 'IT','3','',''],
                    ].map((row, i) => (
                      <tr key={i} className={i < 3 ? 'bg-violet-950/20 hover:bg-violet-950/40' : 'bg-teal-950/20 hover:bg-teal-950/40'}>
                        {row.map((v, vi) => (
                          <td key={vi} className="px-3 py-2 whitespace-nowrap text-slate-400">
                            {v === 'leader'     ? <span className="text-emerald-400 font-bold">{v}</span>
                            : v === 'member'    ? <span className="text-amber-400">{v}</span>
                            : v === 'selected'  ? <span className="text-emerald-400">{v}</span>
                            : v === 'waitlisted'? <span className="text-amber-400">{v}</span>
                            : v || <span className="text-slate-700">—</span>}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-2 space-y-1 text-xs text-slate-500">
                <p><span className="inline-block w-2.5 h-2.5 rounded-sm bg-violet-900 mr-1.5" />Rows 1–3: <code className="text-primary-300">teamName="Team Alpha"</code> → one team. Ravi is leader, Priya &amp; Dev are members.</p>
                <p><span className="inline-block w-2.5 h-2.5 rounded-sm bg-teal-900 mr-1.5" />Rows 4–5: <code className="text-primary-300">teamName="Tech Wave"</code> → separate team, status "waitlisted".</p>
              </div>
            </div>

            {/* Default password */}
            <div className="flex items-start gap-3 bg-amber-500/5 border border-amber-500/20 rounded-xl p-4">
              <HiOutlineInformationCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
              <div className="text-xs text-amber-200/80 space-y-1">
                <p><strong className="text-amber-300">Default password</strong> for new leader accounts:{' '}
                  <code className="bg-slate-900 px-1.5 py-0.5 rounded text-amber-300">Lakshya@2025</code>{' '}
                  — configurable via server env <code className="bg-slate-900 px-1.5 py-0.5 rounded">HACKATHON_DEFAULT_PASSWORD</code>.</p>
                <p>Column names are <strong>case-insensitive</strong> and accept variations (e.g. "mobile", "branch", "LinkedIn URL" all resolve correctly).</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Import result ────────────────────────────────────────────────────────────
function ImportResult({ result }) {
  const [showErrors, setShowErrors] = useState(false);
  return (
    <div className="bg-slate-800/50 border border-emerald-500/20 rounded-2xl p-6 space-y-5">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
          <HiOutlineCheckCircle className="w-5 h-5 text-emerald-400" />
        </div>
        <div>
          <p className="text-sm font-bold text-white">Import Complete</p>
          <p className="text-xs text-slate-500">Batch: {result.importBatch}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: 'Total Rows',  val: result.totalPersonRows, cls: 'border-slate-700' },
          { label: 'Teams Found', val: result.totalTeams,      cls: 'border-violet-500/30 bg-violet-500/5' },
          { label: 'Created',     val: result.created,         cls: 'border-emerald-500/30 bg-emerald-500/5' },
          { label: 'Duplicates',  val: result.duplicates,      cls: 'border-amber-500/30  bg-amber-500/5'  },
          { label: 'Invalid',     val: result.invalid,         cls: 'border-red-500/30    bg-red-500/5'    },
        ].map((s) => (
          <div key={s.label} className={`rounded-xl p-4 text-center border bg-slate-900/50 ${s.cls}`}>
            <p className="text-2xl font-bold text-white">{s.val ?? '—'}</p>
            <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {result.errors?.length > 0 && (
        <div className="border-t border-slate-700/50 pt-4">
          <button onClick={() => setShowErrors((v) => !v)}
            className="flex items-center gap-2 text-xs text-amber-400 hover:text-amber-300 font-medium transition-colors">
            {showErrors ? <HiOutlineChevronUp className="w-4 h-4" /> : <HiOutlineChevronDown className="w-4 h-4" />}
            {result.errors.length} row issue{result.errors.length !== 1 ? 's' : ''} — click to {showErrors ? 'hide' : 'view'}
          </button>
          {showErrors && (
            <div className="mt-3 rounded-xl border border-slate-700 overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-slate-800">
                  <tr>
                    {['Row','Team / Email','Reason'].map((h) => (
                      <th key={h} className="px-4 py-2.5 text-left text-slate-400 font-semibold">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/50">
                  {result.errors.map((e, i) => (
                    <tr key={i} className="hover:bg-slate-800/50">
                      <td className="px-4 py-2.5 text-slate-400 font-mono">#{e.row}</td>
                      <td className="px-4 py-2.5 text-slate-400">{e.data?.leaderEmail || e.data?.email || e.data?.teamName || '—'}</td>
                      <td className="px-4 py-2.5 text-red-400">{e.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TEAMS TAB
// ═══════════════════════════════════════════════════════════════════════════════
function TeamsTab() {
  const [teams, setTeams]       = useState([]);
  const [total, setTotal]       = useState(0);
  const [pages, setPages]       = useState(1);
  const [page, setPage]         = useState(1);
  const [loading, setLoading]   = useState(false);
  const [actionLoading, setActionLoading] = useState('');
  const [confirm, setConfirm]   = useState(null);
  const [expanded, setExpanded] = useState(null);
  const [batches, setBatches]   = useState([]);
  const [showBatches, setShowBatches] = useState(false);

  const [selectionStatus, setSelection]   = useState('');
  const [paymentStatus, setPaymentStatus] = useState('');
  const [search, setSearch]               = useState('');
  const [searchInput, setSearchInput]     = useState('');

  const fetchBatches = useCallback(async () => {
    try {
      const { data } = await api.get('/hackathon/batches');
      setBatches(data.data || []);
    } catch { /* silent */ }
  }, []);

  const fetchTeams = useCallback(async (pg = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: pg, limit: 20 });
      if (selectionStatus) params.set('selectionStatus', selectionStatus);
      if (paymentStatus)   params.set('paymentStatus', paymentStatus);
      if (search)          params.set('search', search);
      const { data } = await api.get(`/hackathon/teams?${params}`);
      setTeams(data.teams || []); setTotal(data.total || 0);
      setPages(data.pages || 1);  setPage(pg);
    } catch (err) { toast.error(err.userMessage || 'Failed to load teams'); }
    finally { setLoading(false); }
  }, [selectionStatus, paymentStatus, search]);

  useEffect(() => { fetchTeams(1); fetchBatches(); }, [fetchTeams, fetchBatches]);

  const doAction = async () => {
    if (!confirm) return;
    const { id, action, importBatch } = confirm;
    setActionLoading((id || importBatch) + action); setConfirm(null);
    try {
      if (action === 'delete') {
        await api.delete(`/hackathon/teams/${id}`);
        toast.success('Team and all related records deleted');
      } else if (action === 'deleteBatch') {
        const { data } = await api.delete('/hackathon/batch', { data: { importBatch } });
        toast.success(data.message || 'Batch deleted');
        fetchBatches();
      } else {
        await api.patch(`/hackathon/teams/${id}/${action}`);
        toast.success(`Team ${action}d successfully`);
      }
      fetchTeams(page);
    } catch (err) { toast.error(err.userMessage || 'Action failed'); }
    finally { setActionLoading(''); }
  };

  const clearFilters = () => {
    setSearchInput(''); setSearch(''); setSelection(''); setPaymentStatus('');
  };
  const hasFilters = search || selectionStatus || paymentStatus;

  return (
    <div className="space-y-5">

      {/* ── Batch Manager ──────────────────────────────────────────────────── */}
      {batches.length > 0 && (
        <div className="bg-slate-800/30 border border-slate-700/40 rounded-2xl overflow-hidden">
          <button
            onClick={() => setShowBatches((v) => !v)}
            className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-slate-800/50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <HiOutlineTrash className="w-4 h-4 text-red-400" />
              <span className="text-sm font-semibold text-slate-300">Manage Import Batches</span>
              <span className="text-xs bg-slate-700 text-slate-400 px-2 py-0.5 rounded">{batches.length} batch{batches.length !== 1 ? 'es' : ''}</span>
            </div>
            {showBatches ? <HiOutlineChevronUp className="w-4 h-4 text-slate-400" /> : <HiOutlineChevronDown className="w-4 h-4 text-slate-400" />}
          </button>
          {showBatches && (
            <div className="border-t border-slate-700/40 divide-y divide-slate-700/30">
              {batches.map((batch) => (
                <div key={batch} className="flex items-center justify-between px-5 py-3">
                  <div>
                    <p className="text-sm font-mono text-slate-300">{batch}</p>
                    <p className="text-xs text-slate-500 mt-0.5">Import batch identifier</p>
                  </div>
                  <button
                    onClick={() => setConfirm({ importBatch: batch, action: 'deleteBatch', teamName: `batch "${batch}"` })}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10 text-xs font-semibold transition-all"
                  >
                    <HiOutlineTrash className="w-3.5 h-3.5" />
                    Delete Entire Batch
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Filter bar */}
      <div className="bg-slate-800/50 border border-slate-700/60 rounded-2xl p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <HiOutlineSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
            <input
              type="text" value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && setSearch(searchInput)}
              placeholder="Search team name, leader email, college…"
              className="w-full bg-slate-900 border border-slate-600 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-200 placeholder-slate-500 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition-all"
            />
          </div>

          {/* Dropdowns */}
          {[
            { val: selectionStatus, set: setSelection,     opts: [['','All Status'],['selected','Selected'],['waitlisted','Waitlisted'],['suspended','Suspended'],['removed','Removed']] },
            { val: paymentStatus,   set: setPaymentStatus, opts: [['','All Payment'],['paid','Paid'],['unpaid','Unpaid']] },
          ].map((f, i) => (
            <select key={i} value={f.val} onChange={(e) => f.set(e.target.value)}
              className="bg-slate-900 border border-slate-600 rounded-xl px-3 py-2.5 text-sm text-slate-200 focus:border-primary-500 focus:outline-none transition-all">
              {f.opts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          ))}

          <button onClick={() => setSearch(searchInput)}
            className="px-4 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium transition-colors">
            Search
          </button>
          <button onClick={() => fetchTeams(page)}
            className="p-2.5 rounded-xl border border-slate-600 text-slate-400 hover:text-slate-200 hover:border-slate-500 transition-colors" title="Refresh">
            <HiOutlineRefresh className="w-4 h-4" />
          </button>
        </div>

        {hasFilters && (
          <button onClick={clearFilters} className="mt-2 text-xs text-slate-500 hover:text-slate-300 underline transition-colors">
            Clear all filters
          </button>
        )}
      </div>

      {/* Summary bar */}
      <div className="flex items-center justify-between text-xs text-slate-500 px-1">
        <span>{total} team{total !== 1 ? 's' : ''} found</span>
        {pages > 1 && <span>Page {page} of {pages}</span>}
      </div>

      {/* Teams */}
      {loading ? (
        <div className="flex items-center justify-center py-24 text-slate-400">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-slate-700 border-t-primary-400 mr-3" />
          Loading teams…
        </div>
      ) : teams.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-slate-500 space-y-3">
          <div className="w-16 h-16 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center">
            <HiOutlineExclamation className="w-8 h-8" />
          </div>
          <p className="font-medium text-slate-400">No teams found</p>
          <p className="text-sm">Try importing from the Import Teams tab, or adjust your filters.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {teams.map((team) => {
            const busy   = actionLoading.startsWith(team._id);
            const isOpen = expanded === team._id;
            return (
              <div key={team._id} className="bg-slate-800/40 border border-slate-700/50 rounded-2xl overflow-hidden transition-all">
                {/* Main row */}
                <div className="flex items-center gap-4 px-5 py-4">
                  {/* Expand toggle */}
                  <button onClick={() => setExpanded(isOpen ? null : team._id)}
                    className="flex-shrink-0 w-8 h-8 rounded-lg bg-slate-700/50 hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-slate-200 transition-all">
                    {isOpen ? <HiOutlineChevronUp className="w-4 h-4" /> : <HiOutlineChevronDown className="w-4 h-4" />}
                  </button>

                  {/* Team info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-bold text-slate-100 text-sm">{team.teamName}</p>
                      <StatusBadge status={team.selectionStatus} />
                      <PayBadge paid={team.isPaid} />
                      {team.unstopTeamId && (
                        <span className="text-[10px] font-mono text-slate-600 bg-slate-800 px-1.5 rounded">#{team.unstopTeamId}</span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-1 truncate">
                      <span className="text-slate-400">{team.leaderName}</span>
                      <span className="mx-1.5 text-slate-700">·</span>
                      {team.leaderEmail}
                      {team.collegeName && <><span className="mx-1.5 text-slate-700">·</span>{team.collegeName}</>}
                      <span className="mx-1.5 text-slate-700">·</span>
                      {(team.members?.length || 0)} person{(team.members?.length || 0) !== 1 ? 's' : ''}
                    </p>
                  </div>

                  {/* Actions */}
                  <TeamActions
                    team={team} busy={busy}
                    onAction={(action) => setConfirm({ id: team._id, action, teamName: team.teamName })}
                  />
                </div>

                {/* Expanded members table */}
                {isOpen && (
                  <div className="border-t border-slate-700/50 bg-slate-900/40">
                    <div className="px-5 py-3 flex items-center justify-between">
                      <p className="text-xs font-bold uppercase tracking-widest text-slate-500">
                        Members &amp; Leader — {team.members?.length || 0} people
                      </p>
                    </div>
                    {(!team.members || team.members.length === 0) ? (
                      <p className="px-5 pb-4 text-xs text-slate-600">No member data stored for this team.</p>
                    ) : (
                      <div className="overflow-x-auto px-5 pb-4">
                        <table className="w-full text-xs min-w-[700px]">
                          <thead>
                            <tr className="border-b border-slate-700/50">
                              {['Role','Name','Email','Phone','Gender','College','Dept','Year','LinkedIn','GitHub'].map((h) => (
                                <th key={h} className="pb-2 pr-4 text-left text-slate-500 font-semibold uppercase text-[10px] tracking-wider">{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800/80">
                            {team.members.map((m, mi) => (
                              <tr key={mi} className="hover:bg-slate-800/20 transition-colors">
                                <td className="py-2.5 pr-4">
                                  {m.teamRole === 'leader'
                                    ? <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">Leader</span>
                                    : <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-500/10 border border-amber-500/30 text-amber-400">Member</span>}
                                </td>
                                <td className="py-2.5 pr-4 text-slate-300 font-medium whitespace-nowrap">{m.name || '—'}</td>
                                <td className="py-2.5 pr-4 text-slate-400 font-mono whitespace-nowrap">{m.email || '—'}</td>
                                <td className="py-2.5 pr-4 text-slate-400 whitespace-nowrap">{m.phone || '—'}</td>
                                <td className="py-2.5 pr-4 text-slate-400">{m.gender || '—'}</td>
                                <td className="py-2.5 pr-4 text-slate-400 whitespace-nowrap max-w-[140px] truncate">{m.collegeName || '—'}</td>
                                <td className="py-2.5 pr-4 text-slate-400">{m.department || '—'}</td>
                                <td className="py-2.5 pr-4 text-slate-400">{m.year || '—'}</td>
                                <td className="py-2.5 pr-4">
                                  {m.linkedin
                                    ? <a href={m.linkedin} target="_blank" rel="noreferrer" className="text-primary-400 hover:underline">View ↗</a>
                                    : <span className="text-slate-700">—</span>}
                                </td>
                                <td className="py-2.5">
                                  {m.github
                                    ? <a href={m.github} target="_blank" rel="noreferrer" className="text-primary-400 hover:underline">View ↗</a>
                                    : <span className="text-slate-700">—</span>}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center justify-center gap-3 pt-2">
          <button disabled={page <= 1} onClick={() => fetchTeams(page - 1)}
            className="px-4 py-2 rounded-xl border border-slate-600 text-slate-400 disabled:opacity-30 hover:text-white hover:border-slate-400 text-sm transition-colors">
            ← Prev
          </button>
          <span className="text-slate-500 text-sm">{page} / {pages}</span>
          <button disabled={page >= pages} onClick={() => fetchTeams(page + 1)}
            className="px-4 py-2 rounded-xl border border-slate-600 text-slate-400 disabled:opacity-30 hover:text-white hover:border-slate-400 text-sm transition-colors">
            Next →
          </button>
        </div>
      )}

      {confirm && <ConfirmModal confirm={confirm} onConfirm={doAction} onCancel={() => setConfirm(null)} />}
    </div>
  );
}

// ─── Team action buttons ──────────────────────────────────────────────────────
function TeamActions({ team, busy, onAction }) {
  const s = team.selectionStatus;
  return (
    <div className="flex items-center gap-1.5 flex-shrink-0 flex-wrap justify-end">
      {s === 'waitlisted' && (
        <Btn label="Promote" cls="text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10" disabled={busy} onClick={() => onAction('promote')} />
      )}
      {(s === 'selected' || s === 'waitlisted') && (
        <Btn label="Suspend" cls="text-orange-400 border-orange-500/30 hover:bg-orange-500/10" disabled={busy} onClick={() => onAction('suspend')} />
      )}
      {(s === 'suspended' || s === 'removed') && (
        <Btn label="Restore" cls="text-primary-400 border-primary-500/30 hover:bg-primary-500/10" disabled={busy} onClick={() => onAction('restore')} />
      )}
      {/* Delete (cascade) — always visible, destructive */}
      <Btn label="Delete" cls="text-red-400 border-red-500/30 hover:bg-red-500/10 font-bold" disabled={busy} onClick={() => onAction('delete')} />
      {busy && <div className="animate-spin rounded-full h-4 w-4 border-2 border-slate-700 border-t-primary-400 ml-1" />}
    </div>
  );
}

function Btn({ label, cls, disabled, onClick }) {
  return (
    <button disabled={disabled} onClick={onClick}
      className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all disabled:opacity-30 ${cls}`}>
      {label}
    </button>
  );
}

// ─── Confirm modal ────────────────────────────────────────────────────────────
const ACTION_META = {
  promote:     { title: 'Promote to Selected',  desc: 'Team will be able to complete payment on the registration portal.', btn: 'bg-emerald-600 hover:bg-emerald-700' },
  suspend:     { title: 'Suspend Team',          desc: 'Registration will be cancelled. Team cannot pay until restored.', btn: 'bg-orange-600 hover:bg-orange-700' },
  restore:     { title: 'Restore Team',          desc: 'Team moved back to Selected and payment will be re-enabled.', btn: 'bg-primary-600 hover:bg-primary-700' },
  delete:      { title: 'Delete Team (Cascade)', desc: 'Permanently deletes the HackathonTeam, Registration, Team, TeamMember records, and the leader User account if they have no other registrations. This cannot be undone.', btn: 'bg-red-600 hover:bg-red-700', confirmWord: 'Delete Permanently' },
  deleteBatch: { title: 'Delete Entire Batch',   desc: 'Permanently deletes ALL teams in this import batch and all their related records. Use this to clean up a partial import before re-importing. This cannot be undone.', btn: 'bg-red-600 hover:bg-red-700', confirmWord: 'Delete Entire Batch' },
};

function ConfirmModal({ confirm, onConfirm, onCancel }) {
  const m = ACTION_META[confirm.action] || { title: confirm.action, desc: '', btn: 'bg-primary-600' };
  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-sm p-6 space-y-5 shadow-2xl">
        <div>
          <p className="text-lg font-bold text-white">{m.title}</p>
          <p className="text-sm text-slate-400 mt-1">
            Team: <span className="font-semibold text-slate-200">{confirm.teamName}</span>
          </p>
          <p className="text-sm text-slate-500 mt-2">{m.desc}</p>
        </div>
        <div className="flex gap-3">
          <button onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl border border-slate-600 text-slate-300 hover:text-white text-sm font-medium transition-colors">
            Cancel
          </button>
          <button onClick={onConfirm}
            className={`flex-1 py-2.5 rounded-xl text-white text-sm font-bold transition-colors ${m.btn}`}>
            {m.confirmWord || 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  );
}
