const express = require('express');
const router = express.Router();
const logisticsController = require('../controllers/centerAdminLogisticsController');
const { authenticateCenterAdmin } = require('../middlewares/centerAdminAuth');

// All routes require center admin authentication
router.use(authenticateCenterAdmin);

// Get all partners (for dropdown in orders page)
router.get('/', logisticsController.getAllPartners);

// Partner CRUD
router.get('/partners', logisticsController.getAllPartners);
router.get('/partners/dropdown', logisticsController.getPartnersDropdown);
router.get('/partners/:id', logisticsController.getPartner);
router.post('/partners', logisticsController.createPartner);
router.put('/partners/:id', logisticsController.updatePartner);
router.patch('/partners/:id/toggle-status', logisticsController.toggleStatus);
router.delete('/partners/:id', logisticsController.deletePartner);

// Order assignment
router.post('/assign-order', logisticsController.assignOrder);
router.get('/orders/export', logisticsController.getOrdersForExport);
router.get('/partners/:partnerId/orders', logisticsController.getPartnerOrders);

// Settlement
router.get('/partners/:partnerId/settlement', logisticsController.getSettlementReport);

module.exports = router;
