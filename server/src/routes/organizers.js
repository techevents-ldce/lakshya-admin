const express = require('express');
const router = express.Router();
const organizerController = require('../controllers/organizerController');
const protect = require('../middleware/auth');
const authorize = require('../middleware/authorize');
const verifyAdminPassword = require('../middleware/verifyAdminPassword');
const upload = require('../middleware/upload');

router.get('/', organizerController.getAll);
router.get('/:id', organizerController.getOne);
router.post('/', protect, authorize('admin'), upload.single('image'), verifyAdminPassword, organizerController.create);
router.put('/:id', protect, authorize('admin'), upload.single('image'), verifyAdminPassword, organizerController.update);
router.delete('/:id', protect, authorize('admin'), verifyAdminPassword, organizerController.remove);

module.exports = router;
