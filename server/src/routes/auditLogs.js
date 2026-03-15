const express = require('express');
const router = express.Router();
const AuditLog = require('../models/AuditLog');
const User = require('../models/User');
const protect = require('../middleware/auth');
const authorize = require('../middleware/authorize');
const asyncHandler = require('../utils/asyncHandler');

router.get('/', protect, authorize('admin'), asyncHandler(async (req, res) => {
  const { page = 1, limit = 30, adminId, action, search } = req.query;
  const filter = {};
  if (adminId) filter.adminId = adminId;
  if (action) filter.action = action;

  // Search by admin name/email, action, or details
  if (search) {
    const matchingAdmins = await User.find({
      $or: [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ],
    }).select('_id');
    filter.$or = [
      { adminId: { $in: matchingAdmins.map((u) => u._id) } },
      { action: { $regex: search, $options: 'i' } },
      { details: { $regex: search, $options: 'i' } },
    ];
  }

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

// Get distinct action types for filter dropdown
router.get('/actions', protect, authorize('admin'), asyncHandler(async (req, res) => {
  const actions = await AuditLog.distinct('action');
  res.json({ success: true, data: actions });
}));

module.exports = router;
