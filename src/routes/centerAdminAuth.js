const express = require('express')
const router = express.Router()
const centerAdminAuthController = require('../controllers/centerAdminAuthControllerSimple')
const { authenticateCenterAdmin } = require('../middlewares/centerAdminAuthSimple')
const { body } = require('express-validator')

// Validation middleware
const validateLogin = [
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
]

// Public routes (no authentication required)

// Login - Simplified
router.post('/login', 
  validateLogin,
  centerAdminAuthController.login
)

// MFA Verification - Placeholder
router.post('/verify-mfa',
  centerAdminAuthController.verifyMFA
)

// Protected routes (authentication required)

// Logout
router.post('/logout',
  authenticateCenterAdmin,
  centerAdminAuthController.logout
)

// Logout from all devices
router.post('/logout-all',
  authenticateCenterAdmin,
  centerAdminAuthController.logoutAll
)

// Get current admin profile
router.get('/profile',
  authenticateCenterAdmin,
  centerAdminAuthController.getProfile
)

// Enable MFA - Placeholder
router.post('/mfa/enable',
  authenticateCenterAdmin,
  centerAdminAuthController.enableMFA
)

// Disable MFA - Placeholder
router.post('/mfa/disable',
  authenticateCenterAdmin,
  centerAdminAuthController.disableMFA
)

module.exports = router