const jwt = require('jsonwebtoken')
const SuperAdmin = require('../models/SuperAdmin')

// Simplified middleware to authenticate super admin
const authenticateSuperAdmin = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '')
    
    console.log('🔐 Super Admin Auth - Token received:', token ? `${token.substring(0, 30)}...` : 'NO TOKEN')
    
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
      console.log('🔐 Super Admin Auth - Decoded token:', { 
        adminId: decoded.adminId, 
        email: decoded.email, 
        role: decoded.role,
        sessionId: decoded.sessionId 
      })
    } catch (error) {
      console.log('🔐 Super Admin Auth - JWT verify error:', error.message)
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      })
    }

    // Check if token is for super admin
    if (decoded.role !== 'superadmin') {
      console.log('🔐 Super Admin Auth - Role mismatch:', decoded.role, '!== superadmin')
      return res.status(403).json({
        success: false,
        message: 'Access denied. Super admin role required.'
      })
    }

    // Find admin
    const admin = await SuperAdmin.findById(decoded.adminId)
    console.log('🔐 Super Admin Auth - Admin found:', admin ? { id: admin._id, email: admin.email, role: admin.role, isActive: admin.isActive } : 'NOT FOUND')
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

    // Attach admin info to request
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

module.exports = {
  authenticateSuperAdmin
}
