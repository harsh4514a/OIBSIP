const mongoose = require('mongoose');
require('dotenv').config();
const Order = require('./models/Order');
const Coupon = require('./models/Coupon');

async function check() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB');
  const order = await Order.findOne({ orderNumber: 'PZA-20260601-0001' });
  if (!order) {
    console.log('Order PZA-20260601-0001 not found.');
  } else {
    console.log('Order found:', {
      orderNumber: order.orderNumber,
      paymentMethod: order.paymentMethod,
      couponCode: order.couponCode,
      couponDiscountAmount: order.couponDiscountAmount,
      finalAmount: order.finalAmount,
      status: order.status
    });
  }

  const coupon = await Coupon.findOne({ code: 'WELCOME50' });
  if (coupon) {
    console.log('Coupon WELCOME50 in DB:', {
      code: coupon.code,
      usedCount: coupon.usedCount,
      usageLimit: coupon.usageLimit
    });
  } else {
    console.log('Coupon WELCOME50 not found in DB');
  }

  await mongoose.disconnect();
}

check().catch(err => console.error(err));
