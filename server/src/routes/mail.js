const router = require('express').Router();
const protect = require('../middleware/auth');
const authorize = require('../middleware/authorize');
const verifyAdminPassword = require('../middleware/verifyAdminPassword');
const mailController = require('../controllers/mailController');

// All routes require authentication + admin role
router.use(protect, authorize('admin'));

// ─── Recipients & Sender Identities ──────────────────────────────────────────
router.get('/recipients', mailController.getRecipients);
router.get('/sender-identities', mailController.getSenderIdentities);

// ─── File Upload (parse CSV/Excel for preview) ───────────────────────────────
router.post('/upload-recipients', mailController.uploadMiddleware, mailController.uploadRecipients);

// ─── Bulk Email Jobs ─────────────────────────────────────────────────────────
router.post('/jobs', verifyAdminPassword, mailController.createBulkEmailJob);
router.get('/jobs', mailController.getJobs);
router.get('/jobs/:jobId', mailController.getJobDetail);
router.post('/jobs/:jobId/retry', verifyAdminPassword, mailController.retryFailedRecipients);
router.post('/jobs/:jobId/cancel', mailController.cancelJob);

module.exports = router;
