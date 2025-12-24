const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const Order = require('./src/models/Order');
  
  // Find orders from 26 Nov
  const startDate = new Date('2025-11-26T00:00:00');
  const endDate = new Date('2025-11-26T23:59:59');
  
  const orders = await Order.find({ createdAt: { $gte: startDate, $lte: endDate } });
  console.log('Orders on 26 Nov:', orders.length);
  orders.forEach(o => console.log('- Order:', o.orderNumber, '| Total:', o.pricing?.total));
  
  // Delete them
  const result = await Order.deleteMany({ createdAt: { $gte: startDate, $lte: endDate } });
  console.log('Deleted:', result.deletedCount, 'orders');
  
  process.exit(0);
}).catch(err => { console.error(err); process.exit(1); });
