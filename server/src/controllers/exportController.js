const exportService = require('../services/exportService');
const asyncHandler = require('../utils/asyncHandler');

exports.exportParticipants = asyncHandler(async (req, res) => {
  const { eventId, format = 'csv' } = req.query;
  const data = await exportService.exportParticipants(eventId, format);

  if (format === 'excel') {
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=participants.xlsx');
    return res.send(data);
  }
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename=participants.csv');
  return res.send(data);
});

exports.exportPayments = asyncHandler(async (req, res) => {
  const { eventId, format = 'csv' } = req.query;
  const data = await exportService.exportPayments(eventId, format);

  if (format === 'excel') {
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=payments.xlsx');
    return res.send(data);
  }
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename=payments.csv');
  return res.send(data);
});
