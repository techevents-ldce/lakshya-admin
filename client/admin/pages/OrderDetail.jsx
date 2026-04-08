import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';
import { HiOutlineArrowLeft, HiOutlineRefresh, HiOutlineCurrencyRupee, HiOutlineClipboardCopy } from 'react-icons/hi';
import ConfirmWithPassword from '../components/ConfirmWithPassword';

const STATUS_COLORS = {
  pending: 'badge-yellow', payment_initiated: 'badge-blue', fulfilling: 'badge-blue',
  success: 'badge-green', failed: 'badge-red', cancelled: 'badge-red', refunded: 'badge-yellow',
};

const LIFECYCLE = ['pending', 'payment_initiated', 'fulfilling', 'success'];

export default function OrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [confirmModal, setConfirmModal] = useState({ open: false, title: '', message: '', confirmLabel: '', variant: 'warning', action: null });

  const fetchOrder = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/orders/${id}`);
      setOrder(data.data);
    } catch { toast.error('Failed to load order'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchOrder(); }, [id]);

  const handleRetryFulfillment = () => {
    setConfirmModal({
      open: true, title: 'Retry Fulfillment', confirmLabel: 'Retry', variant: 'warning',
      message: 'This will attempt to re-fulfill the order (create registrations/tickets). This is idempotent.',
      action: async (pw) => {
        await api.post(`/orders/${id}/retry-fulfillment`, { adminPassword: pw });
        toast.success('Fulfillment retry initiated');
        fetchOrder();
      },
    });
  };

  const handleRefund = () => {
    setConfirmModal({
      open: true, title: 'Mark as Refunded', confirmLabel: 'Mark Refunded', variant: 'danger',
      message: 'This will mark the order as refunded. This action is audit-logged.',
      action: async (pw) => {
        await api.patch(`/orders/${id}/refund`, { adminPassword: pw });
        toast.success('Order marked as refunded');
        fetchOrder();
      },
    });
  };

  const copyToClipboard = (text) => { navigator.clipboard.writeText(text); toast.success('Copied'); };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600"></div></div>;
  if (!order) return <div className="text-center py-12 text-gray-400">Order not found</div>;

  const statusIndex = LIFECYCLE.indexOf(order.status);

  return (
    <div>
      <button onClick={() => navigate('/orders')} className="flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-4 text-sm">
        <HiOutlineArrowLeft className="w-4 h-4" /> Back to Orders
      </button>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-lg sm:text-2xl font-bold text-gray-900">Order Detail</h1>
          <div className="flex items-center gap-2 mt-1">
            <span className="font-mono text-sm text-gray-500">{order.orderId || order._id}</span>
            <button onClick={() => copyToClipboard(order.orderId || order._id)} className="text-gray-400 hover:text-gray-600"><HiOutlineClipboardCopy className="w-4 h-4" /></button>
          </div>
        </div>
        <div className="flex gap-2">
          {['failed', 'fulfilling', 'payment_initiated'].includes(order.status) && (
            <button onClick={handleRetryFulfillment} className="btn-primary text-sm flex items-center gap-1.5">
              <HiOutlineRefresh className="w-4 h-4" /> Retry Fulfillment
            </button>
          )}
          {['success', 'failed'].includes(order.status) && (
            <button onClick={handleRefund} className="btn-danger text-sm flex items-center gap-1.5">
              <HiOutlineCurrencyRupee className="w-4 h-4" /> Mark Refunded
            </button>
          )}
        </div>
      </div>

      {/* Status Lifecycle Timeline */}
      <div className="card mb-6">
        <h3 className="font-semibold text-gray-900 mb-4">Order Lifecycle</h3>
        <div className="flex items-center gap-0 overflow-x-auto pb-2">
          {LIFECYCLE.map((step, i) => {
            const isActive = order.status === step;
            const isPast = statusIndex >= 0 && i < statusIndex;
            const isFailed = order.status === 'failed' || order.status === 'cancelled' || order.status === 'refunded';
            return (
              <div key={step} className="flex items-center min-w-0">
                <div className={`flex flex-col items-center min-w-[80px]`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${isActive ? (isFailed ? 'bg-red-500 text-white' : 'bg-primary-600 text-white') : isPast ? 'bg-emerald-500 text-white' : 'bg-gray-200 text-gray-400'}`}>
                    {isPast ? '✓' : i + 1}
                  </div>
                  <span className={`text-[10px] mt-1 text-center ${isActive ? 'font-bold text-gray-900' : 'text-gray-400'}`}>{step.replace('_', ' ')}</span>
                </div>
                {i < LIFECYCLE.length - 1 && <div className={`h-0.5 w-8 ${isPast ? 'bg-emerald-400' : 'bg-gray-200'}`} />}
              </div>
            );
          })}
          {['failed', 'cancelled', 'refunded'].includes(order.status) && (
            <div className="flex items-center ml-2">
              <div className="flex flex-col items-center min-w-[80px]">
                <div className="w-8 h-8 rounded-full bg-red-500 text-white flex items-center justify-center text-xs font-bold">✗</div>
                <span className="text-[10px] mt-1 text-center font-bold text-red-600">{order.status}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Order Info */}
        <div className="card">
          <h3 className="font-semibold text-gray-900 mb-4">Order Information</h3>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between"><dt className="text-gray-500">Status</dt><dd><span className={`badge ${STATUS_COLORS[order.status]}`}>{order.status}</span></dd></div>
            <div className="flex justify-between"><dt className="text-gray-500">Amount</dt><dd className="font-semibold">₹{(order.totalAmount || 0).toLocaleString()} {order.currency}</dd></div>
            <div className="flex justify-between"><dt className="text-gray-500">Free Order</dt><dd>{order.isFreeOrder ? 'Yes' : 'No'}</dd></div>
            <div className="flex justify-between"><dt className="text-gray-500">Created</dt><dd>{new Date(order.createdAt).toLocaleString()}</dd></div>
            {order.verifiedAt && <div className="flex justify-between"><dt className="text-gray-500">Verified At</dt><dd>{new Date(order.verifiedAt).toLocaleString()}</dd></div>}
            {order.verificationSource && <div className="flex justify-between"><dt className="text-gray-500">Verification</dt><dd>{order.verificationSource}</dd></div>}
          </dl>
        </div>

        {/* User Info */}
        <div className="card">
          <h3 className="font-semibold text-gray-900 mb-4">User</h3>
          {order.userId && typeof order.userId === 'object' ? (
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between"><dt className="text-gray-500">Name</dt><dd className="font-medium">{order.userId.name}</dd></div>
              <div className="flex justify-between"><dt className="text-gray-500">Email</dt><dd>{order.userId.email}</dd></div>
              {order.userId.phone && <div className="flex justify-between"><dt className="text-gray-500">Phone</dt><dd>{order.userId.phone}</dd></div>}
              {order.userId.college && <div className="flex justify-between"><dt className="text-gray-500">College</dt><dd>{order.userId.college}</dd></div>}
              <div className="mt-2">
                <button onClick={() => navigate(`/users/${order.userId._id}`)} className="text-primary-600 hover:text-primary-800 text-xs font-medium">View User Profile →</button>
              </div>
            </dl>
          ) : <p className="text-gray-400 text-sm">User data not available</p>}
        </div>
      </div>

      {/* Fulfillment Audit */}
      <div className="card mb-6">
        <h3 className="font-semibold text-gray-900 mb-4">Fulfillment Details</h3>
        <dl className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
          <div><dt className="text-gray-500 text-xs">Registration Created</dt><dd className={`font-medium ${order.registrationCreated ? 'text-emerald-600' : 'text-gray-400'}`}>{order.registrationCreated ? '✓ Yes' : '✗ No'}</dd></div>
          <div><dt className="text-gray-500 text-xs">Ticket Generated</dt><dd className={`font-medium ${order.ticketGenerated ? 'text-emerald-600' : 'text-gray-400'}`}>{order.ticketGenerated ? '✓ Yes' : '✗ No'}</dd></div>
          <div><dt className="text-gray-500 text-xs">Email Triggered</dt><dd className={`font-medium ${order.emailTriggered ? 'text-emerald-600' : 'text-gray-400'}`}>{order.emailTriggered ? '✓ Yes' : '✗ No'}</dd></div>
          {order.fulfillmentStartedAt && <div><dt className="text-gray-500 text-xs">Started At</dt><dd>{new Date(order.fulfillmentStartedAt).toLocaleString()}</dd></div>}
          {order.fulfillmentCompletedAt && <div><dt className="text-gray-500 text-xs">Completed At</dt><dd>{new Date(order.fulfillmentCompletedAt).toLocaleString()}</dd></div>}
          {order.fulfillmentError && <div className="col-span-full"><dt className="text-gray-500 text-xs">Error</dt><dd className="text-red-600 font-mono text-xs mt-1 bg-red-50 p-2 rounded">{order.fulfillmentError}</dd></div>}
        </dl>
      </div>

      {/* Razorpay Debug View */}
      {(order.razorpayOrderId || order.razorpayPaymentId) && (
        <div className="card mb-6">
          <h3 className="font-semibold text-gray-900 mb-4">Gateway Details (Razorpay)</h3>
          <dl className="space-y-2 text-sm">
            {order.razorpayOrderId && (
              <div className="flex items-center gap-2">
                <dt className="text-gray-500 min-w-[140px]">Razorpay Order ID</dt>
                <dd className="font-mono text-xs">{order.razorpayOrderId}</dd>
                <button onClick={() => copyToClipboard(order.razorpayOrderId)} className="text-gray-400 hover:text-gray-600"><HiOutlineClipboardCopy className="w-3.5 h-3.5" /></button>
              </div>
            )}
            {order.razorpayPaymentId && (
              <div className="flex items-center gap-2">
                <dt className="text-gray-500 min-w-[140px]">Razorpay Payment ID</dt>
                <dd className="font-mono text-xs">{order.razorpayPaymentId}</dd>
                <button onClick={() => copyToClipboard(order.razorpayPaymentId)} className="text-gray-400 hover:text-gray-600"><HiOutlineClipboardCopy className="w-3.5 h-3.5" /></button>
              </div>
            )}
          </dl>
        </div>
      )}

      {/* Items Snapshot */}
      {order.itemsSnapshot && order.itemsSnapshot.length > 0 && (
        <div className="card mb-6">
          <h3 className="font-semibold text-gray-900 mb-4">Line Items ({order.itemsSnapshot.length})</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="table-header"><th className="px-4 py-2">Event</th><th className="px-4 py-2">Qty</th><th className="px-4 py-2">Price</th><th className="px-4 py-2">Subtotal</th></tr></thead>
              <tbody>
                {order.itemsSnapshot.map((item, i) => (
                  <tr key={i} className="border-t border-gray-100">
                    <td className="px-4 py-2">{item.eventTitle || item.title || item.eventId || 'N/A'}</td>
                    <td className="px-4 py-2">{item.quantity || item.qty || 1}</td>
                    <td className="px-4 py-2">₹{item.price || item.amount || 0}</td>
                    <td className="px-4 py-2 font-medium">₹{(item.price || item.amount || 0) * (item.quantity || item.qty || 1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Linked Registrations */}
      {order.registrationIds && order.registrationIds.length > 0 && (
        <div className="card mb-6">
          <h3 className="font-semibold text-gray-900 mb-4">Linked Registrations ({order.registrationIds.length})</h3>
          <div className="space-y-2">
            {order.registrationIds.map((reg) => (
              <div key={reg._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <span className="font-medium text-sm">{reg.eventId?.title || 'Unknown Event'}</span>
                  <span className={`ml-2 badge ${reg.status === 'confirmed' ? 'badge-green' : reg.status === 'cancelled' ? 'badge-red' : 'badge-yellow'}`}>{reg.status}</span>
                </div>
                <button onClick={() => navigate(`/registrations/${reg._id}`)} className="text-primary-600 text-xs font-medium hover:text-primary-800">View →</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Linked Tickets */}
      {order.linkedTickets && order.linkedTickets.length > 0 && (
        <div className="card mb-6">
          <h3 className="font-semibold text-gray-900 mb-4">Linked Tickets ({order.linkedTickets.length})</h3>
          <div className="space-y-2">
            {order.linkedTickets.map((t) => (
              <div key={t._id || t.ticketId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <span className="font-mono text-xs">{t.ticketId}</span>
                  <span className={`ml-2 badge ${t.status === 'valid' ? 'badge-green' : t.status === 'used' ? 'badge-blue' : 'badge-red'}`}>{t.status === 'valid' ? 'Active' : t.status}</span>
                </div>
                {t.scannedAt && <span className="text-xs text-gray-400">Used: {new Date(t.scannedAt).toLocaleString()}</span>}
              </div>
            ))}
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
        variant={confirmModal.variant}
      />
    </div>
  );
}
