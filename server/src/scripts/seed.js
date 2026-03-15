/**
 * Seed script: creates initial admin, coordinator, participant users,
 * events, registrations, payments, and tickets for dashboard preview.
 *
 * Run: npm run seed
 *
 * This script is idempotent — re-running it will skip already-seeded data
 * and only fill in what's missing.
 */
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const Event = require('../models/Event');
const Registration = require('../models/Registration');
const Payment = require('../models/Payment');
const Ticket = require('../models/Ticket');
const { hashPassword } = require('../utils/password');
const { v4: uuidv4 } = require('uuid');

// ─── Helpers ─────────────────────────────────────────────
const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick = (arr) => arr[randomInt(0, arr.length - 1)];
const daysAgo = (n) => new Date(Date.now() - n * 24 * 60 * 60 * 1000);

// ─── Dummy Data Pools ────────────────────────────────────
const COLLEGES = [
  'LDCE', 'DAIICT', 'NIRMA', 'GTU', 'DDU', 'SVNIT', 'PDPU',
  'IIT Gandhinagar', 'CHARUSAT', 'Marwadi University',
];
const BRANCHES = [
  'Computer Engineering', 'Information Technology', 'Electronics & Communication',
  'Mechanical Engineering', 'Civil Engineering', 'Electrical Engineering',
  'Chemical Engineering', 'AI & ML', 'Data Science', 'Cyber Security',
];
const FIRST_NAMES = [
  'Aarav', 'Vivaan', 'Aditya', 'Arjun', 'Sai', 'Reyansh', 'Atharv',
  'Ananya', 'Diya', 'Myra', 'Sara', 'Aadhya', 'Isha', 'Riya',
  'Kavya', 'Nishant', 'Priya', 'Rohan', 'Sneha', 'Vikram',
  'Meera', 'Karan', 'Tanvi', 'Harsh', 'Pooja',
];
const LAST_NAMES = [
  'Patel', 'Shah', 'Sharma', 'Modi', 'Desai', 'Joshi', 'Mehta',
  'Chauhan', 'Parmar', 'Solanki', 'Raval', 'Dave', 'Trivedi',
  'Bhatt', 'Rao', 'Kumar', 'Singh', 'Gupta', 'Thakkar', 'Panchal',
];

const EVENT_DATA = [
  { title: 'Code Clash', category: 'Coding', eventType: 'solo', capacity: 120, registrationFee: 0, isPaid: false, description: 'A competitive programming contest with 3 rounds of increasing difficulty.', venue: 'Lab 301' },
  { title: 'HackSprint', category: 'Hackathon', eventType: 'team', capacity: 200, registrationFee: 200, isPaid: true, teamSizeMin: 2, teamSizeMax: 4, description: '24-hour hackathon to build innovative solutions for real-world problems.', venue: 'Auditorium Hall' },
  { title: 'Quizathon', category: 'Quiz', eventType: 'solo', capacity: 80, registrationFee: 50, isPaid: true, description: 'Ultimate tech quiz covering CS fundamentals, current affairs in tech, and pop culture.', venue: 'Seminar Hall A' },
  { title: 'RoboWars', category: 'Robotics', eventType: 'team', capacity: 60, registrationFee: 500, isPaid: true, teamSizeMin: 3, teamSizeMax: 5, description: 'Build and battle your robots in an arena combat tournament.', venue: 'Main Ground' },
  { title: 'UI/UX Design Sprint', category: 'Design', eventType: 'solo', capacity: 50, registrationFee: 100, isPaid: true, description: 'Design the best user interface for a given problem statement in 6 hours.', venue: 'Lab 205' },
  { title: 'AI Workshop', category: 'Workshop', eventType: 'solo', capacity: 150, registrationFee: 0, isPaid: false, description: 'Hands-on workshop on building ML models with TensorFlow and PyTorch.', venue: 'Seminar Hall B' },
  { title: 'CTF Challenge', category: 'Cybersecurity', eventType: 'team', capacity: 100, registrationFee: 150, isPaid: true, teamSizeMin: 2, teamSizeMax: 3, description: 'Capture the Flag cybersecurity competition with web, crypto, and forensics challenges.', venue: 'Lab 402' },
  { title: 'Startup Pitch', category: 'Entrepreneurship', eventType: 'team', capacity: 40, registrationFee: 300, isPaid: true, teamSizeMin: 2, teamSizeMax: 4, description: 'Pitch your startup idea to a panel of investors and industry experts.', venue: 'Conference Room' },
];

const REG_STATUSES = ['pending', 'confirmed', 'confirmed', 'confirmed', 'cancelled', 'waitlisted'];
const PAY_STATUSES = ['completed', 'completed', 'completed', 'completed', 'pending', 'failed', 'refunded'];
const PAY_METHODS = ['UPI', 'Card', 'Net Banking', 'UPI', 'UPI', 'Cash'];

const seed = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('✅ Connected to MongoDB\n');

  // ╔═══════════════════════════════════════════════════════╗
  // ║  1. ADMIN & COORDINATOR USERS                        ║
  // ╚═══════════════════════════════════════════════════════╝
  const adminEmail = process.env.SEED_ADMIN_EMAIL || 'admin@lakshya.com';
  const adminPassword = process.env.SEED_ADMIN_PASSWORD || 'Admin@1234';
  let adminUser = await User.findOne({ email: adminEmail });
  if (!adminUser) {
    adminUser = await User.create({
      name: 'Lakshya Admin',
      email: adminEmail,
      passwordHash: await hashPassword(adminPassword),
      role: 'admin',
      isActive: true,
    });
    console.log(`✅ Admin created  : ${adminEmail} / ${adminPassword}`);
  } else {
    console.log('⏭️  Admin already exists. Skipping.');
  }

  const coordEmail = process.env.SEED_COORD_EMAIL || 'coordinator@lakshya.com';
  const coordPassword = process.env.SEED_COORD_PASSWORD || 'Coord@1234';
  let coordUser = await User.findOne({ email: coordEmail });
  if (!coordUser) {
    coordUser = await User.create({
      name: 'Lakshya Coordinator',
      email: coordEmail,
      passwordHash: await hashPassword(coordPassword),
      role: 'coordinator',
      isActive: true,
    });
    console.log(`✅ Coordinator created: ${coordEmail} / ${coordPassword}`);
  } else {
    console.log('⏭️  Coordinator already exists. Skipping.');
  }

  // ╔═══════════════════════════════════════════════════════╗
  // ║  2. PARTICIPANT USERS                                ║
  // ╚═══════════════════════════════════════════════════════╝
  const existingParticipants = await User.find({ role: 'participant' });
  let participants = existingParticipants;

  if (existingParticipants.length < 5) {
    console.log('\n📌 Creating participant users...');
    const newParticipants = [];
    const usedEmails = new Set((await User.find({}, 'email')).map((u) => u.email));
    const sharedHash = await hashPassword('User@1234');

    for (let i = 0; i < 25; i++) {
      const first = FIRST_NAMES[i % FIRST_NAMES.length];
      const last = LAST_NAMES[i % LAST_NAMES.length];
      const email = `${first.toLowerCase()}.${last.toLowerCase()}${i}@example.com`;

      if (usedEmails.has(email)) continue;
      usedEmails.add(email);

      newParticipants.push({
        name: `${first} ${last}`,
        email,
        phone: `9${randomInt(100000000, 999999999)}`,
        college: pick(COLLEGES),
        branch: pick(BRANCHES),
        year: randomInt(1, 4),
        passwordHash: sharedHash,
        role: 'participant',
        isActive: true,
        createdAt: daysAgo(randomInt(1, 45)),
      });
    }

    if (newParticipants.length > 0) {
      const inserted = await User.insertMany(newParticipants);
      participants = [...existingParticipants, ...inserted];
      console.log(`   ✅ Created ${inserted.length} participants`);
    }
  } else {
    console.log(`⏭️  ${existingParticipants.length} participants already exist. Skipping.`);
  }

  // ╔═══════════════════════════════════════════════════════╗
  // ║  3. EVENTS                                           ║
  // ╚═══════════════════════════════════════════════════════╝
  const existingEvents = await Event.find();
  let events = existingEvents;

  if (existingEvents.length < 3) {
    console.log('\n📌 Creating events...');
    const newEvents = [];

    for (const ev of EVENT_DATA) {
      const exists = await Event.findOne({ title: ev.title });
      if (exists) continue;

      newEvents.push({
        ...ev,
        registrationDeadline: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // 15 days from now
        isRegistrationOpen: true,
        eventDate: new Date(Date.now() + randomInt(20, 40) * 24 * 60 * 60 * 1000),
        coordinators: [coordUser._id],
      });
    }

    if (newEvents.length > 0) {
      const inserted = await Event.insertMany(newEvents);
      events = [...existingEvents, ...inserted];
      console.log(`   ✅ Created ${inserted.length} events`);
    }

    // Assign all events to coordinator
    const allEventIds = events.map((e) => e._id);
    await User.findByIdAndUpdate(coordUser._id, { assignedEvents: allEventIds });
    console.log('   ✅ Assigned all events to coordinator');
  } else {
    console.log(`⏭️  ${existingEvents.length} events already exist. Skipping.`);
  }

  // ╔═══════════════════════════════════════════════════════╗
  // ║  4. REGISTRATIONS                                    ║
  // ╚═══════════════════════════════════════════════════════╝
  const existingRegs = await Registration.countDocuments();
  if (existingRegs < 10) {
    console.log('\n📌 Creating registrations...');
    const registrations = [];
    const usedPairs = new Set();

    // Create 60+ registrations spread across events and users
    for (let i = 0; i < 70; i++) {
      const user = pick(participants);
      const event = pick(events);
      if (!user || !event) continue;

      const pairKey = `${user._id}-${event._id}`;
      if (usedPairs.has(pairKey)) continue;
      usedPairs.add(pairKey);

      const dayOffset = randomInt(0, 29);
      const status = pick(REG_STATUSES);

      registrations.push({
        userId: user._id,
        eventId: event._id,
        status,
        registrationData: {},
        createdAt: daysAgo(dayOffset),
        updatedAt: daysAgo(dayOffset),
      });
    }

    if (registrations.length > 0) {
      // Use ordered: false to skip duplicates silently
      try {
        const inserted = await Registration.insertMany(registrations, { ordered: false });
        console.log(`   ✅ Created ${inserted.length} registrations`);
      } catch (err) {
        // BulkWriteError means some duplicates were skipped, that's fine
        const count = err.result?.nInserted || err.insertedDocs?.length || 'some';
        console.log(`   ✅ Created ${count} registrations (duplicates skipped)`);
      }
    }
  } else {
    console.log(`⏭️  ${existingRegs} registrations already exist. Skipping.`);
  }

  // ╔═══════════════════════════════════════════════════════╗
  // ║  5. PAYMENTS (for paid events with confirmed regs)   ║
  // ╚═══════════════════════════════════════════════════════╝
  const existingPayments = await Payment.countDocuments();
  if (existingPayments < 5) {
    console.log('\n📌 Creating payments...');
    const paidEvents = events.filter((e) => e.isPaid);
    const confirmedRegs = await Registration.find({
      eventId: { $in: paidEvents.map((e) => e._id) },
      status: { $in: ['confirmed', 'pending', 'waitlisted'] },
    });

    const payments = [];
    const usedPayPairs = new Set();

    for (const reg of confirmedRegs) {
      const pairKey = `${reg.userId}-${reg.eventId}`;
      if (usedPayPairs.has(pairKey)) continue;
      usedPayPairs.add(pairKey);

      const event = events.find((e) => e._id.toString() === reg.eventId.toString());
      if (!event) continue;

      const dayOffset = randomInt(0, 28);
      const status = pick(PAY_STATUSES);

      payments.push({
        userId: reg.userId,
        eventId: reg.eventId,
        amount: event.registrationFee,
        status,
        transactionId: `TXN-${uuidv4().slice(0, 12).toUpperCase()}`,
        paymentMethod: pick(PAY_METHODS),
        verifiedAt: status === 'completed' ? daysAgo(dayOffset) : undefined,
        verifiedBy: status === 'completed' ? adminUser._id : undefined,
        notes: status === 'refunded' ? 'Refund processed' : undefined,
        createdAt: daysAgo(dayOffset),
        updatedAt: daysAgo(dayOffset),
      });
    }

    if (payments.length > 0) {
      try {
        const inserted = await Payment.insertMany(payments, { ordered: false });
        console.log(`   ✅ Created ${inserted.length} payments`);
      } catch (err) {
        const count = err.result?.nInserted || err.insertedDocs?.length || 'some';
        console.log(`   ✅ Created ${count} payments (duplicates skipped)`);
      }
    } else {
      console.log('   ⚠️  No confirmed registrations for paid events found. Skipping payments.');
    }
  } else {
    console.log(`⏭️  ${existingPayments} payments already exist. Skipping.`);
  }

  // ╔═══════════════════════════════════════════════════════╗
  // ║  6. TICKETS (for confirmed registrations)            ║
  // ╚═══════════════════════════════════════════════════════╝
  const existingTickets = await Ticket.countDocuments();
  if (existingTickets < 5) {
    console.log('\n📌 Creating tickets...');
    const confirmedRegs = await Registration.find({ status: 'confirmed' }).limit(25);
    const tickets = [];

    for (const reg of confirmedRegs) {
      const ticketId = `LKY-${uuidv4().slice(0, 8).toUpperCase()}`;
      const dayOffset = randomInt(0, 25);
      const status = Math.random() > 0.3 ? 'valid' : 'used';

      tickets.push({
        ticketId,
        userId: reg.userId,
        eventId: reg.eventId,
        qrData: `https://lakshya.app/verify/${ticketId}`,
        status,
        scannedAt: status === 'used' ? daysAgo(dayOffset) : undefined,
        scannedBy: status === 'used' ? coordUser._id : undefined,
        createdAt: daysAgo(dayOffset),
        updatedAt: daysAgo(dayOffset),
      });
    }

    if (tickets.length > 0) {
      try {
        const inserted = await Ticket.insertMany(tickets, { ordered: false });
        console.log(`   ✅ Created ${inserted.length} tickets`);
      } catch (err) {
        const count = err.result?.nInserted || err.insertedDocs?.length || 'some';
        console.log(`   ✅ Created ${count} tickets (duplicates skipped)`);
      }
    }
  } else {
    console.log(`⏭️  ${existingTickets} tickets already exist. Skipping.`);
  }

  // ╔═══════════════════════════════════════════════════════╗
  // ║  SUMMARY                                             ║
  // ╚═══════════════════════════════════════════════════════╝
  console.log('\n' + '═'.repeat(55));
  console.log('  📊 SEED SUMMARY');
  console.log('═'.repeat(55));
  const [uCount, eCount, rCount, pCount, tCount] = await Promise.all([
    User.countDocuments(),
    Event.countDocuments(),
    Registration.countDocuments(),
    Payment.countDocuments(),
    Ticket.countDocuments(),
  ]);
  console.log(`  Users:         ${uCount}`);
  console.log(`  Events:        ${eCount}`);
  console.log(`  Registrations: ${rCount}`);
  console.log(`  Payments:      ${pCount}`);
  console.log(`  Tickets:       ${tCount}`);
  console.log('═'.repeat(55));
  console.log('\n🎉 Seed complete! Dashboard charts will now show data.');
  console.log('   Login as admin@lakshya.com / Admin@1234 to view.\n');

  process.exit(0);
};

seed().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
