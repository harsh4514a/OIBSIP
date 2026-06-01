const mongoose = require('mongoose');
require('dotenv').config();
const User = require('./models/User');
const http = require('http');

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB');

  // Find admin user
  const admin = await User.findOne({ role: 'admin' });
  if (!admin) {
    console.log('No admin user found');
    await mongoose.disconnect();
    return;
  }
  console.log('Using Admin:', admin.email);

  // Generate token
  const token = admin.generateJWT();
  console.log('Generated Token');

  await mongoose.disconnect();

  // Make request
  http.get(
    {
      hostname: 'localhost',
      port: 5001,
      path: '/api/v1/orders/admin/all',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    },
    (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        console.log('Response Code:', res.statusCode);
        const obj = JSON.parse(body);
        if (obj.success && obj.data?.orders?.length > 0) {
          console.log('First Order details:');
          console.log(JSON.stringify(obj.data.orders[0], null, 2));
        } else {
          console.log('No orders found or error:', obj);
        }
      });
    }
  ).on('error', (e) => {
    console.error('Request Error:', e);
  });
}

run().catch(err => console.error(err));
