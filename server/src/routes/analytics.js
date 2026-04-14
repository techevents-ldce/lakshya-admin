const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');
const protect = require('../middleware/auth');
const authorize = require('../middleware/authorize');

router.get('/dashboard', protect, authorize('admin'), analyticsController.getDashboard);
router.get('/events', protect, authorize('admin'), analyticsController.getEvents);

module.exports = router;
