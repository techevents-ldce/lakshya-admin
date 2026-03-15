const mongoose = require('mongoose');

const teamMemberSchema = new mongoose.Schema(
  {
    teamId: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'rejected'],
      default: 'accepted',
    },
  },
  { timestamps: true }
);

teamMemberSchema.index({ teamId: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model('TeamMember', teamMemberSchema);
