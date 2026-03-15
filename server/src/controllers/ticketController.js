const ticketService = require('../services/ticketService');
const asyncHandler = require('../utils/asyncHandler');

exports.verify = asyncHandler(async (req, res) => {
  const result = await ticketService.verifyTicket(req.params.ticketId, req.user.id);
  const statusCode = result.status === 'valid' ? 200 : result.status === 'already_used' ? 200 : 404;
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
