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
      const { data } = await api.get('/analytics/events');
      if (data.success) {
        setMetrics(data.data);
      }
    } catch (err) {
      toast.error('Failed to load event insights');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const totalRevenue = metrics.reduce((acc, curr) => acc + curr.totalRevenue, 0);
  const totalParticipants = metrics.reduce((acc, curr) => acc + curr.participantCount, 0);

  const barData = {
    labels: metrics.slice(0, 10).map(m => m.title),
    datasets: [
      {
        label: 'Revenue (₹)',
        data: metrics.slice(0, 10).map(m => m.totalRevenue),
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
    labels: metrics.slice(0, 5).map(m => m.title),
    datasets: [
      {
        data: metrics.slice(0, 5).map(m => m.participantCount),
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
    <div className="animate-fade-in space-y-10 pb-20">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
        <div>
          <h1 className="text-4xl font-bold text-white tracking-tight leading-none mb-3">Event Insights</h1>
          <p className="text-slate-500 font-medium text-sm">Comprehensive performance metrics across all event categories</p>
        </div>
        <button onClick={fetchData} className="btn-outline flex items-center gap-2 group">
          <HiOutlineRefresh className="w-4 h-4 group-hover:rotate-180 transition-transform duration-500" />
          <span>Refresh Data</span>
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Total Gross Revenue" 
          value={`₹${totalRevenue.toLocaleString('en-IN')}`} 
          icon={HiOutlineCurrencyRupee} 
          color="text-emerald-400" 
          accent="from-emerald-500/20"
        />
        <StatCard 
          title="Total Participants" 
          value={totalParticipants.toLocaleString()} 
          icon={HiOutlineUsers} 
          color="text-indigo-400" 
          accent="from-indigo-500/20"
        />
        <StatCard 
          title="Top Performing Event" 
          value={metrics[0]?.title || 'N/A'} 
          icon={HiOutlineTrendingUp} 
          color="text-amber-400" 
          accent="from-amber-500/20"
          subtitle={metrics[0] ? `₹${metrics[0].totalRevenue.toLocaleString()}` : ''}
        />
        <StatCard 
          title="Active Events" 
          value={metrics.length} 
          icon={HiOutlineCollection} 
          color="text-violet-400" 
          accent="from-violet-500/20"
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 card bg-slate-900/40 border-white/[0.05] p-8 min-h-[400px]">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Revenue Comparison (Top 10)</h3>
          </div>
          <div className="relative h-[300px]">
            <Bar data={barData} options={chartOptions} />
          </div>
        </div>
        <div className="card bg-slate-900/40 border-white/[0.05] p-8 flex flex-col items-center justify-center">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-8 self-start">Participation Distribution</h3>
          <div className="relative w-full h-[250px]">
            <Pie data={pieData} options={{ maintainAspectRatio: false }} />
          </div>
          <p className="mt-6 text-[10px] font-bold text-slate-600 uppercase tracking-widest text-center">Top 5 Events by Participants</p>
        </div>
      </div>

      {/* Detailed Table */}
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-indigo-600/10 border border-indigo-600/20 flex items-center justify-center text-indigo-500">
            <HiOutlineChartBar className="w-5 h-5" />
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight">Granular Event Analytics</h2>
        </div>

        <div className="card !p-0 overflow-hidden border-slate-700/30 shadow-2xl bg-slate-900/20 backdrop-blur-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-white/[0.01]">
                  <th className="px-8 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-white/[0.05]">Event Name</th>
                  <th className="px-8 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-white/[0.05]">Category</th>
                  <th className="px-8 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-white/[0.05] text-center">Participants</th>
                  <th className="px-8 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-white/[0.05] text-center">Revenue</th>
                  <th className="px-8 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-white/[0.05] text-right">Yield</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.02]">
                {metrics.map((row) => (
                  <tr key={row._id} className="group hover:bg-white/[0.02] transition-all duration-300">
                    <td className="px-8 py-5">
                      <p className="text-sm font-bold text-white group-hover:text-indigo-400 transition-colors tracking-tight">{row.title}</p>
                      <p className="text-[10px] text-slate-600 font-bold uppercase tracking-wider mt-1.5 opacity-60">Fee: ₹{row.registrationFee}</p>
                    </td>
                    <td className="px-8 py-5">
                      <span className="px-2.5 py-1 rounded-md text-[9px] font-bold uppercase tracking-widest bg-slate-900 border border-white/[0.05] text-slate-400">
                        {row.category || 'Standard'}
                      </span>
                    </td>
                    <td className="px-8 py-5 text-center font-bold text-slate-200 tracking-tight tabular-nums">
                      {row.participantCount}
                    </td>
                    <td className="px-8 py-5 text-center font-bold text-white tracking-tight tabular-nums">
                      ₹{row.totalRevenue.toLocaleString()}
                    </td>
                    <td className="px-8 py-5 text-right">
                      {row.participantCount > 0 ? (
                        <div className="flex flex-col items-end">
                          <span className="text-xs font-bold text-emerald-400">
                            ₹{(row.totalRevenue / row.participantCount).toFixed(0)}
                          </span>
                          <span className="text-[9px] text-slate-600 uppercase font-bold tracking-tighter">per pax</span>
                        </div>
                      ) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon: Icon, color, accent, subtitle }) {
  return (
    <div className="card group relative overflow-hidden p-6 border-white/[0.05] hover:border-indigo-500/30 transition-all duration-500 shadow-xl bg-slate-900/40">
      <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${accent} to-transparent blur-3xl -mr-16 -mt-16 opacity-10 group-hover:opacity-40 transition-opacity duration-700`}></div>
      <div className="relative z-10 space-y-4">
        <div className="flex items-center justify-between">
          <div className={`p-3 rounded-xl bg-slate-900 border border-white/[0.05] ${color} shadow-lg transition-transform group-hover:scale-110 lg:group-hover:rotate-6`}>
            <Icon className="w-6 h-6" />
          </div>
        </div>
        <div>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">{title}</p>
          <p className="text-2xl font-bold text-white tracking-tight leading-none">{value}</p>
          {subtitle && (
            <p className={`text-[10px] font-bold mt-2 uppercase tracking-tight ${color}`}>{subtitle}</p>
          )}
        </div>
      </div>
    </div>
  );
}
