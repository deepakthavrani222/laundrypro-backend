const User = require('../models/User');
const { hashPassword, comparePassword } = require('../utils/password');
const { generateAccessToken, generateEmailVerificationToken, verifyEmailVerificationToken } = require('../utils/jwt');
const { sendEmail, emailTemplates } = require('../config/email');
const crypto = require('crypto');

// Register new user
const register = async (req, res) => {
  try {
    const { name, email, phone, password } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ email }, { phone }]
    });

    if (existingUser) {
      if (existingUser.email === email) {
        return res.status(400).json({
          success: false,
          message: 'User with this email already exists'
        });
      }
      if (existingUser.phone === phone) {
        return res.status(400).json({
          success: false,
          message: 'User with this phone number already exists'
        });
      }
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create user
    const user = new User({
      name,
      email,
      phone,
      password: hashedPassword,
      isEmailVerified: false
    });

    // Generate email verification token
    const verificationToken = generateEmailVerificationToken(user._id, email);
    
    // Save user
    await user.save();

    // Send verification email
    const emailOptions = emailTemplates.verification(verificationToken, email);
    const emailResult = await sendEmail(emailOptions);

    if (!emailResult.success) {
      console.error('Failed to send verification email:', emailResult.error);
      // Don't fail registration if email fails, just log it
    }

    res.status(201).json({
      success: true,
      message: 'Registration successful! Please check your email to verify your account.',
      data: {
        userId: user._id,
        email: user.email,
        name: user.name,
        emailSent: emailResult.success
      }
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Registration failed. Please try again.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Verify email
const verifyEmail = async (req, res) => {
  try {
    const { token } = req.body;

    // Verify token
    const decoded = verifyEmailVerificationToken(token);
    
    // Find user
    const user = await User.findById(decoded.userId);
    
    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid verification token'
      });
    }

    if (user.isEmailVerified) {
      return res.status(400).json({
        success: false,
        message: 'Email is already verified'
      });
    }

    // Update user
    user.isEmailVerified = true;
    await user.save();

    // Generate access token
    const accessToken = generateAccessToken(user._id, user.email, user.role);

    res.status(200).json({
      success: true,
      message: 'Email verified successfully!',
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          role: user.role,
          isEmailVerified: user.isEmailVerified
        },
        token: accessToken
      }
    });

  } catch (error) {
    console.error('Email verification error:', error);
    res.status(400).json({
      success: false,
      message: 'Invalid or expired verification token'
    });
  }
};

// Resend verification email
const resendVerificationEmail = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (user.isEmailVerified) {
      return res.status(400).json({
        success: false,
        message: 'Email is already verified'
      });
    }

    // Generate new verification token
    const verificationToken = generateEmailVerificationToken(user._id, email);

    // Send verification email
    const emailOptions = emailTemplates.verification(verificationToken, email);
    const emailResult = await sendEmail(emailOptions);

    if (!emailResult.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to send verification email'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Verification email sent successfully!'
    });

  } catch (error) {
    console.error('Resend verification email error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to resend verification email'
    });
  }
};

// Login user
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user and include password
    const user = await User.findOne({ email }).select('+password');
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Check password
    const isPasswordValid = await comparePassword(password, user.password);
    
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated. Please contact support.'
      });
    }

    // Update last login
    await user.updateLastLogin();

    // Generate access token
    const accessToken = generateAccessToken(user._id, user.email, user.role);

    res.status(200).json({
      success: true,
      message: 'Login successful!',
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          role: user.role,
          isEmailVerified: user.isEmailVerified,
          lastLogin: user.lastLogin
        },
        token: accessToken
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Login failed. Please try again.'
    });
  }
};

// Get current user profile
const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    
    res.status(200).json({
      success: true,
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          role: user.role,
          isEmailVerified: user.isEmailVerified,
          phoneVerified: user.phoneVerified,
          addresses: user.addresses,
          preferences: user.preferences,
          rewardPoints: user.rewardPoints,
          totalOrders: user.totalOrders,
          isVIP: user.isVIP,
          lastLogin: user.lastLogin,
          createdAt: user.createdAt
        }
      }
    });

  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch profile'
    });
  }
};

// Update user profile
const updateProfile = async (req, res) => {
  try {
    const { name, phone, preferredPickupTime, savedServices } = req.body;
    
    const user = await User.findById(req.user._id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if phone is being changed and if it's already taken
    if (phone && phone !== user.phone) {
      const existingUser = await User.findOne({ phone, _id: { $ne: user._id } });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'Phone number is already registered with another account'
        });
      }
      user.phone = phone;
      user.phoneVerified = false; // Reset phone verification if changed
    }

    // Update fields
    if (name) user.name = name;
    if (preferredPickupTime) user.preferences.preferredPickupTime = preferredPickupTime;
    if (savedServices) user.preferences.savedServices = savedServices;

    await user.save();

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully!',
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          role: user.role,
          isEmailVerified: user.isEmailVerified,
          phoneVerified: user.phoneVerified,
          preferences: user.preferences
        }
      }
    });

  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update profile'
    });
  }
};

// Logout (client-side token removal)
const logout = async (req, res) => {
  try {
    res.status(200).json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Logout failed'
    });
  }
};

module.exports = {
  register,
  verifyEmail,
  resendVerificationEmail,
  login,
  getProfile,
  updateProfile,
  logout
};