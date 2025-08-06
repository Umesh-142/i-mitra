const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * Socket.io authentication middleware
 */
const socketAuth = async (socket, next) => {
  try {
    // Get token from handshake auth
    const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return next(new Error('Authentication error: No token provided'));
    }
    
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Get user from database
    const user = await User.findById(decoded.id).select('-password');
    
    if (!user) {
      return next(new Error('Authentication error: User not found'));
    }
    
    if (!user.isActive) {
      return next(new Error('Authentication error: User account deactivated'));
    }
    
    // Add user to socket
    socket.user = user;
    next();
    
  } catch (error) {
    console.error('Socket auth error:', error);
    next(new Error('Authentication error: Invalid token'));
  }
};

module.exports = {
  socketAuth
};