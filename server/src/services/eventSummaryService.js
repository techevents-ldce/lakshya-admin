const Team = require('../models/Team');
const Registration = require('../models/Registration');
const AppError = require('../middleware/AppError');

/**
 * Get event summary with team/solo breakdown
 * 
 * Returns:
 * - totalRegistrations: totalTeams + totalSolo
 * - totalTeams: count of active teams
 * - totalSolo: count of individual registrations (teamId: null)
 */
const getEventSummary = async () => {
  try {
    // Count total teams (excluding withdrawn teams)
    const totalTeams = await Team.countDocuments({ 
      status: { $ne: 'withdrawn' } 
    });

    // Count solo registrations (registrations without teamId)
    const totalSolo = await Registration.countDocuments({
      teamId: null,
      status: { $ne: 'cancelled' }
    });

    // Total registrations is the sum
    const totalRegistrations = totalTeams + totalSolo;

    return {
      totalRegistrations,
      totalTeams,
      totalSolo
    };
  } catch (err) {
    console.error('Failed to generate event summary:', err);
    throw new AppError('Failed to generate event summary', 500, 'EVENT_SUMMARY_ERROR');
  }
};

module.exports = { getEventSummary };
