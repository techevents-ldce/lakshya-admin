const mongoose = require('mongoose');

const bulkEmailRecipientSchema = new mongoose.Schema(
  {
    jobId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BulkEmailJob',
      required: true,
      index: true,
    },
    email: { type: String, required: true },
    name: { type: String, default: '' },
    college: { type: String, default: '' },
    department: { type: String, default: '' },
    clubName: { type: String, default: '' },
    status: {
      type: String,
      enum: ['pending', 'processing', 'sent', 'failed'],
      default: 'pending',
    },
    errorMessage: { type: String, default: '' },
    retryCount: { type: Number, default: 0 },
    sentAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// Compound index for efficient batch fetching by job + status
bulkEmailRecipientSchema.index({ jobId: 1, status: 1 });

module.exports = mongoose.model('BulkEmailRecipient', bulkEmailRecipientSchema);
