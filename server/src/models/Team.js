const mongoose = require('mongoose');

const teamSchema = new mongoose.Schema(
  {
    eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
    leaderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    teamName: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: ['active', 'disqualified', 'withdrawn'],
      default: 'active',
    },
  },
  { timestamps: true }
);

teamSchema.index({ eventId: 1 });
teamSchema.index({ leaderId: 1 });

module.exports = mongoose.model('Team', teamSchema);
