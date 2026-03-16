const router = require('express').Router();
const protect = require('../middleware/auth');
const authorize = require('../middleware/authorize');
const verifyAdminPassword = require('../middleware/verifyAdminPassword');
const mailController = require('../controllers/mailController');

// All routes require authentication + admin role
router.use(protect, authorize('admin'));

// GET  /api/mail/recipients  – lightweight user list for picker
router.get('/recipients', mailController.getRecipients);

// POST /api/mail/send        – send bulk email (requires admin password)
router.post('/send', verifyAdminPassword, mailController.sendBulkEmail);

module.exports = router;
