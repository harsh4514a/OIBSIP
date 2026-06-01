const express = require('express');
const {
  getAllInventory,
  getInventoryItem,
  addInventoryItem,
  updateStock,
  deleteInventoryItem,
  getLowStockItems,
  getInventoryHistory,
  triggerStockAlert,
} = require('../controllers/inventoryController');
const { protect } = require('../middleware/auth');
const { adminAuth } = require('../middleware/adminAuth');

const router = express.Router();

// All inventory routes require admin
router.use(protect, adminAuth);

router.get('/low-stock', getLowStockItems);
router.post('/trigger-alert', triggerStockAlert);
router.get('/', getAllInventory);
router.post('/', addInventoryItem);
router.get('/:id', getInventoryItem);
router.get('/:id/history', getInventoryHistory);
router.put('/:id/stock', updateStock);
router.delete('/:id', deleteInventoryItem);

module.exports = router;
