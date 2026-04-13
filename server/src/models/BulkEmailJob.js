const mongoose = require('mongoose');

const bulkEmailJobSchema = new mongoose.Schema(
  {
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    senderIdentity: {
      type: String,
      required: true,
      enum: ['updates', 'events', 'tarkshaastra'],
      default: 'updates',
    },
    subject: { type: String, required: true },
    body: { 
      type: String, 
      required: function() { return this.template !== 'club' && this.template !== 'team_login'; } 
    },
    template: {
      type: String,
      enum: ['raw', 'success', 'congratulations', 'important', 'formal', 'marketing', 'club', 'team_login'],
      default: 'raw',
    },
    totalRecipients: { type: Number, required: true, default: 0 },
    completedCount: { type: Number, default: 0 },
    failedCount: { type: Number, default: 0 },
    pendingCount: { type: Number, default: 0 },
    processingCount: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ['queued', 'processing', 'completed', 'completed_with_failures', 'failed', 'cancelled'],
      default: 'queued',
    },
    sourceType: {
      type: String,
      enum: ['manual_selection', 'excel_upload'],
      default: 'manual_selection',
    },
    // Configurable per-job settings (fall back to env defaults in the worker)
    batchSize: { type: Number, default: 0 },       // 0 = use env default
    concurrency: { type: Number, default: 0 },      // 0 = use env default
    batchDelayMs: { type: Number, default: 0 },     // 0 = use env default
  },
  { timestamps: true }
);

// Index for listing jobs (newest first) and finding active jobs
bulkEmailJobSchema.index({ createdAt: -1 });
bulkEmailJobSchema.index({ status: 1 });

module.exports = mongoose.model('BulkEmailJob', bulkEmailJobSchema);
