const mongoose = require('mongoose');
require('dotenv').config();
const User = require('./models/User');

async function check() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB');
  const users = await User.find();
  console.log('Total users:', users.length);
  for (const u of users) {
    console.log(`User: ${u.name}, Email: ${u.email}, Phone: "${u.phone}"`);
  }
  await mongoose.disconnect();
}

check().catch(err => console.error(err));
