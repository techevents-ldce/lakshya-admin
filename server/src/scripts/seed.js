/**
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║  LAKSHYA ULTIMATE SEED SCRIPT                                           ║
 * ║  Creates production-like test data for every feature:                    ║
 * ║  Users · Events · Teams · Registrations · Payments · Tickets (QR)       ║
 * ║  Organizers · EventFields                                               ║
 * ║  Some tickets are pre-scanned so attendance / dashboard data work.       ║
 * ║                                                                         ║
 * ║  Run:  npm run seed                                                     ║
 * ║  Idempotent — re-running drops & recreates everything.                  ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
 */
require('dotenv').config();
const mongoose = require('mongoose');
const QRCode = require('qrcode');
const { v4: uuidv4 } = require('uuid');
const { hashPassword } = require('../utils/password');
const slugify = require('../utils/slugify');

// ── Models ──────────────────────────────────────────────────────────────────
const User = require('../models/User');
const Event = require('../models/Event');
const Team = require('../models/Team');
const TeamMember = require('../models/TeamMember');
const Registration = require('../models/Registration');
const Payment = require('../models/Payment');
const Ticket = require('../models/Ticket');
const EventField = require('../models/EventField');

// ── Helpers ─────────────────────────────────────────────────────────────────
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const daysFromNow = (n) => new Date(Date.now() + n * 86400000);
const daysAgo = (n) => new Date(Date.now() - n * 86400000);
const log = (emoji, msg) => console.log(`  ${emoji}  ${msg}`);
const section = (title) => {
  console.log();
  console.log(`  ╔${'═'.repeat(52)}╗`);
  console.log(`  ║  ${title.padEnd(50)}║`);
  console.log(`  ╚${'═'.repeat(52)}╝`);
};

// ── Data Pools ──────────────────────────────────────────────────────────────
const COLLEGES = [
  'LDCE', 'DAIICT', 'NIRMA', 'GTU', 'DDU', 'SVNIT', 'PDPU',
  'IIT Gandhinagar', 'CHARUSAT', 'Marwadi University',
];
const BRANCHES = [
  'Computer Engineering', 'Information Technology', 'Electronics & Communication',
  'Mechanical Engineering', 'Civil Engineering', 'Electrical Engineering',
  'AI & ML', 'Data Science', 'Cyber Security',
];
const FIRST = [
  'Aarav', 'Vivaan', 'Aditya', 'Arjun', 'Sai', 'Reyansh', 'Atharv',
  'Ananya', 'Diya', 'Myra', 'Sara', 'Aadhya', 'Isha', 'Riya',
  'Kavya', 'Nishant', 'Priya', 'Rohan', 'Sneha', 'Vikram',
  'Meera', 'Karan', 'Tanvi', 'Harsh', 'Pooja', 'Rahul', 'Dhruv',
  'Kriti', 'Yash', 'Simran',
];
const LAST = [
  'Patel', 'Shah', 'Sharma', 'Modi', 'Desai', 'Joshi', 'Mehta',
  'Chauhan', 'Parmar', 'Solanki', 'Raval', 'Dave', 'Trivedi',
  'Bhatt', 'Rao', 'Kumar', 'Singh', 'Gupta', 'Thakkar', 'Panchal',
];

const EVENTS = [
  { title: 'Code Clash',          category: 'Coding',          eventType: 'solo', capacity: 120, registrationFee: 0,   isPaid: false, description: 'Competitive programming contest with 3 rounds of increasing difficulty.',         venue: 'Lab 301' },
  { title: 'HackSprint',          category: 'Hackathon',       eventType: 'team', capacity: 200, registrationFee: 200, isPaid: true,  description: '24-hour hackathon to build innovative solutions for real-world problems.',       venue: 'Auditorium Hall', teamSizeMin: 2, teamSizeMax: 4 },
  { title: 'Quizathon',           category: 'Quiz',            eventType: 'solo', capacity: 80,  registrationFee: 50,  isPaid: true,  description: 'Ultimate tech quiz covering CS fundamentals, current affairs, and pop culture.',   venue: 'Seminar Hall A' },
  { title: 'RoboWars',            category: 'Robotics',        eventType: 'team', capacity: 60,  registrationFee: 500, isPaid: true,  description: 'Build and battle your robots in an arena combat tournament.',                     venue: 'Main Ground', teamSizeMin: 3, teamSizeMax: 5 },
  { title: 'UI/UX Design Sprint', category: 'Design',          eventType: 'solo', capacity: 50,  registrationFee: 100, isPaid: true,  description: 'Design the best user interface for a given problem statement in 6 hours.',        venue: 'Lab 205' },
  { title: 'AI Workshop',         category: 'Workshop',        eventType: 'solo', capacity: 150, registrationFee: 0,   isPaid: false, description: 'Hands-on workshop on building ML models with TensorFlow and PyTorch.',            venue: 'Seminar Hall B' },
  { title: 'CTF Challenge',       category: 'Cybersecurity',   eventType: 'team', capacity: 100, registrationFee: 150, isPaid: true,  description: 'Capture the Flag — web, crypto, and forensics challenges.',                       venue: 'Lab 402', teamSizeMin: 2, teamSizeMax: 3 },
  { title: 'Startup Pitch',       category: 'Entrepreneurship',eventType: 'team', capacity: 40,  registrationFee: 300, isPaid: true,  description: 'Pitch your startup idea to a panel of investors and industry experts.',            venue: 'Conference Room', teamSizeMin: 2, teamSizeMax: 4 },
  { title: 'Web Weavers',         category: 'Web Dev',         eventType: 'team', capacity: 90,  registrationFee: 150, isPaid: true,  description: 'Build a fully functional responsive website within the given timeframe.',           venue: 'Lab 206', teamSizeMin: 2, teamSizeMax: 3 },
  { title: 'Game Jam',            category: 'Game Design',     eventType: 'team', capacity: 80,  registrationFee: 250, isPaid: true,  description: 'Create a game from scratch based on a secret theme revealed at the event start.', venue: 'Lab 302', teamSizeMin: 2, teamSizeMax: 4 },
  { title: 'Tech Debate',         category: 'Debate',          eventType: 'solo', capacity: 40,  registrationFee: 50,  isPaid: true,  description: 'Debate on the latest technological advancements and ethical dilemmas.',            venue: 'Seminar Hall C' },
  { title: 'IoT Showcase',        category: 'Exhibition',      eventType: 'team', capacity: 50,  registrationFee: 0,   isPaid: false, description: 'Exhibition of innovative Internet of Things projects by students.',                  venue: 'Main Foyer', teamSizeMin: 2, teamSizeMax: 5 },
  { title: 'Data Science Quest',  category: 'Data Science',    eventType: 'solo', capacity: 100, registrationFee: 100, isPaid: true,  description: 'Analyze the given dataset and pull insights to solve real-world problems.',        venue: 'Lab 405' },
];

const TEAM_NAMES = [
  'Byte Force', 'Code Ninjas', 'Tech Titans', 'Binary Brains',
  'Pixel Pirates', 'Data Dragons', 'Cyber Wolves', 'Algo Aces',
  'Hack Hawks', 'Neural Nodes', 'Bug Busters', 'Stack Overflowers',
  'Quantum Coders', 'Git Pushers', 'Exception Handlers', 'Zero Index',
  'Hash Mappers', 'Async Avengers', 'Debug Demons', 'Compile Crew',
];

const PAY_METHODS = ['UPI', 'Card', 'Net Banking', 'UPI', 'UPI', 'Cash'];

// ═══════════════════════════════════════════════════════════════════════════
//  MAIN SEED FUNCTION
// ═══════════════════════════════════════════════════════════════════════════
const seed = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('\n  ✅ Connected to MongoDB');

  // ── Wipe everything ────────────────────────────────────────────────────
  section('CLEANING DATABASE');
  await Promise.all([
    User.deleteMany({}),
    Event.deleteMany({}),
    Team.deleteMany({}),
    TeamMember.deleteMany({}),
    Registration.deleteMany({}),
    Payment.deleteMany({}),
    Ticket.deleteMany({}),
    EventField.deleteMany({}),
  ]);
  log('🗑️', 'All collections cleared');

  // ╔═══════════════════════════════════════════════════════════════════════╗
  // ║  1. USERS  (admin + coordinator + 30 participants)                  ║
  // ╚═══════════════════════════════════════════════════════════════════════╝
  section('1. CREATING USERS');

  const sharedHash = await hashPassword('User@1234');
  const adminHash = await hashPassword(process.env.SEED_ADMIN_PASSWORD || 'Admin@1234');
  const coordHash = await hashPassword(process.env.SEED_COORD_PASSWORD || 'Coord@1234');

  const adminUser = await User.create({
    name: 'Lakshya Admin',
    email: process.env.SEED_ADMIN_EMAIL || 'admin@lakshya.com',
    passwordHash: adminHash,
    role: 'admin',
    isActive: true,
  });
  log('👑', `Admin  → ${adminUser.email} / ${process.env.SEED_ADMIN_PASSWORD || 'Admin@1234'}`);

  const coordUser = await User.create({
    name: 'Lakshya Coordinator',
    email: process.env.SEED_COORD_EMAIL || 'coordinator@lakshya.com',
    passwordHash: coordHash,
    role: 'coordinator',
    isActive: true,
  });
  log('🎯', `Coord  → ${coordUser.email} / ${process.env.SEED_COORD_PASSWORD || 'Coord@1234'}`);

  // Participants
  const participantDocs = [];
  for (let i = 0; i < 30; i++) {
    const first = FIRST[i % FIRST.length];
    const last = LAST[i % LAST.length];
    participantDocs.push({
      name: `${first} ${last}`,
      email: `${first.toLowerCase()}.${last.toLowerCase()}${i}@example.com`,
      phone: `9${randomInt(100000000, 999999999)}`,
      college: pick(COLLEGES),
      branch: pick(BRANCHES),
      year: randomInt(1, 4),
      passwordHash: sharedHash,
      role: 'participant',
      isActive: true,
      createdAt: daysAgo(randomInt(1, 30)),
    });
  }
  const users = await User.insertMany(participantDocs);
  log('👥', `${users.length} participants created (password: User@1234)`);

  // ╔═══════════════════════════════════════════════════════════════════════╗
  // ║  2. EVENTS  (created one-by-one so pre-save slug hook triggers)     ║
  // ╚═══════════════════════════════════════════════════════════════════════╝
  section('2. CREATING EVENTS');

  const events = [];
  for (const ev of EVENTS) {
    const doc = new Event({
      ...ev,
      slug: slugify(ev.title),
      registrationDeadline: daysFromNow(15),
      isRegistrationOpen: true,
      eventDate: daysFromNow(randomInt(20, 40)),
      coordinators: [coordUser._id],
    });
    await doc.save();
    events.push(doc);
    log('📅', `Event: ${doc.title} (${doc.eventType})`);
  }

  // Assign all events to coordinator
  await User.findByIdAndUpdate(coordUser._id, { assignedEvents: events.map((e) => e._id) });
  log('🔗', 'All events assigned to coordinator');

  const soloEvents = events.filter((e) => e.eventType === 'solo');
  const teamEvents = events.filter((e) => e.eventType === 'team');

  // ╔═══════════════════════════════════════════════════════════════════════╗
  // ║  3. REGISTRATIONS (solo events — 8-15 per event)                    ║
  // ╚═══════════════════════════════════════════════════════════════════════╝
  section('3. CREATING SOLO REGISTRATIONS');

  const allRegistrations = [];
  const usedPairs = new Set();
  const REG_STATUSES = ['confirmed', 'confirmed', 'confirmed', 'confirmed', 'pending', 'cancelled', 'waitlisted'];

  for (const event of soloEvents) {
    const count = randomInt(8, Math.min(15, users.length));
    const shuffled = [...users].sort(() => Math.random() - 0.5).slice(0, count);
    for (const user of shuffled) {
      const key = `${user._id}-${event._id}`;
      if (usedPairs.has(key)) continue;
      usedPairs.add(key);
      allRegistrations.push({
        userId: user._id,
        eventId: event._id,
        status: pick(REG_STATUSES),
        registrationData: {},
        createdAt: daysAgo(randomInt(1, 20)),
      });
    }
  }
  log('📝', `${allRegistrations.length} solo registrations queued`);

  // ╔═══════════════════════════════════════════════════════════════════════╗
  // ║  4. TEAMS + TEAM MEMBERS + TEAM REGISTRATIONS                       ║
  // ╚═══════════════════════════════════════════════════════════════════════╝
  section('4. CREATING TEAMS & TEAM REGISTRATIONS');

  const allTeamDocs = [];
  const allMemberDocs = [];
  let teamNameIdx = 0;

  for (const event of teamEvents) {
    const teamSize = randomInt(event.teamSizeMin || 2, event.teamSizeMax || 4);
    const numTeams = randomInt(3, 5);
    const pool = [...users].sort(() => Math.random() - 0.5);
    let poolIdx = 0;

    for (let t = 0; t < numTeams && poolIdx + teamSize <= pool.length; t++) {
      const teamMembers = pool.slice(poolIdx, poolIdx + teamSize);
      poolIdx += teamSize;
      const leader = teamMembers[0];
      const teamName = TEAM_NAMES[teamNameIdx % TEAM_NAMES.length];
      teamNameIdx++;

      const teamId = new mongoose.Types.ObjectId();

      allTeamDocs.push({
        _id: teamId,
        eventId: event._id,
        leaderId: leader._id,
        teamName,
        status: 'active',
      });

      // Register every team member + add them as TeamMember
      for (const member of teamMembers) {
        const key = `${member._id}-${event._id}`;
        if (!usedPairs.has(key)) {
          usedPairs.add(key);
          allRegistrations.push({
            userId: member._id,
            eventId: event._id,
            teamId,
            status: pick(REG_STATUSES),
            registrationData: {},
            createdAt: daysAgo(randomInt(1, 20)),
          });
        }
        allMemberDocs.push({
          teamId,
          userId: member._id,
          status: 'accepted',
        });
      }
    }
  }

  if (allTeamDocs.length > 0) {
    await Team.insertMany(allTeamDocs);
    log('🏆', `${allTeamDocs.length} teams created`);
  }

  if (allMemberDocs.length > 0) {
    await TeamMember.insertMany(allMemberDocs);
    log('👤', `${allMemberDocs.length} team members linked`);
  }

  // Insert ALL registrations (solo + team)
  if (allRegistrations.length > 0) {
    try {
      await Registration.insertMany(allRegistrations, { ordered: false });
    } catch (err) {
      // BulkWriteError — some duplicates skipped, that's fine
    }
  }
  const regCount = await Registration.countDocuments();
  log('📋', `${regCount} total registrations inserted`);

  // ╔═══════════════════════════════════════════════════════════════════════╗
  // ║  5. PAYMENTS  (for paid-event confirmed/pending registrations)      ║
  // ╚═══════════════════════════════════════════════════════════════════════╝
  section('5. CREATING PAYMENTS');

  const paidEventIds = events.filter((e) => e.isPaid).map((e) => e._id);
  const paidRegs = await Registration.find({
    eventId: { $in: paidEventIds },
    status: { $in: ['confirmed', 'pending', 'waitlisted'] },
  });

  const PAY_STATUSES = ['completed', 'completed', 'completed', 'completed', 'pending', 'failed', 'refunded'];
  const paymentDocs = [];

  for (const reg of paidRegs) {
    const event = events.find((e) => e._id.toString() === reg.eventId.toString());
    const status = pick(PAY_STATUSES);
    const day = randomInt(1, 20);
    paymentDocs.push({
      userId: reg.userId,
      eventId: reg.eventId,
      amount: event?.registrationFee || 0,
      status,
      transactionId: `TXN-${uuidv4().slice(0, 12).toUpperCase()}`,
      paymentMethod: pick(PAY_METHODS),
      verifiedAt: status === 'completed' ? daysAgo(day) : undefined,
      verifiedBy: status === 'completed' ? adminUser._id : undefined,
      notes: status === 'refunded' ? 'Refund processed' : undefined,
      createdAt: daysAgo(day),
    });
  }

  if (paymentDocs.length > 0) {
    try {
      await Payment.insertMany(paymentDocs, { ordered: false });
    } catch (err) {
      // skip duplicates
    }
  }
  const payCount = await Payment.countDocuments();
  log('💰', `${payCount} payments created`);

  // ╔═══════════════════════════════════════════════════════════════════════╗
  // ║  6. TICKETS WITH QR CODES                                           ║
  // ║  ~30% "used" (pre-scanned), ~10% "cancelled", ~60% "valid"         ║
  // ╚═══════════════════════════════════════════════════════════════════════╝
  section('6. CREATING TICKETS + QR CODES');

  const confirmedRegs = await Registration.find({ status: 'confirmed' });
  log('🔍', `Found ${confirmedRegs.length} confirmed registrations to ticket`);

  const ticketDocs = [];
  for (const reg of confirmedRegs) {
    const ticketId = `LKY-${uuidv4().slice(0, 8).toUpperCase()}`;
    const roll = Math.random();
    let status = 'valid';
    let scannedAt = undefined;
    let scannedBy = undefined;

    if (roll < 0.30) {
      status = 'used';
      scannedAt = daysAgo(randomInt(0, 5));
      scannedBy = coordUser._id;
    } else if (roll < 0.40) {
      status = 'cancelled';
    }

    // Generate actual QR code (Base64 PNG)
    const qrData = await QRCode.toDataURL(ticketId, { width: 300, margin: 2 });

    ticketDocs.push({
      ticketId,
      userId: reg.userId,
      eventId: reg.eventId,
      qrData,
      status,
      scannedAt,
      scannedBy,
      createdAt: daysAgo(randomInt(1, 15)),
    });
  }

  if (ticketDocs.length > 0) {
    try {
      await Ticket.insertMany(ticketDocs, { ordered: false });
    } catch (err) {
      // skip duplicates
    }
  }
  const tkCount = await Ticket.countDocuments();
  log('🎟️', `${tkCount} tickets created with QR codes`);

  // Mark checkedIn on Registration for "used" tickets
  const usedTickets = ticketDocs.filter((t) => t.status === 'used');
  let checkedInCount = 0;
  for (const t of usedTickets) {
    await Registration.findOneAndUpdate(
      { userId: t.userId, eventId: t.eventId },
      { checkedIn: true, checkedInAt: t.scannedAt, checkedInBy: t.scannedBy }
    );
    checkedInCount++;
  }
  log('✅', `${checkedInCount} registrations marked as checked-in`);


  // ╔═══════════════════════════════════════════════════════════════════════╗
  // ║  8. EVENT FIELDS (custom registration forms)                        ║
  // ╚═══════════════════════════════════════════════════════════════════════╝
  section('8. CREATING EVENT FIELDS');

  const eventFields = [
    {
      eventId: events[0]._id, // Code Clash
      fields: [
        { name: 'preferredLanguage', label: 'Preferred Language', type: 'select', required: true, options: ['C++', 'Java', 'Python', 'JavaScript'], placeholder: '' },
        { name: 'experience', label: 'Competitive Programming Experience', type: 'select', required: false, options: ['Beginner', 'Intermediate', 'Advanced'], placeholder: '' },
      ],
    },
    {
      eventId: events[1]._id, // HackSprint
      fields: [
        { name: 'githubProfile', label: 'GitHub Profile', type: 'text', required: false, placeholder: 'https://github.com/username' },
        { name: 'projectIdea', label: 'Brief Project Idea', type: 'text', required: true, placeholder: 'Describe your idea in 1-2 lines' },
      ],
    },
  ];
  await EventField.insertMany(eventFields);
  log('📋', `${eventFields.length} custom event fields created`);

  // ╔═══════════════════════════════════════════════════════════════════════╗
  // ║  SUMMARY                                                            ║
  // ╚═══════════════════════════════════════════════════════════════════════╝
  section('SEED SUMMARY');

  const [uCount, eCount, tCount, tmCount, rCount, pCount, ticketCount] = await Promise.all([
    User.countDocuments(),
    Event.countDocuments(),
    Team.countDocuments(),
    TeamMember.countDocuments(),
    Registration.countDocuments(),
    Payment.countDocuments(),
    Ticket.countDocuments(),
  ]);

  const validTickets = await Ticket.countDocuments({ status: 'valid' });
  const usedTicketCount = await Ticket.countDocuments({ status: 'used' });
  const cancelledTickets = await Ticket.countDocuments({ status: 'cancelled' });
  const checkedInRegs = await Registration.countDocuments({ checkedIn: true });

  console.log();
  console.log('  ┌────────────────────────────────────────┐');
  console.log(`  │  Users           ${String(uCount).padStart(5)}                │`);
  console.log(`  │  Events          ${String(eCount).padStart(5)}                │`);
  console.log(`  │  Teams           ${String(tCount).padStart(5)}                │`);
  console.log(`  │  Team Members    ${String(tmCount).padStart(5)}                │`);
  console.log(`  │  Registrations   ${String(rCount).padStart(5)}                │`);
  console.log(`  │  Payments        ${String(pCount).padStart(5)}                │`);
  console.log(`  │  Tickets         ${String(ticketCount).padStart(5)}                │`);
  console.log('  ├────────────────────────────────────────┤');
  console.log(`  │  🟢 Valid Tickets   ${String(validTickets).padStart(4)}               │`);
  console.log(`  │  🔵 Used / Scanned  ${String(usedTicketCount).padStart(4)}               │`);
  console.log(`  │  🔴 Cancelled       ${String(cancelledTickets).padStart(4)}               │`);
  console.log(`  │  ✅ Checked-In Regs ${String(checkedInRegs).padStart(4)}               │`);
  console.log('  └────────────────────────────────────────┘');
  console.log();
  console.log('  🎉 Seed complete — all data ready for testing!');
  console.log('  ──────────────────────────────────────────────');
  console.log('  Admin        →  admin@lakshya.com / Admin@1234');
  console.log('  Coordinator  →  coordinator@lakshya.com / Coord@1234');
  console.log('  Participants →  <first>.<last><n>@example.com / User@1234');
  console.log();

  process.exit(0);
};

seed().catch((err) => {
  console.error('\n  ❌ Seed failed:', err);
  process.exit(1);
});
