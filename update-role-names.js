const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/laundry-app';

async function updateRoleNames() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    const db = mongoose.connection.db;
    
    // Update Role collection - change "Branch Manager" to "Center Admin"
    const roleResult = await db.collection('roles').updateMany(
      { displayName: 'Branch Manager' },
      { $set: { displayName: 'Center Admin' } }
    );
    console.log(`Updated ${roleResult.modifiedCount} roles with displayName "Branch Manager" -> "Center Admin"`);

    // Also update name field if it's "branch_manager" to show properly
    const roleResult2 = await db.collection('roles').updateMany(
      { name: 'branch_manager' },
      { $set: { displayName: 'Center Admin' } }
    );
    console.log(`Updated ${roleResult2.modifiedCount} roles with name "branch_manager" to have displayName "Center Admin"`);

    console.log('\n✅ Role names updated successfully!');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

updateRoleNames();
