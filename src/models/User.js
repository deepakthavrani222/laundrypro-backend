const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { USER_ROLES, WORKER_TYPES } = require('../config/constants');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    maxlength: [50, 'Name cannot exceed 50 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    unique: true,
    match: [/^[6-9]\d{9}$/, 'Please enter a valid 10-digit phone number']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters'],
    select: false
  },
  role: {
    type: String,
    enum: Object.values(USER_ROLES),
    default: USER_ROLES.CUSTOMER
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isVIP: {
    type: Boolean,
    default: false
  },
  // Customer specific fields
  addresses: [{
    name: String,
    phone: String,
    addressLine1: String,
    addressLine2: String,
    landmark: String,
    city: String,
    pincode: String,
    addressType: {
      type: String,
      enum: ['home', 'office', 'other'],
      default: 'home'
    },
    isDefault: {
      type: Boolean,
      default: false
    }
  }],
  preferences: {
    preferredPickupTime: String,
    savedServices: [String]
  },
  // Branch Manager specific fields
  assignedBranch: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Branch'
  },
  // Staff/Worker specific fields
  workerType: {
    type: String,
    enum: Object.values(WORKER_TYPES),
    default: WORKER_TYPES.GENERAL
  },
  
  // RBAC: Granular Permissions (for admin/center_admin/staff roles)
  // Using Mixed type to support both Admin and Center Admin permission structures
  permissions: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  
  // RBAC: Admin metadata - who created this user
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'createdByModel'
  },
  createdByModel: {
    type: String,
    enum: ['SuperAdmin', 'User'],
    default: 'SuperAdmin'
  },
  
  // RBAC: Staff created by this admin
  staffCreated: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  // Rewards
  rewardPoints: {
    type: Number,
    default: 0
  },
  totalOrders: {
    type: Number,
    default: 0
  },
  // Email verification
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  emailVerificationToken: {
    type: String,
    select: false
  },
  emailVerificationExpires: {
    type: Date,
    select: false
  },
  // Password reset
  passwordResetToken: {
    type: String,
    select: false
  },
  passwordResetExpires: {
    type: Date,
    select: false
  },
  // Timestamps
  lastLogin: Date,
  phoneVerified: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Index for performance
userSchema.index({ email: 1 });
userSchema.index({ phone: 1 });
userSchema.index({ role: 1 });

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Update last login
userSchema.methods.updateLastLogin = function() {
  this.lastLogin = new Date();
  return this.save({ validateBeforeSave: false });
};

// Generate email verification token
userSchema.methods.generateEmailVerificationToken = function() {
  const crypto = require('crypto');
  const token = crypto.randomBytes(32).toString('hex');
  
  this.emailVerificationToken = crypto.createHash('sha256').update(token).digest('hex');
  this.emailVerificationExpires = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
  
  return token;
};

// Generate password reset token
userSchema.methods.generatePasswordResetToken = function() {
  const crypto = require('crypto');
  const token = crypto.randomBytes(32).toString('hex');
  
  this.passwordResetToken = crypto.createHash('sha256').update(token).digest('hex');
  this.passwordResetExpires = Date.now() + 60 * 60 * 1000; // 1 hour
  
  return token;
};

// RBAC: Check if user has specific permission
userSchema.methods.hasPermission = function(module, action) {
  // SuperAdmin has all permissions
  if (this.role === USER_ROLES.SUPERADMIN) {
    return true;
  }
  
  // Check if permissions object exists
  if (!this.permissions || !this.permissions[module]) {
    return false;
  }
  
  // Check specific action permission
  return this.permissions[module][action] === true;
};

// RBAC: Check if user has any permission in a module
userSchema.methods.hasModuleAccess = function(module) {
  if (this.role === USER_ROLES.SUPERADMIN) {
    return true;
  }
  
  if (!this.permissions || !this.permissions[module]) {
    return false;
  }
  
  // Check if any action is permitted in this module
  const modulePerms = this.permissions[module];
  return Object.values(modulePerms).some(value => value === true);
};

// RBAC: Get all permissions as flat object for token/response
userSchema.methods.getPermissionsSummary = function() {
  if (this.role === USER_ROLES.SUPERADMIN) {
    return { fullAccess: true };
  }
  
  return this.permissions || {};
};

module.exports = mongoose.model('User', userSchema);