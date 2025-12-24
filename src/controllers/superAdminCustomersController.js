const User = require('../models/User');
const Order = require('../models/Order');

// Get all customers with pagination and filters
exports.getCustomers = async (req, res) => {
  try {
    const { page = 1, limit = 10, search, status } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Build query - only customers
    const query = { role: 'customer' };

    // Status filter
    if (status === 'active') {
      query.isActive = true;
    } else if (status === 'inactive') {
      query.isActive = false;
    } else if (status === 'vip') {
      query.isVIP = true;
    }

    // Search filter
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ];
    }

    // Get customers and stats in parallel
    const [customers, total, statsResult] = await Promise.all([
      User.find(query)
        .select('name email phone isActive isVIP createdAt')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      User.countDocuments(query),
      // Get overall stats (not filtered by status/search)
      User.aggregate([
        { $match: { role: 'customer' } },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            active: { $sum: { $cond: [{ $ne: ['$isActive', false] }, 1, 0] } },
            inactive: { $sum: { $cond: [{ $eq: ['$isActive', false] }, 1, 0] } },
            vip: { $sum: { $cond: [{ $eq: ['$isVIP', true] }, 1, 0] } }
          }
        }
      ])
    ]);

    // Get order stats for each customer
    const customerIds = customers.map(c => c._id);
    const orderStats = await Order.aggregate([
      { $match: { customer: { $in: customerIds } } },
      {
        $group: {
          _id: '$customer',
          totalOrders: { $sum: 1 },
          totalSpent: { $sum: '$totalAmount' },
          lastOrderDate: { $max: '$createdAt' }
        }
      }
    ]);

    // Create a map for quick lookup
    const statsMap = {};
    orderStats.forEach(stat => {
      statsMap[stat._id.toString()] = stat;
    });

    // Transform customers with stats
    const transformedCustomers = customers.map(customer => {
      const stats = statsMap[customer._id.toString()] || {};
      return {
        _id: customer._id,
        name: customer.name,
        email: customer.email,
        phone: customer.phone || '',
        isActive: customer.isActive !== false,
        isVIP: customer.isVIP || false,
        totalOrders: stats.totalOrders || 0,
        totalSpent: stats.totalSpent || 0,
        lastOrderDate: stats.lastOrderDate || null,
        createdAt: customer.createdAt
      };
    });

    // Extract stats from aggregation result
    const overallStats = statsResult[0] || { total: 0, active: 0, inactive: 0, vip: 0 };

    res.json({
      success: true,
      data: {
        customers: transformedCustomers,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / parseInt(limit))
        },
        stats: {
          total: overallStats.total,
          active: overallStats.active,
          inactive: overallStats.inactive,
          vip: overallStats.vip
        }
      }
    });
  } catch (error) {
    console.error('Get customers error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch customers' });
  }
};

// Get customer by ID
exports.getCustomerById = async (req, res) => {
  try {
    const { customerId } = req.params;

    const customer = await User.findOne({ _id: customerId, role: 'customer' })
      .select('-password')
      .lean();

    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    // Get order stats
    const orderStats = await Order.aggregate([
      { $match: { customer: customer._id } },
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          totalSpent: { $sum: '$totalAmount' },
          lastOrderDate: { $max: '$createdAt' }
        }
      }
    ]);

    const stats = orderStats[0] || { totalOrders: 0, totalSpent: 0, lastOrderDate: null };

    res.json({
      success: true,
      data: {
        customer: {
          ...customer,
          totalOrders: stats.totalOrders,
          totalSpent: stats.totalSpent,
          lastOrderDate: stats.lastOrderDate
        }
      }
    });
  } catch (error) {
    console.error('Get customer error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch customer' });
  }
};

// Update customer status
exports.updateCustomerStatus = async (req, res) => {
  try {
    const { customerId } = req.params;
    const { isActive } = req.body;

    const customer = await User.findOneAndUpdate(
      { _id: customerId, role: 'customer' },
      { isActive },
      { new: true }
    ).select('-password');

    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    res.json({
      success: true,
      message: `Customer ${isActive ? 'activated' : 'deactivated'} successfully`,
      data: { customer }
    });
  } catch (error) {
    console.error('Update customer status error:', error);
    res.status(500).json({ success: false, message: 'Failed to update customer status' });
  }
};

// Get customer orders
exports.getCustomerOrders = async (req, res) => {
  try {
    const { customerId } = req.params;
    const { page = 1, limit = 10 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [orders, total] = await Promise.all([
      Order.find({ customer: customerId })
        .select('orderNumber status totalAmount createdAt paymentStatus')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Order.countDocuments({ customer: customerId })
    ]);

    res.json({
      success: true,
      data: {
        orders,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    console.error('Get customer orders error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch customer orders' });
  }
};
