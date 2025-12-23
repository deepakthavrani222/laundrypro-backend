const jwt = require('jsonwebtoken')
const CenterAdmin = require('../models/CenterAdmin')

// Simplified middleware to authenticate center admin
const authenticateCenterAdmin = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '')
    
    console.log('🔐 Center Admin Auth - Token received:', token ? `${token.substring(0, 30)}...` : 'NO TOKEN')
    
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
      console.log('🔐 Center Admin Auth - Decoded token:', { 
        adminId: decoded.adminId, 
        email: decoded.email, 
        role: decoded.role,
        sessionId: decoded.sessionId 
      })
    } catch (error) {
      console.log('🔐 Center Admin Auth - JWT verify error:', error.message)
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      })
    }

    // Check if token is for center admin
    if (decoded.role !== 'center_admin') {
      console.log('🔐 Center Admin Auth - Role mismatch:', decoded.role, '!== center_admin')
      return res.status(403).json({
        success: false,
        message: 'Access denied. Center admin role required.'
      })
    }

    // Find admin
    const admin = await CenterAdmin.findById(decoded.adminId)
    console.log('🔐 Center Admin Auth - Admin found:', admin ? { id: admin._id, email: admin.email, role: admin.role, isActive: admin.isActive } : 'NOT FOUND')
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
  authenticateCenterAdmin
}