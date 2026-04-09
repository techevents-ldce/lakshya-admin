const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema(
  {
    transaction_id: { type: String, required: true, unique: true, trim: true },
    razorpay_order_id: { type: String, index: true, trim: true },
    razorpay_payment_id: { type: String, trim: true },
    razorpay_signature: { type: String, trim: true },
    amount: { type: Number, required: true },
    currency: { type: String, default: 'INR', trim: true },
    status: {
      type: String,
      enum: ['PENDING', 'SUCCESS', 'FAILED'],
      default: 'PENDING',
    },
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    event_ids: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Event' }],
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  }
);

module.exports = mongoose.model('Transaction', transactionSchema);
