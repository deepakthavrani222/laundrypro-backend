const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const Order = require('./src/models/Order');
  
  // Test the aggregation
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(endDate.getDate() - 30);
  
  const result = await Order.aggregate([
    {
      $match: {
        createdAt: { $gte: startDate, $lte: endDate },
        status: { $nin: ['cancelled'] }
      }
    },
    {
      $group: {
        _id: { $dateToString: { format: '%d %b', date: '$createdAt' } },
        dateSort: { $first: '$createdAt' },
        revenue: { $sum: '$pricing.total' }
      }
    },
    { $sort: { dateSort: 1 } },
    { $project: { _id: 1, revenue: 1 } },
    { $limit: 10 }
  ]);
  
  console.log('Revenue Trend:');
  result.forEach(r => console.log(r._id, ':', r.revenue));
  
  process.exit(0);
}).catch(err => { console.error(err); process.exit(1); });
