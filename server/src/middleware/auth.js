const { verifyAccessToken } = require('../utils/jwt');
const AppError = require('./AppError');

const protect = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next(new AppError('No token provided', 401));
    }
    const token = authHeader.split(' ')[1];
    const decoded = verifyAccessToken(token);
    req.user = decoded;
    next();
  } catch (err) {
    return next(new AppError('Invalid or expired token', 401));
  }
};

module.exports = protect;
