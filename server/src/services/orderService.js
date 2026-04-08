const Order = require('../models/Order');
const Registration = require('../models/Registration');
const Ticket = require('../models/Ticket');
const User = require('../models/User');
const AppError = require('../middleware/AppError');
const { writeAuditLog } = require('../middleware/auditLog');

const getOrders = async (query = {}) => {
  const { page = 1, limit = 20, status, search, dateFrom, dateTo, amountMin, amountMax, sortBy = 'createdAt', sortOrder = 'desc' } = query;
  const filter = {};

  if (status) filter.status = status;
  if (dateFrom || dateTo) {
    filter.createdAt = {};
    if (dateFrom) filter.createdAt.$gte = new Date(dateFrom);
    if (dateTo) filter.createdAt.$lte = new Date(dateTo);
  }
  if (amountMin || amountMax) {
    filter.totalAmount = {};
    if (amountMin) filter.totalAmount.$gte = Number(amountMin);
    if (amountMax) filter.totalAmount.$lte = Number(amountMax);
  }

  // Search by user name/email or orderId
  if (search) {
    const matchingUsers = await User.find({
      $or: [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ],
    }).select('_id').lean();
    filter.$or = [
      { userId: { $in: matchingUsers.map((u) => u._id) } },
      { orderId: { $regex: search, $options: 'i' } },
      { razorpayOrderId: { $regex: search, $options: 'i' } },
      { razorpayPaymentId: { $regex: search, $options: 'i' } },
    ];
  }

  const skip = (Number(page) - 1) * Number(limit);
  const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

  const [orders, total] = await Promise.all([
    Order.find(filter)
      .skip(skip)
      .limit(Number(limit))
      .sort(sort)
      .populate('userId', 'name email phone')
      .lean(),
    Order.countDocuments(filter),
  ]);

  return { orders, total, page: Number(page), pages: Math.ceil(total / Number(limit)) };
};

const getOrderById = async (id) => {
  const order = await Order.findById(id)
    .populate('userId', 'name email phone college branch year')
    .populate({
      path: 'registrationIds',
      populate: [
        { path: 'eventId', select: 'title slug' },
        { path: 'userId', select: 'name email' },
      ],
    })
    .lean();

  if (!order) throw new AppError('Order not found', 404, 'ORDER_NOT_FOUND');

  // Fetch linked tickets for each registration
  if (order.registrationIds && order.registrationIds.length > 0) {
    const regIds = order.registrationIds.map((r) => r._id);
    const tickets = await Ticket.find({ registrationId: { $in: regIds } })
      .select('ticketId status scannedAt eventId')
      .lean();

    // Also try matching by userId+eventId for tickets without registrationId
    const userEventPairs = order.registrationIds.map((r) => ({
      userId: order.userId._id || order.userId,
      eventId: r.eventId?._id || r.eventId,
    }));
    const fallbackTickets = await Ticket.find({
      $or: userEventPairs.map((p) => ({ userId: p.userId, eventId: p.eventId })),
    }).select('ticketId status scannedAt eventId userId').lean();

    // Merge, dedup by ticketId
    const allTickets = [...tickets];
    const existingIds = new Set(tickets.map((t) => t.ticketId));
    for (const t of fallbackTickets) {
      if (!existingIds.has(t.ticketId)) allTickets.push(t);
    }
    order.linkedTickets = allTickets;
  }

  return order;
};

const retryFulfillment = async (orderId, adminId, reqMeta = {}) => {
  const order = await Order.findById(orderId);
  if (!order) throw new AppError('Order not found', 404, 'ORDER_NOT_FOUND');
  if (order.status === 'success') throw new AppError('Order already fulfilled', 400, 'ORDER_ALREADY_FULFILLED');
  if (!['failed', 'fulfilling', 'payment_initiated'].includes(order.status)) {
    throw new AppError(`Cannot retry fulfillment for order in "${order.status}" status`, 400, 'INVALID_ORDER_STATUS');
  }

  const before = order.toObject();

  order.status = 'fulfilling';
  order.fulfillmentStartedAt = new Date();
  order.fulfillmentError = null;
  await order.save();

  await writeAuditLog({
    adminId,
    action: 'RETRY_FULFILLMENT',
    entityType: 'Order',
    entityId: order._id,
    before,
    after: order.toObject(),
    ip: reqMeta.ip,
    userAgent: reqMeta.userAgent,
  });

  return order;
};

const markRefunded = async (orderId, adminId, reqMeta = {}) => {
  const order = await Order.findById(orderId);
  if (!order) throw new AppError('Order not found', 404, 'ORDER_NOT_FOUND');
  if (order.status === 'refunded') throw new AppError('Order already refunded', 400, 'ORDER_ALREADY_REFUNDED');
  if (!['success', 'failed'].includes(order.status)) {
    throw new AppError(`Cannot refund order in "${order.status}" status`, 400, 'INVALID_ORDER_STATUS');
  }

  const before = order.toObject();
  order.status = 'refunded';
  await order.save();

  await writeAuditLog({
    adminId,
    action: 'MARK_REFUNDED',
    entityType: 'Order',
    entityId: order._id,
    before,
    after: order.toObject(),
    ip: reqMeta.ip,
    userAgent: reqMeta.userAgent,
  });

  return order;
};

module.exports = { getOrders, getOrderById, retryFulfillment, markRefunded };
