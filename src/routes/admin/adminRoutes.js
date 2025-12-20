const express = require('express');
const { protect } = require('../../middlewares/auth');
const {
  getDashboard,
  getAllOrders,
  assignOrderToBranch,
  assignOrderToLogistics,
  updateOrderStatus,
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
  getBranches
} = require('../../controllers/admin/adminController');

const router = express.Router();

// Apply authentication
router.use(protect);

// Dashboard routes
router.get('/dashboard', getDashboard);

// Order management routes
router.get('/orders', getAllOrders);
router.put('/orders/:orderId/assign-branch', assignOrderToBranch);
router.put('/orders/:orderId/assign-logistics', assignOrderToLogistics);
router.put('/orders/:orderId/status', updateOrderStatus);

// Customer management routes
router.get('/customers', getCustomers);
router.put('/customers/:customerId/toggle-status', toggleCustomerStatus);
router.put('/customers/:customerId/vip', tagVIPCustomer);

// Complaint management routes
router.get('/complaints', getComplaints);
router.get('/complaints/:complaintId', getComplaintById);
router.put('/complaints/:complaintId/assign', assignComplaint);
router.put('/complaints/:complaintId/status', updateComplaintStatus);

// Refund management routes
router.get('/refunds', getRefundRequests);
router.get('/refunds/:refundId', getRefundById);
router.post('/refunds', createRefundRequest);
router.put('/refunds/:refundId/approve', approveRefund);
router.put('/refunds/:refundId/reject', rejectRefund);
router.put('/refunds/:refundId/escalate', escalateRefund);
router.put('/refunds/:refundId/process', processRefund);

// Support agents and logistics partners
router.get('/support-agents', getSupportAgents);
router.get('/logistics-partners', getLogisticsPartners);

// Payment management routes
router.get('/payments', getPayments);
router.get('/payments/stats', getPaymentStats);

// Analytics routes
router.get('/analytics', getAnalytics);

// Staff management routes
router.get('/staff', getStaff);
router.patch('/staff/:userId/status', toggleStaffStatus);

// Branch management routes
router.get('/branches', getBranches);

module.exports = router;