const express = require('express');
const router = express.Router();
const centerAdminUsersController = require('../controllers/centerAdminUsersController');
const { authenticateCenterAdmin, requirePermission } = require('../middlewares/centerAdminAuth');

// All routes require authentication and users permission
router.use(authenticateCenterAdmin);
router.use(requirePermission('users'));

// Get all users
router.get('/', centerAdminUsersController.getAllUsers);

// Get user by ID
router.get('/:userId', centerAdminUsersController.getUserById);

// Update user status
router.patch('/:userId/status', centerAdminUsersController.updateUserStatus);

// Update user role
router.patch('/:userId/role', centerAdminUsersController.updateUserRole);

module.exports = router;
