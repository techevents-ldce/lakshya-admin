const AppError = require('./AppError');

/**
 * Keeps regular admin users read-only on protected admin endpoints.
 * superadmin continues to have full access.
 */
const readOnlyAdmin = (req, res, next) => {
  if (req.user?.role === 'admin' && req.method !== 'GET') {
    return next(new AppError('Admins have read-only access. Please use a superadmin account for this action.', 403));
  }
  return next();
};

module.exports = readOnlyAdmin;
