const mongoose = require('mongoose');

const sizeSchema = new mongoose.Schema({
  size: {
    type: String,
    enum: ['small', 'medium', 'large', 'xl'],
    required: true,
  },
  priceMultiplier: {
    type: Number,
    required: true,
    min: 0.5,
    max: 5,
    default: 1,
  },
});

const pizzaSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Pizza name is required'],
      trim: true,
      unique: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters'],
    },
    category: {
      type: String,
      enum: ['classic', 'cheese', 'italian', 'mexican', 'indian-fusion', 'spicy', 'premium', 'signature'],
      required: [true, 'Category is required'],
    },
    basePrice: {
      type: Number,
      required: [true, 'Base price is required'],
      min: [0, 'Price cannot be negative'],
    },
    sizes: [sizeSchema],
    image: {
      type: String,
      required: [true, 'Pizza image is required'],
    },
    ingredients: [
      {
        type: String,
        trim: true,
      },
    ],
    isAvailable: {
      type: Boolean,
      default: true,
    },
    isFeatured: {
      type: Boolean,
      default: false,
    },
    ratings: {
      average: {
        type: Number,
        default: 0,
        min: 0,
        max: 5,
      },
      count: {
        type: Number,
        default: 0,
      },
    },
    tags: [
      {
        type: String,
        trim: true,
        lowercase: true,
      },
    ],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual for reviews
pizzaSchema.virtual('reviews', {
  ref: 'Review',
  localField: '_id',
  foreignField: 'pizza',
});

// Text search index
pizzaSchema.index({ name: 'text', description: 'text', tags: 'text' });
pizzaSchema.index({ category: 1, isAvailable: 1 });
pizzaSchema.index({ isFeatured: 1 });

// Non-vegetarian keyword blocklist — PizzaHub is a 100% Pure Veg kitchen
const NON_VEG_KEYWORDS = [
  'chicken', 'pepperoni', 'bacon', 'sausage', 'salami', 'ham',
  'beef', 'pork', 'lamb', 'mutton', 'meat', 'prawn', 'shrimp',
  'crab', 'lobster', 'fish', 'tuna', 'anchovy', 'anchovies',
  'turkey', 'duck', 'venison', 'chorizo', 'hotdog', 'hot dog',
  'keema', 'seekh', 'tandoori chicken', 'butter chicken',
  'non-veg', 'nonveg', 'egg', 'eggs',
];

/**
 * Pre-save hook: Reject any pizza with non-vegetarian name or ingredients.
 * This is a safety validation since PizzaHub is a 100% vegetarian brand.
 */
pizzaSchema.pre('save', function (next) {
  const nameLower = (this.name || '').toLowerCase();
  const descLower = (this.description || '').toLowerCase();
  const ingredientsLower = (this.ingredients || []).map(i => i.toLowerCase());

  for (const keyword of NON_VEG_KEYWORDS) {
    const isWholeWordOnly = ['egg', 'eggs', 'ham'].includes(keyword);
    const matches = (text) => {
      if (isWholeWordOnly) {
        return new RegExp(`\\b${keyword}\\b`, 'i').test(text);
      }
      return text.includes(keyword);
    };

    if (matches(nameLower)) {
      return next(new Error(`Pizza name contains non-vegetarian keyword "${keyword}". PizzaHub is a 100% Pure Veg kitchen.`));
    }
    if (matches(descLower)) {
      return next(new Error(`Pizza description contains non-vegetarian keyword "${keyword}". PizzaHub is a 100% Pure Veg kitchen.`));
    }
    for (const ing of ingredientsLower) {
      if (matches(ing)) {
        return next(new Error(`Ingredient "${ing}" contains non-vegetarian keyword "${keyword}". PizzaHub is a 100% Pure Veg kitchen.`));
      }
    }
  }

  // Validate category against allowed values
  const VALID_CATEGORIES = ['classic', 'cheese', 'italian', 'mexican', 'indian-fusion', 'spicy', 'premium', 'signature'];
  if (this.category && !VALID_CATEGORIES.includes(this.category)) {
    this.category = 'classic';
  }

  next();
});

/**
 * Pre-findOneAndUpdate hook: Also validate updates against non-veg keywords.
 */
pizzaSchema.pre('findOneAndUpdate', function (next) {
  const update = this.getUpdate()?.$set || this.getUpdate() || {};

  const fieldsToCheck = [
    { field: 'name', value: update.name },
    { field: 'description', value: update.description },
  ];

  for (const { field, value } of fieldsToCheck) {
    if (!value) continue;
    const lower = value.toLowerCase();
    for (const keyword of NON_VEG_KEYWORDS) {
      const isWholeWordOnly = ['egg', 'eggs', 'ham'].includes(keyword);
      const matches = isWholeWordOnly
        ? new RegExp(`\\b${keyword}\\b`, 'i').test(lower)
        : lower.includes(keyword);
      if (matches) {
        return next(new Error(`Pizza ${field} contains non-vegetarian keyword "${keyword}". PizzaHub is a 100% Pure Veg kitchen.`));
      }
    }
  }

  // Check ingredients array
  const ingredients = update.ingredients;
  if (Array.isArray(ingredients)) {
    for (const ing of ingredients) {
      const ingLower = (ing || '').toLowerCase();
      for (const keyword of NON_VEG_KEYWORDS) {
        const isWholeWordOnly = ['egg', 'eggs', 'ham'].includes(keyword);
        const matches = isWholeWordOnly
          ? new RegExp(`\\b${keyword}\\b`, 'i').test(ingLower)
          : ingLower.includes(keyword);
        if (matches) {
          return next(new Error(`Ingredient "${ing}" contains non-vegetarian keyword "${keyword}". PizzaHub is a 100% Pure Veg kitchen.`));
        }
      }
    }
  }

  next();
});

const Pizza = mongoose.model('Pizza', pizzaSchema);

module.exports = Pizza;
