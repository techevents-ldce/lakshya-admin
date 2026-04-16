const mongoose = require('mongoose');

const ticketSchema = new mongoose.Schema(
  {
    ticketId: { type: String, required: true, unique: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
    registrationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Registration', default: null },
    teamId: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', default: null },
    qrData: { type: String, required: true }, // Base64 QR image or raw QR string
    status: {
      type: String,
      enum: ['valid', 'used', 'cancelled'],
      default: 'valid',
    },
    scannedAt: { type: Date },
    scannedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true, strict: false }
);

// Unique compound index — one ticket per user per event.
// Run dedup_tickets.js BEFORE deploying if duplicates exist in production.
ticketSchema.index({ userId: 1, eventId: 1 }, { unique: true });
ticketSchema.index({ registrationId: 1 });

module.exports = mongoose.model('Ticket', ticketSchema);
