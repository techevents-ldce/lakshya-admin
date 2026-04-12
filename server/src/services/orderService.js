const Order = require('../models/Order');
const Registration = require('../models/Registration');
const Ticket = require('../models/Ticket');
const User = require('../models/User');
const Team = require('../models/Team');
const TeamMember = require('../models/TeamMember');
const Event = require('../models/Event');
const AppError = require('../middleware/AppError');
const { writeAuditLog } = require('../middleware/auditLog');
const { v4: uuidv4 } = require('uuid');
const QRCode = require('qrcode');

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

const forceFulfillOrder = async (orderId, adminId, reqMeta = {}) => {
  const order = await Order.findById(orderId).populate('userId');
  if (!order) throw new AppError('Order not found', 404, 'ORDER_NOT_FOUND');
  if (order.status === 'success') throw new AppError('Order is already successful', 400, 'ORDER_ALREADY_SUCCESS');

  const before = order.toObject();

  // 1. Mark as fulfilling to prevent race conditions
  order.status = 'fulfilling';
  order.fulfillmentStartedAt = new Date();
  await order.save();

  const registrationIds = [];

  try {
    // 2. Iterate through items snapshot and create registrations
    for (const item of order.itemsSnapshot) {
      const eventId = item.eventId;
      const userId = order.userId._id;

      // Check for existing registration to avoid duplicates
      let reg = await Registration.findOne({ userId, eventId, orderId: order._id });
      
      if (!reg) {
        let teamId = null;
        if (item.registrationMode === 'team') {
          const team = await Team.create({
            eventId,
            leaderId: userId,
            teamName: (item.teamName || `Team-${userId}`).trim()
          });
          teamId = team._id;
          await TeamMember.create({ teamId: team._id, userId, status: 'accepted' });

          // Register members if any
          if (item.members && Array.isArray(item.members)) {
            for (const memberId of item.members) {
              await TeamMember.create({ teamId: team._id, userId: memberId, status: 'accepted' });
              const mReg = await Registration.create({
                userId: memberId,
                eventId,
                teamId: team._id,
                registrationMode: 'team',
                orderId: order._id,
                status: 'confirmed'
              });
              registrationIds.push(mReg._id);
              
              // Issue ticket for member
              const ticketId = uuidv4();
              const qrData = await QRCode.toDataURL(ticketId);
              await Ticket.create({ ticketId, userId: memberId, eventId, registrationId: mReg._id, teamId, qrData, status: 'active' });
            }
          }
        }

        reg = await Registration.create({
          userId,
          eventId,
          teamId,
          registrationMode: item.registrationMode,
          orderId: order._id,
          registrationData: item.extraFields || {},
          status: 'confirmed',
          pricingSnapshot: item
        });
        
        // Issue ticket for leader/solo
        const ticketId = uuidv4();
        const qrData = await QRCode.toDataURL(ticketId);
        await Ticket.create({ ticketId, userId, eventId, registrationId: reg._id, teamId, qrData, status: 'active' });
      }
      
      registrationIds.push(reg._id);
    }

    // 3. Finalize order
    order.status = 'success';
    order.registrationIds = registrationIds;
    order.fulfilledAt = new Date();
    await order.save();

    await writeAuditLog({
      adminId,
      action: 'FORCE_FULFILL_ORDER',
      entityType: 'Order',
      entityId: order._id,
      before,
      after: order.toObject(),
      ip: reqMeta.ip,
      userAgent: reqMeta.userAgent,
    });

    return order;
  } catch (err) {
    order.status = 'failed';
    order.fulfillmentError = err.message;
    await order.save();
    throw err;
  }
};

module.exports = { getOrders, getOrderById, retryFulfillment, forceFulfillOrder, markRefunded };
