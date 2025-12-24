/**
 * Admin - Staff Management Routes
 * Feature: admin-rbac-system
 * 
 * Routes for managing Staff users by Admin.
 * Requirements: 4.1
 */

const express = require('express');
const router = express.Router();
const { body, param } = require('express-validator');
const { protect, restrictTo } = require('../middlewares/auth');
const { USER_ROLES } = require('../config/constants');
const {
  createStaff,
  getMyStaff,
  getStaffById,
  updateStaff,
  deactivateStaff,
  reactivateStaff
} = require('../controllers/adminStaffController');

// Apply authentication and restrict to admin role
router.use(protect);
router.use(restrictTo(USER_ROLES.ADMIN, USER_ROLES.CENTER_ADMIN));

// Validation middleware
const createStaffValidation = [
  body('name')
    .trim()
    .notEmpty().withMessage('Name is required')
    .isLength({ min: 2, max: 50 }).withMessage('Name must be between 2 and 50 characters'),
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please enter a valid email'),
  body('phone')
    .trim()
    .notEmpty().withMessage('Phone number is required')
    .matches(/^[6-9]\d{9}$/).withMessage('Please enter a valid 10-digit phone number'),
  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('permissions')
    .optional()
    .isObject().withMessage('Permissions must be an object')
];

const updateStaffValidation = [
  param('id')
    .isMongoId().withMessage('Invalid staff ID'),
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 }).withMessage('Name must be between 2 and 50 characters'),
  body('phone')
    .optional()
    .trim()
    .matches(/^[6-9]\d{9}$/).withMessage('Please enter a valid 10-digit phone number'),
  body('permissions')
    .optional()
    .isObject().withMessage('Permissions must be an object')
];

const idParamValidation = [
  param('id')
    .isMongoId().withMessage('Invalid staff ID')
];

// Routes

/**
 * POST /api/admin/staff
 * Create a new staff member
 */
router.post('/', createStaffValidation, createStaff);

/**
 * GET /api/admin/staff
 * Get all staff created by current admin
 */
router.get('/', getMyStaff);

/**
 * GET /api/admin/staff/:id
 * Get single staff by ID
 */
router.get('/:id', idParamValidation, getStaffById);

/**
 * PUT /api/admin/staff/:id
 * Update staff profile and permissions
 */
router.put('/:id', updateStaffValidation, updateStaff);

/**
 * DELETE /api/admin/staff/:id
 * Deactivate staff
 */
router.delete('/:id', idParamValidation, deactivateStaff);

/**
 * PUT /api/admin/staff/:id/reactivate
 * Reactivate a deactivated staff
 */
router.put('/:id/reactivate', idParamValidation, reactivateStaff);

module.exports = router;
