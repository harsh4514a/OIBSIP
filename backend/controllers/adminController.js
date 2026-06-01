const Order = require('../models/Order');
const User = require('../models/User');
const Pizza = require('../models/Pizza');

/**
 * @desc    Get admin dashboard stats
 * @route   GET /api/v1/admin/dashboard
 * @access  Admin
 */
const getDashboardStats = async (req, res) => {
  try {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - 7);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      ordersToday,
      ordersWeek,
      ordersMonth,
      revenueToday,
      revenueWeek,
      revenueMonth,
      revenueTotal,
      totalUsers,
      activeOrders,
      totalPizzas,
      topPizzasRaw,
    ] = await Promise.all([
      Order.countDocuments({ createdAt: { $gte: startOfToday } }),
      Order.countDocuments({ createdAt: { $gte: startOfWeek } }),
      Order.countDocuments({ createdAt: { $gte: startOfMonth } }),
      Order.aggregate([
        { $match: { createdAt: { $gte: startOfToday }, paymentStatus: 'paid' } },
        { $group: { _id: null, total: { $sum: '$finalAmount' } } },
      ]),
      Order.aggregate([
        { $match: { createdAt: { $gte: startOfWeek }, paymentStatus: 'paid' } },
        { $group: { _id: null, total: { $sum: '$finalAmount' } } },
      ]),
      Order.aggregate([
        { $match: { createdAt: { $gte: startOfMonth }, paymentStatus: 'paid' } },
        { $group: { _id: null, total: { $sum: '$finalAmount' } } },
      ]),
      Order.aggregate([
        { $match: { paymentStatus: 'paid' } },
        { $group: { _id: null, total: { $sum: '$finalAmount' } } },
      ]),
      User.countDocuments({ role: 'user' }),
      Order.countDocuments({ status: { $in: ['pending', 'confirmed', 'preparing', 'out-for-delivery'] } }),
      Pizza.countDocuments({ isAvailable: true }),
      Order.aggregate([
        { $unwind: '$items' },
        { $match: { 'items.pizza': { $exists: true } } },
        { $group: { _id: '$items.pizza', totalOrdered: { $sum: '$items.quantity' }, name: { $first: '$items.name' } } },
        { $sort: { totalOrdered: -1 } },
        { $limit: 5 },
      ]),
    ]);

    res.status(200).json({
      success: true,
      message: 'Dashboard stats retrieved.',
      data: {
        orders: {
          today: ordersToday,
          week: ordersWeek,
          month: ordersMonth,
        },
        revenue: {
          today: revenueToday[0]?.total || 0,
          week: revenueWeek[0]?.total || 0,
          month: revenueMonth[0]?.total || 0,
          total: revenueTotal[0]?.total || 0,
        },
        totalUsers,
        activeOrders,
        totalPizzas,
        topPizzas: topPizzasRaw,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get dashboard stats.',
      error: error.message,
    });
  }
};

/**
 * @desc    Get revenue chart data (last 30 days)
 * @route   GET /api/v1/admin/revenue-chart
 * @access  Admin
 */
const getRevenueChart = async (req, res) => {
  try {
    const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const data = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate },
          paymentStatus: 'paid',
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          revenue: { $sum: '$finalAmount' },
          orders: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Fill missing dates with 0
    const result = [];
    const today = new Date();
    for (let i = 29; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const existing = data.find((item) => item._id === dateStr);
      result.push({
        date: dateStr,
        revenue: existing ? existing.revenue : 0,
        orders: existing ? existing.orders : 0,
      });
    }

    res.status(200).json({
      success: true,
      message: 'Revenue chart data retrieved.',
      data: { chart: result },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get revenue chart.',
      error: error.message,
    });
  }
};

/**
 * @desc    Get order status breakdown chart
 * @route   GET /api/v1/admin/order-status-chart
 * @access  Admin
 */
const getOrderStatusChart = async (req, res) => {
  try {
    const data = await Order.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    const allStatuses = ['pending', 'confirmed', 'preparing', 'out-for-delivery', 'delivered', 'cancelled'];
    const result = allStatuses.map((status) => {
      const found = data.find((d) => d._id === status);
      return { status, count: found ? found.count : 0 };
    });

    res.status(200).json({
      success: true,
      message: 'Order status chart retrieved.',
      data: { chart: result },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get order status chart.',
      error: error.message,
    });
  }
};

/**
 * @desc    Get top selling pizzas
 * @route   GET /api/v1/admin/top-pizzas
 * @access  Admin
 */
const getTopPizzas = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;

    const topPizzas = await Order.aggregate([
      { $unwind: '$items' },
      { $match: { 'items.pizza': { $exists: true } } },
      {
        $group: {
          _id: '$items.pizza',
          name: { $first: '$items.name' },
          image: { $first: '$items.image' },
          totalOrdered: { $sum: '$items.quantity' },
          totalRevenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } },
        },
      },
      { $sort: { totalOrdered: -1 } },
      { $limit: limit },
    ]);

    res.status(200).json({
      success: true,
      message: 'Top pizzas retrieved.',
      data: { topPizzas },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get top pizzas.',
      error: error.message,
    });
  }
};

/**
 * @desc    Get recent 10 orders
 * @route   GET /api/v1/admin/recent-orders
 * @access  Admin
 */
const getRecentOrders = async (req, res) => {
  try {
    const orders = await Order.find()
      .sort({ createdAt: -1 })
      .limit(10)
      .populate('user', 'name email')
      .select('orderNumber status paymentStatus finalAmount createdAt user');

    res.status(200).json({
      success: true,
      message: 'Recent orders retrieved.',
      data: { orders },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get recent orders.',
      error: error.message,
    });
  }
};

/**
 * @desc    Get monthly sales analytics (last 12 months)
 * @route   GET /api/v1/admin/analytics
 * @access  Admin
 */
const getSalesAnalytics = async (req, res) => {
  try {
    const startDate = new Date();
    startDate.setFullYear(startDate.getFullYear() - 1);
    startDate.setDate(1);
    startDate.setHours(0, 0, 0, 0);

    const data = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate },
          paymentStatus: 'paid',
        },
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
          },
          revenue: { $sum: '$finalAmount' },
          orders: { $sum: 1 },
          avgOrderValue: { $avg: '$finalAmount' },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]);

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const result = data.map((item) => ({
      year: item._id.year,
      month: months[item._id.month - 1],
      monthNumber: item._id.month,
      revenue: Math.round(item.revenue * 100) / 100,
      orders: item.orders,
      avgOrderValue: Math.round(item.avgOrderValue * 100) / 100,
    }));

    res.status(200).json({
      success: true,
      message: 'Sales analytics retrieved.',
      data: { analytics: result },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get sales analytics.',
      error: error.message,
    });
  }
};

module.exports = {
  getDashboardStats,
  getRevenueChart,
  getOrderStatusChart,
  getTopPizzas,
  getRecentOrders,
  getSalesAnalytics,
};
