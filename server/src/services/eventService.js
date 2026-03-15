const Event = require('../models/Event');
const AppError = require('../middleware/AppError');

const getAllEvents = async (query = {}) => {
  const { page = 1, limit = 20, category, search, isRegistrationOpen, eventType } = query;
  const filter = {};
  if (category) filter.category = category;
  if (eventType) filter.eventType = eventType;
  if (search) filter.title = { $regex: search, $options: 'i' };
  if (isRegistrationOpen !== undefined) filter.isRegistrationOpen = isRegistrationOpen === 'true';

  const skip = (Number(page) - 1) * Number(limit);
  const [events, total] = await Promise.all([
    Event.find(filter).skip(skip).limit(Number(limit)).sort({ createdAt: -1 }).populate('coordinators', 'name email'),
    Event.countDocuments(filter),
  ]);
  return { events, total, page: Number(page), pages: Math.ceil(total / Number(limit)) };
};

const getEventById = async (id) => {
  const event = await Event.findById(id).populate('coordinators', 'name email');
  if (!event) throw new AppError('Event not found', 404, 'EVENT_NOT_FOUND');
  return event;
};

const createEvent = async (data) => {
  return await Event.create(data);
};

const updateEvent = async (id, data) => {
  const event = await Event.findByIdAndUpdate(id, data, { new: true, runValidators: true });
  if (!event) throw new AppError('Event not found', 404, 'EVENT_NOT_FOUND');
  return event;
};

const deleteEvent = async (id) => {
  const event = await Event.findByIdAndDelete(id);
  if (!event) throw new AppError('Event not found', 404, 'EVENT_NOT_FOUND');
};

const toggleRegistration = async (id, isOpen) => {
  const event = await Event.findByIdAndUpdate(id, { isRegistrationOpen: isOpen }, { new: true });
  if (!event) throw new AppError('Event not found', 404, 'EVENT_NOT_FOUND');
  return event;
};

module.exports = { getAllEvents, getEventById, createEvent, updateEvent, deleteEvent, toggleRegistration };
