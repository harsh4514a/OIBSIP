const express = require('express');
const {
  createOrder,
  getUserOrders,
  getOrderById,
  cancelOrder,
  updateOrderStatus,
  getAllOrders,
  getOrderAnalytics,
  downloadInvoice,
  assignDelivery,
} = require('../controllers/orderController');
const { protect } = require('../middleware/auth');
const { adminAuth } = require('../middleware/adminAuth');

const router = express.Router();

// All order routes require authentication
router.use(protect);

// User routes
router.post('/', createOrder);
router.get('/', getUserOrders);
router.get('/:id', getOrderById);
router.post('/:id/cancel', cancelOrder);
router.get('/:id/invoice', downloadInvoice);

// Admin routes
router.put('/:id/status', adminAuth, updateOrderStatus);
router.patch('/:id/assign-delivery', adminAuth, assignDelivery);
router.get('/admin/all', adminAuth, getAllOrders);
router.get('/admin/analytics', adminAuth, getOrderAnalytics);

module.exports = router;
