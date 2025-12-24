/**
 * Super Admin - Admin Management Controller
 * Feature: admin-rbac-system
 * 
 * Handles CRUD operations for Admin users by Super Admin.
 * Requirements: 1.1, 1.2, 1.3, 1.4, 6.1, 6.2, 6.3, 6.4, 7.1, 7.2, 7.3
 */

const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const { USER_ROLES } = require('../config/constants');
const { 
  hasAtLeastOnePermission, 
  getDefaultPermissions,
  getAllPresetRoles,
  getPresetRole,
  PRESET_ROLES
} = require('../config/permissions');
const { validationResult } = require('express-validator');

/**
 * Create a new Admin or Center Admin user
 * POST /api/superadmin/admins
 * Requirements: 1.1, 1.2, 1.3, 7.1
 */
const createAdmin = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { name, email, phone, password, permissions, assignedBranch, role } = req.body;

    // Validate role - only admin or center_admin allowed
    const allowedRoles = [USER_ROLES.ADMIN, USER_ROLES.CENTER_ADMIN];
    const userRole = role || USER_ROLES.ADMIN; // Default to admin if not specified
    
    if (!allowedRoles.includes(userRole)) {
      return res.status(400).json({
        success: false,
        code: 'INVALID_ROLE',
        message: 'Invalid role. Only admin or center_admin allowed'
      });
    }

    // Center Admin must have an assigned branch
    if (userRole === USER_ROLES.CENTER_ADMIN && !assignedBranch) {
      return res.status(400).json({
        success: false,
        code: 'BRANCH_REQUIRED',
        message: 'Center Admin must be assigned to a branch'
      });
    }

    // Check for duplicate email
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        code: 'DUPLICATE_EMAIL',
        message: 'User with this email already exists'
      });
    }

    // Check for duplicate phone
    const existingPhone = await User.findOne({ phone });
    if (existingPhone) {
      return res.status(409).json({
        success: false,
        code: 'DUPLICATE_PHONE',
        message: 'User with this phone number already exists'
      });
    }

    // Validate permissions - must have at least one
    if (!permissions || !hasAtLeastOnePermission(permissions)) {
      return res.status(400).json({
        success: false,
        code: 'INVALID_PERMISSIONS',
        message: 'At least one permission must be assigned'
      });
    }

    // Create user
    const userData = {
      name,
      email: email.toLowerCase(),
      phone,
      password,
      role: userRole,
      permissions: permissions, // Both Admin and Center Admin get permissions
      assignedBranch: assignedBranch || null,
      createdBy: req.admin._id,
      createdByModel: 'SuperAdmin',
      isActive: true,
      isEmailVerified: true, // Admin/Center Admin accounts are pre-verified
      staffCreated: []
    };

    const user = new User(userData);
    await user.save();

    const roleLabel = userRole === USER_ROLES.CENTER_ADMIN ? 'Center Admin' : 'Admin';

    // Create audit log
    await AuditLog.logAction({
      userId: req.admin._id,
      userType: 'superadmin',
      userEmail: req.admin.email,
      action: userRole === USER_ROLES.CENTER_ADMIN ? 'create_center_admin' : 'create_admin',
      category: 'users',
      description: `Created new ${roleLabel}: ${user.name} (${user.email})`,
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent'),
      sessionId: req.sessionId,
      resourceType: 'user',
      resourceId: user._id.toString(),
      status: 'success',
      riskLevel: 'medium',
      metadata: {
        userName: user.name,
        userEmail: user.email,
        role: userRole,
        permissions: user.permissions,
        assignedBranch: user.assignedBranch
      }
    });

    // Return user without password
    const userResponse = user.toObject();
    delete userResponse.password;

    return res.status(201).json({
      success: true,
      message: `${roleLabel} created successfully`,
      data: { admin: userResponse }
    });
  } catch (error) {
    console.error('Create admin error:', error);
    return res.status(500).json({
      success: false,
      code: 'SERVER_ERROR',
      message: 'Failed to create user'
    });
  }
};

/**
 * Get all Admin and Center Admin users with pagination
 * GET /api/superadmin/admins
 * Requirements: 1.4
 */
const getAdmins = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search,
      isActive,
      role, // Filter by role: admin, center_admin, or all
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build query - include both admin and center_admin
    const query = { role: { $in: [USER_ROLES.ADMIN, USER_ROLES.CENTER_ADMIN] } };

    // Filter by specific role if provided
    if (role && role !== 'all') {
      query.role = role;
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ];
    }

    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
    }

    // Build sort
    const sort = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Execute query
    const admins = await User.find(query)
      .select('-password -emailVerificationToken -passwordResetToken')
      .populate('assignedBranch', 'name code city')
      .populate('createdBy', 'name email')
      .sort(sort)
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .lean();

    const total = await User.countDocuments(query);

    // Add staff count for each admin
    const adminsWithStats = await Promise.all(
      admins.map(async (admin) => {
        const staffCount = admin.staffCreated?.length || 0;
        
        // Generate permission summary
        const permissionSummary = generatePermissionSummary(admin.permissions);
        
        return {
          ...admin,
          staffCount,
          permissionSummary
        };
      })
    );

    return res.json({
      success: true,
      data: {
        admins: adminsWithStats,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / parseInt(limit)),
          total,
          limit: parseInt(limit)
        }
      }
    });
  } catch (error) {
    console.error('Get admins error:', error);
    return res.status(500).json({
      success: false,
      code: 'SERVER_ERROR',
      message: 'Failed to fetch admins'
    });
  }
};

/**
 * Get single Admin or Center Admin by ID
 * GET /api/superadmin/admins/:id
 * Requirements: 6.4
 */
const getAdminById = async (req, res) => {
  try {
    const { id } = req.params;

    const admin = await User.findOne({ 
      _id: id, 
      role: { $in: [USER_ROLES.ADMIN, USER_ROLES.CENTER_ADMIN] } 
    })
      .select('-password -emailVerificationToken -passwordResetToken')
      .populate('assignedBranch', 'name code city address')
      .populate('createdBy', 'name email')
      .populate('staffCreated', 'name email phone role isActive')
      .lean();

    if (!admin) {
      return res.status(404).json({
        success: false,
        code: 'NOT_FOUND',
        message: 'Admin/Center Admin not found'
      });
    }

    // Add additional stats
    const staffCount = admin.staffCreated?.length || 0;
    const activeStaffCount = admin.staffCreated?.filter(s => s.isActive).length || 0;
    const permissionSummary = generatePermissionSummary(admin.permissions);

    return res.json({
      success: true,
      data: {
        admin: {
          ...admin,
          staffCount,
          activeStaffCount,
          permissionSummary
        }
      }
    });
  } catch (error) {
    console.error('Get admin by ID error:', error);
    return res.status(500).json({
      success: false,
      code: 'SERVER_ERROR',
      message: 'Failed to fetch admin details'
    });
  }
};

/**
 * Update Admin/Center Admin profile and permissions
 * PUT /api/superadmin/admins/:id
 * Requirements: 6.1, 7.2
 */
const updateAdmin = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { id } = req.params;
    const { name, phone, permissions, assignedBranch } = req.body;

    const admin = await User.findOne({ 
      _id: id, 
      role: { $in: [USER_ROLES.ADMIN, USER_ROLES.CENTER_ADMIN] } 
    });
    if (!admin) {
      return res.status(404).json({
        success: false,
        code: 'NOT_FOUND',
        message: 'Admin/Center Admin not found'
      });
    }

    // Store original data for audit
    const originalData = {
      name: admin.name,
      phone: admin.phone,
      permissions: admin.permissions,
      assignedBranch: admin.assignedBranch
    };

    // Validate permissions if provided (only for admin role)
    if (admin.role === USER_ROLES.ADMIN && permissions && !hasAtLeastOnePermission(permissions)) {
      return res.status(400).json({
        success: false,
        code: 'INVALID_PERMISSIONS',
        message: 'At least one permission must be assigned'
      });
    }

    // Update fields
    if (name) admin.name = name;
    if (phone) admin.phone = phone;
    if (permissions && admin.role === USER_ROLES.ADMIN) admin.permissions = permissions;
    if (assignedBranch !== undefined) admin.assignedBranch = assignedBranch || null;

    await admin.save();

    const roleLabel = admin.role === USER_ROLES.CENTER_ADMIN ? 'Center Admin' : 'Admin';

    // Create audit log
    await AuditLog.logAction({
      userId: req.admin._id,
      userType: 'superadmin',
      userEmail: req.admin.email,
      action: 'update_admin',
      category: 'users',
      description: `Updated ${roleLabel}: ${admin.name} (${admin.email})`,
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent'),
      sessionId: req.sessionId,
      resourceType: 'user',
      resourceId: admin._id.toString(),
      status: 'success',
      riskLevel: 'high',
      changes: {
        before: originalData,
        after: {
          name: admin.name,
          phone: admin.phone,
          permissions: admin.permissions,
          assignedBranch: admin.assignedBranch
        }
      }
    });

    // Return updated admin without password
    const adminResponse = admin.toObject();
    delete adminResponse.password;

    return res.json({
      success: true,
      message: `${roleLabel} updated successfully`,
      data: { admin: adminResponse }
    });
  } catch (error) {
    console.error('Update admin error:', error);
    return res.status(500).json({
      success: false,
      code: 'SERVER_ERROR',
      message: 'Failed to update admin'
    });
  }
};

/**
 * Update Admin permissions only
 * PUT /api/superadmin/admins/:id/permissions
 * Requirements: 6.1, 7.2
 */
const updatePermissions = async (req, res) => {
  try {
    const { id } = req.params;
    const { permissions } = req.body;

    const admin = await User.findOne({ 
      _id: id, 
      role: { $in: [USER_ROLES.ADMIN, USER_ROLES.CENTER_ADMIN] } 
    });
    if (!admin) {
      return res.status(404).json({
        success: false,
        code: 'NOT_FOUND',
        message: 'Admin/Center Admin not found'
      });
    }

    // Validate permissions
    if (!permissions || !hasAtLeastOnePermission(permissions)) {
      return res.status(400).json({
        success: false,
        code: 'INVALID_PERMISSIONS',
        message: 'At least one permission must be assigned'
      });
    }

    // Store original permissions for audit
    const originalPermissions = admin.permissions;

    // Update permissions
    admin.permissions = permissions;
    admin.markModified('permissions'); // Required for Mixed type
    await admin.save();

    const roleLabel = admin.role === USER_ROLES.CENTER_ADMIN ? 'Center Admin' : 'Admin';

    // Create audit log
    await AuditLog.logAction({
      userId: req.admin._id,
      userType: 'superadmin',
      userEmail: req.admin.email,
      action: admin.role === USER_ROLES.CENTER_ADMIN ? 'update_center_admin_permissions' : 'update_admin_permissions',
      category: 'users',
      description: `Updated permissions for ${roleLabel}: ${admin.name} (${admin.email})`,
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent'),
      sessionId: req.sessionId,
      resourceType: 'user',
      resourceId: admin._id.toString(),
      status: 'success',
      riskLevel: 'high',
      changes: {
        before: { permissions: originalPermissions },
        after: { permissions: admin.permissions }
      }
    });

    return res.json({
      success: true,
      message: 'Permissions updated successfully',
      data: { 
        admin: {
          _id: admin._id,
          name: admin.name,
          email: admin.email,
          role: admin.role,
          permissions: admin.permissions
        }
      }
    });
  } catch (error) {
    console.error('Update permissions error:', error);
    return res.status(500).json({
      success: false,
      code: 'SERVER_ERROR',
      message: 'Failed to update permissions'
    });
  }
};

/**
 * Deactivate Admin/Center Admin (soft delete) with cascade to staff
 * DELETE /api/superadmin/admins/:id
 * Requirements: 6.2, 6.3, 7.3
 */
const deactivateAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const admin = await User.findOne({ 
      _id: id, 
      role: { $in: [USER_ROLES.ADMIN, USER_ROLES.CENTER_ADMIN] } 
    });
    if (!admin) {
      return res.status(404).json({
        success: false,
        code: 'NOT_FOUND',
        message: 'Admin/Center Admin not found'
      });
    }

    if (!admin.isActive) {
      return res.status(400).json({
        success: false,
        code: 'ALREADY_DEACTIVATED',
        message: 'User is already deactivated'
      });
    }

    // Deactivate admin
    admin.isActive = false;
    await admin.save();

    // Cascade deactivate all staff created by this admin
    const staffDeactivated = await User.updateMany(
      { _id: { $in: admin.staffCreated } },
      { $set: { isActive: false } }
    );

    const roleLabel = admin.role === USER_ROLES.CENTER_ADMIN ? 'Center Admin' : 'Admin';

    // Create audit log
    await AuditLog.logAction({
      userId: req.admin._id,
      userType: 'superadmin',
      userEmail: req.admin.email,
      action: admin.role === USER_ROLES.CENTER_ADMIN ? 'deactivate_center_admin' : 'deactivate_admin',
      category: 'users',
      description: `Deactivated ${roleLabel}: ${admin.name} (${admin.email})${reason ? ` - Reason: ${reason}` : ''}`,
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent'),
      sessionId: req.sessionId,
      resourceType: 'user',
      resourceId: admin._id.toString(),
      status: 'success',
      riskLevel: 'high',
      metadata: {
        userName: admin.name,
        userEmail: admin.email,
        role: admin.role,
        reason: reason || 'Not specified',
        staffDeactivated: staffDeactivated.modifiedCount
      }
    });

    return res.json({
      success: true,
      message: `${roleLabel} deactivated successfully`,
      data: {
        admin: {
          _id: admin._id,
          name: admin.name,
          email: admin.email,
          role: admin.role,
          isActive: admin.isActive
        },
        staffDeactivated: staffDeactivated.modifiedCount
      }
    });
  } catch (error) {
    console.error('Deactivate admin error:', error);
    return res.status(500).json({
      success: false,
      code: 'SERVER_ERROR',
      message: 'Failed to deactivate user'
    });
  }
};

/**
 * Reactivate Admin/Center Admin
 * PUT /api/superadmin/admins/:id/reactivate
 */
const reactivateAdmin = async (req, res) => {
  try {
    const { id } = req.params;

    const admin = await User.findOne({ 
      _id: id, 
      role: { $in: [USER_ROLES.ADMIN, USER_ROLES.CENTER_ADMIN] } 
    });
    if (!admin) {
      return res.status(404).json({
        success: false,
        code: 'NOT_FOUND',
        message: 'Admin/Center Admin not found'
      });
    }

    if (admin.isActive) {
      return res.status(400).json({
        success: false,
        code: 'ALREADY_ACTIVE',
        message: 'User is already active'
      });
    }

    // Reactivate admin
    admin.isActive = true;
    await admin.save();

    const roleLabel = admin.role === USER_ROLES.CENTER_ADMIN ? 'Center Admin' : 'Admin';

    // Create audit log
    await AuditLog.logAction({
      userId: req.admin._id,
      userType: 'superadmin',
      userEmail: req.admin.email,
      action: admin.role === USER_ROLES.CENTER_ADMIN ? 'reactivate_center_admin' : 'reactivate_admin',
      category: 'users',
      description: `Reactivated ${roleLabel}: ${admin.name} (${admin.email})`,
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent'),
      sessionId: req.sessionId,
      resourceType: 'user',
      resourceId: admin._id.toString(),
      status: 'success',
      riskLevel: 'medium'
    });

    return res.json({
      success: true,
      message: `${roleLabel} reactivated successfully`,
      data: {
        admin: {
          _id: admin._id,
          name: admin.name,
          email: admin.email,
          role: admin.role,
          isActive: admin.isActive
        }
      }
    });
  } catch (error) {
    console.error('Reactivate admin error:', error);
    return res.status(500).json({
      success: false,
      code: 'SERVER_ERROR',
      message: 'Failed to reactivate user'
    });
  }
};

/**
 * Get preset role templates
 * GET /api/superadmin/preset-roles
 * Requirements: 3.1
 */
const getPresetRoles = async (req, res) => {
  try {
    const presets = getAllPresetRoles();
    
    // Include full permissions for each preset
    const presetsWithPermissions = presets.map(preset => ({
      ...preset,
      permissions: PRESET_ROLES[preset.key].permissions
    }));

    return res.json({
      success: true,
      data: { presets: presetsWithPermissions }
    });
  } catch (error) {
    console.error('Get preset roles error:', error);
    return res.status(500).json({
      success: false,
      code: 'SERVER_ERROR',
      message: 'Failed to fetch preset roles'
    });
  }
};

/**
 * Get default (empty) permissions structure
 * GET /api/superadmin/default-permissions
 */
const getDefaultPermissionsStructure = async (req, res) => {
  try {
    const permissions = getDefaultPermissions();
    
    return res.json({
      success: true,
      data: { permissions }
    });
  } catch (error) {
    console.error('Get default permissions error:', error);
    return res.status(500).json({
      success: false,
      code: 'SERVER_ERROR',
      message: 'Failed to fetch default permissions'
    });
  }
};

// Helper function to generate permission summary
const generatePermissionSummary = (permissions) => {
  if (!permissions) return { modules: 0, totalPermissions: 0 };
  
  let modules = 0;
  let totalPermissions = 0;
  
  for (const module of Object.keys(permissions)) {
    let hasModuleAccess = false;
    for (const action of Object.keys(permissions[module])) {
      if (permissions[module][action] === true) {
        totalPermissions++;
        hasModuleAccess = true;
      }
    }
    if (hasModuleAccess) modules++;
  }
  
  return { modules, totalPermissions };
};

module.exports = {
  createAdmin,
  getAdmins,
  getAdminById,
  updateAdmin,
  updatePermissions,
  deactivateAdmin,
  reactivateAdmin,
  getPresetRoles,
  getDefaultPermissionsStructure
};
