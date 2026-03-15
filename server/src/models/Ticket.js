const mongoose = require('mongoose');

const ticketSchema = new mongoose.Schema(
  {
    ticketId: { type: String, required: true, unique: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
    qrData: { type: String, required: true }, // Base64 QR image or raw QR string
    status: {
      type: String,
      enum: ['valid', 'used', 'cancelled'],
      default: 'valid',
    },
    scannedAt: { type: Date },
    scannedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

ticketSchema.index({ ticketId: 1 });
ticketSchema.index({ userId: 1, eventId: 1 });

module.exports = mongoose.model('Ticket', ticketSchema);
