const express = require('express');
const router = express.Router();
const eventInsightsController = require('../controllers/eventInsightsController');
const protect = require('../middleware/auth');
const authorize = require('../middleware/authorize');

/**
 * GET /api/admin/event-insights
 * Get comprehensive event insights with correct registration and participant counts
 * Requires: admin authorization
 */
router.get('/', protect, authorize('admin'), eventInsightsController.getEventInsights);

module.exports = router;
