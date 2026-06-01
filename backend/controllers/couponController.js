const Coupon = require('../models/Coupon');
const Order = require('../models/Order');
const Cart = require('../models/Cart');

/**
 * Helper to calculate user lifetime spending from paid/delivered orders
 */
const calculateLifetimeSpending = async (userId) => {
  const userOrders = await Order.find({
    user: userId,
    status: 'delivered',
    paymentStatus: 'paid'
  });
  return userOrders.reduce((sum, order) => sum + order.finalAmount, 0);
};

/**
 * Helper to count how many times a user has used a specific coupon code
 */
const countUserCouponUsage = async (userId, couponCode) => {
  return await Order.countDocuments({
    user: userId,
    couponCode: couponCode.toUpperCase().trim(),
    status: { $ne: 'cancelled' }
  });
};

/**
 * Helper to calculate the coupon discount value
 */
const calculateDiscount = (subtotal, coupon) => {
  let discountAmount = 0;
  if (coupon.discountType === 'percentage') {
    discountAmount = Math.round((subtotal * coupon.discountValue) / 100);
    if (coupon.maxDiscount) {
      discountAmount = Math.min(discountAmount, coupon.maxDiscount);
    }
  } else {
    discountAmount = Math.min(coupon.discountValue, subtotal);
  }
  return discountAmount;
};

/**
 * @desc    Get user's eligible and locked coupons
 * @route   GET /api/v1/coupons/eligible
 * @access  Private
 */
const getEligibleCoupons = async (req, res) => {
  try {
    const userId = req.user._id;
    const now = new Date();

    // Get lifetime spending
    const totalSpent = await calculateLifetimeSpending(userId);

    // Get current cart subtotal and populate pizza details for premium validation
    const cart = await Cart.findOne({ user: userId }).populate('items.pizza');
    const cartSubtotal = cart ? cart.items.reduce((sum, item) => sum + item.price * item.quantity, 0) : 0;

    // Get all coupons from DB
    const coupons = await Coupon.find();

    const available = [];
    const locked = [];
    const used = [];
    const expired = [];

    // Count user non-cancelled orders to verify first-order eligibility
    const ordersCount = await Order.countDocuments({ user: userId, status: { $ne: 'cancelled' } });
    const isFirstTimeUser = ordersCount === 0;

    // Verify if today is weekend
    const isWeekend = now.getDay() === 0 || now.getDay() === 6;

    // Verify if cart has premium (category: 'premium' or 'signature') pizza
    const hasPremiumPizza = cart ? cart.items.some(item => item.pizza && ['premium', 'signature'].includes(item.pizza.category)) : false;

    for (const coupon of coupons) {
      const isExpired = new Date(coupon.expiryDate) < now;
      const isUserLimitReached = await countUserCouponUsage(userId, coupon.code) >= coupon.usagePerUser;
      const isOverallLimitReached = coupon.usageLimit && coupon.usedCount >= coupon.usageLimit;
      const isUserNotAllowed = coupon.allowedUsers.length > 0 && !coupon.allowedUsers.includes(userId);

      // 1. Expired / Inactive / Overall Limit Reached / User Restrictive
      if (isExpired || !coupon.isActive || isOverallLimitReached || isUserNotAllowed) {
        expired.push({
          _id: coupon._id,
          title: coupon.title,
          code: coupon.code,
          description: coupon.description,
          discountType: coupon.discountType,
          discountValue: coupon.discountValue,
          maxDiscount: coupon.maxDiscount,
          expiryDate: coupon.expiryDate,
          isFirstOrderOnly: coupon.isFirstOrderOnly,
          isWeekendOnly: coupon.isWeekendOnly,
          isPremiumOnly: coupon.isPremiumOnly,
          terms: coupon.terms,
          reason: isExpired ? 'Expired' : isOverallLimitReached ? 'Coupon fully claimed' : 'Coupon deactivated'
        });
        continue;
      }

      // 2. Used (reached user limit)
      if (isUserLimitReached) {
        used.push({
          _id: coupon._id,
          title: coupon.title,
          code: coupon.code,
          description: coupon.description,
          discountType: coupon.discountType,
          discountValue: coupon.discountValue,
          maxDiscount: coupon.maxDiscount,
          expiryDate: coupon.expiryDate,
          isFirstOrderOnly: coupon.isFirstOrderOnly,
          isWeekendOnly: coupon.isWeekendOnly,
          isPremiumOnly: coupon.isPremiumOnly,
          terms: coupon.terms,
        });
        continue;
      }

      // 3. Locked (cart value, lifetime spending, first order, weekend, or premium requirements are not met)
      const isCartValueUnmet = cartSubtotal < coupon.minCartValue;
      const isLifetimeSpendingUnmet = totalSpent < coupon.minLifetimeSpending;
      const isFirstOrderOnlyUnmet = coupon.isFirstOrderOnly && !isFirstTimeUser;
      const isWeekendOnlyUnmet = coupon.isWeekendOnly && !isWeekend;
      const isPremiumOnlyUnmet = coupon.isPremiumOnly && !hasPremiumPizza;

      if (isCartValueUnmet || isLifetimeSpendingUnmet || isFirstOrderOnlyUnmet || isWeekendOnlyUnmet || isPremiumOnlyUnmet) {
        const neededCartAmount = coupon.minCartValue - cartSubtotal;
        const neededLifetimeSpent = coupon.minLifetimeSpending - totalSpent;

        locked.push({
          _id: coupon._id,
          title: coupon.title,
          code: coupon.code,
          description: coupon.description,
          discountType: coupon.discountType,
          discountValue: coupon.discountValue,
          maxDiscount: coupon.maxDiscount,
          expiryDate: coupon.expiryDate,
          minCartValue: coupon.minCartValue,
          minLifetimeSpending: coupon.minLifetimeSpending,
          isFirstOrderOnly: coupon.isFirstOrderOnly,
          isWeekendOnly: coupon.isWeekendOnly,
          isPremiumOnly: coupon.isPremiumOnly,
          terms: coupon.terms,
          isCartValueUnmet,
          isLifetimeSpendingUnmet,
          isFirstOrderOnlyUnmet,
          isWeekendOnlyUnmet,
          isPremiumOnlyUnmet,
          cartProgress: isFirstOrderOnlyUnmet ? 0 : Math.min(100, Math.round((cartSubtotal / coupon.minCartValue) * 100)) || 0,
          lifetimeSpentProgress: isFirstOrderOnlyUnmet ? 0 : Math.min(100, Math.round((totalSpent / coupon.minLifetimeSpending) * 100)) || 0,
          currentCartSubtotal: cartSubtotal,
          currentLifetimeSpent: totalSpent,
          neededCartAmount: neededCartAmount > 0 && !isFirstOrderOnlyUnmet ? neededCartAmount : 0,
          neededLifetimeSpent: neededLifetimeSpent > 0 && !isFirstOrderOnlyUnmet ? neededLifetimeSpent : 0
        });
        continue;
      }

      // 4. Available (all checks passed)
      const computedDiscount = calculateDiscount(cartSubtotal, coupon);
      available.push({
        _id: coupon._id,
        title: coupon.title,
        code: coupon.code,
        description: coupon.description,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
        maxDiscount: coupon.maxDiscount,
        expiryDate: coupon.expiryDate,
        minCartValue: coupon.minCartValue,
        minLifetimeSpending: coupon.minLifetimeSpending,
        isFirstOrderOnly: coupon.isFirstOrderOnly,
        isWeekendOnly: coupon.isWeekendOnly,
        isPremiumOnly: coupon.isPremiumOnly,
        terms: coupon.terms,
        computedDiscount
      });
    }

    res.status(200).json({
      success: true,
      data: {
        available,
        locked,
        used,
        expired,
        lifetimeSpent: totalSpent,
        cartSubtotal
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch coupons.',
      error: error.message
    });
  }
};

/**
 * @desc    Validate a manual coupon input
 * @route   POST /api/v1/coupons/validate
 * @access  Private
 */
const validateCoupon = async (req, res) => {
  try {
    const { code } = req.body;
    const userId = req.user._id;
    const now = new Date();

    if (!code) {
      return res.status(400).json({
        success: false,
        message: 'Coupon code is required.'
      });
    }

    const coupon = await Coupon.findOne({ code: code.toUpperCase().trim() });

    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: 'Invalid coupon code. Please try another one.'
      });
    }

    if (!coupon.isActive) {
      return res.status(400).json({
        success: false,
        message: 'This coupon code is currently inactive.'
      });
    }

    if (new Date(coupon.expiryDate) < now) {
      return res.status(400).json({
        success: false,
        message: 'This coupon code has expired.'
      });
    }

    if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
      return res.status(400).json({
        success: false,
        message: 'This coupon has reached its usage limit.'
      });
    }

    if (coupon.allowedUsers.length > 0 && !coupon.allowedUsers.includes(userId)) {
      return res.status(403).json({
        success: false,
        message: 'You are not eligible for this coupon.'
      });
    }

    // Check user usage limit
    const userUsageCount = await countUserCouponUsage(userId, coupon.code);
    if (userUsageCount >= coupon.usagePerUser) {
      return res.status(400).json({
        success: false,
        message: `You have already used this coupon code the maximum of ${coupon.usagePerUser} time(s).`
      });
    }

    // Check first order condition
    if (coupon.isFirstOrderOnly) {
      const ordersCount = await Order.countDocuments({ user: userId, status: { $ne: 'cancelled' } });
      if (ordersCount > 0) {
        return res.status(400).json({
          success: false,
          message: 'This coupon code is only valid for first-time orders.'
        });
      }
    }

    // Check weekend condition
    if (coupon.isWeekendOnly) {
      const isWeekend = now.getDay() === 0 || now.getDay() === 6;
      if (!isWeekend) {
        return res.status(400).json({
          success: false,
          message: 'This weekend special coupon is only valid on Saturday and Sunday.'
        });
      }
    }

    // Check lifetime spending
    const totalSpent = await calculateLifetimeSpending(userId);
    if (totalSpent < coupon.minLifetimeSpending) {
      return res.status(400).json({
        success: false,
        message: `This loyalty coupon requires a total lifetime spending of ₹${coupon.minLifetimeSpending}. Spend ₹${coupon.minLifetimeSpending - totalSpent} more to unlock.`
      });
    }

    // Check current cart value
    const cart = await Cart.findOne({ user: userId }).populate('items.pizza');
    const cartSubtotal = cart ? cart.items.reduce((sum, item) => sum + item.price * item.quantity, 0) : 0;
    if (cartSubtotal < coupon.minCartValue) {
      return res.status(400).json({
        success: false,
        message: `Minimum order value of ₹${coupon.minCartValue} is required to use this coupon. Add ₹${coupon.minCartValue - cartSubtotal} more.`
      });
    }

    // Check premium pizza condition
    if (coupon.isPremiumOnly) {
      const hasPremiumPizza = cart ? cart.items.some(item => item.pizza && ['premium', 'signature'].includes(item.pizza.category)) : false;
      if (!hasPremiumPizza) {
        return res.status(400).json({
          success: false,
          message: 'This coupon can only be applied to orders containing at least one premium/special pizza.'
        });
      }
    }

    // Calculate discount
    const discountAmount = calculateDiscount(cartSubtotal, coupon);

    res.status(200).json({
      success: true,
      message: 'Coupon is valid.',
      data: {
        code: coupon.code,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
        discountAmount,
        minCartValue: coupon.minCartValue
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Coupon validation failed.',
      error: error.message
    });
  }
};

// ==========================================
// Admin Controllers
// ==========================================

/**
 * @desc    Get all coupons (Admin)
 * @route   GET /api/v1/coupons/admin/all
 * @access  Admin
 */
const getCouponsAdmin = async (req, res) => {
  try {
    const coupons = await Coupon.find().sort({ createdAt: -1 });
    res.status(200).json({
      success: true,
      data: { coupons }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve coupons list.',
      error: error.message
    });
  }
};

/**
 * @desc    Create a new coupon (Admin)
 * @route   POST /api/v1/coupons/admin/create
 * @access  Admin
 */
const createCoupon = async (req, res) => {
  try {
    const {
      title,
      code,
      description,
      discountType,
      discountValue,
      maxDiscount,
      minCartValue,
      minLifetimeSpending,
      expiryDate,
      usageLimit,
      usagePerUser,
      terms,
      isActive,
      allowedUsers,
      isFirstOrderOnly,
      isWeekendOnly,
      isPremiumOnly
    } = req.body;

    // Check if code already exists
    const codeExists = await Coupon.findOne({ code: code.toUpperCase().trim() });
    if (codeExists) {
      return res.status(400).json({
        success: false,
        message: `Coupon with code "${code.toUpperCase()}" already exists.`
      });
    }

    const coupon = await Coupon.create({
      title,
      code: code.toUpperCase().trim(),
      description,
      discountType,
      discountValue,
      maxDiscount: maxDiscount || null,
      minCartValue: minCartValue || 0,
      minLifetimeSpending: minLifetimeSpending || 0,
      expiryDate,
      usageLimit: usageLimit || null,
      usagePerUser: usagePerUser || 1,
      terms: Array.isArray(terms) ? terms : terms ? terms.split('\n').filter(t => t.trim() !== '') : [],
      isActive: isActive !== undefined ? isActive : true,
      allowedUsers: Array.isArray(allowedUsers) ? allowedUsers : [],
      isFirstOrderOnly: !!isFirstOrderOnly,
      isWeekendOnly: !!isWeekendOnly,
      isPremiumOnly: !!isPremiumOnly
    });

    res.status(201).json({
      success: true,
      message: 'Coupon created successfully!',
      data: { coupon }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to create coupon.',
      error: error.message
    });
  }
};

/**
 * @desc    Update a coupon (Admin)
 * @route   PUT /api/v1/coupons/admin/:id
 * @access  Admin
 */
const updateCoupon = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      code,
      description,
      discountType,
      discountValue,
      maxDiscount,
      minCartValue,
      minLifetimeSpending,
      expiryDate,
      usageLimit,
      usagePerUser,
      terms,
      isActive,
      allowedUsers,
      isFirstOrderOnly,
      isWeekendOnly,
      isPremiumOnly
    } = req.body;

    const coupon = await Coupon.findById(id);
    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: 'Coupon not found.'
      });
    }

    // If changing the code, check uniqueness
    if (code && code.toUpperCase().trim() !== coupon.code) {
      const codeExists = await Coupon.findOne({ code: code.toUpperCase().trim() });
      if (codeExists) {
        return res.status(400).json({
          success: false,
          message: `Coupon with code "${code.toUpperCase()}" already exists.`
        });
      }
      coupon.code = code.toUpperCase().trim();
    }

    coupon.title = title !== undefined ? title : coupon.title;
    coupon.description = description !== undefined ? description : coupon.description;
    coupon.discountType = discountType !== undefined ? discountType : coupon.discountType;
    coupon.discountValue = discountValue !== undefined ? discountValue : coupon.discountValue;
    coupon.maxDiscount = maxDiscount !== undefined ? maxDiscount : coupon.maxDiscount;
    coupon.minCartValue = minCartValue !== undefined ? minCartValue : coupon.minCartValue;
    coupon.minLifetimeSpending = minLifetimeSpending !== undefined ? minLifetimeSpending : coupon.minLifetimeSpending;
    coupon.expiryDate = expiryDate !== undefined ? expiryDate : coupon.expiryDate;
    coupon.usageLimit = usageLimit !== undefined ? usageLimit : coupon.usageLimit;
    coupon.usagePerUser = usagePerUser !== undefined ? usagePerUser : coupon.usagePerUser;
    coupon.terms = Array.isArray(terms) ? terms : terms ? terms.split('\n').filter(t => t.trim() !== '') : coupon.terms;
    coupon.isActive = isActive !== undefined ? isActive : coupon.isActive;
    coupon.allowedUsers = Array.isArray(allowedUsers) ? allowedUsers : coupon.allowedUsers;
    coupon.isFirstOrderOnly = isFirstOrderOnly !== undefined ? !!isFirstOrderOnly : coupon.isFirstOrderOnly;
    coupon.isWeekendOnly = isWeekendOnly !== undefined ? !!isWeekendOnly : coupon.isWeekendOnly;
    coupon.isPremiumOnly = isPremiumOnly !== undefined ? !!isPremiumOnly : coupon.isPremiumOnly;

    await coupon.save();

    res.status(200).json({
      success: true,
      message: 'Coupon updated successfully!',
      data: { coupon }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update coupon.',
      error: error.message
    });
  }
};

/**
 * @desc    Delete a coupon (Admin)
 * @route   DELETE /api/v1/coupons/admin/:id
 * @access  Admin
 */
const deleteCoupon = async (req, res) => {
  try {
    const { id } = req.params;
    const coupon = await Coupon.findByIdAndDelete(id);

    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: 'Coupon not found.'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Coupon deleted successfully.'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to delete coupon.',
      error: error.message
    });
  }
};

/**
 * @desc    Toggle coupon status (Admin)
 * @route   PATCH /api/v1/coupons/admin/:id/toggle
 * @access  Admin
 */
const toggleCouponStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const coupon = await Coupon.findById(id);

    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: 'Coupon not found.'
      });
    }

    coupon.isActive = !coupon.isActive;
    await coupon.save();

    res.status(200).json({
      success: true,
      message: `Coupon code "${coupon.code}" ${coupon.isActive ? 'activated' : 'deactivated'} successfully.`,
      data: { coupon }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to toggle coupon status.',
      error: error.message
    });
  }
};

/**
 * @desc    Get coupon analytics (Admin)
 * @route   GET /api/v1/coupons/admin/analytics
 * @access  Admin
 */
const getCouponAnalytics = async (req, res) => {
  try {
    // Total usage count across orders
    const totalUsage = await Order.countDocuments({ couponCode: { $exists: true, $ne: null } });

    // Aggregates for each coupon code
    const couponUsageStats = await Order.aggregate([
      { $match: { couponCode: { $exists: true, $ne: null } } },
      {
        $group: {
          _id: '$couponCode',
          usageCount: { $sum: 1 },
          totalDiscount: { $sum: '$couponDiscountAmount' },
          totalRevenue: { $sum: '$finalAmount' },
        }
      },
      { $sort: { usageCount: -1 } }
    ]);

    // Unique users who applied coupons
    const uniqueUsersAgg = await Order.aggregate([
      { $match: { couponCode: { $exists: true, $ne: null } } },
      { $group: { _id: '$user' } },
      { $count: 'uniqueUsersCount' }
    ]);
    const uniqueUsersCount = uniqueUsersAgg[0]?.uniqueUsersCount || 0;

    // Total discount given
    const totalDiscountGivenAgg = await Order.aggregate([
      { $match: { couponCode: { $exists: true, $ne: null } } },
      { $group: { _id: null, totalDiscount: { $sum: '$couponDiscountAmount' } } }
    ]);
    const totalDiscount = totalDiscountGivenAgg[0]?.totalDiscount || 0;

    // Revenue impact (Total sales generated with coupon usage)
    const revenueImpactAgg = await Order.aggregate([
      { $match: { couponCode: { $exists: true, $ne: null } } },
      { $group: { _id: null, totalRevenue: { $sum: '$finalAmount' } } }
    ]);
    const revenueImpact = revenueImpactAgg[0]?.totalRevenue || 0;

    // Recent coupon usage list (limit to 10)
    const recentUsage = await Order.find({ couponCode: { $exists: true, $ne: null } })
      .sort({ createdAt: -1 })
      .limit(10)
      .populate('user', 'name email');

    res.status(200).json({
      success: true,
      data: {
        totalUsage,
        totalDiscount,
        revenueImpact,
        uniqueUsersCount,
        couponStats: couponUsageStats,
        recentUsage: recentUsage.map(o => ({
          orderNumber: o.orderNumber,
          customerName: o.user?.name || 'Customer',
          customerEmail: o.user?.email || '',
          couponCode: o.couponCode,
          discountAmount: o.couponDiscountAmount,
          finalAmount: o.finalAmount,
          createdAt: o.createdAt
        }))
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve coupon analytics.',
      error: error.message
    });
  }
};

module.exports = {
  getEligibleCoupons,
  validateCoupon,
  getCouponsAdmin,
  createCoupon,
  updateCoupon,
  deleteCoupon,
  toggleCouponStatus,
  getCouponAnalytics,
  // Export helper for internal cart validator
  calculateDiscount
};
