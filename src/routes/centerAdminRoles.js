const express = require('express')
const router = express.Router()
const centerAdminRoleController = require('../controllers/centerAdminRoleController')
const { authenticateCenterAdmin, requirePermission, logAdminAction } = require('../middlewares/centerAdminAuth')
const { body, param } = require('express-validator')

// Validation rules
const validateRoleCreation = [
  body('name')
    .isLength({ min: 2, max: 50 })
    .matches(/^[a-z_]+$/)
    .withMessage('Role name must be lowercase with underscores only'),
  body('displayName')
    .isLength({ min: 2, max: 100 })
    .withMessage('Display name is required'),
  body('description')
    .isLength({ min: 10, max: 500 })
    .withMessage('Description must be between 10 and 500 characters'),
  body('level')
    .isInt({ min: 1, max: 10 })
    .withMessage('Level must be between 1 and 10'),
  body('category')
    .isIn(['management', 'operations', 'support', 'custom'])
    .withMessage('Valid category is required')
]

const validateRoleUpdate = [
  body('displayName')
    .optional()
    .isLength({ min: 2, max: 100 })
    .withMessage('Display name must be valid'),
  body('description')
    .optional()
    .isLength({ min: 10, max: 500 })
    .withMessage('Description must be between 10 and 500 characters')
]

const validatePermissionAddition = [
  body('module')
    .isIn(['orders', 'customers', 'inventory', 'reports', 'settings', 'staff', 'finances', 'analytics'])
    .withMessage('Valid module is required'),
  body('actions')
    .isArray({ min: 1 })
    .withMessage('At least one action is required'),
  body('actions.*')
    .isIn(['create', 'read', 'update', 'delete', 'approve', 'export'])
    .withMessage('Valid actions are required')
]

const validateRoleAssignment = [
  body('userId')
    .isMongoId()
    .withMessage('Valid user ID is required'),
  body('roleId')
    .isMongoId()
    .withMessage('Valid role ID is required')
]

// All routes require authentication and users permission
router.use(authenticateCenterAdmin)
router.use(requirePermission('users'))

// Get all roles
router.get('/',
  logAdminAction('view_roles', 'users'),
  centerAdminRoleController.getRoles
)

// Get role hierarchy
router.get('/hierarchy',
  logAdminAction('view_role_hierarchy', 'users'),
  centerAdminRoleController.getRoleHierarchy
)

// Initialize default roles
router.post('/initialize',
  logAdminAction('initialize_default_roles', 'system'),
  centerAdminRoleController.initializeDefaultRoles
)

// Get single role
router.get('/:roleId',
  param('roleId').isMongoId().withMessage('Valid role ID is required'),
  logAdminAction('view_role_details', 'users'),
  centerAdminRoleController.getRole
)

// Create new role
router.post('/',
  validateRoleCreation,
  logAdminAction('create_role', 'users'),
  centerAdminRoleController.createRole
)

// Update role
router.put('/:roleId',
  param('roleId').isMongoId().withMessage('Valid role ID is required'),
  validateRoleUpdate,
  logAdminAction('update_role', 'users'),
  centerAdminRoleController.updateRole
)

// Delete role
router.delete('/:roleId',
  param('roleId').isMongoId().withMessage('Valid role ID is required'),
  logAdminAction('delete_role', 'users'),
  centerAdminRoleController.deleteRole
)

// Add permission to role
router.post('/:roleId/permissions',
  param('roleId').isMongoId().withMessage('Valid role ID is required'),
  validatePermissionAddition,
  logAdminAction('add_role_permission', 'users'),
  centerAdminRoleController.addPermission
)

// Remove permission from role
router.delete('/:roleId/permissions',
  param('roleId').isMongoId().withMessage('Valid role ID is required'),
  body('module').notEmpty().withMessage('Module is required'),
  logAdminAction('remove_role_permission', 'users'),
  centerAdminRoleController.removePermission
)

// Assign role to user
router.post('/assign',
  validateRoleAssignment,
  logAdminAction('assign_role_to_user', 'users'),
  centerAdminRoleController.assignRole
)

module.exports = router