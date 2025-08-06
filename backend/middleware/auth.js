const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * Protect routes - verify JWT token
 */
const protect = async (req, res, next) => {
  let token;
  
  // Check for token in header
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }
  
  // Check for token in cookies (optional)
  else if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }
  
  // Make sure token exists
  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized to access this route'
    });
  }
  
  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Get user from database
    const user = await User.findById(decoded.id).select('-password');
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'No user found with this token'
      });
    }
    
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'User account is deactivated'
      });
    }
    
    // Add user to request object
    req.user = user;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(401).json({
      success: false,
      message: 'Not authorized to access this route'
    });
  }
};

/**
 * Role-based access control
 * @param {...string} roles - Allowed roles
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized to access this route'
      });
    }
    
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `User role ${req.user.role} is not authorized to access this route`
      });
    }
    
    next();
  };
};

/**
 * Department-based access control for officers and mitra
 */
const authorizeDepartment = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized to access this route'
    });
  }
  
  // Admin can access all departments
  if (req.user.role === 'admin') {
    return next();
  }
  
  // For officers and mitra, check department access
  if ((req.user.role === 'officer' || req.user.role === 'mitra') && req.user.department) {
    req.userDepartment = req.user.department;
    return next();
  }
  
  return res.status(403).json({
    success: false,
    message: 'Department access required'
  });
};

/**
 * Check if user can access specific complaint
 */
const authorizeComplaintAccess = async (req, res, next) => {
  try {
    const Complaint = require('../models/Complaint');
    const complaintId = req.params.id || req.params.complaintId;
    
    if (!complaintId) {
      return res.status(400).json({
        success: false,
        message: 'Complaint ID is required'
      });
    }
    
    const complaint = await Complaint.findById(complaintId);
    
    if (!complaint) {
      return res.status(404).json({
        success: false,
        message: 'Complaint not found'
      });
    }
    
    const user = req.user;
    let hasAccess = false;
    
    switch (user.role) {
      case 'admin':
        hasAccess = true;
        break;
        
      case 'citizen':
        // Citizens can only access their own complaints
        hasAccess = complaint.citizen.toString() === user._id.toString();
        break;
        
      case 'officer':
        // Officers can access complaints in their department
        hasAccess = complaint.aiClassification.department === user.department ||
                   complaint.assignedOfficer?.toString() === user._id.toString();
        break;
        
      case 'mitra':
        // Mitra can access assigned complaints in their department
        hasAccess = (complaint.aiClassification.department === user.department &&
                    complaint.assignedMitra?.toString() === user._id.toString());
        break;
        
      default:
        hasAccess = false;
    }
    
    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this complaint'
      });
    }
    
    // Add complaint to request for use in controller
    req.complaint = complaint;
    next();
    
  } catch (error) {
    console.error('Complaint access authorization error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error checking complaint access'
    });
  }
};

/**
 * Optional auth - doesn't fail if no token provided
 */
const optionalAuth = async (req, res, next) => {
  let token;
  
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }
  
  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select('-password');
      
      if (user && user.isActive) {
        req.user = user;
      }
    } catch (error) {
      // Ignore errors for optional auth
      console.log('Optional auth failed:', error.message);
    }
  }
  
  next();
};

/**
 * Rate limiting for sensitive operations
 */
const sensitiveOpLimit = (req, res, next) => {
  // This can be extended with Redis for distributed rate limiting
  // For now, just pass through
  next();
};

module.exports = {
  protect,
  authorize,
  authorizeDepartment,
  authorizeComplaintAccess,
  optionalAuth,
  sensitiveOpLimit
};