const AppError = require('./AppError');

/**
 * Factory: authorize(...roles)
 * Usage: router.get('/admin-route', protect, authorize('admin'), handler)
 * superadmin passes all role checks.
 */
const authorize = (...roles) => (req, res, next) => {
  if (!req.user) {
    return next(new AppError('You do not have permission to perform this action', 403));
  }
  // superadmin bypasses all role checks
  if (req.user.role === 'superadmin') return next();
  if (!roles.includes(req.user.role)) {
    return next(new AppError('You do not have permission to perform this action', 403));
  }
  next();
};

module.exports = authorize;
