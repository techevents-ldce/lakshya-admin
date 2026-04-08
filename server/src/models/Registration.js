const mongoose = require('mongoose');

const registrationSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
    teamId: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', default: null },
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', default: null },
    registrationMode: { type: String, enum: ['individual', 'team'], default: 'individual' },
    memberCount: { type: Number, default: 1 },
    registrationData: { type: Map, of: mongoose.Schema.Types.Mixed, default: {} },
    pricingSnapshot: { type: mongoose.Schema.Types.Mixed, default: null },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'cancelled', 'waitlisted'],
      default: 'pending',
    },
    checkedIn: { type: Boolean, default: false },
    checkedInAt: { type: Date, default: null },
    checkedInBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    /** Set by fest portal checkout flow; used for referral analytics (source of truth for counts). */
    referralCodeUsed: { type: String, trim: true, uppercase: true, default: null },
  },
  { timestamps: true, strict: false }
);

registrationSchema.index({ userId: 1, eventId: 1 }, { unique: true });
registrationSchema.index({ eventId: 1, createdAt: -1 });
registrationSchema.index({ checkedIn: 1, eventId: 1 });
registrationSchema.index({ referralCodeUsed: 1 });
registrationSchema.index({ orderId: 1 });

module.exports = mongoose.model('Registration', registrationSchema);
