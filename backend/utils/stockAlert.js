const Inventory = require('../models/Inventory');
const { sendLowStockAlert } = require('./emailService');

/**
 * Check inventory for low stock items and send alert email to admin
 * @returns {Promise<Array>} Low stock items found
 */
const checkAndAlertLowStock = async () => {
  try {
    // Find items where currentStock <= threshold and are active
    const lowStockItems = await Inventory.find({
      $expr: { $lte: ['$currentStock', '$threshold'] },
      isActive: true,
    });

    if (lowStockItems.length === 0) {
      console.log('✅ All inventory items are adequately stocked.');
      return [];
    }

    console.warn(`⚠️  Low stock alert: ${lowStockItems.length} item(s) below threshold.`);

    const adminEmail = process.env.ADMIN_EMAIL || 'admin@pizzahub.com';
    await sendLowStockAlert(adminEmail, lowStockItems);

    console.log(`📧 Low stock alert sent to ${adminEmail}`);

    return lowStockItems;
  } catch (error) {
    console.error('❌ Error checking low stock:', error.message);
    throw error;
  }
};

module.exports = { checkAndAlertLowStock };
