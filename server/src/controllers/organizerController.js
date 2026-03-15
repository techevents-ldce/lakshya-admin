const Organizer = require('../models/Organizer');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../middleware/AppError');
const fs = require('fs');
const path = require('path');

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
  if (req.file) {
    req.body.image = `/uploads/organizers/${req.file.filename}`;
  }
  const org = await Organizer.create(req.body);
  res.status(201).json({ success: true, data: org });
});

exports.update = asyncHandler(async (req, res) => {
  const existing = await Organizer.findById(req.params.id);
  if (!existing) throw new AppError('Organizer not found', 404, 'ORGANIZER_NOT_FOUND');

  // If a new file was uploaded, delete the old image file
  if (req.file) {
    req.body.image = `/uploads/organizers/${req.file.filename}`;
    if (existing.image && existing.image.startsWith('/uploads/')) {
      const oldPath = path.join(__dirname, '..', '..', existing.image);
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    }
  }

  const org = await Organizer.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  res.json({ success: true, data: org });
});

exports.remove = asyncHandler(async (req, res) => {
  const org = await Organizer.findByIdAndDelete(req.params.id);
  if (!org) throw new AppError('Organizer not found', 404, 'ORGANIZER_NOT_FOUND');

  // Clean up the image file
  if (org.image && org.image.startsWith('/uploads/')) {
    const filePath = path.join(__dirname, '..', '..', org.image);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  }

  res.json({ success: true, message: 'Organizer deleted' });
});
