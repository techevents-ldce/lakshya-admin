const User = require('../models/User');
const { hashPassword } = require('../utils/password');
const AppError = require('../middleware/AppError');

const getUsers = async (query = {}, viewer = null) => {
  const { page = 1, limit = 20, search, role, isActive } = query;
  const filter = {};
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
      { phone: { $regex: search, $options: 'i' } },
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

const getUserDetail = async (id) => {
  const user = await User.findById(id).populate('assignedEvents').lean();
  if (!user) throw new AppError('User not found', 404, 'USER_NOT_FOUND');

  const Registration = require('../models/Registration');
  const Ticket = require('../models/Ticket');

  const [registrations, tickets] = await Promise.all([
    Registration.find({ userId: id })
      .populate('eventId', 'title slug eventType')
      .populate('teamId', 'teamName')
      .sort({ createdAt: -1 })
      .lean(),
    Ticket.find({ userId: id })
      .populate('eventId', 'title slug')
      .sort({ createdAt: -1 })
      .lean(),
  ]);

  // Try to load orders (collection may not exist yet)
  let orders = [];
  try {
    const Order = require('../models/Order');
    orders = await Order.find({ userId: id })
      .sort({ createdAt: -1 })
      .lean();
  } catch {
    // orders collection may not exist — that's fine
  }

  return { ...user, registrations, tickets, orders };
};

const { writeAuditLog } = require('../middleware/auditLog');

const deactivateUser = async (userId, adminId, reqMeta = {}) => {
  const user = await User.findById(userId);
  if (!user) throw new AppError('User not found', 404, 'USER_NOT_FOUND');

  const before = { isActive: user.isActive };
  user.isActive = false;
  await user.save();

  await writeAuditLog({
    adminId,
    action: 'DEACTIVATE_USER',
    entityType: 'User',
    entityId: user._id,
    before,
    after: { isActive: false },
    ip: reqMeta.ip,
    userAgent: reqMeta.userAgent,
  });

  return user;
};

const deleteUser = async (userId, adminId, reqMeta = {}) => {
  const user = await User.findById(userId);
  if (!user) throw new AppError('User not found', 404, 'USER_NOT_FOUND');

  // Prevent deleting the last superadmin
  if (user.role === 'superadmin') {
    const superadminCount = await User.countDocuments({ role: 'superadmin' });
    if (superadminCount <= 1) {
      throw new AppError('Cannot delete the last superadmin', 400, 'DELETE_LAST_SUPERADMIN');
    }
  }

  const Registration = require('../models/Registration');
  const Ticket = require('../models/Ticket');
  const TeamMember = require('../models/TeamMember');
  const Event = require('../models/Event');

  // Cleanup related data
  // 1. Remove from all event coordinators list
  await Event.updateMany(
    { coordinators: userId },
    { $pull: { coordinators: userId } }
  );

  // 2. Delete registrations
  await Registration.deleteMany({ userId });

  // 3. Delete tickets
  await Ticket.deleteMany({ userId });

  // 4. Delete team memberships
  await TeamMember.deleteMany({ userId });

  // Write audit log before deleting the user
  await writeAuditLog({
    adminId,
    action: 'DELETE_USER',
    entityType: 'User',
    entityId: user._id,
    before: user.toObject(),
    after: null,
    ip: reqMeta.ip,
    userAgent: reqMeta.userAgent,
  });

  // Finally, delete the user
  await User.findByIdAndDelete(userId);

  return { message: 'User and related data deleted successfully' };
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
  getUserDetail,
  deactivateUser,
  deleteUser,
};
