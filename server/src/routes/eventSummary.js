const express = require('express');
const router = express.Router();
const eventSummaryController = require('../controllers/eventSummaryController');
const protect = require('../middleware/auth');
const authorize = require('../middleware/authorize');

/**
 * GET /api/admin/event-summary
 * Get event summary with team/solo breakdown
 * Requires: admin authorization
 */
router.get('/', protect, authorize('admin'), eventSummaryController.getEventSummary);

module.exports = router;
