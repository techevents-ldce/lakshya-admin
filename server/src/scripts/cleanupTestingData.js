const mongoose = require('mongoose');
const mongoConfig = require('../config/db');
const dns = require('node:dns/promises');
dns.setServers(['1.1.1.1']);
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const User = require('../models/User');
const Event = require('../models/Event');
const Registration = require('../models/Registration');
const Ticket = require('../models/Ticket');
const Team = require('../models/Team');

const MONGODB_URI = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/lakshya';

async function cleanup() {
  try {
    console.log('🧹 Starting Cleanup of Testing Data...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // 1. Identify Test Events
    const testEvents = await Event.find({ 
      $or: [
        { category: 'Testing' },
        { title: { $regex: /Verification Test/i } }
      ]
    });
    const eventIds = testEvents.map(e => e._id);
    console.log(`📅 Found ${eventIds.length} test events to remove.`);

    if (eventIds.length > 0) {
      // 2. Remove Registrations
      const regRes = await Registration.deleteMany({ eventId: { $in: eventIds } });
      console.log(`🎟️ Removed ${regRes.deletedCount} registrations.`);

      // 3. Remove Tickets
      const tickRes = await Ticket.deleteMany({ eventId: { $in: eventIds } });
      console.log(`🎫 Removed ${tickRes.deletedCount} tickets.`);

      // 4. Remove Teams
      const teamRes = await Team.deleteMany({ eventId: { $in: eventIds } });
      console.log(`👥 Removed ${teamRes.deletedCount} teams.`);

      // 5. Remove Events
      const eventRes = await Event.deleteMany({ _id: { $in: eventIds } });
      console.log(`✅ Removed ${eventRes.deletedCount} events.`);
    }

    // 6. Remove Test Users
    const userRes = await User.deleteMany({ 
      $or: [
        { email: { $regex: /@test\.com$/i } },
        { role: 'coordinator', email: 'coordinator@test.com' }
      ]
    });
    console.log(`👤 Removed ${userRes.deletedCount} test users.`);

    console.log('\n✨ Cleanup Complete! Dashboard data should reflect real metrics now.');
  } catch (err) {
    console.error('❌ Error during cleanup:', err);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
}

cleanup();
