const express = require('express');
const { protect } = require('../../middlewares/auth');

const router = express.Router();

// Apply authentication
router.use(protect);

// Placeholder routes - will be implemented in later tasks
router.get('/dashboard', (req, res) => {
  res.json({ success: true, message: 'Center admin dashboard endpoint - coming soon' });
});

router.get('/branches', (req, res) => {
  res.json({ success: true, message: 'Center admin branches endpoint - coming soon' });
});

module.exports = router;