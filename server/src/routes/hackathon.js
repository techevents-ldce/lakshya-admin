const express    = require('express');
const router     = express.Router();
const protect    = require('../middleware/auth');
const authorize  = require('../middleware/authorize');
const uploadSpreadsheet = require('../middleware/uploadSpreadsheet');
const verifyAdminPassword = require('../middleware/verifyAdminPassword');
const hackathonController = require('../controllers/hackathonController');

// All hackathon routes are superadmin-only
// (authorize('superadmin') is checked — and the authorize middleware already
//  makes superadmin bypass all lower role checks, so we use authorize('admin')
//  which superadmin passes, and add an explicit superadmin-only check here.)
const superadminOnly = (req, res, next) => {
  if (req.user?.role !== 'superadmin') {
    return res.status(403).json({
      success: false,
      message: 'Hackathon management is restricted to superadmin only',
      errorCode: 'FORBIDDEN',
    });
  }
  next();
};

router.use(protect, superadminOnly);

// ── Import ──────────────────────────────────────────────────────────────────
router.post('/import', uploadSpreadsheet.single('file'), hackathonController.importTeams);
router.post('/import-parse', uploadSpreadsheet.single('file'), hackathonController.importParse);
router.post('/import-validate', hackathonController.importValidate);
router.post('/import-execute', verifyAdminPassword, hackathonController.importExecute);

// ── List & Detail ────────────────────────────────────────────────────────────
router.get('/teams',          hackathonController.listTeams);
router.get('/teams/:id',      hackathonController.getTeamDetail);
router.get('/batches',        hackathonController.listBatches);

// ── State transitions ────────────────────────────────────────────────────────
router.patch('/teams/:id/promote', hackathonController.promoteTeam);
router.patch('/teams/:id/suspend', hackathonController.suspendTeam);
router.patch('/teams/:id/remove',  hackathonController.removeTeam);
router.patch('/teams/:id/restore', hackathonController.restoreTeam);

// ── Delete (cascade) ──────────────────────────────────────────────────────────
router.delete('/teams/:id', hackathonController.deleteTeam);   // single team
router.delete('/batch',     hackathonController.deleteBatch);  // entire import batch

module.exports = router;
