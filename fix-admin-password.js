require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

async function fixAdminPassword() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const hashedPassword = await bcrypt.hash('Admin@123456', 10);
    
    const result = await mongoose.connection.collection('users').updateOne(
      { email: 'admin@laundrypro.com' },
      { $set: { password: hashedPassword } }
    );
    
    console.log('Password updated:', result.modifiedCount > 0 ? 'Success' : 'No change');
    console.log('\nLogin credentials:');
    console.log('Email: admin@laundrypro.com');
    console.log('Password: Admin@123456');
    console.log('URL: http://localhost:3000/auth/login');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

fixAdminPassword();
