const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const User = require('./src/models/User');
  const Branch = require('./src/models/Branch');
  
  // Get first branch
  const branch = await Branch.findOne();
  
  // Update user role to center_admin and assign branch
  const user = await User.findOneAndUpdate(
    { email: 'd@gmail.com' },
    { 
      role: 'center_admin',
      assignedBranch: branch?._id || null
    },
    { new: true }
  ).select('name email role assignedBranch isActive');
  
  console.log('User updated:', JSON.stringify(user, null, 2));
  if (branch) {
    console.log('Assigned to branch:', branch.name);
  }
  process.exit(0);
}).catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
