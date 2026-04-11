const registrationService = require('../services/registrationService');
const asyncHandler = require('../utils/asyncHandler');

exports.getAll = asyncHandler(async (req, res) => {
  const result = await registrationService.getRegistrations(req.query);
  res.json({ success: true, ...result });
});

exports.getOne = asyncHandler(async (req, res) => {
  const reg = await registrationService.getRegistrationById(req.params.id);
  res.json({ success: true, data: reg });
});

exports.register = asyncHandler(async (req, res) => {
  const reg = await registrationService.register({ userId: req.user.id, ...req.body });
  res.status(201).json({ success: true, data: reg });
});

exports.cancel = asyncHandler(async (req, res) => {
  const reg = await registrationService.cancelRegistration(req.params.id, req.user.id, {
    ip: req.ip,
    userAgent: req.headers['user-agent'],
  });
  res.json({ success: true, data: reg });
});

exports.delete = asyncHandler(async (req, res) => {
  const result = await registrationService.deleteRegistration(req.params.id, req.user.id, {
    ip: req.ip,
    userAgent: req.headers['user-agent'],
  });
  res.json({ success: true, ...result });
});

exports.resendEmail = asyncHandler(async (req, res) => {
  const result = await registrationService.resendTicketEmail(req.params.id, req.user.id, {
    ip: req.ip,
    userAgent: req.headers['user-agent'],
  });
  res.json({ success: true, ...result });
});

exports.markAttendance = asyncHandler(async (req, res) => {
  const reg = await registrationService.markAttendance(req.params.id, req.user.id, {
    ip: req.ip,
    userAgent: req.headers['user-agent'],
  });
  res.json({ success: true, data: reg });
});
