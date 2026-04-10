const express = require('express');
const router = express.Router();
const teamController = require('../controllers/teamController');
const protect = require('../middleware/auth');
const authorize = require('../middleware/authorize');
const readOnlyAdmin = require('../middleware/readOnlyAdmin');
const verifyAdminPassword = require('../middleware/verifyAdminPassword');

router.get('/', protect, authorize('admin', 'coordinator'), teamController.getAll);
router.get('/:id', protect, authorize('admin', 'coordinator'), teamController.getOne);
router.delete('/:id/members/:userId', protect, authorize('admin'), readOnlyAdmin, verifyAdminPassword, teamController.removeMember);
router.patch('/:id/cancel', protect, authorize('admin'), readOnlyAdmin, verifyAdminPassword, teamController.cancelRegistration);

module.exports = router;
