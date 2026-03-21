const referralService = require('../services/referralService');
const asyncHandler = require('../utils/asyncHandler');

exports.listMappings = asyncHandler(async (req, res) => {
  const data = await referralService.listMappings(req.query);
  res.json({ success: true, data });
});

exports.createMapping = asyncHandler(async (req, res) => {
  const doc = await referralService.createMapping(req.body);
  res.status(201).json({ success: true, data: doc });
});

exports.updateMapping = asyncHandler(async (req, res) => {
  const doc = await referralService.updateMapping(req.params.id, req.body);
  res.json({ success: true, data: doc });
});

exports.getUnmappedCodes = asyncHandler(async (req, res) => {
  const data = await referralService.getUnmappedUsedCodes();
  res.json({ success: true, data });
});

exports.getAnalyticsSummary = asyncHandler(async (req, res) => {
  const data = await referralService.getAnalyticsSummary();
  res.json({ success: true, data });
});

exports.getCodeWiseAnalytics = asyncHandler(async (req, res) => {
  const data = await referralService.getCodeWiseAnalytics();
  res.json({ success: true, data });
});

exports.getLeaderboard = asyncHandler(async (req, res) => {
  const unmappedAtBottom = req.query.unmappedAtBottom !== 'false';
  const data = await referralService.getLeaderboard({ unmappedAtBottom });
  res.json({ success: true, data });
});
