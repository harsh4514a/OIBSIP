const mongoose = require('mongoose');

const cartItemSchema = new mongoose.Schema({
  pizza: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Pizza',
  },
  customPizza: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CustomPizza',
  },
  name: {
    type: String,
    required: true,
  },
  image: {
    type: String,
    default: '',
  },
  size: {
    type: String,
    enum: ['small', 'medium', 'large', 'xl'],
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
    min: 1,
    max: 10,
    default: 1,
  },
  price: {
    type: Number,
    required: true,
    min: 0,
  },
  type: {
    type: String,
    enum: ['regular', 'custom'],
    default: 'regular',
  },
  customizations: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
});

const cartSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    items: [cartItemSchema],
    couponCode: {
      type: String,
      uppercase: true,
      trim: true,
    },
    couponDiscount: {
      type: Number,
      default: 0,
      min: 0,
    },
    couponDiscountAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual: total price before discount
cartSchema.virtual('subtotal').get(function () {
  return this.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
});

// Virtual: delivery fee (free above ₹500)
cartSchema.virtual('deliveryFee').get(function () {
  const subtotal = this.subtotal;
  return subtotal >= 500 ? 0 : 49;
});

// Virtual: final total
cartSchema.virtual('total').get(function () {
  const subtotal = this.subtotal;
  const discount = this.couponDiscountAmount > 0 
    ? this.couponDiscountAmount 
    : (subtotal * this.couponDiscount) / 100;
  return Math.max(0, subtotal - discount + this.deliveryFee);
});

// Pre-save hook to validate and recalculate coupon discount based on the latest cart subtotal
cartSchema.pre('save', async function (next) {
  if (!this.couponCode) {
    this.couponDiscount = 0;
    this.couponDiscountAmount = 0;
    return next();
  }

  try {
    const CouponModel = mongoose.model('Coupon');
    const coupon = await CouponModel.findOne({ code: this.couponCode.toUpperCase().trim() });

    // If coupon doesn't exist, is inactive, or has expired, remove it from the cart
    if (!coupon || !coupon.isActive || new Date(coupon.expiryDate) < new Date()) {
      this.couponCode = undefined;
      this.couponDiscount = 0;
      this.couponDiscountAmount = 0;
      return next();
    }

    const subtotal = this.items.reduce((sum, item) => sum + item.price * item.quantity, 0);

    // If the cart subtotal no longer meets the coupon's minimum cart value requirement, remove the coupon
    if (subtotal < coupon.minCartValue) {
      this.couponCode = undefined;
      this.couponDiscount = 0;
      this.couponDiscountAmount = 0;
      return next();
    }

    // Check first order condition
    if (coupon.isFirstOrderOnly) {
      const OrderModel = mongoose.model('Order');
      const ordersCount = await OrderModel.countDocuments({ user: this.user, status: { $ne: 'cancelled' } });
      if (ordersCount > 0) {
        this.couponCode = undefined;
        this.couponDiscount = 0;
        this.couponDiscountAmount = 0;
        return next();
      }
    }

    // Check weekend condition
    if (coupon.isWeekendOnly) {
      const now = new Date();
      const isWeekend = now.getDay() === 0 || now.getDay() === 6;
      if (!isWeekend) {
        this.couponCode = undefined;
        this.couponDiscount = 0;
        this.couponDiscountAmount = 0;
        return next();
      }
    }

    // Check premium pizza condition
    if (coupon.isPremiumOnly) {
      await this.populate('items.pizza');
      const hasPremiumPizza = this.items.some(item => item.pizza && ['premium', 'signature'].includes(item.pizza.category));
      if (!hasPremiumPizza) {
        this.couponCode = undefined;
        this.couponDiscount = 0;
        this.couponDiscountAmount = 0;
        return next();
      }
    }

    // Recalculate discount based on new subtotal
    let discountAmount = 0;
    if (coupon.discountType === 'percentage') {
      discountAmount = Math.round((subtotal * coupon.discountValue) / 100);
      if (coupon.maxDiscount) {
        discountAmount = Math.min(discountAmount, coupon.maxDiscount);
      }
    } else {
      discountAmount = Math.min(coupon.discountValue, subtotal);
    }

    this.couponDiscountAmount = discountAmount;
    this.couponDiscount = Math.round((discountAmount / subtotal) * 100) || 0;
    next();
  } catch (error) {
    next(error);
  }
});

const Cart = mongoose.model('Cart', cartSchema);

module.exports = Cart;
