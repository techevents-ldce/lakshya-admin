const paymentService = require('../services/paymentService');
const asyncHandler = require('../utils/asyncHandler');

exports.getAll = asyncHandler(async (req, res) => {
  const result = await paymentService.getPayments(req.query);
  res.json({ success: true, ...result });
});

exports.verify = asyncHandler(async (req, res) => {
  const payment = await paymentService.verifyPayment(req.params.id, req.user.id);
  res.json({ success: true, data: payment });
});

exports.getRevenueStats = asyncHandler(async (req, res) => {
  const stats = await paymentService.getRevenueStats();
  res.json({ success: true, data: stats });
});
