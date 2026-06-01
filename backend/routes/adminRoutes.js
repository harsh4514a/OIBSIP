const express = require('express');
const {
  getDashboardStats,
  getRevenueChart,
  getOrderStatusChart,
  getTopPizzas,
  getRecentOrders,
  getSalesAnalytics,
} = require('../controllers/adminController');
const { protect } = require('../middleware/auth');
const { adminAuth } = require('../middleware/adminAuth');

const router = express.Router();

// All admin routes require admin auth
router.use(protect, adminAuth);

router.get('/dashboard', getDashboardStats);
router.get('/revenue-chart', getRevenueChart);
router.get('/order-status-chart', getOrderStatusChart);
router.get('/top-pizzas', getTopPizzas);
router.get('/recent-orders', getRecentOrders);
router.get('/analytics', getSalesAnalytics);

module.exports = router;
