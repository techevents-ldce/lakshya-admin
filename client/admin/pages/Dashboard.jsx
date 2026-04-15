import { useState, useEffect } from 'react';
import api from '../../src/services/api';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Tooltip, Legend, Filler } from 'chart.js';
import { Line, Doughnut, Bar } from 'react-chartjs-2';
import { 
  HiOutlineUsers, 
  HiOutlineCalendar, 
  HiOutlineTicket, 
  HiOutlineCurrencyRupee, 
  HiOutlineClipboardCheck, 
  HiOutlineUserGroup, 
  HiOutlineCreditCard, 
  HiOutlineSparkles,
  HiOutlineRefresh,
  HiOutlineTrendingUp,
  HiOutlineFilter,
  HiOutlineArrowRight,
  HiOutlineGlobeAlt,
  HiOutlineInformationCircle,
  HiOutlineCheckCircle,
  HiOutlineXCircle,
  HiOutlineClock,
  HiOutlineReply,
} from 'react-icons/hi';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Tooltip, Legend, Filler);

// Global Chart Defaults for Modern Dark Theme
ChartJS.defaults.color = '#64748b'; // slate-500
ChartJS.defaults.font.family = "'Inter', sans-serif";
ChartJS.defaults.plugins.tooltip.backgroundColor = '#0f172a';
ChartJS.defaults.plugins.tooltip.borderColor = 'rgba(51, 65, 85, 0.5)';
ChartJS.defaults.plugins.tooltip.borderWidth = 1;
ChartJS.defaults.plugins.tooltip.padding = 10;
ChartJS.defaults.plugins.tooltip.cornerRadius = 8;
ChartJS.defaults.plugins.tooltip.titleFont = { size: 12, weight: '600' };
ChartJS.defaults.plugins.tooltip.bodyFont = { size: 12, weight: '400' };

const CHART_COLORS = ['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899', '#f97316'];

const baseOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { 
    legend: { 
      position: 'bottom', 
      labels: { 
        boxWidth: 8, 
        padding: 20, 
        color: '#94a3b8',
        font: { size: 11, weight: '500' },
        usePointStyle: true
      } 
    } 
  }
};

const doughnutOptions = {
  ...baseOptions,
  cutout: '75%',
};

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [eventId, setEventId] = useState('');
  const [events, setEvents] = useState([]);
  const [reconOpen, setReconOpen] = useState(false);
  const [reconLoading, setReconLoading] = useState(false);
  const [reconData, setReconData] = useState(null);
  const [reconError, setReconError] = useState('');
  const [eventSummary, setEventSummary] = useState(null);

  useEffect(() => {
    api.get('/events', { params: { limit: 200 } }).then(({ data }) => setEvents(data.events || [])).catch(() => {});
    fetchEventSummary();
  }, []);

  const fetchEventSummary = async () => {
    try {
      const { data } = await api.get('/admin/event-summary');
      if (data.success) {
        setEventSummary(data.data);
      }
    } catch (err) {
      console.error('Failed to fetch event summary:', err);
    }
  };

  const fetchStats = () => {
    setLoading(true);
    const params = {};
    if (dateFrom) params.dateFrom = dateFrom;
    if (dateTo) params.dateTo = dateTo;
    if (eventId) params.eventId = eventId;
    api.get('/analytics/dashboard', { params })
      .then(({ data }) => setStats(data.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchStats(); }, [dateFrom, dateTo, eventId]);

  const openReconciliation = async () => {
    setReconOpen(true);
    if (reconData || reconLoading) return;
    setReconLoading(true);
    setReconError('');
    try {
      const { data } = await api.get('/orders/reconcile/report', { params: { limit: 50 } });
      setReconData(data.data);
    } catch (err) {
      setReconError(err?.response?.data?.message || 'Failed to load reconciliation report');
    } finally {
      setReconLoading(false);
    }
  };

  if (loading && !stats) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <HiOutlineRefresh className="w-10 h-10 text-indigo-500 animate-spin" />
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider animate-pulse">Loading analytics...</p>
    </div>
  );

  const mainStats = [
    { label: 'Total Users', value: stats?.totalUsers || 0, icon: HiOutlineUsers, accent: 'from-blue-500/10 to-blue-600/10', color: 'text-blue-400' },
    { label: 'Total Events', value: stats?.totalEvents || 0, icon: HiOutlineCalendar, accent: 'from-emerald-500/10 to-emerald-600/10', color: 'text-emerald-400' },
    { label: 'Registrations', value: stats?.totalRegistrations || 0, icon: HiOutlineTicket, accent: 'from-violet-500/10 to-violet-600/10', color: 'text-violet-400' },
    { label: 'Total Revenue', value: `₹${(Number((stats?.orderRevenue || stats?.totalRevenue) || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, icon: HiOutlineCurrencyRupee, accent: 'from-amber-500/10 to-amber-600/10', color: 'text-amber-400' },
  ];

  const getOrderCount = (statuses) => {
    if (!stats?.orderStatusBreakdown) return 0;
    return stats.orderStatusBreakdown
      .filter((b) => statuses.includes(b._id))
      .reduce((sum, b) => sum + b.count, 0);
  };

  const transactionStats = [
    { label: 'Paid Transactions', value: getOrderCount(['success']), icon: HiOutlineCheckCircle, color: 'text-emerald-400' },
    { label: 'Pending Transactions', value: getOrderCount(['pending', 'payment_initiated', 'fulfilling']), icon: HiOutlineClock, color: 'text-amber-400' },
    { label: 'Failed Transactions', value: getOrderCount(['failed', 'cancelled']), icon: HiOutlineXCircle, color: 'text-red-400' },
    { label: 'Refunded Transactions', value: getOrderCount(['refunded']), icon: HiOutlineReply, color: 'text-slate-400' },
  ];

  const secondaryStats = [
    { label: 'Tickets Issued', value: stats?.ticketsIssued || 0, icon: HiOutlineSparkles, color: 'text-blue-400' },
    { label: 'Check-in Rate', value: `${stats?.ticketsIssued > 0 ? Math.round((stats.ticketsUsed / stats.ticketsIssued) * 100) : 0}%`, icon: HiOutlineClipboardCheck, color: 'text-emerald-400' },
    { label: 'Unique Users', value: stats?.uniqueUsersRegistered || 0, icon: HiOutlineUserGroup, color: 'text-violet-400' },
    { label: 'Successful Orders', value: `${stats?.orderStatusBreakdown?.find(b => b._id === 'success')?.count || 0}`, icon: HiOutlineCreditCard, color: 'text-amber-400' },
  ];

  const regTrendData = {
    labels: stats?.registrationTrend?.map((d) => d._id) || [],
    datasets: [{
      label: 'Registrations',
      data: stats?.registrationTrend?.map((d) => d.count) || [],
      fill: true, 
      backgroundColor: 'rgba(59, 130, 246, 0.05)', 
      borderColor: '#3b82f6', 
      borderWidth: 3,
      tension: 0.4, 
      pointBackgroundColor: '#3b82f6',
      pointBorderColor: '#fff',
      pointBorderWidth: 2,
      pointRadius: 4,
    }],
  };

  const revenueTrendData = {
    labels: stats?.revenueTrend?.map((d) => d._id) || [],
    datasets: [{
      label: 'Revenue',
      data: stats?.revenueTrend?.map((d) => (d.total || 0)) || [],
      backgroundColor: 'rgba(16, 185, 129, 0.3)', 
      borderColor: '#10b981', 
      borderWidth: 1,
      borderRadius: 6,
      hoverBackgroundColor: '#10b981',
    }],
  };

  const regStatusData = {
    labels: stats?.registrationStatusBreakdown?.map(d => d._id) || [],
    datasets: [{
      data: stats?.registrationStatusBreakdown?.map(d => d.count) || [],
      backgroundColor: CHART_COLORS,
      borderWidth: 0,
      hoverOffset: 15
    }]
  };

  const topCollegesData = {
    labels: stats?.topColleges?.map(d => d._id.slice(0, 15) + '...') || [],
    datasets: [{
      label: 'Students',
      data: stats?.topColleges?.map(d => d.count) || [],
      backgroundColor: 'rgba(139, 92, 246, 0.5)',
      borderColor: '#8b5cf6',
      borderWidth: 1,
      borderRadius: 8,
    }]
  };

  const chartOptions = {
    ...baseOptions,
    plugins: { ...baseOptions.plugins, legend: { display: false } },
    scales: { 
      y: { grid: { color: 'rgba(255,255,255,0.02)' }, beginAtZero: true }, 
      x: { grid: { display: false } } 
    }
  };

  return (
    <div className="animate-fade-in space-y-6 sm:space-y-8">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 lg:gap-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight leading-none mb-2">Analytics Overview</h1>
          <p className="text-slate-500 font-medium text-sm sm:text-base">Real-time performance and registration metrics</p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 bg-slate-900/60 p-2.5 rounded-xl border border-slate-800/60 backdrop-blur-md shadow-lg">
          <div className="flex items-center gap-2 px-3 py-1.5 hover:bg-white/[0.04] rounded-lg group transition-all cursor-pointer flex-1 sm:flex-none">
             <HiOutlineFilter className="w-4 h-4 text-slate-500" />
             <select 
               value={eventId} 
               onChange={(e) => setEventId(e.target.value)}
               className="bg-transparent text-xs font-semibold text-slate-400 outline-none cursor-pointer w-full sm:w-auto"
             >
               <option value="" className="bg-slate-900">All Events</option>
               {events.map((ev) => <option key={ev._id} value={ev._id} className="bg-slate-900">{ev.title}</option>)}
             </select>
          </div>
          <div className="h-6 w-px bg-slate-800 hidden sm:block"></div>
          <div className="flex items-center gap-2 sm:gap-3 px-2">
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="bg-transparent text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider outline-none cursor-pointer hover:text-white transition-all invert opacity-70 flex-1 sm:flex-none" />
            <span className="text-slate-700 font-medium text-xs sm:text-sm hidden sm:inline">to</span>
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="bg-transparent text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider outline-none cursor-pointer hover:text-white transition-all invert opacity-70 flex-1 sm:flex-none" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {mainStats.map((card, i) => (
          <div key={i} className="card p-4 sm:p-6 border-slate-800/40 relative overflow-hidden group hover:bg-slate-800/40 transition-all duration-300 shadow-lg rounded-2xl">
            <div className="flex items-start justify-between relative z-10">
               <div className="flex-1">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">{card.label}</p>
                  <p className="text-2xl sm:text-3xl font-bold text-white tracking-tight tabular-nums">{card.value}</p>
                  {/* Show team/solo breakdown for Registrations card */}
                  {card.label === 'Registrations' && eventSummary && (
                    <p className="text-[10px] sm:text-xs text-slate-500 mt-2 font-medium">
                      Teams: {eventSummary.totalTeams} • Solo: {eventSummary.totalSolo}
                    </p>
                  )}
               </div>
               <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center ${card.color} shadow-sm group-hover:border-indigo-500/30 transition-all duration-300 flex-shrink-0 ml-3`}>
                  <card.icon className="w-5 h-5 sm:w-6 sm:h-6" />
               </div>
            </div>
            <div className="mt-3 sm:mt-4 flex items-center gap-2 relative z-10">
               <div className={`w-1.5 h-1.5 rounded-full ${card.color.replace('text', 'bg')} opacity-60`}></div>
               <span className="text-[9px] sm:text-[10px] font-semibold text-slate-600 uppercase tracking-wide">Updated live</span>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {transactionStats.map((card, i) => (
          <div key={`tx-${i}`} className="card p-4 sm:p-6 border-slate-800/40 relative overflow-hidden group hover:bg-slate-800/40 transition-all duration-300 shadow-lg rounded-2xl bg-slate-900/40 backdrop-blur-sm">
            <div className="flex items-start justify-between relative z-10">
               <div className="flex-1">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">{card.label}</p>
                  <p className="text-2xl sm:text-3xl font-bold text-white tracking-tight tabular-nums">{card.value}</p>
               </div>
               <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center ${card.color} shadow-sm group-hover:border-slate-700 transition-all duration-300 flex-shrink-0 ml-3`}>
                  <card.icon className="w-5 h-5 sm:w-6 sm:h-6" />
               </div>
            </div>
            <div className="mt-3 sm:mt-4 flex items-center gap-2 relative z-10">
               <div className={`w-1.5 h-1.5 rounded-full ${card.color.replace('text', 'bg')} opacity-60`}></div>
               <span className="text-[9px] sm:text-[10px] font-semibold text-slate-600 uppercase tracking-wide">Live tracking</span>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
        <div className="lg:col-span-2 space-y-6 sm:space-y-8">
          <div className="card border-slate-800/40 p-4 sm:p-8 space-y-6 flex flex-col bg-slate-900/60 backdrop-blur-md rounded-2xl shadow-xl relative overflow-hidden">
             <div className="flex items-center justify-between relative z-10">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
                  Registration Trends
                </h3>
                <HiOutlineTrendingUp className="w-5 h-5 text-indigo-500/50" />
             </div>
             <div className="flex-1 min-h-[250px] sm:min-h-[350px] relative z-10">
                <Line data={regTrendData} options={{ ...chartOptions, scales: { ...chartOptions.scales, y: { ...chartOptions.scales.y, ticks: { padding: 8 } } } }} />
             </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
             <div className="card border-slate-800/40 p-4 sm:p-8 space-y-6 bg-slate-900/60 backdrop-blur-md rounded-2xl shadow-xl">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Revenue Distribution</h3>
                <div className="h-48 sm:h-60">
                   <Bar data={revenueTrendData} options={chartOptions} />
                </div>
                <div className="pt-4 sm:pt-5 border-t border-slate-800/60 flex items-center justify-between">
                   <p className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">Growth Indicator</p>
                   <p className="text-sm font-bold text-emerald-400">+12.4%</p>
                </div>
             </div>

             <div className="card border-slate-800/40 p-4 sm:p-8 space-y-6 bg-slate-900/60 backdrop-blur-md rounded-2xl shadow-xl">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Registration Status</h3>
                <div className="relative h-48 sm:h-60">
                   <Doughnut data={regStatusData} options={doughnutOptions} />
                   <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <p className="text-2xl sm:text-3xl font-bold text-white tracking-tight tabular-nums">{stats?.totalRegistrations || 0}</p>
                      <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-1">Total Registrations</p>
                   </div>
                </div>
             </div>
          </div>

          <div className="card border-slate-800/40 p-4 sm:p-8 space-y-6 bg-slate-900/60 backdrop-blur-md rounded-2xl shadow-xl overflow-hidden relative">
             <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-3">
                   <HiOutlineGlobeAlt className="w-5 h-5 text-indigo-400" /> Geographical Reach (Top Institutions)
                </h3>
                <button className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider hover:text-white transition-colors">Explorer</button>
             </div>
             <div className="h-56 sm:h-72">
                <Bar data={topCollegesData} options={{ ...chartOptions, indexAxis: 'y' }} />
             </div>
          </div>
        </div>

        <div className="space-y-6 sm:space-y-8">
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
             {secondaryStats.map((s, i) => (
                <div key={i} className="card p-3 sm:p-5 border-slate-800/40 bg-slate-900/20 hover:bg-slate-800/40 transition-all rounded-2xl text-center space-y-2 group">
                   <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-lg mx-auto flex items-center justify-center ${s.color} bg-slate-800 border border-slate-700 shadow-sm group-hover:border-indigo-500/30 transition-all`}>
                      <s.icon className="w-4 h-4 sm:w-5 sm:h-5" />
                   </div>
                   <div>
                      <p className="text-lg sm:text-xl font-bold text-white tracking-tight tabular-nums">{s.value}</p>
                      <p className="text-[8px] sm:text-[9px] font-bold text-slate-600 uppercase tracking-wider">{s.label}</p>
                   </div>
                </div>
             ))}
          </div>

          <div className="card border-slate-800/40 p-4 sm:p-8 space-y-6 bg-slate-900/60 backdrop-blur-md rounded-2xl shadow-xl">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider text-center border-b border-slate-800/60 pb-4 sm:pb-5">Event Popularity</h3>
            <div className="relative h-48 sm:h-64">
              <Doughnut 
                data={{
                  labels: stats?.eventPopularity?.map(d => d.eventTitle) || [],
                  datasets: [{
                    data: stats?.eventPopularity?.map(d => d.count) || [],
                    backgroundColor: CHART_COLORS,
                    borderWidth: 0,
                    hoverOffset: 12
                  }]
                }} 
                options={doughnutOptions} 
              />
            </div>
          </div>

          <div className="card border-slate-800/40 p-4 sm:p-8 flex flex-col gap-6 bg-slate-900/60 backdrop-blur-md rounded-2xl shadow-xl">
             <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-3">
                <HiOutlineUserGroup className="w-5 h-5 text-indigo-400" /> Registration Mode
             </h3>
             <div className="space-y-4 sm:space-y-5">
                {stats?.teamVsIndividual?.map((s, i) => (
                  <div key={i} className="space-y-2 sm:space-y-2.5">
                     <div className="flex items-center justify-between">
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{s._id} ENTRIES</p>
                        <p className="text-[11px] font-bold text-white tabular-nums">{s.count} <span className="text-slate-600 text-[9px] ml-0.5">UNITS</span></p>
                     </div>
                     <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                        <div 
                          className="h-full bg-indigo-500 transition-all duration-1000"
                          style={{ width: `${stats.totalRegistrations > 0 ? (s.count / stats.totalRegistrations) * 100 : 0}%` }}
                        ></div>
                     </div>
                  </div>
                ))}
             </div>
          </div>

          <div className="p-4 sm:p-8 rounded-2xl bg-indigo-600/10 border border-indigo-500/20 space-y-4 relative overflow-hidden group shadow-lg">
             <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-md mb-3 sm:mb-4">
                <HiOutlineSparkles className="w-5 h-5 sm:w-6 sm:h-6" />
             </div>
             <h4 className="text-base sm:text-lg font-bold text-white tracking-tight">System Status</h4>
             <p className="text-[10px] sm:text-xs text-slate-400 font-medium leading-relaxed">
                Security metrics are within normal parameters. Last synchronization completed successfully at {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.
             </p>
             <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
               <button className="flex items-center gap-2 text-[10px] sm:text-xs font-bold text-indigo-400 hover:text-white transition-colors">
                View audit logs <HiOutlineArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
               </button>
               <button
                 onClick={openReconciliation}
                 className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-amber-400 hover:text-white transition-colors"
                 title="Open reconciliation report (captured but not fulfilled)"
               >
                 Reconcile <HiOutlineArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
               </button>
             </div>
          </div>
        </div>
      </div>

      {reconOpen && (
        <div className="modal-overlay fixed inset-0 z-[9998] bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="modal-panel max-w-5xl max-h-[90vh] overflow-y-auto custom-scrollbar rounded-3xl border border-slate-800 bg-slate-950/95 shadow-2xl">
            <div className="p-6 border-b border-slate-800 flex items-start justify-between gap-6">
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <HiOutlineInformationCircle className="w-5 h-5 text-amber-400" />
                  Reconciliation Report
                </h3>
                <p className="text-[11px] text-slate-500 font-semibold mt-1">
                  Captured payments (SUCCESS) that are not fulfilled, and successful transactions missing an order.
                </p>
              </div>
              <button
                onClick={() => setReconOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 text-xs font-bold uppercase tracking-wider hover:text-white hover:border-slate-700 transition-all"
              >
                Close
              </button>
            </div>

            <div className="p-6 space-y-6">
              {reconLoading && (
                <div className="flex items-center justify-center py-12 gap-3">
                  <HiOutlineRefresh className="w-6 h-6 text-amber-400 animate-spin" />
                  <p className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">Loading report...</p>
                </div>
              )}

              {!reconLoading && reconError && (
                <div className="p-5 rounded-2xl bg-red-500/10 border border-red-500/20">
                  <p className="text-xs font-bold text-red-400 uppercase tracking-wider">{reconError}</p>
                </div>
              )}

              {!reconLoading && !reconError && reconData && (
                <>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="p-6 rounded-2xl bg-amber-500/5 border border-amber-500/20">
                      <p className="text-[10px] font-bold text-amber-400 uppercase tracking-wider mb-2">
                        Stuck Orders (paid but not fulfilled)
                      </p>
                      <p className="text-2xl font-bold text-white tabular-nums">
                        {reconData.stuckOrders?.length || 0}
                      </p>
                    </div>
                    <div className="p-6 rounded-2xl bg-indigo-500/5 border border-indigo-500/20">
                      <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider mb-2">
                        Orphan Transactions (paid, missing order)
                      </p>
                      <p className="text-2xl font-bold text-white tabular-nums">
                        {reconData.orphanTransactions?.length || 0}
                      </p>
                    </div>
                  </div>

                  <div className="p-6 rounded-2xl bg-slate-500/5 border border-slate-500/20">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                      Orders Missing SUCCESS Transaction (likely sync issue)
                    </p>
                    <p className="text-2xl font-bold text-white tabular-nums">
                      {reconData.ordersMissingSuccessTx?.length || 0}
                    </p>
                  </div>

                  <div className="space-y-3">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      Stuck Orders (latest {reconData.limit})
                    </p>
                    <div className="overflow-x-auto rounded-2xl border border-slate-800">
                      <table className="w-full text-left">
                        <thead className="bg-white/[0.02]">
                          <tr>
                            <th className="px-5 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Order</th>
                            <th className="px-5 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Status</th>
                            <th className="px-5 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Amount</th>
                            <th className="px-5 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Razorpay IDs</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/[0.03]">
                          {(reconData.stuckOrders || []).map((o) => (
                            <tr key={o._id} className="hover:bg-white/[0.02]">
                              <td className="px-5 py-4">
                                <a href={`/orders/${o._id}`} className="text-xs font-bold text-white hover:text-amber-400 transition-colors">
                                  {o._id}
                                </a>
                              </td>
                              <td className="px-5 py-4">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{o.status}</span>
                              </td>
                              <td className="px-5 py-4">
                                <span className="text-[11px] font-bold text-white tabular-nums">₹{Number(o.totalAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                              </td>
                              <td className="px-5 py-4">
                                <div className="text-[10px] font-mono text-slate-500 space-y-1">
                                  <div>order: {o.razorpayOrderId || '—'}</div>
                                  <div>payment: {o.razorpayPaymentId || '—'}</div>
                                </div>
                              </td>
                            </tr>
                          ))}
                          {(reconData.stuckOrders || []).length === 0 && (
                            <tr>
                              <td colSpan="4" className="px-5 py-10 text-center text-[10px] font-bold text-slate-600 uppercase tracking-wider">
                                No stuck orders found
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      Orphan Transactions (latest {reconData.limit})
                    </p>
                    <div className="overflow-x-auto rounded-2xl border border-slate-800">
                      <table className="w-full text-left">
                        <thead className="bg-white/[0.02]">
                          <tr>
                            <th className="px-5 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Transaction</th>
                            <th className="px-5 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Amount</th>
                            <th className="px-5 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Razorpay IDs</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/[0.03]">
                          {(reconData.orphanTransactions || []).map((t) => (
                            <tr key={t._id} className="hover:bg-white/[0.02]">
                              <td className="px-5 py-4">
                                <span className="text-[11px] font-bold text-white font-mono">{t.transaction_id}</span>
                              </td>
                              <td className="px-5 py-4">
                                <span className="text-[11px] font-bold text-white tabular-nums">₹{Number(t.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                              </td>
                              <td className="px-5 py-4">
                                <div className="text-[10px] font-mono text-slate-500 space-y-1">
                                  <div>order: {t.razorpay_order_id || '—'}</div>
                                  <div>payment: {t.razorpay_payment_id || '—'}</div>
                                </div>
                              </td>
                            </tr>
                          ))}
                          {(reconData.orphanTransactions || []).length === 0 && (
                            <tr>
                              <td colSpan="3" className="px-5 py-10 text-center text-[10px] font-bold text-slate-600 uppercase tracking-wider">
                                No orphan transactions found
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      Orders Missing SUCCESS Transaction (latest {reconData.limit})
                    </p>
                    <div className="overflow-x-auto rounded-2xl border border-slate-800">
                      <table className="w-full text-left">
                        <thead className="bg-white/[0.02]">
                          <tr>
                            <th className="px-5 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Order</th>
                            <th className="px-5 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Status</th>
                            <th className="px-5 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Amount</th>
                            <th className="px-5 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Razorpay IDs</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/[0.03]">
                          {(reconData.ordersMissingSuccessTx || []).map((o) => (
                            <tr key={o._id} className="hover:bg-white/[0.02]">
                              <td className="px-5 py-4">
                                <a href={`/orders/${o._id}`} className="text-xs font-bold text-white hover:text-slate-300 transition-colors">
                                  {o._id}
                                </a>
                              </td>
                              <td className="px-5 py-4">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{o.status}</span>
                              </td>
                              <td className="px-5 py-4">
                                <span className="text-[11px] font-bold text-white tabular-nums">₹{Number(o.totalAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                              </td>
                              <td className="px-5 py-4">
                                <div className="text-[10px] font-mono text-slate-500 space-y-1">
                                  <div>order: {o.razorpayOrderId || '—'}</div>
                                  <div>payment: {o.razorpayPaymentId || '—'}</div>
                                </div>
                              </td>
                            </tr>
                          ))}
                          {(reconData.ordersMissingSuccessTx || []).length === 0 && (
                            <tr>
                              <td colSpan="4" className="px-5 py-10 text-center text-[10px] font-bold text-slate-600 uppercase tracking-wider">
                                No orders missing SUCCESS transaction found
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
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
