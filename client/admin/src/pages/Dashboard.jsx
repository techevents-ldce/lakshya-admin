import { useState, useEffect } from 'react';
import api from '../services/api';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Tooltip, Legend, Filler } from 'chart.js';
import { Line, Doughnut, Bar } from 'react-chartjs-2';
import { HiOutlineUsers, HiOutlineCalendar, HiOutlineTicket, HiOutlineCurrencyRupee } from 'react-icons/hi';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Tooltip, Legend, Filler);

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/analytics/dashboard').then(({ data }) => setStats(data.data)).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600"></div></div>;

  const statCards = [
    { label: 'Total Users', value: stats?.totalUsers || 0, icon: HiOutlineUsers, color: 'bg-blue-500' },
    { label: 'Total Events', value: stats?.totalEvents || 0, icon: HiOutlineCalendar, color: 'bg-emerald-500' },
    { label: 'Registrations', value: stats?.totalRegistrations || 0, icon: HiOutlineTicket, color: 'bg-purple-500' },
    { label: 'Revenue (₹)', value: `₹${(stats?.totalRevenue || 0).toLocaleString()}`, icon: HiOutlineCurrencyRupee, color: 'bg-primary-500' },
  ];

  // Registration trend chart
  const trendData = {
    labels: stats?.registrationTrend?.map((d) => d._id) || [],
    datasets: [{
      label: 'Registrations',
      data: stats?.registrationTrend?.map((d) => d.count) || [],
      fill: true,
      backgroundColor: 'rgba(217, 119, 6, 0.1)',
      borderColor: '#d97706',
      tension: 0.4,
      pointBackgroundColor: '#d97706',
    }],
  };

  // Event popularity
  const popularityData = {
    labels: stats?.eventPopularity?.map((d) => d.eventTitle) || [],
    datasets: [{
      data: stats?.eventPopularity?.map((d) => d.count) || [],
      backgroundColor: ['#d97706', '#0d9488', '#6366f1', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f59e0b', '#3b82f6', '#10b981'],
    }],
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-lg sm:text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">Welcome to Lakshya Admin</p>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        {statCards.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="stat-card">
            <div className={`${color} w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center shadow-lg`}>
              <Icon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <div className="min-w-0">
              <p className="text-xs sm:text-sm text-gray-500 truncate">{label}</p>
              <p className="text-xl sm:text-2xl font-bold text-gray-900">{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-2 card">
          <h3 className="font-semibold text-gray-900 mb-4">Registration Trend (Last 30 Days)</h3>
          <Line data={trendData} options={{ responsive: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } }} />
        </div>
        <div className="card">
          <h3 className="font-semibold text-gray-900 mb-4">Event Popularity</h3>
          <Doughnut data={popularityData} options={{ responsive: true, plugins: { legend: { position: 'bottom', labels: { boxWidth: 12 } } } }} />
        </div>
      </div>

      {/* Recent Registrations */}
      <div className="card">
        <h3 className="font-semibold text-gray-900 mb-4">Recent Registrations</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="table-header"><th className="px-4 py-3">User</th><th className="px-4 py-3">Event</th><th className="px-4 py-3 hidden sm:table-cell">Date</th></tr></thead>
            <tbody>
              {stats?.recentRegistrations?.map((r, i) => (
                <tr key={i} className="border-t border-gray-100 hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">{r.userId?.name} <span className="text-gray-400 text-xs hidden sm:inline">({r.userId?.email})</span></td>
                  <td className="px-4 py-3">{r.eventId?.title}</td>
                  <td className="px-4 py-3 text-gray-500 hidden sm:table-cell">{new Date(r.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
