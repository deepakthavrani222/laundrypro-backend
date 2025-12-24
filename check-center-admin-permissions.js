const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const User = require('./src/models/User');
  const centerAdmins = await User.find({ role: 'center_admin' });
  
  console.log('Found', centerAdmins.length, 'Center Admin(s):\n');
  
  for (const admin of centerAdmins) {
    console.log('Email:', admin.email);
    console.log('Name:', admin.name);
    console.log('Permissions:', JSON.stringify(admin.permissions, null, 2));
    console.log('---');
  }
  
  process.exit(0);
}).catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
