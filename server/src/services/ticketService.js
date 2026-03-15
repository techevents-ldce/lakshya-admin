const Ticket = require('../models/Ticket');
const AppError = require('../middleware/AppError');

const verifyTicket = async (ticketId, scannedByUserId) => {
  const ticket = await Ticket.findOne({ ticketId })
    .populate('userId', 'name email')
    .populate('eventId', 'title');

  if (!ticket) {
    return { status: 'invalid', message: 'Ticket not found' };
  }
  if (ticket.status === 'used') {
    return {
      status: 'already_used',
      message: 'Ticket has already been scanned',
      scannedAt: ticket.scannedAt,
      user: ticket.userId,
      event: ticket.eventId,
    };
  }
  if (ticket.status === 'cancelled') {
    return { status: 'invalid', message: 'Ticket has been cancelled' };
  }

  // Mark as used
  ticket.status = 'used';
  ticket.scannedAt = new Date();
  ticket.scannedBy = scannedByUserId;
  await ticket.save();

  return {
    status: 'valid',
    message: 'Entry verified successfully',
    user: ticket.userId,
    event: ticket.eventId,
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
