const express = require('express');
const router = express.Router();
const { protect, restrictTo } = require('../middlewares/auth');
const {
  scanBarcode,
  getOrderBarcode,
  updateStatusViaScan,
  bulkScan
} = require('../controllers/barcodeController');

// All routes require authentication
router.use(protect);

// Scan barcode - accessible by staff, branch managers, admins
router.get('/scan/:barcode', restrictTo('admin', 'super_admin', 'center_admin', 'branch_manager', 'operations_admin', 'support_agent'), scanBarcode);

// Get barcode for order - accessible by all authenticated users
router.get('/order/:orderId', getOrderBarcode);

// Update status via scan - staff and admin only
router.put('/scan/:barcode/status', restrictTo('admin', 'super_admin', 'center_admin', 'branch_manager', 'operations_admin'), updateStatusViaScan);

// Bulk scan - staff and admin only
router.post('/bulk-scan', restrictTo('admin', 'super_admin', 'center_admin', 'branch_manager', 'operations_admin'), bulkScan);

module.exports = router;
