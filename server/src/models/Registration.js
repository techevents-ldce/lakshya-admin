const mongoose = require('mongoose');

const registrationSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
    teamId: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', default: null },
    registrationData: { type: Map, of: mongoose.Schema.Types.Mixed, default: {} },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'cancelled', 'waitlisted'],
      default: 'pending',
    },
  },
  { timestamps: true }
);

registrationSchema.index({ userId: 1, eventId: 1 }, { unique: true });
registrationSchema.index({ eventId: 1 });

module.exports = mongoose.model('Registration', registrationSchema);
