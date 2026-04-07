const router    = require('express').Router();
const protect   = require('../middleware/auth');
const authorize = require('../middleware/authorize');
const ctrl      = require('../controllers/suppressionController');

// All routes require authentication + admin role
router.use(protect, authorize('admin'));

router.get('/',           ctrl.listSuppressions);
router.post('/',          ctrl.addSuppression);
router.get('/check',      ctrl.checkSuppression);
router.delete('/:email',  ctrl.removeSuppression);

module.exports = router;
