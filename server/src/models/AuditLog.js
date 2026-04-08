const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema(
  {
    adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    action: { type: String, required: true },
    targetId: { type: mongoose.Schema.Types.Mixed }, // ObjectId or string
    targetModel: { type: String },
    entityType: { type: String }, // e.g. 'Order', 'Registration', 'Ticket'
    details: { type: String },
    before: { type: mongoose.Schema.Types.Mixed, default: null },
    after: { type: mongoose.Schema.Types.Mixed, default: null },
    ipAddress: { type: String },
    userAgent: { type: String },
  },
  { timestamps: true }
);

auditLogSchema.index({ adminId: 1 });
auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ entityType: 1, targetId: 1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
