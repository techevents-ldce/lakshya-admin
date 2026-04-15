const eventInsightsService = require('../services/eventInsightsService');
const asyncHandler = require('../utils/asyncHandler');

/**
 * GET /api/admin/event-insights
 * Returns comprehensive event insights with correct registration and participant counts
 */
exports.getEventInsights = asyncHandler(async (req, res) => {
  const insights = await eventInsightsService.getEventInsights();
  
  res.json({
    success: true,
    data: insights,
    count: insights.length,
    generatedAt: new Date().toISOString()
  });
});
