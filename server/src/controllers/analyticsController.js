const analyticsService = require('../services/analyticsService');
const asyncHandler = require('../utils/asyncHandler');

exports.getDashboard = asyncHandler(async (req, res) => {
  const stats = await analyticsService.getDashboardStats(req.query);
  res.json({ success: true, data: stats });
});
exports.getEvents = asyncHandler(async (req, res) => {
  const metrics = await analyticsService.getEventMetrics();
  res.json({ success: true, data: metrics });
});
