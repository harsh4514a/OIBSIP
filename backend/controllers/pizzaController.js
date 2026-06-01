const Pizza = require('../models/Pizza');
const cloudinary = require('../config/cloudinary');

/**
 * @desc    Get all pizzas with search, filter, sort, pagination
 * @route   GET /api/v1/pizzas
 * @access  Public
 */
const getAllPizzas = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12;
    const skip = (page - 1) * limit;

    const query = {};

    // Search by name
    if (req.query.search) {
      query.$or = [
        { name: { $regex: req.query.search, $options: 'i' } },
        { description: { $regex: req.query.search, $options: 'i' } },
        { tags: { $regex: req.query.search, $options: 'i' } },
      ];
    }

    // Category filter
    const VALID_CATEGORIES = ['classic', 'cheese', 'italian', 'mexican', 'indian-fusion', 'spicy', 'premium', 'signature'];
    if (req.query.category && VALID_CATEGORIES.includes(req.query.category)) {
      query.category = req.query.category;
    }

    // Availability filter (admins see all, users only see available)
    if (!req.user || req.user.role !== 'admin') {
      query.isAvailable = true;
    } else if (req.query.isAvailable !== undefined) {
      query.isAvailable = req.query.isAvailable === 'true';
    }

    // Price filter
    if (req.query.minPrice || req.query.maxPrice) {
      query.basePrice = {};
      if (req.query.minPrice) query.basePrice.$gte = parseFloat(req.query.minPrice);
      if (req.query.maxPrice) query.basePrice.$lte = parseFloat(req.query.maxPrice);
    }

    // Tags filter
    if (req.query.tags) {
      query.tags = { $in: req.query.tags.split(',').map((t) => t.trim().toLowerCase()) };
    }

    // Sorting
    const sortOptions = {
      newest: { createdAt: -1 },
      oldest: { createdAt: 1 },
      'price-low': { basePrice: 1 },
      'price-high': { basePrice: -1 },
      rating: { 'ratings.average': -1 },
      popular: { 'ratings.count': -1 },
    };
    const sort = sortOptions[req.query.sort] || { createdAt: -1 };

    const [pizzas, total] = await Promise.all([
      Pizza.find(query).sort(sort).skip(skip).limit(limit),
      Pizza.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      message: 'Pizzas retrieved.',
      data: {
        pizzas,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1,
        },
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve pizzas.',
      error: error.message,
    });
  }
};

/**
 * @desc    Get featured pizzas
 * @route   GET /api/v1/pizzas/featured
 * @access  Public
 */
const getFeaturedPizzas = async (req, res) => {
  try {
    const pizzas = await Pizza.find({ isFeatured: true, isAvailable: true })
      .sort({ 'ratings.average': -1 })
      .limit(6);

    res.status(200).json({
      success: true,
      message: 'Featured pizzas retrieved.',
      data: { pizzas },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve featured pizzas.',
      error: error.message,
    });
  }
};

/**
 * @desc    Get pizza by ID with reviews
 * @route   GET /api/v1/pizzas/:id
 * @access  Public
 */
const getPizzaById = async (req, res) => {
  try {
    const pizza = await Pizza.findById(req.params.id)
      .populate({
        path: 'reviews',
        select: 'rating comment user createdAt isVerified helpfulVotes images',
        populate: { path: 'user', select: 'name profileImage' },
        options: { limit: 10, sort: { createdAt: -1 } },
      });

    if (!pizza) {
      return res.status(404).json({
        success: false,
        message: 'Pizza not found.',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Pizza retrieved.',
      data: { pizza },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve pizza.',
      error: error.message,
    });
  }
};

/**
 * @desc    Create a new pizza (admin)
 * @route   POST /api/v1/pizzas
 * @access  Admin
 */
const createPizza = async (req, res) => {
  try {
    const {
      name,
      description,
      category,
      basePrice,
      sizes,
      ingredients,
      isFeatured,
      isAvailable,
      tags,
    } = req.body;

    // Image uploaded via Cloudinary middleware or passed directly in body
    let imageUrl = '';
    if (req.file) {
      imageUrl = req.file.path || req.file.secure_url;
    } else if (req.body.image) {
      imageUrl = req.body.image;
    } else {
      return res.status(400).json({
        success: false,
        message: 'Pizza image is required.',
      });
    }

    const parsedSizes = sizes ? (typeof sizes === 'string' ? JSON.parse(sizes) : sizes) : [
      { size: 'small', priceMultiplier: 0.8 },
      { size: 'medium', priceMultiplier: 1 },
      { size: 'large', priceMultiplier: 1.3 },
      { size: 'xl', priceMultiplier: 1.6 },
    ];
    const parsedIngredients = ingredients ? (typeof ingredients === 'string' ? JSON.parse(ingredients) : ingredients) : [];
    const parsedTags = tags ? (typeof tags === 'string' ? JSON.parse(tags) : tags) : [];

    const pizza = await Pizza.create({
      name,
      description,
      category,
      basePrice: parseFloat(basePrice),
      sizes: parsedSizes,
      image: imageUrl,
      ingredients: parsedIngredients,
      isFeatured: isFeatured === 'true' || isFeatured === true,
      isAvailable: isAvailable !== 'false' && isAvailable !== false,
      tags: parsedTags,
      createdBy: req.user._id,
    });

    res.status(201).json({
      success: true,
      message: 'Pizza created successfully.',
      data: { pizza },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to create pizza.',
      error: error.message,
    });
  }
};

/**
 * @desc    Update a pizza (admin)
 * @route   PUT /api/v1/pizzas/:id
 * @access  Admin
 */
const updatePizza = async (req, res) => {
  try {
    const pizza = await Pizza.findById(req.params.id);

    if (!pizza) {
      return res.status(404).json({
        success: false,
        message: 'Pizza not found.',
      });
    }

    const updateData = { ...req.body };

    // Parse JSON fields if sent as strings (form-data)
    if (updateData.sizes && typeof updateData.sizes === 'string') {
      updateData.sizes = JSON.parse(updateData.sizes);
    }
    if (updateData.ingredients && typeof updateData.ingredients === 'string') {
      updateData.ingredients = JSON.parse(updateData.ingredients);
    }
    if (updateData.tags && typeof updateData.tags === 'string') {
      updateData.tags = JSON.parse(updateData.tags);
    }
    if (updateData.basePrice) {
      updateData.basePrice = parseFloat(updateData.basePrice);
    }
    if (updateData.isFeatured !== undefined) {
      updateData.isFeatured = updateData.isFeatured === 'true' || updateData.isFeatured === true;
    }
    if (updateData.isAvailable !== undefined) {
      updateData.isAvailable = updateData.isAvailable !== 'false' && updateData.isAvailable !== false;
    }

    // Handle image update
    if (req.file) {
      // Delete old image from Cloudinary
      if (pizza.image) {
        const publicId = pizza.image.split('/').slice(-2).join('/').split('.')[0];
        try {
          await cloudinary.uploader.destroy(publicId);
        } catch (e) {
          console.warn('Could not delete old image:', e.message);
        }
      }
      updateData.image = req.file.path || req.file.secure_url;
    }

    const updatedPizza = await Pizza.findByIdAndUpdate(
      req.params.id,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      message: 'Pizza updated successfully.',
      data: { pizza: updatedPizza },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update pizza.',
      error: error.message,
    });
  }
};

/**
 * @desc    Delete a pizza (admin) - soft or hard delete
 * @route   DELETE /api/v1/pizzas/:id
 * @access  Admin
 */
const deletePizza = async (req, res) => {
  try {
    const pizza = await Pizza.findById(req.params.id);

    if (!pizza) {
      return res.status(404).json({
        success: false,
        message: 'Pizza not found.',
      });
    }

    // Hard delete if query param is set
    if (req.query.hard === 'true') {
      // Remove from Cloudinary
      if (pizza.image) {
        const publicId = pizza.image.split('/').slice(-2).join('/').split('.')[0];
        try {
          await cloudinary.uploader.destroy(publicId);
        } catch (e) {
          console.warn('Could not delete image:', e.message);
        }
      }
      await Pizza.findByIdAndDelete(req.params.id);

      return res.status(200).json({
        success: true,
        message: 'Pizza permanently deleted.',
      });
    }

    // Soft delete — mark as unavailable
    pizza.isAvailable = false;
    await pizza.save();

    res.status(200).json({
      success: true,
      message: 'Pizza marked as unavailable.',
      data: { pizza },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to delete pizza.',
      error: error.message,
    });
  }
};

/**
 * @desc    Toggle pizza availability (admin)
 * @route   PATCH /api/v1/pizzas/:id/toggle
 * @access  Admin
 */
const toggleAvailability = async (req, res) => {
  try {
    const pizza = await Pizza.findById(req.params.id);

    if (!pizza) {
      return res.status(404).json({
        success: false,
        message: 'Pizza not found.',
      });
    }

    pizza.isAvailable = !pizza.isAvailable;
    await pizza.save();

    res.status(200).json({
      success: true,
      message: `Pizza marked as ${pizza.isAvailable ? 'available' : 'unavailable'}.`,
      data: { pizza },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to toggle availability.',
      error: error.message,
    });
  }
};

/**
 * @desc    Text search for pizzas
 * @route   GET /api/v1/pizzas/search
 * @access  Public
 */
const searchPizzas = async (req, res) => {
  try {
    const { q } = req.query;

    if (!q) {
      return res.status(400).json({
        success: false,
        message: 'Search query is required.',
      });
    }

    const pizzas = await Pizza.find(
      { $text: { $search: q }, isAvailable: true },
      { score: { $meta: 'textScore' } }
    )
      .sort({ score: { $meta: 'textScore' } })
      .limit(20);

    res.status(200).json({
      success: true,
      message: `Search results for "${q}".`,
      data: {
        pizzas,
        count: pizzas.length,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Search failed.',
      error: error.message,
    });
  }
};

module.exports = {
  getAllPizzas,
  getFeaturedPizzas,
  getPizzaById,
  createPizza,
  updatePizza,
  deletePizza,
  toggleAvailability,
  searchPizzas,
};
