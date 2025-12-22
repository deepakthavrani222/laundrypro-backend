const express = require('express');
const { protect } = require('../../middlewares/auth');
const {
  getSupportDashboard,
  getTickets,
  getTicketById,
  updateTicketStatus,
  assignTicket,
  addMessageToTicket,
  escalateTicket,
  resolveTicket,
  getCustomers,
  getCustomerById
} = require('../../controllers/support/supportController');

const router = express.Router();

// Apply authentication
router.use(protect);

// Dashboard
router.get('/dashboard', getSupportDashboard);

// Customers
router.get('/customers', getCustomers);
router.get('/customers/:customerId', getCustomerById);

// Tickets
router.get('/tickets', getTickets);
router.get('/tickets/:ticketId', getTicketById);
router.put('/tickets/:ticketId/status', updateTicketStatus);
router.put('/tickets/:ticketId/assign', assignTicket);
router.post('/tickets/:ticketId/messages', addMessageToTicket);
router.put('/tickets/:ticketId/escalate', escalateTicket);
router.put('/tickets/:ticketId/resolve', resolveTicket);

module.exports = router;