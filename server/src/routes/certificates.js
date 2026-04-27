const router = require('express').Router();
const protect = require('../middleware/auth');
const authorize = require('../middleware/authorize');
const certController = require('../controllers/certificateController');

// ── Public route ──────────────────────────────────────────────────────────────
// Anyone (including the public validator page) can verify a certificate hash.
router.get('/verify/:hash', certController.verifyCertificate);

// ── Protected routes (superadmin only) ───────────────────────────────────────
router.use(protect, authorize('superadmin'));

router.post('/register', certController.registerCertificate);
router.get('/', certController.listCertificates);

module.exports = router;
