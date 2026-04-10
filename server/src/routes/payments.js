const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const protect = require('../middleware/auth');
const authorize = require('../middleware/authorize');
const readOnlyAdmin = require('../middleware/readOnlyAdmin');
const auditLog = require('../middleware/auditLog');
const verifyAdminPassword = require('../middleware/verifyAdminPassword');

router.get('/', protect, authorize('admin'), paymentController.getAll);
router.get('/revenue-stats', protect, authorize('admin'), paymentController.getRevenueStats);
router.patch('/:id/verify', protect, authorize('admin'), readOnlyAdmin, verifyAdminPassword, auditLog('VERIFY_PAYMENT', 'Payment'), paymentController.verify);

module.exports = router;
