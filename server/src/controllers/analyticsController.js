const analyticsService = require('../services/analyticsService');
const asyncHandler = require('../utils/asyncHandler');

exports.getDashboard = asyncHandler(async (req, res) => {
  const stats = await analyticsService.getDashboardStats();
  res.json({ success: true, data: stats });
});
