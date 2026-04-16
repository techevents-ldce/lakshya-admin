const Event = require('../../models/Event');
const Team = require('../../models/Team');
const Registration = require('../../models/Registration');
const Transaction = require('../../models/Transaction');
const HackathonTeam = require('../../models/HackathonTeam');

const AppError = require('../../middleware/AppError');
const mongoose = require('mongoose');

function buildDateMatch(dateFrom, dateTo) {
  const match = {};
  if (dateFrom) match.$gte = new Date(dateFrom);
  if (dateTo) {
    const to = new Date(dateTo);
    // Keep the whole day inclusive for YYYY-MM-DD inputs
    to.setHours(23, 59, 59, 999);
    match.$lte = to;
  }
  return Object.keys(match).length ? match : null;
}

function toObjectId(value) {
  if (!value) return null;
  if (typeof value !== 'string') return value;
  return mongoose.Types.ObjectId.createFromHexString(value);
}

/**
 * Standardized event metrics derived only from genuine DB records.
 *
 * Metric semantics:
 * - TEAM event: registration "units" = teams; participants = registrations (non-cancelled).
 * - SOLO event: registration "units" = solo registrations (teamId=null); participants = registrations (non-cancelled).
 *
 * Paid/confirmed semantics (participants-level):
 * - confirmedParticipants = Registration.status === 'confirmed' (and not cancelled).
 * - paidParticipants:
 *   - if event is free (isPaid=false or registrationFee==0): equals confirmedParticipants
 *   - else: distinct Transaction SUCCESS users for that event (based on Transaction.event_ids).
 */
async function getEventRegistrationMetrics({
  eventId = null,
  dateFrom = null,
  dateTo = null,
  viewerRole = null,
  includePaidParticipants = true,
  includePaymentFailures = true,
} = {}) {
  try {
    const hasEventId = !!eventId;
    const viewerIsSuperadmin = viewerRole === 'superadmin';

    const eventsQuery = {};
    if (hasEventId) eventsQuery._id = mongoose.Types.ObjectId.createFromHexString(eventId);

    const events = await Event.find(eventsQuery)
      .select('title eventType isPaid registrationFee')
      .lean();

    if (!events.length) {
      return { events: [], totals: { totalRegistrations: 0, totalTeams: 0, totalSoloRegistrations: 0, totalParticipants: 0 }, canViewPaymentFailures: viewerIsSuperadmin };
    }

    const regDateMatch = buildDateMatch(dateFrom, dateTo);
    const eventObjectId = hasEventId ? toObjectId(eventId) : null;

    const teamBaseMatch = { status: { $ne: 'withdrawn' } };
    if (hasEventId) teamBaseMatch.eventId = eventObjectId;
    if (regDateMatch) teamBaseMatch.createdAt = regDateMatch;

    const regBaseMatch = { status: { $ne: 'cancelled' } };
    if (hasEventId) regBaseMatch.eventId = eventObjectId;
    if (regDateMatch) regBaseMatch.createdAt = regDateMatch;

    const participantCounts = await Registration.aggregate([
      { $match: regBaseMatch },
      { $group: { _id: '$eventId', count: { $sum: 1 } } },
    ]);
    const participantMap = new Map(participantCounts.map((r) => [String(r._id), Number(r.count) || 0]));

    // SOLO "registration units": teamId=null
    const soloCounts = await Registration.aggregate([
      { $match: { ...regBaseMatch, teamId: null } },
      { $group: { _id: '$eventId', count: { $sum: 1 } } },
    ]);
    const soloMap = new Map(soloCounts.map((r) => [String(r._id), Number(r.count) || 0]));

    // TEAM "registration units": Team collection (excluding withdrawn teams)
    const teamCounts = await Team.aggregate([
      { $match: teamBaseMatch },
      { $group: { _id: '$eventId', count: { $sum: 1 } } },
    ]);
    const teamMap = new Map(teamCounts.map((r) => [String(r._id), Number(r.count) || 0]));

    // Confirmed participants
    const confirmedMatch = {
      status: 'confirmed',
      ...(hasEventId ? { eventId: eventObjectId } : {}),
      ...(regDateMatch ? { createdAt: regDateMatch } : {}),
    };
    const confirmedCounts = await Registration.aggregate([
      { $match: confirmedMatch },
      { $group: { _id: '$eventId', count: { $sum: 1 } } },
    ]);
    const confirmedMap = new Map(confirmedCounts.map((r) => [String(r._id), Number(r.count) || 0]));

    // Paid participants: distinct users with SUCCESS Transaction for this event.
    // If the event is free, we backfill paidParticipants from confirmedParticipants.
    const txDateMatch = buildDateMatch(dateFrom, dateTo);
    const paidMap = new Map();
    if (includePaidParticipants) {
      const successTxMatch = {
        status: 'SUCCESS',
        ...(txDateMatch ? { created_at: txDateMatch } : {}),
        ...(hasEventId ? { event_ids: { $in: [eventObjectId] } } : {}),
      };

      const paidSuccessUsersPerEvent = await Transaction.aggregate([
        { $match: successTxMatch },
        { $unwind: '$event_ids' },
        ...(hasEventId ? [{ $match: { event_ids: eventObjectId } }] : []),
        // De-dupe at user+event level.
        { $group: { _id: { eventId: '$event_ids', userId: '$user_id' } } },
        { $group: { _id: '$_id.eventId', count: { $sum: 1 } } },
      ]);
      paidSuccessUsersPerEvent.forEach((r) => paidMap.set(String(r._id), Number(r.count) || 0));
    }

    // Superadmin-only payment visibility
    let pendingTxMap = new Map();
    let failedTxMap = new Map();

    if (viewerIsSuperadmin && includePaymentFailures) {
      const pendingTxMatch = {
        status: 'PENDING',
        ...(txDateMatch ? { created_at: txDateMatch } : {}),
        ...(hasEventId ? { event_ids: { $in: [eventObjectId] } } : {}),
      };
      const pendingArr = await Transaction.aggregate([
        { $match: pendingTxMatch },
        { $unwind: '$event_ids' },
        ...(hasEventId ? [{ $match: { event_ids: eventObjectId } }] : []),
        { $group: { _id: '$event_ids', count: { $sum: 1 } } },
      ]);
      pendingTxMap = new Map(pendingArr.map((r) => [String(r._id), Number(r.count) || 0]));

      const failedTxMatch = {
        status: 'FAILED',
        ...(txDateMatch ? { created_at: txDateMatch } : {}),
        ...(hasEventId ? { event_ids: { $in: [eventObjectId] } } : {}),
      };
      const failedArr = await Transaction.aggregate([
        { $match: failedTxMatch },
        { $unwind: '$event_ids' },
        ...(hasEventId ? [{ $match: { event_ids: eventObjectId } }] : []),
        { $group: { _id: '$event_ids', count: { $sum: 1 } } },
      ]);
      failedTxMap = new Map(failedArr.map((r) => [String(r._id), Number(r.count) || 0]));
    }

    // Special calculation for Hackathon events since they are strictly managed via admin imports 
    // and native portal registrations contain noisy abandoned/dummy teams.
    const hackathonStatsMap = new Map();
    for (const event of events) {
      if (typeof event.title === 'string' && event.title.toLowerCase().includes('hackathon')) {
        const hTeams = await HackathonTeam.find({ eventId: event._id, selectionStatus: { $ne: 'removed' } }).lean();
        
        // The admin explicitly requested to ONLY show "selected" and "paid" teams on the Insights dashboard
        // so we filter down before tallying the official counts.
        const paidHTeams = hTeams.filter(ht => ht.selectionStatus === 'selected' || ht.paymentEnabled);
        
        const totalRegistrations = paidHTeams.length; // total active paid/selected teams
        let paidParticipants = 0;
        paidHTeams.forEach(ht => { paidParticipants += (ht.members && ht.members.length > 0 ? ht.members.length : 1); });

        hackathonStatsMap.set(String(event._id), {
          totalRegistrations: totalRegistrations,
          totalParticipants: paidParticipants,
          paidParticipants: paidParticipants,
          totalTeams: totalRegistrations
        });
      }
    }

    const result = events.map((event) => {
      const eventIdStr = String(event._id);
      const hackathonStats = hackathonStatsMap.get(eventIdStr);

      const totalParticipants = hackathonStats ? hackathonStats.totalParticipants : (participantMap.get(eventIdStr) || 0);
      const totalTeams = hackathonStats ? hackathonStats.totalTeams : (teamMap.get(eventIdStr) || 0);
      const totalSoloRegistrations = soloMap.get(eventIdStr) || 0;
      const totalConfirmedParticipants = hackathonStats ? hackathonStats.paidParticipants : (confirmedMap.get(eventIdStr) || 0);

      const paidByTx = paidMap.get(eventIdStr) || 0;
      const isFree = event.isPaid === false || Number(event.registrationFee || 0) === 0;
      const paidParticipants = hackathonStats ? hackathonStats.paidParticipants : (isFree ? totalConfirmedParticipants : paidByTx);

      const totalRegistrations = hackathonStats ? hackathonStats.totalRegistrations : (
        event.eventType === 'team'
          ? totalTeams
          : totalSoloRegistrations
      );

      const item = {
        eventId: event._id,
        eventName: event.title || 'Unnamed Event',
        eventType: event.eventType || 'solo',
        totalRegistrations,
        totalTeams: event.eventType === 'team' ? totalTeams : 0,
        totalSoloRegistrations: event.eventType === 'solo' ? totalSoloRegistrations : 0,
        totalParticipants,
        paidParticipants,
        confirmedParticipants: totalConfirmedParticipants,
      };

      if (viewerIsSuperadmin) {
        item.pendingTransactionsCount = pendingTxMap.get(eventIdStr) || 0;
        item.failedTransactionsCount = failedTxMap.get(eventIdStr) || 0;
      }

      return item;
    });

    const totals = result.reduce(
      (acc, item) => {
        acc.totalRegistrations += Number(item.totalRegistrations) || 0;
        acc.totalTeams += Number(item.totalTeams) || 0;
        acc.totalSoloRegistrations += Number(item.totalSoloRegistrations) || 0;
        acc.totalParticipants += Number(item.totalParticipants) || 0;
        return acc;
      },
      { totalRegistrations: 0, totalTeams: 0, totalSoloRegistrations: 0, totalParticipants: 0 }
    );

    return { events: result, totals, canViewPaymentFailures: viewerIsSuperadmin };
  } catch (err) {
    // Keep error messages generic for client safety; logs can include details upstream.
    throw new AppError('Failed to compute event registration metrics', 500, 'EVENT_METRICS_ERROR');
  }
}

module.exports = {
  getEventRegistrationMetrics,
};

