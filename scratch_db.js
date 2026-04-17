const mongoose = require('mongoose');
const Order = require('../server/src/models/Order');

mongoose.connect('mongodb://localhost:27017/tf-lakshya', { useNewUrlParser: true, useUnifiedTopology: true })
  .then(async () => {
    console.log("Connected");
    
    // Test the elemMatch logic
    const orders = await Order.find({ itemsSnapshot: { $exists: true, $not: { $size: 0 } } }).limit(5);
    orders.forEach(o => {
       console.log("Order ID:", o._id);
       console.log("Items Snapshot:", JSON.stringify(o.itemsSnapshot));
    });

    mongoose.disconnect();
  });
