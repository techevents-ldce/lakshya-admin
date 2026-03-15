const express = require('express');
const router = express.Router();
const exportController = require('../controllers/exportController');
const protect = require('../middleware/auth');
const authorize = require('../middleware/authorize');

router.get('/participants', protect, authorize('admin', 'coordinator'), exportController.exportParticipants);
router.get('/payments', protect, authorize('admin'), exportController.exportPayments);

module.exports = router;
