const alumniService = require('../services/alumniService');
const asyncHandler = require('../utils/asyncHandler');

/**
 * GET /api/admin/alumni
 */
exports.list = asyncHandler(async (req, res) => {
  const result = await alumniService.listSubmissions(req.query);
  res.json({
    success: true,
    data: {
      submissions: result.submissions,
      total: result.total,
      page: result.page,
      pages: result.pages,
    },
  });
});

/**
 * GET /api/admin/alumni/export
 */
exports.exportCsv = asyncHandler(async (req, res) => {
  const csv = await alumniService.exportSubmissionsCsv(req.query);
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="alumni-submissions.csv"');
  res.send('\uFEFF' + csv);
});

/**
 * GET /api/admin/alumni/:id
 */
exports.getOne = asyncHandler(async (req, res) => {
  const submission = await alumniService.getSubmissionById(req.params.id);
  res.json({ success: true, data: submission });
});

/**
 * PATCH /api/admin/alumni/:id/priority
 * Body optional: { "priority": true } — if omitted, toggles current value.
 */
exports.updatePriority = asyncHandler(async (req, res) => {
  const submission = await alumniService.togglePriority(req.params.id, req.body);
  res.json({
    success: true,
    data: submission,
    message: 'Priority updated successfully',
  });
});
