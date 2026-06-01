const express = require('express');
const {
  getEligibleCoupons,
  validateCoupon,
  getCouponsAdmin,
  createCoupon,
  updateCoupon,
  deleteCoupon,
  toggleCouponStatus,
  getCouponAnalytics,
} = require('../controllers/couponController');
const { protect } = require('../middleware/auth');
const { adminAuth } = require('../middleware/adminAuth');

const router = express.Router();

// Require authentication for all coupon operations
router.use(protect);

// Customer endpoints
router.get('/eligible', getEligibleCoupons);
router.post('/validate', validateCoupon);

// Admin-only endpoints
router.get('/admin/all', adminAuth, getCouponsAdmin);
router.post('/admin/create', adminAuth, createCoupon);
router.put('/admin/:id', adminAuth, updateCoupon);
router.delete('/admin/:id', adminAuth, deleteCoupon);
router.patch('/admin/:id/toggle', adminAuth, toggleCouponStatus);
router.get('/admin/analytics', adminAuth, getCouponAnalytics);

module.exports = router;
