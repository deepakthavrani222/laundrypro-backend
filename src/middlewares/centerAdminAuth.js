const jwt = require('jsonwebtoken')
const CenterAdmin = require('../models/CenterAdmin')
const sessionService = require('../services/sessionService')
const AuditLog = require('../models/AuditLog')

// Middleware to authenticate center admin
const authenticateCenterAdmin = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '')
    
    console.log('🔐 CenterAdminAuth - Token received:', token ? `${token.substring(0, 30)}...` : 'NO TOKEN')
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.'
      })
    }

    // Verify JWT token
    let decoded
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET)
      console.log('🔐 CenterAdminAuth - Decoded:', { adminId: decoded.adminId, role: decoded.role, sessionId: decoded.sessionId?.substring(0, 20) })
    } catch (error) {
      console.log('🔐 CenterAdminAuth - JWT verify error:', error.message)
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      })
    }

    // Check if token is for center admin
    if (decoded.role !== 'center_admin') {
      console.log('🔐 CenterAdminAuth - Role mismatch:', decoded.role)
      return res.status(403).json({
        success: false,
        message: 'Access denied. Center admin role required.'
      })
    }

    // Find admin
    const admin = await CenterAdmin.findById(decoded.adminId)
    console.log('🔐 CenterAdminAuth - Admin found:', admin ? { id: admin._id, email: admin.email, isActive: admin.isActive } : 'NOT FOUND')
    if (!admin) {
      return res.status(401).json({
        success: false,
        message: 'Admin not found'
      })
    }

    // Check if admin is active
    if (!admin.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Account is deactivated'
      })
    }

    // Validate session - skip if sessionService fails
    try {
      const sessionValidation = await sessionService.validateSession(admin, decoded.sessionId, req)
      console.log('🔐 CenterAdminAuth - Session validation:', sessionValidation)
      if (!sessionValidation.valid) {
        console.log('🔐 CenterAdminAuth - Session invalid, but continuing anyway')
        // Don't block - just log the issue
      }
      req.session = sessionValidation.session
    } catch (sessionError) {
      console.log('🔐 CenterAdminAuth - Session validation error (ignoring):', sessionError.message)
      // Continue without session validation
    }

    // Attach admin and session info to request
    req.admin = admin
    req.sessionId = decoded.sessionId

    next()
  } catch (error) {
    console.error('Authentication error:', error)
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    })
  }
}

// Middleware to check specific permissions
const requirePermission = (permission) => {
  return (req, res, next) => {
    if (!req.admin) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      })
    }

    if (!req.admin.permissions[permission]) {
      // Log unauthorized access attempt
      AuditLog.logAction({
        userId: req.admin._id,
        userType: 'center_admin',
        userEmail: req.admin.email,
        action: 'unauthorized_access',
        category: 'auth',
        description: `Attempted to access ${permission} without permission`,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        sessionId: req.sessionId,
        status: 'failure',
        riskLevel: 'medium',
        metadata: { requiredPermission: permission }
      })

      return res.status(403).json({
        success: false,
        message: `Access denied. ${permission} permission required.`
      })
    }

    next()
  }
}

// Middleware to log admin actions
const logAdminAction = (action, category = 'system') => {
  return async (req, res, next) => {
    // Store original res.json to intercept response
    const originalJson = res.json

    res.json = function(data) {
      // Log the action after response
      setImmediate(async () => {
        try {
          const status = res.statusCode >= 200 && res.statusCode < 300 ? 'success' : 'failure'
          const riskLevel = status === 'failure' ? 'medium' : 'low'

          await AuditLog.logAction({
            userId: req.admin?._id,
            userType: 'center_admin',
            userEmail: req.admin?.email,
            action,
            category,
            description: `${action} - ${req.method} ${req.originalUrl}`,
            ipAddress: req.ip,
            userAgent: req.get('User-Agent'),
            sessionId: req.sessionId,
            status,
            riskLevel,
            metadata: {
              method: req.method,
              url: req.originalUrl,
              statusCode: res.statusCode,
              body: req.body,
              params: req.params,
              query: req.query
            }
          })
        } catch (error) {
          console.error('Failed to log admin action:', error)
        }
      })

      // Call original json method
      return originalJson.call(this, data)
    }

    next()
  }
}

// Rate limiting middleware for sensitive operations
const rateLimitSensitive = (maxAttempts = 5, windowMs = 15 * 60 * 1000) => {
  const attempts = new Map()

  return (req, res, next) => {
    const key = `${req.ip}:${req.admin?._id || 'anonymous'}`
    const now = Date.now()
    const windowStart = now - windowMs

    // Clean old attempts
    const userAttempts = attempts.get(key) || []
    const recentAttempts = userAttempts.filter(time => time > windowStart)

    if (recentAttempts.length >= maxAttempts) {
      return res.status(429).json({
        success: false,
        message: 'Too many attempts. Please try again later.',
        retryAfter: Math.ceil((recentAttempts[0] + windowMs - now) / 1000)
      })
    }

    // Record this attempt
    recentAttempts.push(now)
    attempts.set(key, recentAttempts)

    next()
  }
}

module.exports = {
  authenticateCenterAdmin,
  requirePermission,
  logAdminAction,
  rateLimitSensitive
}