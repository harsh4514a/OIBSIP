const Order = require('../models/Order');
const Cart = require('../models/Cart');
const Notification = require('../models/Notification');
const { generateOrderNumber } = require('../utils/generateOrderNumber');
const { sendOrderConfirmation, sendOrderStatusUpdate, sendInvoiceEmail } = require('../utils/emailService');
const { generateInvoice } = require('../utils/invoiceGenerator');

/**
 * @desc    Create a new order from cart
 * @route   POST /api/v1/orders
 * @access  Private
 */
const createOrder = async (req, res) => {
  try {
    const { deliveryAddress, notes, paymentMethod } = req.body;

    // Get cart
    const cart = await Cart.findOne({ user: req.user._id }).populate('items.pizza');

    if (!cart || cart.items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Your cart is empty.',
      });
    }

    // Validate delivery address
    if (!deliveryAddress || !deliveryAddress.street || !deliveryAddress.city ||
        !deliveryAddress.state || !deliveryAddress.pincode || !deliveryAddress.phone) {
      return res.status(400).json({
        success: false,
        message: 'Complete delivery address is required.',
      });
    }

    // Validate payment method
    const method = paymentMethod === 'cod' ? 'cod' : 'razorpay';

    // Get store settings for delivery fee & threshold
    const Setting = require('../models/Setting');
    const settings = await Setting.findOne() || { deliveryFee: 49, freeDeliveryThreshold: 499, cashOnDelivery: true };
    const threshold = settings.freeDeliveryThreshold;
    const baseDeliveryFee = settings.deliveryFee;

    // Check if COD is enabled when chosen
    if (method === 'cod' && !settings.cashOnDelivery) {
      return res.status(400).json({
        success: false,
        message: 'Cash on Delivery (COD) is currently disabled. Please use an online payment method.',
      });
    }

    // Compute amounts
    const subtotal = cart.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const discountAmount = cart.couponDiscountAmount || Math.round((subtotal * cart.couponDiscount) / 100);
    const deliveryFee = subtotal >= threshold ? 0 : baseDeliveryFee;
    const finalAmount = subtotal - discountAmount + deliveryFee;

    // Generate unique order number
    const orderNumber = await generateOrderNumber();

    // Estimated delivery (30-45 min from now)
    const estimatedDelivery = new Date(Date.now() + 40 * 60 * 1000);

    // Map cart items to order items
    const orderItems = cart.items.map((item) => ({
      pizza: item.pizza ? item.pizza._id || item.pizza : undefined,
      customPizza: item.customPizza || undefined,
      name: item.name,
      image: item.image,
      size: item.size,
      quantity: item.quantity,
      price: item.price,
      customizations: item.customizations,
    }));

    // For COD, set status to confirmed immediately
    const initialStatus = method === 'cod' ? 'confirmed' : 'pending';

    const order = await Order.create({
      orderNumber,
      user: req.user._id,
      items: orderItems,
      totalAmount: subtotal,
      discountAmount,
      deliveryFee,
      finalAmount,
      couponCode: cart.couponCode || undefined,
      couponDiscount: cart.couponDiscount || 0,
      couponDiscountAmount: discountAmount,
      deliveryAddress,
      paymentMethod: method,
      status: initialStatus,
      statusHistory: [{ status: initialStatus, timestamp: new Date(), updatedBy: req.user._id }],
      estimatedDelivery,
      notes: notes || '',
    });

    // Increment Coupon usedCount for COD orders
    if (method === 'cod' && cart.couponCode) {
      const Coupon = require('../models/Coupon');
      await Coupon.findOneAndUpdate(
        { code: cart.couponCode },
        { $inc: { usedCount: 1 } }
      ).catch(err => console.error('Coupon usedCount increment failed:', err));
    }

    // Clear cart
    await Cart.findOneAndUpdate(
      { user: req.user._id },
      { $set: { items: [], couponCode: null, couponDiscount: 0, couponDiscountAmount: 0 } }
    );

    // Emit socket event for new order to admin
    if (req.io) {
      req.io.to('admin-room').emit('new-order', {
        orderNumber: order.orderNumber,
        userId: req.user._id,
        amount: order.finalAmount,
        createdAt: order.createdAt,
      });
    }

    // Create notification for user
    await Notification.create({
      recipient: req.user._id,
      recipientModel: 'User',
      type: 'order-update',
      title: 'Order Placed! 🍕',
      message: `Your order #${orderNumber} has been placed. Total: ₹${finalAmount.toFixed(2)}`,
      relatedOrder: order._id,
    });

    // Send confirmation email (non-blocking)
    sendOrderConfirmation(req.user.email, { ...order.toObject(), user: req.user }).catch(
      (err) => console.error('Email error:', err.message)
    );

    res.status(201).json({
      success: true,
      message: 'Order placed successfully!',
      data: { order },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to create order.',
      error: error.message,
    });
  }
};

/**
 * @desc    Get user's orders (paginated)
 * @route   GET /api/v1/orders
 * @access  Private
 */
const getUserOrders = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const query = { user: req.user._id };
    if (req.query.status) query.status = req.query.status;

    const [orders, total] = await Promise.all([
      Order.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('paymentId', 'status method razorpayPaymentId'),
      Order.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      message: 'Orders retrieved.',
      data: {
        orders,
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
      message: 'Failed to retrieve orders.',
      error: error.message,
    });
  }
};

/**
 * @desc    Get single order by ID
 * @route   GET /api/v1/orders/:id
 * @access  Private
 */
const getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('user', 'name email phone')
      .populate('paymentId')
      .populate('items.pizza', 'name image')
      .populate('items.customPizza');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found.',
      });
    }

    // Non-admin users can only see their own orders
    if (req.user.role !== 'admin' && order.user._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to view this order.',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Order retrieved.',
      data: { order },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve order.',
      error: error.message,
    });
  }
};

/**
 * @desc    Cancel an order (only pending or confirmed)
 * @route   POST /api/v1/orders/:id/cancel
 * @access  Private
 */
const cancelOrder = async (req, res) => {
  try {
    const { reason } = req.body;

    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found.',
      });
    }

    // Check ownership
    if (order.user.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to cancel this order.',
      });
    }

    if (!['pending', 'confirmed'].includes(order.status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot cancel an order that is ${order.status}. Only pending or confirmed orders can be cancelled.`,
      });
    }

    order.status = 'cancelled';
    order.cancelledAt = new Date();
    order.cancellationReason = reason || 'Cancelled by customer';
    order.statusHistory.push({
      status: 'cancelled',
      timestamp: new Date(),
      updatedBy: req.user._id,
      note: reason || 'Cancelled by customer',
    });

    await order.save();

    // Notify via socket
    if (req.io) {
      req.io.to(`order-${order._id}`).emit('order-status-update', {
        orderId: order._id,
        orderNumber: order.orderNumber,
        status: 'cancelled',
      });
    }

    // Notification
    await Notification.create({
      recipient: req.user._id,
      recipientModel: 'User',
      type: 'order-update',
      title: 'Order Cancelled',
      message: `Order #${order.orderNumber} has been cancelled.`,
      relatedOrder: order._id,
    });

    res.status(200).json({
      success: true,
      message: 'Order cancelled successfully.',
      data: { order },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to cancel order.',
      error: error.message,
    });
  }
};

/**
 * @desc    Update order status (admin)
 * @route   PUT /api/v1/orders/:id/status
 * @access  Admin
 */
const updateOrderStatus = async (req, res) => {
  try {
    const { status, note } = req.body;

    const validStatuses = ['pending', 'confirmed', 'preparing', 'out-for-delivery', 'delivered', 'cancelled'];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid order status.',
      });
    }

    const order = await Order.findById(req.params.id).populate('user', 'name email');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found.',
      });
    }

    order.status = status;
    order.statusHistory.push({
      status,
      timestamp: new Date(),
      updatedBy: req.user._id,
      note: note || '',
    });

    if (status === 'delivered') {
      order.deliveredAt = new Date();
      order.paymentStatus = 'paid';
    }

    if (status === 'cancelled') {
      order.cancelledAt = new Date();
      order.cancellationReason = note || 'Cancelled by admin';
    }

    await order.save();

    // Emit socket event
    if (req.io) {
      req.io.to(`order-${order._id}`).emit('order-status-update', {
        orderId: order._id,
        orderNumber: order.orderNumber,
        status,
        timestamp: new Date(),
      });
    }

    // Create notification for user
    if (order.user) {
      await Notification.create({
        recipient: order.user._id,
        recipientModel: 'User',
        type: 'order-update',
        title: `Order ${status.replace(/-/g, ' ')}`,
        message: `Your order #${order.orderNumber} is now ${status.replace(/-/g, ' ')}.`,
        relatedOrder: order._id,
      });

      // Send email update only when status is 'out-for-delivery' or 'delivered' (non-blocking)
      if (['out-for-delivery', 'delivered'].includes(status)) {
        sendOrderStatusUpdate(order.user.email, order.orderNumber, status).catch(
          (err) => console.error('Email error:', err.message)
        );
      }
    }

    res.status(200).json({
      success: true,
      message: `Order status updated to ${status}.`,
      data: { order },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update order status.',
      error: error.message,
    });
  }
};

/**
 * @desc    Get all orders (admin) with filters
 * @route   GET /api/v1/orders/admin/all
 * @access  Admin
 */
const getAllOrders = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const query = {};
    if (req.query.status) query.status = req.query.status;
    if (req.query.paymentStatus) query.paymentStatus = req.query.paymentStatus;
    if (req.query.search) {
      query.orderNumber = { $regex: req.query.search, $options: 'i' };
    }

    // Date range filter
    if (req.query.startDate || req.query.endDate) {
      query.createdAt = {};
      if (req.query.startDate) query.createdAt.$gte = new Date(req.query.startDate);
      if (req.query.endDate) {
        const end = new Date(req.query.endDate);
        end.setHours(23, 59, 59, 999);
        query.createdAt.$lte = end;
      }
    }

    const [orders, total] = await Promise.all([
      Order.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('user', 'name email phone')
        .populate('paymentId', 'status method'),
      Order.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      message: 'All orders retrieved.',
      data: {
        orders,
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
      message: 'Failed to retrieve orders.',
      error: error.message,
    });
  }
};

/**
 * @desc    Get order analytics (admin)
 * @route   GET /api/v1/orders/admin/analytics
 * @access  Admin
 */
const getOrderAnalytics = async (req, res) => {
  try {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const [statusBreakdown, dailyRevenue, totalRevenue] = await Promise.all([
      Order.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      Order.aggregate([
        {
          $match: {
            createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
            paymentStatus: 'paid',
          },
        },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            revenue: { $sum: '$finalAmount' },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      Order.aggregate([
        { $match: { paymentStatus: 'paid' } },
        { $group: { _id: null, total: { $sum: '$finalAmount' }, count: { $sum: 1 } } },
      ]),
    ]);

    res.status(200).json({
      success: true,
      message: 'Analytics retrieved.',
      data: {
        statusBreakdown,
        dailyRevenue,
        totalRevenue: totalRevenue[0] || { total: 0, count: 0 },
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve analytics.',
      error: error.message,
    });
  }
};

/**
 * @desc    Download order invoice as PDF
 * @route   GET /api/v1/orders/:id/invoice
 * @access  Private
 */
const downloadInvoice = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).populate('user', 'name email');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found.',
      });
    }

    // Check ownership
    if (req.user.role !== 'admin' && order.user._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized.',
      });
    }

    const pdfBuffer = await generateInvoice(order);

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="PizzaHub-Invoice-${order.orderNumber}.pdf"`,
      'Content-Length': pdfBuffer.length,
    });

    res.send(pdfBuffer);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to generate invoice.',
      error: error.message,
    });
  }
};

/**
 * @desc    Assign delivery agent (admin)
 * @route   PATCH /api/v1/orders/:id/assign-delivery
 * @access  Admin
 */
const assignDelivery = async (req, res) => {
  try {
    const { deliveryAgent } = req.body;

    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { $set: { deliveryAgent } },
      { new: true }
    );

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found.',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Delivery agent assigned.',
      data: { order },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to assign delivery agent.',
      error: error.message,
    });
  }
};

module.exports = {
  createOrder,
  getUserOrders,
  getOrderById,
  cancelOrder,
  updateOrderStatus,
  getAllOrders,
  getOrderAnalytics,
  downloadInvoice,
  assignDelivery,
};
