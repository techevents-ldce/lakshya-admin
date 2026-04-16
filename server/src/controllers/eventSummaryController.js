const eventSummaryService = require('../services/eventSummaryService');
const asyncHandler = require('../utils/asyncHandler');

/**
 * GET /api/admin/event-summary
 * Returns event summary with team/solo breakdown
 */
exports.getEventSummary = asyncHandler(async (req, res) => {
  const summary = await eventSummaryService.getEventSummary(req.query, req.user?.role);
  
  res.json({
    success: true,
    data: summary,
    generatedAt: new Date().toISOString()
  });
});
