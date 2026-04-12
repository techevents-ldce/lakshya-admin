const User = require('../models/User');
const { hashPassword, comparePassword } = require('../utils/password');
const { signAccessToken, signRefreshToken, verifyRefreshToken } = require('../utils/jwt');
const AppError = require('../middleware/AppError');

const login = async (email, password) => {
  const normalizedEmail = String(email || '').toLowerCase().trim();
  const user = await User.findOne({ email: normalizedEmail }).select('+passwordHash');
  if (!user) throw new AppError('Invalid email or password', 401, 'AUTH_INVALID_CREDENTIALS');
  if (!user.isActive) throw new AppError('Your account has been suspended. Please contact the administrator.', 403, 'AUTH_ACCOUNT_SUSPENDED');

  const isMatch = await comparePassword(password, user.passwordHash);
  if (!isMatch) throw new AppError('Invalid email or password', 401, 'AUTH_INVALID_CREDENTIALS');

  const payload = { id: user._id, role: user.role, name: user.name };
  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken(payload);

  return {
    accessToken,
    refreshToken,
    user: { id: user._id, name: user.name, email: user.email, role: user.role },
  };
};

const refresh = async (refreshToken) => {
  const decoded = verifyRefreshToken(refreshToken);
  const user = await User.findById(decoded.id);
  if (!user || !user.isActive) throw new AppError('Unable to refresh session. Please log in again.', 401, 'AUTH_REFRESH_FAILED');

  const payload = { id: user._id, role: user.role, name: user.name };
  const newAccessToken = signAccessToken(payload);
  return { accessToken: newAccessToken };
};

const register = async (data) => {
  const normalizedEmail = String(data.email || '').toLowerCase().trim();
  const existing = await User.findOne({ email: normalizedEmail });
  if (existing) throw new AppError('This email address is already registered', 409, 'AUTH_EMAIL_EXISTS');

  const passwordHash = await hashPassword(data.password);
  const user = await User.create({ ...data, email: normalizedEmail, passwordHash });
  return { id: user._id, name: user.name, email: user.email, role: user.role };
};

module.exports = { login, refresh, register };
