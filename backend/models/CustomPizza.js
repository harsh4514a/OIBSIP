const mongoose = require('mongoose');

const customPizzaSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    name: {
      type: String,
      trim: true,
      default: 'My Custom Pizza',
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    size: {
      type: String,
      enum: ['small', 'medium', 'large', 'xl'],
      required: [true, 'Size is required'],
    },
    base: {
      type: String,
      enum: ['thin', 'thick', 'stuffed', 'wheat', 'gluten-free'],
      required: [true, 'Base is required'],
    },
    sauce: {
      type: String,
      enum: ['tomato', 'bbq', 'white-garlic', 'pesto', 'buffalo'],
      required: [true, 'Sauce is required'],
    },
    cheese: {
      type: String,
      enum: ['mozzarella', 'cheddar', 'parmesan', 'vegan', 'extra'],
      required: [true, 'Cheese is required'],
    },
    veggies: [
      {
        type: String,
        enum: [
          'mushrooms',
          'bell-peppers',
          'onions',
          'olives',
          'tomatoes',
          'spinach',
          'jalapenos',
          'corn',
          'broccoli',
          'artichokes',
        ],
      },
    ],
    basePrice: {
      type: Number,
      required: [true, 'Base price is required'],
      min: 0,
    },
  },
  {
    timestamps: true,
  }
);

/**
 * Static method to compute price based on selections
 */
customPizzaSchema.statics.computePrice = function (size, base, cheese, veggies = []) {
  const basePrices = { small: 199, medium: 299, large: 399, xl: 499 };
  const baseExtra = { thin: 0, thick: 20, stuffed: 50, wheat: 30, 'gluten-free': 40 };
  const cheeseExtra = { mozzarella: 0, cheddar: 30, parmesan: 40, vegan: 50, extra: 60 };
  const perVeggie = 20;

  let price = basePrices[size] || 299;
  price += baseExtra[base] || 0;
  price += cheeseExtra[cheese] || 0;
  price += veggies.length * perVeggie;

  return price;
};

const CustomPizza = mongoose.model('CustomPizza', customPizzaSchema);

module.exports = CustomPizza;
