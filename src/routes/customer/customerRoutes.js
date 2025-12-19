const express = require('express');
const { protect } = require('../../middlewares/auth');

const router = express.Router();

// Apply authentication to all routes
router.use(protect);

// Placeholder routes - will be implemented in later tasks
router.get('/profile', (req, res) => {
  res.json({ success: true, message: 'Customer profile endpoint - coming soon' });
});

router.get('/orders', (req, res) => {
  res.json({ success: true, message: 'Customer orders endpoint - coming soon' });
});

module.exports = router;