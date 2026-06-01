const express = require('express');
const {
  getAllPizzas,
  getFeaturedPizzas,
  getPizzaById,
  createPizza,
  updatePizza,
  deletePizza,
  toggleAvailability,
  searchPizzas,
} = require('../controllers/pizzaController');
const { protect } = require('../middleware/auth');
const { adminAuth } = require('../middleware/adminAuth');
const { uploadImage } = require('../middleware/upload');

const router = express.Router();

// Public routes
router.get('/featured', getFeaturedPizzas);
router.get('/search', searchPizzas);
router.get('/', (req, res, next) => {
  // Optionally attach user if authenticated (for admin filtering)
  if (req.headers.authorization) {
    const { protect: protectOptional } = require('../middleware/auth');
    protectOptional(req, res, () => next());
  } else {
    next();
  }
}, getAllPizzas);
router.get('/:id', getPizzaById);

// Admin-only routes
router.post('/', protect, adminAuth, uploadImage, createPizza);
router.put('/:id', protect, adminAuth, uploadImage, updatePizza);
router.delete('/:id', protect, adminAuth, deletePizza);
router.patch('/:id/toggle', protect, adminAuth, toggleAvailability);

module.exports = router;
