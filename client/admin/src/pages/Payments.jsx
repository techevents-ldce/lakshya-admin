import { useState, useEffect } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { HiOutlineCheckCircle } from 'react-icons/hi';

export default function Payments() {
  const [payments, setPayments] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchPayments = async () => {
    setLoading(true);
    try {
      const params = { page, limit: 15 };
      if (statusFilter) params.status = statusFilter;
      const { data } = await api.get('/payments', { params });
      setPayments(data.payments);
      setTotal(data.pages);
    } catch { toast.error('Failed to load payments'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchPayments(); }, [page, statusFilter]);

  const handleVerify = async (id) => {
    try {
      await api.patch(`/payments/${id}/verify`);
      toast.success('Payment verified');
      fetchPayments();
    } catch { toast.error('Verification failed'); }
  };

  const statusColor = { completed: 'badge-green', pending: 'badge-yellow', failed: 'badge-red', refunded: 'badge-blue' };

  return (
    <div>
      <h1 className="text-lg sm:text-2xl font-bold mb-6">Payment Management</h1>

      <div className="mb-6">
        <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} className="input-field w-full sm:max-w-xs">
          <option value="">All Status</option>
          <option value="pending">Pending</option>
          <option value="completed">Completed</option>
          <option value="failed">Failed</option>
          <option value="refunded">Refunded</option>
        </select>
      </div>

      {loading ? <div className="text-center py-12 text-gray-400">Loading...</div> : (
        <div className="card overflow-hidden p-0 overflow-x-auto">
          <table className="w-full text-sm min-w-[450px]">
            <thead><tr className="table-header">
              <th className="px-5 py-3">Participant</th><th className="px-5 py-3 hidden sm:table-cell">Event</th><th className="px-5 py-3">Amount</th><th className="px-5 py-3">Status</th><th className="px-5 py-3 hidden md:table-cell">Transaction ID</th><th className="px-5 py-3">Action</th>
            </tr></thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p._id} className="border-t border-gray-100 hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3 font-medium">{p.userId?.name}</td>
                  <td className="px-5 py-3 hidden sm:table-cell">{p.eventId?.title}</td>
                  <td className="px-5 py-3 font-semibold">₹{p.amount}</td>
                  <td className="px-5 py-3"><span className={`badge ${statusColor[p.status]}`}>{p.status}</span></td>
                  <td className="px-5 py-3 text-gray-400 text-xs font-mono hidden md:table-cell">{p.transactionId || '—'}</td>
                  <td className="px-5 py-3">
                    {p.status === 'pending' && (
                      <button onClick={() => handleVerify(p._id)} className="text-emerald-600 hover:text-emerald-800 flex items-center gap-1 text-xs font-medium">
                        <HiOutlineCheckCircle className="w-4 h-4" /> Verify
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {payments.length === 0 && <tr><td colSpan="6" className="text-center py-8 text-gray-400">No payments found</td></tr>}
            </tbody>
          </table>
          {total > 1 && (
            <div className="flex flex-wrap items-center justify-center gap-2 py-4 border-t border-gray-100">
              {Array.from({ length: total }, (_, i) => (
                <button key={i} onClick={() => setPage(i + 1)} className={`w-8 h-8 rounded-lg text-sm font-medium ${page === i + 1 ? 'bg-primary-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>{i + 1}</button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
