const eventService = require('../services/eventService');
const asyncHandler = require('../utils/asyncHandler');

exports.getAll = asyncHandler(async (req, res) => {
  const result = await eventService.getAllEvents(req.query);
  res.json({ success: true, ...result });
});

exports.getOne = asyncHandler(async (req, res) => {
  const event = await eventService.getEventById(req.params.id);
  res.json({ success: true, data: event });
});

exports.create = asyncHandler(async (req, res) => {
  const event = await eventService.createEvent(req.body);
  res.status(201).json({ success: true, data: event });
});

exports.update = asyncHandler(async (req, res) => {
  const event = await eventService.updateEvent(req.params.id, req.body);
  res.json({ success: true, data: event });
});

exports.remove = asyncHandler(async (req, res) => {
  await eventService.deleteEvent(req.params.id);
  res.json({ success: true, message: 'Event deleted' });
});

exports.toggleRegistration = asyncHandler(async (req, res) => {
  const { isOpen } = req.body;
  const event = await eventService.toggleRegistration(req.params.id, isOpen);
  res.json({ success: true, data: event });
});
