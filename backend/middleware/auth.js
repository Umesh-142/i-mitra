import jwt from 'jsonwebtoken';
import { asyncHandler, ErrorResponse } from './errorHandler.js';
import User from '../models/User.js';

/**
 * Protect routes - Verify JWT token and set req.user
 */
export const protect = asyncHandler(async (req, res, next) => {
  let token;

  // Check for token in Authorization header
  if (req.headers.authorization?.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }
  // Check for token in cookies (optional)
  else if (req.cookies?.token) {
    token = req.cookies.token;
  }

  // Make sure token exists
  if (!token) {
    return next(new ErrorResponse('Not authorized to access this route', 401));
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Get user from token and exclude password
    const user = await User.findById(decoded.id).select('-password');
    
    if (!user) {
      return next(new ErrorResponse('User not found with this token', 401));
    }

    // Check if user is active
    if (!user.isActive) {
      return next(new ErrorResponse('Account has been deactivated', 401));
    }

    // Check if password was changed after token was issued
    if (user.passwordChangedAt && decoded.iat < user.passwordChangedAt.getTime() / 1000) {
      return next(new ErrorResponse('Password was recently changed. Please log in again.', 401));
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Token verification error:', error.message);
    return next(new ErrorResponse('Not authorized to access this route', 401));
  }
});

/**
 * Optional authentication - Set req.user if token exists but don't require it
 */
export const optionalAuth = asyncHandler(async (req, res, next) => {
  let token;

  if (req.headers.authorization?.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies?.token) {
    token = req.cookies.token;
  }

  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select('-password');
      
      if (user && user.isActive) {
        req.user = user;
      }
    } catch (error) {
      // Silently fail for optional auth
      console.log('Optional auth failed:', error.message);
    }
  }

  next();
});

/**
 * Grant access to specific roles
 */
export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new ErrorResponse('Not authorized to access this route', 401));
    }

    if (!roles.includes(req.user.role)) {
      return next(
        new ErrorResponse(
          `User role '${req.user.role}' is not authorized to access this route`,
          403
        )
      );
    }

    next();
  };
};

/**
 * Authorize access to specific departments (for officers and mitra)
 */
export const authorizeDepartment = (...departments) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new ErrorResponse('Not authorized to access this route', 401));
    }

    // Admin can access all departments
    if (req.user.role === 'admin') {
      return next();
    }

    // Check if user has department access
    if (!req.user.department || !departments.includes(req.user.department)) {
      return next(
        new ErrorResponse(
          `Access denied for department '${req.user.department}'`,
          403
        )
      );
    }

    next();
  };
};

/**
 * Authorize access to specific complaint based on user role and department
 */
export const authorizeComplaintAccess = asyncHandler(async (req, res, next) => {
  const { user } = req;
  const complaintId = req.params.id || req.params.complaintId;

  if (!user) {
    return next(new ErrorResponse('Not authorized to access this route', 401));
  }

  // Import Complaint model dynamically to avoid circular imports
  const { default: Complaint } = await import('../models/Complaint.js');
  
  const complaint = await Complaint.findById(complaintId);
  
  if (!complaint) {
    return next(new ErrorResponse('Complaint not found', 404));
  }

  let hasAccess = false;

  switch (user.role) {
    case 'admin':
      // Admin can access all complaints
      hasAccess = true;
      break;
      
    case 'citizen':
      // Citizens can only access their own complaints
      hasAccess = complaint.citizen.email === user.email;
      break;
      
    case 'officer':
      // Officers can access complaints in their department
      hasAccess = complaint.department === user.department;
      break;
      
    case 'mitra':
      // Mitra can access complaints assigned to them or in their department
      hasAccess = 
        complaint.assignedMitra?.toString() === user._id.toString() ||
        complaint.department === user.department;
      break;
      
    default:
      hasAccess = false;
  }

  if (!hasAccess) {
    return next(
      new ErrorResponse('Not authorized to access this complaint', 403)
    );
  }

  // Attach complaint to request for use in controller
  req.complaint = complaint;
  next();
});

/**
 * Rate limiting for sensitive operations
 */
export const sensitiveOpLimit = (maxAttempts = 3, windowMs = 15 * 60 * 1000) => {
  const attempts = new Map();

  return (req, res, next) => {
    const key = `${req.ip}-${req.user?.id || 'anonymous'}`;
    const now = Date.now();
    
    // Clean old entries
    for (const [k, v] of attempts.entries()) {
      if (now - v.timestamp > windowMs) {
        attempts.delete(k);
      }
    }

    const userAttempts = attempts.get(key);
    
    if (userAttempts && userAttempts.count >= maxAttempts) {
      return next(
        new ErrorResponse(
          `Too many attempts. Please try again in ${Math.ceil(windowMs / 60000)} minutes.`,
          429
        )
      );
    }

    // Update attempts
    if (userAttempts) {
      userAttempts.count++;
    } else {
      attempts.set(key, { count: 1, timestamp: now });
    }

    next();
  };
};

/**
 * Verify phone number ownership for sensitive operations
 */
export const verifyPhoneOwnership = asyncHandler(async (req, res, next) => {
  const { phoneNumber } = req.body;
  const { user } = req;

  if (!phoneNumber) {
    return next(new ErrorResponse('Phone number is required', 400));
  }

  // Check if phone belongs to current user
  if (user.phoneNumber !== phoneNumber) {
    return next(new ErrorResponse('Phone number does not match your account', 403));
  }

  // Check if phone is verified
  if (!user.isPhoneVerified) {
    return next(new ErrorResponse('Phone number must be verified first', 403));
  }

  next();
});

/**
 * Check if user owns the resource (generic ownership check)
 */
export const checkOwnership = (Model, userField = 'user') => {
  return asyncHandler(async (req, res, next) => {
    const resource = await Model.findById(req.params.id);
    
    if (!resource) {
      return next(new ErrorResponse('Resource not found', 404));
    }

    // Admin can access all resources
    if (req.user.role === 'admin') {
      req.resource = resource;
      return next();
    }

    // Check ownership
    const resourceUserId = resource[userField]?.toString() || resource[userField];
    const currentUserId = req.user._id.toString();

    if (resourceUserId !== currentUserId) {
      return next(new ErrorResponse('Not authorized to access this resource', 403));
    }

    req.resource = resource;
    next();
  });
};