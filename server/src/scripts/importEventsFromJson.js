/**
 * Import events from events.json with pricingConfig
 * This script reads events.json and imports them into MongoDB
 * Run: node server/src/scripts/importEventsFromJson.js
 */
require('dotenv').config();
const mongoose = require('mongoose');
const Event = require('../models/Event');
const fs = require('fs');
const path = require('path');
const slugify = require('../utils/slugify');

const importEvents = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('\n✅ Connected to MongoDB');

    // Read events.json
    const eventsPath = path.join(__dirname, '../events.json');
    const eventsData = JSON.parse(fs.readFileSync(eventsPath, 'utf8'));
    
    console.log(`\n📋 Found ${eventsData.length} events in events.json`);

    // Clear existing events (optional - comment out if you want to keep existing events)
    const existingCount = await Event.countDocuments();
    console.log(`\n🗑️  Existing events in database: ${existingCount}`);
    
    // Option 1: Clear all events first
    // await Event.deleteMany({});
    // console.log('🗑️  Cleared all existing events');

    // Option 2: Update existing events and add new ones
    let updated = 0;
    let created = 0;
    let failed = 0;

    for (const eventData of eventsData) {
      try {
        const existingEvent = await Event.findOne({ _id: eventData._id });
        
        if (existingEvent) {
          // Update existing event with pricingConfig
          await Event.findByIdAndUpdate(
            eventData._id,
            {
              $set: {
                pricingConfig: eventData.pricingConfig,
                participationConfig: eventData.participationConfig
              }
            }
          );
          updated++;
          console.log(`✏️  Updated: ${eventData.title}`);
        } else {
          // Create new event
          const newEvent = new Event({
            _id: eventData._id,
            title: eventData.title,
            slug: eventData.slug || slugify(eventData.title),
            description: eventData.description,
            category: eventData.category,
            eventType: eventData.eventType,
            capacity: eventData.capacity,
            registrationFee: eventData.registrationFee,
            isPaid: eventData.isPaid,
            teamSizeMin: eventData.teamSizeMin,
            teamSizeMax: eventData.teamSizeMax,
            registrationDeadline: eventData.registrationDeadline,
            isRegistrationOpen: eventData.isRegistrationOpen,
            venue: eventData.venue,
            eventDate: eventData.date ? new Date(eventData.date) : null,
            pricingConfig: eventData.pricingConfig,
            participationConfig: eventData.participationConfig
          });
          await newEvent.save();
          created++;
          console.log(`✅ Created: ${eventData.title}`);
        }
      } catch (err) {
        failed++;
        console.error(`❌ Failed for ${eventData.title}:`, err.message);
      }
    }

    console.log('\n📊 Import Summary:');
    console.log(`   ✅ Created: ${created}`);
    console.log(`   ✏️  Updated: ${updated}`);
    console.log(`   ❌ Failed: ${failed}`);
    console.log(`   📋 Total: ${eventsData.length}`);

    const finalCount = await Event.countDocuments();
    console.log(`\n🎉 Total events in database: ${finalCount}`);

    process.exit(0);
  } catch (err) {
    console.error('\n❌ Import failed:', err);
    process.exit(1);
  }
};

importEvents();
