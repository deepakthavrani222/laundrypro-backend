const jwt = require('jsonwebtoken');
const User = require('../models/User');
const CenterAdmin = require('../models/CenterAdmin');
const SuperAdmin = require('../models/SuperAdmin');
const { verifyAccessToken, verifyToken } = require('../utils/jwt');
const { getTokenFromRequest } = require('../utils/cookieConfig');

// Protect routes - require authentication
const protect = async (req, res, next) => {
  try {
    // Get token from cookie or header
    const token = getTokenFromRequest(req);

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.'
      });
    }

    try {
      // Verify token
      const decoded = verifyAccessToken(token);
      
      // Get user from database
      const user = await User.findById(decoded.userId).select('-password');
      
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Token is valid but user no longer exists'
        });
      }

      if (!user.isActive) {
        return res.status(401).json({
          success: false,
          message: 'User account is deactivated'
        });
      }

      // Add user to request object
      req.user = user;
      next();
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error in authentication'
    });
  }
};

// Protect routes - accepts both regular user and center admin tokens
const protectAny = async (req, res, next) => {
  try {
    // Get token from cookie or header
    const token = getTokenFromRequest(req);

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.'
      });
    }

    try {
      // Use verifyToken (not verifyAccessToken) to accept both token types
      const decoded = verifyToken(token);
      
      // Check if it's a center admin/superadmin token (has adminId)
      if (decoded.adminId) {
        // Try SuperAdmin first, then CenterAdmin
        let admin = await SuperAdmin.findById(decoded.adminId).select('-password');
        if (!admin) {
          admin = await CenterAdmin.findById(decoded.adminId).select('-password');
        }
        
        if (admin && admin.isActive) {
          req.user = admin;
          req.isCenterAdmin = true;
          req.isSuperAdmin = decoded.role === 'superadmin';
          return next();
        }
      }
      
      // Try as regular user (has userId)
      if (decoded.userId) {
        const user = await User.findById(decoded.userId).select('-password');
        if (user && user.isActive) {
          req.user = user;
          req.isCenterAdmin = false;
          return next();
        }
      }

      return res.status(401).json({
        success: false,
        message: 'Invalid token or user not found'
      });
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error in authentication'
    });
  }
};

// Restrict to specific roles
const restrictTo = (...roles) => {
  return (req, res, next) => {
    // Map superadmin to center_admin for backward compatibility
    const userRole = req.user.role;
    const effectiveRoles = [...roles];
    
    // If center_admin is allowed, also allow superadmin
    if (roles.includes('center_admin') && !roles.includes('superadmin')) {
      effectiveRoles.push('superadmin');
    }
    
    // If super_admin is allowed, also allow superadmin
    if (roles.includes('super_admin') && !roles.includes('superadmin')) {
      effectiveRoles.push('superadmin');
    }
    
    if (!effectiveRoles.includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Insufficient permissions.'
      });
    }
    next();
  };
};

// Check if email is verified
const requireEmailVerification = (req, res, next) => {
  if (!req.user.isEmailVerified) {
    return res.status(403).json({
      success: false,
      message: 'Please verify your email address to access this resource',
      requiresEmailVerification: true
    });
  }
  next();
};

// Optional authentication - doesn't fail if no token
const optionalAuth = async (req, res, next) => {
  try {
    // Get token from cookie or header
    const token = getTokenFromRequest(req);

    if (token) {
      try {
        const decoded = verifyAccessToken(token);
        const user = await User.findById(decoded.userId).select('-password');
        
        if (user && user.isActive) {
          req.user = user;
        }
      } catch (error) {
        // Token is invalid, but we continue without user
        console.log('Optional auth: Invalid token, continuing without user');
      }
    }

    next();
  } catch (error) {
    console.error('Optional auth middleware error:', error);
    next();
  }
};

module.exports = {
  protect,
  protectAny,
  restrictTo,
  requireEmailVerification,
  optionalAuth
};