const exportService = require('../services/exportService');
const asyncHandler = require('../utils/asyncHandler');

/**
 * All export endpoints accept query params:
 * - format: 'csv' | 'excel'
 * - eventId: optional ObjectId
 * - status: optional status string
 * - dateFrom: optional ISO date
 * - dateTo: optional ISO date
 */

exports.exportParticipants = asyncHandler(async (req, res) => {
  const data = await exportService.exportParticipants(req.query);
  const ext = req.query.format === 'excel' ? 'xlsx' : 'csv';
  res.setHeader('Content-Type', ext === 'xlsx' ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' : 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename=participants.${ext}`);
  return res.send(data);
});

exports.exportPayments = asyncHandler(async (req, res) => {
  const data = await exportService.exportPayments(req.query);
  const ext = req.query.format === 'excel' ? 'xlsx' : 'csv';
  res.setHeader('Content-Type', ext === 'xlsx' ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' : 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename=payments.${ext}`);
  return res.send(data);
});

exports.exportOrders = asyncHandler(async (req, res) => {
  const data = await exportService.exportOrders(req.query);
  const ext = req.query.format === 'excel' ? 'xlsx' : 'csv';
  res.setHeader('Content-Type', ext === 'xlsx' ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' : 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename=orders.${ext}`);
  return res.send(data);
});

exports.exportAttendance = asyncHandler(async (req, res) => {
  const data = await exportService.exportAttendance(req.query);
  const ext = req.query.format === 'excel' ? 'xlsx' : 'csv';
  res.setHeader('Content-Type', ext === 'xlsx' ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' : 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename=attendance.${ext}`);
  return res.send(data);
});

exports.exportTickets = asyncHandler(async (req, res) => {
  const data = await exportService.exportTickets(req.query);
  const ext = req.query.format === 'excel' ? 'xlsx' : 'csv';
  res.setHeader('Content-Type', ext === 'xlsx' ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' : 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename=tickets.${ext}`);
  return res.send(data);
});
