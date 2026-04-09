const express = require('express');
const router = express.Router();
const PaymentAuditLog = require('../models/PaymentAuditLog');
const protect = require('../middleware/auth');
const authorize = require('../middleware/authorize');
const asyncHandler = require('../utils/asyncHandler');

router.get('/', protect, authorize('admin'), asyncHandler(async (req, res) => {
  const { page = 1, limit = 30, action, search } = req.query;
  const filter = {};
  if (action) filter.status = String(action).toUpperCase();

  // Search by payment audit identifiers
  if (search) {
    filter.$or = [
      { log_id: { $regex: search, $options: 'i' } },
      { order_id: { $regex: search, $options: 'i' } },
      { payment_id: { $regex: search, $options: 'i' } },
      { status: { $regex: search, $options: 'i' } },
    ];
  }

  const skip = (Number(page) - 1) * Number(limit);
  const [logs, total] = await Promise.all([
    PaymentAuditLog.find(filter)
      .skip(skip)
      .limit(Number(limit))
      .sort({ createdAt: -1 }),
    PaymentAuditLog.countDocuments(filter),
  ]);
  res.json({ success: true, data: logs, total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
}));

// Get distinct action types for filter dropdown
router.get('/actions', protect, authorize('admin'), asyncHandler(async (req, res) => {
  const actions = await PaymentAuditLog.distinct('status');
  res.json({ success: true, data: actions });
}));

module.exports = router;
