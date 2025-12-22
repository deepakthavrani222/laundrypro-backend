require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./src/models/User');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/laundry-app';

async function setupSupportAgent() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    const email = 'support@laundrypro.com';
    const password = 'Support@123456';
    
    // Check if support agent already exists
    const existingUser = await User.findOne({ email });
    
    if (existingUser) {
      console.log('Support agent already exists!');
      console.log('Email:', email);
      console.log('Password:', password);
      console.log('Role:', existingUser.role);
      
      // Update role if needed
      if (existingUser.role !== 'support_agent') {
        existingUser.role = 'support_agent';
        await existingUser.save();
        console.log('Role updated to support_agent');
      }
    } else {
      // Create new support agent
      const hashedPassword = await bcrypt.hash(password, 10);
      
      const supportAgent = new User({
        name: 'Support Agent',
        email: email,
        phone: '9876543212',
        password: hashedPassword,
        role: 'support_agent',
        isEmailVerified: true,
        isActive: true
      });

      await supportAgent.save();
      console.log('\n✅ Support Agent created successfully!');
      console.log('=====================================');
      console.log('Email:', email);
      console.log('Password:', password);
      console.log('Role: support_agent');
      console.log('Login URL: http://localhost:3002/auth/login');
      console.log('=====================================\n');
    }

    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

setupSupportAgent();
