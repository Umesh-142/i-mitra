const express = require('express');
const analyticsController = require('../controllers/analyticsController');
const { protect, authorize, authorizeDepartment } = require('../middleware/auth');

const router = express.Router();

// All analytics routes require authentication
router.use(protect);

// General analytics (role-based access)
router.get('/dashboard', analyticsController.getDashboardStats);
router.get('/trends', analyticsController.getTrendAnalysis);
router.get('/performance', analyticsController.getPerformanceMetrics);

// Department-specific analytics
router.get('/department/:dept', authorizeDepartment, analyticsController.getDepartmentAnalytics);

// Zone-wise analytics
router.get('/zones', analyticsController.getZoneAnalytics);

// SLA analytics
router.get('/sla', analyticsController.getSLAAnalytics);

// Citizen satisfaction analytics
router.get('/satisfaction', analyticsController.getSatisfactionAnalytics);

// Real-time statistics
router.get('/realtime', analyticsController.getRealtimeStats);

// Advanced analytics (Admin only)
router.get('/advanced/patterns', authorize('admin'), analyticsController.getPatternAnalysis);
router.get('/advanced/predictions', authorize('admin'), analyticsController.getPredictiveAnalytics);
router.get('/advanced/hotspots', authorize('admin'), analyticsController.getHotspotAnalysis);

// Export analytics data
router.get('/export/:type', authorize('officer', 'admin'), analyticsController.exportAnalytics);

module.exports = router;