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
  { timestamps: true, strict: false }
);

teamSchema.index({ eventId: 1 });
teamSchema.index({ leaderId: 1 });
// Compound index for fast leader+event team lookups.
// NOTE: uniqueness is enforced at application level (atomic upsert in hackathonService)
// rather than DB level, to avoid E11000 startup failure if historical duplicates exist.
// Run POST /teams/dedup to clean up any existing duplicate documents.
teamSchema.index({ eventId: 1, leaderId: 1 });

module.exports = mongoose.model('Team', teamSchema);
