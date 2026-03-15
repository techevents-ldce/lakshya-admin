const Registration = require('../models/Registration');
const Payment = require('../models/Payment');
const { generateCSV, generateExcel } = require('../utils/export');
const AppError = require('../middleware/AppError');

const exportParticipants = async (eventId, format = 'csv') => {
  if (!eventId) {
    throw new AppError('Event ID is required to export participants', 400, 'MISSING_EVENT_ID');
  }

  const regs = await Registration.find({ eventId, status: { $ne: 'cancelled' } })
    .populate('userId', 'name email phone college branch year')
    .populate('teamId', 'teamName');

  if (!regs.length) {
    throw new AppError('No participants found for this event', 404, 'NO_PARTICIPANTS_FOUND');
  }

  const data = regs.map((r) => ({
    name: r.userId?.name || 'N/A',
    email: r.userId?.email || 'N/A',
    phone: r.userId?.phone || 'N/A',
    college: r.userId?.college || 'N/A',
    branch: r.userId?.branch || 'N/A',
    year: r.userId?.year || 'N/A',
    team: r.teamId?.teamName || 'N/A',
    status: r.status,
    registeredAt: r.createdAt?.toISOString().split('T')[0],
  }));

  if (format === 'excel') {
    const columns = [
      { header: 'Name', key: 'name', width: 25 },
      { header: 'Email', key: 'email', width: 30 },
      { header: 'Phone', key: 'phone', width: 15 },
      { header: 'College', key: 'college', width: 30 },
      { header: 'Branch', key: 'branch', width: 20 },
      { header: 'Year', key: 'year', width: 8 },
      { header: 'Team', key: 'team', width: 20 },
      { header: 'Status', key: 'status', width: 12 },
      { header: 'Registered At', key: 'registeredAt', width: 15 },
    ];
    return generateExcel(data, columns, 'Participants');
  }

  const fields = ['name', 'email', 'phone', 'college', 'branch', 'year', 'team', 'status', 'registeredAt'];
  return generateCSV(data, fields);
};

const exportPayments = async (eventId, format = 'csv') => {
  const query = eventId ? { eventId } : {};
  const payments = await Payment.find(query)
    .populate('userId', 'name email')
    .populate('eventId', 'title registrationFee');

  if (!payments.length) {
    throw new AppError('No payment records found', 404, 'NO_PAYMENTS_FOUND');
  }

  const data = payments.map((p) => ({
    participant: p.userId?.name || 'N/A',
    email: p.userId?.email || 'N/A',
    event: p.eventId?.title || 'N/A',
    amount: p.amount,
    status: p.status,
    transactionId: p.transactionId || 'N/A',
    date: p.createdAt?.toISOString().split('T')[0],
  }));

  if (format === 'excel') {
    const columns = [
      { header: 'Participant', key: 'participant', width: 25 },
      { header: 'Email', key: 'email', width: 30 },
      { header: 'Event', key: 'event', width: 25 },
      { header: 'Amount (₹)', key: 'amount', width: 12 },
      { header: 'Status', key: 'status', width: 12 },
      { header: 'Transaction ID', key: 'transactionId', width: 25 },
      { header: 'Date', key: 'date', width: 15 },
    ];
    return generateExcel(data, columns, 'Payments');
  }

  const fields = ['participant', 'email', 'event', 'amount', 'status', 'transactionId', 'date'];
  return generateCSV(data, fields);
};

module.exports = { exportParticipants, exportPayments };
