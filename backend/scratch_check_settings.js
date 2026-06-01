const mongoose = require('mongoose');
require('dotenv').config();
const Setting = require('./models/Setting');

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB');

  const settings = await Setting.findOne();
  console.log('Current settings in DB:', settings);

  await mongoose.disconnect();
}

run().catch(err => console.error(err));
