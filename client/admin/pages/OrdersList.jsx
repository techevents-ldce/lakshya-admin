import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';
import { HiOutlineSearch, HiOutlineClipboardCopy, HiOutlineEye } from 'react-icons/hi';

const STATUS_COLORS = {
  pending: 'badge-yellow',
  payment_initiated: 'badge-blue',
  fulfilling: 'badge-blue',
  success: 'badge-green',
  failed: 'badge-red',
  cancelled: 'badge-red',
  refunded: 'badge-yellow',
};

export default function OrdersList() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const params = { page, limit: 20 };
      if (statusFilter) params.status = statusFilter;
      if (search) params.search = search;
      if (dateFrom) params.dateFrom = dateFrom;
      if (dateTo) params.dateTo = dateTo;
      const { data } = await api.get('/orders', { params });
      setOrders(data.orders || []);
      setTotal(data.total || 0);
      setPages(data.pages || 0);
    } catch {
      toast.error('Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchOrders(); }, [page, statusFilter, search, dateFrom, dateTo]);

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg sm:text-2xl font-bold text-gray-900">Orders / Payments</h1>
          <p className="text-sm text-gray-500 mt-1">{total} total orders</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-6 flex-wrap">
        <div className="relative w-full sm:max-w-xs">
          <HiOutlineSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input type="text" placeholder="Search by name, email, order ID..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="input-field pl-10" />
        </div>
        <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} className="input-field w-full sm:w-auto sm:min-w-[160px]">
          <option value="">All Status</option>
          <option value="pending">Pending</option>
          <option value="payment_initiated">Payment Initiated</option>
          <option value="fulfilling">Fulfilling</option>
          <option value="success">Success</option>
          <option value="failed">Failed</option>
          <option value="cancelled">Cancelled</option>
          <option value="refunded">Refunded</option>
        </select>
        <input type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setPage(1); }} className="input-field w-full sm:w-auto" placeholder="From" />
        <input type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setPage(1); }} className="input-field w-full sm:w-auto" placeholder="To" />
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600"></div>
        </div>
      ) : (
        <div className="card overflow-hidden p-0 overflow-x-auto">
          <table className="w-full text-sm min-w-[700px]">
            <thead>
              <tr className="table-header">
                <th className="px-4 py-3">Order ID</th>
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 hidden md:table-cell">Razorpay ID</th>
                <th className="px-4 py-3 hidden lg:table-cell">Verification</th>
                <th className="px-4 py-3 hidden sm:table-cell">Date</th>
                <th className="px-4 py-3">Action</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o._id} className="border-t border-gray-100 hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-xs text-gray-700">{(o.orderId || o._id)?.slice(0, 12)}...</span>
                      <button onClick={(e) => { e.stopPropagation(); copyToClipboard(o.orderId || o._id); }} className="text-gray-400 hover:text-gray-600" title="Copy">
                        <HiOutlineClipboardCopy className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">{o.userId?.name || 'N/A'}</div>
                    <div className="text-xs text-gray-500">{o.userId?.email || ''}</div>
                  </td>
                  <td className="px-4 py-3 font-semibold">₹{(o.totalAmount || 0).toLocaleString()}</td>
                  <td className="px-4 py-3"><span className={`badge ${STATUS_COLORS[o.status] || 'badge-yellow'}`}>{o.status}</span></td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    {o.razorpayPaymentId ? (
                      <div className="flex items-center gap-1">
                        <span className="text-xs font-mono text-gray-500">{o.razorpayPaymentId.slice(0, 14)}...</span>
                        <button onClick={(e) => { e.stopPropagation(); copyToClipboard(o.razorpayPaymentId); }} className="text-gray-400 hover:text-gray-600">
                          <HiOutlineClipboardCopy className="w-3 h-3" />
                        </button>
                      </div>
                    ) : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500 hidden lg:table-cell">{o.verificationSource || '—'}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs hidden sm:table-cell">{o.createdAt ? new Date(o.createdAt).toLocaleDateString() : '—'}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => navigate(`/orders/${o._id}`)} className="text-primary-600 hover:text-primary-800 flex items-center gap-1 text-xs font-medium">
                      <HiOutlineEye className="w-4 h-4" /> View
                    </button>
                  </td>
                </tr>
              ))}
              {orders.length === 0 && (
                <tr><td colSpan="8" className="text-center py-8 text-gray-400">No orders found</td></tr>
              )}
            </tbody>
          </table>
          {pages > 1 && (
            <div className="flex flex-wrap items-center justify-center gap-2 py-4 border-t border-gray-100">
              {Array.from({ length: Math.min(pages, 10) }, (_, i) => (
                <button key={i} onClick={() => setPage(i + 1)} className={`w-8 h-8 rounded-lg text-sm font-medium ${page === i + 1 ? 'bg-primary-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>{i + 1}</button>
              ))}
              {pages > 10 && <span className="text-gray-400 text-sm">...{pages} pages</span>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
