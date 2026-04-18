const ticketService = require('../services/ticketService');
const asyncHandler = require('../utils/asyncHandler');

exports.verify = asyncHandler(async (req, res) => {
  const { ticketId, eventId } = req.params;
  console.log(`[TicketController] VERIFY REQUEST: ticketId=${ticketId}, eventId=${eventId}`);
  
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

// ── Admin endpoints ──

exports.getAll = asyncHandler(async (req, res) => {
  const result = await ticketService.getTickets(req.query, req.user);
  res.json({ success: true, ...result });
});

exports.markUsed = asyncHandler(async (req, res) => {
  const ticket = await ticketService.markUsed(req.params.id, req.user.id, {
    ip: req.ip,
    userAgent: req.headers['user-agent'],
  });
  res.json({ success: true, data: ticket });
});

exports.cancel = asyncHandler(async (req, res) => {
  const ticket = await ticketService.cancelTicket(req.params.id, req.user.id, {
    ip: req.ip,
    userAgent: req.headers['user-agent'],
  });
  res.json({ success: true, data: ticket });
});

exports.deleteTicket = asyncHandler(async (req, res) => {
  await ticketService.deleteTicket(req.params.id, req.user.id, {
    ip: req.ip,
    userAgent: req.headers['user-agent'],
  });
  res.json({ success: true, message: 'Ticket deleted successfully' });
});

exports.search = asyncHandler(async (req, res) => {
  const ticket = await ticketService.searchByTicketId(req.params.ticketId);
  res.json({ success: true, data: ticket });
});
