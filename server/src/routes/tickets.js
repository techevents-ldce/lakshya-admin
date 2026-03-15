const express = require('express');
const router = express.Router();
const ticketController = require('../controllers/ticketController');
const protect = require('../middleware/auth');
const authorize = require('../middleware/authorize');

// Coordinator / Admin can verify tickets
router.get('/verify/:ticketId', protect, authorize('admin', 'coordinator'), ticketController.verify);
router.get('/event/:eventId', protect, authorize('admin', 'coordinator'), ticketController.getByEvent);
// Participant can get their own ticket
router.get('/my', protect, ticketController.getMyTicket);

module.exports = router;
