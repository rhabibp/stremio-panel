const jwt = require('jsonwebtoken');
const User = require('../models/user.model');
const config = require('../config/config');

/**
 * Middleware to authenticate users based on JWT token
 */
exports.authenticate = async (req, res, next) => {
  try {
    // Get token from header
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ message: 'No token, authorization denied' });
    }

    // Verify token
    const decoded = jwt.verify(token, config.jwtSecret);
    
    // Find user by id
    const user = await User.findById(decoded.id).select('-password');
    
    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }

    // Add user to request object
    req.user = user;
    next();
  } catch (error) {
    console.error('Authentication error:', error.message);
    return res.status(401).json({ message: 'Token is not valid' });
  }
};

/**
 * Middleware to check if user is an admin
 */
exports.isAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({ message: 'Access denied. Admin role required.' });
  }
};

/**
 * Middleware to check if user is a reseller or admin
 */
exports.isResellerOrAdmin = (req, res, next) => {
  if (req.user && (req.user.role === 'reseller' || req.user.role === 'admin')) {
    next();
  } else {
    res.status(403).json({ message: 'Access denied. Reseller or Admin role required.' });
  }
};