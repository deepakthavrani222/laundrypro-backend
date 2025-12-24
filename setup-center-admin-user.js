require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

async function setupCenterAdmin() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Check if center admin exists in users collection
    const existingUser = await mongoose.connection.collection('users').findOne({
      email: 'centeradmin@laundrypro.com'
    });

    if (existingUser) {
      console.log('Center Admin already exists');
      console.log('Role:', existingUser.role);
    } else {
      // Create new center admin user
      const hashedPassword = await bcrypt.hash('CenterAdmin@123', 10);
      
      const centerAdmin = {
        name: 'Center Admin',
        email: 'centeradmin@laundrypro.com',
        phone: '9876543299',
        password: hashedPassword,
        role: 'center_admin',
        isActive: true,
        isEmailVerified: true,
        permissions: {
          orders: { view: true, create: true, update: true, delete: false },
          customers: { view: true, create: false, update: true, delete: false },
          staff: { view: true, create: true, update: true, delete: true },
          services: { view: true, create: false, update: true, delete: false },
          reports: { view: true },
          settings: { view: true, update: true }
        },
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await mongoose.connection.collection('users').insertOne(centerAdmin);
      console.log('Center Admin created successfully!');
    }

    console.log('\n=== Center Admin Credentials ===');
    console.log('Email: centeradmin@laundrypro.com');
    console.log('Password: CenterAdmin@123');
    console.log('URL: http://localhost:3000/auth/login');
    console.log('Dashboard: http://localhost:3000/center-admin/dashboard');
    console.log('================================\n');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

setupCenterAdmin();
