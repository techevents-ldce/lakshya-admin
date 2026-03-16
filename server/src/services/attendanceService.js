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

module.exports = { getAttendanceForEvent, toggleTicketStatus };
