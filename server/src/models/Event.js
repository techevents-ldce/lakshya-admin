const mongoose = require('mongoose');
const slugify = require('../utils/slugify');

const eventSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, unique: true, lowercase: true },
    description: { type: String },
    category: { type: String, trim: true },
    eventType: { type: String, enum: ['solo', 'team'], default: 'solo' },
    capacity: { type: Number, default: 100 },
    registrationFee: { type: Number, default: 0 },
    isPaid: { type: Boolean, default: false },
    teamSizeMin: { type: Number, default: 1 },
    teamSizeMax: { type: Number, default: 1 },
    registrationDeadline: { type: Date },
    isRegistrationOpen: { type: Boolean, default: true },
    venue: { type: String, trim: true },
    eventDate: { type: Date },
    coordinators: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    banner: { type: String },
  },
  { timestamps: true }
);

eventSchema.pre('save', function (next) {
  if (this.isModified('title')) {
    this.slug = slugify(this.title);
  }
  next();
});

eventSchema.index({ category: 1 });

module.exports = mongoose.model('Event', eventSchema);
