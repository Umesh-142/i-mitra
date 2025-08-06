const express = require('express');
const { protect } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(protect);

// Get user notifications
router.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    data: [],
    message: 'Notifications feature coming soon'
  });
});

// Mark notification as read
router.put('/:id/read', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Notification marked as read'
  });
});

// Get notification preferences
router.get('/preferences', (req, res) => {
  res.status(200).json({
    success: true,
    data: {
      email: true,
      sms: true,
      push: true
    }
  });
});

// Update notification preferences
router.put('/preferences', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Notification preferences updated'
  });
});

module.exports = router;