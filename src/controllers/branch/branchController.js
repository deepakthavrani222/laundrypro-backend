const Order = require('../../models/Order');
const User = require('../../models/User');
const Branch = require('../../models/Branch');
const OrderService = require('../../services/orderService');
const { 
  sendSuccess, 
  sendError, 
  asyncHandler,
  getPagination,
  formatPaginationResponse
} = require('../../utils/helpers');

// @desc    Get branch dashboard data
// @route   GET /api/branch/dashboard
// @access  Private (Branch Manager)
const getDashboard = asyncHandler(async (req, res) => {
  const user = req.user;
  
  // Get the branch assigned to this manager
  const branch = await Branch.findOne({ manager: user._id });
  if (!branch) {
    return sendError(res, 'NO_BRANCH', 'No branch assigned to this manager', 404);
  }

  const today = new Date();
  const startOfDay = new Date(today.setHours(0, 0, 0, 0));
  const endOfDay = new Date(today.setHours(23, 59, 59, 999));
  const startOfWeek = new Date(today.setDate(today.getDate() - 7));

  // Get dashboard metrics
  const [
    todayOrders,
    pendingOrders,
    processingOrders,
    readyOrders,
    completedToday,
    weeklyOrders,
    todayRevenue,
    staffCount,
    activeStaff
  ] = await Promise.all([
    Order.countDocuments({ branch: branch._id, createdAt: { $gte: startOfDay } }),
    Order.countDocuments({ branch: branch._id, status: { $in: ['assigned_to_branch', 'picked'] } }),
    Order.countDocuments({ branch: branch._id, status: 'in_process' }),
    Order.countDocuments({ branch: branch._id, status: 'ready' }),
    Order.countDocuments({ branch: branch._id, status: 'delivered', updatedAt: { $gte: startOfDay } }),
    Order.countDocuments({ branch: branch._id, createdAt: { $gte: startOfWeek } }),
    Order.aggregate([
      { $match: { branch: branch._id, createdAt: { $gte: startOfDay } } },
      { $group: { _id: null, total: { $sum: '$pricing.total' } } }
    ]),
    User.countDocuments({ assignedBranch: branch._id, role: { $in: ['staff', 'branch_manager'] } }),
    User.countDocuments({ assignedBranch: branch._id, role: { $in: ['staff', 'branch_manager'] }, isActive: true })
  ]);

  // Get recent orders
  const recentOrders = await Order.find({ branch: branch._id })
    .populate('customer', 'name phone')
    .sort({ createdAt: -1 })
    .limit(10)
    .select('orderNumber status pricing createdAt isExpress items')
    .lean();

  // Get staff performance
  const staffPerformance = await Order.aggregate([
    { $match: { branch: branch._id, createdAt: { $gte: startOfDay } } },
    { $unwind: { path: '$assignedStaff', preserveNullAndEmptyArrays: false } },
    { $group: { _id: '$assignedStaff.staff', ordersProcessed: { $sum: 1 } } },
    { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'staff' } },
    { $unwind: { path: '$staff', preserveNullAndEmptyArrays: true } },
    { $project: { name: '$staff.name', role: '$staff.role', ordersProcessed: 1 } },
    { $sort: { ordersProcessed: -1 } },
    { $limit: 5 }
  ]);

  // Get alerts
  const alerts = [];
  
  // Check for express orders
  const expressOrders = await Order.countDocuments({ 
    branch: branch._id, 
    isExpress: true, 
    status: { $nin: ['delivered', 'cancelled'] } 
  });
  if (expressOrders > 0) {
    alerts.push({ type: 'warning', title: `${expressOrders} Express Orders`, message: 'Require priority processing' });
  }

  // Check pending orders
  if (pendingOrders > 10) {
    alerts.push({ type: 'alert', title: 'High Pending Orders', message: `${pendingOrders} orders awaiting processing` });
  }

  sendSuccess(res, {
    branch: { _id: branch._id, name: branch.name, code: branch.code },
    metrics: {
      todayOrders,
      pendingOrders,
      processingOrders,
      readyOrders,
      completedToday,
      weeklyOrders,
      todayRevenue: todayRevenue[0]?.total || 0,
      staffCount,
      activeStaff
    },
    recentOrders: recentOrders.map(order => ({
      _id: order._id,
      orderNumber: order.orderNumber,
      status: order.status,
      amount: order.pricing?.total || 0,
      itemCount: order.items?.length || 0,
      isExpress: order.isExpress,
      createdAt: order.createdAt,
      customer: order.customer
    })),
    staffPerformance,
    alerts
  }, 'Dashboard data retrieved successfully');
});

// @desc    Get branch orders
// @route   GET /api/branch/orders
// @access  Private (Branch Manager)
const getOrders = asyncHandler(async (req, res) => {
  const user = req.user;
  const { page = 1, limit = 20, status, search, priority } = req.query;
  
  const branch = await Branch.findOne({ manager: user._id });
  if (!branch) {
    return sendError(res, 'NO_BRANCH', 'No branch assigned to this manager', 404);
  }

  const { skip, limit: limitNum, page: pageNum } = getPagination(page, limit);
  
  const query = { branch: branch._id };
  
  if (status && status !== 'all') query.status = status;
  if (priority === 'high') query.isExpress = true;
  
  if (search) {
    query.$or = [
      { orderNumber: { $regex: search, $options: 'i' } }
    ];
  }

  const total = await Order.countDocuments(query);
  const orders = await Order.find(query)
    .populate('customer', 'name phone email isVIP')
    .populate('items')
    .sort({ isExpress: -1, createdAt: -1 })
    .skip(skip)
    .limit(limitNum)
    .lean();

  // Transform items for better display
  const transformedOrders = orders.map(order => ({
    ...order,
    items: (order.items || []).map((item) => ({
      _id: item._id,
      name: item.itemType || item.service || 'Item',
      serviceType: item.service,
      category: item.category,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      totalPrice: item.totalPrice
    }))
  }));

  const response = formatPaginationResponse(transformedOrders, total, pageNum, limitNum);
  sendSuccess(res, response, 'Orders retrieved successfully');
});

// @desc    Update order status (branch level)
// @route   PUT /api/branch/orders/:orderId/status
// @access  Private (Branch Manager)
const updateOrderStatus = asyncHandler(async (req, res) => {
  const user = req.user;
  const { orderId } = req.params;
  const { status, notes } = req.body;

  const branch = await Branch.findOne({ manager: user._id });
  if (!branch) {
    return sendError(res, 'NO_BRANCH', 'No branch assigned', 404);
  }

  const order = await Order.findOne({ _id: orderId, branch: branch._id });
  if (!order) {
    return sendError(res, 'ORDER_NOT_FOUND', 'Order not found in your branch', 404);
  }

  // Valid status transitions for branch
  const validTransitions = {
    'assigned_to_branch': ['in_process'],
    'picked': ['in_process'],
    'in_process': ['ready'],
    'ready': ['out_for_delivery']
  };

  if (!validTransitions[order.status]?.includes(status)) {
    return sendError(res, 'INVALID_TRANSITION', `Cannot change status from ${order.status} to ${status}`, 400);
  }

  // Use OrderService to update status and send notifications
  await OrderService.updateOrderStatus(orderId, status, user._id, notes || 'Status updated by branch manager');

  const updatedOrder = await Order.findById(orderId)
    .populate('customer', 'name phone')
    .populate('branch', 'name code');

  sendSuccess(res, { order: updatedOrder }, 'Order status updated successfully');
});

// @desc    Assign staff to order
// @route   PUT /api/branch/orders/:orderId/assign
// @access  Private (Branch Manager)
const assignStaffToOrder = asyncHandler(async (req, res) => {
  const user = req.user;
  const { orderId } = req.params;
  const { staffId, estimatedTime } = req.body;

  const branch = await Branch.findOne({ manager: user._id });
  if (!branch) {
    return sendError(res, 'NO_BRANCH', 'No branch assigned', 404);
  }

  const order = await Order.findOne({ _id: orderId, branch: branch._id });
  if (!order) {
    return sendError(res, 'ORDER_NOT_FOUND', 'Order not found in your branch', 404);
  }

  const staff = await User.findOne({ _id: staffId, assignedBranch: branch._id, isActive: true });
  if (!staff) {
    return sendError(res, 'STAFF_NOT_FOUND', 'Staff member not found or not active', 404);
  }

  // Add to assignedStaff array
  if (!order.assignedStaff) order.assignedStaff = [];
  order.assignedStaff.push({
    staff: staffId,
    assignedAt: new Date()
  });
  
  if (estimatedTime) {
    order.estimatedDeliveryDate = new Date(estimatedTime);
  }
  
  if (order.status === 'assigned_to_branch' || order.status === 'picked') {
    order.status = 'in_process';
  }
  
  if (!order.statusHistory) order.statusHistory = [];
  order.statusHistory.push({
    status: order.status,
    updatedBy: user._id,
    updatedAt: new Date(),
    notes: `Assigned to ${staff.name}`
  });

  await order.save();

  const updatedOrder = await Order.findById(orderId)
    .populate('customer', 'name phone');

  sendSuccess(res, { order: updatedOrder }, 'Staff assigned successfully');
});

// @desc    Get branch staff
// @route   GET /api/branch/staff
// @access  Private (Branch Manager)
const getStaff = asyncHandler(async (req, res) => {
  const user = req.user;
  
  const branch = await Branch.findOne({ manager: user._id });
  if (!branch) {
    return sendError(res, 'NO_BRANCH', 'No branch assigned', 404);
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const staff = await User.find({ 
    assignedBranch: branch._id,
    role: { $in: ['staff', 'branch_manager'] }
  }).select('-password').lean();

  // Get today's order count for each staff
  const staffWithStats = await Promise.all(
    staff.map(async (member) => {
      const ordersToday = await Order.countDocuments({
        'assignedStaff.staff': member._id,
        updatedAt: { $gte: today }
      });
      const totalOrders = await Order.countDocuments({ 'assignedStaff.staff': member._id });
      
      return {
        ...member,
        stats: {
          ordersToday,
          totalOrders,
          efficiency: Math.min(100, Math.round((ordersToday / 10) * 100)) // Simple efficiency calc
        }
      };
    })
  );

  sendSuccess(res, { staff: staffWithStats, branch: { name: branch.name, code: branch.code } }, 'Staff retrieved successfully');
});

// @desc    Toggle staff availability
// @route   PATCH /api/branch/staff/:staffId/availability
// @access  Private (Branch Manager)
const toggleStaffAvailability = asyncHandler(async (req, res) => {
  const user = req.user;
  const { staffId } = req.params;

  const branch = await Branch.findOne({ manager: user._id });
  if (!branch) {
    return sendError(res, 'NO_BRANCH', 'No branch assigned', 404);
  }

  const staff = await User.findOne({ _id: staffId, assignedBranch: branch._id });
  if (!staff) {
    return sendError(res, 'STAFF_NOT_FOUND', 'Staff not found in your branch', 404);
  }

  staff.isActive = !staff.isActive;
  await staff.save();

  sendSuccess(res, { 
    staff: { _id: staff._id, name: staff.name, isActive: staff.isActive } 
  }, `Staff ${staff.isActive ? 'activated' : 'deactivated'} successfully`);
});

// @desc    Get branch analytics
// @route   GET /api/branch/analytics
// @access  Private (Branch Manager)
const getAnalytics = asyncHandler(async (req, res) => {
  const user = req.user;
  const { timeframe = '7d' } = req.query;

  const branch = await Branch.findOne({ manager: user._id });
  if (!branch) {
    return sendError(res, 'NO_BRANCH', 'No branch assigned', 404);
  }

  const now = new Date();
  let startDate;
  switch (timeframe) {
    case '24h': startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000); break;
    case '7d': startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); break;
    case '30d': startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); break;
    default: startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  }

  // Daily stats
  const dailyStats = await Order.aggregate([
    { $match: { branch: branch._id, createdAt: { $gte: startDate } } },
    { $group: {
      _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' }, day: { $dayOfMonth: '$createdAt' } },
      orders: { $sum: 1 },
      revenue: { $sum: '$pricing.total' }
    }},
    { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
  ]);

  // Service breakdown
  const serviceStats = await Order.aggregate([
    { $match: { branch: branch._id, createdAt: { $gte: startDate } } },
    { $unwind: '$items' },
    { $group: { _id: '$items.serviceType', count: { $sum: 1 }, revenue: { $sum: '$items.totalPrice' } } },
    { $sort: { count: -1 } }
  ]);

  // Status distribution
  const statusDistribution = await Order.aggregate([
    { $match: { branch: branch._id, createdAt: { $gte: startDate } } },
    { $group: { _id: '$status', count: { $sum: 1 } } }
  ]);

  // Staff performance
  const staffPerformance = await Order.aggregate([
    { $match: { branch: branch._id, createdAt: { $gte: startDate }, 'assignedStaff.0': { $exists: true } } },
    { $unwind: '$assignedStaff' },
    { $group: { _id: '$assignedStaff.staff', ordersProcessed: { $sum: 1 }, revenue: { $sum: '$pricing.total' } } },
    { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'staff' } },
    { $unwind: '$staff' },
    { $project: { name: '$staff.name', ordersProcessed: 1, revenue: 1 } },
    { $sort: { ordersProcessed: -1 } }
  ]);

  // Totals
  const totals = await Order.aggregate([
    { $match: { branch: branch._id, createdAt: { $gte: startDate } } },
    { $group: { _id: null, totalOrders: { $sum: 1 }, totalRevenue: { $sum: '$pricing.total' }, avgOrderValue: { $avg: '$pricing.total' } } }
  ]);

  sendSuccess(res, {
    branch: { name: branch.name, code: branch.code },
    timeframe,
    totals: totals[0] || { totalOrders: 0, totalRevenue: 0, avgOrderValue: 0 },
    dailyStats,
    serviceStats,
    statusDistribution,
    staffPerformance
  }, 'Analytics retrieved successfully');
});

// @desc    Get branch settings
// @route   GET /api/branch/settings
// @access  Private (Branch Manager)
const getSettings = asyncHandler(async (req, res) => {
  const user = req.user;

  const branch = await Branch.findOne({ manager: user._id });
  if (!branch) {
    return sendError(res, 'NO_BRANCH', 'No branch assigned', 404);
  }

  sendSuccess(res, {
    branch: {
      _id: branch._id,
      name: branch.name,
      code: branch.code,
      address: branch.address,
      contact: branch.contact,
      operatingHours: branch.operatingHours || { open: '09:00', close: '21:00' },
      capacity: branch.capacity,
      isActive: branch.isActive,
      settings: branch.settings || {
        acceptExpressOrders: true,
        peakHourSurcharge: 0,
        holidayClosures: []
      }
    }
  }, 'Settings retrieved successfully');
});

// @desc    Update branch settings
// @route   PUT /api/branch/settings
// @access  Private (Branch Manager)
const updateSettings = asyncHandler(async (req, res) => {
  const user = req.user;
  const { operatingHours, settings } = req.body;

  const branch = await Branch.findOne({ manager: user._id });
  if (!branch) {
    return sendError(res, 'NO_BRANCH', 'No branch assigned', 404);
  }

  if (operatingHours) branch.operatingHours = operatingHours;
  if (settings) branch.settings = { ...branch.settings, ...settings };
  
  await branch.save();

  sendSuccess(res, { branch }, 'Settings updated successfully');
});

module.exports = {
  getDashboard,
  getOrders,
  updateOrderStatus,
  assignStaffToOrder,
  getStaff,
  toggleStaffAvailability,
  getAnalytics,
  getSettings,
  updateSettings
};


// ==================== INVENTORY MANAGEMENT ====================

const Inventory = require('../../models/Inventory');
const { INVENTORY_ITEMS } = require('../../config/constants');

// @desc    Get branch inventory
// @route   GET /api/branch/inventory
// @access  Private (Branch Manager)
const getInventory = asyncHandler(async (req, res) => {
  const user = req.user;

  const branch = await Branch.findOne({ manager: user._id });
  if (!branch) {
    return sendError(res, 'NO_BRANCH', 'No branch assigned', 404);
  }

  const inventory = await Inventory.find({ branch: branch._id })
    .sort({ isLowStock: -1, itemName: 1 })
    .lean();

  // Calculate stats
  const stats = {
    totalItems: inventory.length,
    lowStockItems: inventory.filter(i => i.isLowStock).length,
    expiredItems: inventory.filter(i => i.isExpired).length,
    totalValue: inventory.reduce((sum, i) => sum + (i.currentStock * (i.unitCost || 0)), 0)
  };

  sendSuccess(res, { 
    inventory, 
    stats,
    branch: { name: branch.name, code: branch.code }
  }, 'Inventory retrieved successfully');
});

// @desc    Add/Update inventory item
// @route   POST /api/branch/inventory
// @access  Private (Branch Manager)
const addInventoryItem = asyncHandler(async (req, res) => {
  const user = req.user;
  const { itemName, currentStock, minThreshold, maxCapacity, unit, unitCost, supplier, expiryDate } = req.body;

  const branch = await Branch.findOne({ manager: user._id });
  if (!branch) {
    return sendError(res, 'NO_BRANCH', 'No branch assigned', 404);
  }

  // Check if item already exists
  let item = await Inventory.findOne({ branch: branch._id, itemName });

  if (item) {
    // Update existing
    item.currentStock = currentStock;
    item.minThreshold = minThreshold || item.minThreshold;
    item.maxCapacity = maxCapacity || item.maxCapacity;
    item.unit = unit || item.unit;
    item.unitCost = unitCost || item.unitCost;
    item.supplier = supplier || item.supplier;
    item.expiryDate = expiryDate || item.expiryDate;
    item.lastRestocked = new Date();
  } else {
    // Create new
    item = new Inventory({
      branch: branch._id,
      itemName,
      currentStock,
      minThreshold: minThreshold || 10,
      maxCapacity: maxCapacity || 100,
      unit: unit || 'units',
      unitCost: unitCost || 0,
      supplier,
      expiryDate
    });
  }

  await item.save();

  sendSuccess(res, { item }, item.isNew ? 'Inventory item added' : 'Inventory item updated');
});

// @desc    Update inventory stock
// @route   PUT /api/branch/inventory/:itemId/stock
// @access  Private (Branch Manager)
const updateInventoryStock = asyncHandler(async (req, res) => {
  const user = req.user;
  const { itemId } = req.params;
  const { quantity, action, reason } = req.body; // action: 'add' or 'consume'

  const branch = await Branch.findOne({ manager: user._id });
  if (!branch) {
    return sendError(res, 'NO_BRANCH', 'No branch assigned', 404);
  }

  const item = await Inventory.findOne({ _id: itemId, branch: branch._id });
  if (!item) {
    return sendError(res, 'ITEM_NOT_FOUND', 'Inventory item not found', 404);
  }

  if (action === 'add') {
    item.addStock(quantity, reason || 'manual_restock');
  } else if (action === 'consume') {
    if (item.currentStock < quantity) {
      return sendError(res, 'INSUFFICIENT_STOCK', 'Not enough stock available', 400);
    }
    item.consumeStock(quantity, null, reason || 'manual_consumption');
  } else {
    return sendError(res, 'INVALID_ACTION', 'Action must be "add" or "consume"', 400);
  }

  await item.save();

  sendSuccess(res, { item }, 'Stock updated successfully');
});

// @desc    Delete inventory item
// @route   DELETE /api/branch/inventory/:itemId
// @access  Private (Branch Manager)
const deleteInventoryItem = asyncHandler(async (req, res) => {
  const user = req.user;
  const { itemId } = req.params;

  const branch = await Branch.findOne({ manager: user._id });
  if (!branch) {
    return sendError(res, 'NO_BRANCH', 'No branch assigned', 404);
  }

  const item = await Inventory.findOneAndDelete({ _id: itemId, branch: branch._id });
  if (!item) {
    return sendError(res, 'ITEM_NOT_FOUND', 'Inventory item not found', 404);
  }

  sendSuccess(res, null, 'Inventory item deleted');
});

// Export new functions
module.exports.getInventory = getInventory;
module.exports.addInventoryItem = addInventoryItem;
module.exports.updateInventoryStock = updateInventoryStock;
module.exports.deleteInventoryItem = deleteInventoryItem;
