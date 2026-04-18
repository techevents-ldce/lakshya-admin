const Registration = require('../models/Registration');
const Team = require('../models/Team');
const TeamMember = require('../models/TeamMember');
const Event = require('../models/Event');
const Ticket = require('../models/Ticket');
const Payment = require('../models/Payment');
const AppError = require('../middleware/AppError');
const { v4: uuidv4 } = require('uuid');
const QRCode = require('qrcode');

const { normalizeReferralCode } = require('../utils/referralCode');

const getRegistrations = async (query = {}, viewer = null) => {
  const { page = 1, limit = 20, eventId, status, search, referralCode } = query;
  const filter = {};

  // Role-based scoping
  if (viewer && viewer.role === 'coordinator') {
    const assignedEvents = (viewer.assignedEvents || []).map(id => id.toString());
    if (eventId) {
      if (!assignedEvents.includes(eventId.toString())) {
        // Requested an event they don't coordinate — limit to assigned only
        filter.eventId = { $in: assignedEvents };
      } else {
        filter.eventId = eventId;
      }
    } else {
      filter.eventId = { $in: assignedEvents };
    }
  } else if (eventId) {
    filter.eventId = eventId;
  }
  if (status) filter.status = status;
  if (referralCode) {
    const n = normalizeReferralCode(referralCode);
    if (n) filter.referralCodeUsed = n;
  }

  // Search by participant name or email
  if (search) {
    const User = require('../models/User');
    const matchingUsers = await User.find({
      $or: [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
      ],
    }).select('_id');
    const matchedUserIds = matchingUsers.map((u) => u._id);

    const groupTeamsReq = query.groupTeams === 'true' || query.groupTeams === true;

    if (groupTeamsReq) {
      // Find teams matching by teamName
      const matchingTeamsByName = await Team.find({
        eventId,
        teamName: { $regex: search, $options: 'i' }
      }).select('_id leaderId');
      
      const teamIdsBySearch = matchingTeamsByName.map(t => t._id);
      const leaderIdsByTeamSearch = matchingTeamsByName.map(t => t.leaderId);

      // Find team IDs where at least one member matches the user search
      const matchedRegs = await Registration.find({
        eventId,
        userId: { $in: matchedUserIds }
      }).select('teamId userId');

      const involvedTeamIdsFromMembers = matchedRegs.filter(r => r.teamId).map(r => r.teamId);
      const soloMatchedUserIds = matchedRegs.filter(r => !r.teamId).map(r => r.userId);

      // Find the leaders of teams matched by member search
      const teamsByMemberSearch = await Team.find({ _id: { $in: involvedTeamIdsFromMembers } }).select('leaderId');
      const leaderUserIdsFromMembers = teamsByMemberSearch.map(t => t.leaderId);

      // Final filter: matching solo users OR leaders of teams matched by member OR leaders of teams matched by name
      filter.userId = { $in: [...soloMatchedUserIds, ...leaderUserIdsFromMembers, ...leaderIdsByTeamSearch] };
    } else {
      filter.userId = { $in: matchedUserIds };
    }
  } else if ((query.groupTeams === 'true' || query.groupTeams === true) && eventId) {
    // If grouping teams but no search, only show solo regs + team leaders
    const teams = await Team.find({ eventId }).select('leaderId');
    if (teams.length > 0) {
      const leaderUserIds = teams.map(t => t.leaderId);
      filter.$or = [
        { teamId: null },
        { teamId: { $exists: false } },
        { userId: { $in: leaderUserIds } }
      ];
    }
  }

  const skip = (Number(page) - 1) * Number(limit);
  const [registrations, total] = await Promise.all([
    Registration.find(filter)
      .skip(skip)
      .limit(Number(limit))
      .sort({ createdAt: -1 })
      .populate('userId', 'name email phone college branch year')
      .populate('eventId', 'title slug eventType registrationFee isPaid')
      .populate({
        path: 'teamId',
        populate: { path: 'leaderId', select: 'name email' },
      }),
    Registration.countDocuments(filter),
  ]);

  // Batch-fetch team members for registrations that have a team
  const teamIds = registrations
    .filter((r) => r.teamId)
    .map((r) => r.teamId._id);

  let teamMembersMap = {};
  if (teamIds.length > 0) {
    const members = await TeamMember.find({ teamId: { $in: teamIds } })
      .populate('userId', 'name email')
      .lean();
    for (const m of members) {
      const tid = m.teamId.toString();
      if (!teamMembersMap[tid]) teamMembersMap[tid] = [];
      teamMembersMap[tid].push(m);
    }
  }

  // Attach team members to each registration (convert to plain objects)
  const enriched = registrations.map((r) => {
    const plain = r.toObject();
    if (plain.teamId) {
      plain.teamMembers = teamMembersMap[plain.teamId._id.toString()] || [];
    }
    return plain;
  });

  // If grouping teams, we might need the actual participant counts for the dashboard
  let stats = null;
  const isGrouping = query.groupTeams === 'true' || query.groupTeams === true;
  if (isGrouping && eventId) {
    const [allRegs, checkedIn] = await Promise.all([
      Registration.countDocuments({ eventId, status: { $ne: 'cancelled' } }),
      Registration.countDocuments({ eventId, status: { $ne: 'cancelled' }, checkedIn: true })
    ]);
    stats = { totalParticipants: allRegs, totalCheckedIn: checkedIn };
  }

  return { registrations: enriched, total, page: Number(page), pages: Math.ceil(total / Number(limit)), stats };
};

const getRegistrationById = async (id) => {
  const reg = await Registration.findById(id)
    .populate('userId', 'name email phone college branch year')
    .populate('eventId', 'title slug eventType isPaid registrationFee')
    .populate({
      path: 'teamId',
      populate: { path: 'leaderId', select: 'name email' },
    });
  if (!reg) throw new AppError('Registration not found', 404, 'REGISTRATION_NOT_FOUND');
  return reg;
};

const register = async ({ userId, eventId, teamName, registrationData }) => {
  const event = await Event.findById(eventId);
  if (!event) throw new AppError('Event not found', 404, 'EVENT_NOT_FOUND');
  if (!event.isRegistrationOpen) throw new AppError('Registration is closed for this event', 400, 'REGISTRATION_CLOSED');

  const existing = await Registration.findOne({ userId, eventId });
  if (existing) throw new AppError('You are already registered for this event', 409, 'ALREADY_REGISTERED');

  // Check capacity
  const count = await Registration.countDocuments({ eventId, status: { $ne: 'cancelled' } });
  if (count >= event.capacity) throw new AppError('This event is at full capacity. No more registrations can be accepted.', 400, 'EVENT_FULL');

  let teamId = null;
  if (event.eventType === 'team') {
    const team = await Team.create({ eventId, leaderId: userId, teamName: teamName || `Team-${userId}` });
    await TeamMember.create({ teamId: team._id, userId, status: 'accepted' });
    teamId = team._id;
  }

  const registration = await Registration.create({
    userId,
    eventId,
    teamId,
    registrationData,
    status: event.isPaid ? 'pending' : 'confirmed',
  });

  // Generate ticket if event is free / immediately confirmed
  if (!event.isPaid) {
    const ticketId = uuidv4();
    const qrData = await QRCode.toDataURL(ticketId);
    await Ticket.create({ ticketId, userId, eventId, qrData });
    if (event.isPaid === false) {
      await Payment.create({ userId, eventId, amount: 0, status: 'completed' });
    }
  }

  return registration;
};

const { writeAuditLog } = require('../middleware/auditLog');

const cancelRegistration = async (regId, adminId, reqMeta = {}) => {
  const reg = await Registration.findById(regId);
  if (!reg) throw new AppError('Registration not found', 404, 'REGISTRATION_NOT_FOUND');
  if (reg.status === 'cancelled') throw new AppError('Registration already cancelled', 400, 'ALREADY_CANCELLED');

  const before = reg.toObject();
  reg.status = 'cancelled';
  await reg.save();

  // Cancel linked ticket
  await Ticket.updateMany(
    { userId: reg.userId, eventId: reg.eventId, status: 'valid' },
    { status: 'cancelled' }
  );

  await writeAuditLog({
    adminId,
    action: 'CANCEL_REGISTRATION',
    entityType: 'Registration',
    entityId: reg._id,
    before,
    after: reg.toObject(),
    ip: reqMeta.ip,
    userAgent: reqMeta.userAgent,
  });

  return reg;
};

const deleteRegistration = async (regId, adminId, reqMeta = {}) => {
  const reg = await Registration.findById(regId);
  if (!reg) throw new AppError('Registration not found', 404, 'REGISTRATION_NOT_FOUND');

  const snap = reg.toObject();

  // 1. Delete associated Ticket
  await Ticket.deleteMany({ userId: reg.userId, eventId: reg.eventId });

  // 2. Handle Team-related records
  if (reg.teamId) {
    const team = await Team.findById(reg.teamId);
    // If this user is the leader, delete the whole team
    if (team && team.leaderId.toString() === reg.userId.toString()) {
      await TeamMember.deleteMany({ teamId: team._id });
      await Team.findByIdAndDelete(team._id);
    } else {
      // Otherwise just remove this user from the team
      await TeamMember.deleteOne({ teamId: reg.teamId, userId: reg.userId });
    }
  }

  // 3. Handle HackathonTeam records if any
  const HackathonTeam = require('../models/HackathonTeam');
  await HackathonTeam.deleteMany({ registrationId: reg._id });

  // 4. Delete the registration record
  await Registration.findByIdAndDelete(regId);

  await writeAuditLog({
    adminId,
    action: 'DELETE_REGISTRATION',
    entityType: 'Registration',
    entityId: regId,
    before: snap,
    after: null,
    ip: reqMeta.ip,
    userAgent: reqMeta.userAgent,
  });

  return { success: true };
};

const resendTicketEmail = async (regId, adminId, reqMeta = {}) => {
  const reg = await Registration.findById(regId)
    .populate('userId', 'name email')
    .populate('eventId', 'title');
  if (!reg) throw new AppError('Registration not found', 404, 'REGISTRATION_NOT_FOUND');
  if (reg.status !== 'confirmed') throw new AppError('Can only resend for confirmed registrations', 400, 'NOT_CONFIRMED');

  const ticket = await Ticket.findOne({ userId: reg.userId._id, eventId: reg.eventId._id });
  if (!ticket) throw new AppError('No ticket found for this registration', 404, 'TICKET_NOT_FOUND');

  // Log the resend action (actual email sending depends on your mail service integration)
  await writeAuditLog({
    adminId,
    action: 'RESEND_TICKET_EMAIL',
    entityType: 'Registration',
    entityId: reg._id,
    before: null,
    after: { ticketId: ticket.ticketId, email: reg.userId.email },
    ip: reqMeta.ip,
    userAgent: reqMeta.userAgent,
  });

  return { message: 'Ticket email resend triggered', ticketId: ticket.ticketId, email: reg.userId.email };
};

const markAttendance = async (regId, adminId, reqMeta = {}) => {
  const reg = await Registration.findById(regId);
  if (!reg) throw new AppError('Registration not found', 404, 'REGISTRATION_NOT_FOUND');

  const before = reg.toObject();
  reg.checkedIn = true;
  reg.checkedInAt = new Date();
  reg.checkedInBy = adminId;
  await reg.save();

  // Also mark linked ticket as used
  const ticket = await Ticket.findOne({ userId: reg.userId, eventId: reg.eventId, status: 'valid' });
  if (ticket) {
    ticket.status = 'used';
    ticket.scannedAt = new Date();
    ticket.scannedBy = adminId;
    await ticket.save();
  }

  await writeAuditLog({
    adminId,
    action: 'MARK_ATTENDANCE',
    entityType: 'Registration',
    entityId: reg._id,
    before,
    after: reg.toObject(),
    ip: reqMeta.ip,
    userAgent: reqMeta.userAgent,
  });

  return reg;
};

module.exports = { getRegistrations, getRegistrationById, register, cancelRegistration, deleteRegistration, resendTicketEmail, markAttendance };
