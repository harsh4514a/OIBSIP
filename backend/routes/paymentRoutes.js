const express = require('express');
const {
  initiatePayment,
  createRazorpayOrder,
  verifyPayment,
  getPaymentDetails,
  handlePaymentFailure,
} = require('../controllers/paymentController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

router.post('/initiate', initiatePayment);
router.post('/create-order', createRazorpayOrder);
router.post('/verify', verifyPayment);
router.post('/failure', handlePaymentFailure);
router.get('/:orderId', getPaymentDetails);

module.exports = router;
