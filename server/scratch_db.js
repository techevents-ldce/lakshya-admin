const mongoose = require('mongoose');

// Temporary override of the AppError since we don't have the req flow
global.AppError = class AppError extends Error {
  constructor(message, statusCode, code) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
  }
};

const Order = require('./src/models/Order');
const Event = require('./src/models/Event');

async function run() {
  await mongoose.connect('mongodb://127.0.0.1:27017/tf-lakshya');
  console.log("Connected to MongoDB.");

  // Get first event
  const evt = await Event.findOne();
  if(!evt) {
    console.log("No events");
    return process.exit(0);
  }

  console.log("Testing with Event:", evt.title, evt._id.toString());
  
  const eventId = evt._id.toString();
  const eventIdObj = new mongoose.Types.ObjectId(eventId);
  
  // What does the query match?
  const qs = { itemsSnapshot: { $elemMatch: { eventId: { $in: [eventId, eventIdObj] } } } };
  
  const matchedOrders = await Order.find(qs).limit(2);
  console.log("Matched Orders:", matchedOrders.length);
  matchedOrders.forEach(o => {
     console.log("- Order:", o._id);
     console.log("  Items:", JSON.stringify(o.itemsSnapshot.map(i => i.eventId)));
  });

  process.exit(0);
}

run().catch(console.error);
