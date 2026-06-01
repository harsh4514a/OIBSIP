const Order = require('../models/Order');

/**
 * Generate a unique, readable order number
 * Format: PZA-YYYYMMDD-XXXX (e.g., PZA-20240522-0001)
 * @returns {Promise<string>} Unique order number
 */
const generateOrderNumber = async () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const dateStr = `${year}${month}${day}`;

  // Count orders created today
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfDay = new Date(startOfDay);
  endOfDay.setDate(endOfDay.getDate() + 1);

  const todayCount = await Order.countDocuments({
    createdAt: { $gte: startOfDay, $lt: endOfDay },
  });

  let sequenceNum = todayCount + 1;
  let orderNumber;
  let exists = true;

  while (exists) {
    const sequence = String(sequenceNum).padStart(4, '0');
    orderNumber = `PZA-${dateStr}-${sequence}`;
    
    // Check if this orderNumber already exists
    const existingOrder = await Order.findOne({ orderNumber });
    if (!existingOrder) {
      exists = false;
    } else {
      sequenceNum++;
    }
  }

  return orderNumber;
};

module.exports = { generateOrderNumber };
