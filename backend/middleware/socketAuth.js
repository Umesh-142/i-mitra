import jwt from 'jsonwebtoken';
import User from '../models/User.js';

/**
 * Socket.IO Authentication Middleware
 * Authenticates socket connections using JWT tokens
 */
export const socketAuth = async (socket, next) => {
  try {
    let token;

    // Extract token from handshake auth or query
    if (socket.handshake.auth?.token) {
      token = socket.handshake.auth.token;
    } else if (socket.handshake.query?.token) {
      token = socket.handshake.query.token;
    } else if (socket.handshake.headers?.authorization) {
      // Extract from Authorization header
      const authHeader = socket.handshake.headers.authorization;
      if (authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7);
      }
    }

    if (!token) {
      return next(new Error('Authentication token required'));
    }

    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Get user from database
    const user = await User.findById(decoded.id).select('-password');
    
    if (!user) {
      return next(new Error('User not found'));
    }

    // Check if user is active
    if (!user.isActive) {
      return next(new Error('Account has been deactivated'));
    }

    // Check if password was changed after token was issued
    if (user.passwordChangedAt && decoded.iat < user.passwordChangedAt.getTime() / 1000) {
      return next(new Error('Password was recently changed. Please reconnect.'));
    }

    // Attach user to socket
    socket.user = user;
    
    console.log(`Socket authenticated: ${user.email} (${user.role})`.green);
    next();

  } catch (error) {
    console.error('Socket authentication error:', error.message);
    
    // Provide specific error messages
    let errorMessage = 'Authentication failed';
    
    if (error.name === 'JsonWebTokenError') {
      errorMessage = 'Invalid token';
    } else if (error.name === 'TokenExpiredError') {
      errorMessage = 'Token expired';
    } else if (error.message.includes('User not found')) {
      errorMessage = 'User not found';
    }
    
    next(new Error(errorMessage));
  }
};

/**
 * Socket.IO Authorization Middleware for Role-based Access
 */
export const socketAuthorize = (...roles) => {
  return (socket, next) => {
    if (!socket.user) {
      return next(new Error('User not authenticated'));
    }

    if (!roles.includes(socket.user.role)) {
      return next(new Error(`Role '${socket.user.role}' not authorized`));
    }

    next();
  };
};

/**
 * Socket.IO Department Authorization
 */
export const socketAuthorizeDepartment = (...departments) => {
  return (socket, next) => {
    if (!socket.user) {
      return next(new Error('User not authenticated'));
    }

    // Admin can access all departments
    if (socket.user.role === 'admin') {
      return next();
    }

    if (!socket.user.department || !departments.includes(socket.user.department)) {
      return next(new Error(`Department '${socket.user.department}' not authorized`));
    }

    next();
  };
};