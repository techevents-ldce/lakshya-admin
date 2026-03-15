/**
 * Seed script: creates initial admin & coordinator users
 * Run: npm run seed
 */
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const { hashPassword } = require('../utils/password');

const seed = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB');

  // ── Admin ──────────────────────────────────────────────
  const adminEmail = process.env.SEED_ADMIN_EMAIL || 'admin@lakshya.com';
  const adminPassword = process.env.SEED_ADMIN_PASSWORD || 'Admin@1234';

  const existingAdmin = await User.findOne({ email: adminEmail });
  if (existingAdmin) {
    console.log('Admin user already exists. Skipping admin seed.');
  } else {
    const adminHash = await hashPassword(adminPassword);
    await User.create({
      name: 'Lakshya Admin',
      email: adminEmail,
      passwordHash: adminHash,
      role: 'admin',
      isActive: true,
    });
    console.log(`Admin created  : ${adminEmail} / ${adminPassword}`);
  }

  // ── Coordinator ────────────────────────────────────────
  const coordEmail = process.env.SEED_COORD_EMAIL || 'coordinator@lakshya.com';
  const coordPassword = process.env.SEED_COORD_PASSWORD || 'Coord@1234';

  const existingCoord = await User.findOne({ email: coordEmail });
  if (existingCoord) {
    console.log('Coordinator user already exists. Skipping coordinator seed.');
  } else {
    const coordHash = await hashPassword(coordPassword);
    await User.create({
      name: 'Lakshya Coordinator',
      email: coordEmail,
      passwordHash: coordHash,
      role: 'coordinator',
      isActive: true,
    });
    console.log(`Coordinator created: ${coordEmail} / ${coordPassword}`);
  }

  console.log('Seed complete.');
  process.exit(0);
};

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
