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
    const mongoose = require('mongoose');
    const Transaction = require('../models/Transaction');

    // Build date match condition
    const dateMatch = {};
    if (dateFrom) dateMatch.$gte = new Date(dateFrom);
    if (dateTo) dateMatch.$lte = new Date(dateTo);
    const hasDateFilter = Object.keys(dateMatch).length > 0;

    // Build date match for Transaction (uses created_at)
    const txDateMatch = {};
    if (dateFrom) txDateMatch.$gte = new Date(dateFrom);
    if (dateTo) txDateMatch.$lte = new Date(dateTo);

    // Build registration filter
    const regFilter = { status: { $ne: 'cancelled' } };
    if (eventId) regFilter.eventId = mongoose.Types.ObjectId.createFromHexString(eventId);
    if (hasDateFilter) regFilter.createdAt = dateMatch;
    if (registrationMode) regFilter.registrationMode = registrationMode;

    // Build transaction filter (Primary source of truth for revenue)
    const txFilter = { status: 'SUCCESS' };
    if (eventId) {
      const eventIdObj = mongoose.Types.ObjectId.createFromHexString(eventId);
      txFilter.event_ids = { $in: [eventIdObj] };
    }
    if (hasDateFilter) txFilter.created_at = txDateMatch;

    // Base ticket filter
    const ticketFilter = {};
    if (eventId) ticketFilter.eventId = mongoose.Types.ObjectId.createFromHexString(eventId);
    if (hasDateFilter) ticketFilter.createdAt = dateMatch;

    // Build Order-based stats (using Order model only for successful order counts/amounts)
    let orderRevenue = 0;
    let orderStatusBreakdown = [];
    try {
      const Order = require('../models/Order');
      const orderMatch = {};
      if (hasDateFilter) orderMatch.createdAt = dateMatch;
      if (eventId) {
        const eventIdObj = mongoose.Types.ObjectId.createFromHexString(eventId);
        // Use $elemMatch to find orders containing this event in their snapshot
        orderMatch.itemsSnapshot = { 
          $elemMatch: { 
            eventId: { $in: [eventId, eventIdObj] } 
          } 
        };
      }

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
    } catch (e) {
      logger.error('Order query failed in analytics', { error: e.message });
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
      // Total Users: If event selected, count unique users for that event
      eventId 
        ? Registration.distinct('userId', regFilter).then(ids => ids.length)
        : User.countDocuments(),
      Event.countDocuments(),
      Registration.countDocuments(regFilter),
      // Revenue from transactions
      Transaction.aggregate([
        { $match: txFilter },
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
      // Registration trend (respect eventId)
      Registration.aggregate([
        { $match: eventId ? regFilter : (hasDateFilter ? { createdAt: dateMatch } : { createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } }) },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      // User Role Breakdown (respect eventId)
      eventId
        ? Registration.aggregate([
            { $match: regFilter },
            { $lookup: { from: 'users', localField: 'userId', foreignField: '_id', as: 'user' } },
            { $unwind: '$user' },
            { $group: { _id: '$user.role', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
          ])
        : User.aggregate([
            { $group: { _id: '$role', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
          ]),
      // Transaction status breakdown (replaces payment status)
      Transaction.aggregate([
        { $match: eventId ? { event_ids: { $in: [mongoose.Types.ObjectId.createFromHexString(eventId)] } } : (hasDateFilter ? { created_at: txDateMatch } : {}) },
        { $group: { _id: '$status', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      // Revenue trend (from Transactions, respect eventId)
      Transaction.aggregate([
        { $match: txFilter.created_at ? txFilter : { status: 'SUCCESS', created_at: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$created_at' } },
            total: { $sum: '$amount' },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      // Registration status (respect eventId)
      Registration.aggregate([
        { $match: eventId ? { eventId: mongoose.Types.ObjectId.createFromHexString(eventId) } : (hasDateFilter ? { createdAt: dateMatch } : {}) },
        { $group: { _id: '$status', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      // Top paying events (from transactions)
      Transaction.aggregate([
        { $match: { status: 'SUCCESS' } },
        { $unwind: '$event_ids' },
        { $group: { _id: '$event_ids', totalRevenue: { $sum: '$amount' }, count: { $sum: 1 } } },
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
      // Top colleges (event-aware if needed)
      eventId
        ? Registration.aggregate([
            { $match: regFilter },
            { $lookup: { from: 'users', localField: 'userId', foreignField: '_id', as: 'user' } },
            { $unwind: '$user' },
            { $match: { 'user.college': { $ne: null, $ne: '' } } },
            { $group: { _id: '$user.college', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 500 },
          ])
        : User.aggregate([
            { $match: { college: { $ne: null, $ne: '' } } },
            { $group: { _id: '$college', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 500 },
          ]),
      // Top branches (event-aware if needed)
      eventId
        ? Registration.aggregate([
            { $match: regFilter },
            { $lookup: { from: 'users', localField: 'userId', foreignField: '_id', as: 'user' } },
            { $unwind: '$user' },
            { $match: { 'user.branch': { $ne: null, $ne: '' } } },
            { $group: { _id: '$user.branch', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 10 },
          ])
        : User.aggregate([
            { $match: { branch: { $ne: null, $ne: '' } } },
            { $group: { _id: '$branch', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 10 },
          ]),
      // Top years (event-aware if needed)
      eventId
        ? Registration.aggregate([
            { $match: regFilter },
            { $lookup: { from: 'users', localField: 'userId', foreignField: '_id', as: 'user' } },
            { $unwind: '$user' },
            { $match: { 'user.year': { $ne: null } } },
            { $group: { _id: '$user.year', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
          ])
        : User.aggregate([
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

const getEventMetrics = async () => {
  try {
    // 1. Fetch all events with pricingConfig
    const events = await Event.find({}).select('title category pricingConfig').lean();

    // 2. Aggregate participants and alumni participation from Registrations
    const regStats = await Registration.aggregate([
      { $match: { status: { $ne: 'cancelled' } } },
      {
        $lookup: {
          from: 'users',
          localField: 'userId',
          foreignField: '_id',
          as: 'user'
        }
      },
      { $unwind: '$user' },
      {
        $lookup: {
          from: 'alumnisubmissions',
          localField: 'user.email',
          foreignField: 'email',
          as: 'alumni'
        }
      },
      {
        $group: {
          _id: '$eventId',
          participantCount: { $sum: 1 },
          alumniCount: {
            $sum: { $cond: [{ $gt: [{ $size: '$alumni' }, 0] }, 1, 0] }
          },
          priorityAlumniCount: {
            $sum: {
              $cond: [
                { $and: [
                  { $gt: [{ $size: '$alumni' }, 0] },
                  { $eq: [{ $arrayElemAt: ['$alumni.priority', 0] }, true] }
                ]},
                1,
                0
              ]
            }
          }
        }
      }
    ]);

    // 3. Calculate revenue from Order itemsSnapshot using lineTotal field
    const Order = require('../models/Order');
    const revStats = await Order.aggregate([
      { $match: { status: 'success' } },
      { $unwind: '$itemsSnapshot' },
      {
        $group: {
          _id: '$itemsSnapshot.eventId',
          totalRevenue: { 
            $sum: { 
              $ifNull: [
                { $ifNull: ['$itemsSnapshot.lineTotal', '$itemsSnapshot.calculatedPrice'] }, 
                0
              ] 
            } 
          }
        }
      }
    ]);

    // 4. Combine metrics
    const result = events.map(ev => {
      const rs = regStats.find(s => s._id?.toString() === ev._id.toString()) || {};
      const vs = revStats.find(s => s._id?.toString() === ev._id.toString()) || {};

      // Get effective fee from pricingConfig
      const pricing = ev.pricingConfig || {};
      let feeAmount = 0;
      let feeMode = pricing.mode || 'free';
      
      if (pricing.mode === 'per_team') {
        feeAmount = pricing.perTeamAmount || 0;
      } else if (pricing.mode === 'per_person') {
        feeAmount = pricing.perPersonAmount || 0;
      }

      return {
        _id: ev._id,
        title: ev.title,
        category: ev.category,
        pricingConfig: pricing,
        feeAmount,
        feeMode,
        participantCount: rs.participantCount || 0,
        alumniCount: rs.alumniCount || 0,
        priorityAlumniCount: rs.priorityAlumniCount || 0,
        totalRevenue: vs.totalRevenue || 0
      };
    });

    // Sort by revenue descending by default
    result.sort((a, b) => b.totalRevenue - a.totalRevenue);

    return result;
  } catch (err) {
    logger.error('Failed to aggregate event metrics', { error: err.message });
    throw new AppError('Analytics aggregation failed', 500);
  }
};

module.exports = { getDashboardStats, getEventMetrics };
