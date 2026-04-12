const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const protect = require('../middleware/auth');
const authorize = require('../middleware/authorize');
const readOnlyAdmin = require('../middleware/readOnlyAdmin');
const verifyAdminPassword = require('../middleware/verifyAdminPassword');
const auditLog = require('../middleware/auditLog');

router.get('/', protect, authorize('admin'), orderController.getAll);
router.get('/:id', protect, authorize('admin'), orderController.getOne);
router.post('/:id/retry-fulfillment', protect, authorize('admin'), readOnlyAdmin, verifyAdminPassword, auditLog('RETRY_FULFILLMENT', 'Order'), orderController.retryFulfillment);
router.post('/:id/force-fulfill', protect, authorize('admin'), readOnlyAdmin, verifyAdminPassword, auditLog('FORCE_FULFILL_ORDER', 'Order'), orderController.forceFulfill);
router.patch('/:id/refund', protect, authorize('admin'), readOnlyAdmin, verifyAdminPassword, auditLog('MARK_REFUNDED', 'Order'), orderController.markRefunded);

module.exports = router;
