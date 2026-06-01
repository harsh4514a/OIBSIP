const Inventory = require('../models/Inventory');
const { checkAndAlertLowStock } = require('../utils/stockAlert');

/**
 * @desc    Get all inventory items (paginated)
 * @route   GET /api/v1/inventory
 * @access  Admin
 */
const getAllInventory = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const query = {};
    if (req.query.type) query.ingredientType = req.query.type;
    if (req.query.isActive !== undefined) query.isActive = req.query.isActive === 'true';
    if (req.query.search) query.name = { $regex: req.query.search, $options: 'i' };

    const [items, total] = await Promise.all([
      Inventory.find(query).select('-history').sort({ ingredientType: 1, name: 1 }).skip(skip).limit(limit),
      Inventory.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      message: 'Inventory retrieved.',
      data: {
        items,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve inventory.',
      error: error.message,
    });
  }
};

/**
 * @desc    Get single inventory item with history
 * @route   GET /api/v1/inventory/:id
 * @access  Admin
 */
const getInventoryItem = async (req, res) => {
  try {
    const item = await Inventory.findById(req.params.id)
      .populate('history.performedBy', 'name email');

    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Inventory item not found.',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Inventory item retrieved.',
      data: { item },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve inventory item.',
      error: error.message,
    });
  }
};

/**
 * @desc    Add new inventory item (admin)
 * @route   POST /api/v1/inventory
 * @access  Admin
 */
const addInventoryItem = async (req, res) => {
  try {
    const { ingredientType, name, currentStock, unit, threshold, pricePerUnit } = req.body;

    const item = await Inventory.create({
      ingredientType,
      name,
      currentStock,
      unit,
      threshold,
      pricePerUnit,
      history: [
        {
          action: 'add',
          quantity: currentStock,
          reason: 'Initial stock',
          performedBy: req.user._id,
        },
      ],
    });

    res.status(201).json({
      success: true,
      message: 'Inventory item added.',
      data: { item },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to add inventory item.',
      error: error.message,
    });
  }
};

/**
 * @desc    Update stock (admin)
 * @route   PUT /api/v1/inventory/:id/stock
 * @access  Admin
 */
const updateStock = async (req, res) => {
  try {
    const { action, quantity, reason } = req.body;

    if (!['add', 'deduct', 'adjust'].includes(action)) {
      return res.status(400).json({
        success: false,
        message: 'Action must be add, deduct, or adjust.',
      });
    }

    const item = await Inventory.findById(req.params.id);

    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Inventory item not found.',
      });
    }

    if (action === 'add') {
      item.currentStock += quantity;
    } else if (action === 'deduct') {
      if (item.currentStock < quantity) {
        return res.status(400).json({
          success: false,
          message: `Cannot deduct ${quantity} ${item.unit}. Only ${item.currentStock} ${item.unit} in stock.`,
        });
      }
      item.currentStock -= quantity;
    } else if (action === 'adjust') {
      item.currentStock = quantity;
    }

    item.history.push({
      action,
      quantity,
      reason: reason || `${action} stock`,
      performedBy: req.user._id,
    });

    await item.save();

    // Check for low stock after update
    if (item.currentStock <= item.threshold) {
      checkAndAlertLowStock().catch((err) => console.error('Stock alert error:', err.message));
    }

    res.status(200).json({
      success: true,
      message: 'Stock updated.',
      data: { item },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update stock.',
      error: error.message,
    });
  }
};

/**
 * @desc    Delete inventory item (admin)
 * @route   DELETE /api/v1/inventory/:id
 * @access  Admin
 */
const deleteInventoryItem = async (req, res) => {
  try {
    const item = await Inventory.findById(req.params.id);

    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Inventory item not found.',
      });
    }

    // Soft delete
    item.isActive = false;
    await item.save();

    res.status(200).json({
      success: true,
      message: 'Inventory item deactivated.',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to delete inventory item.',
      error: error.message,
    });
  }
};

/**
 * @desc    Get items below threshold (low stock)
 * @route   GET /api/v1/inventory/low-stock
 * @access  Admin
 */
const getLowStockItems = async (req, res) => {
  try {
    const items = await Inventory.find({
      $expr: { $lte: ['$currentStock', '$threshold'] },
      isActive: true,
    }).select('-history');

    res.status(200).json({
      success: true,
      message: 'Low stock items retrieved.',
      data: {
        items,
        count: items.length,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve low stock items.',
      error: error.message,
    });
  }
};

/**
 * @desc    Get history for an inventory item
 * @route   GET /api/v1/inventory/:id/history
 * @access  Admin
 */
const getInventoryHistory = async (req, res) => {
  try {
    const item = await Inventory.findById(req.params.id)
      .select('name unit history')
      .populate('history.performedBy', 'name email');

    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Inventory item not found.',
      });
    }

    // Sort history by date descending
    const sortedHistory = item.history.sort((a, b) => new Date(b.date) - new Date(a.date));

    res.status(200).json({
      success: true,
      message: 'Inventory history retrieved.',
      data: {
        name: item.name,
        unit: item.unit,
        history: sortedHistory,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve history.',
      error: error.message,
    });
  }
};

/**
 * @desc    Manually trigger low stock email alert (admin)
 * @route   POST /api/v1/inventory/trigger-alert
 * @access  Admin
 */
const triggerStockAlert = async (req, res) => {
  try {
    const lowStockItems = await checkAndAlertLowStock();

    res.status(200).json({
      success: true,
      message: lowStockItems.length > 0
        ? `Low stock alert sent for ${lowStockItems.length} item(s).`
        : 'All items are adequately stocked. No alert sent.',
      data: { lowStockItems },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to trigger stock alert.',
      error: error.message,
    });
  }
};

module.exports = {
  getAllInventory,
  getInventoryItem,
  addInventoryItem,
  updateStock,
  deleteInventoryItem,
  getLowStockItems,
  getInventoryHistory,
  triggerStockAlert,
};
