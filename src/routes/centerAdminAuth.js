const express = require('express')
const router = express.Router()
const centerAdminAuthController = require('../controllers/centerAdminAuthControllerSimple')
const { authenticateCenterAdmin } = require('../middlewares/centerAdminAuthSimple')
const { body } = require('express-validator')
const NotificationService = require('../services/notificationService')
const { sendSuccess, sendError, asyncHandler } = require('../utils/helpers')

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

// Notification routes
router.get('/notifications',
  authenticateCenterAdmin,
  asyncHandler(async (req, res) => {
    const { page = 1, limit = 20, unreadOnly } = req.query
    
    const result = await NotificationService.getUserNotifications(req.admin._id, {
      page: parseInt(page),
      limit: parseInt(limit),
      unreadOnly: unreadOnly === 'true'
    })

    sendSuccess(res, result, 'Notifications retrieved successfully')
  })
)

router.get('/notifications/unread-count',
  authenticateCenterAdmin,
  asyncHandler(async (req, res) => {
    const result = await NotificationService.getUserNotifications(req.admin._id, {
      page: 1,
      limit: 1
    })

    sendSuccess(res, { unreadCount: result.unreadCount }, 'Unread count retrieved successfully')
  })
)

router.put('/notifications/mark-read',
  authenticateCenterAdmin,
  asyncHandler(async (req, res) => {
    const { notificationIds } = req.body

    if (!notificationIds || !Array.isArray(notificationIds)) {
      return sendError(res, 'INVALID_DATA', 'Notification IDs array is required', 400)
    }

    await NotificationService.markAsRead(req.admin._id, notificationIds)

    sendSuccess(res, null, 'Notifications marked as read')
  })
)

router.put('/notifications/mark-all-read',
  authenticateCenterAdmin,
  asyncHandler(async (req, res) => {
    await NotificationService.markAllAsRead(req.admin._id)

    sendSuccess(res, null, 'All notifications marked as read')
  })
)

module.exports = router