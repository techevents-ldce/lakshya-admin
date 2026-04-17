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
  HiOutlineX,
  HiOutlineSearch,
  HiOutlineInformationCircle,
  HiOutlineShieldCheck,
  HiOutlineChip,
  HiOutlineFolderOpen,
  HiOutlineUserGroup,
  HiOutlineFilter,
  HiOutlineTrendingUp,
  HiOutlineBan,
  HiOutlineDotsHorizontal,
  HiOutlinePhone,
  HiOutlineDownload,
} from 'react-icons/hi';
import { 
  Chart as ChartJS, 
  CategoryScale, 
  LinearScale, 
  BarElement, 
  Title, 
  Tooltip, 
  Legend, 
  ArcElement 
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);
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
  { value: 'referralCode',    label: 'Referral Code',   required: false },
  { value: 'defaultPassword', label: 'Default Password', required: false },
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
  const [globalPaidTeams, setGlobalPaidTeams] = useState(0);
  const [globalUnpaidTeams, setGlobalUnpaidTeams] = useState(0);
  const [teamPages, setTeamPages] = useState(0);
  const [teamPage, setTeamPage] = useState(1);
  const [teamSearch, setTeamSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [batchFilter, setBatchFilter] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('');
  const [memberCountFilter, setMemberCountFilter] = useState('');
  const [expandedTeam, setExpandedTeam] = useState(null);
  const [confirmModal, setConfirmModal] = useState({ open: false, title: '', message: '', confirmLabel: '', variant: 'warning', action: null });
  const [stats, setStats] = useState(null);
  const [loadingStats, setLoadingStats] = useState(false);

  const fetchTeams = async () => {
    if (viewMode !== 'manage') return;
    setLoadingTeams(true);
    try {
      const params = { page: teamPage, limit: 15, search: teamSearch };
      if (statusFilter) params.selectionStatus = statusFilter;
      if (batchFilter) params.importBatch = batchFilter;
      if (paymentFilter) params.paymentStatus = paymentFilter;
      if (memberCountFilter) params.memberCount = memberCountFilter;
      
      const { data } = await api.get('/hackathon/teams', { params });
      setTeams(data.data.teams || []);
      setTotalTeams(data.data.total || 0);
      setTeamPages(data.data.pages || 0);

      // Async fetch global paid/unpaid totals for the same filters
      try {
        const baseParams = { limit: 1 };
        if (statusFilter) baseParams.selectionStatus = statusFilter;
        if (batchFilter) baseParams.importBatch = batchFilter;
        if (memberCountFilter) baseParams.memberCount = memberCountFilter;
        if (teamSearch) baseParams.search = teamSearch;
        
        const paidRes = await api.get('/hackathon/teams', { params: { ...baseParams, paymentStatus: 'paid' } });
        setGlobalPaidTeams(paidRes.data.data.total || 0);
        
        const unpaidRes = await api.get('/hackathon/teams', { params: { ...baseParams, paymentStatus: 'unpaid' } });
        setGlobalUnpaidTeams(unpaidRes.data.data.total || 0);
      } catch (err) {
        // Silently ignore if counts fail
      }
    } catch { toast.error('Failed to load hackathon teams'); }
    finally { setLoadingTeams(false); }
  };

  const fetchBatches = async () => {
    try {
      const { data } = await api.get('/hackathon/batches');
      setBatches(data.data || []);
    } catch {}
  };

  const fetchStats = async () => {
    setLoadingStats(true);
    try {
      const params = { search: teamSearch };
      if (statusFilter) params.selectionStatus = statusFilter;
      if (batchFilter) params.importBatch = batchFilter;
      if (paymentFilter) params.paymentStatus = paymentFilter;
      if (memberCountFilter) params.memberCount = memberCountFilter;
      
      const { data } = await api.get('/hackathon/stats', { params });
      setStats(data.data);
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    } finally {
      setLoadingStats(false);
    }
  };

  useEffect(() => {
    if (viewMode === 'manage') {
      fetchTeams();
      fetchBatches();
      fetchStats();
    }
  }, [viewMode, teamPage, teamSearch, statusFilter, batchFilter, paymentFilter, memberCountFilter]);

  const handleExportSummary = () => {
    if (!stats) return;
    const rows = [
      ['Metric', 'Value'],
      ['Total Teams', stats.totalTeams],
      ['Paid Teams', stats.paymentDistribution.paid],
      ['Unpaid Teams', stats.paymentDistribution.unpaid],
      ['---', '---'],
      ['Team Size', 'Count'],
      ...Object.keys(stats.teamSizeDistribution).sort((a,b) => Number(a)-Number(b)).map(size => [`${size} members`, stats.teamSizeDistribution[size]]),
      ['---', '---'],
      ['Status', 'Count'],
      ...Object.entries(stats.statusDistribution).map(([status, count]) => [status.toUpperCase(), count])
    ];

    const csvContent = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `hackathon_summary_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    toast.success('Summary export started');
  };

  const handleExport = async (format = 'csv', extraParams = {}) => {
    try {
      const params = { format, search: teamSearch, ...extraParams };
      if (statusFilter && !extraParams.selectionStatus) params.selectionStatus = statusFilter;
      if (batchFilter && !extraParams.importBatch) params.importBatch = batchFilter;
      if (paymentFilter && !extraParams.paymentStatus) params.paymentStatus = paymentFilter;
      if (memberCountFilter && !extraParams.memberCount) params.memberCount = memberCountFilter;
      if (params.memberCount === 'ALL') delete params.memberCount;

      const response = await api.get('/hackathon/export', { 
        params,
        responseType: 'blob' 
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      const filename = `hackathon_${extraParams.role === 'leader' ? 'leaders' : 'teams'}_${memberCountFilter ? `size_${memberCountFilter}_` : ''}${new Date().toISOString().split('T')[0]}.${format === 'excel' ? 'xlsx' : 'csv'}`;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('Export started');
    } catch (err) {
      toast.error('Export failed');
    }
  };

  const handleBulkExportBySize = async () => {
    const counts = [5, 4, 3, 2, 1];
    toast.loading('Preparing bulk export...', { id: 'bulk-export' });
    try {
      for (const count of counts) {
        const params = { format: 'excel', memberCount: count };
        if (statusFilter) params.selectionStatus = statusFilter;
        if (batchFilter) params.importBatch = batchFilter;
        if (paymentFilter) params.paymentStatus = paymentFilter;

        const response = await api.get('/hackathon/export', { 
          params,
          responseType: 'blob' 
        });
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `hackathon_teams_size_${count}_${new Date().toISOString().split('T')[0]}.xlsx`);
        document.body.appendChild(link);
        link.click();
        link.remove();
        // Small delay to avoid browser blocking multiple downloads
        await new Promise(r => setTimeout(r, 1000));
      }
      toast.success('All size-wise exports started', { id: 'bulk-export' });
    } catch (err) {
      toast.error('Bulk export failed', { id: 'bulk-export' });
    }
  };

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
        else if (lowerH.includes('college') || lowerH.includes('inst')) initialMappings[header] = 'collegeName';
        else if (lowerH.includes('referral') || lowerH.includes('ca')) initialMappings[header] = 'referralCode';
        else if (lowerH.includes('password') || lowerH.includes('pass')) initialMappings[header] = 'defaultPassword';
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
    <>
      <div className="animate-fade-in space-y-8">
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight uppercase leading-none mb-2">Hackathon</h1>
            <p className="text-slate-500 font-medium">Manage teams and data imports</p>
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

          <div className="flex items-center gap-3">
            <button 
              onClick={handleBulkExportBySize}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-primary-500/10 text-primary-400 hover:bg-primary-500 hover:text-white border border-primary-500/20 transition-all text-[10px] font-bold uppercase tracking-wider"
              title="Download separate excels for 4, 3, 2, 1 members"
            >
              <HiOutlineDatabase className="w-4 h-4" /> Bulk Excel
            </button>
            <div className="h-8 w-px bg-slate-800 mx-1"></div>
            <button 
              onClick={() => handleExport('excel', { paymentStatus: 'paid', role: 'leader' })}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500 hover:text-white border border-indigo-500/20 transition-all text-[10px] font-bold uppercase tracking-wider"
              title="Download only leaders who have paid"
            >
              <HiOutlineShieldCheck className="w-4 h-4" /> Paid Leaders
            </button>
            <div className="h-8 w-px bg-slate-800 mx-1"></div>
            <button 
              onClick={() => handleExport('csv')}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-slate-900/60 text-slate-400 hover:text-white border border-slate-700/30 hover:border-slate-600 transition-all text-[10px] font-bold uppercase tracking-wider"
            >
              <HiOutlineDownload className="w-4 h-4" /> CSV
            </button>
            <button 
              onClick={() => handleExport('excel')}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500 hover:text-white border border-emerald-500/20 transition-all text-[10px] font-bold uppercase tracking-wider"
            >
              <HiOutlineDatabase className="w-4 h-4" /> Excel
            </button>
          </div>
        </div>

        {viewMode === 'manage' ? (
          <div className="space-y-6">
            {/* Quick Stats Panel */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-[#1A1D27] border border-[#2E3348] p-6 rounded-2xl shadow-lg hover:border-[#6366F1]/30 transition-all group">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-[#3B82F6]/10 border border-[#3B82F6]/30 flex items-center justify-center text-[#3B82F6]">
                    <HiOutlineUserGroup className="w-5 h-5"/>
                  </div>
                  <p className="text-xs font-bold text-[#94A3B8] uppercase tracking-widest">Total Teams</p>
                </div>
                <p className="text-4xl font-bold text-[#F1F5F9] pl-1">{totalTeams} <span className="text-sm font-medium text-[#64748B]">{memberCountFilter || teamSearch || statusFilter || batchFilter ? 'Filtered' : 'Global'}</span></p>
              </div>
              
              <div className="bg-[#1A1D27] border border-[#2E3348] p-6 rounded-2xl shadow-lg hover:border-[#22C55E]/30 transition-all group">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-[#22C55E]/10 border border-[#22C55E]/30 flex items-center justify-center text-[#22C55E]">
                    <HiOutlineCheckCircle className="w-5 h-5"/>
                  </div>
                  <p className="text-xs font-bold text-[#22C55E] uppercase tracking-widest">Paid Teams</p>
                </div>
                <p className="text-4xl font-bold text-[#22C55E] pl-1">{globalPaidTeams} <span className="text-sm font-medium text-[#22C55E]/50">{memberCountFilter || teamSearch || statusFilter || batchFilter ? 'Filtered' : 'Global'}</span></p>
              </div>
              
              <div className="bg-[#1A1D27] border border-[#2E3348] p-6 rounded-2xl shadow-lg hover:border-[#F59E0B]/30 transition-all group">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-[#F59E0B]/10 border border-[#F59E0B]/30 flex items-center justify-center text-[#F59E0B]">
                    <HiOutlineExclamationCircle className="w-5 h-5"/>
                  </div>
                  <p className="text-xs font-bold text-[#F59E0B] uppercase tracking-widest">Unpaid Teams</p>
                </div>
                <p className="text-4xl font-bold text-[#F59E0B] pl-1">{globalUnpaidTeams} <span className="text-sm font-medium text-[#F59E0B]/50">{memberCountFilter || teamSearch || statusFilter || batchFilter ? 'Filtered' : 'Global'}</span></p>
              </div>
            </div>

            {/* Graphs & Analytics Section */}
            {stats && (
              <div className="space-y-6 animate-fade-in">
                <div className="flex items-center justify-between">
                  <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.4em]">Analytics & Distribution</h3>
                  <button 
                    onClick={handleExportSummary}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary-500/10 text-primary-400 hover:bg-primary-500 hover:text-white border border-primary-500/20 transition-all text-[9px] font-bold uppercase tracking-wider"
                  >
                    <HiOutlineDownload className="w-3.5 h-3.5" /> Export Summary
                  </button>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Team Size Distribution - Bar Chart */}
                  <div className="lg:col-span-2 bg-[#1A1D27]/40 border border-[#2E3348]/50 p-6 rounded-3xl backdrop-blur-xl group hover:border-primary-500/30 transition-all">
                    <div className="flex items-center justify-between mb-8">
                      <div>
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em] mb-1">Team Size Distribution</h3>
                        <p className="text-[10px] text-slate-600 font-medium uppercase tracking-wider">Number of teams by member count</p>
                      </div>
                      <div className="w-10 h-10 rounded-xl bg-primary-500/10 border border-primary-500/20 flex items-center justify-center text-primary-400">
                        <HiOutlineTrendingUp className="w-5 h-5"/>
                      </div>
                    </div>
                    <div className="h-[250px] w-full">
                      <Bar 
                        data={{
                          labels: Object.keys(stats.teamSizeDistribution).sort((a,b) => Number(a) - Number(b)).map(s => `${s} Members`),
                          datasets: [{
                            label: 'Teams',
                            data: Object.keys(stats.teamSizeDistribution).sort((a,b) => Number(a) - Number(b)).map(k => stats.teamSizeDistribution[k]),
                            backgroundColor: 'rgba(99, 102, 241, 0.5)',
                            borderColor: '#6366F1',
                            borderWidth: 2,
                            borderRadius: 8,
                            hoverBackgroundColor: 'rgba(99, 102, 241, 0.8)',
                          }]
                        }}
                        options={{
                          responsive: true,
                          maintainAspectRatio: false,
                          plugins: {
                            legend: { display: false },
                            tooltip: {
                              backgroundColor: '#0F172A',
                              titleColor: '#94A3B8',
                              bodyColor: '#F1F5F9',
                              padding: 12,
                              cornerRadius: 12,
                              displayColors: false,
                            }
                          },
                          scales: {
                            y: { 
                              beginAtZero: true,
                              grid: { color: 'rgba(255, 255, 255, 0.05)', drawBorder: false },
                              ticks: { color: '#64748B', font: { size: 10, weight: 'bold' } }
                            },
                            x: { 
                              grid: { display: false },
                              ticks: { color: '#64748B', font: { size: 10, weight: 'bold' } }
                            }
                          }
                        }}
                      />
                    </div>
                  </div>

                  {/* Combined Status Distribution - Doughnut Chart */}
                  <div className="bg-[#1A1D27]/40 border border-[#2E3348]/50 p-6 rounded-3xl backdrop-blur-xl group hover:border-emerald-500/30 transition-all">
                    <div className="flex items-center justify-between mb-8">
                      <div>
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em] mb-1">Payment Status</h3>
                        <p className="text-[10px] text-slate-600 font-medium uppercase tracking-wider">Paid vs Unpaid distribution</p>
                      </div>
                      <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                        <HiOutlineCheckCircle className="w-5 h-5"/>
                      </div>
                    </div>
                    <div className="h-[200px] flex items-center justify-center relative">
                      <Doughnut 
                        data={{
                          labels: ['Paid', 'Unpaid'],
                          datasets: [{
                            data: [stats.paymentDistribution.paid, stats.paymentDistribution.unpaid],
                            backgroundColor: ['rgba(34, 197, 94, 0.6)', 'rgba(245, 158, 11, 0.6)'],
                            borderColor: ['#22C55E', '#F59E0B'],
                            borderWidth: 2,
                            hoverOffset: 15
                          }]
                        }}
                        options={{
                          responsive: true,
                          maintainAspectRatio: false,
                          cutout: '75%',
                          plugins: {
                            legend: { 
                              position: 'bottom',
                              labels: { color: '#94A3B8', font: { size: 10, weight: 'bold' }, padding: 20, usePointStyle: true }
                            },
                            tooltip: {
                              backgroundColor: '#0F172A',
                              padding: 12,
                              cornerRadius: 12,
                            }
                          }
                        }}
                      />
                      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none mt-[-30px]">
                        <p className="text-2xl font-bold text-white leading-none">{Math.round((stats.paymentDistribution.paid / stats.totalTeams) * 100 || 0)}%</p>
                        <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest mt-1">Paid Rate</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Filter Bar */}
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

                <div className="h-8 w-px bg-slate-800 hidden lg:block"></div>
                <div className="flex items-center gap-2 group px-4 py-2 hover:bg-white/[0.02] rounded-xl transition-all cursor-pointer">
                  <HiOutlineRefresh className="w-4 h-4 text-slate-500 group-hover:text-primary-400" />
                  <select value={paymentFilter} onChange={(e) => { setPaymentFilter(e.target.value); setTeamPage(1); }} className="bg-transparent text-[10px] font-bold text-slate-400 uppercase tracking-wider outline-none cursor-pointer">
                    <option value="" className="bg-slate-900">Payment: All</option>
                    <option value="paid" className="bg-slate-900">Paid Only</option>
                    <option value="unpaid" className="bg-slate-900">Unpaid Only</option>
                  </select>
                </div>

                <div className="h-8 w-px bg-slate-800 hidden lg:block"></div>
                <div className="flex items-center gap-2 group px-4 py-2 hover:bg-white/[0.02] rounded-xl transition-all cursor-pointer">
                  <HiOutlineUserGroup className="w-4 h-4 text-slate-500 group-hover:text-primary-400" />
                  <select value={memberCountFilter} onChange={(e) => { setMemberCountFilter(e.target.value); setTeamPage(1); }} className="bg-transparent text-[10px] font-bold text-slate-400 uppercase tracking-wider outline-none cursor-pointer">
                    <option value="" className="bg-slate-900">Size: All</option>
                    {[1,2,3,4,5].map(n => <option key={n} value={n} className="bg-slate-900">{n} Members</option>)}
                  </select>
                </div>

                <div className="h-8 w-px bg-slate-800 hidden lg:block"></div>
                <button 
                  onClick={() => {
                    setTeamSearch('');
                    setStatusFilter('');
                    setBatchFilter('');
                    setPaymentFilter('');
                    setMemberCountFilter('');
                    setTeamPage(1);
                  }}
                  className="flex items-center gap-2 px-4 py-2 text-slate-500 hover:text-red-400 transition-all text-[10px] font-bold uppercase tracking-wider"
                >
                  <HiOutlineX className="w-4 h-4" /> Clear
                </button>
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
                        <th className="px-6 py-6 text-[9px] font-bold text-slate-600 uppercase tracking-wider">Team Members</th>
                        <th className="px-6 py-6 text-[9px] font-bold text-slate-600 uppercase tracking-wider text-center">Status</th>
                        <th className="px-6 py-6 text-[9px] font-bold text-slate-600 uppercase tracking-wider">Payment</th>
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
                            <td className="px-6 py-6 text-center">
                              <span className={`px-3 py-1 rounded-full text-[8px] font-bold uppercase tracking-wider border ${SELECTION_STATUS_CONFIG[t.selectionStatus]?.bg} ${SELECTION_STATUS_CONFIG[t.selectionStatus]?.color}`}>
                                {SELECTION_STATUS_CONFIG[t.selectionStatus]?.label || t.selectionStatus}
                              </span>
                            </td>
                            <td className="px-6 py-6">
                              {t.isPaid ? (
                                <span className="flex items-center gap-1.5 text-[8px] font-bold uppercase tracking-wider text-emerald-400">
                                  <HiOutlineCheckCircle className="w-3 h-3" /> Paid
                                </span>
                              ) : (
                                <span className="flex items-center gap-1.5 text-[8px] font-bold uppercase tracking-wider text-slate-500/50">
                                  <HiOutlineExclamationCircle className="w-3 h-3" /> Unpaid
                                </span>
                              )}
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
                                  <HiOutlineTrash className="w-5 h-5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                          {expandedTeam === t._id && (
                            <tr className="bg-slate-900/40 backdrop-blur-3xl animate-fade-in relative z-10">
                              <td colSpan="6" className="px-12 py-10">
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
                                        <div className="pt-2 flex items-center justify-between border-t border-white/[0.05]">
                                          <div className="flex items-center gap-2">
                                            <HiOutlinePhone className="w-3 h-3 text-primary-500" />
                                            <span className="text-[10px] text-slate-400 font-bold tabular-nums">{m.phone}</span>
                                          </div>
                                          <span className="text-[8px] text-slate-600 font-bold uppercase">{m.gender}</span>
                                        </div>
                                      )}
                                      {(m.collegeName || m.department) && (
                                        <div className="space-y-1">
                                          <p className="text-[9px] text-slate-500 font-bold uppercase tracking-tight truncate">{m.collegeName}</p>
                                          <p className="text-[9px] text-slate-600 font-bold uppercase tracking-tight">{m.department} {m.year ? `— Year ${m.year}` : ''}</p>
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                                <div className="mt-8 pt-6 border-t border-white/[0.05] flex items-center justify-between">
                                  <p className="text-[10px] font-bold text-slate-600 uppercase tracking-[0.4em]">Team ID: {t._id}</p>
                                  <div className="flex flex-wrap gap-4">
                                    {t.registrationId?.referralCodeUsed && <span className="text-[9px] font-bold text-amber-400 uppercase tracking-wider p-2 bg-amber-500/5 border border-amber-500/10 rounded-lg">REF CODE: {t.registrationId.referralCodeUsed}</span>}
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
                          <td colSpan="6" className="text-center py-40">
                            <HiOutlineSearch className="w-16 h-16 text-slate-800 mx-auto mb-6" />
                            <p className="text-[11px] font-bold text-slate-600 uppercase tracking-[0.4em]">No hackathon teams found</p>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                {teamPages > 1 && (
                  <div className="flex items-center justify-center gap-3 py-10 bg-white/[0.01] border-t border-white/[0.05]">
                    {[...Array(teamPages)].map((_, i) => (
                      <button 
                        key={i} 
                        onClick={() => setTeamPage(i + 1)} 
                        className={`w-10 h-10 rounded-xl text-[10px] font-bold transition-all ${teamPage === i + 1 ? 'bg-primary-500 text-white shadow-lg' : 'bg-slate-900 text-slate-500 hover:text-white border border-slate-800'}`}
                      >
                        {(i + 1).toString().padStart(2, '0')}
                      </button>
                    ))}
                  </div>
                )}
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
                  <div key={s.id} className={`relative flex items-center gap-4 p-4 rounded-2xl transition-all duration-300 ${isActive ? 'bg-primary-500/10 border-primary-500/30 shadow-[0_0_20px_rgba(59,130,246,0.1)]' : 'opacity-40 grayscale filter'}`}>
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
                            {previewData.slice(0, 5).map((row, i) => (
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
                          <span className="text-[10px] font-bold text-white uppercase tracking-tight truncate max-w-[100px]">{file?.name || 'Unknown'}</span>
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
                        <button onClick={resetImportState} className="btn-outline w-full py-4 text-[11px] font-bold uppercase tracking-wider">Reset</button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Spacing element at bottom */}
        <div className="h-20"></div>
      </div>

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
        message={`This will create/update up to ${validationResults?.validCount ?? 0} records. This action is recorded in the audit logs.`}
        confirmLabel="Execute Import"
        loading={importing}
      />
    </>
  );
}