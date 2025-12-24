const express = require('express');
const router = express.Router();
const superAdminCustomersController = require('../controllers/superAdminCustomersController');
const { authenticateSuperAdmin, requirePermission } = require('../middlewares/superAdminAuth');

// All routes require authentication
router.use(authenticateSuperAdmin);

// Get all customers
router.get('/', superAdminCustomersController.getCustomers);

// Get customer by ID
router.get('/:customerId', superAdminCustomersController.getCustomerById);

// Update customer status (activate/deactivate)
router.patch('/:customerId/status', superAdminCustomersController.updateCustomerStatus);

// Get customer orders
router.get('/:customerId/orders', superAdminCustomersController.getCustomerOrders);

module.exports = router;
