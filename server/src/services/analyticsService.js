const User = require('../models/User');
const Event = require('../models/Event');
const Registration = require('../models/Registration');
const Payment = require('../models/Payment');
const Ticket = require('../models/Ticket');
const Team = require('../models/Team');
const AppError = require('../middleware/AppError');
const logger = require('../utils/logger');
const { mergeCollegeStatsForDisplay } = require('../utils/collegeDisplayGroup');

const getDashboardStats = async (filters = {}) => {
  try {
    const { dateFrom, dateTo, eventId, registrationMode } = filters;

    // Build date match condition
    const dateMatch = {};
    if (dateFrom) dateMatch.$gte = new Date(dateFrom);
    if (dateTo) dateMatch.$lte = new Date(dateTo);
    const hasDateFilter = Object.keys(dateMatch).length > 0;

    // Build registration filter
    const regFilter = { status: { $ne: 'cancelled' } };
    if (eventId) regFilter.eventId = require('mongoose').Types.ObjectId.createFromHexString(eventId);
    if (hasDateFilter) regFilter.createdAt = dateMatch;
    if (registrationMode) regFilter.registrationMode = registrationMode;

    // Build payment filter
    const payFilter = { status: 'completed' };
    if (eventId) payFilter.eventId = require('mongoose').Types.ObjectId.createFromHexString(eventId);
    if (hasDateFilter) payFilter.createdAt = dateMatch;

    // Base ticket filter
    const ticketFilter = {};
    if (eventId) ticketFilter.eventId = require('mongoose').Types.ObjectId.createFromHexString(eventId);
    if (hasDateFilter) ticketFilter.createdAt = dateMatch;

    // Try to get Order-based revenue (orders collection may not exist)
    let orderRevenue = 0;
    let orderStatusBreakdown = [];
    try {
      const Order = require('../models/Order');
      const orderMatch = {};
      if (hasDateFilter) orderMatch.createdAt = dateMatch;

      const [orderRev, orderStatuses] = await Promise.all([
        Order.aggregate([
          { $match: { ...orderMatch, status: 'success' } },
          { $group: { _id: null, total: { $sum: '$totalAmount' } } },
        ]),
        Order.aggregate([
          { $match: orderMatch },
          { $group: { _id: '$status', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
        ]),
      ]);
      orderRevenue = orderRev[0]?.total || 0;
      orderStatusBreakdown = orderStatuses;
    } catch {
      // orders collection doesn't exist yet
    }

    const [
      totalUsers,
      totalEvents,
      totalRegistrations,
      totalRevenue,
      recentRegistrations,
      eventPopularity,
      registrationTrend,
      userRoleBreakdown,
      paymentStatusBreakdown,
      revenueTrend,
      registrationStatusBreakdown,
      topPayingEvents,
      ticketsIssued,
      ticketsUsed,
      uniqueUsersRegistered,
      teamVsIndividual,
      topCollegesRaw,
      topBranches,
      topYears,
    ] = await Promise.all([
      User.countDocuments(),
      Event.countDocuments(),
      Registration.countDocuments(regFilter),
      Payment.aggregate([
        { $match: payFilter },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      Registration.find(regFilter)
        .sort({ createdAt: -1 })
        .limit(10)
        .populate('userId', 'name email')
        .populate('eventId', 'title'),
      Registration.aggregate([
        { $match: regFilter },
        { $group: { _id: '$eventId', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
        { $lookup: { from: 'events', localField: '_id', foreignField: '_id', as: 'event' } },
        { $unwind: '$event' },
        { $project: { eventTitle: '$event.title', count: 1 } },
      ]),
      // Registration trend (last 30 days or filtered range)
      Registration.aggregate([
        { $match: hasDateFilter ? { createdAt: dateMatch } : { createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      User.aggregate([
        { $group: { _id: '$role', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      Payment.aggregate([
        ...(hasDateFilter ? [{ $match: { createdAt: dateMatch } }] : []),
        { $group: { _id: '$status', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      // Revenue trend
      Payment.aggregate([
        { $match: hasDateFilter ? { status: 'completed', createdAt: dateMatch } : { status: 'completed', createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            total: { $sum: '$amount' },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      Registration.aggregate([
        { $match: hasDateFilter ? { createdAt: dateMatch } : {} },
        { $group: { _id: '$status', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      Payment.aggregate([
        { $match: payFilter },
        { $group: { _id: '$eventId', totalRevenue: { $sum: '$amount' }, count: { $sum: 1 } } },
        { $sort: { totalRevenue: -1 } },
        { $limit: 5 },
        { $lookup: { from: 'events', localField: '_id', foreignField: '_id', as: 'event' } },
        { $unwind: '$event' },
        { $project: { eventTitle: '$event.title', totalRevenue: 1, count: 1 } },
      ]),
      // Tickets issued
      Ticket.countDocuments(ticketFilter),
      // Tickets used
      Ticket.countDocuments({ ...ticketFilter, status: 'used' }),
      // Unique users registered
      Registration.distinct('userId', regFilter).then((ids) => ids.length),
      // Team vs individual split
      Registration.aggregate([
        { $match: regFilter },
        {
          $group: {
            _id: { $cond: [{ $ne: ['$teamId', null] }, 'team', 'individual'] },
            count: { $sum: 1 },
          },
        },
      ]),
      // Top colleges (raw strings; merged for display in JS — see mergeCollegeStatsForDisplay)
      User.aggregate([
        { $match: { college: { $ne: null, $ne: '' } } },
        { $group: { _id: '$college', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 500 },
      ]),
      // Top branches
      User.aggregate([
        { $match: { branch: { $ne: null, $ne: '' } } },
        { $group: { _id: '$branch', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]),
      // Top years
      User.aggregate([
        { $match: { year: { $ne: null } } },
        { $group: { _id: '$year', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
    ]);

    const topColleges = mergeCollegeStatsForDisplay(topCollegesRaw, 10);

    return {
      totalUsers,
      totalEvents,
      totalRegistrations,
      totalRevenue: totalRevenue[0]?.total || 0,
      orderRevenue,
      orderStatusBreakdown,
      recentRegistrations,
      eventPopularity,
      registrationTrend,
      userRoleBreakdown,
      paymentStatusBreakdown,
      revenueTrend,
      registrationStatusBreakdown,
      topPayingEvents,
      ticketsIssued,
      ticketsUsed,
      uniqueUsersRegistered,
      teamVsIndividual,
      topColleges,
      topBranches,
      topYears,
    };
  } catch (err) {
    if (err.isOperational) throw err;
    logger.error('Dashboard analytics query failed', { error: err.message, stack: err.stack });
    throw new AppError(
      'Unable to load dashboard data at this time. Please try again later.',
      500,
      'ANALYTICS_QUERY_FAILED'
    );
  }
};

module.exports = { getDashboardStats };
