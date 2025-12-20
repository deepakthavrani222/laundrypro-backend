const CenterAdmin = require('../models/CenterAdmin')
const AuditLog = require('../models/AuditLog')
const sessionService = require('../services/sessionService')
const jwt = require('jsonwebtoken')
const { validationResult } = require('express-validator')

class CenterAdminAuthController {
  // Login - Simplified version
  async login(req, res) {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        })
      }

      const { email, password } = req.body

      // Find admin by email
      const admin = await CenterAdmin.findOne({ email })
      if (!admin) {
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials'
        })
      }

      // Check if admin is active
      if (!admin.isActive) {
        return res.status(403).json({
          success: false,
          message: 'Account is deactivated'
        })
      }

      // Check password
      const isValidPassword = await admin.comparePassword(password)
      if (!isValidPassword) {
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials'
        })
      }

      // Create session
      const sessionResult = await sessionService.createSession(admin, req)
      
      // Generate JWT token with real session ID
      const token = jwt.sign(
        {
          adminId: admin._id,
          email: admin.email,
          role: admin.role,
          sessionId: sessionResult.sessionId
        },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      )

      // Update last login
      admin.lastLogin = new Date()
      admin.lastLoginIP = req.ip || req.connection.remoteAddress || '127.0.0.1'
      await admin.save()

      // Log successful login
      try {
        await AuditLog.logAction({
          userId: admin._id,
          userType: 'center_admin',
          userEmail: admin.email,
          action: 'login',
          category: 'auth',
          description: 'Center admin login successful',
          ipAddress: req.ip || '127.0.0.1',
          userAgent: req.get('User-Agent') || 'Unknown',
          status: 'success',
          riskLevel: 'low',
          metadata: {
            loginMethod: 'password',
            mfaUsed: false
          }
        })
      } catch (logError) {
        console.error('Failed to log login:', logError)
        // Don't fail login if logging fails
      }

      return res.json({
        success: true,
        token,
        admin: {
          id: admin._id,
          name: admin.name,
          email: admin.email,
          role: admin.role,
          permissions: admin.permissions,
          avatar: admin.avatar,
          mfaEnabled: admin.mfa ? admin.mfa.isEnabled : false
        },
        message: 'Login successful'
      })

    } catch (error) {
      console.error('Login error:', error)
      return res.status(500).json({
        success: false,
        message: 'Internal server error'
      })
    }
  }

  // Logout - Simplified
  async logout(req, res) {
    try {
      // For simplified version, just return success
      // In full version, this would terminate sessions
      return res.json({
        success: true,
        message: 'Logged out successfully'
      })
    } catch (error) {
      console.error('Logout error:', error)
      return res.status(500).json({
        success: false,
        message: 'Internal server error'
      })
    }
  }

  // Get Profile
  async getProfile(req, res) {
    try {
      const admin = req.admin
      
      return res.json({
        success: true,
        admin: {
          id: admin._id,
          name: admin.name,
          email: admin.email,
          role: admin.role,
          permissions: admin.permissions,
          avatar: admin.avatar,
          mfaEnabled: admin.mfa ? admin.mfa.isEnabled : false,
          lastLogin: admin.lastLogin,
          createdAt: admin.createdAt
        }
      })
    } catch (error) {
      console.error('Get profile error:', error)
      return res.status(500).json({
        success: false,
        message: 'Internal server error'
      })
    }
  }

  // Verify MFA - Placeholder for future
  async verifyMFA(req, res) {
    return res.status(501).json({
      success: false,
      message: 'MFA not implemented in simplified version'
    })
  }

  // Logout All - Placeholder for future
  async logoutAll(req, res) {
    return res.json({
      success: true,
      message: 'Logged out from all devices'
    })
  }

  // Enable MFA - Placeholder for future
  async enableMFA(req, res) {
    return res.status(501).json({
      success: false,
      message: 'MFA not implemented in simplified version'
    })
  }

  // Disable MFA - Placeholder for future
  async disableMFA(req, res) {
    return res.status(501).json({
      success: false,
      message: 'MFA not implemented in simplified version'
    })
  }
}

module.exports = new CenterAdminAuthController()