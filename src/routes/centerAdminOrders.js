const express = require('express');
const { authenticateCenterAdmin } = require('../middlewares/centerAdminAuth');
const {
  getAllOrders,
  getOrderById,
  assignOrderToBranch,
  assignLogisticsPartner,
  updateOrderStatus
} = require('../controllers/centerAdminOrdersController');

const router = express.Router();

// Apply center admin authentication
router.use(authenticateCenterAdmin);

// Order routes
router.get('/', getAllOrders);
router.get('/:orderId', getOrderById);
router.put('/:orderId/assign-branch', assignOrderToBranch);
router.put('/:orderId/assign-logistics', assignLogisticsPartner);
router.put('/:orderId/status', updateOrderStatus);

module.exports = router;
