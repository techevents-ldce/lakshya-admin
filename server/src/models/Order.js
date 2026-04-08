const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema(
  {
    orderId: { type: String, unique: true, sparse: true }, // human-readable ID
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    itemsSnapshot: { type: [mongoose.Schema.Types.Mixed], default: [] }, // multi-event line items
    totalAmount: { type: Number, default: 0 },
    currency: { type: String, default: 'INR' },
    isFreeOrder: { type: Boolean, default: false },
    status: {
      type: String,
      enum: ['pending', 'payment_initiated', 'fulfilling', 'success', 'failed', 'cancelled', 'refunded'],
      default: 'pending',
    },
    // Razorpay references
    razorpayOrderId: { type: String, default: null },
    razorpayPaymentId: { type: String, default: null },
    // Audit / fulfillment timestamps
    verifiedAt: { type: Date, default: null },
    verificationSource: {
      type: String,
      enum: ['frontend_verify', 'razorpay_webhook', null],
      default: null,
    },
    fulfillmentStartedAt: { type: Date, default: null },
    fulfillmentCompletedAt: { type: Date, default: null },
    fulfillmentFailedAt: { type: Date, default: null },
    fulfillmentError: { type: String, default: null },
    registrationCreated: { type: Boolean, default: false },
    ticketGenerated: { type: Boolean, default: false },
    emailTriggered: { type: Boolean, default: false },
    // Linking
    registrationIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Registration' }],
  },
  { timestamps: true, strict: false }
);

// Indexes for efficient querying
orderSchema.index({ userId: 1, createdAt: -1 });
orderSchema.index({ status: 1, createdAt: -1 });
orderSchema.index({ razorpayOrderId: 1 });
orderSchema.index({ razorpayPaymentId: 1 });

module.exports = mongoose.model('Order', orderSchema, 'orders');
