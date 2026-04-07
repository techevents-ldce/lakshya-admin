const router    = require('express').Router();
const protect   = require('../middleware/auth');
const authorize = require('../middleware/authorize');
const ctrl      = require('../controllers/templateController');

// All routes require authentication + admin role
router.use(protect, authorize('admin'));

router.get('/',    ctrl.listTemplates);
router.post('/',   ctrl.createTemplate);
router.get('/:id', ctrl.getTemplate);
router.put('/:id', ctrl.updateTemplate);
router.delete('/:id', ctrl.deleteTemplate);
router.post('/:id/duplicate',  ctrl.duplicateTemplate);
router.post('/:id/test-send',  ctrl.sendTestFromTemplate);

module.exports = router;
