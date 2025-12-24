/**
 * Permission Check Middleware
 * Feature: admin-rbac-system
 * 
 * Validates user permissions before allowing access to protected routes.
 * Requirements: 5.1, 5.2
 */

const { USER_ROLES } = require('../config/constants');
const { MODULES, getModuleActions } = require('../config/permissions');

/**
 * Check if user has specific permission for a module and action
 * @param {string} module - Module name (orders, customers, etc.)
 * @param {string} action - Action name (view, create, update, delete, etc.)
 * @returns {Function} Express middleware function
 */
const checkPermission = (module, action) => {
  return (req, res, next) => {
    try {
      // Get user from request (set by auth middleware)
      const user = req.user || req.admin;
      
      if (!user) {
        return res.status(401).json({
          success: false,
          code: 'UNAUTHORIZED',
          message: 'Authentication required'
        });
      }

      // SuperAdmin has full access
      if (user.role === USER_ROLES.SUPERADMIN || user.role === 'superadmin') {
        return next();
      }

      // Validate module and action
      if (!MODULES.includes(module)) {
        console.error(`Invalid module: ${module}`);
        return res.status(500).json({
          success: false,
          code: 'INVALID_MODULE',
          message: 'Internal server error'
        });
      }

      const validActions = getModuleActions(module);
      if (!validActions.includes(action)) {
        console.error(`Invalid action: ${action} for module: ${module}`);
        return res.status(500).json({
          success: false,
          code: 'INVALID_ACTION',
          message: 'Internal server error'
        });
      }

      // Check user permissions
      const hasPermission = user.permissions?.[module]?.[action] === true;

      if (!hasPermission) {
        return res.status(403).json({
          success: false,
          code: 'PERMISSION_DENIED',
          message: `You don't have permission to ${action} ${module}`,
          details: {
            module,
            action,
            required: `${module}.${action}`
          }
        });
      }

      // Permission granted
      next();
    } catch (error) {
      console.error('Permission check error:', error);
      return res.status(500).json({
        success: false,
        code: 'PERMISSION_CHECK_ERROR',
        message: 'Error checking permissions'
      });
    }
  };
};

/**
 * Check if user has access to any action in a module
 * @param {string} module - Module name
 * @returns {Function} Express middleware function
 */
const checkModuleAccess = (module) => {
  return (req, res, next) => {
    try {
      const user = req.user || req.admin;
      
      if (!user) {
        return res.status(401).json({
          success: false,
          code: 'UNAUTHORIZED',
          message: 'Authentication required'
        });
      }

      // SuperAdmin has full access
      if (user.role === USER_ROLES.SUPERADMIN || user.role === 'superadmin') {
        return next();
      }

      // Check if user has any permission in this module
      const modulePerms = user.permissions?.[module];
      if (!modulePerms) {
        return res.status(403).json({
          success: false,
          code: 'PERMISSION_DENIED',
          message: `You don't have access to ${module} module`
        });
      }

      const hasAnyPermission = Object.values(modulePerms).some(value => value === true);
      
      if (!hasAnyPermission) {
        return res.status(403).json({
          success: false,
          code: 'PERMISSION_DENIED',
          message: `You don't have access to ${module} module`
        });
      }

      next();
    } catch (error) {
      console.error('Module access check error:', error);
      return res.status(500).json({
        success: false,
        code: 'PERMISSION_CHECK_ERROR',
        message: 'Error checking permissions'
      });
    }
  };
};

/**
 * Check multiple permissions (user must have ALL specified permissions)
 * @param {Array<{module: string, action: string}>} permissions - Array of permission requirements
 * @returns {Function} Express middleware function
 */
const checkPermissions = (permissions) => {
  return (req, res, next) => {
    try {
      const user = req.user || req.admin;
      
      if (!user) {
        return res.status(401).json({
          success: false,
          code: 'UNAUTHORIZED',
          message: 'Authentication required'
        });
      }

      // SuperAdmin has full access
      if (user.role === USER_ROLES.SUPERADMIN || user.role === 'superadmin') {
        return next();
      }

      // Check all required permissions
      const missingPermissions = [];
      
      for (const { module, action } of permissions) {
        const hasPermission = user.permissions?.[module]?.[action] === true;
        if (!hasPermission) {
          missingPermissions.push(`${module}.${action}`);
        }
      }

      if (missingPermissions.length > 0) {
        return res.status(403).json({
          success: false,
          code: 'PERMISSION_DENIED',
          message: 'You don\'t have the required permissions',
          details: {
            missing: missingPermissions
          }
        });
      }

      next();
    } catch (error) {
      console.error('Permissions check error:', error);
      return res.status(500).json({
        success: false,
        code: 'PERMISSION_CHECK_ERROR',
        message: 'Error checking permissions'
      });
    }
  };
};

/**
 * Check if user has ANY of the specified permissions
 * @param {Array<{module: string, action: string}>} permissions - Array of permission options
 * @returns {Function} Express middleware function
 */
const checkAnyPermission = (permissions) => {
  return (req, res, next) => {
    try {
      const user = req.user || req.admin;
      
      if (!user) {
        return res.status(401).json({
          success: false,
          code: 'UNAUTHORIZED',
          message: 'Authentication required'
        });
      }

      // SuperAdmin has full access
      if (user.role === USER_ROLES.SUPERADMIN || user.role === 'superadmin') {
        return next();
      }

      // Check if user has any of the permissions
      const hasAny = permissions.some(({ module, action }) => {
        return user.permissions?.[module]?.[action] === true;
      });

      if (!hasAny) {
        return res.status(403).json({
          success: false,
          code: 'PERMISSION_DENIED',
          message: 'You don\'t have any of the required permissions',
          details: {
            required: permissions.map(p => `${p.module}.${p.action}`)
          }
        });
      }

      next();
    } catch (error) {
      console.error('Any permission check error:', error);
      return res.status(500).json({
        success: false,
        code: 'PERMISSION_CHECK_ERROR',
        message: 'Error checking permissions'
      });
    }
  };
};

/**
 * Utility to check permission without middleware (for use in controllers)
 * @param {Object} user - User object with permissions
 * @param {string} module - Module name
 * @param {string} action - Action name
 * @returns {boolean}
 */
const hasPermission = (user, module, action) => {
  if (!user) return false;
  
  // SuperAdmin has full access
  if (user.role === USER_ROLES.SUPERADMIN || user.role === 'superadmin') {
    return true;
  }
  
  return user.permissions?.[module]?.[action] === true;
};

module.exports = {
  checkPermission,
  checkModuleAccess,
  checkPermissions,
  checkAnyPermission,
  hasPermission
};
