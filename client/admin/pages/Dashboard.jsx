import { useState, useEffect } from 'react';
import api from '../services/api';
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
} from 'react-icons/hi';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Tooltip, Legend, Filler);

// Global Chart Defaults for Modern Dark Theme
ChartJS.defaults.color = '#64748b'; // slate-500
ChartJS.defaults.font.family = "'Inter', sans-serif";
ChartJS.defaults.plugins.tooltip.backgroundColor = '#0f172a';
ChartJS.defaults.plugins.tooltip.borderColor = 'rgba(51, 65, 85, 0.5)';
ChartJS.defaults.plugins.tooltip.borderWidth = 1;
ChartJS.defaults.plugins.tooltip.padding = 12;
ChartJS.defaults.plugins.tooltip.cornerRadius = 12;
ChartJS.defaults.plugins.tooltip.titleFont = { size: 12, weight: 'bold' };
ChartJS.defaults.plugins.tooltip.bodyFont = { size: 12 };

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
        font: { size: 10, weight: 'bold' },
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

  useEffect(() => {
    api.get('/events', { params: { limit: 200 } }).then(({ data }) => setEvents(data.events || [])).catch(() => {});
  }, []);

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

  if (loading && !stats) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
      <HiOutlineRefresh className="w-12 h-12 text-primary-500 animate-spin" />
      <p className="text-[11px] font-black text-slate-500 uppercase tracking-[0.4em] animate-pulse">Synchronizing Analytics Matrix...</p>
    </div>
  );

  const mainStats = [
    { label: 'Total Nodes', value: stats?.totalUsers || 0, icon: HiOutlineUsers, accent: 'from-blue-500/10 to-blue-600/10', color: 'text-blue-400' },
    { label: 'Active Events', value: stats?.totalEvents || 0, icon: HiOutlineCalendar, accent: 'from-emerald-500/10 to-emerald-600/10', color: 'text-emerald-400' },
    { label: 'Registrations', value: stats?.totalRegistrations || 0, icon: HiOutlineTicket, accent: 'from-violet-500/10 to-violet-600/10', color: 'text-violet-400' },
    { label: 'Revenue Yield', value: `₹${(Number((stats?.orderRevenue || stats?.totalRevenue) || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, icon: HiOutlineCurrencyRupee, accent: 'from-amber-500/10 to-amber-600/10', color: 'text-amber-400' },
  ];

  const secondaryStats = [
    { label: 'Tickets Issued', value: stats?.ticketsIssued || 0, icon: HiOutlineSparkles, color: 'text-blue-400' },
    { label: 'Asset Utilization', value: `${stats?.ticketsIssued > 0 ? Math.round((stats.ticketsUsed / stats.ticketsIssued) * 100) : 0}%`, icon: HiOutlineClipboardCheck, color: 'text-emerald-400' },
    { label: 'Unique Entities', value: stats?.uniqueUsersRegistered || 0, icon: HiOutlineUserGroup, color: 'text-violet-400' },
    { label: 'Order Success', value: `${stats?.orderStatusBreakdown?.find(b => b._id === 'success')?.count || 0}`, icon: HiOutlineCreditCard, color: 'text-amber-400' },
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
      borderRadius: 8,
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
      borderRadius: 12,
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
    <div className="animate-fade-in space-y-10 max-w-7xl mx-auto">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8">
        <div>
          <h1 className="text-4xl font-black text-white tracking-tighter uppercase leading-none mb-3">Intelligence Hub</h1>
          <p className="text-slate-500 font-medium border-l-2 border-primary-500 pl-4">Real-time analytical mapping of event ecosystems</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-4 bg-slate-900/40 p-3 rounded-3xl border border-slate-700/30 backdrop-blur-2xl shadow-xl transition-all">
          <div className="flex items-center gap-3 px-4 py-2 hover:bg-white/[0.04] rounded-2xl group transition-all cursor-pointer">
             <HiOutlineFilter className="w-5 h-5 text-slate-500 group-hover:text-primary-400" />
             <select 
               value={eventId} 
               onChange={(e) => setEventId(e.target.value)}
               className="bg-transparent text-[11px] font-black text-slate-400 uppercase tracking-widest outline-none cursor-pointer"
             >
               <option value="" className="bg-slate-900">All Clusters</option>
               {events.map((ev) => <option key={ev._id} value={ev._id} className="bg-slate-900">{ev.title}</option>)}
             </select>
          </div>
          <div className="h-8 w-px bg-slate-800 hidden lg:block"></div>
          <div className="flex items-center gap-4 px-3">
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="bg-transparent text-[11px] font-black text-slate-500 uppercase tracking-widest outline-none cursor-pointer hover:text-white transition-all invert opacity-70" />
            <span className="text-slate-700 font-bold">»</span>
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="bg-transparent text-[11px] font-black text-slate-500 uppercase tracking-widest outline-none cursor-pointer hover:text-white transition-all invert opacity-70" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
        {mainStats.map((card, i) => (
          <div key={i} className="card p-8 border-slate-700/30 relative overflow-hidden group hover:bg-white/[0.02] transition-all duration-700 shadow-2xl rounded-[2.5rem]">
            <div className={`absolute -top-12 -right-12 w-40 h-40 bg-gradient-to-br ${card.accent} blur-[60px] opacity-0 group-hover:opacity-100 transition-opacity duration-700`}></div>
            <div className="flex items-start justify-between relative z-10">
               <div>
                  <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.3em] mb-4">{card.label}</p>
                  <p className="text-4xl font-black text-white tracking-tighter tabular-nums">{card.value}</p>
               </div>
               <div className={`w-14 h-14 rounded-[1.5rem] bg-slate-950 border border-slate-800 flex items-center justify-center ${card.color} shadow-2xl group-hover:bg-primary-500 group-hover:text-white group-hover:border-transparent transition-all duration-500`}>
                  <card.icon className="w-7 h-7" />
               </div>
            </div>
            <div className="mt-6 flex items-center gap-2 relative z-10">
               <div className={`w-1.5 h-1.5 rounded-full ${card.color.replace('text', 'bg')} animate-pulse`}></div>
               <span className="text-[9px] font-black text-slate-700 uppercase tracking-widest">Active Stream</span>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2 space-y-10">
          <div className="card border-slate-700/30 p-10 space-y-8 flex flex-col bg-slate-900/40 backdrop-blur-3xl rounded-[2.5rem] shadow-2xl relative overflow-hidden">
             <div className="absolute top-0 right-0 w-96 h-96 bg-primary-500/5 blur-[120px] pointer-events-none"></div>
             <div className="flex items-center justify-between relative z-10">
                <h3 className="text-[11px] font-black text-slate-500 uppercase tracking-[0.4em] flex items-center gap-4">
                  <div className="w-2.5 h-2.5 rounded-full bg-primary-500 shadow-[0_0_12px_rgba(59,130,246,0.8)]"></div>
                  Registration Velocity
                </h3>
                <HiOutlineTrendingUp className="w-6 h-6 text-primary-500/50" />
             </div>
             <div className="flex-1 min-h-[350px] relative z-10">
                <Line data={regTrendData} options={{ ...chartOptions, scales: { ...chartOptions.scales, y: { ...chartOptions.scales.y, ticks: { padding: 10 } } } }} />
             </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
             <div className="card border-slate-700/30 p-10 space-y-8 bg-slate-900/40 backdrop-blur-3xl rounded-[2.5rem] shadow-2xl">
                <h3 className="text-[11px] font-black text-slate-500 uppercase tracking-[0.4em] text-center">Revenue Stream</h3>
                <div className="h-60">
                   <Bar data={revenueTrendData} options={chartOptions} />
                </div>
                <div className="pt-6 border-t border-white/[0.05] flex items-center justify-between">
                   <p className="text-[10px] font-black text-slate-700 uppercase tracking-widest">Growth Forecast</p>
                   <p className="text-sm font-black text-emerald-400">+12.4%</p>
                </div>
             </div>

             <div className="card border-slate-700/30 p-10 space-y-8 bg-slate-900/40 backdrop-blur-3xl rounded-[2.5rem] shadow-2xl">
                <h3 className="text-[11px] font-black text-slate-500 uppercase tracking-[0.4em] text-center">Nodal Status</h3>
                <div className="relative h-60">
                   <Doughnut data={regStatusData} options={doughnutOptions} />
                   <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <p className="text-3xl font-black text-white tracking-tighter tabular-nums">{stats?.totalRegistrations || 0}</p>
                      <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Global Pings</p>
                   </div>
                </div>
             </div>
          </div>

          <div className="card border-slate-700/30 p-10 space-y-8 bg-slate-900/40 backdrop-blur-3xl rounded-[2.5rem] shadow-2xl overflow-hidden relative">
             <div className="absolute inset-0 bg-primary-500/[0.02] pointer-events-none"></div>
             <div className="flex items-center justify-between mb-2">
                <h3 className="text-[11px] font-black text-slate-500 uppercase tracking-[0.4em] flex items-center gap-4">
                   <HiOutlineGlobeAlt className="w-5 h-5 text-violet-500" /> Origin Clusters (Top Colleges)
                </h3>
                <button className="text-[10px] font-black text-primary-500 uppercase tracking-widest hover:text-white transition-colors">View Map</button>
             </div>
             <div className="h-72">
                <Bar data={topCollegesData} options={{ ...chartOptions, indexAxis: 'y' }} />
             </div>
          </div>
        </div>

        <div className="space-y-10">
          <div className="grid grid-cols-2 gap-6">
             {secondaryStats.map((s, i) => (
                <div key={i} className="card p-6 border-slate-700/30 bg-white/[0.01] hover:bg-white/[0.03] transition-all rounded-[2rem] text-center space-y-3 group">
                   <div className={`w-10 h-10 rounded-2xl mx-auto flex items-center justify-center ${s.color} bg-slate-950 border border-slate-800 group-hover:scale-110 transition-transform`}>
                      <s.icon className="w-5 h-5" />
                   </div>
                   <div>
                      <p className="text-xl font-black text-white tracking-tighter tabular-nums">{s.value}</p>
                      <p className="text-[8px] font-black text-slate-700 uppercase tracking-wider">{s.label}</p>
                   </div>
                </div>
             ))}
          </div>

          <div className="card border-slate-700/30 p-10 space-y-8 bg-slate-900/40 backdrop-blur-3xl rounded-[2.5rem] shadow-2xl">
            <h3 className="text-[11px] font-black text-slate-500 uppercase tracking-[0.4em] text-center border-b border-white/[0.05] pb-6">Distributed Units</h3>
            <div className="relative h-64">
              <Doughnut 
                data={{
                  labels: stats?.eventPopularity?.map(d => d.eventTitle) || [],
                  datasets: [{
                    data: stats?.eventPopularity?.map(d => d.count) || [],
                    backgroundColor: CHART_COLORS,
                    borderWidth: 0,
                    hoverOffset: 15
                  }]
                }} 
                options={doughnutOptions} 
              />
            </div>
          </div>

          <div className="card border-slate-700/30 p-10 flex flex-col gap-8 bg-slate-900/40 backdrop-blur-3xl rounded-[2.5rem] shadow-2xl">
             <h3 className="text-[11px] font-black text-slate-500 uppercase tracking-[0.4em] flex items-center gap-3">
                <HiOutlineUserGroup className="w-5 h-5 text-indigo-400" /> Grouping Logic
             </h3>
             <div className="space-y-6">
                {stats?.teamVsIndividual?.map((s, i) => (
                  <div key={i} className="space-y-3">
                     <div className="flex items-center justify-between">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{s._id} MODE</p>
                        <p className="text-[11px] font-black text-white">{s.count} <span className="text-slate-700 text-[9px] ml-1">UNITS</span></p>
                     </div>
                     <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800 p-0.5">
                        <div 
                          className="h-full bg-primary-500 shadow-[0_0_12px_rgba(59,130,246,0.6)] rounded-full transition-all duration-1000"
                          style={{ width: `${(s.count / stats.totalRegistrations) * 100}%` }}
                        ></div>
                     </div>
                  </div>
                ))}
             </div>
          </div>

          <div className="p-10 rounded-[2.5rem] bg-gradient-to-br from-primary-600/20 to-primary-900/20 border border-primary-500/20 space-y-6 relative overflow-hidden group shadow-2xl">
             <div className="absolute top-0 right-0 w-40 h-40 bg-primary-500/10 blur-3xl pointer-events-none group-hover:bg-primary-500/20 transition-all duration-700"></div>
             <div className="w-14 h-14 rounded-[1.5rem] bg-primary-500 flex items-center justify-center text-white shadow-2xl shadow-primary-900/50 mb-4 group-hover:rotate-12 transition-transform">
                <HiOutlineSparkles className="w-7 h-7" />
             </div>
             <h4 className="text-xl font-black text-white uppercase tracking-tighter">System Health</h4>
             <p className="text-[11px] text-slate-400/80 font-bold leading-relaxed uppercase tracking-tight">
                All nodal connections stabilized. Security matrix is active. Last synchronization completed successfully.
             </p>
             <button className="flex items-center gap-3 text-[10px] font-black text-primary-400 uppercase tracking-widest group-hover:text-white transition-colors">
                VIEW LOGS <HiOutlineArrowRight className="w-4 h-4" />
             </button>
          </div>
        </div>
      </div>
    </div>
  );
}
