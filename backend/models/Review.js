const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User is required'],
    },
    pizza: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Pizza',
      required: false,
    },
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      required: false,
    },
    rating: {
      type: Number,
      required: [true, 'Rating is required'],
      min: [1, 'Minimum rating is 1'],
      max: [5, 'Maximum rating is 5'],
    },
    comment: {
      type: String,
      trim: true,
      maxlength: [1000, 'Comment cannot exceed 1000 characters'],
    },
    images: [
      {
        type: String,
      },
    ],
    deliveryRating: {
      type: Number,
      min: [1, 'Minimum rating is 1'],
      max: [5, 'Maximum rating is 5'],
    },
    packagingRating: {
      type: Number,
      min: [1, 'Minimum rating is 1'],
      max: [5, 'Maximum rating is 5'],
    },
    isVerified: {
      type: Boolean,
      default: false,
      comment: 'True if user actually ordered this pizza',
    },
    helpfulVotes: {
      type: Number,
      default: 0,
      min: 0,
    },
    votedBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
  },
  {
    timestamps: true,
  }
);

// One review per user per order per pizza (pizza is null for order-level review)
reviewSchema.index({ user: 1, order: 1, pizza: 1 }, { unique: true });
reviewSchema.index({ pizza: 1, createdAt: -1 });

// Drop old unique index user_1_pizza_1 on database connection startup
mongoose.connection.once('open', async () => {
  try {
    await mongoose.connection.db.collection('reviews').dropIndex('user_1_pizza_1');
  } catch (err) {
    // Ignore error if index doesn't exist
  }
});

// Update pizza rating after save
reviewSchema.post('save', async function () {
  if (!this.pizza) return;
  const Pizza = mongoose.model('Pizza');
  const stats = await mongoose.model('Review').aggregate([
    { $match: { pizza: this.pizza } },
    {
      $group: {
        _id: '$pizza',
        avgRating: { $avg: '$rating' },
        count: { $sum: 1 },
      },
    },
  ]);

  if (stats.length > 0) {
    await Pizza.findByIdAndUpdate(this.pizza, {
      'ratings.average': Math.round(stats[0].avgRating * 10) / 10,
      'ratings.count': stats[0].count,
    });
  }
});

// Update pizza rating after delete
reviewSchema.post('findOneAndDelete', async function (doc) {
  if (doc && doc.pizza) {
    const Pizza = mongoose.model('Pizza');
    const stats = await mongoose.model('Review').aggregate([
      { $match: { pizza: doc.pizza } },
      {
        $group: {
          _id: '$pizza',
          avgRating: { $avg: '$rating' },
          count: { $sum: 1 },
        },
      },
    ]);

    if (stats.length > 0) {
      await Pizza.findByIdAndUpdate(doc.pizza, {
        'ratings.average': Math.round(stats[0].avgRating * 10) / 10,
        'ratings.count': stats[0].count,
      });
    } else {
      await Pizza.findByIdAndUpdate(doc.pizza, {
        'ratings.average': 0,
        'ratings.count': 0,
      });
    }
  }
});

const Review = mongoose.model('Review', reviewSchema);

module.exports = Review;
