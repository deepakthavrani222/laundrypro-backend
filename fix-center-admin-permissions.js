const mongoose = require('mongoose');
require('dotenv').config();

// Full Center Admin permissions
const fullCenterAdminPermissions = {
  orders: { view: true, create: true, update: true, delete: true, assign: true, cancel: true, process: true },
  staff: { view: true, create: true, update: true, delete: true, assignShift: true, manageAttendance: true },
  inventory: { view: true, create: true, update: true, delete: true, restock: true, writeOff: true },
  services: { view: true, create: true, update: true, delete: true, updatePricing: true },
  customers: { view: true, create: true, update: true, delete: true },
  performance: { view: true, create: true, update: true, delete: true, export: true },
  settings: { view: true, create: true, update: true, delete: true }
};

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const User = require('./src/models/User');
  
  // Update all center_admin users with full permissions
  const result = await User.updateMany(
    { role: 'center_admin' },
    { $set: { permissions: fullCenterAdminPermissions } }
  );
  
  console.log('Updated', result.modifiedCount, 'Center Admin(s) with full permissions');
  
  // Verify
  const centerAdmins = await User.find({ role: 'center_admin' });
  for (const admin of centerAdmins) {
    console.log('\nEmail:', admin.email);
    console.log('Has staff module:', !!admin.permissions?.staff);
    console.log('Has inventory module:', !!admin.permissions?.inventory);
    console.log('Has performance module:', !!admin.permissions?.performance);
  }
  
  process.exit(0);
}).catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
