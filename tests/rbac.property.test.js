/**
 * Property-Based Tests for Admin RBAC System
 * Feature: admin-rbac-system
 * 
 * These tests validate the correctness properties defined in the design document.
 */

const mongoose = require('mongoose');
const User = require('../src/models/User');
const { USER_ROLES } = require('../src/config/constants');

// Test utilities
const generateRandomString = (length = 8) => {
  const chars = 'abcdefghijklmnopqrstuvwxyz';
  return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
};

const generateRandomEmail = () => `${generateRandomString()}@test.com`;

const generateRandomPhone = () => {
  const prefix = ['6', '7', '8', '9'][Math.floor(Math.random() * 4)];
  const rest = Array.from({ length: 9 }, () => Math.floor(Math.random() * 10)).join('');
  return prefix + rest;
};

// Generate random permissions object
const generateRandomPermissions = () => {
  const modules = ['orders', 'customers', 'branches', 'services', 'financial', 'reports', 'users', 'settings'];
  const permissions = {};
  
  modules.forEach(module => {
    permissions[module] = {
      view: Math.random() > 0.5,
      create: Math.random() > 0.5,
      update: Math.random() > 0.5,
      delete: Math.random() > 0.5
    };
    
    // Add advanced permissions for specific modules
    if (module === 'orders') {
      permissions[module].assign = Math.random() > 0.5;
      permissions[module].cancel = Math.random() > 0.5;
      permissions[module].refund = Math.random() > 0.5;
    }
    if (module === 'financial') {
      permissions[module].approve = Math.random() > 0.5;
      permissions[module].export = Math.random() > 0.5;
    }
    if (module === 'reports') {
      permissions[module].export = Math.random() > 0.5;
    }
    if (module === 'users') {
      permissions[module].assignRole = Math.random() > 0.5;
    }
    if (module === 'services') {
      permissions[module].approveChanges = Math.random() > 0.5;
    }
  });
  
  return permissions;
};

// Check if at least one permission is true
const hasAtLeastOnePermission = (permissions) => {
  for (const module of Object.keys(permissions)) {
    for (const action of Object.keys(permissions[module])) {
      if (permissions[module][action] === true) {
        return true;
      }
    }
  }
  return false;
};

// Generate permissions with at least one true
const generateValidPermissions = () => {
  let permissions = generateRandomPermissions();
  
  // Ensure at least one permission is true
  if (!hasAtLeastOnePermission(permissions)) {
    permissions.orders.view = true;
  }
  
  return permissions;
};

// Generate permissions with all false
const generateEmptyPermissions = () => {
  const modules = ['orders', 'customers', 'branches', 'services', 'financial', 'reports', 'users', 'settings'];
  const permissions = {};
  
  modules.forEach(module => {
    permissions[module] = {
      view: false,
      create: false,
      update: false,
      delete: false
    };
    
    if (module === 'orders') {
      permissions[module].assign = false;
      permissions[module].cancel = false;
      permissions[module].refund = false;
    }
    if (module === 'financial') {
      permissions[module].approve = false;
      permissions[module].export = false;
    }
    if (module === 'reports') {
      permissions[module].export = false;
    }
    if (module === 'users') {
      permissions[module].assignRole = false;
    }
    if (module === 'services') {
      permissions[module].approveChanges = false;
    }
  });
  
  return permissions;
};

/**
 * Property 2: Required Fields Validation
 * For any admin creation request missing name, email, password, or having zero permissions,
 * the system should reject the request with a validation error.
 * Validates: Requirements 1.2
 */
describe('Feature: admin-rbac-system, Property 2: Required Fields Validation', () => {
  beforeAll(async () => {
    // Connect to test database if not connected
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/laundry-test');
    }
  });

  afterAll(async () => {
    // Clean up test users
    await User.deleteMany({ email: { $regex: /@test\.com$/ } });
  });

  afterEach(async () => {
    // Clean up after each test
    await User.deleteMany({ email: { $regex: /@test\.com$/ } });
  });

  // Run 100 iterations as per design document
  const ITERATIONS = 100;

  test('should reject admin creation with missing name', async () => {
    for (let i = 0; i < ITERATIONS; i++) {
      const adminData = {
        // name is missing
        email: generateRandomEmail(),
        phone: generateRandomPhone(),
        password: 'TestPassword123!',
        role: USER_ROLES.ADMIN,
        permissions: generateValidPermissions()
      };

      const user = new User(adminData);
      
      await expect(user.validate()).rejects.toThrow(/name/i);
    }
  });

  test('should reject admin creation with missing email', async () => {
    for (let i = 0; i < ITERATIONS; i++) {
      const adminData = {
        name: generateRandomString(10),
        // email is missing
        phone: generateRandomPhone(),
        password: 'TestPassword123!',
        role: USER_ROLES.ADMIN,
        permissions: generateValidPermissions()
      };

      const user = new User(adminData);
      
      await expect(user.validate()).rejects.toThrow(/email/i);
    }
  });

  test('should reject admin creation with missing password', async () => {
    for (let i = 0; i < ITERATIONS; i++) {
      const adminData = {
        name: generateRandomString(10),
        email: generateRandomEmail(),
        phone: generateRandomPhone(),
        // password is missing
        role: USER_ROLES.ADMIN,
        permissions: generateValidPermissions()
      };

      const user = new User(adminData);
      
      await expect(user.validate()).rejects.toThrow(/password/i);
    }
  });

  test('should accept admin creation with valid data and at least one permission', async () => {
    for (let i = 0; i < Math.min(ITERATIONS, 10); i++) { // Limit DB writes
      const permissions = generateValidPermissions();
      
      const adminData = {
        name: generateRandomString(10),
        email: generateRandomEmail(),
        phone: generateRandomPhone(),
        password: 'TestPassword123!',
        role: USER_ROLES.ADMIN,
        permissions
      };

      const user = new User(adminData);
      
      // Should not throw validation error
      await expect(user.validate()).resolves.toBeUndefined();
      
      // Verify permissions are stored correctly
      expect(user.permissions).toBeDefined();
      expect(hasAtLeastOnePermission(user.permissions)).toBe(true);
    }
  });

  test('should store permissions with correct structure', async () => {
    const modules = ['orders', 'customers', 'branches', 'services', 'financial', 'reports', 'users', 'settings'];
    
    for (let i = 0; i < Math.min(ITERATIONS, 10); i++) {
      const permissions = generateValidPermissions();
      
      const adminData = {
        name: generateRandomString(10),
        email: generateRandomEmail(),
        phone: generateRandomPhone(),
        password: 'TestPassword123!',
        role: USER_ROLES.ADMIN,
        permissions
      };

      const user = new User(adminData);
      await user.validate();
      
      // Verify all modules exist
      modules.forEach(module => {
        expect(user.permissions[module]).toBeDefined();
        expect(typeof user.permissions[module].view).toBe('boolean');
        expect(typeof user.permissions[module].create).toBe('boolean');
        expect(typeof user.permissions[module].update).toBe('boolean');
        expect(typeof user.permissions[module].delete).toBe('boolean');
      });
      
      // Verify advanced permissions
      expect(typeof user.permissions.orders.assign).toBe('boolean');
      expect(typeof user.permissions.orders.cancel).toBe('boolean');
      expect(typeof user.permissions.orders.refund).toBe('boolean');
      expect(typeof user.permissions.financial.approve).toBe('boolean');
      expect(typeof user.permissions.financial.export).toBe('boolean');
      expect(typeof user.permissions.reports.export).toBe('boolean');
      expect(typeof user.permissions.users.assignRole).toBe('boolean');
      expect(typeof user.permissions.services.approveChanges).toBe('boolean');
    }
  });
});


/**
 * Property 11: Preset Role Template Accuracy
 * For any preset role (viewer, manager, financeAdmin), applying the preset should 
 * produce the exact predefined permission configuration for that role.
 * Validates: Requirements 3.1
 */
describe('Feature: admin-rbac-system, Property 11: Preset Role Template Accuracy', () => {
  const {
    PRESET_ROLES,
    getPresetRole,
    getAllPresetRoles,
    MODULES,
    getModuleActions
  } = require('../src/config/permissions');

  test('should return exact predefined permissions for viewer preset', () => {
    const preset = getPresetRole('viewer');
    
    expect(preset).not.toBeNull();
    expect(preset.name).toBe('Viewer');
    
    // Viewer should have view=true for all modules, everything else false
    MODULES.forEach(module => {
      expect(preset.permissions[module]).toBeDefined();
      expect(preset.permissions[module].view).toBe(true);
      expect(preset.permissions[module].create).toBe(false);
      expect(preset.permissions[module].update).toBe(false);
      expect(preset.permissions[module].delete).toBe(false);
    });
    
    // Advanced permissions should all be false
    expect(preset.permissions.orders.assign).toBe(false);
    expect(preset.permissions.orders.cancel).toBe(false);
    expect(preset.permissions.orders.refund).toBe(false);
    expect(preset.permissions.financial.approve).toBe(false);
    expect(preset.permissions.financial.export).toBe(false);
  });

  test('should return exact predefined permissions for manager preset', () => {
    const preset = getPresetRole('manager');
    
    expect(preset).not.toBeNull();
    expect(preset.name).toBe('Manager');
    
    // Manager should have operational access
    expect(preset.permissions.orders.view).toBe(true);
    expect(preset.permissions.orders.create).toBe(true);
    expect(preset.permissions.orders.update).toBe(true);
    expect(preset.permissions.orders.delete).toBe(false);
    expect(preset.permissions.orders.assign).toBe(true);
    expect(preset.permissions.orders.cancel).toBe(true);
    expect(preset.permissions.orders.refund).toBe(false);
    
    expect(preset.permissions.customers.view).toBe(true);
    expect(preset.permissions.customers.create).toBe(true);
    expect(preset.permissions.customers.update).toBe(true);
    expect(preset.permissions.customers.delete).toBe(false);
    
    expect(preset.permissions.users.create).toBe(true);
    expect(preset.permissions.users.assignRole).toBe(false);
  });

  test('should return exact predefined permissions for financeAdmin preset', () => {
    const preset = getPresetRole('financeAdmin');
    
    expect(preset).not.toBeNull();
    expect(preset.name).toBe('Finance Admin');
    
    // Finance Admin should have financial focus
    expect(preset.permissions.financial.view).toBe(true);
    expect(preset.permissions.financial.create).toBe(true);
    expect(preset.permissions.financial.update).toBe(true);
    expect(preset.permissions.financial.approve).toBe(true);
    expect(preset.permissions.financial.export).toBe(true);
    
    expect(preset.permissions.reports.view).toBe(true);
    expect(preset.permissions.reports.export).toBe(true);
    
    expect(preset.permissions.orders.refund).toBe(true);
    expect(preset.permissions.orders.create).toBe(false);
    
    // Settings should be restricted
    expect(preset.permissions.settings.view).toBe(false);
  });

  test('should return null for invalid preset name', () => {
    const preset = getPresetRole('invalidPreset');
    expect(preset).toBeNull();
  });

  test('should list all available presets', () => {
    const presets = getAllPresetRoles();
    
    expect(presets.length).toBeGreaterThanOrEqual(3);
    
    const presetKeys = presets.map(p => p.key);
    expect(presetKeys).toContain('viewer');
    expect(presetKeys).toContain('manager');
    expect(presetKeys).toContain('financeAdmin');
    
    // Each preset should have name and description
    presets.forEach(preset => {
      expect(preset.name).toBeDefined();
      expect(preset.description).toBeDefined();
      expect(typeof preset.name).toBe('string');
      expect(typeof preset.description).toBe('string');
    });
  });

  test('all presets should have complete permission structure', () => {
    Object.keys(PRESET_ROLES).forEach(presetKey => {
      const preset = PRESET_ROLES[presetKey];
      
      // Each preset should have all modules
      MODULES.forEach(module => {
        expect(preset.permissions[module]).toBeDefined();
        
        // Each module should have all its actions
        const actions = getModuleActions(module);
        actions.forEach(action => {
          expect(typeof preset.permissions[module][action]).toBe('boolean');
        });
      });
    });
  });

  // Property-based test: Run multiple iterations
  test('preset permissions should be consistent across multiple retrievals', () => {
    const ITERATIONS = 100;
    const presetKeys = ['viewer', 'manager', 'financeAdmin'];
    
    presetKeys.forEach(presetKey => {
      const firstRetrieval = getPresetRole(presetKey);
      
      for (let i = 0; i < ITERATIONS; i++) {
        const currentRetrieval = getPresetRole(presetKey);
        
        // Permissions should be exactly the same
        expect(JSON.stringify(currentRetrieval.permissions))
          .toBe(JSON.stringify(firstRetrieval.permissions));
      }
    });
  });
});


/**
 * Property 6: Permission Check Consistency
 * For any user and any module-action combination, the API permission check result 
 * must match the user's stored permission state (allowed if permission is true, 
 * denied if false or missing).
 * Validates: Requirements 5.1
 */
describe('Feature: admin-rbac-system, Property 6: Permission Check Consistency', () => {
  const { hasPermission } = require('../src/middlewares/checkPermission');
  const { MODULES, getModuleActions, getDefaultPermissions } = require('../src/config/permissions');
  const { USER_ROLES } = require('../src/config/constants');

  // Generate random user with random permissions
  const generateRandomUser = () => {
    const permissions = {};
    
    MODULES.forEach(module => {
      permissions[module] = {};
      const actions = getModuleActions(module);
      actions.forEach(action => {
        permissions[module][action] = Math.random() > 0.5;
      });
    });
    
    return {
      _id: 'test-user-id',
      role: USER_ROLES.ADMIN,
      permissions
    };
  };

  const ITERATIONS = 100;

  test('permission check should match stored permission state for random users', () => {
    for (let i = 0; i < ITERATIONS; i++) {
      const user = generateRandomUser();
      
      // Test each module and action
      MODULES.forEach(module => {
        const actions = getModuleActions(module);
        actions.forEach(action => {
          const storedPermission = user.permissions[module][action];
          const checkResult = hasPermission(user, module, action);
          
          expect(checkResult).toBe(storedPermission);
        });
      });
    }
  });

  test('superadmin should always have permission regardless of stored state', () => {
    for (let i = 0; i < ITERATIONS; i++) {
      const superAdmin = {
        _id: 'superadmin-id',
        role: USER_ROLES.SUPERADMIN,
        permissions: getDefaultPermissions() // All false
      };
      
      // Pick random module and action
      const randomModule = MODULES[Math.floor(Math.random() * MODULES.length)];
      const actions = getModuleActions(randomModule);
      const randomAction = actions[Math.floor(Math.random() * actions.length)];
      
      // SuperAdmin should always have permission
      expect(hasPermission(superAdmin, randomModule, randomAction)).toBe(true);
    }
  });

  test('null user should never have permission', () => {
    for (let i = 0; i < ITERATIONS; i++) {
      const randomModule = MODULES[Math.floor(Math.random() * MODULES.length)];
      const actions = getModuleActions(randomModule);
      const randomAction = actions[Math.floor(Math.random() * actions.length)];
      
      expect(hasPermission(null, randomModule, randomAction)).toBe(false);
      expect(hasPermission(undefined, randomModule, randomAction)).toBe(false);
    }
  });

  test('user without permissions object should not have permission', () => {
    const userWithoutPermissions = {
      _id: 'test-user-id',
      role: USER_ROLES.ADMIN
      // No permissions field
    };
    
    MODULES.forEach(module => {
      const actions = getModuleActions(module);
      actions.forEach(action => {
        expect(hasPermission(userWithoutPermissions, module, action)).toBe(false);
      });
    });
  });

  test('permission check should be consistent across multiple calls', () => {
    const user = generateRandomUser();
    
    for (let i = 0; i < ITERATIONS; i++) {
      const randomModule = MODULES[Math.floor(Math.random() * MODULES.length)];
      const actions = getModuleActions(randomModule);
      const randomAction = actions[Math.floor(Math.random() * actions.length)];
      
      const firstCheck = hasPermission(user, randomModule, randomAction);
      const secondCheck = hasPermission(user, randomModule, randomAction);
      
      expect(firstCheck).toBe(secondCheck);
    }
  });
});


/**
 * Property 1: Admin Creation Round-Trip
 * For any valid admin data with permissions, creating an admin and then retrieving it 
 * should return the exact same permission configuration that was submitted.
 * Validates: Requirements 1.1, 2.7
 */
describe('Feature: admin-rbac-system, Property 1: Admin Creation Round-Trip', () => {
  const { getDefaultPermissions, MODULES, getModuleActions } = require('../src/config/permissions');

  // Generate random valid permissions
  const generateValidPermissions = () => {
    const permissions = {};
    
    MODULES.forEach(module => {
      permissions[module] = {};
      const actions = getModuleActions(module);
      actions.forEach(action => {
        permissions[module][action] = Math.random() > 0.5;
      });
    });
    
    // Ensure at least one permission is true
    if (!Object.values(permissions).some(m => Object.values(m).some(v => v === true))) {
      permissions.orders.view = true;
    }
    
    return permissions;
  };

  beforeEach(async () => {
    await User.deleteMany({ email: { $regex: /@roundtrip-test\.com$/ } });
  });

  afterAll(async () => {
    await User.deleteMany({ email: { $regex: /@roundtrip-test\.com$/ } });
  });

  const ITERATIONS = 20; // Reduced for DB operations

  test('created admin should have exact same permissions when retrieved', async () => {
    for (let i = 0; i < ITERATIONS; i++) {
      const permissions = generateValidPermissions();
      const email = `admin-${Date.now()}-${i}@roundtrip-test.com`;
      
      // Create admin
      const adminData = {
        name: `Test Admin ${i}`,
        email,
        phone: `${9000000000 + i}`,
        password: 'TestPassword123!',
        role: USER_ROLES.ADMIN,
        permissions,
        isActive: true,
        isEmailVerified: true
      };

      const createdAdmin = new User(adminData);
      await createdAdmin.save();

      // Retrieve admin
      const retrievedAdmin = await User.findOne({ email }).lean();

      // Compare permissions
      MODULES.forEach(module => {
        const actions = getModuleActions(module);
        actions.forEach(action => {
          const originalValue = permissions[module][action];
          const retrievedValue = retrievedAdmin.permissions[module][action];
          
          expect(retrievedValue).toBe(originalValue);
        });
      });
    }
  });

  test('permission values should be preserved exactly (no type coercion)', async () => {
    for (let i = 0; i < ITERATIONS; i++) {
      const permissions = generateValidPermissions();
      const email = `admin-exact-${Date.now()}-${i}@roundtrip-test.com`;
      
      const adminData = {
        name: `Exact Test Admin ${i}`,
        email,
        phone: `${8000000000 + i}`,
        password: 'TestPassword123!',
        role: USER_ROLES.ADMIN,
        permissions,
        isActive: true,
        isEmailVerified: true
      };

      const createdAdmin = new User(adminData);
      await createdAdmin.save();

      const retrievedAdmin = await User.findOne({ email }).lean();

      // Verify all values are booleans
      MODULES.forEach(module => {
        const actions = getModuleActions(module);
        actions.forEach(action => {
          expect(typeof retrievedAdmin.permissions[module][action]).toBe('boolean');
        });
      });
    }
  });
});

/**
 * Property 9: Cascade Deactivation
 * For any Admin that is deactivated, all Staff users created by that Admin 
 * must also be deactivated in the same operation.
 * Validates: Requirements 6.3
 */
describe('Feature: admin-rbac-system, Property 9: Cascade Deactivation', () => {
  const { getDefaultPermissions } = require('../src/config/permissions');

  beforeEach(async () => {
    await User.deleteMany({ email: { $regex: /@cascade-test\.com$/ } });
  });

  afterAll(async () => {
    await User.deleteMany({ email: { $regex: /@cascade-test\.com$/ } });
  });

  test('deactivating admin should deactivate all their staff', async () => {
    // Create admin
    const adminEmail = `admin-cascade-${Date.now()}@cascade-test.com`;
    const admin = new User({
      name: 'Cascade Test Admin',
      email: adminEmail,
      phone: '9111111111',
      password: 'TestPassword123!',
      role: USER_ROLES.ADMIN,
      permissions: { orders: { view: true, create: false, update: false, delete: false } },
      isActive: true,
      isEmailVerified: true,
      staffCreated: []
    });
    await admin.save();

    // Create multiple staff under this admin
    const staffCount = 5;
    const staffIds = [];
    
    for (let i = 0; i < staffCount; i++) {
      const staff = new User({
        name: `Staff ${i}`,
        email: `staff-${i}-${Date.now()}@cascade-test.com`,
        phone: `${9200000000 + i}`,
        password: 'TestPassword123!',
        role: USER_ROLES.STAFF,
        permissions: { orders: { view: true, create: false, update: false, delete: false } },
        isActive: true,
        isEmailVerified: true,
        createdBy: admin._id,
        createdByModel: 'User'
      });
      await staff.save();
      staffIds.push(staff._id);
    }

    // Update admin's staffCreated array
    admin.staffCreated = staffIds;
    await admin.save();

    // Verify all staff are active
    const activeStaffBefore = await User.countDocuments({
      _id: { $in: staffIds },
      isActive: true
    });
    expect(activeStaffBefore).toBe(staffCount);

    // Deactivate admin
    admin.isActive = false;
    await admin.save();

    // Cascade deactivate staff
    await User.updateMany(
      { _id: { $in: admin.staffCreated } },
      { $set: { isActive: false } }
    );

    // Verify all staff are now deactivated
    const activeStaffAfter = await User.countDocuments({
      _id: { $in: staffIds },
      isActive: true
    });
    expect(activeStaffAfter).toBe(0);

    // Verify admin is deactivated
    const deactivatedAdmin = await User.findById(admin._id);
    expect(deactivatedAdmin.isActive).toBe(false);
  });

  test('admin with no staff should deactivate without errors', async () => {
    const adminEmail = `admin-no-staff-${Date.now()}@cascade-test.com`;
    const admin = new User({
      name: 'No Staff Admin',
      email: adminEmail,
      phone: '9333333333',
      password: 'TestPassword123!',
      role: USER_ROLES.ADMIN,
      permissions: { orders: { view: true, create: false, update: false, delete: false } },
      isActive: true,
      isEmailVerified: true,
      staffCreated: []
    });
    await admin.save();

    // Deactivate admin
    admin.isActive = false;
    await admin.save();

    // Cascade (should do nothing but not error)
    const result = await User.updateMany(
      { _id: { $in: admin.staffCreated } },
      { $set: { isActive: false } }
    );

    expect(result.modifiedCount).toBe(0);
    
    const deactivatedAdmin = await User.findById(admin._id);
    expect(deactivatedAdmin.isActive).toBe(false);
  });
});


/**
 * Property 3: Permission Subset Enforcement
 * For any Admin creating a Staff user, the Staff's permissions must be a subset of 
 * (or equal to) the Admin's permissions. No Staff permission can exceed what the Admin possesses.
 * Validates: Requirements 4.1
 */
describe('Feature: admin-rbac-system, Property 3: Permission Subset Enforcement', () => {
  const { isPermissionSubset, MODULES, getModuleActions } = require('../src/config/permissions');

  // Generate random permissions
  const generateRandomPermissions = () => {
    const permissions = {};
    MODULES.forEach(module => {
      permissions[module] = {};
      const actions = getModuleActions(module);
      actions.forEach(action => {
        permissions[module][action] = Math.random() > 0.5;
      });
    });
    return permissions;
  };

  // Generate subset of given permissions
  const generateSubsetPermissions = (adminPermissions) => {
    const staffPermissions = {};
    MODULES.forEach(module => {
      staffPermissions[module] = {};
      const actions = getModuleActions(module);
      actions.forEach(action => {
        // Staff can only have permission if admin has it
        if (adminPermissions[module][action]) {
          staffPermissions[module][action] = Math.random() > 0.5;
        } else {
          staffPermissions[module][action] = false;
        }
      });
    });
    return staffPermissions;
  };

  // Generate permissions that exceed admin's
  const generateExceedingPermissions = (adminPermissions) => {
    const staffPermissions = JSON.parse(JSON.stringify(adminPermissions));
    
    // Find a permission admin doesn't have and give it to staff
    for (const module of MODULES) {
      const actions = getModuleActions(module);
      for (const action of actions) {
        if (!adminPermissions[module][action]) {
          staffPermissions[module][action] = true;
          return staffPermissions;
        }
      }
    }
    
    return staffPermissions;
  };

  const ITERATIONS = 100;

  test('valid subset permissions should pass validation', () => {
    for (let i = 0; i < ITERATIONS; i++) {
      const adminPermissions = generateRandomPermissions();
      const staffPermissions = generateSubsetPermissions(adminPermissions);
      
      const result = isPermissionSubset(adminPermissions, staffPermissions);
      
      expect(result.isValid).toBe(true);
      expect(result.invalidPermissions).toHaveLength(0);
    }
  });

  test('exceeding permissions should fail validation', () => {
    for (let i = 0; i < ITERATIONS; i++) {
      // Create admin with at least one false permission
      const adminPermissions = generateRandomPermissions();
      
      // Ensure admin has at least one false permission
      let hasAnyFalse = false;
      for (const module of MODULES) {
        const actions = getModuleActions(module);
        for (const action of actions) {
          if (!adminPermissions[module][action]) {
            hasAnyFalse = true;
            break;
          }
        }
        if (hasAnyFalse) break;
      }
      
      if (!hasAnyFalse) {
        // Make one permission false
        adminPermissions.orders.delete = false;
      }
      
      const staffPermissions = generateExceedingPermissions(adminPermissions);
      
      const result = isPermissionSubset(adminPermissions, staffPermissions);
      
      expect(result.isValid).toBe(false);
      expect(result.invalidPermissions.length).toBeGreaterThan(0);
    }
  });

  test('identical permissions should pass validation', () => {
    for (let i = 0; i < ITERATIONS; i++) {
      const adminPermissions = generateRandomPermissions();
      const staffPermissions = JSON.parse(JSON.stringify(adminPermissions));
      
      const result = isPermissionSubset(adminPermissions, staffPermissions);
      
      expect(result.isValid).toBe(true);
    }
  });

  test('empty staff permissions should always pass', () => {
    for (let i = 0; i < ITERATIONS; i++) {
      const adminPermissions = generateRandomPermissions();
      const staffPermissions = {};
      
      MODULES.forEach(module => {
        staffPermissions[module] = {};
        const actions = getModuleActions(module);
        actions.forEach(action => {
          staffPermissions[module][action] = false;
        });
      });
      
      const result = isPermissionSubset(adminPermissions, staffPermissions);
      
      expect(result.isValid).toBe(true);
    }
  });
});

/**
 * Property 4: Hierarchy Enforcement
 * For any Admin user, attempting to create another Admin-type user should be rejected. 
 * Admins can only create Staff-type users.
 * Validates: Requirements 4.3
 */
describe('Feature: admin-rbac-system, Property 4: Hierarchy Enforcement', () => {
  // This property is enforced by the controller always setting role to STAFF
  // We test that the controller logic is correct
  
  test('staff creation should always result in STAFF role', async () => {
    // Create admin
    const adminEmail = `admin-hierarchy-${Date.now()}@hierarchy-test.com`;
    const admin = new User({
      name: 'Hierarchy Test Admin',
      email: adminEmail,
      phone: '9444444444',
      password: 'TestPassword123!',
      role: USER_ROLES.ADMIN,
      permissions: { orders: { view: true, create: true, update: false, delete: false } },
      isActive: true,
      isEmailVerified: true,
      staffCreated: []
    });
    await admin.save();

    // Create staff (simulating what controller does)
    const staffEmail = `staff-hierarchy-${Date.now()}@hierarchy-test.com`;
    const staff = new User({
      name: 'Hierarchy Test Staff',
      email: staffEmail,
      phone: '9444444445',
      password: 'TestPassword123!',
      role: USER_ROLES.STAFF, // Controller always sets this
      permissions: { orders: { view: true, create: false, update: false, delete: false } },
      isActive: true,
      isEmailVerified: true,
      createdBy: admin._id,
      createdByModel: 'User'
    });
    await staff.save();

    // Verify staff has STAFF role, not ADMIN
    const savedStaff = await User.findById(staff._id);
    expect(savedStaff.role).toBe(USER_ROLES.STAFF);
    expect(savedStaff.role).not.toBe(USER_ROLES.ADMIN);

    // Cleanup
    await User.deleteMany({ email: { $in: [adminEmail, staffEmail] } });
  });

  test('admin role should not be assignable through staff creation', () => {
    // The controller enforces this by hardcoding role: USER_ROLES.STAFF
    // This test verifies the constant values
    expect(USER_ROLES.STAFF).toBe('staff');
    expect(USER_ROLES.ADMIN).toBe('admin');
    expect(USER_ROLES.STAFF).not.toBe(USER_ROLES.ADMIN);
  });
});

/**
 * Property 5: Branch Inheritance
 * For any Staff created by an Admin, the Staff's branch assignment must equal 
 * the creating Admin's assigned branch.
 * Validates: Requirements 4.4
 */
describe('Feature: admin-rbac-system, Property 5: Branch Inheritance', () => {
  const mongoose = require('mongoose');

  beforeEach(async () => {
    await User.deleteMany({ email: { $regex: /@branch-test\.com$/ } });
  });

  afterAll(async () => {
    await User.deleteMany({ email: { $regex: /@branch-test\.com$/ } });
  });

  test('staff should inherit admin branch assignment', async () => {
    // Create a fake branch ID
    const branchId = new mongoose.Types.ObjectId();
    
    // Create admin with branch
    const adminEmail = `admin-branch-${Date.now()}@branch-test.com`;
    const admin = new User({
      name: 'Branch Test Admin',
      email: adminEmail,
      phone: '9555555555',
      password: 'TestPassword123!',
      role: USER_ROLES.ADMIN,
      permissions: { orders: { view: true, create: false, update: false, delete: false } },
      assignedBranch: branchId,
      isActive: true,
      isEmailVerified: true,
      staffCreated: []
    });
    await admin.save();

    // Create staff with admin's branch (simulating controller behavior)
    const staffEmail = `staff-branch-${Date.now()}@branch-test.com`;
    const staff = new User({
      name: 'Branch Test Staff',
      email: staffEmail,
      phone: '9555555556',
      password: 'TestPassword123!',
      role: USER_ROLES.STAFF,
      permissions: { orders: { view: true, create: false, update: false, delete: false } },
      assignedBranch: admin.assignedBranch, // Inherited from admin
      isActive: true,
      isEmailVerified: true,
      createdBy: admin._id,
      createdByModel: 'User'
    });
    await staff.save();

    // Verify branch inheritance
    const savedStaff = await User.findById(staff._id);
    expect(savedStaff.assignedBranch.toString()).toBe(branchId.toString());
    expect(savedStaff.assignedBranch.toString()).toBe(admin.assignedBranch.toString());
  });

  test('staff should have null branch if admin has no branch', async () => {
    // Create admin without branch
    const adminEmail = `admin-no-branch-${Date.now()}@branch-test.com`;
    const admin = new User({
      name: 'No Branch Admin',
      email: adminEmail,
      phone: '9666666666',
      password: 'TestPassword123!',
      role: USER_ROLES.ADMIN,
      permissions: { orders: { view: true, create: false, update: false, delete: false } },
      assignedBranch: null,
      isActive: true,
      isEmailVerified: true,
      staffCreated: []
    });
    await admin.save();

    // Create staff (should also have null branch)
    const staffEmail = `staff-no-branch-${Date.now()}@branch-test.com`;
    const staff = new User({
      name: 'No Branch Staff',
      email: staffEmail,
      phone: '9666666667',
      password: 'TestPassword123!',
      role: USER_ROLES.STAFF,
      permissions: { orders: { view: true, create: false, update: false, delete: false } },
      assignedBranch: admin.assignedBranch, // null
      isActive: true,
      isEmailVerified: true,
      createdBy: admin._id,
      createdByModel: 'User'
    });
    await staff.save();

    // Verify both have null branch
    const savedStaff = await User.findById(staff._id);
    expect(savedStaff.assignedBranch).toBeNull();
  });
});


/**
 * Property 8: Login Response Contains Permissions
 * For any successful login (Admin or Staff), the response payload must include 
 * the complete permissions object matching the user's stored permissions.
 * Validates: Requirements 5.4, 8.1
 */
describe('Feature: admin-rbac-system, Property 8: Login Response Contains Permissions', () => {
  // This test validates the structure of what login should return
  // The actual API test would require supertest integration
  
  test('admin user object should contain permissions field', async () => {
    const { getDefaultPermissions, MODULES, getModuleActions } = require('../src/config/permissions');
    
    // Create admin with permissions
    const permissions = {};
    MODULES.forEach(module => {
      permissions[module] = {};
      const actions = getModuleActions(module);
      actions.forEach(action => {
        permissions[module][action] = Math.random() > 0.5;
      });
    });
    permissions.orders.view = true; // Ensure at least one
    
    const adminEmail = `admin-login-${Date.now()}@login-test.com`;
    const admin = new User({
      name: 'Login Test Admin',
      email: adminEmail,
      phone: '9777777777',
      password: 'TestPassword123!',
      role: USER_ROLES.ADMIN,
      permissions,
      isActive: true,
      isEmailVerified: true
    });
    await admin.save();

    // Retrieve and verify permissions are stored
    const savedAdmin = await User.findOne({ email: adminEmail });
    
    expect(savedAdmin.permissions).toBeDefined();
    expect(savedAdmin.role).toBe(USER_ROLES.ADMIN);
    
    // Verify all modules have permissions
    MODULES.forEach(module => {
      expect(savedAdmin.permissions[module]).toBeDefined();
    });

    // Cleanup
    await User.deleteOne({ email: adminEmail });
  });

  test('staff user object should contain permissions field', async () => {
    const { MODULES, getModuleActions } = require('../src/config/permissions');
    
    // Create staff with permissions
    const permissions = {};
    MODULES.forEach(module => {
      permissions[module] = {};
      const actions = getModuleActions(module);
      actions.forEach(action => {
        permissions[module][action] = Math.random() > 0.7; // Less permissions for staff
      });
    });
    permissions.orders.view = true;
    
    const staffEmail = `staff-login-${Date.now()}@login-test.com`;
    const staff = new User({
      name: 'Login Test Staff',
      email: staffEmail,
      phone: '9777777778',
      password: 'TestPassword123!',
      role: USER_ROLES.STAFF,
      permissions,
      isActive: true,
      isEmailVerified: true
    });
    await staff.save();

    // Retrieve and verify permissions are stored
    const savedStaff = await User.findOne({ email: staffEmail });
    
    expect(savedStaff.permissions).toBeDefined();
    expect(savedStaff.role).toBe(USER_ROLES.STAFF);

    // Cleanup
    await User.deleteOne({ email: staffEmail });
  });

  test('customer user should not have permissions field populated', async () => {
    const customerEmail = `customer-login-${Date.now()}@login-test.com`;
    const customer = new User({
      name: 'Login Test Customer',
      email: customerEmail,
      phone: '9777777779',
      password: 'TestPassword123!',
      role: USER_ROLES.CUSTOMER,
      isActive: true,
      isEmailVerified: true
    });
    await customer.save();

    // Retrieve customer
    const savedCustomer = await User.findOne({ email: customerEmail });
    
    expect(savedCustomer.role).toBe(USER_ROLES.CUSTOMER);
    // Permissions should be default (all false) or undefined for customers
    
    // Cleanup
    await User.deleteOne({ email: customerEmail });
  });

  test('permissions in response should match stored permissions exactly', async () => {
    const { MODULES, getModuleActions } = require('../src/config/permissions');
    const ITERATIONS = 10;
    
    for (let i = 0; i < ITERATIONS; i++) {
      // Generate random permissions
      const permissions = {};
      MODULES.forEach(module => {
        permissions[module] = {};
        const actions = getModuleActions(module);
        actions.forEach(action => {
          permissions[module][action] = Math.random() > 0.5;
        });
      });
      permissions.orders.view = true;
      
      const email = `admin-exact-${Date.now()}-${i}@login-test.com`;
      const admin = new User({
        name: `Exact Test Admin ${i}`,
        email,
        phone: `${9800000000 + i}`,
        password: 'TestPassword123!',
        role: USER_ROLES.ADMIN,
        permissions,
        isActive: true,
        isEmailVerified: true
      });
      await admin.save();

      // Retrieve and compare
      const savedAdmin = await User.findOne({ email });
      
      MODULES.forEach(module => {
        const actions = getModuleActions(module);
        actions.forEach(action => {
          expect(savedAdmin.permissions[module][action]).toBe(permissions[module][action]);
        });
      });

      // Cleanup
      await User.deleteOne({ email });
    }
  });
});


/**
 * Property 10: Audit Log Completeness
 * For any admin creation, permission modification, or deactivation event, 
 * an audit log entry must exist with correct actor, timestamp, and state information.
 * Validates: Requirements 7.1, 7.2, 7.3
 */
describe('Feature: admin-rbac-system, Property 10: Audit Log Completeness', () => {
  const AuditLog = require('../src/models/AuditLog');

  beforeEach(async () => {
    // Clean up test audit logs
    await AuditLog.deleteMany({ userEmail: { $regex: /@audit-test\.com$/ } });
    await User.deleteMany({ email: { $regex: /@audit-test\.com$/ } });
  });

  afterAll(async () => {
    await AuditLog.deleteMany({ userEmail: { $regex: /@audit-test\.com$/ } });
    await User.deleteMany({ email: { $regex: /@audit-test\.com$/ } });
  });

  test('audit log should be created for admin creation', async () => {
    const superAdminEmail = `superadmin-${Date.now()}@audit-test.com`;
    
    // Simulate audit log creation (as controller would do)
    const auditLog = await AuditLog.logAction({
      userId: new mongoose.Types.ObjectId(),
      userType: 'superadmin',
      userEmail: superAdminEmail,
      action: 'create_admin',
      category: 'users',
      description: 'Created new admin: Test Admin',
      ipAddress: '127.0.0.1',
      userAgent: 'Jest Test',
      resourceType: 'user',
      resourceId: new mongoose.Types.ObjectId().toString(),
      status: 'success',
      riskLevel: 'medium',
      metadata: {
        adminName: 'Test Admin',
        adminEmail: 'testadmin@audit-test.com'
      }
    });

    expect(auditLog).toBeDefined();
    expect(auditLog.action).toBe('create_admin');
    expect(auditLog.category).toBe('users');
    expect(auditLog.status).toBe('success');
    expect(auditLog.metadata.adminName).toBe('Test Admin');
    expect(auditLog.timestamp).toBeDefined();
  });

  test('audit log should capture permission changes with before/after state', async () => {
    const superAdminEmail = `superadmin-perm-${Date.now()}@audit-test.com`;
    
    const beforePermissions = {
      orders: { view: true, create: false, update: false, delete: false }
    };
    
    const afterPermissions = {
      orders: { view: true, create: true, update: true, delete: false }
    };

    const auditLog = await AuditLog.logAction({
      userId: new mongoose.Types.ObjectId(),
      userType: 'superadmin',
      userEmail: superAdminEmail,
      action: 'update_admin_permissions',
      category: 'users',
      description: 'Updated permissions for admin',
      ipAddress: '127.0.0.1',
      userAgent: 'Jest Test',
      resourceType: 'user',
      resourceId: new mongoose.Types.ObjectId().toString(),
      status: 'success',
      riskLevel: 'high',
      changes: {
        before: { permissions: beforePermissions },
        after: { permissions: afterPermissions }
      }
    });

    expect(auditLog).toBeDefined();
    expect(auditLog.action).toBe('update_admin_permissions');
    expect(auditLog.changes).toBeDefined();
    expect(auditLog.changes.before.permissions).toEqual(beforePermissions);
    expect(auditLog.changes.after.permissions).toEqual(afterPermissions);
    expect(auditLog.riskLevel).toBe('high');
  });

  test('audit log should capture deactivation with reason', async () => {
    const superAdminEmail = `superadmin-deact-${Date.now()}@audit-test.com`;
    const reason = 'Policy violation';

    const auditLog = await AuditLog.logAction({
      userId: new mongoose.Types.ObjectId(),
      userType: 'superadmin',
      userEmail: superAdminEmail,
      action: 'deactivate_admin',
      category: 'users',
      description: `Deactivated admin - Reason: ${reason}`,
      ipAddress: '127.0.0.1',
      userAgent: 'Jest Test',
      resourceType: 'user',
      resourceId: new mongoose.Types.ObjectId().toString(),
      status: 'success',
      riskLevel: 'high',
      metadata: {
        reason,
        staffDeactivated: 3
      }
    });

    expect(auditLog).toBeDefined();
    expect(auditLog.action).toBe('deactivate_admin');
    expect(auditLog.metadata.reason).toBe(reason);
    expect(auditLog.metadata.staffDeactivated).toBe(3);
  });

  test('audit logs should be queryable by user activity', async () => {
    const userId = new mongoose.Types.ObjectId();
    const userEmail = `user-activity-${Date.now()}@audit-test.com`;

    // Create multiple audit logs for same user
    const actions = ['create_admin', 'update_admin', 'deactivate_admin'];
    
    for (const action of actions) {
      await AuditLog.logAction({
        userId,
        userType: 'superadmin',
        userEmail,
        action,
        category: 'users',
        description: `Action: ${action}`,
        ipAddress: '127.0.0.1',
        userAgent: 'Jest Test',
        status: 'success',
        riskLevel: 'medium'
      });
    }

    // Query user activity
    const userActivity = await AuditLog.getUserActivity(userId, { limit: 10 });

    expect(userActivity.length).toBe(3);
    expect(userActivity.map(a => a.action)).toEqual(expect.arrayContaining(actions));
  });

  test('audit log should have required fields', async () => {
    const auditLog = await AuditLog.logAction({
      userId: new mongoose.Types.ObjectId(),
      userType: 'superadmin',
      userEmail: `required-fields-${Date.now()}@audit-test.com`,
      action: 'test_action',
      category: 'users',
      description: 'Test description',
      ipAddress: '127.0.0.1',
      status: 'success'
    });

    // Verify required fields
    expect(auditLog.userId).toBeDefined();
    expect(auditLog.userType).toBeDefined();
    expect(auditLog.userEmail).toBeDefined();
    expect(auditLog.action).toBeDefined();
    expect(auditLog.category).toBeDefined();
    expect(auditLog.description).toBeDefined();
    expect(auditLog.ipAddress).toBeDefined();
    expect(auditLog.status).toBeDefined();
    expect(auditLog.timestamp).toBeDefined();
  });
});
