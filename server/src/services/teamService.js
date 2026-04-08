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
    const memberCounts = await TeamMember.aggregate([
      { $match: { teamId: { $in: teamIds } } },
      { $group: { _id: '$teamId', count: { $sum: 1 } } },
    ]);
    const countMap = {};
    memberCounts.forEach((mc) => { countMap[mc._id.toString()] = mc.count; });
    teams.forEach((t) => { t.memberCount = countMap[t._id.toString()] || 0; });
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

  // Get linked tickets for members
  try {
    if (members.length > 0) {
      const memberUserIds = members.map((m) => m.userId?._id || m.userId).filter(Boolean);
      const eventObjId = team.eventId?._id || team.eventId;
      if (eventObjId && memberUserIds.length > 0) {
        const tickets = await Ticket.find({
          userId: { $in: memberUserIds },
          eventId: eventObjId,
        }).select('ticketId status userId scannedAt').lean();
        team.tickets = tickets;
      } else {
        team.tickets = [];
      }
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

module.exports = { getTeams, getTeamById, removeMember, cancelTeamRegistration };
