const hackathonService = require('../services/hackathonService');
const asyncHandler     = require('../utils/asyncHandler');
const path             = require('path');

/** POST /api/hackathon/import  — upload + parse + import */
exports.importTeams = asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No file uploaded', errorCode: 'NO_FILE' });
  }

  const { eventId, defaultStatus = 'selected' } = req.body;
  if (!eventId) {
    return res.status(400).json({ success: false, message: 'eventId is required', errorCode: 'MISSING_EVENT_ID' });
  }
  if (!['selected', 'waitlisted'].includes(defaultStatus)) {
    return res.status(400).json({ success: false, message: 'defaultStatus must be selected or waitlisted', errorCode: 'INVALID_STATUS' });
  }

  const summary = await hackathonService.importTeams(
    req.file.path,
    eventId,
    defaultStatus,
    req.user.id,
  );

  res.status(201).json({ success: true, data: summary });
});

/** POST /api/hackathon/import-parse — handles file upload + preview */
exports.importParse = asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No file uploaded', errorCode: 'NO_FILE' });
  }
  
  const result = await hackathonService.getHeadersAndPreview(req.file.path);
  res.json({ 
    success: true, 
    data: { 
      headers: result.headers, 
      preview: result.preview, 
      tempFileName: req.file.filename // Send unique name back
    } 
  });
});

/** POST /api/hackathon/import-validate — validates based on mappings */
exports.importValidate = asyncHandler(async (req, res) => {
  const { fileName, mappings } = req.body;
  const filePath = path.join(__dirname, '..', '..', 'uploads', 'hackathon', fileName);
  
  const result = await hackathonService.validateImportData(filePath, mappings);
  res.json({ success: true, data: result });
});

/** POST /api/hackathon/import-execute — final import */
exports.importExecute = asyncHandler(async (req, res) => {
  const { fileName, mappings } = req.body;
  const filePath = path.join(__dirname, '..', '..', 'uploads', 'hackathon', fileName);

  const result = await hackathonService.finalizeImport(filePath, mappings, req.user.id);
  res.status(201).json({ success: true, data: { importedCount: result.created } });
});

/** GET /api/hackathon/teams  — list with filters */
exports.listTeams = asyncHandler(async (req, res) => {
  const result = await hackathonService.listTeams(req.query);
  res.json({ success: true, ...result });
});

/** GET /api/hackathon/teams/:id  — detail */
exports.getTeamDetail = asyncHandler(async (req, res) => {
  const team = await hackathonService.getTeamDetail(req.params.id);
  res.json({ success: true, data: team });
});

/** PATCH /api/hackathon/teams/:id/promote  — waitlist → selected */
exports.promoteTeam = asyncHandler(async (req, res) => {
  const team = await hackathonService.promoteToSelected(req.params.id, req.user.id, {
    ip: req.ip, userAgent: req.headers['user-agent'],
  });
  res.json({ success: true, data: team, message: 'Team promoted to selected' });
});

/** PATCH /api/hackathon/teams/:id/suspend */
exports.suspendTeam = asyncHandler(async (req, res) => {
  const team = await hackathonService.suspendTeam(req.params.id, req.user.id, {
    ip: req.ip, userAgent: req.headers['user-agent'],
  });
  res.json({ success: true, data: team, message: 'Team suspended' });
});

/** PATCH /api/hackathon/teams/:id/remove */
exports.removeTeam = asyncHandler(async (req, res) => {
  const team = await hackathonService.removeTeam(req.params.id, req.user.id, {
    ip: req.ip, userAgent: req.headers['user-agent'],
  });
  res.json({ success: true, data: team, message: 'Team removed' });
});

/** PATCH /api/hackathon/teams/:id/restore */
exports.restoreTeam = asyncHandler(async (req, res) => {
  const team = await hackathonService.restoreTeam(req.params.id, req.user.id, {
    ip: req.ip, userAgent: req.headers['user-agent'],
  });
  res.json({ success: true, data: team, message: 'Team restored to selected' });
});

/** GET /api/hackathon/batches?eventId=  — list import batches */
exports.listBatches = asyncHandler(async (req, res) => {
  const batches = await hackathonService.listImportBatches(req.query.eventId);
  res.json({ success: true, data: batches });
});

/** DELETE /api/hackathon/teams/:id  — fully delete one team (cascade) */
exports.deleteTeam = asyncHandler(async (req, res) => {
  const result = await hackathonService.deleteTeam(req.params.id, req.user.id, {
    ip: req.ip, userAgent: req.headers['user-agent'],
  });
  res.json({ success: true, data: result, message: `Team "${result.teamName}" and all related records deleted` });
});

/** DELETE /api/hackathon/batch  — delete all teams in an import batch */
exports.deleteBatch = asyncHandler(async (req, res) => {
  const { importBatch, eventId } = req.body;
  if (!importBatch) {
    return res.status(400).json({ success: false, message: 'importBatch is required', errorCode: 'MISSING_BATCH' });
  }
  const result = await hackathonService.deleteBatch(importBatch, eventId, req.user.id, {
    ip: req.ip, userAgent: req.headers['user-agent'],
  });
  res.json({ success: true, data: result, message: `Deleted ${result.deletedCount} of ${result.total} teams in batch "${importBatch}"` });
});
