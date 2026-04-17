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
const mongoose = require('mongoose');
const Transaction = require('../models/Transaction');

/** Normalise a referral code from itemsSnapshot to uppercase, trimmed, or null if empty. */
const normaliseItemReferralCode = (code) => {
  if (!code || typeof code !== 'string') return null;
  const n = code.trim().toUpperCase();
  return n.length >= 2 ? n : null;
};

const getOrders = async (query = {}) => {
  const { page = 1, limit = 20, status, search, dateFrom, dateTo, amountMin, amountMax, eventId, sortBy = 'createdAt', sortOrder = 'desc' } = query;
  const filter = {};

  if (status) filter.status = status;
  if (eventId) {
    const eventIdObj = new mongoose.Types.ObjectId(eventId);
    filter.itemsSnapshot = { $elemMatch: { eventId: { $in: [eventId, eventIdObj] } } };
  }
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

  const [ordersRaw, total] = await Promise.all([
    Order.find(filter)
      .skip(skip)
      .limit(Number(limit))
      .sort(sort)
      .populate('userId', 'name email phone')
      .lean(),
    Order.countDocuments(filter),
  ]);

  // Augment orders with comprehensive event titles from itemsSnapshot
  const Event = require('../models/Event');
  const allEvents = await Event.find({}).select('title').lean();
  const eventMap = {};
  allEvents.forEach(e => { eventMap[e._id.toString()] = e.title; });

  const orders = ordersRaw.map(o => {
    let combinedTitles = [];
    if (Array.isArray(o.itemsSnapshot)) {
      o.itemsSnapshot.forEach(item => {
        const id = item.eventId?.toString();
        if (id && eventMap[id]) {
          combinedTitles.push(eventMap[id]);
        }
      });
    }
    // Deduplicate just in case
    combinedTitles = [...new Set(combinedTitles)];
    
    return {
      ...o,
      eventsSummary: combinedTitles.length > 0 ? combinedTitles.join(' + ') : 'Unknown Events'
    };
  });

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

/**
 * Read-only reconciliation view for admin support.
 * Surfaces:
 * - Orders NOT success that have a matching SUCCESS Transaction (captured but unfulfilled)
 * - SUCCESS Transactions that have no matching Order
 *
 * This uses the portal's Transaction mirror since this service does not call Razorpay APIs.
 */
const getReconciliationReport = async (query = {}) => {
  const { limit = 50 } = query;
  const lim = Math.min(Math.max(Number(limit) || 50, 1), 500);

  const [stuckOrders, orphanTransactions, ordersMissingSuccessTx] = await Promise.all([
    Order.aggregate([
      { $match: { status: { $ne: 'success' }, $or: [{ razorpayOrderId: { $ne: null } }, { razorpayPaymentId: { $ne: null } }] } },
      {
        $lookup: {
          from: 'transactions',
          let: { rpo: '$razorpayOrderId', rpp: '$razorpayPaymentId' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$status', 'SUCCESS'] },
                    {
                      $or: [
                        { $and: [{ $ne: ['$$rpp', null] }, { $eq: ['$razorpay_payment_id', '$$rpp'] }] },
                        { $and: [{ $ne: ['$$rpo', null] }, { $eq: ['$razorpay_order_id', '$$rpo'] }] },
                      ],
                    },
                  ],
                },
              },
            },
            { $project: { _id: 1, transaction_id: 1, razorpay_order_id: 1, razorpay_payment_id: 1, amount: 1, currency: 1, status: 1, created_at: 1, user_id: 1, event_ids: 1 } },
          ],
          as: 'matchingTransactions',
        },
      },
      { $match: { 'matchingTransactions.0': { $exists: true } } },
      { $sort: { updatedAt: -1 } },
      { $limit: lim },
      {
        $project: {
          _id: 1,
          userId: 1,
          status: 1,
          totalAmount: 1,
          currency: 1,
          razorpayOrderId: 1,
          razorpayPaymentId: 1,
          fulfillmentError: 1,
          fulfillmentStartedAt: 1,
          fulfillmentFailedAt: 1,
          createdAt: 1,
          updatedAt: 1,
          matchingTransactions: 1,
        },
      },
    ]),
    Transaction.aggregate([
      { $match: { status: 'SUCCESS', $or: [{ razorpay_order_id: { $ne: null } }, { razorpay_payment_id: { $ne: null } }] } },
      {
        $lookup: {
          from: 'orders',
          let: { rpo: '$razorpay_order_id', rpp: '$razorpay_payment_id' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $or: [
                    { $and: [{ $ne: ['$$rpp', null] }, { $eq: ['$razorpayPaymentId', '$$rpp'] }] },
                    { $and: [{ $ne: ['$$rpo', null] }, { $eq: ['$razorpayOrderId', '$$rpo'] }] },
                  ],
                },
              },
            },
            { $project: { _id: 1, status: 1, totalAmount: 1, razorpayOrderId: 1, razorpayPaymentId: 1, userId: 1, createdAt: 1 } },
          ],
          as: 'matchingOrders',
        },
      },
      { $match: { matchingOrders: { $eq: [] } } },
      { $sort: { created_at: -1 } },
      { $limit: lim },
      { $project: { _id: 1, transaction_id: 1, razorpay_order_id: 1, razorpay_payment_id: 1, amount: 1, currency: 1, status: 1, created_at: 1, user_id: 1, event_ids: 1 } },
    ]),
    Order.aggregate([
      { $match: { status: { $ne: 'success' }, $or: [{ razorpayOrderId: { $ne: null } }, { razorpayPaymentId: { $ne: null } }] } },
      {
        $lookup: {
          from: 'transactions',
          let: { rpo: '$razorpayOrderId', rpp: '$razorpayPaymentId' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$status', 'SUCCESS'] },
                    {
                      $or: [
                        { $and: [{ $ne: ['$$rpp', null] }, { $eq: ['$razorpay_payment_id', '$$rpp'] }] },
                        { $and: [{ $ne: ['$$rpo', null] }, { $eq: ['$razorpay_order_id', '$$rpo'] }] },
                      ],
                    },
                  ],
                },
              },
            },
            { $project: { _id: 1 } },
          ],
          as: 'successTx',
        },
      },
      { $match: { successTx: { $eq: [] } } },
      { $sort: { updatedAt: -1 } },
      { $limit: lim },
      {
        $project: {
          _id: 1,
          userId: 1,
          status: 1,
          totalAmount: 1,
          currency: 1,
          razorpayOrderId: 1,
          razorpayPaymentId: 1,
          fulfillmentError: 1,
          fulfillmentStartedAt: 1,
          fulfillmentFailedAt: 1,
          createdAt: 1,
          updatedAt: 1,
        },
      },
    ]),
  ]);

  return { stuckOrders, orphanTransactions, ordersMissingSuccessTx, limit: lim };
};

const forceFulfillOrder = async (orderId, adminId, reqMeta = {}) => {
  // Acquire an atomic lock (prevents repeated-click + concurrent runs unless already stuck fulfilling)
  const locked = await Order.findOneAndUpdate(
    { _id: orderId, status: { $nin: ['success', 'refunded'] } },
    { $set: { status: 'fulfilling', fulfillmentStartedAt: new Date(), fulfillmentError: null } },
    { new: true }
  ).populate('userId');

  if (!locked) {
    const existing = await Order.findById(orderId).select('status').lean();
    if (!existing) throw new AppError('Order not found', 404, 'ORDER_NOT_FOUND');
    if (existing.status === 'success') throw new AppError('Order is already successful', 400, 'ORDER_ALREADY_SUCCESS');
    throw new AppError(`Cannot force fulfill order in "${existing.status}" status`, 400, 'INVALID_ORDER_STATUS');
  }

  const before = locked.toObject();

  const session = await mongoose.startSession();
  try {
    // [ADMIN OVERRIDE]: Strict transaction validation removed. 
    // Force fulfill allows the admin to bypass Razorpay transaction checks.
    // The action is still strictly logged in the Audit Trail.

    let finalOrder;
    await session.withTransaction(async () => {
      const order = await Order.findById(orderId).session(session).populate('userId');
      if (!order) throw new AppError('Order not found', 404, 'ORDER_NOT_FOUND');
      if (order.status === 'success') throw new AppError('Order is already successful', 400, 'ORDER_ALREADY_SUCCESS');

      const registrationIds = new Set((order.registrationIds || []).map((id) => id.toString()));

      for (const item of order.itemsSnapshot || []) {
        const eventId = item.eventId;
        const userId = order.userId._id;

        // Ensure event exists (guards against corrupted snapshots)
        const ev = await Event.findById(eventId).select('_id eventType').session(session).lean();
        if (!ev) throw new AppError('Event not found for order item', 400, 'EVENT_NOT_FOUND_FOR_ITEM');

        const isTeamItem = item.registrationMode === 'team' || ev.eventType === 'team';

        // Leader registration: idempotent under unique index (userId+eventId)
        let leaderReg = await Registration.findOne({ userId, eventId }).session(session);

        // Team resolution (prefer existing registration.teamId)
        let teamId = leaderReg?.teamId || null;
        if (isTeamItem && !teamId) {
          const team = await Team.create([{
            eventId,
            leaderId: userId,
            teamName: String(item.teamName || `Team-${userId}`).trim(),
          }], { session });
          teamId = team[0]._id;

          // Upsert leader membership
          await TeamMember.findOneAndUpdate(
            { teamId, userId },
            { $set: { status: 'accepted' } },
            { upsert: true, new: true, session }
          );
        }

        const itemReferralCode = normaliseItemReferralCode(item.referralCode);

        if (!leaderReg) {
          leaderReg = await Registration.create([{
            userId,
            eventId,
            teamId,
            registrationMode: isTeamItem ? 'team' : 'individual',
            orderId: order._id,
            registrationData: item.extraFields || {},
            status: 'confirmed',
            pricingSnapshot: item,
            // Propagate referral code from checkout snapshot into Registration
            referralCodeUsed: itemReferralCode || undefined,
          }], { session }).then((r) => r[0]);
        } else {
          // Ensure confirmed + link back to this order if missing
          leaderReg.status = 'confirmed';
          if (!leaderReg.orderId) leaderReg.orderId = order._id;
          if (isTeamItem && !leaderReg.teamId && teamId) leaderReg.teamId = teamId;
          // Set referral code if not already present and code is known from this order
          if (itemReferralCode && !leaderReg.referralCodeUsed) {
            leaderReg.referralCodeUsed = itemReferralCode;
          }
          await leaderReg.save({ session });
        }

        registrationIds.add(leaderReg._id.toString());

        // Leader ticket: idempotent by (userId,eventId)
        const existingLeaderTicket = await Ticket.findOne({ userId, eventId }).session(session);
        if (!existingLeaderTicket) {
          const ticketId = uuidv4();
          const qrData = await QRCode.toDataURL(ticketId);
          await Ticket.create([{
            ticketId,
            userId,
            eventId,
            registrationId: leaderReg._id,
            teamId: leaderReg.teamId || null,
            qrData,
            status: 'valid',
          }], { session });
        } else if (!existingLeaderTicket.registrationId) {
          existingLeaderTicket.registrationId = leaderReg._id;
          if (leaderReg.teamId && !existingLeaderTicket.teamId) existingLeaderTicket.teamId = leaderReg.teamId;
          await existingLeaderTicket.save({ session });
        }

        // Team members (if provided): idempotent
        if (isTeamItem && teamId && Array.isArray(item.members)) {
          for (const memberIdRaw of item.members) {
            const memberId = memberIdRaw;
            if (!memberId) continue;

            await TeamMember.findOneAndUpdate(
              { teamId, userId: memberId },
              { $set: { status: 'accepted' } },
              { upsert: true, new: true, session }
            );

            let mReg = await Registration.findOne({ userId: memberId, eventId }).session(session);
            if (!mReg) {
              mReg = await Registration.create([{
                userId: memberId,
                eventId,
                teamId,
                registrationMode: 'team',
                orderId: order._id,
                status: 'confirmed',
                pricingSnapshot: item,
                // Members share the same referral code as the leader for this order
                referralCodeUsed: itemReferralCode || undefined,
              }], { session }).then((r) => r[0]);
            } else {
              mReg.status = 'confirmed';
              if (!mReg.orderId) mReg.orderId = order._id;
              if (!mReg.teamId) mReg.teamId = teamId;
              if (itemReferralCode && !mReg.referralCodeUsed) {
                mReg.referralCodeUsed = itemReferralCode;
              }
              await mReg.save({ session });
            }

            registrationIds.add(mReg._id.toString());

            const existingMemberTicket = await Ticket.findOne({ userId: memberId, eventId }).session(session);
            if (!existingMemberTicket) {
              const ticketId = uuidv4();
              const qrData = await QRCode.toDataURL(ticketId);
              await Ticket.create([{
                ticketId,
                userId: memberId,
                eventId,
                registrationId: mReg._id,
                teamId,
                qrData,
                status: 'valid',
              }], { session });
            } else if (!existingMemberTicket.registrationId) {
              existingMemberTicket.registrationId = mReg._id;
              if (!existingMemberTicket.teamId) existingMemberTicket.teamId = teamId;
              await existingMemberTicket.save({ session });
            }
          }
        }
      }

      // Ensure transaction accounting matches for revenue/finance tabs
      if (Number(order.totalAmount || 0) > 0) {
        let txExists = null;
        if (order.razorpayPaymentId || order.razorpayOrderId) {
          txExists = await Transaction.findOne({
            $or: [
              ...(order.razorpayPaymentId ? [{ razorpay_payment_id: order.razorpayPaymentId }] : []),
              ...(order.razorpayOrderId ? [{ razorpay_order_id: order.razorpayOrderId }] : [])
            ]
          }).session(session);
        }

        if (!txExists) {
          const spoofId = `manual_override_${uuidv4().replace(/-/g, '').substring(0, 14)}`;
          await Transaction.create([{
            transaction_id: `tx_${spoofId}`,
            razorpay_order_id: order.razorpayOrderId || `order_${spoofId}`,
            razorpay_payment_id: order.razorpayPaymentId || `pay_${spoofId}`,
            amount: Number(order.totalAmount),
            currency: order.currency || 'INR',
            status: 'SUCCESS',
            user_id: order.userId._id || order.userId,
            event_ids: (order.itemsSnapshot || []).map(i => i.eventId),
          }], { session });

          // Fill in the missing razorpayOrderId so it links fully to the new dummy tx everywhere in UI
          if (!order.razorpayOrderId) order.razorpayOrderId = `order_${spoofId}`;
          if (!order.razorpayPaymentId) order.razorpayPaymentId = `pay_${spoofId}`;
        } else if (txExists.status !== 'SUCCESS') {
           txExists.status = 'SUCCESS';
           await txExists.save({ session });
        }
      }

      order.status = 'success';
      order.registrationIds = [...registrationIds].map((id) => new mongoose.Types.ObjectId(id));
      order.fulfillmentCompletedAt = new Date();
      order.fulfillmentError = null;
      await order.save({ session });

      finalOrder = order;
    });

    await writeAuditLog({
      adminId,
      action: 'FORCE_FULFILL_ORDER',
      entityType: 'Order',
      entityId: orderId,
      before,
      after: (await Order.findById(orderId).lean()),
      ip: reqMeta.ip,
      userAgent: reqMeta.userAgent,
    });

    return finalOrder;
  } catch (err) {
    // Best-effort: mark failed (outside transaction) so admins can see the error
    await Order.findByIdAndUpdate(orderId, {
      $set: {
        status: 'failed',
        fulfillmentError: err?.message || 'Force fulfill failed',
        fulfillmentFailedAt: new Date(),
      },
    });
    throw err;
  } finally {
    session.endSession();
  }
};

module.exports = { getOrders, getOrderById, retryFulfillment, forceFulfillOrder, markRefunded, getReconciliationReport };
