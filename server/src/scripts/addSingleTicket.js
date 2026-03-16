/**
 * Add a single participant + ticket to an existing event.
 *
 * Usage:
 *   node src/scripts/addSingleTicket.js <TICKET-ID> "<NAME>" "<EMAIL>" "<EVENT-TITLE>"
 *
 * Example:
 *   node src/scripts/addSingleTicket.js TKT-LAKSHYA-001 "Rahul Sharma" "rahul@example.com" "Code Clash"
 *
 * This will:
 *   1. Create (or reuse) a User account with the given name/email
 *   2. Create a Registration for the specified event
 *   3. Create a Ticket with a Base64 QR code
 */
require('dotenv').config();
const mongoose = require('mongoose');
const QRCode = require('qrcode');
const User = require('../models/User');
const Event = require('../models/Event');
const Registration = require('../models/Registration');
const Ticket = require('../models/Ticket');
const { hashPassword } = require('../utils/password');

const DEFAULT_PASSWORD = 'Test@1234';

const run = async () => {
  const [,, ticketId, name, email, eventTitle] = process.argv;

  if (!ticketId || !name || !email || !eventTitle) {
    console.error('\n  ❌ Usage: node src/scripts/addSingleTicket.js <TICKET-ID> "<NAME>" "<EMAIL>" "<EVENT-TITLE>"\n');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGO_URI);
  console.log('\n  ✅ Connected to MongoDB');

  // 1. Find event
  const event = await Event.findOne({ title: { $regex: new RegExp(`^${eventTitle}$`, 'i') } });
  if (!event) {
    console.error(`\n  ❌ Event not found: "${eventTitle}"\n  Available events:`);
    const all = await Event.find({}, 'title');
    all.forEach((e) => console.log(`     - ${e.title}`));
    process.exit(1);
  }
  console.log(`  📅 Event: ${event.title} (${event._id})`);

  // 2. Find or create user
  let user = await User.findOne({ email: email.toLowerCase() });
  if (!user) {
    user = await User.create({
      name,
      email: email.toLowerCase(),
      passwordHash: await hashPassword(DEFAULT_PASSWORD),
      role: 'participant',
      isActive: true,
    });
    console.log(`  👤 User created: ${user.name} (${user.email}) — password: ${DEFAULT_PASSWORD}`);
  } else {
    console.log(`  👤 User exists: ${user.name} (${user.email})`);
  }

  // 3. Create or find registration
  let reg = await Registration.findOne({ userId: user._id, eventId: event._id });
  if (!reg) {
    reg = await Registration.create({
      userId: user._id,
      eventId: event._id,
      status: 'confirmed',
      registrationData: {},
    });
    console.log('  📝 Registration created (confirmed)');
  } else {
    console.log(`  📝 Registration exists (${reg.status})`);
  }

  // 4. Create ticket with QR
  const existing = await Ticket.findOne({ ticketId });
  if (existing) {
    console.error(`\n  ❌ Ticket ID "${ticketId}" already exists! Use a different ID.\n`);
    process.exit(1);
  }

  const qrData = await QRCode.toDataURL(ticketId, { width: 300, margin: 2 });

  await Ticket.create({
    ticketId,
    userId: user._id,
    eventId: event._id,
    qrData,
    status: 'valid',
  });

  console.log(`  🎟️  Ticket created: ${ticketId}`);
  console.log(`  📱 QR code generated (Base64)`);
  console.log('\n  ────────────────────────────────────────');
  console.log(`  Ticket ID  →  ${ticketId}`);
  console.log(`  Name       →  ${user.name}`);
  console.log(`  Email      →  ${user.email}`);
  console.log(`  Event      →  ${event.title}`);
  console.log('  ────────────────────────────────────────\n');

  process.exit(0);
};

run().catch((err) => {
  console.error('\n  ❌ Failed:', err.message);
  process.exit(1);
});
