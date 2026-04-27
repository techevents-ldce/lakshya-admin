const mongoose = require('mongoose');

/**
 * IssuedCertificate
 * One document per successfully-sent certificate.
 * The `hash` field matches the steganographic signature embedded in the image.
 */
const issuedCertificateSchema = new mongoose.Schema(
  {
    // SHA-256 hex hash embedded in the certificate via steganography
    hash: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },

    // Participant details
    recipientName: { type: String, required: true, trim: true },
    recipientEmail: { type: String, required: true, lowercase: true, trim: true },

    // Optional context
    eventName: { type: String, trim: true, default: '' },

    // Who issued it (admin user id)
    issuedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false },

    // When was the email actually sent
    issuedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

module.exports = mongoose.model('IssuedCertificate', issuedCertificateSchema);
