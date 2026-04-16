import { useState, useEffect } from 'react';
import { 
  Chart as ChartJS, 
  CategoryScale, 
  LinearScale, 
  BarElement, 
  Title, 
  Tooltip, 
  Legend, 
  ArcElement,
  PointElement,
  LineElement
} from 'chart.js';
import { Bar, Pie } from 'react-chartjs-2';
import api from '../../src/services/api';
import toast from 'react-hot-toast';
import { 
  HiOutlineChartBar, 
  HiOutlineTrendingUp, 
  HiOutlineUsers, 
  HiOutlineCurrencyRupee, 
  HiOutlineRefresh,
  HiOutlineStar,
  HiOutlineCollection
} from 'react-icons/hi';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement
);

export default function EventInsights() {
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState([]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/admin/event-insights');
      if (data.success && Array.isArray(data.data)) {
        // Ensure each metric has required fields with proper defaults
        const sanitizedMetrics = data.data.map(item => ({
          eventId: item.eventId || 'unknown',
          eventName: item.eventName || 'Unnamed Event',
          eventType: item.eventType || 'solo',
          totalRegistrations: item.totalRegistrations || 0,
          totalTeams: item.totalTeams || 0,
          totalSoloRegistrations: item.totalSoloRegistrations || 0,
          totalParticipants: item.totalParticipants || 0,
          paidParticipants: item.paidParticipants || 0,
          confirmedParticipants: item.confirmedParticipants || 0,
          pendingTransactionsCount: item.pendingTransactionsCount,
          failedTransactionsCount: item.failedTransactionsCount,
        }));
        setMetrics(sanitizedMetrics);
      } else {
        setMetrics([]);
        toast.error('Invalid data format received');
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to load event insights');
      setMetrics([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const totalRegistrations = metrics.reduce((acc, curr) => acc + (curr.totalRegistrations || 0), 0);
  const totalParticipants = metrics.reduce((acc, curr) => acc + (curr.totalParticipants || 0), 0);

  const barData = {
    labels: metrics.slice(0, 10).map(m => m.eventName || 'Unnamed'),
    datasets: [
      {
        label: 'Registration Units (Teams/Solo)',
        data: metrics.slice(0, 10).map(m => m.totalRegistrations || 0),
        backgroundColor: 'rgba(99, 102, 241, 0.5)',
        borderColor: 'rgb(99, 102, 241)',
        borderWidth: 1,
        borderRadius: 8,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: 'rgba(15, 23, 42, 0.9)',
        padding: 12,
        titleFont: { size: 14, weight: 'bold' },
        bodyFont: { size: 12 },
        cornerRadius: 12,
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: { color: 'rgba(255, 255, 255, 0.05)' },
        ticks: { color: '#64748b', font: { size: 10, weight: 'bold' } }
      },
      x: {
        grid: { display: false },
        ticks: { 
          color: '#64748b', 
          font: { size: 10, weight: 'bold' },
          maxRotation: 45,
          minRotation: 45
        }
      }
    }
  };

  const pieData = {
    labels: metrics.slice(0, 5).map(m => m.eventName || 'Unnamed'),
    datasets: [
      {
        data: metrics.slice(0, 5).map(m => m.totalParticipants || 0),
        backgroundColor: [
          'rgba(99, 102, 241, 0.7)',
          'rgba(168, 85, 247, 0.7)',
          'rgba(236, 72, 153, 0.7)',
          'rgba(244, 63, 94, 0.7)',
          'rgba(245, 158, 11, 0.7)',
        ],
        borderWidth: 0,
      },
    ],
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
        <HiOutlineRefresh className="w-12 h-12 text-indigo-500 animate-spin" />
        <p className="text-[11px] font-bold text-slate-500 uppercase tracking-[0.4em] animate-pulse">Analyzing Event Data...</p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-6 sm:space-y-8">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 lg:gap-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight leading-none mb-2">Event Insights</h1>
          <p className="text-slate-500 font-medium text-xs sm:text-sm">Registration and participant analytics across all events</p>
        </div>
        <button
          onClick={fetchData}
          className="btn-primary flex items-center gap-2 shadow-lg shadow-indigo-500/10 active:scale-95 transition-all"
        >
          <HiOutlineRefresh className="w-4 h-4 sm:w-5 sm:h-5" />
          <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-widest">Refresh Data</span>
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <StatCard 
          title="Total Registration Units" 
          value={totalRegistrations.toLocaleString()} 
          icon={HiOutlineUsers} 
          color="text-indigo-400" 
          accent="from-indigo-500/20"
        />
        <StatCard 
          title="Total Participants" 
          value={totalParticipants.toLocaleString()} 
          icon={HiOutlineUsers} 
          color="text-violet-400" 
          accent="from-violet-500/20"
        />
        <StatCard 
          title="Top Event by Registrations" 
          value={metrics[0]?.eventName || 'N/A'} 
          icon={HiOutlineTrendingUp} 
          color="text-amber-400" 
          accent="from-amber-500/20"
          subtitle={metrics[0] ? `${metrics[0].totalRegistrations || 0} units` : '0 units'}
        />
        <StatCard 
          title="Most Popular Event Type" 
          value={metrics[0] ? (metrics[0].eventType === 'team' ? 'Team' : 'Solo') : 'N/A'} 
          icon={HiOutlineStar} 
          color="text-emerald-400" 
          accent="from-emerald-500/20"
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
        <div className="lg:col-span-2 card bg-slate-900/40 border-white/[0.05] p-4 sm:p-8 min-h-[350px] sm:min-h-[400px]">
          <div className="flex items-center justify-between mb-6 sm:mb-8">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Registration Comparison (Top 10)</h3>
          </div>
          <div className="relative h-[250px] sm:h-[300px]">
            <Bar data={barData} options={chartOptions} />
          </div>
        </div>
        <div className="card bg-slate-900/40 border-white/[0.05] p-4 sm:p-8 flex flex-col items-center justify-center">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-6 sm:mb-8 self-start">Participation Distribution</h3>
          <div className="relative w-full h-[200px] sm:h-[250px]">
            <Pie data={pieData} options={{ maintainAspectRatio: false }} />
          </div>
          <p className="mt-4 sm:mt-6 text-[10px] font-bold text-slate-600 uppercase tracking-widest text-center">Top 5 Events by Participants</p>
        </div>
      </div>

      {/* Events Table - Name, Participants, Revenue */}
      <div className="space-y-4 sm:space-y-6">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-indigo-600/10 border border-indigo-600/20 flex items-center justify-center text-indigo-500">
            <HiOutlineChartBar className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">Event Registration Summary</h2>
            <p className="text-slate-500 text-[10px] sm:text-xs mt-1">Event Name • Registration Units (Teams/Solo) • Total Participants</p>
          </div>
        </div>

        <div className="card !p-0 overflow-hidden border-slate-700/30 shadow-2xl bg-slate-900/20 backdrop-blur-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-white/[0.02]">
                  <th className="px-4 sm:px-6 py-3 sm:py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-white/[0.05] hidden sm:table-cell">Event ID</th>
                  <th className="px-4 sm:px-6 py-3 sm:py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-white/[0.05]">Event Name</th>
                  <th className="px-4 sm:px-6 py-3 sm:py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-white/[0.05] text-center">Registration Units</th>
                  <th className="px-4 sm:px-6 py-3 sm:py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-white/[0.05] text-center">Total Participants</th>
                                  </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.03]">
                {metrics.map((row) => (
                  <tr key={row.eventId || row._id} className="group hover:bg-white/[0.03] transition-all duration-200">
                    <td className="px-4 sm:px-6 py-3 sm:py-4 hidden sm:table-cell">
                      <code className="text-[10px] font-mono text-slate-500 bg-slate-900/50 px-2 py-1 rounded">
                        {row.eventId || row._id}
                      </code>
                    </td>
                    <td className="px-4 sm:px-6 py-3 sm:py-4">
                      <p className="text-xs sm:text-sm font-semibold text-white group-hover:text-indigo-400 transition-colors">{row.eventName}</p>
                      <p className="text-[9px] sm:text-[10px] text-slate-500 mt-1">
                        {row.eventType === 'team' ? 'Team Event' : 'Solo Event'}
                      </p>
                    </td>
                    <td className="px-4 sm:px-6 py-3 sm:py-4 text-center">
                      <div className="space-y-1">
                        <div className="text-[10px] sm:text-xs text-slate-400">
                          {row.eventType === 'team' ? 'Teams' : 'Solo Registrations'}
                        </div>
                        <div className="text-sm sm:text-lg font-bold text-white">{row.totalRegistrations}</div>
                        <p className="text-[9px] text-slate-500">
                          Team units: {row.totalTeams} • Solo units: {row.totalSoloRegistrations}
                        </p>
                      </div>
                    </td>
                    <td className="px-4 sm:px-6 py-3 sm:py-4 text-center">
                      <div className="space-y-1">
                        <div className="text-[10px] sm:text-xs text-slate-400">Participants</div>
                        <div className="text-sm sm:text-lg font-bold text-white">{row.totalParticipants}</div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-white/[0.01] border-t border-white/[0.05]">
                <tr>
                  <td className="px-4 sm:px-6 py-3 sm:py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest hidden sm:table-cell" colSpan="2">
                    Total Events: {metrics.length}
                  </td>
                  <td className="px-4 sm:px-6 py-3 sm:py-4 text-center sm:hidden">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                      Events: {metrics.length}
                    </span>
                  </td>
                  <td className="px-4 sm:px-6 py-3 sm:py-4 text-center">
                    <span className="text-xs sm:text-sm font-bold text-indigo-300 tabular-nums">
                      {totalRegistrations.toLocaleString('en-IN')}
                    </span>
                  </td>
                  <td className="px-4 sm:px-6 py-3 sm:py-4 text-center">
                    <span className="text-xs sm:text-sm font-bold text-indigo-300 tabular-nums">
                      {totalParticipants.toLocaleString('en-IN')}
                    </span>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon: Icon, color, accent, subtitle }) {
  return (
    <div className="card group relative overflow-hidden p-4 sm:p-6 border-white/[0.05] hover:border-indigo-500/30 transition-all duration-500 shadow-xl bg-slate-900/40">
      <div className={`absolute top-0 right-0 w-24 h-24 sm:w-32 sm:h-32 bg-gradient-to-br ${accent} to-transparent blur-3xl -mr-12 sm:-mr-16 -mt-12 sm:-mt-16 opacity-10 group-hover:opacity-40 transition-opacity duration-700`}></div>
      <div className="relative z-10 space-y-3 sm:space-y-4">
        <div className="flex items-center justify-between">
          <div className={`p-2.5 sm:p-3 rounded-xl bg-slate-900 border border-white/[0.05] ${color} shadow-lg transition-transform group-hover:scale-110 lg:group-hover:rotate-6`}>
            <Icon className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
        </div>
        <div>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">{title}</p>
          <p className="text-xl sm:text-2xl font-bold text-white tracking-tight leading-none">{value}</p>
          {subtitle && (
            <p className={`text-[9px] sm:text-[10px] font-bold mt-1.5 sm:mt-2 uppercase tracking-tight ${color}`}>{subtitle}</p>
          )}
        </div>
      </div>
    </div>
  );
}
