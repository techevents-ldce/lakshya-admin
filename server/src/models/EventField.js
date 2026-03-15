const mongoose = require('mongoose');

const eventFieldSchema = new mongoose.Schema(
  {
    eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true, unique: true },
    fields: [
      {
        name: { type: String, required: true },
        label: { type: String, required: true },
        type: { type: String, enum: ['text', 'number', 'email', 'select', 'checkbox', 'date'], default: 'text' },
        required: { type: Boolean, default: false },
        options: [String], // for select fields
        placeholder: { type: String },
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model('EventField', eventFieldSchema);
