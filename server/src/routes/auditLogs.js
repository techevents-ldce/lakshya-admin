const express = require('express');
const router = express.Router();
const AuditLog = require('../models/AuditLog');
const protect = require('../middleware/auth');
const authorize = require('../middleware/authorize');
const asyncHandler = require('../utils/asyncHandler');

router.get('/', protect, authorize('admin'), asyncHandler(async (req, res) => {
  const { page = 1, limit = 30, adminId } = req.query;
  const filter = {};
  if (adminId) filter.adminId = adminId;
  const skip = (Number(page) - 1) * Number(limit);
  const [logs, total] = await Promise.all([
    AuditLog.find(filter)
      .skip(skip)
      .limit(Number(limit))
      .sort({ createdAt: -1 })
      .populate('adminId', 'name email'),
    AuditLog.countDocuments(filter),
  ]);
  res.json({ success: true, data: logs, total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
}));

module.exports = router;
