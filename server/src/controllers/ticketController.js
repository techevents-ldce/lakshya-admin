const ticketService = require('../services/ticketService');
const asyncHandler = require('../utils/asyncHandler');

exports.verify = asyncHandler(async (req, res) => {
  const { ticketId, eventId } = req.params;
  const result = await ticketService.verifyTicket(ticketId, eventId, req.user.id);
  const statusCode = result.status === 'valid' ? 200
    : result.status === 'already_used' ? 200
    : result.status === 'wrong_event' ? 422
    : 404;
  res.status(statusCode).json({ success: true, ...result });
});

exports.getByEvent = asyncHandler(async (req, res) => {
  const tickets = await ticketService.getTicketsByEvent(req.params.eventId);
  res.json({ success: true, data: tickets });
});

exports.getMyTicket = asyncHandler(async (req, res) => {
  const ticket = await ticketService.getTicketByUserId(req.user.id, req.query.eventId);
  res.json({ success: true, data: ticket });
});
