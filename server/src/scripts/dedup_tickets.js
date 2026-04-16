/**
 * dedup_tickets.js
 *
 * One-time migration: removes duplicate Ticket documents where the same user
 * has more than one ticket for the same event. Keeps the NEWEST ticket
 * (by createdAt desc) for each (userId, eventId) pair and deletes the rest.
 *
 * Run BEFORE the server restarts with the new unique index on Ticket(userId, eventId).
 *
 * Usage:
 *   cd server
 *   node src/scripts/dedup_tickets.js
 *
 * Set MONGODB_URI in .env or export it before running.
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const mongoose = require('mongoose');

const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI;
if (!MONGO_URI) {
  console.error('❌  MONGODB_URI not set. Check your .env file.');
  process.exit(1);
}

async function run() {
  await mongoose.connect(MONGO_URI);
  console.log('✅  Connected to MongoDB');

  const collection = mongoose.connection.collection('tickets');

  // Find all (userId, eventId) groups that have more than one ticket
  const duplicates = await collection
    .aggregate([
      {
        $group: {
          _id: { userId: '$userId', eventId: '$eventId' },
          count: { $sum: 1 },
          ids: { $push: '$_id' },
          // Track which is newest so we can keep it
          newest: { $max: '$createdAt' },
        },
      },
      { $match: { count: { $gt: 1 } } },
    ])
    .toArray();

  if (duplicates.length === 0) {
    console.log('✅  No duplicate tickets found. Nothing to do.');
    await mongoose.disconnect();
    return;
  }

  console.log(`⚠️   Found ${duplicates.length} (userId, eventId) groups with duplicates.`);

  let totalDeleted = 0;

  for (const group of duplicates) {
    const { userId, eventId } = group._id;

    // Fetch all tickets for this pair sorted newest first
    const tickets = await collection
      .find({ userId, eventId })
      .sort({ createdAt: -1 })
      .toArray();

    // Keep the first (newest), delete the rest
    const toDelete = tickets.slice(1).map((t) => t._id);
    if (toDelete.length > 0) {
      const result = await collection.deleteMany({ _id: { $in: toDelete } });
      totalDeleted += result.deletedCount;
      console.log(
        `  Deleted ${result.deletedCount} duplicate(s) for userId=${userId} eventId=${eventId}`
      );
    }
  }

  console.log(`\n✅  Done. Total tickets deleted: ${totalDeleted}`);
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error('❌  Script failed:', err);
  process.exit(1);
});
