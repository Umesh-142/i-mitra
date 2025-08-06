const express = require('express');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(protect);

// Get user profile
router.get('/profile', (req, res) => {
  res.status(200).json({
    success: true,
    data: req.user
  });
});

// Update user profile
router.put('/profile', (req, res) => {
  // This would be implemented similar to auth controller updateDetails
  res.status(200).json({
    success: true,
    message: 'Profile update feature coming soon'
  });
});

module.exports = router;