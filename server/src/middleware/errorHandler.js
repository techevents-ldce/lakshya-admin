const logger = require('../utils/logger');

/**
 * User-friendly messages for known internal error types.
 * The actual internal details (stack trace, field values, etc.) are ONLY logged,
 * NEVER sent to the client in production.
 */

// ─── Helpers ───────────────────────────────────────────────────────────────────

const sanitizeDuplicateKeyError = (err) => {
  const field = Object.keys(err.keyValue || {})[0] || 'field';
  const friendlyNames = {
    email: 'email address',
    phone: 'phone number',
    slug: 'event URL',
    title: 'title',
    ticketId: 'ticket',
  };
  const displayName = friendlyNames[field] || field;
  return {
    statusCode: 409,
    message: `A record with that ${displayName} already exists.`,
    errorCode: 'DUPLICATE_ENTRY',
  };
};

const sanitizeCastError = (err) => ({
  statusCode: 400,
  message: 'The requested resource ID is invalid. Please check and try again.',
  errorCode: 'INVALID_RESOURCE_ID',
});

const sanitizeValidationError = (err) => {
  const messages = Object.values(err.errors || {}).map((e) => {
    // Make mongoose validation messages more user-friendly
    if (e.kind === 'required') return `${e.path} is required`;
    if (e.kind === 'minlength') return `${e.path} is too short`;
    if (e.kind === 'maxlength') return `${e.path} is too long`;
    if (e.kind === 'enum') return `${e.path} has an invalid value`;
    return e.message;
  });
  return {
    statusCode: 422,
    message: `Please fix the following: ${messages.join('. ')}.`,
    errorCode: 'VALIDATION_FAILED',
  };
};

const sanitizeJwtError = () => ({
  statusCode: 401,
  message: 'Your session is invalid. Please log in again.',
  errorCode: 'AUTH_INVALID_TOKEN',
});

const sanitizeTokenExpiredError = () => ({
  statusCode: 401,
  message: 'Your session has expired. Please log in again.',
  errorCode: 'AUTH_TOKEN_EXPIRED',
});

const sanitizeSyntaxError = () => ({
  statusCode: 400,
  message: 'The request body contains invalid JSON. Please check your input.',
  errorCode: 'INVALID_JSON',
});

const sanitizePayloadTooLarge = () => ({
  statusCode: 413,
  message: 'The request is too large. Please reduce the size and try again.',
  errorCode: 'PAYLOAD_TOO_LARGE',
});

// ─── Main Handler ──────────────────────────────────────────────────────────────

const errorHandler = (err, req, res, next) => {
  // Default: treat as unknown internal error
  let statusCode = 500;
  let message = 'Something went wrong. Please try again later.';
  let errorCode = 'INTERNAL_ERROR';

  // ── Known operational errors (thrown intentionally via AppError) ──
  if (err.isOperational) {
    statusCode = err.statusCode;
    message = err.message;
    errorCode = err.errorCode || undefined;
  }

  // ── Mongoose CastError (invalid ObjectId) ──
  else if (err.name === 'CastError') {
    ({ statusCode, message, errorCode } = sanitizeCastError(err));
  }

  // ── Mongoose duplicate key ──
  else if (err.code === 11000) {
    ({ statusCode, message, errorCode } = sanitizeDuplicateKeyError(err));
  }

  // ── Mongoose validation error ──
  else if (err.name === 'ValidationError') {
    ({ statusCode, message, errorCode } = sanitizeValidationError(err));
  }

  // ── JWT errors ──
  else if (err.name === 'JsonWebTokenError') {
    ({ statusCode, message, errorCode } = sanitizeJwtError());
  }
  else if (err.name === 'TokenExpiredError') {
    ({ statusCode, message, errorCode } = sanitizeTokenExpiredError());
  }

  // ── Malformed JSON body ──
  else if (err.type === 'entity.parse.failed' || (err instanceof SyntaxError && err.status === 400)) {
    ({ statusCode, message, errorCode } = sanitizeSyntaxError());
  }

  // ── Payload too large ──
  else if (err.type === 'entity.too.large') {
    ({ statusCode, message, errorCode } = sanitizePayloadTooLarge());
  }

  // ── Log internal server errors ──
  // Always log 500s with full detail for debugging, but NEVER expose them to the client.
  if (statusCode >= 500) {
    logger.error('Internal server error', {
      message: err.message,
      stack: err.stack,
      url: req.originalUrl,
      method: req.method,
      ip: req.ip,
      requestId: req.requestId,
    });
  } else {
    // Log 4xx errors at warn level for monitoring
    logger.warn(`Client error ${statusCode}: ${err.message}`, {
      url: req.originalUrl,
      method: req.method,
      requestId: req.requestId,
    });
  }

  // ── Build response ──
  const response = {
    success: false,
    message,
  };

  // Include error code if available (for programmatic handling on the client)
  if (errorCode) response.errorCode = errorCode;

  // Include request ID for support reference
  if (req.requestId) response.requestId = req.requestId;

  // In development only, include stack trace for debugging
  if (process.env.NODE_ENV === 'development' && statusCode >= 500) {
    response.stack = err.stack;
    response.internalMessage = err.message;
  }

  res.status(statusCode).json(response);
};

module.exports = errorHandler;
