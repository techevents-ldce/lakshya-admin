const AppError = require('../middleware/AppError');
const { getEventRegistrationMetrics } = require('./analytics/eventRegistrationMetricsService');

/**
 * Get event summary with team/solo breakdown
 * 
 * Returns:
 * - totalRegistrations: registration units (teams for TEAM events, solo registrations for SOLO events)
 * - totalTeams: number of TEAM units (teams) for TEAM events
 * - totalSolo: number of SOLO units (solo registrations) for SOLO events
 */
const getEventSummary = async (filters = {}, viewerRole = null) => {
  try {
    const { eventId = null, dateFrom = null, dateTo = null } = filters || {};

    const metrics = await getEventRegistrationMetrics({
      eventId,
      dateFrom,
      dateTo,
      viewerRole,
      includePaidParticipants: false,
      includePaymentFailures: false,
    });

    return {
      totalRegistrations: metrics.totals.totalRegistrations,
      totalTeams: metrics.totals.totalTeams,
      totalSolo: metrics.totals.totalSoloRegistrations,
      totalParticipants: metrics.totals.totalParticipants,
      canViewPaymentFailures: metrics.canViewPaymentFailures,
    };
  } catch (err) {
    console.error('Failed to generate event summary:', err);
    throw new AppError('Failed to generate event summary', 500, 'EVENT_SUMMARY_ERROR');
  }
};

module.exports = { getEventSummary };
