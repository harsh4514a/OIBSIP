const Cart = require('../models/Cart');
const Pizza = require('../models/Pizza');
const CustomPizza = require('../models/CustomPizza');
const Coupon = require('../models/Coupon');
const Order = require('../models/Order');

/**
 * @desc    Get user's cart
 * @route   GET /api/v1/cart
 * @access  Private
 */
const getCart = async (req, res) => {
  try {
    let cart = await Cart.findOne({ user: req.user._id })
      .populate('items.pizza', 'name image basePrice isAvailable')
      .populate('items.customPizza');

    if (!cart) {
      cart = await Cart.create({ user: req.user._id, items: [] });
    }

    res.status(200).json({
      success: true,
      message: 'Cart retrieved.',
      data: { cart },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve cart.',
      error: error.message,
    });
  }
};

/**
 * @desc    Add item to cart
 * @route   POST /api/v1/cart/add
 * @access  Private
 */
const addToCart = async (req, res) => {
  try {
    const { pizzaId, customPizzaId, size, quantity = 1, type = 'regular', base, sauce, cheese, veggies, customizations = {} } = req.body;

    let cart = await Cart.findOne({ user: req.user._id });
    if (!cart) {
      cart = new Cart({ user: req.user._id, items: [] });
    }

    let itemName, itemImage, itemPrice;

    if (type === 'regular' && pizzaId) {
      const pizza = await Pizza.findById(pizzaId);
      if (!pizza || !pizza.isAvailable) {
        return res.status(404).json({
          success: false,
          message: 'Pizza not found or not available.',
        });
      }

      const sizeData = pizza.sizes.find((s) => s.size === size);
      const multiplier = sizeData ? sizeData.priceMultiplier : 1;
      itemName = pizza.name;
      itemImage = pizza.image;
      itemPrice = Math.round(pizza.basePrice * multiplier);

      // Check if exact pizza+size combo already in cart
      const existingIndex = cart.items.findIndex(
        (item) => item.pizza && item.pizza.toString() === pizzaId && item.size === size && item.type === 'regular'
      );

      if (existingIndex > -1) {
        cart.items[existingIndex].quantity = Math.min(
          cart.items[existingIndex].quantity + quantity,
          10
        );
      } else {
        cart.items.push({
          pizza: pizzaId,
          name: itemName,
          image: itemImage,
          size,
          quantity,
          price: itemPrice,
          type: 'regular',
          customizations,
        });
      }
    } else if (type === 'custom') {
      let customPizza;
      if (customPizzaId) {
        customPizza = await CustomPizza.findById(customPizzaId);
        if (!customPizza || customPizza.user.toString() !== req.user._id.toString()) {
          return res.status(404).json({
            success: false,
            message: 'Custom pizza not found.',
          });
        }
      } else {
        const itemBase = base || customizations.base;
        const itemSauce = sauce || customizations.sauce;
        const itemCheese = cheese || customizations.cheese;
        const itemVeggies = veggies || customizations.veggies || [];

        if (!size || !itemBase || !itemSauce || !itemCheese) {
          return res.status(400).json({
            success: false,
            message: 'Custom pizza configuration (size, base, sauce, cheese) is required.',
          });
        }

        const calculatedPrice = CustomPizza.computePrice(size, itemBase, itemCheese, itemVeggies);
        customPizza = await CustomPizza.create({
          user: req.user._id,
          name: req.body.name || 'Custom Pizza',
          size,
          base: itemBase,
          sauce: itemSauce,
          cheese: itemCheese,
          veggies: itemVeggies,
          basePrice: calculatedPrice,
        });
      }

      itemName = customPizza.name || 'Custom Pizza';
      itemImage = 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=400';
      itemPrice = customPizza.basePrice;

      cart.items.push({
        customPizza: customPizza._id,
        name: itemName,
        image: itemImage,
        size: customPizza.size,
        quantity,
        price: itemPrice,
        type: 'custom',
        customizations: {
          base: customPizza.base,
          sauce: customPizza.sauce,
          cheese: customPizza.cheese,
          veggies: customPizza.veggies,
        },
      });
    }

    await cart.save();

    res.status(200).json({
      success: true,
      message: 'Item added to cart.',
      data: { cart },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to add to cart.',
      error: error.message,
    });
  }
};

/**
 * @desc    Update cart item quantity
 * @route   PUT /api/v1/cart/update
 * @access  Private
 */
const updateCartItem = async (req, res) => {
  try {
    const { itemId, quantity } = req.body;

    if (!quantity || quantity < 1 || quantity > 10) {
      return res.status(400).json({
        success: false,
        message: 'Quantity must be between 1 and 10.',
      });
    }

    const cart = await Cart.findOne({ user: req.user._id });

    if (!cart) {
      return res.status(404).json({
        success: false,
        message: 'Cart not found.',
      });
    }

    const item = cart.items.id(itemId);
    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Cart item not found.',
      });
    }

    item.quantity = quantity;
    await cart.save();

    res.status(200).json({
      success: true,
      message: 'Cart updated.',
      data: { cart },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update cart.',
      error: error.message,
    });
  }
};

/**
 * @desc    Remove item from cart
 * @route   DELETE /api/v1/cart/remove/:itemId
 * @access  Private
 */
const removeCartItem = async (req, res) => {
  try {
    const { itemId } = req.params;

    const cart = await Cart.findOne({ user: req.user._id });

    if (!cart) {
      return res.status(404).json({
        success: false,
        message: 'Cart not found.',
      });
    }

    const item = cart.items.id(itemId);
    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Cart item not found.',
      });
    }

    item.deleteOne();
    await cart.save();

    res.status(200).json({
      success: true,
      message: 'Item removed from cart.',
      data: { cart },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to remove item.',
      error: error.message,
    });
  }
};

/**
 * @desc    Clear entire cart
 * @route   DELETE /api/v1/cart/clear
 * @access  Private
 */
const clearCart = async (req, res) => {
  try {
    await Cart.findOneAndUpdate(
      { user: req.user._id },
      { $set: { items: [], couponCode: null, couponDiscount: 0 } }
    );

    res.status(200).json({
      success: true,
      message: 'Cart cleared.',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to clear cart.',
      error: error.message,
    });
  }
};

/**
 * @desc    Apply coupon code
 * @route   POST /api/v1/cart/coupon
 * @access  Private
 */
const applyCoupon = async (req, res) => {
  try {
    const code = req.body.code || req.body.couponCode;
    const userId = req.user._id;
    const now = new Date();

    if (!code) {
      return res.status(400).json({
        success: false,
        message: 'Coupon code is required.',
      });
    }

    const coupon = await Coupon.findOne({ code: code.toUpperCase().trim() });

    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: 'Invalid coupon code. Please try another one.',
      });
    }

    if (!coupon.isActive) {
      return res.status(400).json({
        success: false,
        message: 'This coupon code is currently inactive.',
      });
    }

    if (new Date(coupon.expiryDate) < now) {
      return res.status(400).json({
        success: false,
        message: 'This coupon code has expired.',
      });
    }

    if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
      return res.status(400).json({
        success: false,
        message: 'This coupon has reached its usage limit.',
      });
    }

    if (coupon.allowedUsers.length > 0 && !coupon.allowedUsers.includes(userId)) {
      return res.status(403).json({
        success: false,
        message: 'You are not eligible for this coupon.',
      });
    }

    // Check user usage limit
    const userUsageCount = await Order.countDocuments({
      user: userId,
      couponCode: coupon.code,
      status: { $ne: 'cancelled' }
    });
    if (userUsageCount >= coupon.usagePerUser) {
      return res.status(400).json({
        success: false,
        message: `You have already used this coupon code the maximum of ${coupon.usagePerUser} time(s).`,
      });
    }

    // Check lifetime spending
    const userOrders = await Order.find({
      user: userId,
      status: 'delivered',
      paymentStatus: 'paid'
    });
    const totalSpent = userOrders.reduce((sum, order) => sum + order.finalAmount, 0);
    if (totalSpent < coupon.minLifetimeSpending) {
      return res.status(400).json({
        success: false,
        message: `This loyalty coupon requires a total lifetime spending of ₹${coupon.minLifetimeSpending}. Spend ₹${coupon.minLifetimeSpending - totalSpent} more to unlock.`,
      });
    }

    // Check current cart value
    let cart = await Cart.findOne({ user: userId });
    if (!cart || cart.items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Your cart is empty.',
      });
    }

    const cartSubtotal = cart.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    if (cartSubtotal < coupon.minCartValue) {
      return res.status(400).json({
        success: false,
        message: `Minimum order value of ₹${coupon.minCartValue} is required to use this coupon. Add ₹${coupon.minCartValue - cartSubtotal} more.`,
      });
    }

    // Calculate discount amount
    let discountAmount = 0;
    if (coupon.discountType === 'percentage') {
      discountAmount = Math.round((cartSubtotal * coupon.discountValue) / 100);
      if (coupon.maxDiscount) {
        discountAmount = Math.min(discountAmount, coupon.maxDiscount);
      }
    } else {
      discountAmount = Math.min(coupon.discountValue, cartSubtotal);
    }

    // Update cart
    cart.couponCode = coupon.code;
    cart.couponDiscountAmount = discountAmount;
    cart.couponDiscount = Math.round((discountAmount / cartSubtotal) * 100) || 0; // backward compatibility
    await cart.save();

    res.status(200).json({
      success: true,
      message: `Coupon applied successfully! Saved ₹${discountAmount}.`,
      data: {
        cart,
        coupon: {
          code: coupon.code,
          discountType: coupon.discountType,
          discountValue: coupon.discountValue,
          discountAmount,
          description: coupon.description,
        },
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to apply coupon.',
      error: error.message,
    });
  }
};

/**
 * @desc    Remove coupon from cart
 * @route   DELETE /api/v1/cart/coupon
 * @access  Private
 */
const removeCoupon = async (req, res) => {
  try {
    const cart = await Cart.findOneAndUpdate(
      { user: req.user._id },
      { $set: { couponCode: null, couponDiscount: 0, couponDiscountAmount: 0 } },
      { new: true }
    );

    res.status(200).json({
      success: true,
      message: 'Coupon removed.',
      data: { cart },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to remove coupon.',
      error: error.message,
    });
  }
};

module.exports = {
  getCart,
  addToCart,
  updateCartItem,
  removeCartItem,
  clearCart,
  applyCoupon,
  removeCoupon,
};
