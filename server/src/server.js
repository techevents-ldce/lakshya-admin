const app = require('./app');
const connectDB = require('./config/db');
const logger = require('./utils/logger');
const { recoverStaleJobs } = require('./services/bulkEmailWorker');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 5000;

// ─── Process-Level Safety Handlers ─────────────────────────────────────────────
// These ensure that no unhandled errors crash the server silently or leak details.

process.on('unhandledRejection', (reason) => {
  logger.error('UNHANDLED PROMISE REJECTION — shutting down...', {
    error: reason instanceof Error ? reason.message : reason,
    stack: reason instanceof Error ? reason.stack : undefined,
  });
  // Give the server time to finish in-flight requests, then exit
  process.exit(1);
});

process.on('uncaughtException', (err) => {
  logger.error('UNCAUGHT EXCEPTION — shutting down...', {
    error: err.message,
    stack: err.stack,
  });
  process.exit(1);
});

// ─── Start Server ──────────────────────────────────────────────────────────────

const start = async () => {
  await connectDB();

  // Ensure temp uploads directory exists
  const tempDir = path.join(__dirname, '../uploads/temp');
  if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

  // Recover any interrupted bulk email jobs from a previous crash (Resend)
  await recoverStaleJobs();

  app.listen(PORT, () => {
    logger.info(`Lakshya API running on port ${PORT}`);
  });
};

start().catch((err) => {
  logger.error('Failed to start server', { error: err.message, stack: err.stack });
  process.exit(1);
});
