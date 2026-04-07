const mongoose = require('mongoose');

const emailSuppressionSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    reason: {
      type: String,
      enum: ['unsubscribed', 'bounced', 'complained', 'manual', 'other'],
      required: true,
    },

    source: {
      type: String,
      enum: ['campaign', 'ses_feedback', 'admin', 'self'],
      default: 'admin',
    },

    campaignId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'EmailCampaign',
      default: null,
    },

    provider: { type: String, default: 'ses' },
    notes:    { type: String, default: '' },
  },
  { timestamps: true }
);

emailSuppressionSchema.index({ email: 1 }, { unique: true });
emailSuppressionSchema.index({ reason: 1 });
emailSuppressionSchema.index({ source: 1 });

module.exports = mongoose.model('EmailSuppression', emailSuppressionSchema);
