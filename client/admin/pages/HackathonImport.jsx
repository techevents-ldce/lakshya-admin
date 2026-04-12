import { useState, useRef, useEffect, useCallback, Fragment } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  HiOutlineUpload,
  HiOutlineDatabase,
  HiOutlineCheckCircle,
  HiOutlineExclamationCircle,
  HiOutlineTrash,
  HiOutlineRefresh,
  HiOutlineChevronRight,
  HiOutlineChevronLeft,
  HiOutlineX,
  HiOutlineSearch,
  HiOutlineInformationCircle,
  HiOutlineShieldCheck,
  HiOutlineChip,
  HiOutlineBeaker,
  HiOutlineFolderOpen,
  HiOutlineUserGroup,
  HiOutlineFilter,
  HiOutlineTrendingUp,
  HiOutlineBan,
  HiOutlineTrash as HiOutlineTrashAlternative,
  HiOutlineDotsHorizontal,
  HiOutlinePhone,
} from 'react-icons/hi';
import api from '../../src/services/api';
import toast from 'react-hot-toast';
import ConfirmWithPassword from '../components/ConfirmWithPassword';
import { useAuth } from '../context/AuthContext';

const STEPS = [
  { id: 'upload', label: 'Upload File', icon: HiOutlineUpload },
  { id: 'mapping', label: 'Map Columns', icon: HiOutlineChip },
  { id: 'verification', label: 'Verify Data', icon: HiOutlineShieldCheck },
  { id: 'import', label: 'Finalize Import', icon: HiOutlineDatabase }
];

const COLUMN_OPTIONS = [
  { value: 'email',        label: 'Email',          required: true },
  { value: 'name',         label: 'Full Name',      required: true },
  { value: 'phone',        label: 'Phone Number',   required: true },
  { value: 'teamName',     label: 'Team Name',      required: true },
  { value: 'collegeName',  label: 'College',        required: true },
  { value: 'teamRole',     label: 'Team Role',      required: false },
  { value: 'unstopTeamId', label: 'Unstop Team ID', required: false },
  { value: 'status',       label: 'Selection Status', required: false },
  { value: 'gender',       label: 'Gender',         required: false },
  { value: 'department',   label: 'Department',     required: false },
  { value: 'year',         label: 'Year of Study',  required: false },
  { value: 'linkedin',     label: 'LinkedIn URL',   required: false },
  { value: 'github',       label: 'GitHub URL',     required: false },
];

const SELECTION_STATUS_CONFIG = {
  selected: { label: 'Selected', color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/30' },
  waitlisted: { label: 'Waitlisted', color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/30' },
  suspended: { label: 'Suspended', color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/30' },
  removed: { label: 'Removed', color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/30' },
};

export default function HackathonImport() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [viewMode, setViewMode] = useState('manage'); 
  
  const [step, setStep] = useState('upload');
  const [file, setFile] = useState(null);
  const [tempFileName, setTempFileName] = useState('');
  const [uploading, setUploading] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [headers, setHeaders] = useState([]);
  const [mappings, setMappings] = useState({});
  const [previewData, setPreviewData] = useState([]);
  const [validationResults, setValidationResults] = useState(null);
  const [importing, setImporting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const fileInputRef = useRef(null);

  const [teams, setTeams] = useState([]);
  const [batches, setBatches] = useState([]);
  const [loadingTeams, setLoadingTeams] = useState(false);
  const [totalTeams, setTotalTeams] = useState(0);
  const [teamPage, setTeamPage] = useState(1);
  const [teamSearch, setTeamSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [batchFilter, setBatchFilter] = useState('');
  const [expandedTeam, setExpandedTeam] = useState(null);
  const [confirmModal, setConfirmModal] = useState({ open: false, title: '', message: '', confirmLabel: '', variant: 'warning', action: null });

  const fetchTeams = async () => {
    if (viewMode !== 'manage') return;
    setLoadingTeams(true);
    try {
      const params = { page: teamPage, limit: 15, search: teamSearch };
      if (statusFilter) params.selectionStatus = statusFilter;
      if (batchFilter) params.importBatch = batchFilter;
      
      const { data } = await api.get('/hackathon/teams', { params });
      setTeams(data.teams || []);
      setTotalTeams(data.total || 0);
    } catch { toast.error('Failed to load hackathon teams'); }
    finally { setLoadingTeams(false); }
  };

  const fetchBatches = async () => {
    try {
      const { data } = await api.get('/hackathon/batches');
      setBatches(data.data || []);
    } catch {}
  };

  useEffect(() => {
    if (viewMode === 'manage') {
      fetchTeams();
      fetchBatches();
    }
  }, [viewMode, teamPage, teamSearch, statusFilter, batchFilter]);

  const handleAction = (teamId, teamName, actionType) => {
    let title, message, confirmLabel, variant, endpoint, method = 'PATCH';
    
    switch(actionType) {
      case 'promote':
        title = 'Promote Team';
        message = `You are about to promote "${teamName}" to Selected. This will unlock the payment flow for all team members.`;
        confirmLabel = 'PROMOTE TEAM';
        variant = 'emerald';
        endpoint = `/hackathon/teams/${teamId}/promote`;
        break;
      case 'suspend':
        title = 'Suspend Team';
        message = `You are about to suspend "${teamName}". Team members will no longer be able to proceed with payments.`;
        confirmLabel = 'SUSPEND TEAM';
        variant = 'warning';
        endpoint = `/hackathon/teams/${teamId}/suspend`;
        break;
      case 'restore':
        title = 'Restore Team';
        message = `You are about to restore "${teamName}" to Selected status.`;
        confirmLabel = 'RESTORE TEAM';
        variant = 'emerald';
        endpoint = `/hackathon/teams/${teamId}/restore`;
        break;
      case 'remove':
        title = 'Remove Team';
        message = `Are you sure you want to remove "${teamName}"? This will withdraw them from the selection list.`;
        confirmLabel = 'REMOVE TEAM';
        variant = 'danger';
        endpoint = `/hackathon/teams/${teamId}/remove`;
        break;
      case 'delete':
        title = 'Delete Record';
        message = `CRITICAL: You are about to permanently DELETE "${teamName}" and all its members from the hackathon database. This is irreversible.`;
        confirmLabel = 'DELETE PERMANENTLY';
        variant = 'danger';
        endpoint = `/hackathon/teams/${teamId}`;
        method = 'DELETE';
        break;
    }

    setConfirmModal({
      open: true, title, message, confirmLabel, variant,
      action: async (password) => {
        if (method === 'PATCH') await api.patch(endpoint, { adminPassword: password });
        else await api.delete(endpoint, { data: { adminPassword: password } });
        toast.success(`Action: ${confirmLabel} completed`);
        fetchTeams();
      }
    });
  };

  const handleFileSelect = async (e) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    
    setFile(selectedFile);
    setParsing(true);
    
    const formData = new FormData();
    formData.append('file', selectedFile);
    
    try {
      const { data } = await api.post('/hackathon/import-parse', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      setHeaders(data.data.headers);
      setPreviewData(data.data.preview);
      setTempFileName(data.data.tempFileName);
      
      const initialMappings = {};
      data.data.headers.forEach(header => {
        const lowerH = header.toLowerCase().replace(/[^a-z]/g, '');
        if (lowerH.includes('email')) initialMappings[header] = 'email';
        else if (lowerH.includes('name') && !lowerH.includes('team')) initialMappings[header] = 'name';
        else if (lowerH.includes('phone') || lowerH.includes('contact') || lowerH.includes('mobile')) initialMappings[header] = 'phone';
        else if (lowerH.includes('team') || lowerH.includes('unit')) initialMappings[header] = 'teamName';
        else if (lowerH.includes('college') || lowerH.includes('inst')) initialMappings[header] = 'college';
      });
      setMappings(initialMappings);
      setStep('mapping');
    } catch (err) {
      toast.error(err.userMessage || 'Failed to parse file');
      setFile(null);
    } finally {
      setParsing(false);
    }
  };

  const handleMapChange = (header, value) => {
    setMappings(prev => {
      const next = { ...prev };
      if (value === 'unmapped') delete next[header];
      else next[header] = value;
      return next;
    });
  };

  const validateMappings = () => {
    const mappedValues = Object.values(mappings);
    const missing = COLUMN_OPTIONS.filter(opt => opt.required && !mappedValues.includes(opt.value));
    if (missing.length > 0) {
      toast.error(`Missing required columns: ${missing.map(m => m.label).join(', ')}`);
      return false;
    }
    return true;
  };

  const runValidation = async () => {
    if (!validateMappings()) return;
    
    setParsing(true);
    try {
      const { data } = await api.post('/hackathon/import-validate', {
        headers,
        mappings,
        fileName: tempFileName
      });
      setValidationResults(data.data);
      setStep('verification');
    } catch (err) {
      toast.error('Data validation failed');
    } finally {
      setParsing(false);
    }
  };

  const executeImport = async (password) => {
    setImporting(true);
    try {
      const { data } = await api.post('/hackathon/import-execute', {
        adminPassword: password,
        mappings,
        fileName: tempFileName
      });
      toast.success(`Import successful: ${data.data.importedCount} teams imported`);
      resetImportState();
      setViewMode('manage');
    } catch (err) {
      toast.error('Failed to import data');
    } finally {
      setImporting(false);
      setShowConfirm(false);
    }
  };

  const resetImportState = () => {
    setStep('upload');
    setFile(null);
    setHeaders([]);
    setMappings({});
    setPreviewData([]);
    setValidationResults(null);
    setTempFileName('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="animate-fade-in space-y-8">
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight uppercase leading-none mb-2">Hackathon Management</h1>
          <p className="text-slate-500 font-medium">Manage team selections and import participant data</p>
        </div>

        <div className="flex items-center gap-2 p-1.5 bg-slate-900/60 rounded-2xl border border-slate-700/30 backdrop-blur-xl">
           <button 
             onClick={() => setViewMode('manage')}
             className={`px-8 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all ${viewMode === 'manage' ? 'bg-primary-500 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}
           >
             Manage Teams
           </button>
           <button 
             onClick={() => setViewMode('import')}
             className={`px-8 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all ${viewMode === 'import' ? 'bg-primary-500 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}
           >
             Import Data
           </button>
        </div>
      </div>

      {viewMode === 'manage' ? (
        <div className="space-y-6">
           <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-4 bg-slate-900/40 p-3 rounded-2xl border border-slate-700/30 backdrop-blur-xl transition-all shadow-xl">
              <div className="relative group flex-1 min-w-[300px]">
                <HiOutlineSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-primary-400 w-5 h-5 transition-colors" />
                <input 
                  type="text" 
                  placeholder="Search by team name or member email..." 
                  value={teamSearch} 
                  onChange={(e) => { setTeamSearch(e.target.value); setTeamPage(1); }} 
                  className="input-field pl-12" 
                />
              </div>
              
              <div className="flex flex-wrap items-center gap-4 px-2">
                <div className="h-8 w-px bg-slate-800 hidden lg:block"></div>
                <div className="flex items-center gap-2 group px-4 py-2 hover:bg-white/[0.02] rounded-xl transition-all cursor-pointer">
                   <HiOutlineFilter className="w-4 h-4 text-slate-500 group-hover:text-primary-400" />
                   <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setTeamPage(1); }} className="bg-transparent text-[10px] font-bold text-slate-400 uppercase tracking-wider outline-none cursor-pointer">
                     <option value="" className="bg-slate-900">All Status</option>
                     {Object.entries(SELECTION_STATUS_CONFIG).map(([key, cfg]) => (
                       <option key={key} value={key} className="bg-slate-900">{cfg.label}</option>
                     ))}
                   </select>
                </div>

                <div className="h-8 w-px bg-slate-800 hidden lg:block"></div>
                <div className="flex items-center gap-2 group px-4 py-2 hover:bg-white/[0.02] rounded-xl transition-all cursor-pointer">
                   <HiOutlineFolderOpen className="w-4 h-4 text-slate-500 group-hover:text-primary-400" />
                   <select value={batchFilter} onChange={(e) => { setBatchFilter(e.target.value); setTeamPage(1); }} className="bg-transparent text-[10px] font-bold text-slate-400 uppercase tracking-wider outline-none cursor-pointer max-w-[150px]">
                     <option value="" className="bg-slate-900">All Batches</option>
                     {batches.map(b => <option key={b} value={b} className="bg-slate-900">{b}</option>)}
                   </select>
                </div>
              </div>
           </div>

           {loadingTeams ? (
             <div className="flex flex-col items-center justify-center py-32 gap-6">
                <HiOutlineRefresh className="w-12 h-12 text-primary-500 animate-spin" />
                <p className="text-[11px] font-bold text-slate-600 uppercase tracking-[0.4em] animate-pulse">Loading Hackathon Data...</p>
             </div>
           ) : (
             <div className="card !p-0 border-slate-700/30 overflow-hidden shadow-2xl bg-slate-900/20 backdrop-blur-xl">
               <div className="overflow-x-auto">
                 <table className="w-full text-left">
                   <thead>
                     <tr className="bg-white/[0.01]">
                       <th className="px-6 py-6 text-[9px] font-bold text-slate-600 uppercase tracking-wider">Team Information</th>
                       <th className="px-6 py-6 text-[9px] font-bold text-slate-600 uppercase tracking-wider">Members</th>
                       <th className="px-6 py-6 text-[9px] font-bold text-slate-600 uppercase tracking-wider">Status</th>
                       <th className="px-6 py-6 text-[9px] font-bold text-slate-600 uppercase tracking-wider">Batch</th>
                       <th className="px-6 py-6 text-[9px] font-bold text-slate-600 uppercase tracking-wider text-right">Actions</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-white/[0.02]">
                     {teams.map((t) => (
                       <Fragment key={t._id}>
                         <tr className={`group hover:bg-white/[0.02] transition-all cursor-pointer ${expandedTeam === t._id ? 'bg-primary-500/[0.03] border-l-2 border-l-primary-500' : ''}`} onClick={() => setExpandedTeam(expandedTeam === t._id ? null : t._id)}>
                          <td className="px-6 py-6">
                            <div className="flex items-center gap-4">
                               <div className="w-10 h-10 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-sm font-bold text-slate-500 group-hover:bg-primary-500 group-hover:text-white transition-all shadow-xl">
                                 {t.teamName?.[0]?.toUpperCase()}
                               </div>
                               <div>
                                 <p className="text-sm font-bold text-white group-hover:text-primary-400 transition-colors tracking-tight uppercase leading-none mb-1.5">{t.teamName}</p>
                                 <p className="text-[10px] text-slate-600 font-bold uppercase tracking-tight line-clamp-1">{t.leaderId?.name || 'Unknown Leader'}</p>
                               </div>
                            </div>
                          </td>
                          <td className="px-6 py-6">
                             <div className="flex flex-col gap-1">
                                {t.members?.map(m => (
                                  <p key={m._id} className="text-[10px] text-slate-400 font-bold uppercase tracking-tight truncate max-w-[150px]">{m.userId?.name || m.userId?.email}</p>
                                ))}
                             </div>
                          </td>
                          <td className="px-6 py-6">
                             <span className={`px-3 py-1 rounded-full text-[8px] font-bold uppercase tracking-wider border ${SELECTION_STATUS_CONFIG[t.selectionStatus]?.bg} ${SELECTION_STATUS_CONFIG[t.selectionStatus]?.color}`}>
                                {SELECTION_STATUS_CONFIG[t.selectionStatus]?.label || t.selectionStatus}
                             </span>
                          </td>
                          <td className="px-6 py-6">
                             <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider truncate max-w-[100px]">{t.importBatch || 'Direct'}</p>
                          </td>
                          <td className="px-6 py-6 text-right" onClick={(ev) => ev.stopPropagation()}>
                            <div className="flex items-center justify-end gap-2">
                               {t.selectionStatus === 'waitlisted' && (
                                 <button onClick={() => handleAction(t._id, t.teamName, 'promote')} className="w-9 h-9 flex items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500 hover:text-white border border-emerald-500/20 transition-all shadow-xl active:scale-95" title="Promote to Selected">
                                   <HiOutlineTrendingUp className="w-5 h-5" />
                                 </button>
                               )}
                               {t.selectionStatus === 'selected' && (
                                 <button onClick={() => handleAction(t._id, t.teamName, 'suspend')} className="w-9 h-9 flex items-center justify-center rounded-xl bg-amber-500/10 text-amber-400 hover:bg-amber-500 hover:text-white border border-amber-500/20 transition-all shadow-xl active:scale-95" title="Suspend Team">
                                   <HiOutlineBan className="w-5 h-5" />
                                 </button>
                               )}
                               {(t.selectionStatus === 'suspended' || t.selectionStatus === 'removed') && (
                                 <button onClick={() => handleAction(t._id, t.teamName, 'restore')} className="w-9 h-9 flex items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500 hover:text-white border border-emerald-500/20 transition-all shadow-xl active:scale-95" title="Restore Team">
                                   <HiOutlineRefresh className="w-5 h-5" />
                                 </button>
                               )}
                               {t.selectionStatus !== 'removed' && (
                                 <button onClick={() => handleAction(t._id, t.teamName, 'remove')} className="w-9 h-9 flex items-center justify-center rounded-xl bg-red-400/10 text-red-400 hover:bg-red-400 hover:text-white border border-red-500/20 transition-all shadow-xl active:scale-95" title="Remove Team">
                                   <HiOutlineTrash className="w-5 h-5" />
                                 </button>
                               )}
                               <button onClick={() => handleAction(t._id, t.teamName, 'delete')} className="w-9 h-9 flex items-center justify-center rounded-xl bg-slate-800 text-slate-400 hover:bg-red-500 hover:text-white transition-all shadow-xl active:scale-95" title="Delete Permanently">
                                 <HiOutlineTrashAlternative className="w-5 h-5" />
                               </button>
                            </div>
                          </td>
                        </tr>
                        {expandedTeam === t._id && (
                          <tr className="bg-slate-900/40 backdrop-blur-3xl animate-fade-in relative z-10">
                            <td colSpan="5" className="px-12 py-10">
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                {t.members?.map((m, idx) => (
                                  <div key={idx} className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.05] space-y-3 hover:border-primary-500/30 transition-all group">
                                    <div className="flex items-center justify-between">
                                      <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">{m.teamRole || 'Member'}</span>
                                      {m.teamRole === 'leader' && <span className="px-2 py-0.5 rounded-lg bg-emerald-500/20 text-emerald-400 text-[8px] font-bold uppercase tracking-wider">LEADER</span>}
                                    </div>
                                    <div className="space-y-1">
                                      <p className="text-sm font-bold text-white uppercase tracking-tight truncate">{m.name}</p>
                                      <p className="text-[10px] text-slate-500 font-bold lowercase tracking-tight truncate">{m.email}</p>
                                    </div>
                                    {m.phone && (
                                      <div className="pt-2 flex items-center gap-2 border-t border-white/[0.05]">
                                        <HiOutlinePhone className="w-3 h-3 text-primary-500" />
                                        <span className="text-[10px] text-slate-400 font-bold tabular-nums">{m.phone}</span>
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                              <div className="mt-8 pt-6 border-t border-white/[0.05] flex items-center justify-between">
                                 <p className="text-[10px] font-bold text-slate-600 uppercase tracking-[0.4em]">Team ID: {t._id}</p>
                                 <div className="flex gap-4">
                                    {t.unstopTeamId && <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider p-2 bg-white/[0.03] rounded-lg border border-white/[0.05]">UNSTOP ID: {t.unstopTeamId}</span>}
                                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider p-2 bg-white/[0.03] rounded-lg border border-white/[0.05]">TOTAL MEMBERS: {t.members?.length || 0}</span>
                                 </div>
                              </div>
                            </td>
                          </tr>
                        )}
                       </Fragment>
                     ))}
                     {teams.length === 0 && (
                       <tr>
                         <td colSpan="5" className="text-center py-40">
                           <HiOutlineSearch className="w-16 h-16 text-slate-800 mx-auto mb-6" />
                           <p className="text-[11px] font-bold text-slate-600 uppercase tracking-[0.4em]">No hackathon teams found</p>
                         </td>
                       </tr>
                     )}
                   </tbody>
                 </table>
               </div>
             </div>
           )}
        </div>
      ) : (
        <div className="space-y-8 animate-scale-in">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-2 rounded-3xl bg-slate-950/50 border border-white/[0.05]">
            {STEPS.map((s, i) => {
              const isActive = step === s.id;
              const isDone = STEPS.findIndex(st => st.id === step) > i;
              const Icon = s.icon;
              return (
                <div key={s.id} className={`relative flex items-center gap-4 p-4 rounded-2xl transition-all duration-300 ${isActive ? 'bg-primary-500/10 border border-primary-500/30 shadow-[0_0_20px_rgba(59,130,246,0.1)]' : 'opacity-40 grayscale filter'}`}>
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${isActive ? 'bg-primary-500 text-white shadow-[0_0_15px_rgba(59,130,246,0.5)]' : isDone ? 'bg-emerald-500 text-white' : 'bg-slate-900 text-slate-500'}`}>
                    {isDone ? <HiOutlineCheckCircle className="w-6 h-6" /> : <Icon className="w-5 h-5" />}
                  </div>
                  <div>
                    <p className="text-[10px] font-bold tracking-wider text-slate-500 uppercase">Phase 0{i+1}</p>
                    <p className={`text-[11px] font-bold uppercase tracking-tight ${isActive ? 'text-white' : 'text-slate-400'}`}>{s.label}</p>
                  </div>
                  {i < STEPS.length - 1 && (
                    <div className="hidden md:block absolute -right-2 top-1/2 -translate-y-1/2 z-10">
                      <HiOutlineChevronRight className="w-4 h-4 text-slate-800" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="animate-scale-in">
            {step === 'upload' && (
              <div className="card py-32 flex flex-col items-center justify-center border-slate-700/30 relative overflow-hidden group">
                <div className="absolute inset-0 bg-primary-500/5 blur-[100px] pointer-events-none group-hover:bg-primary-500/10 transition-all"></div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="nexus-upload"
                />
                <label htmlFor="nexus-upload" className="cursor-pointer flex flex-col items-center text-center">
                  <div className="w-20 h-20 rounded-3xl bg-slate-950 border border-slate-700 flex items-center justify-center text-slate-600 mb-6 group-hover:text-primary-400 group-hover:border-primary-500/50 group-hover:bg-primary-500/10 transition-all duration-500 shadow-2xl">
                    {parsing ? <HiOutlineRefresh className="w-10 h-10 animate-spin text-primary-500" /> : <HiOutlineUpload className="w-10 h-10" />}
                  </div>
                  <h2 className="text-xl font-bold text-white uppercase tracking-tight mb-2">{parsing ? 'PARSING FILE...' : 'UPLOAD CSV / XLSX'}</h2>
                  <p className="text-sm text-slate-500 font-bold uppercase tracking-wider max-w-sm">Select a file containing participant and team data</p>
                  {!parsing && <span className="mt-8 px-8 py-3 rounded-full bg-white/[0.05] border border-white/[0.1] text-[10px] font-bold uppercase tracking-[0.3em] text-slate-400 group-hover:bg-primary-500 group-hover:text-white group-hover:border-transparent transition-all">Select File</span>}
                </label>
              </div>
            )}

            {step === 'mapping' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-6">
                  {/* Mapping Info & Password */}
                  <div className="bg-primary-500/5 border border-primary-500/20 rounded-2xl p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <h4 className="flex items-center gap-2 text-primary-400 font-bold text-xs uppercase tracking-wider">
                          <HiOutlineExclamationCircle className="w-4 h-4" /> Required Mapping
                        </h4>
                        <p className="text-[10px] text-slate-400 leading-relaxed font-medium uppercase tracking-tight">
                          Email, Name, Phone, Team Name, and College are mandatory for successful import.
                        </p>
                      </div>
                      <div className="space-y-2 md:border-l md:border-white/10 md:pl-6">
                        <h4 className="flex items-center gap-2 text-blue-400 font-bold text-xs uppercase tracking-wider">
                          <HiOutlineShieldCheck className="w-4 h-4" /> Default Password
                        </h4>
                        <div className="flex items-center gap-3">
                          <code className="bg-blue-500/10 px-3 py-1.5 rounded-lg text-white font-mono text-xs border border-blue-500/30">
                            Lakshya@2025
                          </code>
                          <span className="text-[9px] text-slate-500 font-bold uppercase tracking-tight">
                            For new accounts
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="card space-y-6 border-slate-700/30">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2">
                        <HiOutlineChip className="w-4 h-4 text-primary-400" /> Column Mapping
                      </h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {headers.map(header => (
                        <div key={header} className="p-4 rounded-2xl bg-slate-950/50 border border-white/[0.05] flex flex-col gap-3 group hover:border-primary-500/30 transition-all">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight truncate max-w-[150px]">{header}</span>
                          <select
                            value={mappings[header] || 'unmapped'}
                            onChange={(e) => handleMapChange(header, e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider text-white appearance-none cursor-pointer focus:border-primary-500/50 focus:ring-1 focus:ring-primary-500/20 transition-all"
                          >
                            <option value="unmapped">Unmapped</option>
                            {COLUMN_OPTIONS.map(opt => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label} {opt.required ? '*' : ''}
                              </option>
                            ))}
                          </select>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="card border-slate-700/30">
                    <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-4">Preview (Top 5 rows)</h3>
                    <div className="overflow-x-auto rounded-2xl border border-white/[0.05]">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-white/[0.02] border-b border-white/[0.05]">
                            {headers.map(h => (
                              <th key={h} className="px-5 py-3 text-[9px] font-bold text-slate-600 uppercase tracking-wider whitespace-nowrap">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/[0.02]">
                          {previewData.map((row, i) => (
                            <tr key={i} className="hover:bg-white/[0.01] transition-all">
                              {headers.map(h => (
                                <td key={h} className="px-5 py-3 text-[10px] text-slate-400 font-bold tracking-tight whitespace-nowrap">{row[h] || '—'}</td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="card mb-6 border-slate-700/30 space-y-6">
                    <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2">
                      <HiOutlineInformationCircle className="w-4 h-4 text-primary-400" /> Import Rules
                    </h3>
                    <div className="space-y-4">
                       <div className="p-4 rounded-xl bg-orange-500/5 border border-orange-500/20">
                          <p className="text-[10px] font-bold text-orange-200 uppercase tracking-wider mb-1">Mapping Guide:</p>
                          <ul className="text-[9px] text-orange-300 font-bold uppercase tracking-tight space-y-2 list-disc pl-4">
                            <li>Groups rows by Team Name</li>
                            <li>leader role initiates registration</li>
                            <li>member role adds to Team Members</li>
                          </ul>
                       </div>
                    </div>
                    <button
                      onClick={runValidation}
                      className="btn-primary w-full py-4 text-[11px] font-bold uppercase tracking-[0.2em] shadow-xl shadow-primary-900/40 active:scale-95 transition-all flex items-center justify-center gap-3"
                    >
                      <HiOutlineShieldCheck className="w-5 h-5" /> VERIFY DATA
                    </button>
                  </div>
                </div>
              </div>
            )}

            {step === 'verification' && validationResults && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-8">
                   <div className="grid grid-cols-3 gap-6">
                      <div className="card border-slate-700/30 text-center space-y-2 relative overflow-hidden group">
                         <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">VALID RECORDS</p>
                         <p className="text-4xl font-bold text-emerald-400 tracking-tight">{validationResults.validCount}</p>
                      </div>
                      <div className="card border-slate-700/30 text-center space-y-2 relative overflow-hidden group">
                         <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">INVALID</p>
                         <p className="text-4xl font-bold text-red-400 tracking-tight">{validationResults.invalidCount}</p>
                      </div>
                      <div className="card border-slate-700/30 text-center space-y-2 relative overflow-hidden group">
                         <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">DUPLICATES</p>
                         <p className="text-4xl font-bold text-amber-400 tracking-tight">{validationResults.duplicateCount}</p>
                      </div>
                   </div>

                   <div className="card border-slate-700/30">
                      <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                        <HiOutlineDatabase className="w-4 h-4 text-primary-400" /> VALID RECORDS PREVIEW
                      </h3>
                      <div className="overflow-x-auto rounded-2xl border border-white/[0.05]">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-white/[0.02] border-b border-white/[0.05]">
                               <th className="px-5 py-3 text-[9px] font-bold text-slate-600 uppercase tracking-wider">Name</th>
                               <th className="px-5 py-3 text-[9px] font-bold text-slate-600 uppercase tracking-wider">Team</th>
                               <th className="px-5 py-3 text-[9px] font-bold text-slate-600 uppercase tracking-wider">Email</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/[0.02]">
                            {validationResults.validNodesPreview.map((node, i) => (
                              <tr key={i} className="hover:bg-white/[0.01] transition-all">
                                <td className="px-5 py-4 text-[11px] font-bold text-white uppercase tracking-tight">{node.name}</td>
                                <td className="px-5 py-4">
                                  <span className="text-[10px] font-bold text-primary-400 uppercase tracking-wider p-2 bg-primary-500/5 border border-primary-500/10 rounded-lg">{node.teamName}</span>
                                </td>
                                <td className="px-5 py-4 text-[10px] text-slate-500 font-bold lowercase tracking-tight">{node.email}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                   </div>
                </div>

                <div className="space-y-6">
                   <div className="card border-slate-700/30 space-y-6">
                     <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2">
                       <HiOutlineShieldCheck className="w-4 h-4 text-primary-400" /> Ingestion Summary
                     </h3>
                     <div className="space-y-4">
                        <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                           <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">File:</span>
                           <span className="text-[10px] font-bold text-white uppercase tracking-tight truncate max-w-[100px]">{file.name}</span>
                        </div>
                     </div>
                     
                     <div className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/20 text-[9px] text-blue-300 font-bold uppercase tracking-tight leading-relaxed">
                        Final import will create user accounts and teams. This action cannot be easily undone.
                     </div>

                     <div className="flex flex-col gap-3">
                        <button
                          onClick={() => setShowConfirm(true)}
                          disabled={validationResults.validCount === 0}
                          className="btn-primary w-full py-4 text-[11px] font-bold uppercase tracking-[0.3em] shadow-xl shadow-primary-900/40 active:scale-95 disabled:opacity-30 transition-all flex items-center justify-center gap-3"
                        >
                          <HiOutlineDatabase className="w-5 h-5" /> START IMPORT
                        </button>
                        <button onClick={resetImportState} className="btn-outline w-full py-4 text-[11px] font-bold uppercase tracking-[0.2em]">Reset</button>
                     </div>
                   </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <ConfirmWithPassword
        open={confirmModal.open}
        onClose={() => setConfirmModal((prev) => ({ ...prev, open: false }))}
        onConfirm={confirmModal.action}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmLabel={confirmModal.confirmLabel}
        variant={confirmModal.variant === 'danger' ? 'danger' : 'warning'}
      />

      <div className="mb-6">
        <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-start gap-3">
          <HiOutlineInformationCircle className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-blue-100 font-medium">Default Participant Password</p>
            <p className="text-xs text-blue-200/70 mt-1">
              New accounts will be created with: <code className="bg-blue-500/20 px-1.5 py-0.5 rounded text-white font-mono">Lakshya@2025</code>
            </p>
          </div>
        </div>
      </div>

      <ConfirmWithPassword
        open={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={executeImport}
        title="Finalize Data Import"
        message={`This will create/update up to ${validationResults?.validCount} records. This action is recorded in the audit logs.`}
        confirmLabel="Execute Import"
        loading={importing}
      />
    </div>
  );
}
