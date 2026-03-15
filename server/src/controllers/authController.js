const authService = require('../services/authService');
const asyncHandler = require('../utils/asyncHandler');

exports.login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const result = await authService.login(email, password);
  res.json({ success: true, ...result });
});

exports.register = asyncHandler(async (req, res) => {
  const user = await authService.register(req.body);
  res.status(201).json({ success: true, data: user });
});

exports.refresh = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;
  const result = await authService.refresh(refreshToken);
  res.json({ success: true, ...result });
});

exports.me = asyncHandler(async (req, res) => {
  res.json({ success: true, user: req.user });
});
