/**
 * Center Admin Permission Middleware
 * Checks if the Center Admin has the required permission for the action
 * Permissions are set by SuperAdmin when creating/editing Center Admin
 */

/**
 * Check if Center Admin has specific permission
 * @param {string} module - The module (orders, staff, inventory, services, customers, performance, settings)
 * @param {string} action - The action (view, create, update, delete, or module-specific actions)
 */
const requireCenterAdminPermission = (module, action) => {
  return (req, res, next) => {
    const user = req.user;

    // SuperAdmin and Admin bypass permission checks
    if (user.role === 'superadmin' || user.role === 'admin') {
      return next();
    }

    // Only apply to center_admin
    if (user.role !== 'center_admin') {
      return res.status(403).json({
        success: false,
        code: 'ACCESS_DENIED',
        message: 'Access denied. This route is for Center Admin only.'
      });
    }

    // Check if user has permissions object
    if (!user.permissions) {
      return res.status(403).json({
        success: false,
        code: 'NO_PERMISSIONS',
        message: 'Access denied. No permissions assigned to this account.'
      });
    }

    // Check if module exists in permissions
    if (!user.permissions[module]) {
      return res.status(403).json({
        success: false,
        code: 'MODULE_ACCESS_DENIED',
        message: `Access denied. You don't have access to the ${module} module.`
      });
    }

    // Check if action is allowed
    if (!user.permissions[module][action]) {
      return res.status(403).json({
        success: false,
        code: 'ACTION_DENIED',
        message: `Access denied. You don't have permission to ${action} in ${module}.`
      });
    }

    // Permission granted
    next();
  };
};

/**
 * Check if Center Admin has at least view permission for a module
 * @param {string} module - The module to check
 */
const requireCenterAdminModuleAccess = (module) => {
  return requireCenterAdminPermission(module, 'view');
};

/**
 * Check multiple permissions (OR logic - any one permission is enough)
 * @param {Array} permissions - Array of {module, action} objects
 */
const requireAnyCenterAdminPermission = (permissions) => {
  return (req, res, next) => {
    const user = req.user;

    // SuperAdmin and Admin bypass permission checks
    if (user.role === 'superadmin' || user.role === 'admin') {
      return next();
    }

    // Only apply to center_admin
    if (user.role !== 'center_admin') {
      return res.status(403).json({
        success: false,
        code: 'ACCESS_DENIED',
        message: 'Access denied. This route is for Center Admin only.'
      });
    }

    // Check if user has permissions object
    if (!user.permissions) {
      return res.status(403).json({
        success: false,
        code: 'NO_PERMISSIONS',
        message: 'Access denied. No permissions assigned to this account.'
      });
    }

    // Check if any permission is granted
    const hasPermission = permissions.some(({ module, action }) => {
      return user.permissions[module] && user.permissions[module][action];
    });

    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        code: 'PERMISSION_DENIED',
        message: 'Access denied. You don\'t have the required permissions.'
      });
    }

    next();
  };
};

module.exports = {
  requireCenterAdminPermission,
  requireCenterAdminModuleAccess,
  requireAnyCenterAdminPermission
};
