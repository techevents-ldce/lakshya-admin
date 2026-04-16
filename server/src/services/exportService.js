const Registration = require('../models/Registration');
const Payment = require('../models/Payment');
const Transaction = require('../models/Transaction');
const Order = require('../models/Order');
const Ticket = require('../models/Ticket');
const { generateCSV, generateExcel } = require('../utils/export');
const AppError = require('../middleware/AppError');

/**
 * Build a date filter object from dateFrom/dateTo strings.
 */
const buildDateFilter = (dateFrom, dateTo) => {
  const df = {};
  if (dateFrom) df.$gte = new Date(dateFrom);
  if (dateTo) {
    const to = new Date(dateTo);
    to.setHours(23, 59, 59, 999);
    df.$lte = to;
  }
  return Object.keys(df).length > 0 ? df : null;
};

const exportParticipants = async (filters = {}) => {
  const { eventId, format = 'csv', status, dateFrom, dateTo } = filters;
  const query = {};
  if (eventId) query.eventId = eventId;
  if (status) query.status = status;
  else query.status = { $ne: 'cancelled' };
  const dateFilter = buildDateFilter(dateFrom, dateTo);
  if (dateFilter) query.createdAt = dateFilter;

  const regs = await Registration.find(query)
    .populate('userId', 'name email phone college branch year')
    .populate('eventId', 'title eventType isPaid registrationFee')
    .populate('teamId', 'teamName')
    .sort({ createdAt: -1 })
    .lean();

  if (!regs.length) {
    throw new AppError('No participants found matching filters', 404, 'NO_PARTICIPANTS_FOUND');
  }

  const data = regs.map((r) => ({
    name: r.userId?.name || 'N/A',
    email: r.userId?.email || 'N/A',
    phone: r.userId?.phone || 'N/A',
    college: r.userId?.college || 'N/A',
    branch: r.userId?.branch || 'N/A',
    year: r.userId?.year || 'N/A',
    event: r.eventId?.title || 'N/A',
    eventType: r.eventId?.eventType || 'N/A',
    team: r.teamId?.teamName || 'N/A',
    status: r.status,
    referralCode: r.referralCodeUsed || 'N/A',
    registeredAt: r.createdAt?.toISOString().split('T')[0],
  }));

  if (format === 'excel') {
    const columns = [
      { header: 'Name', key: 'name', width: 25 },
      { header: 'Email', key: 'email', width: 30 },
      { header: 'Phone', key: 'phone', width: 15 },
      { header: 'College', key: 'college', width: 30 },
      { header: 'Branch', key: 'branch', width: 20 },
      { header: 'Year', key: 'year', width: 8 },
      { header: 'Event', key: 'event', width: 25 },
      { header: 'Event Type', key: 'eventType', width: 12 },
      { header: 'Team', key: 'team', width: 20 },
      { header: 'Status', key: 'status', width: 12 },
      { header: 'Referral Code', key: 'referralCode', width: 15 },
      { header: 'Registered At', key: 'registeredAt', width: 15 },
    ];
    return generateExcel(data, columns, 'Participants');
  }

  const fields = ['name', 'email', 'phone', 'college', 'branch', 'year', 'event', 'eventType', 'team', 'status', 'referralCode', 'registeredAt'];
  return generateCSV(data, fields);
};

const exportPayments = async (filters = {}) => {
  const { eventId, format = 'csv', status, dateFrom, dateTo } = filters;
  const query = {};

  if (eventId) {
    const mongoose = require('mongoose');
    query.event_ids = { $in: [mongoose.Types.ObjectId.createFromHexString(eventId)] };
  }

  if (status) {
    const statusMap = {
      pending: 'PENDING',
      completed: 'SUCCESS',
      failed: 'FAILED',
      refunded: 'REFUNDED',
    };
    query.status = statusMap[status.toLowerCase()] || status.toUpperCase();
  }

  const dateFilter = buildDateFilter(dateFrom, dateTo);
  if (dateFilter) query.created_at = dateFilter;

  const payments = await Transaction.find(query)
    .populate('user_id', 'name email phone')
    .populate('event_ids', 'title registrationFee')
    .sort({ created_at: -1 })
    .lean();

  if (!payments.length) {
    throw new AppError('No payment records found matching filters', 404, 'NO_PAYMENTS_FOUND');
  }

  const data = payments.map((p) => ({
    participant: p.user_id?.name || 'N/A',
    email: p.user_id?.email || 'N/A',
    phone: p.user_id?.phone || 'N/A',
    event: Array.isArray(p.event_ids) ? p.event_ids.map(ev => ev.title).join(', ') : 'N/A',
    amount: p.amount,
    status: p.status,
    transactionId: p.transaction_id || 'N/A',
    razorpayOrderId: p.razorpay_order_id || 'N/A',
    razorpayPaymentId: p.razorpay_payment_id || 'N/A',
    date: p.created_at?.toISOString().split('T')[0],
  }));

  if (format === 'excel') {
    const columns = [
      { header: 'Participant', key: 'participant', width: 25 },
      { header: 'Email', key: 'email', width: 30 },
      { header: 'Phone', key: 'phone', width: 15 },
      { header: 'Events (Bundle)', key: 'event', width: 40 },
      { header: 'Amount (₹)', key: 'amount', width: 12 },
      { header: 'Status', key: 'status', width: 12 },
      { header: 'Transaction ID', key: 'transactionId', width: 25 },
      { header: 'Razorpay Order ID', key: 'razorpayOrderId', width: 25 },
      { header: 'Razorpay Payment ID', key: 'razorpayPaymentId', width: 25 },
      { header: 'Date', key: 'date', width: 15 },
    ];
    return generateExcel(data, columns, 'Payments');
  }

  const fields = ['participant', 'email', 'phone', 'event', 'amount', 'status', 'transactionId', 'razorpayOrderId', 'razorpayPaymentId', 'date'];
  return generateCSV(data, fields);
};

const exportOrders = async (filters = {}) => {
  const { format = 'csv', status, dateFrom, dateTo, eventId } = filters;
  let orders = [];
  try {
    const query = {};
    if (status) query.status = status;
    else query.status = 'success';

    if (eventId) {
      query.$or = [
        { 'itemsSnapshot.eventId': eventId },
        { 'itemsSnapshot.eventId': require('mongoose').Types.ObjectId.createFromHexString(eventId) }
      ];
    }

    const dateFilter = buildDateFilter(dateFrom, dateTo);
    if (dateFilter) query.createdAt = dateFilter;

    orders = await Order.find(query)
      .populate('userId', 'name email phone')
      .sort({ createdAt: -1 })
      .lean();
  } catch (err) {
    throw new AppError('Orders query failed: ' + err.message, 500, 'NO_ORDERS');
  }

  if (!orders.length) {
    throw new AppError('No orders found matching filters', 404, 'NO_ORDERS_FOUND');
  }

  const data = orders.map((o) => ({
    orderId: o.orderId || o._id.toString(),
    participant: o.userId?.name || 'N/A',
    email: o.userId?.email || 'N/A',
    phone: o.userId?.phone || 'N/A',
    amount: o.totalAmount,
    currency: o.currency || 'INR',
    status: o.status,
    razorpayOrderId: o.razorpayOrderId || 'N/A',
    razorpayPaymentId: o.razorpayPaymentId || 'N/A',
    verificationSource: o.verificationSource || 'N/A',
    date: o.createdAt?.toISOString().split('T')[0],
  }));

  if (format === 'excel') {
    const columns = [
      { header: 'Order ID', key: 'orderId', width: 20 },
      { header: 'Participant', key: 'participant', width: 25 },
      { header: 'Email', key: 'email', width: 30 },
      { header: 'Phone', key: 'phone', width: 15 },
      { header: 'Amount', key: 'amount', width: 12 },
      { header: 'Currency', key: 'currency', width: 8 },
      { header: 'Status', key: 'status', width: 12 },
      { header: 'Razorpay Order ID', key: 'razorpayOrderId', width: 25 },
      { header: 'Razorpay Payment ID', key: 'razorpayPaymentId', width: 25 },
      { header: 'Verification', key: 'verificationSource', width: 15 },
      { header: 'Date', key: 'date', width: 15 },
    ];
    return generateExcel(data, columns, 'Orders');
  }

  const fields = ['orderId', 'participant', 'email', 'phone', 'amount', 'currency', 'status', 'razorpayOrderId', 'razorpayPaymentId', 'verificationSource', 'date'];
  return generateCSV(data, fields);
};

const exportAttendance = async (filters = {}) => {
  const { eventId, format = 'csv', dateFrom, dateTo } = filters;
  const query = { status: 'used' };
  if (eventId) query.eventId = eventId;
  const dateFilter = buildDateFilter(dateFrom, dateTo);
  if (dateFilter) query.scannedAt = dateFilter;

  const tickets = await Ticket.find(query)
    .populate('userId', 'name email phone college branch year')
    .populate('eventId', 'title')
    .sort({ scannedAt: -1 })
    .lean();

  if (!tickets.length) {
    throw new AppError('No attendance records found matching filters', 404, 'NO_ATTENDANCE_FOUND');
  }

  const data = tickets.map((t) => ({
    participant: t.userId?.name || 'N/A',
    email: t.userId?.email || 'N/A',
    phone: t.userId?.phone || 'N/A',
    college: t.userId?.college || 'N/A',
    branch: t.userId?.branch || 'N/A',
    year: t.userId?.year || 'N/A',
    event: t.eventId?.title || 'N/A',
    ticketId: t.ticketId,
    checkedInAt: t.scannedAt?.toISOString() || 'N/A',
  }));

  if (format === 'excel') {
    const columns = [
      { header: 'Participant', key: 'participant', width: 25 },
      { header: 'Email', key: 'email', width: 30 },
      { header: 'Phone', key: 'phone', width: 15 },
      { header: 'College', key: 'college', width: 30 },
      { header: 'Branch', key: 'branch', width: 20 },
      { header: 'Year', key: 'year', width: 8 },
      { header: 'Event', key: 'event', width: 25 },
      { header: 'Ticket ID', key: 'ticketId', width: 20 },
      { header: 'Checked In At', key: 'checkedInAt', width: 25 },
    ];
    return generateExcel(data, columns, 'Attendance');
  }

  const fields = ['participant', 'email', 'phone', 'college', 'branch', 'year', 'event', 'ticketId', 'checkedInAt'];
  return generateCSV(data, fields);
};

const exportTickets = async (filters = {}) => {
  const { eventId, format = 'csv', status, dateFrom, dateTo } = filters;
  const query = {};
  if (eventId) query.eventId = eventId;
  if (status) query.status = status;
  const dateFilter = buildDateFilter(dateFrom, dateTo);
  if (dateFilter) query.createdAt = dateFilter;

  const tickets = await Ticket.find(query)
    .populate('userId', 'name email phone college')
    .populate('eventId', 'title eventType')
    .sort({ createdAt: -1 })
    .lean();

  if (!tickets.length) {
    throw new AppError('No tickets found matching filters', 404, 'NO_TICKETS_FOUND');
  }

  const data = tickets.map((t) => ({
    ticketId: t.ticketId,
    participant: t.userId?.name || 'N/A',
    email: t.userId?.email || 'N/A',
    phone: t.userId?.phone || 'N/A',
    college: t.userId?.college || 'N/A',
    event: t.eventId?.title || 'N/A',
    eventType: t.eventId?.eventType || 'N/A',
    status: t.status === 'valid' ? 'Active' : t.status,
    scannedAt: t.scannedAt?.toISOString() || 'N/A',
    issuedAt: t.createdAt?.toISOString().split('T')[0],
  }));

  if (format === 'excel') {
    const columns = [
      { header: 'Ticket ID', key: 'ticketId', width: 25 },
      { header: 'Participant', key: 'participant', width: 25 },
      { header: 'Email', key: 'email', width: 30 },
      { header: 'Phone', key: 'phone', width: 15 },
      { header: 'College', key: 'college', width: 30 },
      { header: 'Event', key: 'event', width: 25 },
      { header: 'Event Type', key: 'eventType', width: 12 },
      { header: 'Status', key: 'status', width: 12 },
      { header: 'Scanned At', key: 'scannedAt', width: 25 },
      { header: 'Issued At', key: 'issuedAt', width: 15 },
    ];
    return generateExcel(data, columns, 'Tickets');
  }

  const fields = ['ticketId', 'participant', 'email', 'phone', 'college', 'event', 'eventType', 'status', 'scannedAt', 'issuedAt'];
  return generateCSV(data, fields);
};

module.exports = { exportParticipants, exportPayments, exportOrders, exportAttendance, exportTickets };
