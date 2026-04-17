const Payment = require('../models/Payment');
const Transaction = require('../models/Transaction');
const AppError = require('../middleware/AppError');

const getPayments = async (query = {}) => {
  const { page = 1, limit = 20, eventId, status, search } = query;
  const filter = {};
  if (eventId) filter.event_ids = eventId;
  if (status) {
    const statusMap = {
      pending: 'PENDING',
      completed: 'SUCCESS',
      failed: 'FAILED',
    };
    filter.status = statusMap[String(status).toLowerCase()] || String(status).toUpperCase();
  }

  // Search by participant name/email or transaction ID
  if (search) {
    const User = require('../models/User');
    const matchingUsers = await User.find({
      $or: [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
      ],
    }).select('_id');
    filter.$or = [
      { user_id: { $in: matchingUsers.map((u) => u._id) } },
      { transaction_id: { $regex: search, $options: 'i' } },
      { razorpay_order_id: { $regex: search, $options: 'i' } },
      { razorpay_payment_id: { $regex: search, $options: 'i' } },
    ];
  }

  const skip = (Number(page) - 1) * Number(limit);
  const [transactions, total] = await Promise.all([
    Transaction.find(filter)
      .skip(skip)
      .limit(Number(limit))
      .sort({ created_at: -1 })
      .populate('user_id', 'name email phone')
      .populate('event_ids', 'title registrationFee'),
    Transaction.countDocuments(filter),
  ]);

  const statusMap = {
    PENDING: 'pending',
    SUCCESS: 'completed',
    FAILED: 'failed',
  };

  const payments = transactions.map((tx) => ({
    _id: tx._id,
    userId: tx.user_id || null,
    // Keep legacy eventId for backward compatibility (first event)
    eventId: Array.isArray(tx.event_ids) && tx.event_ids.length > 0 ? tx.event_ids[0] : null,
    // Provide all event objects for multi-event display
    eventObjects: tx.event_ids || [],
    amount: Number(tx.amount || 0),
    currency: tx.currency || 'INR',
    status: statusMap[tx.status] || 'pending',
    transactionId: tx.transaction_id,
    razorpayOrderId: tx.razorpay_order_id || null,
    razorpayPaymentId: tx.razorpay_payment_id || null,
    createdAt: tx.created_at,
    canVerify: false,
  }));

  return { payments, total, page: Number(page), pages: Math.ceil(total / Number(limit)) };
};

const verifyPayment = async (paymentId, adminId) => {
  const payment = await Payment.findByIdAndUpdate(
    paymentId,
    { status: 'completed', verifiedAt: new Date(), verifiedBy: adminId },
    { new: true }
  );
  if (!payment) throw new AppError('Payment not found', 404, 'PAYMENT_NOT_FOUND');

  // Auto-confirm registration if payment verified
  const Registration = require('../models/Registration');
  const Ticket = require('../models/Ticket');
  const { v4: uuidv4 } = require('uuid');
  const QRCode = require('qrcode');

  const reg = await Registration.findOneAndUpdate(
    { userId: payment.userId, eventId: payment.eventId },
    { status: 'confirmed' },
    { new: true }
  );

  if (reg) {
    const existing = await Ticket.findOne({ userId: payment.userId, eventId: payment.eventId });
    if (!existing) {
      const ticketId = uuidv4();
      const qrData = await QRCode.toDataURL(ticketId);
      await Ticket.create({ ticketId, userId: payment.userId, eventId: payment.eventId, qrData });
    }
  }

  return payment;
};

const getRevenueStats = async () => {
  const stats = await Payment.aggregate([
    { $match: { status: 'completed' } },
    { $group: { _id: '$eventId', totalRevenue: { $sum: '$amount' }, count: { $sum: 1 } } },
    { $lookup: { from: 'events', localField: '_id', foreignField: '_id', as: 'event' } },
    { $unwind: '$event' },
    {
      $project: {
        eventTitle: '$event.title',
        totalRevenue: {
          $cond: [
            { $eq: [{ $ifNull: ['$event.registrationFee', 0] }, 0] },
            0,
            '$totalRevenue'
          ]
        },
        count: 1
      }
    },
  ]);
  return stats;
};

module.exports = { getPayments, verifyPayment, getRevenueStats };
