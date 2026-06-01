const crypto = require('crypto');
const User = require('../models/User');
const { sendOTPEmail } = require('../utils/emailService');

// In-memory store for failed login attempts by email
const failedLoginAttempts = new Map();

const getFailedAttemptsKey = (email) => `failed_email_${(email || '').toLowerCase()}`;

const checkEmailLockout = (email) => {
  if (!email) return { isLocked: false };
  const key = getFailedAttemptsKey(email);
  const record = failedLoginAttempts.get(key);
  if (record && record.lockUntil && record.lockUntil > Date.now()) {
    return {
      isLocked: true,
      timeLeft: Math.ceil((record.lockUntil - Date.now()) / (60 * 1000)),
    };
  }
  return { isLocked: false };
};

const recordFailedAttempt = (email) => {
  if (!email) return null;
  const key = getFailedAttemptsKey(email);
  let record = failedLoginAttempts.get(key);
  if (!record || (record.lockUntil && record.lockUntil <= Date.now())) {
    record = { count: 0, lockUntil: null };
  }
  record.count += 1;
  if (record.count >= 5) {
    record.lockUntil = Date.now() + 15 * 60 * 1000; // Lock for 15 minutes
  }
  failedLoginAttempts.set(key, record);
  return record;
};

const clearFailedAttempts = (email) => {
  if (!email) return;
  const key = getFailedAttemptsKey(email);
  failedLoginAttempts.delete(key);
};

/**
 * Generate a 6-digit OTP
 * @returns {string}
 */
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

/**
 * @desc    Register a new user
 * @route   POST /api/v1/auth/register
 * @access  Public
 */
const register = async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'An account with this email already exists.',
      });
    }

    // Generate OTP
    const otp = generateOTP();
    const otpExpire = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Create user
    const user = await User.create({
      name,
      email: email.toLowerCase(),
      password,
      phone,
      emailVerifyOTP: otp,
      emailVerifyOTPExpire: otpExpire,
    });

    // Send verification email
    try {
      await sendOTPEmail(user.email, otp, 'verify');
    } catch (emailError) {
      console.error('Email send error (non-fatal):', emailError.message);
    }

    res.status(201).json({
      success: true,
      message: 'Registration successful! Please verify your email with the OTP sent.',
      data: {
        userId: user._id,
        email: user.email,
        name: user.name,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Registration failed.',
      error: error.message,
    });
  }
};

/**
 * @desc    Verify email with OTP
 * @route   POST /api/v1/auth/verify-email
 * @access  Public
 */
const verifyEmail = async (req, res) => {
  try {
    const { email, otp } = req.body;

    const user = await User.findOne({ email: email.toLowerCase() })
      .select('+emailVerifyOTP +emailVerifyOTPExpire');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.',
      });
    }

    if (user.isEmailVerified) {
      return res.status(400).json({
        success: false,
        message: 'Email is already verified. Please log in.',
      });
    }

    if (!user.emailVerifyOTP || user.emailVerifyOTP !== otp) {
      return res.status(400).json({
        success: false,
        message: 'Invalid OTP. Please check your email.',
      });
    }

    if (!user.emailVerifyOTPExpire || user.emailVerifyOTPExpire < new Date()) {
      return res.status(400).json({
        success: false,
        message: 'OTP has expired. Please request a new one.',
      });
    }

    // Mark as verified
    user.isEmailVerified = true;
    user.emailVerifyOTP = undefined;
    user.emailVerifyOTPExpire = undefined;
    await user.save();

    // Generate JWT
    const token = user.generateJWT();

    res.status(200).json({
      success: true,
      message: 'Email verified successfully! Welcome to PizzaHub 🍕',
      data: {
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          isEmailVerified: user.isEmailVerified,
        },
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Email verification failed.',
      error: error.message,
    });
  }
};

/**
 * @desc    Resend OTP to email
 * @route   POST /api/v1/auth/resend-otp
 * @access  Public
 */
const resendOTP = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email: email.toLowerCase() })
      .select('+emailVerifyOTP +emailVerifyOTPExpire');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.',
      });
    }

    if (user.isEmailVerified) {
      return res.status(400).json({
        success: false,
        message: 'Email is already verified.',
      });
    }

    // Generate new OTP
    const otp = generateOTP();
    user.emailVerifyOTP = otp;
    user.emailVerifyOTPExpire = new Date(Date.now() + 10 * 60 * 1000);
    await user.save();

    await sendOTPEmail(user.email, otp, 'verify');

    res.status(200).json({
      success: true,
      message: 'A new OTP has been sent to your email.',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to resend OTP.',
      error: error.message,
    });
  }
};

/**
 * @desc    Login user
 * @route   POST /api/v1/auth/login
 * @access  Public
 */
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Please provide an email address.',
      });
    }

    const lockout = checkEmailLockout(email);
    if (lockout.isLocked) {
      return res.status(429).json({
        success: false,
        message: `Too many authentication attempts. Please try again after 15 minutes.`,
      });
    }

    const user = await User.findOne({ email: email.toLowerCase(), role: 'user' }).select('+password');

    if (!user) {
      console.log(`❌ User login failed: email "${email}" not found or role is not 'user'`);
      recordFailedAttempt(email);
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      });
    }

    if (!user.isEmailVerified) {
      console.log(`❌ User login failed: email "${email}" is not verified`);
      return res.status(403).json({
        success: false,
        message: 'Please verify your email before logging in.',
        requiresVerification: true,
        email: user.email,
      });
    }

    if (!user.isActive) {
      console.log(`❌ User login failed: user "${email}" is inactive`);
      return res.status(403).json({
        success: false,
        message: 'Your account has been deactivated. Contact support.',
      });
    }

    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      console.log(`❌ User login failed: incorrect password for "${email}"`);
      recordFailedAttempt(email);
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      });
    }

    console.log(`✅ User logged in successfully: "${email}"`);
    // Success: Clear failed attempts for this email
    clearFailedAttempts(email);

    const token = user.generateJWT();

    res.status(200).json({
      success: true,
      message: 'Login successful!',
      data: {
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          role: user.role,
          isEmailVerified: user.isEmailVerified,
          addresses: user.addresses,
          wishlist: user.wishlist,
        },
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Login failed.',
      error: error.message,
    });
  }
};

/**
 * @desc    Admin login
 * @route   POST /api/v1/auth/admin-login
 * @access  Public
 */
const adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Please provide an email address.',
      });
    }

    const lockout = checkEmailLockout(email);
    if (lockout.isLocked) {
      return res.status(429).json({
        success: false,
        message: `Too many authentication attempts. Please try again after 15 minutes.`,
      });
    }

    const user = await User.findOne({ email: email.toLowerCase(), role: 'admin' }).select('+password');

    if (!user) {
      console.log(`❌ Admin login failed: email "${email}" not found or role is not 'admin'`);
      recordFailedAttempt(email);
      return res.status(401).json({
        success: false,
        message: 'Invalid admin credentials.',
      });
    }

    if (!user.isActive) {
      console.log(`❌ Admin login failed: admin "${email}" is inactive`);
      return res.status(403).json({
        success: false,
        message: 'Admin account is deactivated.',
      });
    }

    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      console.log(`❌ Admin login failed: incorrect password for admin "${email}"`);
      recordFailedAttempt(email);
      return res.status(401).json({
        success: false,
        message: 'Invalid admin credentials.',
      });
    }

    console.log(`✅ Admin logged in successfully: "${email}"`);
    // Success: Clear failed attempts for this email
    clearFailedAttempts(email);

    const token = user.generateJWT();

    res.status(200).json({
      success: true,
      message: 'Admin login successful!',
      data: {
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          role: user.role,
          isEmailVerified: user.isEmailVerified,
        },
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Admin login failed.',
      error: error.message,
    });
  }
};

/**
 * @desc    Forgot password - send OTP
 * @route   POST /api/v1/auth/forgot-password
 * @access  Public
 */
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      // Return success even if user not found (security)
      return res.status(200).json({
        success: true,
        message: 'If an account with this email exists, a reset OTP has been sent.',
      });
    }

    const otp = generateOTP();
    user.resetPasswordOTP = otp;
    user.resetPasswordOTPExpire = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    await user.save();

    try {
      await sendOTPEmail(user.email, otp, 'reset');
    } catch (emailError) {
      console.error('Reset OTP email error:', emailError.message);
    }

    res.status(200).json({
      success: true,
      message: 'If an account with this email exists, a reset OTP has been sent.',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to process forgot password request.',
      error: error.message,
    });
  }
};

/**
 * @desc    Reset password with OTP
 * @route   POST /api/v1/auth/reset-password
 * @access  Public
 */
const resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    const user = await User.findOne({ email: email.toLowerCase() })
      .select('+resetPasswordOTP +resetPasswordOTPExpire');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.',
      });
    }

    if (!user.resetPasswordOTP || user.resetPasswordOTP !== otp) {
      return res.status(400).json({
        success: false,
        message: 'Invalid OTP.',
      });
    }

    if (!user.resetPasswordOTPExpire || user.resetPasswordOTPExpire < new Date()) {
      return res.status(400).json({
        success: false,
        message: 'OTP has expired. Please request a new one.',
      });
    }

    // Update password
    user.password = newPassword;
    user.resetPasswordOTP = undefined;
    user.resetPasswordOTPExpire = undefined;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Password reset successfully! Please log in with your new password.',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Password reset failed.',
      error: error.message,
    });
  }
};

/**
 * @desc    Get current logged-in user
 * @route   GET /api/v1/auth/me
 * @access  Private
 */
const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate('wishlist', 'name image basePrice ratings category');

    res.status(200).json({
      success: true,
      message: 'User profile retrieved.',
      data: { user },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get user profile.',
      error: error.message,
    });
  }
};

/**
 * @desc    Logout user (client-side token removal)
 * @route   POST /api/v1/auth/logout
 * @access  Private
 */
const logout = (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Logged out successfully. Please remove the token on the client side.',
  });
};

module.exports = {
  register,
  verifyEmail,
  resendOTP,
  login,
  adminLogin,
  forgotPassword,
  resetPassword,
  getMe,
  logout,
};
