const mongoose = require('mongoose');

const historyEntrySchema = new mongoose.Schema({
  action: {
    type: String,
    enum: ['add', 'deduct', 'adjust'],
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
  },
  reason: {
    type: String,
    trim: true,
    maxlength: [200, 'Reason cannot exceed 200 characters'],
  },
  date: {
    type: Date,
    default: Date.now,
  },
  performedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
});

const inventorySchema = new mongoose.Schema(
  {
    ingredientType: {
      type: String,
      enum: ['base', 'sauce', 'cheese', 'veggie'],
      required: [true, 'Ingredient type is required'],
    },
    name: {
      type: String,
      required: [true, 'Ingredient name is required'],
      unique: true,
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    currentStock: {
      type: Number,
      required: [true, 'Current stock is required'],
      min: [0, 'Stock cannot be negative'],
      default: 0,
    },
    unit: {
      type: String,
      enum: ['kg', 'g', 'pieces', 'liters'],
      required: [true, 'Unit is required'],
    },
    threshold: {
      type: Number,
      required: [true, 'Low stock threshold is required'],
      min: 0,
    },
    pricePerUnit: {
      type: Number,
      required: [true, 'Price per unit is required'],
      min: 0,
    },
    history: [historyEntrySchema],
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

inventorySchema.index({ ingredientType: 1 });
inventorySchema.index({ currentStock: 1, threshold: 1 });

const Inventory = mongoose.model('Inventory', inventorySchema);

module.exports = Inventory;
