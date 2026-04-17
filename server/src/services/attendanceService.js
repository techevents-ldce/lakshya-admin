const Registration = require('../models/Registration');
const Ticket = require('../models/Ticket');
const Team = require('../models/Team');
const TeamMember = require('../models/TeamMember');
const AppError = require('../middleware/AppError');

/**
 * Build a full attendance list for an event.
 * Each entry contains: registration info, user info, team info (if any), and ticket status.
 */
const getAttendanceForEvent = async (eventId, query = {}) => {
  const { search, status: filterStatus } = query;

  // 1. Fetch all confirmed/pending registrations for the event
  const filter = { eventId };
  const registrations = await Registration.find(filter)
    .sort({ createdAt: -1 })
    .populate('userId', 'name email phone college branch year')
    .populate('eventId', 'title slug eventType')
    .populate({
      path: 'teamId',
      populate: { path: 'leaderId', select: 'name email' },
    })
    .lean();

  // 2. Fetch all tickets for the event
  const tickets = await Ticket.find({ eventId })
    .populate('scannedBy', 'name')
    .lean();

  // Build a map: userId -> ticket
  const ticketMap = {};
  for (const t of tickets) {
    ticketMap[t.userId.toString()] = t;
  }

  // 3. Fetch team members for team registrations
  const teamIds = registrations.filter((r) => r.teamId).map((r) => r.teamId._id);
  let teamMembersMap = {};
  if (teamIds.length > 0) {
    const members = await TeamMember.find({ teamId: { $in: teamIds } })
      .populate('userId', 'name email phone college')
      .lean();
    for (const m of members) {
      const tid = m.teamId.toString();
      if (!teamMembersMap[tid]) teamMembersMap[tid] = [];
      teamMembersMap[tid].push(m);
    }
  }

  // 4. Build attendance records
  let records = registrations.map((r) => {
    const ticket = ticketMap[r.userId._id.toString()] || null;
    let attendanceStatus = 'no-ticket';
    if (ticket) {
      if (ticket.status === 'used') attendanceStatus = 'present';
      else if (ticket.status === 'valid') attendanceStatus = 'absent';
      else if (ticket.status === 'cancelled') attendanceStatus = 'cancelled';
    }

    return {
      _id: r._id,
      user: r.userId,
      event: r.eventId,
      registrationStatus: r.status,
      team: r.teamId || null,
      teamMembers: r.teamId ? teamMembersMap[r.teamId._id.toString()] || [] : [],
      ticket: ticket
        ? {
            _id: ticket._id,
            ticketId: ticket.ticketId,
            status: ticket.status,
            scannedAt: ticket.scannedAt,
            scannedBy: ticket.scannedBy,
          }
        : null,
      attendanceStatus,
    };
  });

  // 5. Apply search filter
  if (search) {
    const q = search.toLowerCase();
    records = records.filter(
      (r) =>
        r.user?.name?.toLowerCase().includes(q) ||
        r.user?.email?.toLowerCase().includes(q)
    );
  }

  // 6. Apply attendance status filter
  if (filterStatus && filterStatus !== 'all') {
    records = records.filter((r) => r.attendanceStatus === filterStatus);
  }

  // 7. Compute summary
  const summary = {
    total: records.length,
    present: records.filter((r) => r.attendanceStatus === 'present').length,
    absent: records.filter((r) => r.attendanceStatus === 'absent').length,
    cancelled: records.filter((r) => r.attendanceStatus === 'cancelled').length,
    noTicket: records.filter((r) => r.attendanceStatus === 'no-ticket').length,
  };

  return { records, summary };
};

/**
 * Toggle a ticket's status. Coordinators can mark present↔absent or cancel/restore.
 */
const toggleTicketStatus = async (ticketId, newStatus, coordinatorId) => {
  const validStatuses = ['valid', 'used', 'cancelled'];
  if (!validStatuses.includes(newStatus)) {
    throw new AppError(`Invalid status. Must be one of: ${validStatuses.join(', ')}`, 400, 'INVALID_STATUS');
  }

  const ticket = await Ticket.findById(ticketId);
  if (!ticket) {
    throw new AppError('Ticket not found', 404, 'TICKET_NOT_FOUND');
  }

  ticket.status = newStatus;
  if (newStatus === 'used') {
    ticket.scannedAt = new Date();
    ticket.scannedBy = coordinatorId;
  } else if (newStatus === 'valid') {
    // Resetting to valid clears scan info
    ticket.scannedAt = null;
    ticket.scannedBy = null;
  }

  await ticket.save();
  return ticket;
};

/**
 * Team-wise attendance: returns each team with member-level attendance status.
 */
const getTeamWiseAttendance = async (eventId, query = {}) => {
  const { search } = query;
  let filter = { eventId, status: { $ne: 'withdrawn' } };

  if (search) {
    const User = require('../models/User');
    const matchingUsers = await User.find({
      $or: [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ],
    }).select('_id');
    const matchedUserIds = matchingUsers.map((u) => u._id);

    const matchingTeams = await Team.find({
      eventId,
      status: { $ne: 'withdrawn' },
      $or: [
        { teamName: { $regex: search, $options: 'i' } },
        { leaderId: { $in: matchedUserIds } }
      ]
    }).select('_id');
    const teamIdsFromTeams = matchingTeams.map(t => t._id);

    const matchingTeamMembers = await TeamMember.find({
      userId: { $in: matchedUserIds }
    }).select('teamId');
    const teamIdsFromMembers = matchingTeamMembers.map(m => m.teamId);

    let teamIdsFromHackathon = [];
    try {
      const HackathonTeam = require('../models/HackathonTeam');
      const matchingHt = await HackathonTeam.find({
        $or: [
          { 'members.name': { $regex: search, $options: 'i' } },
          { 'members.email': { $regex: search, $options: 'i' } }
        ]
      }).select('teamId');
      teamIdsFromHackathon = matchingHt.map(ht => ht.teamId);
    } catch (_) {}

    const allMatchedTeamIds = [...teamIdsFromTeams, ...teamIdsFromMembers, ...teamIdsFromHackathon].filter(Boolean);
    filter._id = { $in: allMatchedTeamIds };
  }

  // Align team "units" with analytics: exclude withdrawn teams.
  const teams = await Team.find(filter)
    .populate('leaderId', 'name email phone college')
    .sort({ createdAt: -1 })
    .lean();

  if (teams.length === 0) return { teams: [], summary: { totalTeams: 0, teamsWithFullAttendance: 0, totalMembers: 0, presentMembers: 0 } };

  const teamIds = teams.map((t) => t._id);

  const members = await TeamMember.find({ teamId: { $in: teamIds } })
    .populate('userId', 'name email phone college branch year')
    .lean();

  const tickets = await Ticket.find({ eventId }).populate('scannedBy', 'name').lean();
  const ticketMap = {};
  for (const t of tickets) ticketMap[t.userId.toString()] = t;

  const membersByTeam = {};
  const memberEmailsByTeam = {}; // track which emails are already in TeamMember per team
  for (const m of members) {
    const tid = m.teamId.toString();
    if (!membersByTeam[tid]) { membersByTeam[tid] = []; memberEmailsByTeam[tid] = new Set(); }
    const uid = (m.userId?._id || m.userId).toString();
    const ticket = ticketMap[uid] || null;
    let attendanceStatus = 'no-ticket';
    if (ticket) {
      if (ticket.status === 'used') attendanceStatus = 'present';
      else if (ticket.status === 'valid') attendanceStatus = 'absent';
      else if (ticket.status === 'cancelled') attendanceStatus = 'cancelled';
    }
    membersByTeam[tid].push({
      ...m,
      attendanceStatus,
      ticket: ticket ? { ticketId: ticket.ticketId, status: ticket.status, scannedAt: ticket.scannedAt, scannedBy: ticket.scannedBy } : null,
    });
    // Track member email so we can skip duplicates when merging hackathon members
    const memberEmail = m.userId?.email;
    if (memberEmail) memberEmailsByTeam[tid].add(memberEmail.toLowerCase());
  }

  // ── Merge HackathonTeam raw members for teams that have hackathon imports ──
  // This ensures the coordinator sees ALL imported members, not just those with
  // portal accounts / TeamMember documents.
  try {
    const HackathonTeam = require('../models/HackathonTeam');
    const hackathonTeams = await HackathonTeam.find({ teamId: { $in: teamIds } }).lean();
    for (const ht of hackathonTeams) {
      const tid = ht.teamId?.toString();
      if (!tid) continue;
      if (!membersByTeam[tid]) { membersByTeam[tid] = []; memberEmailsByTeam[tid] = new Set(); }
      for (const htMember of (ht.members || [])) {
        const htEmail = (htMember.email || '').toLowerCase();
        // Skip if this member is already represented by a TeamMember entry
        if (htEmail && memberEmailsByTeam[tid].has(htEmail)) continue;
        // Add as a display-only member (no userId, no ticket)
        membersByTeam[tid].push({
          _id: `ht_${tid}_${htEmail || htMember.name}`,
          teamId: ht.teamId,
          userId: null, // no portal account yet
          hackathonMember: true, // flag for frontend differentiation
          displayName: htMember.name || htEmail,
          displayEmail: htEmail,
          displayPhone: htMember.phone || '',
          displayCollege: htMember.collegeName || '',
          teamRole: htMember.teamRole || 'member',
          attendanceStatus: 'no-ticket',
          ticket: null,
          status: 'accepted',
        });
        if (htEmail) memberEmailsByTeam[tid].add(htEmail);
      }
    }
  } catch (_) {
    // HackathonTeam collection may not exist for non-hackathon events — safe to ignore.
  }

  let result = teams.map((t) => {
    const teamMembers = membersByTeam[t._id.toString()] || [];
    const presentCount = teamMembers.filter((m) => m.attendanceStatus === 'present').length;
    return { ...t, members: teamMembers, memberCount: teamMembers.length, presentCount, allPresent: teamMembers.length > 0 && presentCount === teamMembers.length };
  });

  const totalMembers = result.reduce((s, t) => s + t.memberCount, 0);
  const presentMembers = result.reduce((s, t) => s + t.presentCount, 0);

  return { teams: result, summary: { totalTeams: result.length, teamsWithFullAttendance: result.filter((t) => t.allPresent).length, totalMembers, presentMembers } };
};

module.exports = { getAttendanceForEvent, toggleTicketStatus, getTeamWiseAttendance };
