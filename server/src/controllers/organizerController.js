const Organizer = require('../models/Organizer');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../middleware/AppError');

exports.getAll = asyncHandler(async (req, res) => {
  const organizers = await Organizer.find({ isActive: true }).sort({ order: 1 });
  res.json({ success: true, data: organizers });
});

exports.getOne = asyncHandler(async (req, res) => {
  const org = await Organizer.findById(req.params.id);
  if (!org) throw new AppError('Organizer not found', 404, 'ORGANIZER_NOT_FOUND');
  res.json({ success: true, data: org });
});

exports.create = asyncHandler(async (req, res) => {
  const org = await Organizer.create(req.body);
  res.status(201).json({ success: true, data: org });
});

exports.update = asyncHandler(async (req, res) => {
  const org = await Organizer.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!org) throw new AppError('Organizer not found', 404, 'ORGANIZER_NOT_FOUND');
  res.json({ success: true, data: org });
});

exports.remove = asyncHandler(async (req, res) => {
  const org = await Organizer.findByIdAndDelete(req.params.id);
  if (!org) throw new AppError('Organizer not found', 404, 'ORGANIZER_NOT_FOUND');
  res.json({ success: true, message: 'Organizer deleted' });
});
