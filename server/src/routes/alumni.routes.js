const express = require('express');
const router = express.Router();
const protect = require('../middleware/auth');
const authorize = require('../middleware/authorize');
const validate = require('../middleware/validate');
const alumniController = require('../controllers/alumni.controller');
const { listQuerySchema, priorityBodySchema } = require('../validations/alumni.validation');

/**
 * Admin alumni management.
 * Uses protect + authorize('admin') — same access pattern as analytics/registrations (superadmin passes authorize).
 */
router.use(protect, authorize('admin'));

router.get('/export', validate(listQuerySchema, 'query'), alumniController.exportCsv);
router.get('/', validate(listQuerySchema, 'query'), alumniController.list);
router.get('/:id', alumniController.getOne);
router.patch('/:id/priority', validate(priorityBodySchema), alumniController.updatePriority);

module.exports = router;
