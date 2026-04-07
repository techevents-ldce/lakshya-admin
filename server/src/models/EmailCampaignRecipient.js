const mongoose = require('mongoose');

const emailCampaignRecipientSchema = new mongoose.Schema(
  {
    campaignId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'EmailCampaign',
      required: true,
      index: true,
    },

    recipientEmail: { type: String, required: true, lowercase: true, trim: true },
    recipientName:  { type: String, default: '' },

    // Optional links to source records
    userId:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', default: null },

    // Placeholders for personalization — e.g. { name, college, eventName, teamName }
    placeholders: { type: mongoose.Schema.Types.Mixed, default: {} },

    status: {
      type: String,
      enum: ['pending', 'processing', 'sent', 'failed', 'bounced', 'complained', 'unsubscribed', 'suppressed'],
      default: 'pending',
    },

    provider: { type: String, default: 'ses' }, // Always 'ses' — never touches Resend

    providerMessageId: { type: String, default: '' }, // AWS SES MessageId
    failureReason:     { type: String, default: '' },
    bounceType:        { type: String, default: '' },
    complaintType:     { type: String, default: '' },
    retryCount:        { type: Number, default: 0 },

    sentAt:          { type: Date, default: null },
    deliveredAt:     { type: Date, default: null },
    unsubscribedAt:  { type: Date, default: null },
  },
  { timestamps: true }
);

// Compound index for efficient batch fetching by campaign + status
emailCampaignRecipientSchema.index({ campaignId: 1, status: 1 });
// Unique constraint: one entry per email per campaign
emailCampaignRecipientSchema.index({ recipientEmail: 1, campaignId: 1 }, { unique: true });

module.exports = mongoose.model('EmailCampaignRecipient', emailCampaignRecipientSchema);
