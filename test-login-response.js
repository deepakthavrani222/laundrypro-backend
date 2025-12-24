const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const User = require('./src/models/User');
  
  // Find center admin with password
  const user = await User.findOne({ email: 'd@gmail.com' }).select('+password');
  
  console.log('User found:', user.email);
  console.log('Role:', user.role);
  console.log('Permissions object exists:', !!user.permissions);
  console.log('Permissions keys:', Object.keys(user.permissions || {}));
  console.log('\nFull permissions:');
  console.log(JSON.stringify(user.permissions, null, 2));
  
  process.exit(0);
}).catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
