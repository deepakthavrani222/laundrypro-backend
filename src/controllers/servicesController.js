const Branch = require('../models/Branch');
const { 
  sendSuccess, 
  sendError, 
  asyncHandler, 
  calculateItemPrice, 
  calculateOrderTotal,
  getTimeSlots,
  isValidTimeSlot
} = require('../utils/helpers');
const { SERVICES, CLOTHING_CATEGORIES, ITEM_TYPES } = require('../config/constants');

// @desc    Calculate pricing for items
// @route   POST /api/services/calculate
// @access  Public
const calculatePricing = asyncHandler(async (req, res) => {
  const { items, isExpress = false } = req.body;

  if (!items || !Array.isArray(items) || items.length === 0) {
    return sendError(res, 'INVALID_ITEMS', 'Items array is required', 400);
  }

  const calculatedItems = [];
  let subtotal = 0;

  for (const item of items) {
    const { itemType, service, category, quantity } = item;

    if (!itemType || !service || !category || !quantity) {
      return sendError(res, 'INVALID_ITEM', 'Each item must have itemType, service, category, and quantity', 400);
    }

    const pricing = calculateItemPrice(itemType, service, category, isExpress);
    const itemTotal = pricing.unitPrice * quantity;
    subtotal += itemTotal;

    calculatedItems.push({
      ...item,
      pricing,
      totalPrice: itemTotal
    });
  }

  // Calculate order total with default values
  const orderTotal = calculateOrderTotal(items.map(item => ({
    ...item,
    isExpress
  })));

  sendSuccess(res, {
    items: calculatedItems,
    subtotal,
    orderTotal,
    isExpress
  }, 'Pricing calculated successfully');
});

// @desc    Get available time slots
// @route   GET /api/services/time-slots
// @access  Public
const getAvailableTimeSlots = asyncHandler(async (req, res) => {
  const timeSlots = getTimeSlots();
  
  sendSuccess(res, { timeSlots }, 'Time slots retrieved successfully');
});

// @desc    Check service availability by pincode
// @route   GET /api/services/availability/:pincode
// @access  Public
const checkServiceAvailability = asyncHandler(async (req, res) => {
  const { pincode } = req.params;

  if (!pincode) {
    return sendError(res, 'PINCODE_REQUIRED', 'Pincode is required', 400);
  }

  // Find branches serving this pincode
  const branches = await Branch.find({
    'serviceAreas.pincode': pincode,
    isActive: true
  }).select('name code address serviceAreas');

  if (branches.length === 0) {
    return sendSuccess(res, {
      available: false,
      message: 'Service not available in your area',
      branches: []
    }, 'Service availability checked');
  }

  // Get service area details for this pincode
  const serviceDetails = branches.map(branch => {
    const serviceArea = branch.serviceAreas.find(area => area.pincode === pincode);
    return {
      branchId: branch._id,
      branchName: branch.name,
      branchCode: branch.code,
      deliveryCharge: serviceArea?.deliveryCharge || 0,
      estimatedPickupTime: serviceArea?.estimatedPickupTime || '2-4 hours'
    };
  });

  sendSuccess(res, {
    available: true,
    message: 'Service available in your area',
    branches: serviceDetails
  }, 'Service availability checked');
});

// @desc    Get service types and categories
// @route   GET /api/services/types
// @access  Public
const getServiceTypes = asyncHandler(async (req, res) => {
  const serviceTypes = {
    services: Object.values(SERVICES),
    categories: Object.values(CLOTHING_CATEGORIES),
    itemTypes: Object.values(ITEM_TYPES)
  };

  sendSuccess(res, serviceTypes, 'Service types retrieved successfully');
});

module.exports = {
  calculatePricing,
  getAvailableTimeSlots,
  checkServiceAvailability,
  getServiceTypes
};