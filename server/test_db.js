const mongoose = require('mongoose');

async function run() {
  await mongoose.connect('mongodb://127.0.0.1:27017/tf-lakshya');
  const Order = mongoose.connection.collection('orders');
  const Registration = mongoose.connection.collection('registrations');
  const Event = mongoose.connection.collection('events');

  const evt = await Event.findOne({}, { sort: { _id: 1 } });
  if (!evt) return console.log("no events");

  const eventId = evt._id.toString();
  const eventIdObj = evt._id;

  const orders = await Order.find({ itemsSnapshot: { $elemMatch: { eventId: { $in: [eventId, eventIdObj] } } } }).limit(5).toArray();
  
  if (orders.length > 0) {
    console.log("Matched $elemMatch query!");
    orders.forEach(o => {
      console.log(o.itemsSnapshot.map(i => i.eventId));
    });
  } else {
    console.log("No orders matched $elemMatch");
  }

  // Find orders using Registration
  const regs = await Registration.find({ eventId: eventIdObj }).limit(5).toArray();
  const orderIds = regs.map(r => r.orderId).filter(Boolean);
  
  const orders2 = await Order.find({ _id: { $in: orderIds } }).limit(5).toArray();
  if (orders2.length > 0) {
    console.log("Matched Registration orderId query!");
    orders2.forEach(o => {
      console.log(o.itemsSnapshot?.map(i => i.eventId));
    });
  }

  process.exit();
}

run();
