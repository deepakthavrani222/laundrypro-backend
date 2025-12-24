/**
 * Super Admin - Admin Management Routes
 * Feature: admin-rbac-system
 * 
 * Routes for managing Admin users by Super Admin.
 * Requirements: 1.1, 6.1
 */

const express = require('express');
const router = express.Router();
const { body, param, query } = require('express-validator');
const { authenticateSuperAdmin } = require('../middlewares/superAdminAuthSimple');
const {
  createAdmin,
  getAdmins,
  getAdminById,
  updateAdmin,
  updatePermissions,
  deactivateAdmin,
  reactivateAdmin,
  getPresetRoles,
  getDefaultPermissionsStructure
} = require('../controllers/superAdminAdminController');

// Apply super admin auth to all routes
router.use(authenticateSuperAdmin);

// Validation middleware
const createAdminValidation = [
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
  body('role')
    .optional()
    .isIn(['admin', 'center_admin']).withMessage('Role must be admin or center_admin'),
  body('permissions')
    .optional()
    .isObject().withMessage('Permissions must be an object'),
  body('assignedBranch')
    .optional()
    .isMongoId().withMessage('Invalid branch ID')
];

const updateAdminValidation = [
  param('id')
    .isMongoId().withMessage('Invalid admin ID'),
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

const updatePermissionsValidation = [
  param('id')
    .isMongoId().withMessage('Invalid admin ID'),
  body('permissions')
    .notEmpty().withMessage('Permissions are required')
    .isObject().withMessage('Permissions must be an object')
];

const idParamValidation = [
  param('id')
    .isMongoId().withMessage('Invalid admin ID')
];

// Routes

/**
 * GET /api/superadmin/admins/preset-roles
 * Get all preset role templates
 */
router.get('/preset-roles', getPresetRoles);

/**
 * GET /api/superadmin/admins/default-permissions
 * Get default (empty) permissions structure
 */
router.get('/default-permissions', getDefaultPermissionsStructure);

/**
 * POST /api/superadmin/admins
 * Create a new admin
 */
router.post('/', createAdminValidation, createAdmin);

/**
 * GET /api/superadmin/admins
 * Get all admins with pagination
 */
router.get('/', getAdmins);

/**
 * GET /api/superadmin/admins/:id
 * Get single admin by ID
 */
router.get('/:id', idParamValidation, getAdminById);

/**
 * PUT /api/superadmin/admins/:id
 * Update admin profile and permissions
 */
router.put('/:id', updateAdminValidation, updateAdmin);

/**
 * PUT /api/superadmin/admins/:id/permissions
 * Update admin permissions only
 */
router.put('/:id/permissions', updatePermissionsValidation, updatePermissions);

/**
 * DELETE /api/superadmin/admins/:id
 * Deactivate admin (soft delete)
 */
router.delete('/:id', idParamValidation, deactivateAdmin);

/**
 * PUT /api/superadmin/admins/:id/reactivate
 * Reactivate a deactivated admin
 */
router.put('/:id/reactivate', idParamValidation, reactivateAdmin);

module.exports = router;
