/**
 * Custom operational error class.
 * All known/expected errors should be thrown as AppError instances.
 * Unknown errors (programming bugs, DB crashes) are NOT AppError and
 * will be caught by the centralized handler as "internal" errors.
 */
class AppError extends Error {
  /**
   * @param {string} message  - Human-readable message safe to show the user
   * @param {number} statusCode - HTTP status code (4xx / 5xx)
   * @param {string} [errorCode] - Machine-readable code for the client (e.g. 'USER_NOT_FOUND')
   */
  constructor(message, statusCode, errorCode) {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode || null;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true; // Marks this as a known, expected error

    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = AppError;
