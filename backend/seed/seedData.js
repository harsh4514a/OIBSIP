// require('dotenv').config({ path: '../.env' });
require('dotenv').config();

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Import Models
const User = require('../models/User');
const Pizza = require('../models/Pizza');
const Inventory = require('../models/Inventory');

/**
 * Connect to MongoDB
 */
const connectDB = async () => {
  const conn = await mongoose.connect(process.env.MONGO_URI);
  console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
};

/**
 * Clear existing data
 */
const clearData = async () => {
  await User.deleteMany({});
  await Pizza.deleteMany({});
  await Inventory.deleteMany({});
  console.log('🗑️  Cleared existing seed data');
};

/**
 * Seed Users
 */
const seedUsers = async () => {
  const users = [
    {
      name: 'Admin',
      email: 'admin@pizzahub.com',
      password: 'Admin@123',
      role: 'admin',
      isEmailVerified: true,
      phone: '+91 9876543210',
    },
    {
      name: 'John Doe',
      email: 'user@pizzahub.com',
      password: 'User@123',
      role: 'user',
      isEmailVerified: true,
      phone: '+91 9876543211',
    },
  ];

  const createdUsers = [];
  for (const userData of users) {
    const user = await User.create(userData);
    createdUsers.push(user);
    console.log(`👤 Created user: ${user.email} (${user.role})`);
  }

  return createdUsers;
};

/**
 * Seed Pizzas
 */
const seedPizzas = async (adminId) => {
  const defaultSizes = [
    { size: 'small', priceMultiplier: 0.75 },
    { size: 'medium', priceMultiplier: 1 },
    { size: 'large', priceMultiplier: 1.4 },
    { size: 'xl', priceMultiplier: 1.8 },
  ];

  const pizzas = [
    // ── VEG PIZZAS ─────────────────────────────────────
    {
      name: 'Margherita Classic',
      description: 'The timeless Italian classic. Fresh tomato sauce, premium mozzarella, and fragrant basil leaves on our signature hand-tossed crust.',
      category: 'classic',
      basePrice: 249,
      sizes: defaultSizes,
      image: 'https://images.unsplash.com/photo-1604382354936-07c5d9983bd3?w=800',
      ingredients: ['Tomato Sauce', 'Fresh Mozzarella', 'Basil', 'Olive Oil', 'Hand-Tossed Dough'],
      isAvailable: true,
      isFeatured: true,
      ratings: { average: 4.7, count: 432 },
      tags: ['classic', 'vegetarian', 'bestseller', 'italian'],
    },
    {
      name: 'Veggie Supreme',
      description: 'A garden lover\'s paradise! Loaded with bell peppers, mushrooms, olives, onions, tomatoes, and corn on a tangy tomato base.',
      category: 'classic',
      basePrice: 319,
      sizes: defaultSizes,
      image: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800',
      ingredients: ['Tomato Sauce', 'Mozzarella', 'Bell Peppers', 'Mushrooms', 'Black Olives', 'Onions', 'Tomatoes', 'Corn'],
      isAvailable: true,
      isFeatured: true,
      ratings: { average: 4.5, count: 287 },
      tags: ['veggie', 'colorful', 'loaded', 'healthy'],
    },
    {
      name: 'Paneer Tikka',
      description: 'Indian fusion at its finest! Marinated tikka paneer, capsicum, onion and mint chutney on a spiced tomato base.',
      category: 'indian-fusion',
      basePrice: 349,
      sizes: defaultSizes,
      image: 'https://images.unsplash.com/photo-1595708684082-a173bb3a06c5?w=800',
      ingredients: ['Spiced Tomato Sauce', 'Mozzarella', 'Tikka Paneer', 'Capsicum', 'Onion', 'Mint Chutney', 'Coriander'],
      isAvailable: true,
      isFeatured: false,
      ratings: { average: 4.8, count: 521 },
      tags: ['indian', 'paneer', 'spicy', 'fusion'],
    },
    {
      name: 'Garden Pesto',
      description: 'Fresh basil pesto sauce base with sun-dried tomatoes, artichoke hearts, roasted garlic, and a blend of Italian cheeses.',
      category: 'italian',
      basePrice: 379,
      sizes: defaultSizes,
      image: 'https://images.unsplash.com/photo-1571407970349-bc81e7e96d47?w=800',
      ingredients: ['Basil Pesto', 'Parmesan', 'Sun-dried Tomatoes', 'Artichoke Hearts', 'Roasted Garlic', 'Spinach', 'Pine Nuts'],
      isAvailable: true,
      isFeatured: true,
      ratings: { average: 4.6, count: 198 },
      tags: ['pesto', 'gourmet', 'italian', 'premium'],
    },
    {
      name: 'Mexican Fiesta',
      description: 'A fiesta on your plate! Spicy salsa base with jalapeños, bell peppers, corn, black beans, and a drizzle of sour cream.',
      category: 'mexican',
      basePrice: 299,
      sizes: defaultSizes,
      image: 'https://images.unsplash.com/photo-1528137871618-79d2761e3fd5?w=800',
      ingredients: ['Salsa Base', 'Mozzarella', 'Jalapeños', 'Bell Peppers', 'Corn', 'Black Beans', 'Sour Cream', 'Cilantro'],
      isAvailable: true,
      isFeatured: false,
      ratings: { average: 4.4, count: 163 },
      tags: ['spicy', 'mexican', 'fusion', 'bold'],
    },
    {
      name: 'Four Cheese Delight',
      description: 'For the true cheese lover. A rich blend of mozzarella, cheddar, parmesan, and gorgonzola on a creamy white garlic base.',
      category: 'cheese',
      basePrice: 399,
      sizes: defaultSizes,
      image: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=800',
      ingredients: ['White Garlic Sauce', 'Mozzarella', 'Cheddar', 'Parmesan', 'Gorgonzola', 'Fresh Herbs'],
      isAvailable: true,
      isFeatured: false,
      ratings: { average: 4.9, count: 344 },
      tags: ['cheese', 'indulgent', 'rich', 'gourmet'],
    },
 
    // ── SPECIAL PIZZAS ──────────────────────────────────
    {
      name: 'Truffle Mushroom',
      description: 'Our signature luxury pizza. Wild mushroom medley, truffle oil, fontina cheese, and fresh thyme on a white cream base.',
      category: 'premium',
      basePrice: 549,
      sizes: defaultSizes,
      image: 'https://images.unsplash.com/photo-1544982503-9f984c14501a?w=800',
      ingredients: ['Cream Base', 'Fontina Cheese', 'Wild Mushrooms', 'Truffle Oil', 'Thyme', 'Garlic', 'Parmesan'],
      isAvailable: true,
      isFeatured: true,
      ratings: { average: 4.9, count: 287 },
      tags: ['truffle', 'premium', 'luxury', 'special', 'gourmet'],
    },
    {
      name: 'Spicy Volcano',
      description: 'For the brave! Ghost pepper sauce, habanero salsa, jalapeños, spiced paneer, capsicum, and fiery red chilies. Not for the faint-hearted!',
      category: 'spicy',
      basePrice: 449,
      sizes: defaultSizes,
      image: 'https://images.unsplash.com/photo-1628840042765-356cda07504e?w=800',
      ingredients: ['Ghost Pepper Sauce', 'Mozzarella', 'Habanero Salsa', 'Jalapeños', 'Spiced Paneer', 'Capsicum', 'Red Chilies'],
      isAvailable: true,
      isFeatured: false,
      ratings: { average: 4.3, count: 198 },
      tags: ['extra-spicy', 'challenge', 'special', 'fiery'],
    },
    {
      name: 'PizzaHub Signature',
      description: 'Our chef\'s masterpiece! A secret blend of five premium cheeses, slow-roasted garlic, caramelized onions, and baby arugula on our sourdough crust.',
      category: 'signature',
      basePrice: 599,
      sizes: defaultSizes,
      image: 'https://images.unsplash.com/photo-1594007654729-407eedc4be65?w=800',
      ingredients: ['Secret Sauce', 'Five-Cheese Blend', 'Roasted Garlic', 'Caramelized Onions', 'Baby Arugula', 'Balsamic Glaze', 'Sourdough Crust'],
      isAvailable: true,
      isFeatured: true,
      ratings: { average: 5.0, count: 89 },
      tags: ['signature', 'chef-special', 'premium', 'exclusive'],
    },
    {
      name: 'Mediterranean Dream',
      description: 'Hummus base topped with feta cheese, kalamata olives, sun-dried tomatoes, artichokes, and a fresh Za\'atar herb blend.',
      category: 'premium',
      basePrice: 479,
      sizes: defaultSizes,
      image: 'https://images.unsplash.com/photo-1593560708920-61dd98c46a4e?w=800',
      ingredients: ['Hummus Base', 'Feta Cheese', 'Kalamata Olives', 'Sun-dried Tomatoes', 'Artichoke', 'Za\'atar', 'Red Onion'],
      isAvailable: true,
      isFeatured: false,
      ratings: { average: 4.6, count: 143 },
      tags: ['mediterranean', 'special', 'feta', 'unique'],
    },
  ];

  const created = [];
  for (const pizzaData of pizzas) {
    const pizza = await Pizza.create({ ...pizzaData, createdBy: adminId });
    created.push(pizza);
    console.log(`🍕 Created pizza: ${pizza.name} (${pizza.category})`);
  }

  return created;
};

/**
 * Seed Inventory
 */
const seedInventory = async (adminId) => {
  const items = [
    // Bases
    { ingredientType: 'base', name: 'Thin Crust Dough', currentStock: 200, unit: 'kg', threshold: 30, pricePerUnit: 45 },
    { ingredientType: 'base', name: 'Thick Crust Dough', currentStock: 150, unit: 'kg', threshold: 25, pricePerUnit: 50 },
    { ingredientType: 'base', name: 'Stuffed Crust Dough', currentStock: 80, unit: 'kg', threshold: 15, pricePerUnit: 70 },
    { ingredientType: 'base', name: 'Wheat Dough', currentStock: 100, unit: 'kg', threshold: 20, pricePerUnit: 55 },
    { ingredientType: 'base', name: 'Gluten-Free Dough', currentStock: 40, unit: 'kg', threshold: 10, pricePerUnit: 120 },

    // Sauces
    { ingredientType: 'sauce', name: 'Tomato Sauce', currentStock: 80, unit: 'liters', threshold: 15, pricePerUnit: 120 },
    { ingredientType: 'sauce', name: 'BBQ Sauce', currentStock: 50, unit: 'liters', threshold: 10, pricePerUnit: 180 },
    { ingredientType: 'sauce', name: 'White Garlic Sauce', currentStock: 40, unit: 'liters', threshold: 8, pricePerUnit: 150 },
    { ingredientType: 'sauce', name: 'Pesto Sauce', currentStock: 30, unit: 'liters', threshold: 6, pricePerUnit: 220 },
    { ingredientType: 'sauce', name: 'Buffalo Sauce', currentStock: 25, unit: 'liters', threshold: 5, pricePerUnit: 160 },

    // Cheese
    { ingredientType: 'cheese', name: 'Mozzarella', currentStock: 150, unit: 'kg', threshold: 25, pricePerUnit: 380 },
    { ingredientType: 'cheese', name: 'Cheddar', currentStock: 60, unit: 'kg', threshold: 10, pricePerUnit: 440 },
    { ingredientType: 'cheese', name: 'Parmesan', currentStock: 40, unit: 'kg', threshold: 8, pricePerUnit: 650 },
    { ingredientType: 'cheese', name: 'Vegan Cheese', currentStock: 20, unit: 'kg', threshold: 5, pricePerUnit: 520 },
    { ingredientType: 'cheese', name: 'Feta Cheese', currentStock: 25, unit: 'kg', threshold: 5, pricePerUnit: 480 },

    // Veggies
    { ingredientType: 'veggie', name: 'Mushrooms', currentStock: 60, unit: 'kg', threshold: 10, pricePerUnit: 180 },
    { ingredientType: 'veggie', name: 'Bell Peppers', currentStock: 80, unit: 'kg', threshold: 15, pricePerUnit: 120 },
    { ingredientType: 'veggie', name: 'Onions', currentStock: 100, unit: 'kg', threshold: 20, pricePerUnit: 60 },
    { ingredientType: 'veggie', name: 'Black Olives', currentStock: 30, unit: 'kg', threshold: 5, pricePerUnit: 320 },
    { ingredientType: 'veggie', name: 'Tomatoes', currentStock: 120, unit: 'kg', threshold: 20, pricePerUnit: 80 },
    { ingredientType: 'veggie', name: 'Spinach', currentStock: 40, unit: 'kg', threshold: 8, pricePerUnit: 140 },
    { ingredientType: 'veggie', name: 'Jalapeños', currentStock: 20, unit: 'kg', threshold: 4, pricePerUnit: 240 },
    { ingredientType: 'veggie', name: 'Corn', currentStock: 50, unit: 'kg', threshold: 10, pricePerUnit: 100 },

  ];

  const created = [];
  for (const item of items) {
    const inv = await Inventory.create({
      ...item,
      history: [
        {
          action: 'add',
          quantity: item.currentStock,
          reason: 'Initial stock (seeded)',
          performedBy: adminId,
        },
      ],
    });
    created.push(inv);
  }

  console.log(`📦 Created ${created.length} inventory items`);
  return created;
};

/**
 * Main seed function
 */
const main = async () => {
  try {
    console.log('\n🌱 Starting PizzaHub seed...\n');

    await connectDB();
    await clearData();

    const users = await seedUsers();
    const adminUser = users.find((u) => u.role === 'admin');

    await seedPizzas(adminUser._id);
    await seedInventory(adminUser._id);

    console.log('\n✅ Seed completed successfully!');
    console.log('\n📋 Login Credentials:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('👑 Admin:');
    console.log('   Email:    admin@pizzahub.com');
    console.log('   Password: Admin@123');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('👤 User:');
    console.log('   Email:    user@pizzahub.com');
    console.log('   Password: User@123');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Seed failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
};

main();
