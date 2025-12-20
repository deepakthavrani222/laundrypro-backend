const express = require('express');
const { protect, restrictTo } = require('../../middlewares/auth');
const {
  getDashboard,
  getOrders,
  updateOrderStatus,
  assignStaffToOrder,
  getStaff,
  toggleStaffAvailability,
  getAnalytics,
  getSettings,
  updateSettings,
  getInventory,
  addInventoryItem,
  updateInventoryStock,
  deleteInventoryItem
} = require('../../controllers/branch/branchController');

const router = express.Router();

// Apply authentication and role restriction
router.use(protect);
router.use(restrictTo('branch_manager', 'admin', 'center_admin'));

// Dashboard
router.get('/dashboard', getDashboard);

// Orders
router.get('/orders', getOrders);
router.put('/orders/:orderId/status', updateOrderStatus);
router.put('/orders/:orderId/assign', assignStaffToOrder);

// Staff
router.get('/staff', getStaff);
router.patch('/staff/:staffId/availability', toggleStaffAvailability);

// Inventory
router.get('/inventory', getInventory);
router.post('/inventory', addInventoryItem);
router.put('/inventory/:itemId/stock', updateInventoryStock);
router.delete('/inventory/:itemId', deleteInventoryItem);

// Analytics
router.get('/analytics', getAnalytics);

// Settings
router.get('/settings', getSettings);
router.put('/settings', updateSettings);

module.exports = router;
