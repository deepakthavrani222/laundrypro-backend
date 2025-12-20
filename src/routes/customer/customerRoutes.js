const express = require('express');
const { protect, requireEmailVerification } = require('../../middlewares/auth');
const {
  getAddresses,
  getAddress,
  addAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress
} = require('../../controllers/addressController');
const {
  createOrder,
  getOrders,
  getOrderById,
  getOrderTracking,
  cancelOrder,
  rateOrder,
  reorder
} = require('../../controllers/customer/orderController');
const { addressValidation, validate } = require('../../utils/validation');

const router = express.Router();

// Apply authentication to all routes
router.use(protect);

// Address routes
router.route('/addresses')
  .get(getAddresses)
  .post(validate(addressValidation), addAddress);

router.route('/addresses/:id')
  .get(getAddress)
  .put(validate(addressValidation), updateAddress)
  .delete(deleteAddress);

router.put('/addresses/:id/set-default', setDefaultAddress);

// Order routes
router.route('/orders')
  .get(getOrders)
  .post(createOrder);

router.get('/orders/:orderId', getOrderById);
router.get('/orders/:orderId/tracking', getOrderTracking);
router.put('/orders/:orderId/cancel', cancelOrder);
router.put('/orders/:orderId/rate', rateOrder);
router.post('/orders/:orderId/reorder', reorder);

// Profile route
router.get('/profile', (req, res) => {
  res.json({ success: true, message: 'Customer profile endpoint - coming soon' });
});

module.exports = router;