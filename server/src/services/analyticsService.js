const User = require('../models/User');
const Event = require('../models/Event');
const Registration = require('../models/Registration');
const Payment = require('../models/Payment');
const Ticket = require('../models/Ticket');
const AppError = require('../middleware/AppError');
const logger = require('../utils/logger');

const getDashboardStats = async () => {
  try {
    const [
      totalUsers,
      totalEvents,
      totalRegistrations,
      totalRevenue,
      recentRegistrations,
      eventPopularity,
      registrationTrend,
    ] = await Promise.all([
      User.countDocuments({ role: 'participant' }),
      Event.countDocuments(),
      Registration.countDocuments({ status: { $ne: 'cancelled' } }),
      Payment.aggregate([
        { $match: { status: 'completed' } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      Registration.find({ status: { $ne: 'cancelled' } })
        .sort({ createdAt: -1 })
        .limit(10)
        .populate('userId', 'name email')
        .populate('eventId', 'title'),
      Registration.aggregate([
        { $group: { _id: '$eventId', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
        { $lookup: { from: 'events', localField: '_id', foreignField: '_id', as: 'event' } },
        { $unwind: '$event' },
        { $project: { eventTitle: '$event.title', count: 1 } },
      ]),
      Registration.aggregate([
        { $match: { createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),
    ]);

    return {
      totalUsers,
      totalEvents,
      totalRegistrations,
      totalRevenue: totalRevenue[0]?.total || 0,
      recentRegistrations,
      eventPopularity,
      registrationTrend,
    };
  } catch (err) {
    // If this is already an AppError, re-throw it
    if (err.isOperational) throw err;

    // Log the internal error but throw a user-friendly message
    logger.error('Dashboard analytics query failed', { error: err.message, stack: err.stack });
    throw new AppError(
      'Unable to load dashboard data at this time. Please try again later.',
      500,
      'ANALYTICS_QUERY_FAILED'
    );
  }
};

module.exports = { getDashboardStats };
