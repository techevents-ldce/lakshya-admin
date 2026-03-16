const User = require('../models/User');
const { hashPassword } = require('../utils/password');
const AppError = require('../middleware/AppError');

const getUsers = async (query = {}) => {
  const { page = 1, limit = 20, search, role, isActive } = query;
  const filter = {};
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
    ];
  }
  if (role) filter.role = role;
  if (isActive !== undefined) filter.isActive = isActive === 'true';

  const skip = (Number(page) - 1) * Number(limit);
  const [users, total] = await Promise.all([
    User.find(filter).skip(skip).limit(Number(limit)).sort({ createdAt: -1 }),
    User.countDocuments(filter),
  ]);
  return { users, total, page: Number(page), pages: Math.ceil(total / Number(limit)) };
};

const getUserById = async (id) => {
  const user = await User.findById(id).populate('assignedEvents');
  if (!user) throw new AppError('User not found', 404, 'USER_NOT_FOUND');
  return user;
};

const createCoordinator = async (data) => {
  const existing = await User.findOne({ email: data.email });
  if (existing) throw new AppError('This email address is already registered', 409, 'USER_EMAIL_EXISTS');
  const passwordHash = await hashPassword(data.password);
  return await User.create({ ...data, passwordHash, role: 'coordinator' });
};

const updateUser = async (id, data) => {
  const user = await User.findByIdAndUpdate(id, data, { new: true, runValidators: true });
  if (!user) throw new AppError('User not found', 404, 'USER_NOT_FOUND');
  return user;
};

const blockUser = async (id) => {
  const user = await User.findByIdAndUpdate(id, { isActive: false }, { new: true });
  if (!user) throw new AppError('User not found', 404, 'USER_NOT_FOUND');
  return user;
};

const unblockUser = async (id) => {
  const user = await User.findByIdAndUpdate(id, { isActive: true }, { new: true });
  if (!user) throw new AppError('User not found', 404, 'USER_NOT_FOUND');
  return user;
};

const assignEventsToCoordinator = async (coordinatorId, eventIds) => {
  const Event = require('../models/Event');

  // Remove coordinator from ALL events first (clean slate)
  await Event.updateMany(
    { coordinators: coordinatorId },
    { $pull: { coordinators: coordinatorId } }
  );

  // Add coordinator to the newly selected events
  if (eventIds.length > 0) {
    await Event.updateMany(
      { _id: { $in: eventIds } },
      { $addToSet: { coordinators: coordinatorId } }
    );
  }

  // Update the user's assignedEvents list
  const user = await User.findByIdAndUpdate(
    coordinatorId,
    { assignedEvents: eventIds },
    { new: true }
  ).populate('assignedEvents');
  if (!user) throw new AppError('Coordinator not found', 404, 'COORDINATOR_NOT_FOUND');
  return user;
};

const resetUserPassword = async (userId, newPassword) => {
  const passwordHash = await hashPassword(newPassword);
  const user = await User.findByIdAndUpdate(userId, { passwordHash }, { new: true });
  if (!user) throw new AppError('User not found', 404, 'USER_NOT_FOUND');
};

module.exports = {
  getUsers,
  getUserById,
  createCoordinator,
  updateUser,
  blockUser,
  unblockUser,
  assignEventsToCoordinator,
  resetUserPassword,
};
