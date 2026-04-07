const mongoose = require('mongoose');

const emailCampaignSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    subject: { type: String, required: true, trim: true },

    // Provider is always 'ses' for campaigns — Resend is NOT used here
    provider: { type: String, default: 'ses', enum: ['ses'], immutable: true },

    fromName: {
      type: String,
      required: true,
      default: function () { return process.env.SES_FROM_NAME || 'Lakshya 2026'; },
    },
    fromEmail: {
      type: String,
      required: true,
      default: function () { return process.env.SES_FROM_EMAIL || 'updates@contact.lakshyaldce.in'; },
    },
    replyTo: { type: String, default: 'contact@lakshyaldce.in' },

    // Optional ref to a saved EmailTemplate (for tracking; content is always copied in)
    templateId: { type: mongoose.Schema.Types.ObjectId, ref: 'EmailTemplate', default: null },

    htmlContent: { type: String, required: true },
    textContent: { type: String, default: '' },

    audienceType: {
      type: String,
      enum: ['db_filter', 'csv_upload', 'mixed'],
      required: true,
    },
    // Flexible audience config — structure depends on audienceType
    // db_filter: { filter: 'all_users'|'paid_users'|..., eventId, college, branch, year }
    // csv_upload: { recipients: [{ email, name, college, ... }] }
    audienceConfig: { type: mongoose.Schema.Types.Mixed, default: {} },

    // Stats — synced from EmailCampaignRecipient aggregation
    totalRecipients:    { type: Number, default: 0 },
    sentCount:          { type: Number, default: 0 },
    failedCount:        { type: Number, default: 0 },
    bouncedCount:       { type: Number, default: 0 },
    complainedCount:    { type: Number, default: 0 },
    unsubscribedCount:  { type: Number, default: 0 },
    suppressedCount:    { type: Number, default: 0 },

    status: {
      type: String,
      enum: ['draft', 'queued', 'processing', 'paused', 'completed', 'completed_with_failures', 'failed', 'cancelled'],
      default: 'draft',
    },

    scheduledAt:  { type: Date, default: null },
    startedAt:    { type: Date, default: null },
    completedAt:  { type: Date, default: null },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

    // Configurable per-campaign worker settings (0 = use env defaults)
    batchSize:    { type: Number, default: 0 },
    concurrency:  { type: Number, default: 0 },
    batchDelayMs: { type: Number, default: 0 },
  },
  { timestamps: true }
);

emailCampaignSchema.index({ createdAt: -1 });
emailCampaignSchema.index({ status: 1 });
emailCampaignSchema.index({ scheduledAt: 1 });
emailCampaignSchema.index({ createdBy: 1 });

module.exports = mongoose.model('EmailCampaign', emailCampaignSchema);
