const mongoose = require('mongoose');

const emailTemplateSchema = new mongoose.Schema(
  {
    name:     { type: String, required: true, trim: true },
    slug:     { type: String, required: true, unique: true, lowercase: true, trim: true },

    category: {
      type: String,
      enum: ['announcement', 'reminder', 'result', 'invitation', 'general'],
      default: 'general',
    },

    subject: { type: String, required: true, trim: true },
    html:    { type: String, required: true },
    text:    { type: String, default: '' }, // Plain-text fallback

    // List of placeholder variable names this template uses, e.g. ['name', 'college', 'eventName']
    variables: [{ type: String }],

    // System templates are read-only (not deletable, not editable by non-super-admin)
    isSystem: { type: Boolean, default: false },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
);

emailTemplateSchema.index({ category: 1 });
emailTemplateSchema.index({ isSystem: 1 });
emailTemplateSchema.index({ slug: 1 }, { unique: true });

module.exports = mongoose.model('EmailTemplate', emailTemplateSchema);
