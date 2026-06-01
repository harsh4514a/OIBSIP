const express = require('express');
const { getSettings, updateSettings } = require('../controllers/settingController');
const { protect } = require('../middleware/auth');
const { adminAuth } = require('../middleware/adminAuth');

const router = express.Router();

router.get('/', getSettings);
router.put('/', protect, adminAuth, updateSettings);

module.exports = router;
