const authService = require('../services/authService');
const asyncHandler = require('../utils/asyncHandler');
const User = require('../models/User');
const { comparePassword } = require('../utils/password');
const AppError = require('../middleware/AppError');

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

/**
 * POST /auth/verify-password
 * Verify the logged-in user's password. Used as a gate
 * before showing sensitive pages (registrations, payments).
 */
exports.verifyPassword = asyncHandler(async (req, res) => {
  const { password } = req.body;
  if (!password) {
    throw new AppError('Password is required', 400, 'PASSWORD_REQUIRED');
  }
  const user = await User.findById(req.user.id).select('+passwordHash');
  if (!user) {
    throw new AppError('User not found', 404, 'USER_NOT_FOUND');
  }
  const isMatch = await comparePassword(password, user.passwordHash);
  if (!isMatch) {
    throw new AppError('Incorrect password', 401, 'PASSWORD_INCORRECT');
  }
  res.json({ success: true, message: 'Password verified' });
});
