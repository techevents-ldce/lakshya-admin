const User = require('../models/User');
const { comparePassword } = require('../utils/password');
const AppError = require('./AppError');

/**
 * Middleware: verifyAdminPassword
 * Requires `adminPassword` in req.body. Verifies it against the
 * logged-in admin's stored password hash before allowing the request
 * to proceed. Strips `adminPassword` from req.body afterwards.
 */
const verifyAdminPassword = async (req, res, next) => {
  try {
    const { adminPassword } = req.body;

    if (!adminPassword) {
      return next(new AppError('Admin password is required to perform this action', 400, 'ADMIN_PASSWORD_REQUIRED'));
    }

    const user = await User.findById(req.user.id).select('+passwordHash');
    if (!user) {
      return next(new AppError('Admin user not found', 404, 'ADMIN_NOT_FOUND'));
    }

    const isMatch = await comparePassword(adminPassword, user.passwordHash);
    if (!isMatch) {
      return next(new AppError('Incorrect admin password', 401, 'ADMIN_PASSWORD_INCORRECT'));
    }

    // Strip adminPassword from body so it doesn't leak to controllers
    delete req.body.adminPassword;
    next();
  } catch (err) {
    next(err);
  }
};

module.exports = verifyAdminPassword;
