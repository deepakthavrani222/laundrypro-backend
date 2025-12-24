const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const User = require('./src/models/User');
  
  // Hash the password
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash('Deep2025!', salt);
  
  // Update user
  const result = await User.updateOne(
    { email: 'newa29549@gmail.com' },
    { $set: { password: hashedPassword, isVerified: true } }
  );
  
  console.log('Update result:', result);
  
  // Verify
  const user = await User.findOne({ email: 'newa29549@gmail.com' }).select('+password');
  const isMatch = await user.comparePassword('Deep2025!');
  console.log('Password match after reset:', isMatch);
  
  process.exit(0);
}).catch(err => { console.error(err); process.exit(1); });
