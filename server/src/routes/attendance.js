const express = require('express');
const router = express.Router();
const attendanceController = require('../controllers/attendanceController');
const protect = require('../middleware/auth');
const authorize = require('../middleware/authorize');

// GET  /api/attendance/:eventId — full attendance list for an event
router.get('/:eventId', protect, authorize('admin', 'coordinator'), attendanceController.getAttendance);

// PATCH /api/attendance/ticket/:ticketId — toggle ticket status
router.patch('/ticket/:ticketId', protect, authorize('admin', 'coordinator'), attendanceController.toggleTicketStatus);

module.exports = router;
