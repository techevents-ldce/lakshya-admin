const mongoose = require('mongoose');

const referralCodeMappingSchema = new mongoose.Schema(
  {
    referralCode: { type: String, required: true, trim: true },
    normalizedReferralCode: { type: String, required: true, trim: true, uppercase: true },
    caName: { type: String, required: true, trim: true },
    caEmail: { type: String, trim: true, default: '' },
    caPhone: { type: String, trim: true, default: '' },
    notes: { type: String, trim: true, default: '' },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

referralCodeMappingSchema.index({ normalizedReferralCode: 1 }, { unique: true });

module.exports = mongoose.model('ReferralCodeMapping', referralCodeMappingSchema);
