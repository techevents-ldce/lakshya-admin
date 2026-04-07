const router     = require('express').Router();
const protect    = require('../middleware/auth');
const authorize  = require('../middleware/authorize');
const verifyAdminPassword = require('../middleware/verifyAdminPassword');
const ctrl       = require('../controllers/campaignController');

// All routes require authentication + admin role
router.use(protect, authorize('admin'));

// ─── Audience upload (must come before /:id routes) ───────────────────────────
router.post('/upload-audience', ctrl.uploadAudienceMiddleware, ctrl.uploadAudience);

// ─── Campaign CRUD ─────────────────────────────────────────────────────────────
router.get('/',    ctrl.listCampaigns);
router.post('/',   ctrl.createCampaign);
router.get('/:id', ctrl.getCampaignDetail);
router.put('/:id', ctrl.updateCampaign);

// ─── Campaign actions ──────────────────────────────────────────────────────────
router.post('/:id/submit',    verifyAdminPassword, ctrl.submitCampaign);
router.post('/:id/test-send', ctrl.sendTestEmail);
router.post('/:id/pause',     ctrl.pauseCampaign);
router.post('/:id/resume',    ctrl.resumeCampaign);
router.post('/:id/cancel',    ctrl.cancelCampaign);
router.post('/:id/retry',     verifyAdminPassword, ctrl.retryFailedRecipients);
router.post('/:id/duplicate', ctrl.duplicateCampaign);

// ─── Recipients & logs ─────────────────────────────────────────────────────────
router.get('/:id/recipients', ctrl.getCampaignRecipients);
router.get('/:id/export',     ctrl.exportCampaignLogs);

module.exports = router;
