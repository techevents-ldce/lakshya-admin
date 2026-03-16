const attendanceService = require('../services/attendanceService');
const asyncHandler = require('../utils/asyncHandler');

exports.getAttendance = asyncHandler(async (req, res) => {
  const { eventId } = req.params;
  const result = await attendanceService.getAttendanceForEvent(eventId, req.query);
  res.json({ success: true, ...result });
});

exports.toggleTicketStatus = asyncHandler(async (req, res) => {
  const { ticketId } = req.params;
  const { status } = req.body;
  const ticket = await attendanceService.toggleTicketStatus(ticketId, status, req.user.id);
  res.json({ success: true, data: ticket });
});

exports.getTeamWiseAttendance = asyncHandler(async (req, res) => {
  const { eventId } = req.params;
  const result = await attendanceService.getTeamWiseAttendance(eventId, req.query);
  res.json({ success: true, ...result });
});
