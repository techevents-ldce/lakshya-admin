const Ticket = require('../models/Ticket');
const Registration = require('../models/Registration');
const AppError = require('../middleware/AppError');

const verifyTicket = async (ticketId, eventId, scannedByUserId) => {
  const ticket = await Ticket.findOne({ ticketId })
    .populate('userId', 'name email')
    .populate('eventId', 'title');

  if (!ticket) {
    return { status: 'invalid', message: 'Ticket not found' };
  }

  // Event-specific validation — prevent cross-event entry
  if (ticket.eventId._id.toString() !== eventId.toString()) {
    return {
      status: 'wrong_event',
      message: '✗ Wrong Event — This QR code belongs to a different event',
      ticketEvent: ticket.eventId.title,
      user: ticket.userId,
    };
  }

  if (ticket.status === 'used') {
    return {
      status: 'already_used',
      message: '⚠ Already checked in',
      scannedAt: ticket.scannedAt,
      user: ticket.userId,
      event: ticket.eventId,
    };
  }
  if (ticket.status === 'cancelled') {
    return { status: 'invalid', message: 'Ticket has been cancelled' };
  }

  // Mark ticket as used
  ticket.status = 'used';
  ticket.scannedAt = new Date();
  ticket.scannedBy = scannedByUserId;
  await ticket.save();

  // Also mark the Registration as checked-in
  await Registration.findOneAndUpdate(
    { userId: ticket.userId._id, eventId: ticket.eventId._id },
    { checkedIn: true, checkedInAt: new Date(), checkedInBy: scannedByUserId }
  );

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

module.exports = { verifyTicket, getTicketsByEvent, getTicketByUserId };
