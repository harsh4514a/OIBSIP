const Setting = require('../models/Setting');

/**
 * @desc    Get store settings
 * @route   GET /api/v1/settings
 * @access  Public
 */
const getSettings = async (req, res) => {
  try {
    let settings = await Setting.findOne();
    if (!settings) {
      settings = await Setting.create({});
    }
    res.status(200).json({
      success: true,
      message: 'Store settings retrieved.',
      data: settings,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve settings.',
      error: error.message,
    });
  }
};

/**
 * @desc    Update store settings
 * @route   PUT /api/v1/settings
 * @access  Admin
 */
const updateSettings = async (req, res) => {
  try {
    let settings = await Setting.findOne();
    if (!settings) {
      settings = await Setting.create(req.body);
    } else {
      Object.assign(settings, req.body);
      await settings.save();
    }
    res.status(200).json({
      success: true,
      message: 'Store settings updated.',
      data: settings,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update settings.',
      error: error.message,
    });
  }
};

module.exports = {
  getSettings,
  updateSettings,
};
