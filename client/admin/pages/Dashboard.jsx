import { useState, useEffect } from 'react';
import api from '../services/api';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Tooltip, Legend, Filler } from 'chart.js';
import { Line, Doughnut, Bar } from 'react-chartjs-2';
import { HiOutlineUsers, HiOutlineCalendar, HiOutlineTicket, HiOutlineCurrencyRupee } from 'react-icons/hi';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Tooltip, Legend, Filler);

const CHART_COLORS = ['#d97706', '#0d9488', '#6366f1', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f59e0b', '#3b82f6', '#10b981'];

const STATUS_COLORS = {
  pending: '#f59e0b',
  confirmed: '#10b981',
  cancelled: '#ef4444',
  waitlisted: '#6366f1',
  completed: '#10b981',
  failed: '#ef4444',
  refunded: '#8b5cf6',
};

const ROLE_COLORS = {
  admin: '#d97706',
  coordinator: '#3b82f6',
  participant: '#10b981',
};

const doughnutOptions = {
  responsive: true,
  plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, padding: 12, color: '#6b7280' } } },
  cutout: '60%',
};

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
      backgroundColor: CHART_COLORS,
    }],
  };

  // Revenue trend bar chart
  const revenueTrendData = {
    labels: stats?.revenueTrend?.map((d) => d._id) || [],
    datasets: [{
      label: 'Revenue (₹)',
      data: stats?.revenueTrend?.map((d) => d.total) || [],
      backgroundColor: 'rgba(16, 185, 129, 0.7)',
      borderColor: '#10b981',
      borderWidth: 1,
      borderRadius: 4,
    }],
  };

  // User role doughnut
  const userRoleData = {
    labels: stats?.userRoleBreakdown?.map((d) => d._id?.charAt(0).toUpperCase() + d._id?.slice(1)) || [],
    datasets: [{
      data: stats?.userRoleBreakdown?.map((d) => d.count) || [],
      backgroundColor: stats?.userRoleBreakdown?.map((d) => ROLE_COLORS[d._id] || '#6b7280') || [],
    }],
  };

  // Registration status doughnut
  const regStatusData = {
    labels: stats?.registrationStatusBreakdown?.map((d) => d._id?.charAt(0).toUpperCase() + d._id?.slice(1)) || [],
    datasets: [{
      data: stats?.registrationStatusBreakdown?.map((d) => d.count) || [],
      backgroundColor: stats?.registrationStatusBreakdown?.map((d) => STATUS_COLORS[d._id] || '#6b7280') || [],
    }],
  };

  // Payment status doughnut
  const payStatusData = {
    labels: stats?.paymentStatusBreakdown?.map((d) => d._id?.charAt(0).toUpperCase() + d._id?.slice(1)) || [],
    datasets: [{
      data: stats?.paymentStatusBreakdown?.map((d) => d.count) || [],
      backgroundColor: stats?.paymentStatusBreakdown?.map((d) => STATUS_COLORS[d._id] || '#6b7280') || [],
    }],
  };

  // Top paying events horizontal bar
  const topEventsData = {
    labels: stats?.topPayingEvents?.map((d) => d.eventTitle) || [],
    datasets: [{
      label: 'Revenue (₹)',
      data: stats?.topPayingEvents?.map((d) => d.totalRevenue) || [],
      backgroundColor: CHART_COLORS.slice(0, 5),
      borderRadius: 4,
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

      {/* Row 1: Registration Trend + Event Popularity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="lg:col-span-2 card">
          <h3 className="font-semibold text-gray-900 mb-4">Registration Trend (Last 30 Days)</h3>
          <Line data={trendData} options={{ responsive: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } }} />
        </div>
        <div className="card">
          <h3 className="font-semibold text-gray-900 mb-4">Event Popularity</h3>
          <Doughnut data={popularityData} options={doughnutOptions} />
        </div>
      </div>

      {/* Row 2: Revenue Trend + Top Paying Events */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="lg:col-span-2 card">
          <h3 className="font-semibold text-gray-900 mb-4">Revenue Trend (Last 30 Days)</h3>
          {(stats?.revenueTrend?.length || 0) > 0 ? (
            <Bar data={revenueTrendData} options={{ responsive: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { callback: (v) => `₹${v}` } } } }} />
          ) : (
            <p className="text-gray-400 text-sm py-8 text-center">No payment data available yet</p>
          )}
        </div>
        <div className="card">
          <h3 className="font-semibold text-gray-900 mb-4">Top Events by Revenue</h3>
          {(stats?.topPayingEvents?.length || 0) > 0 ? (
            <Bar data={topEventsData} options={{ indexAxis: 'y', responsive: true, plugins: { legend: { display: false } }, scales: { x: { beginAtZero: true, ticks: { callback: (v) => `₹${v}` } } } }} />
          ) : (
            <p className="text-gray-400 text-sm py-8 text-center">No payment data available yet</p>
          )}
        </div>
      </div>

      {/* Row 3: User Roles + Registration Status + Payment Status */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="card">
          <h3 className="font-semibold text-gray-900 mb-4">User Roles</h3>
          {(stats?.userRoleBreakdown?.length || 0) > 0 ? (
            <Doughnut data={userRoleData} options={doughnutOptions} />
          ) : (
            <p className="text-gray-400 text-sm py-8 text-center">No user data</p>
          )}
        </div>
        <div className="card">
          <h3 className="font-semibold text-gray-900 mb-4">Registration Status</h3>
          {(stats?.registrationStatusBreakdown?.length || 0) > 0 ? (
            <Doughnut data={regStatusData} options={doughnutOptions} />
          ) : (
            <p className="text-gray-400 text-sm py-8 text-center">No registration data</p>
          )}
        </div>
        <div className="card">
          <h3 className="font-semibold text-gray-900 mb-4">Payment Status</h3>
          {(stats?.paymentStatusBreakdown?.length || 0) > 0 ? (
            <Doughnut data={payStatusData} options={doughnutOptions} />
          ) : (
            <p className="text-gray-400 text-sm py-8 text-center">No payment data</p>
          )}
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
              {(!stats?.recentRegistrations || stats.recentRegistrations.length === 0) && (
                <tr><td colSpan="3" className="text-center py-8 text-gray-400">No registrations yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
