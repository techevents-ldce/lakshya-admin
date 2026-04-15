const mongoose = require('mongoose');
const Event = require('../models/Event');
const Team = require('../models/Team');
const TeamMember = require('../models/TeamMember');
const Registration = require('../models/Registration');
const AppError = require('../middleware/AppError');

/**
 * Get comprehensive event insights with correct registration and participant counts
 * 
 * Business Logic:
 * - per_team mode: totalRegistrations = team count, totalParticipants = sum of all team members
 * - per_person mode: totalRegistrations = registration count, totalParticipants = same
 * - Missing/invalid pricingConfig: fallback to old fields (isPaid, registrationFee, eventType)
 */
const getEventInsights = async () => {
  try {
    // 1. Fetch all events with their pricing configuration
    const events = await Event.find({})
      .select('title pricingConfig registrationFee isPaid eventType')
      .lean();

    // 2. Get all event IDs for filtering
    const eventIds = events.map(e => e._id.toString());

    // 3. Aggregate TEAM stats (for per_team mode events)
    // Count teams and their members per event
    const teamStats = await Team.aggregate([
      // Only active teams
      { $match: { status: { $ne: 'withdrawn' } } },
      
      // Group by eventId and count teams
      {
        $group: {
          _id: '$eventId',
          totalRegistrations: { $sum: 1 }, // Count of teams
          teamIds: { $push: '$_id' } // Collect all team IDs for this event
        }
      }
    ]);

    // 4. Get team member counts for each event
    // First, get all team members with their team info
    const teamMemberStats = await TeamMember.aggregate([
      { $match: { status: { $ne: 'rejected' } } },
      {
        $lookup: {
          from: 'teams',
          localField: 'teamId',
          foreignField: '_id',
          as: 'team'
        }
      },
      { $unwind: '$team' },
      {
        $match: { 'team.status': { $ne: 'withdrawn' } }
      },
      {
        $group: {
          _id: '$team.eventId',
          memberCount: { $sum: 1 }
        }
      }
    ]);

    // 5. Aggregate REGISTRATION stats (for per_person mode events)
    // Count individual registrations per event
    const registrationStats = await Registration.aggregate([
      // Only confirmed registrations (not cancelled)
      { 
        $match: { 
          status: { $nin: ['cancelled'] },
          registrationMode: 'individual'
        } 
      },
      
      // Group by eventId
      {
        $group: {
          _id: '$eventId',
          totalRegistrations: { $sum: 1 },
          totalParticipants: { $sum: { $ifNull: ['$memberCount', 1] } }
        }
      }
    ]);

    // 6. Get team registrations count (registrations with teamId for per_team events)
    const teamRegistrationStats = await Registration.aggregate([
      { 
        $match: { 
          status: { $nin: ['cancelled'] },
          teamId: { $ne: null }
        } 
      },
      {
        $group: {
          _id: '$eventId',
          registrationCount: { $sum: 1 },
          totalMembers: { $sum: { $ifNull: ['$memberCount', 1] } }
        }
      }
    ]);

    // 7. Create lookup maps for efficient access
    const teamStatsMap = new Map();
    teamStats.forEach(stat => {
      teamStatsMap.set(stat._id.toString(), {
        totalRegistrations: stat.totalRegistrations,
        teamIds: stat.teamIds || []
      });
    });

    const teamMemberMap = new Map();
    teamMemberStats.forEach(stat => {
      teamMemberMap.set(stat._id.toString(), stat.memberCount);
    });

    const registrationMap = new Map();
    registrationStats.forEach(stat => {
      registrationMap.set(stat._id.toString(), {
        totalRegistrations: stat.totalRegistrations,
        totalParticipants: stat.totalParticipants
      });
    });

    const teamRegistrationMap = new Map();
    teamRegistrationStats.forEach(stat => {
      teamRegistrationMap.set(stat._id.toString(), {
        registrationCount: stat.registrationCount,
        totalMembers: stat.totalMembers
      });
    });

    // 8. Build final result for each event
    const result = events.map(event => {
      const eventId = event._id.toString();
      
      // Determine pricing mode (fallback to per_team if missing/invalid)
      const pricingConfig = event.pricingConfig || {};
      let mode = pricingConfig.mode;
      
      // Fallback logic: if pricingConfig is missing, infer from old fields
      if (!mode || !['per_team', 'per_person', 'free'].includes(mode)) {
        // Use old fields to determine mode
        if (!event.isPaid || event.registrationFee === 0) {
          mode = 'free';
        } else if (event.eventType === 'team') {
          mode = 'per_team';
        } else {
          mode = 'per_person';
        }
      }

      let totalRegistrations = 0;
      let totalParticipants = 0;

      if (mode === 'per_team') {
        // Get team count
        const teamData = teamStatsMap.get(eventId);
        totalRegistrations = teamData ? teamData.totalRegistrations : 0;
        
        // Get total participants (team members + leaders)
        // Team members from TeamMember collection
        const memberCount = teamMemberMap.get(eventId) || 0;
        // Each team has 1 leader, so add team count to member count
        totalParticipants = memberCount + totalRegistrations;
        
        // Fallback: If no TeamMember data but has registrations with memberCount
        if (totalParticipants === 0) {
          const regData = teamRegistrationMap.get(eventId);
          if (regData) {
            totalRegistrations = regData.registrationCount || totalRegistrations;
            totalParticipants = regData.totalMembers || totalRegistrations;
          }
        }
      } else if (mode === 'per_person') {
        // Use individual registration counts
        const regData = registrationMap.get(eventId);
        if (regData) {
          totalRegistrations = regData.totalRegistrations;
          totalParticipants = regData.totalParticipants;
        }
      } else if (mode === 'free') {
        // For free events, count all registrations (both team and individual)
        const regData = registrationMap.get(eventId);
        const teamRegData = teamRegistrationMap.get(eventId);
        
        totalRegistrations = (regData ? regData.totalRegistrations : 0) + 
                             (teamRegData ? teamRegData.registrationCount : 0);
        totalParticipants = (regData ? regData.totalParticipants : 0) + 
                          (teamRegData ? teamRegData.totalMembers : 0);
        
        // If still 0, try team-based counting
        if (totalParticipants === 0) {
          const teamData = teamStatsMap.get(eventId);
          if (teamData) {
            totalRegistrations = teamData.totalRegistrations;
            const memberCount = teamMemberMap.get(eventId) || 0;
            totalParticipants = memberCount + totalRegistrations;
          }
        }
      }

      return {
        eventId: eventId,
        eventName: event.title || 'Unnamed Event',
        pricingMode: mode,
        totalRegistrations: totalRegistrations,
        totalParticipants: totalParticipants
      };
    });

    // Sort by total participants descending
    result.sort((a, b) => b.totalParticipants - a.totalParticipants);

    return result;
  } catch (err) {
    console.error('Failed to generate event insights:', err);
    throw new AppError('Failed to generate event insights', 500, 'EVENT_INSIGHTS_ERROR');
  }
};

module.exports = { getEventInsights };
