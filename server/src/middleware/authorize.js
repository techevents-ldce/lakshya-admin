const AppError = require('./AppError');

/**
 * Factory: authorize(...roles)
 * Usage: router.get('/admin-route', protect, authorize('admin'), handler)
 */
const authorize = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return next(new AppError('You do not have permission to perform this action', 403));
  }
  next();
};

module.exports = authorize;
