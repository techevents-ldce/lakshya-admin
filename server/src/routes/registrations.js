const express = require('express');
const router = express.Router();
const registrationController = require('../controllers/registrationController');
const protect = require('../middleware/auth');
const authorize = require('../middleware/authorize');

router.get('/', protect, authorize('admin', 'coordinator'), registrationController.getAll);
router.get('/:id', protect, authorize('admin', 'coordinator'), registrationController.getOne);
router.post('/', protect, registrationController.register);

module.exports = router;
