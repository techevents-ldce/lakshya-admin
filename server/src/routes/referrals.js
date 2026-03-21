const express = require('express');
const router = express.Router();
const referralController = require('../controllers/referralController');
const protect = require('../middleware/auth');
const authorize = require('../middleware/authorize');
const validate = require('../middleware/validate');
const {
  createMappingSchema,
  updateMappingSchema,
  listMappingsQuerySchema,
} = require('../validations/referral.validation');

router.use(protect, authorize('admin'));

router.get('/analytics/summary', referralController.getAnalyticsSummary);
router.get('/analytics/codes', referralController.getCodeWiseAnalytics);
router.get('/leaderboard', referralController.getLeaderboard);
router.get('/unmapped-codes', referralController.getUnmappedCodes);

router.get('/mappings', validate(listMappingsQuerySchema, 'query'), referralController.listMappings);
router.post('/mappings', validate(createMappingSchema), referralController.createMapping);
router.put('/mappings/:id', validate(updateMappingSchema), referralController.updateMapping);

module.exports = router;
