const mongoose = require('mongoose');

const paymentAuditLogSchema = new mongoose.Schema(
  {
    log_id: { type: String, required: true, unique: true, trim: true },
    order_id: { type: String, required: true, trim: true },
    payment_id: { type: String, default: null, trim: true },
    request_payload: { type: mongoose.Schema.Types.Mixed, default: null },
    response_payload: { type: mongoose.Schema.Types.Mixed, default: null },
    status: {
      type: String,
      enum: ['PENDING', 'SUCCESS', 'FAILED', 'ERROR'],
      default: 'PENDING',
    },
    fetch_payment_details_request: { type: mongoose.Schema.Types.Mixed, default: null },
    fetch_payment_details_response: { type: mongoose.Schema.Types.Mixed, default: null },
  },
  { timestamps: true }
);

paymentAuditLogSchema.index({ order_id: 1 });
paymentAuditLogSchema.index({ payment_id: 1 });
paymentAuditLogSchema.index({ status: 1 });
paymentAuditLogSchema.index({ createdAt: -1 });

module.exports = mongoose.model('PaymentAuditLog', paymentAuditLogSchema);
