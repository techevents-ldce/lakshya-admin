require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');
const errorHandler = require('./middleware/errorHandler');

const app = express();

// Security
app.use(helmet());
const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map(o => o.trim())
  .filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow server-to-server requests (no origin header, e.g. Postman, cURL, health checks)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    console.warn(`[CORS] Blocked origin: ${origin}`);
    callback(new Error(`CORS: Origin ${origin} is not allowed`));
  },
  credentials: true,
}));

// Rate limiting for auth routes
const authLimiter = rateLimit({
  windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: Number(process.env.RATE_LIMIT_MAX) || 20,
  message: { success: false, message: 'Too many requests. Please try again later.', errorCode: 'RATE_LIMIT_EXCEEDED' },
});

// ─── Request ID ────────────────────────────────────────────────────────────────
// Attach a unique ID to every request for traceability. This ID is included
// in error responses so users can reference it when contacting support.
app.use((req, res, next) => {
  req.requestId = crypto.randomUUID();
  res.setHeader('X-Request-Id', req.requestId);
  next();
});

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Logging
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok', timestamp: new Date() }));

// Routes
app.use('/api/auth', authLimiter, require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/events', require('./routes/events'));
app.use('/api/registrations', require('./routes/registrations'));
app.use('/api/tickets', require('./routes/tickets'));
app.use('/api/payments', require('./routes/payments'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/teams', require('./routes/teams'));
app.use('/api/analytics', require('./routes/analytics'));

// Rate limit export endpoints
const exportLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10,
  message: { success: false, message: 'Too many export requests. Please try again later.', errorCode: 'RATE_LIMIT_EXCEEDED' },
});
app.use('/api/export', exportLimiter, require('./routes/export'));
app.use('/api/audit-logs', require('./routes/auditLogs'));
app.use('/api/attendance', require('./routes/attendance'));
app.use('/api/referrals', require('./routes/referrals'));
app.use('/api/admin/alumni', require('./routes/alumni.routes'));
app.use('/api/hackathon',   require('./routes/hackathon'));
app.use('/uploads', express.static(require('path').join(__dirname, '..', 'uploads')));
app.use('/api/mail', require('./routes/mail'));

// ─── 404 catch ─────────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `The requested resource was not found: ${req.method} ${req.originalUrl}`,
    errorCode: 'ROUTE_NOT_FOUND',
  });
});

// ─── Centralized error handler ─────────────────────────────────────────────────
app.use(errorHandler);

module.exports = app;
