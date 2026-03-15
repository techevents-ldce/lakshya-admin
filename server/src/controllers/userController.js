const userService = require('../services/userService');
const asyncHandler = require('../utils/asyncHandler');

exports.getAll = asyncHandler(async (req, res) => {
  const result = await userService.getUsers(req.query);
  res.json({ success: true, ...result });
});

exports.getMyProfile = asyncHandler(async (req, res) => {
  const user = await userService.getUserById(req.user.id);
  res.json({ success: true, data: user });
});

exports.getOne = asyncHandler(async (req, res) => {
  const user = await userService.getUserById(req.params.id);
  res.json({ success: true, data: user });
});

exports.createCoordinator = asyncHandler(async (req, res) => {
  const user = await userService.createCoordinator(req.body);
  res.status(201).json({ success: true, data: user });
});

exports.update = asyncHandler(async (req, res) => {
  const user = await userService.updateUser(req.params.id, req.body);
  res.json({ success: true, data: user });
});

exports.block = asyncHandler(async (req, res) => {
  const user = await userService.blockUser(req.params.id);
  res.json({ success: true, data: user });
});

exports.unblock = asyncHandler(async (req, res) => {
  const user = await userService.unblockUser(req.params.id);
  res.json({ success: true, data: user });
});

exports.assignEvents = asyncHandler(async (req, res) => {
  const { eventIds } = req.body;
  const user = await userService.assignEventsToCoordinator(req.params.id, eventIds);
  res.json({ success: true, data: user });
});

exports.resetPassword = asyncHandler(async (req, res) => {
  const { newPassword } = req.body;
  await userService.resetCoordinatorPassword(req.params.id, newPassword);
  res.json({ success: true, message: 'Password reset successfully' });
});
