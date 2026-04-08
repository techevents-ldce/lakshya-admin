const teamService = require('../services/teamService');
const asyncHandler = require('../utils/asyncHandler');

exports.getAll = asyncHandler(async (req, res) => {
  const result = await teamService.getTeams(req.query);
  res.json({ success: true, ...result });
});

exports.getOne = asyncHandler(async (req, res) => {
  const team = await teamService.getTeamById(req.params.id);
  res.json({ success: true, data: team });
});

exports.removeMember = asyncHandler(async (req, res) => {
  const result = await teamService.removeMember(req.params.id, req.params.userId, req.user.id, {
    ip: req.ip,
    userAgent: req.headers['user-agent'],
  });
  res.json({ success: true, ...result });
});

exports.cancelRegistration = asyncHandler(async (req, res) => {
  const team = await teamService.cancelTeamRegistration(req.params.id, req.user.id, {
    ip: req.ip,
    userAgent: req.headers['user-agent'],
  });
  res.json({ success: true, data: team });
});
