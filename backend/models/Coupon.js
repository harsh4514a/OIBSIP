const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Coupon title is required'],
      trim: true,
      maxlength: [100, 'Title cannot exceed 100 characters'],
    },
    code: {
      type: String,
      required: [true, 'Coupon code is required'],
      unique: true,
      uppercase: true,
      trim: true,
      minlength: [3, 'Code must be at least 3 characters'],
      maxlength: [20, 'Code cannot exceed 20 characters'],
    },
    description: {
      type: String,
      required: [true, 'Coupon description is required'],
      trim: true,
    },
    discountType: {
      type: String,
      enum: {
        values: ['percentage', 'fixed'],
        message: 'Discount type must be either percentage or fixed',
      },
      default: 'percentage',
    },
    discountValue: {
      type: Number,
      required: [true, 'Discount value is required'],
      min: [0, 'Discount value cannot be negative'],
    },
    maxDiscount: {
      type: Number,
      default: null,
      min: [0, 'Maximum discount cannot be negative'],
    },
    minCartValue: {
      type: Number,
      default: 0,
      min: [0, 'Minimum cart value cannot be negative'],
    },
    minLifetimeSpending: {
      type: Number,
      default: 0,
      min: [0, 'Minimum lifetime spending cannot be negative'],
    },
    expiryDate: {
      type: Date,
      required: [true, 'Expiry date is required'],
    },
    usageLimit: {
      type: Number,
      default: null,
      min: [1, 'Usage limit must be at least 1'],
    },
    usagePerUser: {
      type: Number,
      default: 1,
      min: [1, 'Usage per user must be at least 1'],
    },
    usedCount: {
      type: Number,
      default: 0,
      min: [0, 'Used count cannot be negative'],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    allowedUsers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    isFirstOrderOnly: {
      type: Boolean,
      default: false,
    },
    isWeekendOnly: {
      type: Boolean,
      default: false,
    },
    isPremiumOnly: {
      type: Boolean,
      default: false,
    },
    terms: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

// Indexing for search performance
couponSchema.index({ code: 1 });
couponSchema.index({ expiryDate: 1 });
couponSchema.index({ isActive: 1 });

const Coupon = mongoose.model('Coupon', couponSchema);

module.exports = Coupon;
