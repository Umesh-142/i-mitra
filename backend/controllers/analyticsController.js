const Complaint = require('../models/Complaint');
const User = require('../models/User');
const { ErrorResponse, asyncHandler } = require('../middleware/errorHandler');

// @desc    Get dashboard statistics based on user role
// @route   GET /api/analytics/dashboard
// @access  Private
const getDashboardStats = asyncHandler(async (req, res, next) => {
  try {
    let query = { isActive: true };
    
    // Apply role-based filtering
    switch (req.user.role) {
      case 'officer':
        query['aiClassification.department'] = req.user.department;
        break;
      case 'mitra':
        query.assignedMitra = req.user.id;
        break;
      case 'citizen':
        query.citizen = req.user.id;
        break;
      // Admin sees all data
    }
    
    const [stats] = await Complaint.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          new: { $sum: { $cond: [{ $eq: ['$status', 'new'] }, 1, 0] } },
          assigned: { $sum: { $cond: [{ $eq: ['$status', 'assigned'] }, 1, 0] } },
          inProgress: { $sum: { $cond: [{ $eq: ['$status', 'in_progress'] }, 1, 0] } },
          resolved: { $sum: { $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0] } },
          closed: { $sum: { $cond: [{ $eq: ['$status', 'closed'] }, 1, 0] } },
          rejected: { $sum: { $cond: [{ $eq: ['$status', 'rejected'] }, 1, 0] } },
          escalated: { $sum: { $cond: [{ $eq: ['$status', 'escalated'] }, 1, 0] } },
          slaBreached: { $sum: { $cond: ['$sla.isBreached', 1, 0] } },
          critical: { $sum: { $cond: [{ $eq: ['$aiClassification.priority', 'critical'] }, 1, 0] } },
          high: { $sum: { $cond: [{ $eq: ['$aiClassification.priority', 'high'] }, 1, 0] } },
          medium: { $sum: { $cond: [{ $eq: ['$aiClassification.priority', 'medium'] }, 1, 0] } },
          low: { $sum: { $cond: [{ $eq: ['$aiClassification.priority', 'low'] }, 1, 0] } },
          avgRating: { $avg: '$citizenFeedback.rating' },
          avgResolutionTime: { $avg: '$resolution.resolutionTime' }
        }
      }
    ]);
    
    const result = stats || {
      total: 0, new: 0, assigned: 0, inProgress: 0, resolved: 0, 
      closed: 0, rejected: 0, escalated: 0, slaBreached: 0,
      critical: 0, high: 0, medium: 0, low: 0,
      avgRating: 0, avgResolutionTime: 0
    };
    
    // Calculate additional metrics
    result.pending = result.total - result.resolved - result.closed - result.rejected;
    result.resolutionRate = result.total > 0 ? Math.round((result.resolved / result.total) * 100) : 0;
    result.slaComplianceRate = result.total > 0 ? Math.round(((result.total - result.slaBreached) / result.total) * 100) : 100;
    
    // Get recent complaints
    const recentComplaints = await Complaint.find(query)
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('citizen', 'name')
      .populate('assignedMitra', 'name')
      .select('complaintId title status aiClassification.priority sla.status createdAt');
    
    res.status(200).json({
      success: true,
      data: {
        stats: result,
        recentComplaints
      }
    });
    
  } catch (error) {
    console.error('Dashboard stats error:', error);
    next(new ErrorResponse('Failed to fetch dashboard statistics', 500));
  }
});

// @desc    Get trend analysis
// @route   GET /api/analytics/trends
// @access  Private
const getTrendAnalysis = asyncHandler(async (req, res, next) => {
  try {
    const days = parseInt(req.query.days) || 30;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    let query = { 
      isActive: true,
      createdAt: { $gte: startDate }
    };
    
    // Apply role-based filtering
    if (req.user.role === 'officer') {
      query['aiClassification.department'] = req.user.department;
    } else if (req.user.role === 'mitra') {
      query.assignedMitra = req.user.id;
    } else if (req.user.role === 'citizen') {
      query.citizen = req.user.id;
    }
    
    const trends = await Complaint.aggregate([
      { $match: query },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            status: '$status'
          },
          count: { $sum: 1 }
        }
      },
      {
        $group: {
          _id: '$_id.date',
          data: {
            $push: {
              status: '$_id.status',
              count: '$count'
            }
          },
          total: { $sum: '$count' }
        }
      },
      { $sort: { _id: 1 } }
    ]);
    
    // Get category trends
    const categoryTrends = await Complaint.aggregate([
      { $match: query },
      {
        $group: {
          _id: '$aiClassification.category',
          count: { $sum: 1 },
          resolved: { $sum: { $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0] } }
        }
      },
      { $sort: { count: -1 } }
    ]);
    
    res.status(200).json({
      success: true,
      data: {
        dailyTrends: trends,
        categoryTrends,
        period: `${days} days`
      }
    });
    
  } catch (error) {
    console.error('Trend analysis error:', error);
    next(new ErrorResponse('Failed to fetch trend analysis', 500));
  }
});

// @desc    Get performance metrics
// @route   GET /api/analytics/performance
// @access  Private
const getPerformanceMetrics = asyncHandler(async (req, res, next) => {
  try {
    let query = { isActive: true };
    
    // Apply role-based filtering
    if (req.user.role === 'officer') {
      query['aiClassification.department'] = req.user.department;
    } else if (req.user.role === 'mitra') {
      query.assignedMitra = req.user.id;
    } else if (req.user.role === 'citizen') {
      return res.status(200).json({
        success: true,
        data: { message: 'Performance metrics not available for citizens' }
      });
    }
    
    // Department performance
    const departmentPerformance = await Complaint.aggregate([
      { $match: { isActive: true } },
      {
        $group: {
          _id: '$aiClassification.department',
          total: { $sum: 1 },
          resolved: { $sum: { $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0] } },
          avgResolutionTime: { $avg: '$resolution.resolutionTime' },
          slaBreached: { $sum: { $cond: ['$sla.isBreached', 1, 0] } },
          avgRating: { $avg: '$citizenFeedback.rating' }
        }
      },
      {
        $addFields: {
          resolutionRate: { $multiply: [{ $divide: ['$resolved', '$total'] }, 100] },
          slaComplianceRate: { $multiply: [{ $divide: [{ $subtract: ['$total', '$slaBreached'] }, '$total'] }, 100] }
        }
      },
      { $sort: { resolutionRate: -1 } }
    ]);
    
    // Mitra performance (for officers and admins)
    let mitraPerformance = [];
    if (req.user.role !== 'mitra') {
      const mitraQuery = req.user.role === 'officer' 
        ? { assignedMitra: { $exists: true }, 'aiClassification.department': req.user.department }
        : { assignedMitra: { $exists: true } };
        
      mitraPerformance = await Complaint.aggregate([
        { $match: mitraQuery },
        {
          $lookup: {
            from: 'users',
            localField: 'assignedMitra',
            foreignField: '_id',
            as: 'mitra'
          }
        },
        { $unwind: '$mitra' },
        {
          $group: {
            _id: '$assignedMitra',
            name: { $first: '$mitra.name' },
            employeeId: { $first: '$mitra.employeeId' },
            total: { $sum: 1 },
            resolved: { $sum: { $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0] } },
            avgResolutionTime: { $avg: '$resolution.resolutionTime' },
            avgRating: { $avg: '$citizenFeedback.rating' }
          }
        },
        {
          $addFields: {
            resolutionRate: { $multiply: [{ $divide: ['$resolved', '$total'] }, 100] }
          }
        },
        { $sort: { resolutionRate: -1 } }
      ]);
    }
    
    res.status(200).json({
      success: true,
      data: {
        departmentPerformance,
        mitraPerformance
      }
    });
    
  } catch (error) {
    console.error('Performance metrics error:', error);
    next(new ErrorResponse('Failed to fetch performance metrics', 500));
  }
});

// @desc    Get zone analytics
// @route   GET /api/analytics/zones
// @access  Private
const getZoneAnalytics = asyncHandler(async (req, res, next) => {
  try {
    const zoneStats = await Complaint.aggregate([
      { $match: { isActive: true } },
      {
        $group: {
          _id: '$location.zone',
          total: { $sum: 1 },
          resolved: { $sum: { $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0] } },
          pending: { $sum: { $cond: [{ $ne: ['$status', 'resolved'] }, 1, 0] } },
          critical: { $sum: { $cond: [{ $eq: ['$aiClassification.priority', 'critical'] }, 1, 0] } },
          high: { $sum: { $cond: [{ $eq: ['$aiClassification.priority', 'high'] }, 1, 0] } },
          avgRating: { $avg: '$citizenFeedback.rating' },
          categories: { $push: '$aiClassification.category' }
        }
      },
      {
        $addFields: {
          resolutionRate: { $multiply: [{ $divide: ['$resolved', '$total'] }, 100] }
        }
      },
      { $sort: { total: -1 } }
    ]);
    
    // Get hotspot analysis
    const hotspots = await Complaint.aggregate([
      { $match: { isActive: true, 'location.coordinates.latitude': { $exists: true } } },
      {
        $group: {
          _id: {
            lat: { $round: [{ $multiply: ['$location.coordinates.latitude', 100] }, 0] },
            lng: { $round: [{ $multiply: ['$location.coordinates.longitude', 100] }, 0] }
          },
          count: { $sum: 1 },
          complaints: { $push: { id: '$_id', title: '$title', priority: '$aiClassification.priority' } }
        }
      },
      { $match: { count: { $gte: 3 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);
    
    res.status(200).json({
      success: true,
      data: {
        zoneStats,
        hotspots
      }
    });
    
  } catch (error) {
    console.error('Zone analytics error:', error);
    next(new ErrorResponse('Failed to fetch zone analytics', 500));
  }
});

// @desc    Get SLA analytics
// @route   GET /api/analytics/sla
// @access  Private
const getSLAAnalytics = asyncHandler(async (req, res, next) => {
  try {
    let query = { isActive: true };
    
    // Apply role-based filtering
    if (req.user.role === 'officer') {
      query['aiClassification.department'] = req.user.department;
    } else if (req.user.role === 'mitra') {
      query.assignedMitra = req.user.id;
    } else if (req.user.role === 'citizen') {
      query.citizen = req.user.id;
    }
    
    const slaStats = await Complaint.aggregate([
      { $match: query },
      {
        $group: {
          _id: '$sla.status',
          count: { $sum: 1 },
          avgRemainingHours: { $avg: '$sla.remainingHours' }
        }
      }
    ]);
    
    // SLA performance by department
    const slaByDepartment = await Complaint.aggregate([
      { $match: { isActive: true } },
      {
        $group: {
          _id: '$aiClassification.department',
          total: { $sum: 1 },
          breached: { $sum: { $cond: ['$sla.isBreached', 1, 0] } },
          onTime: { $sum: { $cond: [{ $and: [{ $eq: ['$status', 'resolved'] }, { $eq: ['$sla.isBreached', false] }] }, 1, 0] } }
        }
      },
      {
        $addFields: {
          complianceRate: { $multiply: [{ $divide: [{ $subtract: ['$total', '$breached'] }, '$total'] }, 100] }
        }
      },
      { $sort: { complianceRate: -1 } }
    ]);
    
    res.status(200).json({
      success: true,
      data: {
        slaStats,
        slaByDepartment
      }
    });
    
  } catch (error) {
    console.error('SLA analytics error:', error);
    next(new ErrorResponse('Failed to fetch SLA analytics', 500));
  }
});

// @desc    Get satisfaction analytics
// @route   GET /api/analytics/satisfaction
// @access  Private
const getSatisfactionAnalytics = asyncHandler(async (req, res, next) => {
  try {
    const satisfactionStats = await Complaint.aggregate([
      { $match: { 'citizenFeedback.rating': { $exists: true } } },
      {
        $group: {
          _id: null,
          avgRating: { $avg: '$citizenFeedback.rating' },
          totalRatings: { $sum: 1 },
          rating5: { $sum: { $cond: [{ $eq: ['$citizenFeedback.rating', 5] }, 1, 0] } },
          rating4: { $sum: { $cond: [{ $eq: ['$citizenFeedback.rating', 4] }, 1, 0] } },
          rating3: { $sum: { $cond: [{ $eq: ['$citizenFeedback.rating', 3] }, 1, 0] } },
          rating2: { $sum: { $cond: [{ $eq: ['$citizenFeedback.rating', 2] }, 1, 0] } },
          rating1: { $sum: { $cond: [{ $eq: ['$citizenFeedback.rating', 1] }, 1, 0] } },
          satisfied: { $sum: { $cond: ['$citizenFeedback.satisfied', 1, 0] } }
        }
      }
    ]);
    
    // Satisfaction by department
    const satisfactionByDept = await Complaint.aggregate([
      { $match: { 'citizenFeedback.rating': { $exists: true } } },
      {
        $group: {
          _id: '$aiClassification.department',
          avgRating: { $avg: '$citizenFeedback.rating' },
          totalRatings: { $sum: 1 },
          satisfied: { $sum: { $cond: ['$citizenFeedback.satisfied', 1, 0] } }
        }
      },
      {
        $addFields: {
          satisfactionRate: { $multiply: [{ $divide: ['$satisfied', '$totalRatings'] }, 100] }
        }
      },
      { $sort: { avgRating: -1 } }
    ]);
    
    res.status(200).json({
      success: true,
      data: {
        overall: satisfactionStats[0] || { avgRating: 0, totalRatings: 0, satisfied: 0 },
        byDepartment: satisfactionByDept
      }
    });
    
  } catch (error) {
    console.error('Satisfaction analytics error:', error);
    next(new ErrorResponse('Failed to fetch satisfaction analytics', 500));
  }
});

// @desc    Get real-time statistics
// @route   GET /api/analytics/realtime
// @access  Private
const getRealtimeStats = asyncHandler(async (req, res, next) => {
  try {
    const now = new Date();
    const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const lastHour = new Date(now.getTime() - 60 * 60 * 1000);
    
    let query = { isActive: true };
    
    // Apply role-based filtering
    if (req.user.role === 'officer') {
      query['aiClassification.department'] = req.user.department;
    } else if (req.user.role === 'mitra') {
      query.assignedMitra = req.user.id;
    } else if (req.user.role === 'citizen') {
      query.citizen = req.user.id;
    }
    
    const [realtimeStats] = await Complaint.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          last24h: { $sum: { $cond: [{ $gte: ['$createdAt', last24Hours] }, 1, 0] } },
          lastHour: { $sum: { $cond: [{ $gte: ['$createdAt', lastHour] }, 1, 0] } },
          criticalPending: { 
            $sum: { 
              $cond: [
                { 
                  $and: [
                    { $eq: ['$aiClassification.priority', 'critical'] },
                    { $nin: ['$status', ['resolved', 'closed']] }
                  ]
                }, 
                1, 
                0
              ] 
            } 
          },
          slaAtRisk: { $sum: { $cond: [{ $eq: ['$sla.status', 'critical'] }, 1, 0] } }
        }
      }
    ]);
    
    const result = realtimeStats || {
      total: 0, last24h: 0, lastHour: 0, criticalPending: 0, slaAtRisk: 0
    };
    
    res.status(200).json({
      success: true,
      data: result,
      timestamp: now
    });
    
  } catch (error) {
    console.error('Realtime stats error:', error);
    next(new ErrorResponse('Failed to fetch real-time statistics', 500));
  }
});

// Additional placeholder methods for admin-only advanced analytics
const getPatternAnalysis = asyncHandler(async (req, res, next) => {
  res.status(200).json({
    success: true,
    data: { message: 'Pattern analysis feature coming soon' }
  });
});

const getPredictiveAnalytics = asyncHandler(async (req, res, next) => {
  res.status(200).json({
    success: true,
    data: { message: 'Predictive analytics feature coming soon' }
  });
});

const getHotspotAnalysis = asyncHandler(async (req, res, next) => {
  res.status(200).json({
    success: true,
    data: { message: 'Hotspot analysis feature coming soon' }
  });
});

const getDepartmentAnalytics = asyncHandler(async (req, res, next) => {
  res.status(200).json({
    success: true,
    data: { message: 'Department analytics feature coming soon' }
  });
});

const exportAnalytics = asyncHandler(async (req, res, next) => {
  res.status(200).json({
    success: true,
    data: { message: 'Analytics export feature coming soon' }
  });
});

module.exports = {
  getDashboardStats,
  getTrendAnalysis,
  getPerformanceMetrics,
  getZoneAnalytics,
  getSLAAnalytics,
  getSatisfactionAnalytics,
  getRealtimeStats,
  getPatternAnalysis,
  getPredictiveAnalytics,
  getHotspotAnalysis,
  getDepartmentAnalytics,
  exportAnalytics
};