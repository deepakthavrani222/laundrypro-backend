const express = require('express');
const { protect } = require('../../middlewares/auth');
const { checkPermission } = require('../../middlewares/checkPermission');
const {
  getDashboard,
  getAllOrders,
  assignOrderToBranch,
  assignOrderToLogistics,
  updateOrderStatus,
  updatePaymentStatus,
  fixDeliveredPayments,
  getCustomers,
  toggleCustomerStatus,
  tagVIPCustomer,
  getComplaints,
  getComplaintById,
  assignComplaint,
  updateComplaintStatus,
  getRefundRequests,
  getRefundById,
  createRefundRequest,
  approveRefund,
  rejectRefund,
  escalateRefund,
  processRefund,
  getSupportAgents,
  getLogisticsPartners,
  getPayments,
  getPaymentStats,
  getAnalytics,
  getStaff,
  toggleStaffStatus,
  getBranches,
  getNotifications,
  getUnreadNotificationCount,
  markNotificationsAsRead,
  markAllNotificationsAsRead
} = require('../../controllers/admin/adminController');

const {
  getWeeklyOrders,
  getOrderStatusDistribution,
  getRevenueData,
  getHourlyOrders,
  getServiceDistribution
} = require('../../controllers/admin/analyticsController');

const {
  getDeliveryPricing,
  updateDeliveryPricing,
  updateBranchCoordinates,
  getBranchCoordinates,
  getBranchesCoordinatesStatus,
  updateBranchDeliveryPricing
} = require('../../controllers/admin/deliveryPricingController');

const {
  createCenterAdmin,
  getCenterAdmins,
  deactivateCenterAdmin,
  reactivateCenterAdmin
} = require('../../controllers/adminStaffController');

const router = express.Router();

// Apply authentication
router.use(protect);

// Dashboard routes
router.get('/dashboard', getDashboard);

// Analytics routes for charts (requires reports.view permission)
router.get('/analytics/weekly-orders', checkPermission('reports', 'view'), getWeeklyOrders);
router.get('/analytics/order-status', checkPermission('reports', 'view'), getOrderStatusDistribution);
router.get('/analytics/revenue', checkPermission('reports', 'view'), getRevenueData);
router.get('/analytics/hourly-orders', checkPermission('reports', 'view'), getHourlyOrders);
router.get('/analytics/service-distribution', checkPermission('reports', 'view'), getServiceDistribution);

// Order management routes
router.get('/orders', checkPermission('orders', 'view'), getAllOrders);
router.put('/orders/:orderId/assign-branch', checkPermission('orders', 'assign'), assignOrderToBranch);
router.put('/orders/:orderId/assign-logistics', checkPermission('orders', 'assign'), assignOrderToLogistics);
router.put('/orders/:orderId/status', checkPermission('orders', 'update'), updateOrderStatus);
router.put('/orders/:orderId/payment-status', checkPermission('financial', 'update'), updatePaymentStatus);
router.post('/fix-delivered-payments', checkPermission('financial', 'update'), fixDeliveredPayments);

// Customer management routes
router.get('/customers', checkPermission('customers', 'view'), getCustomers);
router.put('/customers/:customerId/toggle-status', checkPermission('customers', 'update'), toggleCustomerStatus);
router.put('/customers/:customerId/vip', checkPermission('customers', 'update'), tagVIPCustomer);

// Complaint management routes
router.get('/complaints', checkPermission('orders', 'view'), getComplaints);
router.get('/complaints/:complaintId', checkPermission('orders', 'view'), getComplaintById);
router.put('/complaints/:complaintId/assign', checkPermission('orders', 'assign'), assignComplaint);
router.put('/complaints/:complaintId/status', checkPermission('orders', 'update'), updateComplaintStatus);

// Refund management routes
router.get('/refunds', checkPermission('financial', 'view'), getRefundRequests);
router.get('/refunds/:refundId', checkPermission('financial', 'view'), getRefundById);
router.post('/refunds', checkPermission('orders', 'refund'), createRefundRequest);
router.put('/refunds/:refundId/approve', checkPermission('financial', 'approve'), approveRefund);
router.put('/refunds/:refundId/reject', checkPermission('financial', 'approve'), rejectRefund);
router.put('/refunds/:refundId/escalate', checkPermission('orders', 'refund'), escalateRefund);
router.put('/refunds/:refundId/process', checkPermission('financial', 'approve'), processRefund);

// Support agents and logistics partners
router.get('/support-agents', checkPermission('users', 'view'), getSupportAgents);
router.get('/logistics-partners', checkPermission('orders', 'view'), getLogisticsPartners);

// Payment management routes
router.get('/payments', checkPermission('financial', 'view'), getPayments);
router.get('/payments/stats', checkPermission('financial', 'view'), getPaymentStats);

// Analytics routes
router.get('/analytics', checkPermission('reports', 'view'), getAnalytics);

// Staff management routes
router.get('/staff', checkPermission('users', 'view'), getStaff);
router.patch('/staff/:userId/status', checkPermission('users', 'update'), toggleStaffStatus);

// Branch management routes
router.get('/branches', checkPermission('branches', 'view'), getBranches);
router.get('/branches/coordinates-status', checkPermission('branches', 'view'), getBranchesCoordinatesStatus);
router.get('/branches/:branchId/coordinates', checkPermission('branches', 'view'), getBranchCoordinates);
router.put('/branches/:branchId/coordinates', checkPermission('branches', 'update'), updateBranchCoordinates);
router.put('/branches/:branchId/delivery-pricing', checkPermission('services', 'update'), updateBranchDeliveryPricing);

// Delivery pricing routes
router.get('/delivery-pricing', checkPermission('services', 'view'), getDeliveryPricing);
router.put('/delivery-pricing', checkPermission('services', 'update'), updateDeliveryPricing);

// Notification routes (no permission check - user's own notifications)
router.get('/notifications', getNotifications);
router.get('/notifications/unread-count', getUnreadNotificationCount);
router.put('/notifications/mark-read', markNotificationsAsRead);
router.put('/notifications/mark-all-read', markAllNotificationsAsRead);

// Center Admin management routes (requires users permissions)
router.post('/center-admins', checkPermission('users', 'create'), createCenterAdmin);
router.get('/center-admins', checkPermission('users', 'view'), getCenterAdmins);
router.delete('/center-admins/:id', checkPermission('users', 'delete'), deactivateCenterAdmin);
router.put('/center-admins/:id/reactivate', checkPermission('users', 'update'), reactivateCenterAdmin);

module.exports = router;