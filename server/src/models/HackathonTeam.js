const mongoose = require('mongoose');

/**
 * HackathonTeam — isolated collection for hackathon import management.
 *
 * This collection is ADMIN-ONLY and is NEVER read by the Lakshya
 * registration portal. It stores import metadata and selection state
 * and links back to existing User / Team / Registration records.
 *
 * DB safety guarantee:
 *  - No changes to User, Event, Registration, Team, TeamMember, Order, Payment, or Ticket schemas.
 *  - The registration portal's payment gate reads Registration.status only —
 *    which we control here via promote/suspend/remove/restore actions.
 */
const hackathonTeamSchema = new mongoose.Schema(
  {
    // ── Hackathon Event reference ──────────────────────────────────────────
    eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },

    // ── Leader (linked User) ───────────────────────────────────────────────
    leaderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

    // ── Team info ─────────────────────────────────────────────────────────
    teamName:    { type: String, required: true, trim: true },
    collegeName: { type: String, trim: true, default: '' },

    // Raw leader info as imported (preserved for audit even if user pre-existed)
    leaderName:  { type: String, trim: true, default: '' },
    leaderPhone: { type: String, trim: true, default: '' },
    leaderEmail: { type: String, trim: true, lowercase: true, default: '' },

    // ── Team members (raw from Excel — all profile fields stored per person) ──
    members: [
      {
        name:       { type: String, trim: true,    default: '' },
        email:      { type: String, trim: true,    lowercase: true, default: '' },
        phone:      { type: String, trim: true,    default: '' },
        gender:     { type: String, trim: true,    default: '' },
        collegeName:{ type: String, trim: true,    default: '' },
        department: { type: String, trim: true,    default: '' },
        year:       { type: String, trim: true,    default: '' }, // stored as string ("1","2","3"…)
        linkedin:   { type: String, trim: true,    default: '' },
        github:     { type: String, trim: true,    default: '' },
        teamRole:   { type: String, trim: true,    default: 'member' }, // 'leader' | 'member'
        _id:        false,
      },
    ],

    // ── Linked existing records ────────────────────────────────────────────
    teamId:         { type: mongoose.Schema.Types.ObjectId, ref: 'Team',         default: null },
    registrationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Registration', default: null },

    // ── Hackathon-specific state ───────────────────────────────────────────
    selectionStatus: {
      type:    String,
      enum:    ['selected', 'waitlisted', 'suspended', 'removed'],
      default: 'selected',
    },
    /**
     * paymentEnabled mirrors whether Registration.status === 'pending'.
     * Kept in sync by the service on every state transition for fast filtering.
     * Source of truth is always Registration.status — this is just a cache.
     */
    paymentEnabled: { type: Boolean, default: true },

    // ── External / import metadata ─────────────────────────────────────────
    unstopTeamId: { type: String, trim: true, default: '' },
    importBatch:  { type: String, trim: true, default: '' },   // e.g. "2025-04-11T12:00"
    importedBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    importedAt:   { type: Date, default: Date.now },

    // Admin notes
    notes: { type: String, trim: true, default: '' },
  },
  {
    collection: 'hackathonteams',
    timestamps: true,
  }
);

// Prevent duplicate import for same leader + event
hackathonTeamSchema.index({ eventId: 1, leaderId: 1 }, { unique: true });
hackathonTeamSchema.index({ eventId: 1, selectionStatus: 1 });
hackathonTeamSchema.index({ importBatch: 1 });
hackathonTeamSchema.index({ leaderEmail: 1 });

module.exports = mongoose.model('HackathonTeam', hackathonTeamSchema);
