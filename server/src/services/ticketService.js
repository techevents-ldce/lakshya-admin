const Ticket = require('../models/Ticket');
const Registration = require('../models/Registration');
const AppError = require('../middleware/AppError');
const { writeAuditLog } = require('../middleware/auditLog');

const verifyTicket = async (originalTicketId, eventId, scannedByUserId) => {
  const ticketId = originalTicketId ? originalTicketId.trim() : '';
  console.log(`[TicketService] Verifying ticket. ID: ${ticketId}, Event: ${eventId}, ScannedBy: ${scannedByUserId}`);

  // Attempt to find by human-readable ticketId (case-insensitive to handle QR encoding variances)
  let ticket = await Ticket.findOne({ ticketId: new RegExp(`^${ticketId}$`, 'i') })
    .populate('userId', 'name email')
    .populate('eventId', 'title');

  // Fallback: Attempt to find by internal MongoDB _id (in case QR contains _id)
  if (!ticket && ticketId.match(/^[0-9a-fA-F]{24}$/)) {
    console.log(`[TicketService] Ticket not found by UUID, attempting fallback to _id...`);
    ticket = await Ticket.findById(ticketId)
      .populate('userId', 'name email')
      .populate('eventId', 'title');
  }

  if (!ticket) {
    console.warn(`[TicketService] Verification failed: Ticket NOT FOUND for input "${ticketId}"`);
    return { status: 'invalid', message: 'Ticket not found' };
  }

  console.log(`[TicketService] Ticket found: ${ticket.ticketId || ticket._id} for event: ${ticket.eventId?.title} (${ticket.eventId?._id})`);

  // Event-specific validation — prevent cross-event entry
  // Converting both to string for robust comparison
  if (ticket.eventId._id.toString() !== eventId.toString()) {
    console.warn(`[TicketService] Mismatch! Ticket belongs to ${ticket.eventId._id} but scanned for ${eventId}`);
    return {
      status: 'wrong_event',
      message: '✗ Wrong Event — This QR code belongs to a different event',
      ticketEvent: ticket.eventId.title,
      user: ticket.userId,
    };
  }

  if (ticket.status === 'used') {
    console.warn(`[TicketService] Ticket already used. Scanned at: ${ticket.scannedAt}`);
    return {
      status: 'already_used',
      message: '⚠ Already checked in',
      scannedAt: ticket.scannedAt,
      user: ticket.userId,
      event: ticket.eventId,
    };
  }
  if (ticket.status === 'cancelled') {
    console.warn(`[TicketService] Ticket is cancelled.`);
    return { status: 'invalid', message: 'Ticket has been cancelled' };
  }

  // Mark ticket as used
  ticket.status = 'used';
  ticket.scannedAt = new Date();
  ticket.scannedBy = scannedByUserId;
  await ticket.save();

  // Also mark the Registration as checked-in
  // We search by userId and eventId to ensure the specific registration is updated
  await Registration.findOneAndUpdate(
    { userId: ticket.userId._id, eventId: ticket.eventId._id },
    { checkedIn: true, checkedInAt: new Date(), checkedInBy: scannedByUserId }
  );

  console.log(`[TicketService] Verification SUCCESS for ${ticket.userId?.name}`);

  return {
    status: 'valid',
    message: '✓ Entry verified — attendance marked',
    user: ticket.userId,
    event: ticket.eventId,
    checkedInAt: ticket.scannedAt,
  };
};

const getTicketsByEvent = async (eventId) => {
  return Ticket.find({ eventId })
    .populate('userId', 'name email phone')
    .sort({ createdAt: -1 });
};

const getTicketByUserId = async (userId, eventId) => {
  const query = { userId };
  if (eventId) query.eventId = eventId;
  return Ticket.findOne(query).populate('eventId', 'title');
};

// ── New admin functions ──

const getTickets = async (query = {}, viewer = null) => {
  const { page = 1, limit = 20, eventId, status, search } = query;
  const filter = {};

  // Role-based scoping for coordinators
  if (viewer && viewer.role === 'coordinator') {
    const assignedIds = (viewer.assignedEvents || []).map(id => id.toString());
    if (eventId) {
      if (!assignedIds.includes(eventId.toString())) {
        filter.eventId = { $in: assignedIds };
      } else {
        filter.eventId = eventId;
      }
    } else {
      filter.eventId = { $in: assignedIds };
    }
  } else if (eventId) {
    filter.eventId = eventId;
  }
  if (status) filter.status = status;

  if (search) {
    filter.$or = [
      { ticketId: { $regex: search, $options: 'i' } },
    ];
    // Also search by user name/email
    const User = require('../models/User');
    const matchingUsers = await User.find({
      $or: [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ],
    }).select('_id').lean();
    if (matchingUsers.length > 0) {
      filter.$or.push({ userId: { $in: matchingUsers.map((u) => u._id) } });
    }
  }

  const skip = (Number(page) - 1) * Number(limit);
  const [tickets, total] = await Promise.all([
    Ticket.find(filter)
      .skip(skip)
      .limit(Number(limit))
      .sort({ createdAt: -1 })
      .populate('userId', 'name email phone')
      .populate('eventId', 'title slug eventType')
      .lean(),
    Ticket.countDocuments(filter),
  ]);

  // Enrich with team info for team events (registration link + Ticket.teamId fallback)
  const Registration = require('../models/Registration');
  const Team = require('../models/Team');

  const userEventPairs = tickets.map((t) => ({
    userId: t.userId?._id || t.userId,
    eventId: t.eventId?._id || t.eventId,
  }));

  if (userEventPairs.length > 0) {
    const userIds = [...new Set(userEventPairs.map((p) => p.userId?.toString()).filter(Boolean))];
    const eventIds = [...new Set(userEventPairs.map((p) => p.eventId?.toString()).filter(Boolean))];

    const regs = await Registration.find({
      userId: { $in: userIds },
      eventId: { $in: eventIds },
      teamId: { $ne: null },
    }).select('userId eventId teamId').lean();

    const teamIdSet = new Set();
    regs.forEach((r) => {
      if (r.teamId) teamIdSet.add(r.teamId.toString());
    });
    tickets.forEach((t) => {
      if (t.teamId) teamIdSet.add(t.teamId.toString());
    });

    let teamMap = {};
    if (teamIdSet.size > 0) {
      const teams = await Team.find({ _id: { $in: [...teamIdSet] } })
        .select('teamName leaderId')
        .populate('leaderId', 'name email')
        .lean();
      teams.forEach((tm) => { teamMap[tm._id.toString()] = tm; });
    }

    const regMap = {};
    regs.forEach((r) => {
      const key = `${r.userId.toString()}_${r.eventId.toString()}`;
      regMap[key] = r;
    });

    tickets.forEach((t) => {
      const uid = (t.userId?._id || t.userId)?.toString();
      const eid = (t.eventId?._id || t.eventId)?.toString();
      const key = `${uid}_${eid}`;
      const reg = regMap[key];
      if (reg && reg.teamId) {
        t.team = teamMap[reg.teamId.toString()] || null;
      }
      if (!t.team && t.teamId) {
        t.team = teamMap[t.teamId.toString()] || null;
      }
    });
  }

  return { tickets, total, page: Number(page), pages: Math.ceil(total / Number(limit)) };
};

const markUsed = async (ticketId, adminId, reqMeta = {}) => {
  const ticket = await Ticket.findById(ticketId);
  if (!ticket) throw new AppError('Ticket not found', 404, 'TICKET_NOT_FOUND');
  if (ticket.status === 'used') throw new AppError('Ticket already used', 400, 'TICKET_ALREADY_USED');
  if (ticket.status === 'cancelled') throw new AppError('Ticket is cancelled', 400, 'TICKET_CANCELLED');

  const before = ticket.toObject();
  ticket.status = 'used';
  ticket.scannedAt = new Date();
  ticket.scannedBy = adminId;
  await ticket.save();

  // Also mark registration as checked in
  await Registration.findOneAndUpdate(
    { userId: ticket.userId, eventId: ticket.eventId },
    { checkedIn: true, checkedInAt: new Date(), checkedInBy: adminId }
  );

  await writeAuditLog({
    adminId,
    action: 'MARK_TICKET_USED',
    entityType: 'Ticket',
    entityId: ticket._id,
    before,
    after: ticket.toObject(),
    ip: reqMeta.ip,
    userAgent: reqMeta.userAgent,
  });

  return ticket;
};

const cancelTicket = async (ticketId, adminId, reqMeta = {}) => {
  const ticket = await Ticket.findById(ticketId);
  if (!ticket) throw new AppError('Ticket not found', 404, 'TICKET_NOT_FOUND');
  if (ticket.status === 'cancelled') throw new AppError('Ticket already cancelled', 400, 'TICKET_ALREADY_CANCELLED');

  const before = ticket.toObject();
  ticket.status = 'cancelled';
  await ticket.save();

  await writeAuditLog({
    adminId,
    action: 'CANCEL_TICKET',
    entityType: 'Ticket',
    entityId: ticket._id,
    before,
    after: ticket.toObject(),
    ip: reqMeta.ip,
    userAgent: reqMeta.userAgent,
  });

  return ticket;
};

const deleteTicket = async (ticketId, adminId, reqMeta = {}) => {
  const ticket = await Ticket.findById(ticketId);
  if (!ticket) throw new AppError('Ticket not found', 404, 'TICKET_NOT_FOUND');

  const before = ticket.toObject();

  // If ticket was used, reset registration checked-in status
  if (ticket.status === 'used') {
    await Registration.findOneAndUpdate(
      { userId: ticket.userId, eventId: ticket.eventId },
      { checkedIn: false, checkedInAt: null, checkedInBy: null }
    );
  }

  await Ticket.findByIdAndDelete(ticketId);

  await writeAuditLog({
    adminId,
    action: 'DELETE_TICKET',
    entityType: 'Ticket',
    entityId: ticket._id,
    before,
    after: null, // Deleted
    ip: reqMeta.ip,
    userAgent: reqMeta.userAgent,
  });

  return { success: true };
};

const searchByTicketId = async (ticketIdStr) => {
  const ticket = await Ticket.findOne({ ticketId: ticketIdStr })
    .populate('userId', 'name email phone college')
    .populate('eventId', 'title slug')
    .lean();
  return ticket;
};

module.exports = { verifyTicket, getTicketsByEvent, getTicketByUserId, getTickets, markUsed, cancelTicket, deleteTicket, searchByTicketId };

