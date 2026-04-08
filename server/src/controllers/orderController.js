const orderService = require('../services/orderService');
const asyncHandler = require('../utils/asyncHandler');

exports.getAll = asyncHandler(async (req, res) => {
  const result = await orderService.getOrders(req.query);
  res.json({ success: true, ...result });
});

exports.getOne = asyncHandler(async (req, res) => {
  const order = await orderService.getOrderById(req.params.id);
  res.json({ success: true, data: order });
});

exports.retryFulfillment = asyncHandler(async (req, res) => {
  const order = await orderService.retryFulfillment(req.params.id, req.user.id, {
    ip: req.ip,
    userAgent: req.headers['user-agent'],
  });
  res.json({ success: true, data: order });
});

exports.markRefunded = asyncHandler(async (req, res) => {
  const order = await orderService.markRefunded(req.params.id, req.user.id, {
    ip: req.ip,
    userAgent: req.headers['user-agent'],
  });
  res.json({ success: true, data: order });
});
