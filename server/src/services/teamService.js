const Team = require('../models/Team');
const TeamMember = require('../models/TeamMember');
const Registration = require('../models/Registration');
const Ticket = require('../models/Ticket');
const AppError = require('../middleware/AppError');
const { writeAuditLog } = require('../middleware/auditLog');

const getTeams = async (query = {}) => {
  const { page = 1, limit = 20, eventId, search, status } = query;
  const filter = {};
  if (eventId) filter.eventId = eventId;
  if (status) filter.status = status;

  if (search) {
    filter.$or = [
      { teamName: { $regex: search, $options: 'i' } },
    ];
  }

  const skip = (Number(page) - 1) * Number(limit);
  const [teams, total] = await Promise.all([
    Team.find(filter)
      .skip(skip)
      .limit(Number(limit))
      .sort({ createdAt: -1 })
      .populate('eventId', 'title slug')
      .populate('leaderId', 'name email')
      .lean(),
    Team.countDocuments(filter),
  ]);

  // Fetch member counts for each team
  if (teams.length > 0) {
    const teamIds = teams.map((t) => t._id);

    // Count from TeamMember collection (registered users only)
    const memberCounts = await TeamMember.aggregate([
      { $match: { teamId: { $in: teamIds } } },
      { $group: { _id: '$teamId', count: { $sum: 1 } } },
    ]);
    const countMap = {};
    memberCounts.forEach((mc) => { countMap[mc._id.toString()] = mc.count; });

    // For hackathon teams, non-leader members don't have User accounts so no TeamMember docs.
    // Registration.memberCount stores the true full team size set during import.
    // Use max(TeamMember count, registration.memberCount).
    const registrations = await Registration.find(
      { teamId: { $in: teamIds }, memberCount: { $gt: 1 } },
      { teamId: 1, memberCount: 1 }
    ).lean();
    const regCountMap = {};
    registrations.forEach((r) => {
      if (r.teamId) regCountMap[r.teamId.toString()] = r.memberCount;
    });

    // Also check HackathonTeam.members[] for the most accurate imported member count
    let htCountMap = {};
    try {
      const HackathonTeam = require('../models/HackathonTeam');
      const hackathonTeams = await HackathonTeam.find(
        { teamId: { $in: teamIds } },
        { teamId: 1, 'members': 1 }
      ).lean();
      hackathonTeams.forEach((ht) => {
        if (ht.teamId) htCountMap[ht.teamId.toString()] = (ht.members || []).length;
      });
    } catch (_) { /* HackathonTeam collection may not exist — ignore */ }

    teams.forEach((t) => {
      const tmCount  = countMap[t._id.toString()]    || 0;
      const regCount = regCountMap[t._id.toString()] || 0;
      const htCount  = htCountMap[t._id.toString()]  || 0;
      t.memberCount  = Math.max(tmCount, regCount, htCount);
    });
  }

  return { teams, total, page: Number(page), pages: Math.ceil(total / Number(limit)) };
};

const getTeamById = async (id) => {
  const team = await Team.findById(id)
    .populate('eventId', 'title slug eventType teamSizeMin teamSizeMax')
    .populate('leaderId', 'name email phone college branch year')
    .lean();

  if (!team) throw new AppError('Team not found', 404, 'TEAM_NOT_FOUND');

  // Get team members
  const members = await TeamMember.find({ teamId: id })
    .populate('userId', 'name email phone college branch year')
    .lean();
  team.members = members;

  // Get linked registration
  const registration = await Registration.findOne({ teamId: id })
    .populate('eventId', 'title')
    .lean();
  team.registration = registration;

  // All tickets for this team: by Ticket.teamId (fulfillment) and/or member userIds (legacy)
  try {
    const eventObjId = team.eventId?._id || team.eventId;
    const memberUserIds = members.map((m) => m.userId?._id || m.userId).filter(Boolean);
    if (eventObjId) {
      const orConds = [{ teamId: id }];
      if (memberUserIds.length > 0) {
        orConds.push({ userId: { $in: memberUserIds } });
      }
      const tickets = await Ticket.find({
        eventId: eventObjId,
        $or: orConds,
      })
        .select('ticketId status userId scannedAt teamId')
        .lean();
      team.tickets = tickets;
    } else {
      team.tickets = [];
    }
  } catch {
    team.tickets = [];
  }

  return team;
};

const removeMember = async (teamId, userId, adminId, reqMeta = {}) => {
  const team = await Team.findById(teamId);
  if (!team) throw new AppError('Team not found', 404, 'TEAM_NOT_FOUND');

  const member = await TeamMember.findOne({ teamId, userId });
  if (!member) throw new AppError('Member not found in team', 404, 'MEMBER_NOT_FOUND');

  if (team.leaderId.toString() === userId.toString()) {
    throw new AppError('Cannot remove team leader', 400, 'CANNOT_REMOVE_LEADER');
  }

  const before = member.toObject();
  await TeamMember.deleteOne({ _id: member._id });

  await writeAuditLog({
    adminId,
    action: 'REMOVE_TEAM_MEMBER',
    entityType: 'TeamMember',
    entityId: member._id,
    before,
    after: null,
    ip: reqMeta.ip,
    userAgent: reqMeta.userAgent,
  });

  return { message: 'Member removed from team' };
};

const cancelTeamRegistration = async (teamId, adminId, reqMeta = {}) => {
  const team = await Team.findById(teamId);
  if (!team) throw new AppError('Team not found', 404, 'TEAM_NOT_FOUND');

  const before = team.toObject();
  team.status = 'withdrawn';
  await team.save();

  // Cancel linked registration
  const reg = await Registration.findOne({ teamId });
  if (reg) {
    reg.status = 'cancelled';
    await reg.save();
  }

  // Cancel linked tickets
  const members = await TeamMember.find({ teamId }).lean();
  const memberUserIds = members.map((m) => m.userId);
  await Ticket.updateMany(
    { userId: { $in: memberUserIds }, eventId: team.eventId, status: 'valid' },
    { status: 'cancelled' }
  );

  await writeAuditLog({
    adminId,
    action: 'CANCEL_TEAM_REGISTRATION',
    entityType: 'Team',
    entityId: team._id,
    before,
    after: team.toObject(),
    ip: reqMeta.ip,
    userAgent: reqMeta.userAgent,
  });

  return team;
};

/**
 * Find and remove duplicate Team documents for the same (eventId, leaderId) pair.
 * Keeps the "best" document (one referenced by Registration or HackathonTeam),
 * re-links orphan TeamMember and Registration records to the keeper, then deletes duplicates.
 */
const dedupTeams = async (eventId = null) => {
  const HackathonTeam = require('../models/HackathonTeam');
  const filter = eventId ? { eventId } : {};

  // Find all (eventId, leaderId) groups with more than one Team document
  const groups = await Team.aggregate([
    { $match: filter },
    { $group: { _id: { eventId: '$eventId', leaderId: '$leaderId' }, ids: { $push: '$_id' }, count: { $sum: 1 } } },
    { $match: { count: { $gt: 1 } } },
  ]);

  if (groups.length === 0) return { deduped: 0, groupsChecked: 0, details: [] };

  const details = [];
  let dedupedCount = 0;

  for (const grp of groups) {
    const allIds = grp.ids;

    // Find the "best" ID: prefer the one referenced by HackathonTeam or Registration
    const [htRef, regRef] = await Promise.all([
      HackathonTeam.findOne({ teamId: { $in: allIds } }).select('teamId').lean(),
      Registration.findOne({ teamId: { $in: allIds }, status: { $ne: 'cancelled' } }).select('teamId').lean(),
    ]);

    const preferredId = (htRef?.teamId || regRef?.teamId || allIds[0]).toString();
    const orphanIds = allIds.filter((id) => id.toString() !== preferredId);

    // Re-link TeamMember and Registration records pointing to orphan IDs → keeper
    for (const orphanId of orphanIds) {
      await TeamMember.updateMany({ teamId: orphanId }, { $set: { teamId: preferredId } });
      await Registration.updateMany({ teamId: orphanId }, { $set: { teamId: preferredId } });
      await HackathonTeam.updateMany({ teamId: orphanId }, { $set: { teamId: preferredId } });
    }

    // Delete the orphan Team documents
    const deleteResult = await Team.deleteMany({ _id: { $in: orphanIds } });
    dedupedCount += deleteResult.deletedCount;

    details.push({
      eventId: grp._id.eventId,
      leaderId: grp._id.leaderId,
      keptId: preferredId,
      removedIds: orphanIds.map((id) => id.toString()),
      removed: deleteResult.deletedCount,
    });
  }

  return { deduped: dedupedCount, groupsChecked: groups.length, details };
};

module.exports = { getTeams, getTeamById, removeMember, cancelTeamRegistration, dedupTeams };
