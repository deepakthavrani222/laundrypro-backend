/**
 * RBAC Permission Constants and Preset Templates
 * Feature: admin-rbac-system
 */

// All available modules in the system
const MODULES = [
  'orders',
  'customers', 
  'branches',
  'services',
  'financial',
  'reports',
  'users',
  'settings'
];

// Common actions available for all modules
const COMMON_ACTIONS = ['view', 'create', 'update', 'delete'];

// Advanced actions specific to certain modules
const ADVANCED_ACTIONS = {
  orders: ['assign', 'cancel', 'refund'],
  financial: ['approve', 'export'],
  reports: ['export'],
  users: ['assignRole'],
  services: ['approveChanges']
};

/**
 * Get all actions for a specific module
 * @param {string} module - Module name
 * @returns {string[]} Array of action names
 */
const getModuleActions = (module) => {
  const actions = [...COMMON_ACTIONS];
  if (ADVANCED_ACTIONS[module]) {
    actions.push(...ADVANCED_ACTIONS[module]);
  }
  return actions;
};

/**
 * Generate default permissions object with all permissions set to false
 * @returns {Object} Permissions object with all false values
 */
const getDefaultPermissions = () => {
  const permissions = {};
  
  MODULES.forEach(module => {
    permissions[module] = {};
    const actions = getModuleActions(module);
    actions.forEach(action => {
      permissions[module][action] = false;
    });
  });
  
  return permissions;
};

/**
 * Generate full access permissions (all true)
 * @returns {Object} Permissions object with all true values
 */
const getFullAccessPermissions = () => {
  const permissions = {};
  
  MODULES.forEach(module => {
    permissions[module] = {};
    const actions = getModuleActions(module);
    actions.forEach(action => {
      permissions[module][action] = true;
    });
  });
  
  return permissions;
};

// Preset Role Templates
const PRESET_ROLES = {
  viewer: {
    name: 'Viewer',
    description: 'Read-only access to all modules',
    permissions: {
      orders: { view: true, create: false, update: false, delete: false, assign: false, cancel: false, refund: false },
      customers: { view: true, create: false, update: false, delete: false },
      branches: { view: true, create: false, update: false, delete: false },
      services: { view: true, create: false, update: false, delete: false, approveChanges: false },
      financial: { view: true, create: false, update: false, delete: false, approve: false, export: false },
      reports: { view: true, create: false, update: false, delete: false, export: false },
      users: { view: true, create: false, update: false, delete: false, assignRole: false },
      settings: { view: true, create: false, update: false, delete: false }
    }
  },
  
  manager: {
    name: 'Manager',
    description: 'Operational access with order management capabilities',
    permissions: {
      orders: { view: true, create: true, update: true, delete: false, assign: true, cancel: true, refund: false },
      customers: { view: true, create: true, update: true, delete: false },
      branches: { view: true, create: false, update: false, delete: false },
      services: { view: true, create: false, update: false, delete: false, approveChanges: false },
      financial: { view: true, create: false, update: false, delete: false, approve: false, export: false },
      reports: { view: true, create: false, update: false, delete: false, export: true },
      users: { view: true, create: true, update: true, delete: false, assignRole: false },
      settings: { view: true, create: false, update: false, delete: false }
    }
  },
  
  financeAdmin: {
    name: 'Finance Admin',
    description: 'Financial operations and reporting access',
    permissions: {
      orders: { view: true, create: false, update: false, delete: false, assign: false, cancel: false, refund: true },
      customers: { view: true, create: false, update: false, delete: false },
      branches: { view: true, create: false, update: false, delete: false },
      services: { view: true, create: false, update: false, delete: false, approveChanges: false },
      financial: { view: true, create: true, update: true, delete: false, approve: true, export: true },
      reports: { view: true, create: true, update: false, delete: false, export: true },
      users: { view: true, create: false, update: false, delete: false, assignRole: false },
      settings: { view: false, create: false, update: false, delete: false }
    }
  },
  
  branchManager: {
    name: 'Branch Manager',
    description: 'Full branch operations access',
    permissions: {
      orders: { view: true, create: true, update: true, delete: true, assign: true, cancel: true, refund: true },
      customers: { view: true, create: true, update: true, delete: false },
      branches: { view: true, create: false, update: true, delete: false },
      services: { view: true, create: true, update: true, delete: false, approveChanges: false },
      financial: { view: true, create: true, update: true, delete: false, approve: false, export: true },
      reports: { view: true, create: true, update: true, delete: false, export: true },
      users: { view: true, create: true, update: true, delete: true, assignRole: true },
      settings: { view: true, create: false, update: true, delete: false }
    }
  }
};

/**
 * Get preset role by name
 * @param {string} presetName - Name of the preset (viewer, manager, financeAdmin, branchManager)
 * @returns {Object|null} Preset role object or null if not found
 */
const getPresetRole = (presetName) => {
  return PRESET_ROLES[presetName] || null;
};

/**
 * Get all available preset roles
 * @returns {Object} All preset roles
 */
const getAllPresetRoles = () => {
  return Object.entries(PRESET_ROLES).map(([key, value]) => ({
    key,
    name: value.name,
    description: value.description
  }));
};

/**
 * Check if permissions B is a subset of permissions A
 * (Used to validate staff permissions against admin permissions)
 * @param {Object} adminPermissions - Admin's permissions
 * @param {Object} staffPermissions - Staff's requested permissions
 * @returns {Object} { isValid: boolean, invalidPermissions: string[] }
 */
const isPermissionSubset = (adminPermissions, staffPermissions) => {
  const invalidPermissions = [];
  
  for (const module of MODULES) {
    if (!staffPermissions[module]) continue;
    
    const actions = getModuleActions(module);
    for (const action of actions) {
      const staffHas = staffPermissions[module]?.[action] === true;
      const adminHas = adminPermissions[module]?.[action] === true;
      
      if (staffHas && !adminHas) {
        invalidPermissions.push(`${module}.${action}`);
      }
    }
  }
  
  return {
    isValid: invalidPermissions.length === 0,
    invalidPermissions
  };
};

/**
 * Check if permissions object has at least one permission enabled
 * Works for both Admin and Center Admin permission structures
 * @param {Object} permissions - Permissions object
 * @returns {boolean}
 */
const hasAtLeastOnePermission = (permissions) => {
  if (!permissions || typeof permissions !== 'object') return false;
  
  // Generic check - iterate through all modules in the permissions object
  for (const module of Object.keys(permissions)) {
    if (!permissions[module] || typeof permissions[module] !== 'object') continue;
    
    // Check all actions in this module
    for (const action of Object.keys(permissions[module])) {
      if (permissions[module][action] === true) {
        return true;
      }
    }
  }
  
  return false;
};

/**
 * Merge permissions - combines two permission objects
 * @param {Object} base - Base permissions
 * @param {Object} override - Override permissions
 * @returns {Object} Merged permissions
 */
const mergePermissions = (base, override) => {
  const merged = JSON.parse(JSON.stringify(base));
  
  for (const module of MODULES) {
    if (!override[module]) continue;
    
    if (!merged[module]) {
      merged[module] = {};
    }
    
    const actions = getModuleActions(module);
    for (const action of actions) {
      if (override[module][action] !== undefined) {
        merged[module][action] = override[module][action];
      }
    }
  }
  
  return merged;
};

module.exports = {
  MODULES,
  COMMON_ACTIONS,
  ADVANCED_ACTIONS,
  PRESET_ROLES,
  getModuleActions,
  getDefaultPermissions,
  getFullAccessPermissions,
  getPresetRole,
  getAllPresetRoles,
  isPermissionSubset,
  hasAtLeastOnePermission,
  mergePermissions
};
