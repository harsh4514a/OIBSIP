const User = require('../models/User');

/**
 * @desc    Get user profile
 * @route   GET /api/v1/users/profile
 * @access  Private
 */
const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate('wishlist', 'name image basePrice ratings category');

    res.status(200).json({
      success: true,
      message: 'Profile retrieved.',
      data: { user },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve profile.',
      error: error.message,
    });
  }
};

/**
 * @desc    Update user profile (name, phone)
 * @route   PUT /api/v1/users/profile
 * @access  Private
 */
const updateProfile = async (req, res) => {
  try {
    const { name, phone } = req.body;

    const updateFields = {};
    if (name) updateFields.name = name;
    if (phone) updateFields.phone = phone;

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $set: updateFields },
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully.',
      data: { user },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update profile.',
      error: error.message,
    });
  }
};

/**
 * @desc    Add a new address
 * @route   POST /api/v1/users/addresses
 * @access  Private
 */
const addAddress = async (req, res) => {
  try {
    const { label, street, city, state, pincode, phone, isDefault } = req.body;

    const user = await User.findById(req.user._id);

    // If new address is default, unset existing defaults
    if (isDefault) {
      user.addresses.forEach((addr) => {
        addr.isDefault = false;
      });
    }

    // If first address, make it default
    const makeDefault = isDefault || user.addresses.length === 0;

    user.addresses.push({ label, street, city, state, pincode, phone, isDefault: makeDefault });
    await user.save();

    res.status(201).json({
      success: true,
      message: 'Address added successfully.',
      data: { addresses: user.addresses },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to add address.',
      error: error.message,
    });
  }
};

/**
 * @desc    Update an existing address
 * @route   PUT /api/v1/users/addresses/:addressId
 * @access  Private
 */
const updateAddress = async (req, res) => {
  try {
    const { addressId } = req.params;
    const { label, street, city, state, pincode, phone, isDefault } = req.body;

    const user = await User.findById(req.user._id);
    const address = user.addresses.id(addressId);

    if (!address) {
      return res.status(404).json({
        success: false,
        message: 'Address not found.',
      });
    }

    // If setting as default, unset others
    if (isDefault) {
      user.addresses.forEach((addr) => {
        addr.isDefault = false;
      });
    }

    if (label !== undefined) address.label = label;
    if (street !== undefined) address.street = street;
    if (city !== undefined) address.city = city;
    if (state !== undefined) address.state = state;
    if (pincode !== undefined) address.pincode = pincode;
    if (phone !== undefined) address.phone = phone;
    if (isDefault !== undefined) address.isDefault = isDefault;

    await user.save();

    res.status(200).json({
      success: true,
      message: 'Address updated successfully.',
      data: { addresses: user.addresses },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update address.',
      error: error.message,
    });
  }
};

/**
 * @desc    Delete an address
 * @route   DELETE /api/v1/users/addresses/:addressId
 * @access  Private
 */
const deleteAddress = async (req, res) => {
  try {
    const { addressId } = req.params;

    const user = await User.findById(req.user._id);
    const address = user.addresses.id(addressId);

    if (!address) {
      return res.status(404).json({
        success: false,
        message: 'Address not found.',
      });
    }

    address.deleteOne();
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Address deleted successfully.',
      data: { addresses: user.addresses },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to delete address.',
      error: error.message,
    });
  }
};

/**
 * @desc    Add pizza to wishlist
 * @route   POST /api/v1/users/wishlist
 * @access  Private
 */
const addToWishlist = async (req, res) => {
  try {
    const { pizzaId } = req.body;

    const user = await User.findById(req.user._id);

    if (user.wishlist.includes(pizzaId)) {
      return res.status(400).json({
        success: false,
        message: 'Pizza is already in your wishlist.',
      });
    }

    user.wishlist.push(pizzaId);
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Pizza added to wishlist.',
      data: { wishlist: user.wishlist },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to add to wishlist.',
      error: error.message,
    });
  }
};

/**
 * @desc    Remove pizza from wishlist
 * @route   DELETE /api/v1/users/wishlist/:pizzaId
 * @access  Private
 */
const removeFromWishlist = async (req, res) => {
  try {
    const { pizzaId } = req.params;

    await User.findByIdAndUpdate(
      req.user._id,
      { $pull: { wishlist: pizzaId } },
      { new: true }
    );

    res.status(200).json({
      success: true,
      message: 'Pizza removed from wishlist.',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to remove from wishlist.',
      error: error.message,
    });
  }
};

/**
 * @desc    Get user's wishlist
 * @route   GET /api/v1/users/wishlist
 * @access  Private
 */
const getWishlist = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate(
      'wishlist',
      'name image basePrice ratings category isAvailable description'
    );

    res.status(200).json({
      success: true,
      message: 'Wishlist retrieved.',
      data: { wishlist: user.wishlist },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve wishlist.',
      error: error.message,
    });
  }
};

/**
 * @desc    Get all users (admin)
 * @route   GET /api/v1/users
 * @access  Admin
 */
const getAllUsers = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const search = req.query.search || '';
    const role = req.query.role || '';

    const query = {};
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }
    if (role) query.role = role;

    const [users, total] = await Promise.all([
      User.find(query).select('-password').skip(skip).limit(limit).sort({ createdAt: -1 }),
      User.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      message: 'Users retrieved.',
      data: {
        users,
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
      message: 'Failed to retrieve users.',
      error: error.message,
    });
  }
};

/**
 * @desc    Delete a user (admin)
 * @route   DELETE /api/v1/users/:userId
 * @access  Admin
 */
const deleteUser = async (req, res) => {
  try {
    const { userId } = req.params;

    // Prevent admin from deleting themselves
    if (userId === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'You cannot delete your own account.',
      });
    }

    const user = await User.findByIdAndDelete(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.',
      });
    }

    res.status(200).json({
      success: true,
      message: 'User deleted successfully.',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to delete user.',
      error: error.message,
    });
  }
};

module.exports = {
  getProfile,
  updateProfile,
  addAddress,
  updateAddress,
  deleteAddress,
  addToWishlist,
  removeFromWishlist,
  getWishlist,
  getAllUsers,
  deleteUser,
};
