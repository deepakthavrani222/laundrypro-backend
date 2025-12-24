/**
 * Admin - Staff Management Controller
 * Feature: admin-rbac-system
 * 
 * Handles CRUD operations for Staff users by Admin.
 * Requirements: 4.1, 4.2, 4.3, 4.4
 */

const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const { USER_ROLES } = require('../config/constants');
const { 
  isPermissionSubset,
  hasAtLeastOnePermission,
  getDefaultPermissions
} = require('../config/permissions');
const { validationResult } = require('express-validator');

/**
 * Create a new Staff user (by Admin)
 * POST /api/admin/staff
 * Requirements: 4.1, 4.2, 4.3, 4.4
 */
const createStaff = async (req, res) => {
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

    const admin = req.user;
    const { name, email, phone, password, permissions } = req.body;

    // Requirement 4.3: Admin cannot create another Admin
    // Staff role is enforced, not from request

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

    // Requirement 4.1, 4.2: Validate staff permissions are subset of admin permissions
    if (permissions) {
      const subsetCheck = isPermissionSubset(admin.permissions, permissions);
      if (!subsetCheck.isValid) {
        return res.status(400).json({
          success: false,
          code: 'INVALID_PERMISSION',
          message: 'Cannot assign permissions you don\'t have',
          details: {
            invalidPermissions: subsetCheck.invalidPermissions
          }
        });
      }
    }

    // Requirement 4.4: Staff branch = Admin's branch
    const staffBranch = admin.assignedBranch;

    // Create staff user
    const staffData = {
      name,
      email: email.toLowerCase(),
      phone,
      password,
      role: USER_ROLES.STAFF, // Always staff, never admin
      permissions: permissions || getDefaultPermissions(),
      assignedBranch: staffBranch,
      createdBy: admin._id,
      createdByModel: 'User',
      isActive: true,
      isEmailVerified: true, // Staff accounts are pre-verified
      staffCreated: []
    };

    const staff = new User(staffData);
    await staff.save();

    // Add staff to admin's staffCreated array
    await User.findByIdAndUpdate(
      admin._id,
      { $push: { staffCreated: staff._id } }
    );

    // Create audit log
    await AuditLog.logAction({
      userId: admin._id,
      userType: 'center_admin',
      userEmail: admin.email,
      action: 'create_staff',
      category: 'users',
      description: `Created new staff: ${staff.name} (${staff.email})`,
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent'),
      sessionId: req.sessionId,
      resourceType: 'user',
      resourceId: staff._id.toString(),
      status: 'success',
      riskLevel: 'low',
      metadata: {
        staffName: staff.name,
        staffEmail: staff.email,
        permissions: staff.permissions,
        assignedBranch: staff.assignedBranch
      }
    });

    // Return staff without password
    const staffResponse = staff.toObject();
    delete staffResponse.password;

    return res.status(201).json({
      success: true,
      message: 'Staff created successfully',
      data: { staff: staffResponse }
    });
  } catch (error) {
    console.error('Create staff error:', error);
    return res.status(500).json({
      success: false,
      code: 'SERVER_ERROR',
      message: 'Failed to create staff'
    });
  }
};

/**
 * Create a new Center Admin (by Admin with users.create permission)
 * POST /api/admin/center-admins
 */
const createCenterAdmin = async (req, res) => {
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

    const admin = req.user;
    const { name, email, phone, password, assignedBranch } = req.body;

    // Check if admin has users.create permission
    if (!admin.permissions?.users?.create) {
      return res.status(403).json({
        success: false,
        code: 'FORBIDDEN',
        message: 'You do not have permission to create users'
      });
    }

    // Center Admin must have an assigned branch
    if (!assignedBranch) {
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

    // Create center admin user
    const centerAdminData = {
      name,
      email: email.toLowerCase(),
      phone,
      password,
      role: USER_ROLES.CENTER_ADMIN,
      assignedBranch,
      createdBy: admin._id,
      createdByModel: 'User',
      isActive: true,
      isEmailVerified: true,
      staffCreated: []
    };

    const centerAdmin = new User(centerAdminData);
    await centerAdmin.save();

    // Create audit log
    await AuditLog.logAction({
      userId: admin._id,
      userType: 'admin',
      userEmail: admin.email,
      action: 'create_center_admin',
      category: 'users',
      description: `Created new Center Admin: ${centerAdmin.name} (${centerAdmin.email})`,
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent'),
      sessionId: req.sessionId,
      resourceType: 'user',
      resourceId: centerAdmin._id.toString(),
      status: 'success',
      riskLevel: 'medium',
      metadata: {
        centerAdminName: centerAdmin.name,
        centerAdminEmail: centerAdmin.email,
        assignedBranch: centerAdmin.assignedBranch
      }
    });

    // Return center admin without password
    const centerAdminResponse = centerAdmin.toObject();
    delete centerAdminResponse.password;

    return res.status(201).json({
      success: true,
      message: 'Center Admin created successfully',
      data: { centerAdmin: centerAdminResponse }
    });
  } catch (error) {
    console.error('Create center admin error:', error);
    return res.status(500).json({
      success: false,
      code: 'SERVER_ERROR',
      message: 'Failed to create center admin'
    });
  }
};

/**
 * Get all Center Admins (by Admin with users.view permission)
 * GET /api/admin/center-admins
 */
const getCenterAdmins = async (req, res) => {
  try {
    const admin = req.user;
    const {
      page = 1,
      limit = 10,
      search,
      isActive,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Check if admin has users.view permission
    if (!admin.permissions?.users?.view) {
      return res.status(403).json({
        success: false,
        code: 'FORBIDDEN',
        message: 'You do not have permission to view users'
      });
    }

    // Build query
    const query = { role: USER_ROLES.CENTER_ADMIN };

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
    const centerAdmins = await User.find(query)
      .select('-password -emailVerificationToken -passwordResetToken')
      .populate('assignedBranch', 'name code city')
      .sort(sort)
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .lean();

    const total = await User.countDocuments(query);

    // Add staff count for each center admin
    const centerAdminsWithStats = centerAdmins.map(ca => ({
      ...ca,
      staffCount: ca.staffCreated?.length || 0
    }));

    return res.json({
      success: true,
      data: {
        centerAdmins: centerAdminsWithStats,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / parseInt(limit)),
          total,
          limit: parseInt(limit)
        }
      }
    });
  } catch (error) {
    console.error('Get center admins error:', error);
    return res.status(500).json({
      success: false,
      code: 'SERVER_ERROR',
      message: 'Failed to fetch center admins'
    });
  }
};

/**
 * Deactivate Center Admin (by Admin with users.delete permission)
 * DELETE /api/admin/center-admins/:id
 */
const deactivateCenterAdmin = async (req, res) => {
  try {
    const admin = req.user;
    const { id } = req.params;
    const { reason } = req.body;

    // Check if admin has users.delete permission
    if (!admin.permissions?.users?.delete) {
      return res.status(403).json({
        success: false,
        code: 'FORBIDDEN',
        message: 'You do not have permission to deactivate users'
      });
    }

    const centerAdmin = await User.findOne({ _id: id, role: USER_ROLES.CENTER_ADMIN });
    if (!centerAdmin) {
      return res.status(404).json({
        success: false,
        code: 'NOT_FOUND',
        message: 'Center Admin not found'
      });
    }

    if (!centerAdmin.isActive) {
      return res.status(400).json({
        success: false,
        code: 'ALREADY_DEACTIVATED',
        message: 'Center Admin is already deactivated'
      });
    }

    // Deactivate center admin
    centerAdmin.isActive = false;
    await centerAdmin.save();

    // Cascade deactivate all staff created by this center admin
    const staffDeactivated = await User.updateMany(
      { _id: { $in: centerAdmin.staffCreated } },
      { $set: { isActive: false } }
    );

    // Create audit log
    await AuditLog.logAction({
      userId: admin._id,
      userType: 'admin',
      userEmail: admin.email,
      action: 'deactivate_center_admin',
      category: 'users',
      description: `Deactivated Center Admin: ${centerAdmin.name} (${centerAdmin.email})${reason ? ` - Reason: ${reason}` : ''}`,
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent'),
      sessionId: req.sessionId,
      resourceType: 'user',
      resourceId: centerAdmin._id.toString(),
      status: 'success',
      riskLevel: 'medium',
      metadata: {
        centerAdminName: centerAdmin.name,
        centerAdminEmail: centerAdmin.email,
        reason: reason || 'Not specified',
        staffDeactivated: staffDeactivated.modifiedCount
      }
    });

    return res.json({
      success: true,
      message: 'Center Admin deactivated successfully',
      data: {
        centerAdmin: {
          _id: centerAdmin._id,
          name: centerAdmin.name,
          email: centerAdmin.email,
          isActive: centerAdmin.isActive
        },
        staffDeactivated: staffDeactivated.modifiedCount
      }
    });
  } catch (error) {
    console.error('Deactivate center admin error:', error);
    return res.status(500).json({
      success: false,
      code: 'SERVER_ERROR',
      message: 'Failed to deactivate center admin'
    });
  }
};

/**
 * Reactivate Center Admin (by Admin with users.update permission)
 * PUT /api/admin/center-admins/:id/reactivate
 */
const reactivateCenterAdmin = async (req, res) => {
  try {
    const admin = req.user;
    const { id } = req.params;

    // Check if admin has users.update permission
    if (!admin.permissions?.users?.update) {
      return res.status(403).json({
        success: false,
        code: 'FORBIDDEN',
        message: 'You do not have permission to update users'
      });
    }

    const centerAdmin = await User.findOne({ _id: id, role: USER_ROLES.CENTER_ADMIN });
    if (!centerAdmin) {
      return res.status(404).json({
        success: false,
        code: 'NOT_FOUND',
        message: 'Center Admin not found'
      });
    }

    if (centerAdmin.isActive) {
      return res.status(400).json({
        success: false,
        code: 'ALREADY_ACTIVE',
        message: 'Center Admin is already active'
      });
    }

    // Reactivate center admin
    centerAdmin.isActive = true;
    await centerAdmin.save();

    // Create audit log
    await AuditLog.logAction({
      userId: admin._id,
      userType: 'admin',
      userEmail: admin.email,
      action: 'reactivate_center_admin',
      category: 'users',
      description: `Reactivated Center Admin: ${centerAdmin.name} (${centerAdmin.email})`,
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent'),
      sessionId: req.sessionId,
      resourceType: 'user',
      resourceId: centerAdmin._id.toString(),
      status: 'success',
      riskLevel: 'medium'
    });

    return res.json({
      success: true,
      message: 'Center Admin reactivated successfully',
      data: {
        centerAdmin: {
          _id: centerAdmin._id,
          name: centerAdmin.name,
          email: centerAdmin.email,
          isActive: centerAdmin.isActive
        }
      }
    });
  } catch (error) {
    console.error('Reactivate center admin error:', error);
    return res.status(500).json({
      success: false,
      code: 'SERVER_ERROR',
      message: 'Failed to reactivate center admin'
    });
  }
};

/**
 * Get all Staff created by current Admin
 * GET /api/admin/staff
 * Requirements: 4.1
 */
const getMyStaff = async (req, res) => {
  try {
    const admin = req.user;
    const {
      page = 1,
      limit = 10,
      search,
      isActive,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build query - only staff created by this admin
    const query = { 
      _id: { $in: admin.staffCreated || [] },
      role: USER_ROLES.STAFF
    };

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
    const staffList = await User.find(query)
      .select('-password -emailVerificationToken -passwordResetToken')
      .populate('assignedBranch', 'name code city')
      .sort(sort)
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .lean();

    const total = await User.countDocuments(query);

    // Generate permission summary for each staff
    const staffWithSummary = staffList.map(staff => ({
      ...staff,
      permissionSummary: generatePermissionSummary(staff.permissions)
    }));

    return res.json({
      success: true,
      data: {
        staff: staffWithSummary,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / parseInt(limit)),
          total,
          limit: parseInt(limit)
        }
      }
    });
  } catch (error) {
    console.error('Get my staff error:', error);
    return res.status(500).json({
      success: false,
      code: 'SERVER_ERROR',
      message: 'Failed to fetch staff'
    });
  }
};

/**
 * Get single Staff by ID (must be created by current Admin)
 * GET /api/admin/staff/:id
 */
const getStaffById = async (req, res) => {
  try {
    const admin = req.user;
    const { id } = req.params;

    // Check if staff was created by this admin
    if (!admin.staffCreated?.includes(id)) {
      return res.status(403).json({
        success: false,
        code: 'FORBIDDEN',
        message: 'You can only view staff you created'
      });
    }

    const staff = await User.findOne({ _id: id, role: USER_ROLES.STAFF })
      .select('-password -emailVerificationToken -passwordResetToken')
      .populate('assignedBranch', 'name code city address')
      .lean();

    if (!staff) {
      return res.status(404).json({
        success: false,
        code: 'NOT_FOUND',
        message: 'Staff not found'
      });
    }

    return res.json({
      success: true,
      data: {
        staff: {
          ...staff,
          permissionSummary: generatePermissionSummary(staff.permissions)
        }
      }
    });
  } catch (error) {
    console.error('Get staff by ID error:', error);
    return res.status(500).json({
      success: false,
      code: 'SERVER_ERROR',
      message: 'Failed to fetch staff details'
    });
  }
};

/**
 * Update Staff profile and permissions
 * PUT /api/admin/staff/:id
 * Requirements: 4.1, 4.2
 */
const updateStaff = async (req, res) => {
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

    const admin = req.user;
    const { id } = req.params;
    const { name, phone, permissions } = req.body;

    // Check if staff was created by this admin
    if (!admin.staffCreated?.map(s => s.toString()).includes(id)) {
      return res.status(403).json({
        success: false,
        code: 'FORBIDDEN',
        message: 'You can only update staff you created'
      });
    }

    const staff = await User.findOne({ _id: id, role: USER_ROLES.STAFF });
    if (!staff) {
      return res.status(404).json({
        success: false,
        code: 'NOT_FOUND',
        message: 'Staff not found'
      });
    }

    // Requirement 4.1, 4.2: Validate new permissions are still subset of admin's
    if (permissions) {
      const subsetCheck = isPermissionSubset(admin.permissions, permissions);
      if (!subsetCheck.isValid) {
        return res.status(400).json({
          success: false,
          code: 'INVALID_PERMISSION',
          message: 'Cannot assign permissions you don\'t have',
          details: {
            invalidPermissions: subsetCheck.invalidPermissions
          }
        });
      }
    }

    // Store original data for audit
    const originalData = {
      name: staff.name,
      phone: staff.phone,
      permissions: staff.permissions
    };

    // Update fields
    if (name) staff.name = name;
    if (phone) staff.phone = phone;
    if (permissions) staff.permissions = permissions;

    await staff.save();

    // Create audit log
    await AuditLog.logAction({
      userId: admin._id,
      userType: 'center_admin',
      userEmail: admin.email,
      action: 'update_staff',
      category: 'users',
      description: `Updated staff: ${staff.name} (${staff.email})`,
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent'),
      sessionId: req.sessionId,
      resourceType: 'user',
      resourceId: staff._id.toString(),
      status: 'success',
      riskLevel: 'low',
      changes: {
        before: originalData,
        after: {
          name: staff.name,
          phone: staff.phone,
          permissions: staff.permissions
        }
      }
    });

    // Return updated staff without password
    const staffResponse = staff.toObject();
    delete staffResponse.password;

    return res.json({
      success: true,
      message: 'Staff updated successfully',
      data: { staff: staffResponse }
    });
  } catch (error) {
    console.error('Update staff error:', error);
    return res.status(500).json({
      success: false,
      code: 'SERVER_ERROR',
      message: 'Failed to update staff'
    });
  }
};

/**
 * Deactivate Staff
 * DELETE /api/admin/staff/:id
 * Requirements: 4.1
 */
const deactivateStaff = async (req, res) => {
  try {
    const admin = req.user;
    const { id } = req.params;
    const { reason } = req.body;

    // Check if staff was created by this admin
    if (!admin.staffCreated?.map(s => s.toString()).includes(id)) {
      return res.status(403).json({
        success: false,
        code: 'FORBIDDEN',
        message: 'You can only deactivate staff you created'
      });
    }

    const staff = await User.findOne({ _id: id, role: USER_ROLES.STAFF });
    if (!staff) {
      return res.status(404).json({
        success: false,
        code: 'NOT_FOUND',
        message: 'Staff not found'
      });
    }

    if (!staff.isActive) {
      return res.status(400).json({
        success: false,
        code: 'ALREADY_DEACTIVATED',
        message: 'Staff is already deactivated'
      });
    }

    // Deactivate staff
    staff.isActive = false;
    await staff.save();

    // Create audit log
    await AuditLog.logAction({
      userId: admin._id,
      userType: 'center_admin',
      userEmail: admin.email,
      action: 'deactivate_staff',
      category: 'users',
      description: `Deactivated staff: ${staff.name} (${staff.email})${reason ? ` - Reason: ${reason}` : ''}`,
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent'),
      sessionId: req.sessionId,
      resourceType: 'user',
      resourceId: staff._id.toString(),
      status: 'success',
      riskLevel: 'low',
      metadata: {
        staffName: staff.name,
        staffEmail: staff.email,
        reason: reason || 'Not specified'
      }
    });

    return res.json({
      success: true,
      message: 'Staff deactivated successfully',
      data: {
        staff: {
          _id: staff._id,
          name: staff.name,
          email: staff.email,
          isActive: staff.isActive
        }
      }
    });
  } catch (error) {
    console.error('Deactivate staff error:', error);
    return res.status(500).json({
      success: false,
      code: 'SERVER_ERROR',
      message: 'Failed to deactivate staff'
    });
  }
};

/**
 * Reactivate Staff
 * PUT /api/admin/staff/:id/reactivate
 */
const reactivateStaff = async (req, res) => {
  try {
    const admin = req.user;
    const { id } = req.params;

    // Check if staff was created by this admin
    if (!admin.staffCreated?.map(s => s.toString()).includes(id)) {
      return res.status(403).json({
        success: false,
        code: 'FORBIDDEN',
        message: 'You can only reactivate staff you created'
      });
    }

    const staff = await User.findOne({ _id: id, role: USER_ROLES.STAFF });
    if (!staff) {
      return res.status(404).json({
        success: false,
        code: 'NOT_FOUND',
        message: 'Staff not found'
      });
    }

    if (staff.isActive) {
      return res.status(400).json({
        success: false,
        code: 'ALREADY_ACTIVE',
        message: 'Staff is already active'
      });
    }

    // Reactivate staff
    staff.isActive = true;
    await staff.save();

    // Create audit log
    await AuditLog.logAction({
      userId: admin._id,
      userType: 'center_admin',
      userEmail: admin.email,
      action: 'reactivate_staff',
      category: 'users',
      description: `Reactivated staff: ${staff.name} (${staff.email})`,
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent'),
      sessionId: req.sessionId,
      resourceType: 'user',
      resourceId: staff._id.toString(),
      status: 'success',
      riskLevel: 'low'
    });

    return res.json({
      success: true,
      message: 'Staff reactivated successfully',
      data: {
        staff: {
          _id: staff._id,
          name: staff.name,
          email: staff.email,
          isActive: staff.isActive
        }
      }
    });
  } catch (error) {
    console.error('Reactivate staff error:', error);
    return res.status(500).json({
      success: false,
      code: 'SERVER_ERROR',
      message: 'Failed to reactivate staff'
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
  createStaff,
  createCenterAdmin,
  getCenterAdmins,
  deactivateCenterAdmin,
  reactivateCenterAdmin,
  getMyStaff,
  getStaffById,
  updateStaff,
  deactivateStaff,
  reactivateStaff
};
