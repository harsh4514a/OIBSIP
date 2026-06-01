const crypto = require('crypto');
const getRazorpay = require('../config/razorpay');
const Payment = require('../models/Payment');
const Order = require('../models/Order');
const Cart = require('../models/Cart');
const Notification = require('../models/Notification');
const { generateOrderNumber } = require('../utils/generateOrderNumber');
const { sendOrderConfirmation } = require('../utils/emailService');

/**
 * @desc    Initiate payment — creates Razorpay order from cart WITHOUT creating app order
 * @route   POST /api/v1/payments/initiate
 * @access  Private
 */
const initiatePayment = async (req, res) => {
  try {
    const { deliveryAddress } = req.body;

    // Validate delivery address
    if (!deliveryAddress || !deliveryAddress.street || !deliveryAddress.city ||
        !deliveryAddress.state || !deliveryAddress.pincode || !deliveryAddress.phone) {
      return res.status(400).json({
        success: false,
        message: 'Complete delivery address is required.',
      });
    }

    // Get cart
    const cart = await Cart.findOne({ user: req.user._id }).populate('items.pizza');

    if (!cart || cart.items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Your cart is empty.',
      });
    }

    // Get store settings
    const Setting = require('../models/Setting');
    const settings = await Setting.findOne() || { deliveryFee: 49, freeDeliveryThreshold: 499 };
    const threshold = settings.freeDeliveryThreshold;
    const baseDeliveryFee = settings.deliveryFee;

    // Compute amounts
    const subtotal = cart.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const discountAmount = Math.round((subtotal * cart.couponDiscount) / 100);
    const deliveryFee = subtotal >= threshold ? 0 : baseDeliveryFee;
    const finalAmount = subtotal - discountAmount + deliveryFee;

    // Create Razorpay order (amount in paise)
    const razorpay = getRazorpay();
    if (!razorpay) return res.status(503).json({ success: false, message: 'Payment service not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in .env' });

    const razorpayOrder = await razorpay.orders.create({
      amount: Math.round(finalAmount * 100),
      currency: 'INR',
      receipt: `rcpt_${req.user._id.toString().slice(-6)}_${Date.now()}`,
      notes: {
        userId: req.user._id.toString(),
        deliveryAddress: JSON.stringify(deliveryAddress),
        couponCode: cart.couponCode || '',
        couponDiscount: String(cart.couponDiscount || 0),
        couponDiscountAmount: String(cart.couponDiscountAmount || 0),
      },
    });

    // Save payment record (no order linked yet)
    const payment = await Payment.create({
      user: req.user._id,
      razorpayOrderId: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      status: 'created',
      notes: {
        deliveryAddress,
        couponCode: cart.couponCode || null,
        couponDiscount: cart.couponDiscount || 0,
        couponDiscountAmount: cart.couponDiscountAmount || 0,
      },
    });

    res.status(200).json({
      success: true,
      message: 'Payment initiated.',
      data: {
        razorpayOrderId: razorpayOrder.id,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
        razorpayKeyId: process.env.RAZORPAY_KEY_ID,
        paymentId: payment._id,
        finalAmount,
        user: {
          name: req.user.name,
          email: req.user.email,
          phone: req.user.phone || '',
        },
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to initiate payment.',
      error: error.message,
    });
  }
};

/**
 * @desc    Create Razorpay order (legacy — for existing orders)
 * @route   POST /api/v1/payments/create-order
 * @access  Private
 */
const createRazorpayOrder = async (req, res) => {
  try {
    const { orderId } = req.body;

    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found.',
      });
    }

    if (order.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized.',
      });
    }

    if (order.paymentStatus === 'paid') {
      return res.status(400).json({
        success: false,
        message: 'This order is already paid.',
      });
    }

    const razorpay = getRazorpay();
    if (!razorpay) return res.status(503).json({ success: false, message: 'Payment service not configured.' });

    const razorpayOrder = await razorpay.orders.create({
      amount: Math.round(order.finalAmount * 100),
      currency: 'INR',
      receipt: order.orderNumber,
      notes: {
        orderId: order._id.toString(),
        userId: req.user._id.toString(),
        orderNumber: order.orderNumber,
      },
    });

    const payment = await Payment.create({
      order: order._id,
      user: req.user._id,
      razorpayOrderId: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      status: 'created',
    });

    order.paymentId = payment._id;
    await order.save();

    res.status(200).json({
      success: true,
      message: 'Razorpay order created.',
      data: {
        razorpayOrderId: razorpayOrder.id,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
        razorpayKeyId: process.env.RAZORPAY_KEY_ID,
        orderNumber: order.orderNumber,
        paymentId: payment._id,
        user: {
          name: req.user.name,
          email: req.user.email,
          phone: req.user.phone || '',
        },
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to create Razorpay order.',
      error: error.message,
    });
  }
};

/**
 * @desc    Verify Razorpay payment signature and create order if needed
 * @route   POST /api/v1/payments/verify
 * @access  Private
 */
const verifyPayment = async (req, res) => {
  try {
    const razorpayOrderId = req.body.razorpayOrderId || req.body.razorpay_order_id;
    const razorpayPaymentId = req.body.razorpayPaymentId || req.body.razorpay_payment_id;
    const razorpaySignature = req.body.razorpaySignature || req.body.razorpay_signature;

    // Verify signature
    const body = razorpayOrderId + '|' + razorpayPaymentId;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest('hex');

    if (expectedSignature !== razorpaySignature) {
      if (razorpayOrderId) {
        await Payment.findOneAndUpdate(
          { razorpayOrderId },
          { $set: { status: 'failed' } }
        );
      }

      return res.status(400).json({
        success: false,
        message: 'Payment verification failed. Invalid signature.',
      });
    }

    // Update payment status
    const payment = await Payment.findOneAndUpdate(
      { razorpayOrderId },
      {
        $set: {
          razorpayPaymentId,
          razorpaySignature,
          status: 'paid',
        },
      },
      { new: true }
    );

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment record not found.',
      });
    }

    let order;

    if (payment.order) {
      // Legacy flow: order was already created before payment
      order = await Order.findById(payment.order).populate('user', 'name email');

      if (order && order.paymentStatus !== 'paid') {
        order.paymentStatus = 'paid';
        order.status = 'confirmed';
        order.statusHistory.push({
          status: 'confirmed',
          timestamp: new Date(),
          note: 'Payment received',
        });
        await order.save();

        // Increment Coupon usedCount
        if (order.couponCode) {
          const Coupon = require('../models/Coupon');
          await Coupon.findOneAndUpdate(
            { code: order.couponCode },
            { $inc: { usedCount: 1 } }
          ).catch(err => console.error('Coupon usedCount increment failed:', err));
        }
      }
    } else {
      // New flow: create order NOW after successful payment
      const cart = await Cart.findOne({ user: req.user._id }).populate('items.pizza');

      if (!cart || cart.items.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Cart is empty. Cannot create order.',
        });
      }

      const deliveryAddress = payment.notes?.deliveryAddress;
      if (!deliveryAddress) {
        return res.status(400).json({
          success: false,
          message: 'Delivery address not found in payment record.',
        });
      }

      // Get store settings
      const Setting = require('../models/Setting');
      const settings = await Setting.findOne() || { deliveryFee: 49, freeDeliveryThreshold: 499 };
      const threshold = settings.freeDeliveryThreshold;
      const baseDeliveryFee = settings.deliveryFee;

      // Compute amounts
      const subtotal = cart.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
      const couponDiscount = payment.notes?.couponDiscount || cart.couponDiscount || 0;
      const couponDiscountAmount = payment.notes?.couponDiscountAmount || cart.couponDiscountAmount || 0;
      const couponCode = payment.notes?.couponCode || cart.couponCode || undefined;
      const discountAmount = couponDiscountAmount || Math.round((subtotal * couponDiscount) / 100);
      const deliveryFee = subtotal >= threshold ? 0 : baseDeliveryFee;
      const finalAmount = subtotal - discountAmount + deliveryFee;

      const orderNumber = await generateOrderNumber();
      const estimatedDelivery = new Date(Date.now() + 40 * 60 * 1000);

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

      order = await Order.create({
        orderNumber,
        user: req.user._id,
        items: orderItems,
        totalAmount: subtotal,
        discountAmount,
        deliveryFee,
        finalAmount,
        couponCode,
        couponDiscount,
        couponDiscountAmount: discountAmount,
        deliveryAddress,
        paymentMethod: 'razorpay',
        status: 'confirmed',
        paymentStatus: 'paid',
        paymentId: payment._id,
        statusHistory: [
          { status: 'pending', timestamp: new Date(), updatedBy: req.user._id, note: 'Order initiated' },
          { status: 'confirmed', timestamp: new Date(), updatedBy: req.user._id, note: 'Payment received' },
        ],
        estimatedDelivery,
      });

      // Increment Coupon usedCount
      if (couponCode) {
        const Coupon = require('../models/Coupon');
        await Coupon.findOneAndUpdate(
          { code: couponCode },
          { $inc: { usedCount: 1 } }
        ).catch(err => console.error('Coupon usedCount increment failed:', err));
      }

      // Link payment to order
      payment.order = order._id;
      await payment.save();

      // Clear cart
      await Cart.findOneAndUpdate(
        { user: req.user._id },
        { $set: { items: [], couponCode: null, couponDiscount: 0, couponDiscountAmount: 0 } }
      );

      // Populate user for email
      await order.populate('user', 'name email');
    }

    if (order) {
      // Emit socket events
      if (req.io) {
        req.io.to(`order-${order._id}`).emit('order-status-update', {
          orderId: order._id,
          orderNumber: order.orderNumber,
          status: 'confirmed',
          paymentStatus: 'paid',
        });

        req.io.to('admin-room').emit('new-order', {
          orderNumber: order.orderNumber,
          userId: req.user._id,
          amount: order.finalAmount,
          createdAt: order.createdAt,
        });

        req.io.to('admin-room').emit('payment-received', {
          orderNumber: order.orderNumber,
          amount: order.finalAmount,
        });
      }

      // Send confirmation email
      const userEmail = order.user?.email || req.user.email;
      if (userEmail) {
        sendOrderConfirmation(userEmail, { ...order.toObject(), user: order.user || req.user }).catch(
          (err) => console.error('Email error:', err.message)
        );
      }

      // Notification
      await Notification.create({
        recipient: req.user._id,
        recipientModel: 'User',
        type: 'payment',
        title: '💰 Payment Successful!',
        message: `Payment of ₹${order.finalAmount.toFixed(2)} for order #${order.orderNumber} was successful.`,
        relatedOrder: order._id,
      });
    }

    res.status(200).json({
      success: true,
      message: 'Payment verified successfully!',
      data: {
        payment,
        orderId: order?._id || payment.order,
        orderNumber: order?.orderNumber,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Payment verification error.',
      error: error.message,
    });
  }
};

/**
 * @desc    Get payment details for an order
 * @route   GET /api/v1/payments/:orderId
 * @access  Private
 */
const getPaymentDetails = async (req, res) => {
  try {
    const payment = await Payment.findOne({ order: req.params.orderId })
      .populate('order', 'orderNumber finalAmount status')
      .populate('user', 'name email');

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found.',
      });
    }

    if (payment.user._id.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized.',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Payment details retrieved.',
      data: { payment },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve payment details.',
      error: error.message,
    });
  }
};

/**
 * @desc    Handle payment failure
 * @route   POST /api/v1/payments/failure
 * @access  Private
 */
const handlePaymentFailure = async (req, res) => {
  try {
    const razorpayOrderId = req.body.razorpayOrderId || req.body.razorpay_order_id;

    if (razorpayOrderId) {
      await Payment.findOneAndUpdate(
        { razorpayOrderId },
        { $set: { status: 'failed' } }
      );
    }

    res.status(200).json({
      success: true,
      message: 'Payment failure recorded.',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to record payment failure.',
      error: error.message,
    });
  }
};

module.exports = {
  initiatePayment,
  createRazorpayOrder,
  verifyPayment,
  getPaymentDetails,
  handlePaymentFailure,
};
