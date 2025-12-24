require('dotenv').config()
const mongoose = require('mongoose')
const SuperAdmin = require('./src/models/SuperAdmin')

async function fixSuperAdminPermissions() {
  try {
    await mongoose.connect(process.env.MONGODB_URI)
    console.log('Connected to MongoDB')

    // Find all superadmins
    const superAdmins = await SuperAdmin.find({})
    console.log(`Found ${superAdmins.length} superadmin(s)`)

    for (const admin of superAdmins) {
      console.log(`\nSuperAdmin: ${admin.email}`)
      console.log('Current permissions:', admin.permissions)

      // Check if permissions object exists
      if (!admin.permissions) {
        admin.permissions = {
          branches: true,
          users: true,
          orders: true,
          finances: true,
          analytics: true,
          settings: true
        }
        await admin.save()
        console.log('Created permissions object with all permissions enabled')
      } else {
        // Ensure all permissions are set to true
        let updated = false
        const requiredPermissions = ['branches', 'users', 'orders', 'finances', 'analytics', 'settings']
        
        for (const perm of requiredPermissions) {
          if (admin.permissions[perm] !== true) {
            admin.permissions[perm] = true
            updated = true
          }
        }

        if (updated) {
          await admin.save()
          console.log('Updated permissions:', admin.permissions)
        } else {
          console.log('All permissions already enabled')
        }
      }
    }

    console.log('\nDone!')
    process.exit(0)
  } catch (error) {
    console.error('Error:', error)
    process.exit(1)
  }
}

fixSuperAdminPermissions()
