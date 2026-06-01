const Review = require('../models/Review');
const Order = require('../models/Order');
const Pizza = require('../models/Pizza');

/**
 * @desc    Create a review for a pizza
 * @route   POST /api/v1/reviews
 * @access  Private
 */
const createReview = async (req, res) => {
  try {
    const { orderId, pizzaId, rating, comment, images, deliveryRating, packagingRating } = req.body;

    if (orderId) {
      // Check if order exists and belongs to the user
      const order = await Order.findOne({ _id: orderId, user: req.user._id });
      if (!order) {
        return res.status(404).json({
          success: false,
          message: 'Order not found or does not belong to you.',
        });
      }

      // Check if order is delivered
      if (order.status !== 'delivered') {
        return res.status(400).json({
          success: false,
          message: 'You can only review delivered orders.',
        });
      }

      if (pizzaId) {
        // Pizza-level review for a specific order
        // Check if pizza exists
        const pizza = await Pizza.findById(pizzaId);
        if (!pizza) {
          return res.status(404).json({
            success: false,
            message: 'Pizza not found.',
          });
        }

        // Check if pizza is in order items
        const isPizzaInOrder = order.items.some(
          item => item.pizza?.toString() === pizzaId.toString()
        );
        if (!isPizzaInOrder) {
          return res.status(400).json({
            success: false,
            message: 'This pizza was not part of the specified order.',
          });
        }

        // Check if user already reviewed this pizza for this order
        const existingReview = await Review.findOne({
          user: req.user._id,
          order: orderId,
          pizza: pizzaId,
        });
        if (existingReview) {
          return res.status(400).json({
            success: false,
            message: 'You have already reviewed this pizza for this order.',
          });
        }

        const review = await Review.create({
          user: req.user._id,
          order: orderId,
          pizza: pizzaId,
          rating,
          comment,
          images: images || [],
          isVerified: true,
        });

        const populatedReview = await Review.findById(review._id).populate('user', 'name profileImage');

        return res.status(201).json({
          success: true,
          message: 'Pizza review submitted successfully!',
          data: { review: populatedReview },
        });
      } else {
        // Order-level review
        const existingReview = await Review.findOne({
          user: req.user._id,
          order: orderId,
          $or: [{ pizza: null }, { pizza: { $exists: false } }],
        });
        if (existingReview) {
          return res.status(400).json({
            success: false,
            message: 'You have already reviewed this order.',
          });
        }

        const review = await Review.create({
          user: req.user._id,
          order: orderId,
          rating, // overall rating
          deliveryRating,
          packagingRating,
          comment,
          images: images || [],
          isVerified: true,
        });

        const populatedReview = await Review.findById(review._id).populate('user', 'name profileImage');

        return res.status(201).json({
          success: true,
          message: 'Order review submitted successfully!',
          data: { review: populatedReview },
        });
      }
    } else {
      // Direct pizza review (from PizzaDetailPage, no orderId provided)
      if (!pizzaId) {
        return res.status(400).json({
          success: false,
          message: 'Pizza ID is required if not reviewing a specific order.',
        });
      }

      // Check if pizza exists
      const pizza = await Pizza.findById(pizzaId);
      if (!pizza) {
        return res.status(404).json({
          success: false,
          message: 'Pizza not found.',
        });
      }

      // Check if user has ordered this pizza (to get verified order reference)
      const recentOrder = await Order.findOne({
        user: req.user._id,
        'items.pizza': pizzaId,
        status: 'delivered',
      }).sort({ createdAt: -1 });

      const finalOrderId = recentOrder ? recentOrder._id : null;

      // Check if user already reviewed this pizza for this order/null combination
      const existingReview = await Review.findOne({
        user: req.user._id,
        pizza: pizzaId,
        order: finalOrderId || null,
      });

      if (existingReview) {
        return res.status(400).json({
          success: false,
          message: 'You have already reviewed this pizza.',
        });
      }

      const review = await Review.create({
        user: req.user._id,
        order: finalOrderId || null,
        pizza: pizzaId,
        rating,
        comment,
        images: images || [],
        isVerified: !!recentOrder,
      });

      const populatedReview = await Review.findById(review._id).populate('user', 'name profileImage');

      return res.status(201).json({
        success: true,
        message: 'Review submitted successfully!',
        data: { review: populatedReview },
      });
    }
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'You have already submitted this review.',
      });
    }
    res.status(500).json({
      success: false,
      message: 'Failed to create review.',
      error: error.message,
    });
  }
};

/**
 * @desc    Get paginated reviews for a pizza
 * @route   GET /api/v1/reviews/pizza/:pizzaId
 * @access  Public
 */
const getPizzaReviews = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const sortOptions = {
      newest: { createdAt: -1 },
      oldest: { createdAt: 1 },
      'rating-high': { rating: -1 },
      'rating-low': { rating: 1 },
      helpful: { helpfulVotes: -1 },
    };
    const sort = sortOptions[req.query.sort] || { createdAt: -1 };

    const filterQuery = { pizza: req.params.pizzaId };
    if (req.query.rating) filterQuery.rating = parseInt(req.query.rating);

    const [reviews, total] = await Promise.all([
      Review.find(filterQuery)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .populate('user', 'name profileImage'),
      Review.countDocuments(filterQuery),
    ]);

    res.status(200).json({
      success: true,
      message: 'Reviews retrieved.',
      data: {
        reviews,
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
      message: 'Failed to retrieve reviews.',
      error: error.message,
    });
  }
};

/**
 * @desc    Update own review
 * @route   PUT /api/v1/reviews/:id
 * @access  Private (Owner)
 */
const updateReview = async (req, res) => {
  try {
    const { rating, comment, images } = req.body;

    const review = await Review.findById(req.params.id);

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found.',
      });
    }

    if (review.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You can only edit your own reviews.',
      });
    }

    if (rating !== undefined) review.rating = rating;
    if (comment !== undefined) review.comment = comment;
    if (images !== undefined) review.images = images;

    await review.save();

    const updated = await Review.findById(review._id).populate('user', 'name profileImage');

    res.status(200).json({
      success: true,
      message: 'Review updated.',
      data: { review: updated },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update review.',
      error: error.message,
    });
  }
};

/**
 * @desc    Delete review (owner or admin)
 * @route   DELETE /api/v1/reviews/:id
 * @access  Private
 */
const deleteReview = async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found.',
      });
    }

    const isOwner = review.user.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this review.',
      });
    }

    await Review.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Review deleted.',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to delete review.',
      error: error.message,
    });
  }
};

/**
 * @desc    Vote a review as helpful
 * @route   POST /api/v1/reviews/:id/helpful
 * @access  Private
 */
const voteHelpful = async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found.',
      });
    }

    // Prevent voting on own review
    if (review.user.toString() === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'You cannot vote your own review as helpful.',
      });
    }

    // Prevent duplicate votes
    if (review.votedBy.includes(req.user._id)) {
      return res.status(400).json({
        success: false,
        message: 'You have already voted this review as helpful.',
      });
    }

    review.helpfulVotes += 1;
    review.votedBy.push(req.user._id);
    await review.save();

    res.status(200).json({
      success: true,
      message: 'Review voted as helpful.',
      data: { helpfulVotes: review.helpfulVotes },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to vote review.',
      error: error.message,
    });
  }
};

/**
 * @desc    Get all reviews for an order
 * @route   GET /api/v1/reviews/order/:orderId
 * @access  Private
 */
const getOrderReviews = async (req, res) => {
  try {
    const reviews = await Review.find({ order: req.params.orderId });
    res.status(200).json({
      success: true,
      message: 'Order reviews retrieved.',
      data: { reviews },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve order reviews.',
      error: error.message,
    });
  }
};

module.exports = {
  createReview,
  getPizzaReviews,
  updateReview,
  deleteReview,
  voteHelpful,
  getOrderReviews,
};
