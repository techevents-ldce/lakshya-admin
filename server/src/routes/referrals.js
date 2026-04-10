const express = require('express');
const router = express.Router();
const referralController = require('../controllers/referralController');
const protect = require('../middleware/auth');
const authorize = require('../middleware/authorize');
const readOnlyAdmin = require('../middleware/readOnlyAdmin');
const validate = require('../middleware/validate');
const {
  createMappingSchema,
  updateMappingSchema,
  listMappingsQuerySchema,
} = require('../validations/referral.validation');

router.use(protect, authorize('admin'));

router.get('/analytics/summary', referralController.getAnalyticsSummary);
router.get('/analytics/codes', referralController.getCodeWiseAnalytics);
router.get('/leaderboard', authorize('superadmin'), referralController.getLeaderboard);
router.get('/unmapped-codes', authorize('superadmin'), referralController.getUnmappedCodes);

router.get('/mappings', authorize('superadmin'), validate(listMappingsQuerySchema, 'query'), referralController.listMappings);
router.post('/mappings', authorize('superadmin'), readOnlyAdmin, validate(createMappingSchema), referralController.createMapping);
router.put('/mappings/:id', authorize('superadmin'), readOnlyAdmin, validate(updateMappingSchema), referralController.updateMapping);

module.exports = router;
