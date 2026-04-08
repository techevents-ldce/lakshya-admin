const express = require('express');
const router = express.Router();
const registrationController = require('../controllers/registrationController');
const protect = require('../middleware/auth');
const authorize = require('../middleware/authorize');
const verifyAdminPassword = require('../middleware/verifyAdminPassword');
const auditLog = require('../middleware/auditLog');

router.get('/', protect, authorize('admin', 'coordinator'), registrationController.getAll);
router.get('/:id', protect, authorize('admin', 'coordinator'), registrationController.getOne);
router.post('/', protect, registrationController.register);

// Admin actions
router.patch('/:id/cancel', protect, authorize('admin'), verifyAdminPassword, auditLog('CANCEL_REGISTRATION', 'Registration'), registrationController.cancel);
router.post('/:id/resend-email', protect, authorize('admin'), auditLog('RESEND_TICKET_EMAIL', 'Registration'), registrationController.resendEmail);
router.patch('/:id/mark-attendance', protect, authorize('admin', 'coordinator'), auditLog('MARK_ATTENDANCE', 'Registration'), registrationController.markAttendance);

module.exports = router;
