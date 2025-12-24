const express = require('express');
const { protect, restrictTo } = require('../../middlewares/auth');
const { requireCenterAdminPermission } = require('../../middlewares/centerAdminPermission');
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
  deleteInventoryItem,
  addWorker,
  updateWorker,
  deleteWorker,
  getWorkerTypes,
  getNotifications,
  getUnreadNotificationCount,
  markNotificationsAsRead,
  markAllNotificationsAsRead,
  getBranchServices,
  createBranchService,
  deleteBranchService,
  toggleBranchService,
  updateBranchServiceSettings,
  getServiceItems,
  addServiceItem,
  updateServiceItem,
  deleteServiceItem
} = require('../../controllers/branch/branchController');

const router = express.Router();

// Apply authentication and role restriction
router.use(protect);
router.use(restrictTo('center_admin', 'admin', 'superadmin'));

// Dashboard - requires view permission on any module (basic access)
router.get('/dashboard', getDashboard);

// Orders - requires orders permissions
router.get('/orders', requireCenterAdminPermission('orders', 'view'), getOrders);
router.put('/orders/:orderId/status', requireCenterAdminPermission('orders', 'update'), updateOrderStatus);
router.put('/orders/:orderId/assign', requireCenterAdminPermission('orders', 'assign'), assignStaffToOrder);

// Staff - requires staff permissions
router.get('/staff', requireCenterAdminPermission('staff', 'view'), getStaff);
router.patch('/staff/:staffId/availability', requireCenterAdminPermission('staff', 'update'), toggleStaffAvailability);

// Workers Management - requires staff permissions
router.get('/worker-types', requireCenterAdminPermission('staff', 'view'), getWorkerTypes);
router.post('/workers', requireCenterAdminPermission('staff', 'create'), addWorker);
router.put('/workers/:workerId', requireCenterAdminPermission('staff', 'update'), updateWorker);
router.delete('/workers/:workerId', requireCenterAdminPermission('staff', 'delete'), deleteWorker);

// Inventory - requires inventory permissions
router.get('/inventory', requireCenterAdminPermission('inventory', 'view'), getInventory);
router.post('/inventory', requireCenterAdminPermission('inventory', 'create'), addInventoryItem);
router.put('/inventory/:itemId/stock', requireCenterAdminPermission('inventory', 'update'), updateInventoryStock);
router.delete('/inventory/:itemId', requireCenterAdminPermission('inventory', 'delete'), deleteInventoryItem);

// Analytics/Performance - requires performance permissions
router.get('/analytics', requireCenterAdminPermission('performance', 'view'), getAnalytics);

// Services Management - requires services permissions
router.get('/services', requireCenterAdminPermission('services', 'view'), getBranchServices);
router.post('/services', requireCenterAdminPermission('services', 'create'), createBranchService);
router.put('/services/:serviceId/toggle', requireCenterAdminPermission('services', 'update'), toggleBranchService);
router.put('/services/:serviceId/settings', requireCenterAdminPermission('services', 'update'), updateBranchServiceSettings);
router.delete('/services/:serviceId', requireCenterAdminPermission('services', 'delete'), deleteBranchService);

// Service Items Management - requires services permissions
router.get('/services/:serviceId/items', requireCenterAdminPermission('services', 'view'), getServiceItems);
router.post('/services/:serviceId/items', requireCenterAdminPermission('services', 'create'), addServiceItem);
router.put('/services/:serviceId/items/:itemId', requireCenterAdminPermission('services', 'update'), updateServiceItem);
router.delete('/services/:serviceId/items/:itemId', requireCenterAdminPermission('services', 'delete'), deleteServiceItem);

// Notifications - no permission required (basic functionality)
router.get('/notifications', getNotifications);
router.get('/notifications/unread-count', getUnreadNotificationCount);
router.put('/notifications/mark-read', markNotificationsAsRead);
router.put('/notifications/mark-all-read', markAllNotificationsAsRead);

// Settings - requires settings permissions
router.get('/settings', requireCenterAdminPermission('settings', 'view'), getSettings);
router.put('/settings', requireCenterAdminPermission('settings', 'update'), updateSettings);

module.exports = router;
