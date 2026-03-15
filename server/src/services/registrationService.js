const Registration = require('../models/Registration');
const Team = require('../models/Team');
const TeamMember = require('../models/TeamMember');
const Event = require('../models/Event');
const Ticket = require('../models/Ticket');
const Payment = require('../models/Payment');
const AppError = require('../middleware/AppError');
const { v4: uuidv4 } = require('uuid');
const QRCode = require('qrcode');

const getRegistrations = async (query = {}) => {
  const { page = 1, limit = 20, eventId, status, search } = query;
  const filter = {};
  if (eventId) filter.eventId = eventId;
  if (status) filter.status = status;

  const skip = (Number(page) - 1) * Number(limit);
  const [registrations, total] = await Promise.all([
    Registration.find(filter)
      .skip(skip)
      .limit(Number(limit))
      .sort({ createdAt: -1 })
      .populate('userId', 'name email phone college branch year')
      .populate('eventId', 'title slug eventType registrationFee isPaid'),
    Registration.countDocuments(filter),
  ]);
  return { registrations, total, page: Number(page), pages: Math.ceil(total / Number(limit)) };
};

const getRegistrationById = async (id) => {
  const reg = await Registration.findById(id)
    .populate('userId', 'name email phone college branch year')
    .populate('eventId', 'title slug')
    .populate('teamId');
  if (!reg) throw new AppError('Registration not found', 404, 'REGISTRATION_NOT_FOUND');
  return reg;
};

const register = async ({ userId, eventId, teamName, registrationData }) => {
  const event = await Event.findById(eventId);
  if (!event) throw new AppError('Event not found', 404, 'EVENT_NOT_FOUND');
  if (!event.isRegistrationOpen) throw new AppError('Registration is closed for this event', 400, 'REGISTRATION_CLOSED');

  const existing = await Registration.findOne({ userId, eventId });
  if (existing) throw new AppError('You are already registered for this event', 409, 'ALREADY_REGISTERED');

  // Check capacity
  const count = await Registration.countDocuments({ eventId, status: { $ne: 'cancelled' } });
  if (count >= event.capacity) throw new AppError('This event is at full capacity. No more registrations can be accepted.', 400, 'EVENT_FULL');

  let teamId = null;
  if (event.eventType === 'team') {
    const team = await Team.create({ eventId, leaderId: userId, teamName: teamName || `Team-${userId}` });
    await TeamMember.create({ teamId: team._id, userId, status: 'accepted' });
    teamId = team._id;
  }

  const registration = await Registration.create({
    userId,
    eventId,
    teamId,
    registrationData,
    status: event.isPaid ? 'pending' : 'confirmed',
  });

  // Generate ticket if event is free / immediately confirmed
  if (!event.isPaid) {
    const ticketId = uuidv4();
    const qrData = await QRCode.toDataURL(ticketId);
    await Ticket.create({ ticketId, userId, eventId, qrData });
    if (event.isPaid === false) {
      await Payment.create({ userId, eventId, amount: 0, status: 'completed' });
    }
  }

  return registration;
};

module.exports = { getRegistrations, getRegistrationById, register };
