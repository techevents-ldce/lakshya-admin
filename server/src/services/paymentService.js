const Payment = require('../models/Payment');
const AppError = require('../middleware/AppError');

const getPayments = async (query = {}) => {
  const { page = 1, limit = 20, eventId, status } = query;
  const filter = {};
  if (eventId) filter.eventId = eventId;
  if (status) filter.status = status;

  const skip = (Number(page) - 1) * Number(limit);
  const [payments, total] = await Promise.all([
    Payment.find(filter)
      .skip(skip)
      .limit(Number(limit))
      .sort({ createdAt: -1 })
      .populate('userId', 'name email phone')
      .populate('eventId', 'title registrationFee'),
    Payment.countDocuments(filter),
  ]);
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
    { $project: { eventTitle: '$event.title', totalRevenue: 1, count: 1 } },
  ]);
  return stats;
};

module.exports = { getPayments, verifyPayment, getRevenueStats };
