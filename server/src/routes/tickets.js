const express = require('express');
const router = express.Router();
const ticketController = require('../controllers/ticketController');
const protect = require('../middleware/auth');
const authorize = require('../middleware/authorize');
const auditLog = require('../middleware/auditLog');

// Admin paginated listing
router.get('/', protect, authorize('admin'), ticketController.getAll);

// Coordinator / Admin can verify tickets — event-specific route
router.get('/verify/:eventId/:ticketId', protect, authorize('admin', 'coordinator'), ticketController.verify);
router.get('/event/:eventId', protect, authorize('admin', 'coordinator'), ticketController.getByEvent);
// Participant can get their own ticket
router.get('/my', protect, ticketController.getMyTicket);

// Search by ticketId string
router.get('/search/:ticketId', protect, authorize('admin', 'coordinator'), ticketController.search);

// Admin actions
router.patch('/:id/mark-used', protect, authorize('admin', 'coordinator'), auditLog('MARK_TICKET_USED', 'Ticket'), ticketController.markUsed);
router.patch('/:id/cancel', protect, authorize('admin'), auditLog('CANCEL_TICKET', 'Ticket'), ticketController.cancel);

module.exports = router;
