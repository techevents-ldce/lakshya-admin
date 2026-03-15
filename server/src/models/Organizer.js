const mongoose = require('mongoose');

const organizerSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true, trim: true },
    email: { type: String, trim: true, lowercase: true },
    team: { type: String, trim: true },
    image: { type: String },
    linkedinUrl: { type: String },
    githubUrl: { type: String },
    instagramUrl: { type: String },
    order: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

organizerSchema.index({ order: 1 });

module.exports = mongoose.model('Organizer', organizerSchema);
