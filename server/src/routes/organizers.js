const express = require('express');
const router = express.Router();
const organizerController = require('../controllers/organizerController');
const protect = require('../middleware/auth');
const authorize = require('../middleware/authorize');

router.get('/', organizerController.getAll);
router.get('/:id', organizerController.getOne);
router.post('/', protect, authorize('admin'), organizerController.create);
router.put('/:id', protect, authorize('admin'), organizerController.update);
router.delete('/:id', protect, authorize('admin'), organizerController.remove);

module.exports = router;
