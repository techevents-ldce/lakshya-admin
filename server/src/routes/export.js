const express = require('express');
const router = express.Router();
const exportController = require('../controllers/exportController');
const protect = require('../middleware/auth');
const authorize = require('../middleware/authorize');

router.get('/participants', protect, authorize('admin', 'coordinator'), exportController.exportParticipants);
router.get('/payments', protect, authorize('admin'), exportController.exportPayments);
router.get('/orders', protect, authorize('admin'), exportController.exportOrders);
router.get('/attendance', protect, authorize('admin', 'coordinator'), exportController.exportAttendance);
router.get('/tickets', protect, authorize('admin'), exportController.exportTickets);

module.exports = router;
