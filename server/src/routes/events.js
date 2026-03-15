const express = require('express');
const router = express.Router();
const eventController = require('../controllers/eventController');
const protect = require('../middleware/auth');
const authorize = require('../middleware/authorize');
const validate = require('../middleware/validate');
const auditLog = require('../middleware/auditLog');
const { createEventSchema, updateEventSchema } = require('../validations/event.validation');

// Public: list events (for participant registration page)
router.get('/', eventController.getAll);
router.get('/:id', eventController.getOne);

// Admin only
router.post('/', protect, authorize('admin'), validate(createEventSchema), auditLog('CREATE_EVENT', 'Event'), eventController.create);
router.put('/:id', protect, authorize('admin'), validate(updateEventSchema), auditLog('UPDATE_EVENT', 'Event'), eventController.update);
router.delete('/:id', protect, authorize('admin'), auditLog('DELETE_EVENT', 'Event'), eventController.remove);
router.patch('/:id/toggle-registration', protect, authorize('admin'), auditLog('TOGGLE_REGISTRATION', 'Event'), eventController.toggleRegistration);

module.exports = router;
