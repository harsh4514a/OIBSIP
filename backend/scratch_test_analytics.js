const mongoose = require('mongoose');
require('dotenv').config();
const Order = require('./models/Order');

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB');

  const allOrders = await Order.find();
  console.log(`Total orders in DB: ${allOrders.length}`);
  for (const o of allOrders) {
    console.log(`Order #${o.orderNumber}: Status = ${o.status}, PaymentMethod = ${o.paymentMethod}, PaymentStatus = ${o.paymentStatus}, FinalAmount = ${o.finalAmount}`);
  }

  // Check the analytics query result
  const totalRevenue = await Order.aggregate([
    { $match: { paymentStatus: 'paid' } },
    { $group: { _id: null, total: { $sum: '$finalAmount' }, count: { $sum: 1 } } },
  ]);
  console.log('Total Revenue Aggregation (paymentStatus: paid):', totalRevenue);

  await mongoose.disconnect();
}

run().catch(err => console.error(err));
