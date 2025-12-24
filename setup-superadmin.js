const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')
require('dotenv').config()

// SuperAdmin Schema (inline for setup script)
const superAdminSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, default: 'superadmin' },
  mfa: {
    secret: { type: String },
    isEnabled: { type: Boolean, default: false },
    backupCodes: [{ type: String }],
    lastUsed: { type: Date }
  },
  sessions: [{
    sessionId: { type: String, required: true },
    ipAddress: { type: String, required: true },
    userAgent: { type: String, required: true },
    location: { type: String },
    isActive: { type: Boolean, default: true },
    lastActivity: { type: Date, default: Date.now },
    createdAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, required: true }
  }],
  loginAttempts: { type: Number, default: 0 },
  lockUntil: { type: Date },
  lastLogin: { type: Date },
  lastLoginIP: { type: String },
  permissions: {
    branches: { type: Boolean, default: true },
    users: { type: Boolean, default: true },
    orders: { type: Boolean, default: true },
    finances: { type: Boolean, default: true },
    analytics: { type: Boolean, default: true },
    settings: { type: Boolean, default: true }
  },
  phone: { type: String },
  avatar: { type: String },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { timestamps: true })

const SuperAdmin = mongoose.model('SuperAdmin', superAdminSchema)

async function setupSuperAdmin() {
  try {
    await mongoose.connect(process.env.MONGODB_URI)
    console.log('Connected to MongoDB')

    // Check if superadmin already exists
    const existingAdmin = await SuperAdmin.findOne({ email: 'superadmin@laundrypro.com' })
    
    if (existingAdmin) {
      console.log('Super Admin already exists!')
      console.log('Email:', existingAdmin.email)
      console.log('Role:', existingAdmin.role)
      
      // Update role if needed
      if (existingAdmin.role !== 'superadmin') {
        existingAdmin.role = 'superadmin'
        await existingAdmin.save()
        console.log('Updated role to superadmin')
      }
    } else {
      // Create new superadmin
      const hashedPassword = await bcrypt.hash('SuperAdmin@123', 12)
      
      const superAdmin = new SuperAdmin({
        name: 'Super Admin',
        email: 'superadmin@laundrypro.com',
        password: hashedPassword,
        role: 'superadmin',
        permissions: {
          branches: true,
          users: true,
          orders: true,
          finances: true,
          analytics: true,
          settings: true
        },
        isActive: true
      })

      await superAdmin.save()
      console.log('Super Admin created successfully!')
    }

    console.log('\n=== Super Admin Credentials ===')
    console.log('Email: superadmin@laundrypro.com')
    console.log('Password: SuperAdmin@123')
    console.log('Login URL: http://localhost:3000/superadmin/auth/login')
    console.log('================================\n')

  } catch (error) {
    console.error('Error:', error)
  } finally {
    await mongoose.disconnect()
    console.log('Disconnected from MongoDB')
  }
}

setupSuperAdmin()
