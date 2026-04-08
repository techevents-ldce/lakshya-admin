const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const protect = require('../middleware/auth');
const authorize = require('../middleware/authorize');
const validate = require('../middleware/validate');
const auditLog = require('../middleware/auditLog');
const verifyAdminPassword = require('../middleware/verifyAdminPassword');
const { createUserSchema, updateUserSchema, assignEventsSchema, resetPasswordSchema } = require('../validations/user.validation');

// Any authenticated user can get their own full profile (with assigned events populated)
router.get('/me/profile', protect, userController.getMyProfile);

// Admin: manage all users
router.get('/', protect, authorize('admin'), userController.getAll);
router.get('/:id', protect, authorize('admin', 'coordinator'), userController.getOne);
router.put('/:id', protect, authorize('admin'), verifyAdminPassword, validate(updateUserSchema), auditLog('UPDATE_USER', 'User'), userController.update);
router.patch('/:id/block', protect, authorize('admin'), verifyAdminPassword, auditLog('BLOCK_USER', 'User'), userController.block);
router.patch('/:id/unblock', protect, authorize('admin'), verifyAdminPassword, auditLog('UNBLOCK_USER', 'User'), userController.unblock);

// Coordinator management
router.post('/coordinators', protect, authorize('admin'), verifyAdminPassword, validate(createUserSchema), auditLog('CREATE_COORDINATOR', 'User'), userController.createCoordinator);
router.patch('/:id/assign-events', protect, authorize('admin'), verifyAdminPassword, validate(assignEventsSchema), auditLog('ASSIGN_EVENTS', 'User'), userController.assignEvents);
router.patch('/:id/reset-password', protect, authorize('admin'), verifyAdminPassword, validate(resetPasswordSchema), auditLog('RESET_PASSWORD', 'User'), userController.resetPassword);

// Enriched detail (regs + tickets + orders)
router.get('/:id/detail', protect, authorize('admin'), userController.getDetail);
// Deactivate user
router.patch('/:id/deactivate', protect, authorize('admin'), verifyAdminPassword, auditLog('DEACTIVATE_USER', 'User'), userController.deactivate);

module.exports = router;
