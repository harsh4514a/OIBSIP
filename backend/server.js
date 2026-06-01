require('dotenv').config();

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const connectDB = require('./config/db');
const { errorHandler, notFound } = require('./middleware/errorHandler');

// Route imports
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const pizzaRoutes = require('./routes/pizzaRoutes');
const cartRoutes = require('./routes/cartRoutes');
const orderRoutes = require('./routes/orderRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const inventoryRoutes = require('./routes/inventoryRoutes');
const adminRoutes = require('./routes/adminRoutes');
const reviewRoutes = require('./routes/reviewRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const settingRoutes = require('./routes/settingRoutes');
const couponRoutes = require('./routes/couponRoutes');

// ─────────────────────────────────────────────────
// App initialization
// ─────────────────────────────────────────────────
const app = express();
const server = http.createServer(app);

// ─────────────────────────────────────────────────
// Socket.io setup
// ─────────────────────────────────────────────────
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    methods: ['GET', 'POST'],
    credentials: true,
  },
  transports: ['websocket', 'polling'],
});

// Export io for use in controllers
module.exports.io = io;

// Socket.io event handlers
io.on('connection', (socket) => {
  console.log(`🔌 Socket connected: ${socket.id}`);

  // User joins their order room
  socket.on('join-order-room', (orderId) => {
    socket.join(`order-${orderId}`);
    console.log(`📦 Socket ${socket.id} joined order room: order-${orderId}`);
  });

  // Admin joins admin room
  socket.on('join-admin', () => {
    socket.join('admin-room');
    console.log(`👑 Admin socket ${socket.id} joined admin-room`);
  });

  // Emit general notifications
  socket.on('notification', (data) => {
    io.to(data.userId).emit('notification', data);
  });

  // Admin emits order status update
  socket.on('order-status-update', (data) => {
    io.to(`order-${data.orderId}`).emit('order-status-update', data);
    console.log(`📢 Status update for order-${data.orderId}: ${data.status}`);
  });

  socket.on('disconnect', () => {
    console.log(`🔌 Socket disconnected: ${socket.id}`);
  });
});

// ─────────────────────────────────────────────────
// Security & utility middleware
// ─────────────────────────────────────────────────
app.use(
  helmet({
    crossOriginEmbedderPolicy: false,
    contentSecurityPolicy: false,
  })
);

// CORS
app.use(
  cors({
    origin: process.env.FRONTEND_URL,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// Logging
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan(process.env.NODE_ENV === 'development' ? 'dev' : 'combined'));
}

// Body parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ─────────────────────────────────────────────────
// Rate limiting
// ─────────────────────────────────────────────────
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests, please try again after 15 minutes.',
  },
});

app.use('/api', globalLimiter);

// ─────────────────────────────────────────────────
// Attach io to req for controllers
// ─────────────────────────────────────────────────
app.use((req, res, next) => {
  req.io = io;
  next();
});

// ─────────────────────────────────────────────────
// API Routes
// ─────────────────────────────────────────────────
const API_PREFIX = '/api/v1';

app.use(`${API_PREFIX}/auth`, authRoutes);
app.use(`${API_PREFIX}/users`, userRoutes);
app.use(`${API_PREFIX}/pizzas`, pizzaRoutes);
app.use(`${API_PREFIX}/cart`, cartRoutes);
app.use(`${API_PREFIX}/orders`, orderRoutes);
app.use(`${API_PREFIX}/payments`, paymentRoutes);
app.use(`${API_PREFIX}/inventory`, inventoryRoutes);
app.use(`${API_PREFIX}/admin`, adminRoutes);
app.use(`${API_PREFIX}/reviews`, reviewRoutes);
app.use(`${API_PREFIX}/notifications`, notificationRoutes);
app.use(`${API_PREFIX}/settings`, settingRoutes);
app.use(`${API_PREFIX}/coupons`, couponRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: '🍕 PizzaHub API is running!',
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString(),
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: '🍕 Welcome to PizzaHub API v1',
    docs: `${req.protocol}://${req.get('host')}/health`,
    version: '1.0.0',
  });
});

// ─────────────────────────────────────────────────
// Error handling
// ─────────────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

// ─────────────────────────────────────────────────
// Start server
const Coupon = require('./models/Coupon');

const seedCouponsIfEmpty = async () => {
  try {
    const defaultCoupons = [
      {
        title: 'Flat ₹100 Off',
        code: 'WELCOME50',
        description: 'Get flat ₹100 off on your first order! Min order value ₹500.',
        discountType: 'fixed',
        discountValue: 100,
        minCartValue: 500,
        isFirstOrderOnly: true,
        usagePerUser: 1,
        terms: ['Valid on first order only', 'Minimum order value of ₹500 required', 'Cannot be combined with other offers'],
      },
      {
        title: 'Special 15% Off',
        code: 'PIZZA10',
        description: 'Get 15% off on all pizzas! Min order value ₹500.',
        discountType: 'percentage',
        discountValue: 15,
        maxDiscount: 150,
        minCartValue: 500,
        usagePerUser: 5,
        terms: ['Get 15% off up to ₹150', 'Minimum order value of ₹500 required'],
      },
      {
        title: 'Weekend Premium 20% Off',
        code: 'PIZZA20',
        description: 'Get 20% off on premium pizzas! Valid on weekends only. Min order value ₹800.',
        discountType: 'percentage',
        discountValue: 20,
        maxDiscount: 200,
        minCartValue: 800,
        isWeekendOnly: true,
        isPremiumOnly: true,
        usagePerUser: 3,
        terms: ['Valid only on weekends (Saturday & Sunday)', 'Valid only on premium pizzas', 'Minimum order value of ₹800 required', 'Get 20% off up to ₹200'],
      },
      {
        title: 'VIP Loyalty Rewards',
        code: 'VIP10',
        description: '10% off for our VIP foodies! Lifetime spending must be > ₹5000. Min order value ₹699.',
        discountType: 'percentage',
        discountValue: 10,
        maxDiscount: 150,
        minCartValue: 699,
        minLifetimeSpending: 5000,
        usagePerUser: 12,
        terms: ['Requires lifetime spending of ₹5000', 'Minimum order value of ₹699 required', 'Get 10% off up to ₹150'],
      }
    ];

    const expiry = new Date();
    expiry.setDate(expiry.getDate() + 30); // 30 days from now
    const vipExpiry = new Date();
    vipExpiry.setDate(vipExpiry.getDate() + 365); // 365 days from now

    let seededCount = 0;
    for (const couponData of defaultCoupons) {
      const exists = await Coupon.findOne({ code: couponData.code });
      if (!exists) {
        couponData.expiryDate = couponData.code === 'VIP10' ? vipExpiry : expiry;
        await Coupon.create(couponData);
        seededCount++;
      }
    }

    if (seededCount > 0) {
      console.log(`✅ Seeded ${seededCount} missing default coupons successfully!`);
    } else {
      console.log('🌱 All default coupons already exist in database.');
    }
  } catch (error) {
    console.error('❌ Failed to seed coupons:', error.message);
  }
};

// ─────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    // Connect to MongoDB
    await connectDB();

    // Auto-seed coupons if empty
    await seedCouponsIfEmpty();

    server.listen(PORT, () => {
      console.log(`\n🚀 PizzaHub API Server running!`);
      console.log(`📍 Port: ${PORT}`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🔗 URL: http://localhost:${PORT}`);
      console.log(`🔗 API: http://localhost:${PORT}/api/v1`);
      console.log(`🩺 Health: http://localhost:${PORT}/health\n`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error.message);
    process.exit(1);
  }
};

startServer();

// ─────────────────────────────────────────────────
// Graceful shutdown
// ─────────────────────────────────────────────────
const gracefulShutdown = (signal) => {
  console.log(`\n⚠️  ${signal} received. Starting graceful shutdown...`);
  server.close(() => {
    console.log('✅ HTTP server closed.');
    process.exit(0);
  });

  // Force exit after 10s if server hasn't closed
  setTimeout(() => {
    console.error('❌ Forced shutdown after timeout.');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

process.on('unhandledRejection', (err) => {
  console.error('❌ Unhandled Promise Rejection:', err.message);
  gracefulShutdown('unhandledRejection');
});

process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err.message);
  gracefulShutdown('uncaughtException');
});

module.exports = { app, server, io };
