const express = require('express');
const {
  createReview,
  getPizzaReviews,
  updateReview,
  deleteReview,
  voteHelpful,
  getOrderReviews,
} = require('../controllers/reviewController');
const { protect } = require('../middleware/auth');

const router = express.Router();

// Public routes
router.get('/pizza/:pizzaId', getPizzaReviews);

// Protected routes
router.post('/', protect, createReview);
router.get('/order/:orderId', protect, getOrderReviews);
router.put('/:id', protect, updateReview);
router.delete('/:id', protect, deleteReview);
router.post('/:id/helpful', protect, voteHelpful);

module.exports = router;
