const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')
require('dotenv').config()

const userSchema = new mongoose.Schema({
  name: String,
  email: String,
  password: String,
  phone: String,
  role: String,
  isActive: { type: Boolean, default: true },
  isEmailVerified: { type: Boolean, default: true },
  permissions: Object,
  createdAt: { type: Date, default: Date.now }
})

const User = mongoose.model('User', userSchema)

async function setupSupportAgent() {
  try {
    await mongoose.connect(process.env.MONGODB_URI)
    console.log('Connected to MongoDB')

    // Check if support agent exists
    const existing = await User.findOne({ email: 'support@laundrypro.com' })
    
    if (existing) {
      console.log('Support agent already exists, updating password...')
      const hashedPassword = await bcrypt.hash('support123', 12)
      await User.updateOne(
        { email: 'support@laundrypro.com' },
        { 
          password: hashedPassword,
          isActive: true,
          isEmailVerified: true
        }
      )
      console.log('✅ Password updated!')
    } else {
      console.log('Creating new support agent...')
      const hashedPassword = await bcrypt.hash('support123', 12)
      
      await User.create({
        name: 'Support Agent',
        email: 'support@laundrypro.com',
        password: hashedPassword,
        phone: '9999999999',
        role: 'support_agent',
        isActive: true,
        isEmailVerified: true,
        permissions: {
          tickets: true,
          customers: true,
          orders: true
        }
      })
      console.log('✅ Support agent created!')
    }

    console.log('\n📧 Login Credentials:')
    console.log('Email: support@laundrypro.com')
    console.log('Password: support123')

  } catch (error) {
    console.error('Error:', error)
  } finally {
    await mongoose.disconnect()
    console.log('\nDisconnected from MongoDB')
  }
}

setupSupportAgent()
