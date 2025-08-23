const jwt = require('jsonwebtoken');
const User = require('../models/user.model');
const stremioService = require('../services/stremio.service');
const config = require('../config/config');

/**
 * Register a new user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.register = async (req, res) => {
  try {
    const { username, email, password, role } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Create user in our database
    const user = new User({
      username,
      email,
      password,
      role: role || 'user'
    });

    await user.save();

    // Generate JWT token
    const token = jwt.sign(
      { id: user._id, role: user.role },
      config.jwtSecret,
      { expiresIn: config.jwtExpiresIn }
    );

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Server error during registration' });
  }
};

/**
 * Login a user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;

    // Find user by username
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Check if password is correct
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Check if user is active
    if (!user.active) {
      return res.status(401).json({ message: 'Account is deactivated' });
    }

    // Check if user account has expired
    if (user.expiresAt && new Date(user.expiresAt) < new Date()) {
      return res.status(401).json({ message: 'Account has expired' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: user._id, role: user.role },
      config.jwtSecret,
      { expiresIn: config.jwtExpiresIn }
    );

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        stremioSynced: user.stremioSynced
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error during login' });
  }
};

/**
 * Sync user with Stremio
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.syncWithStremio = async (req, res) => {
  try {
    const { stremioEmail, stremioPassword } = req.body;
    const userId = req.user.id;

    // Login to Stremio
    const stremioData = await stremioService.login({
      email: stremioEmail,
      password: stremioPassword
    });

    // Update user with Stremio data
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      {
        stremioAuthKey: stremioData.authKey,
        stremioUserId: stremioData.user._id,
        stremioSynced: true
      },
      { new: true }
    );

    res.json({
      message: 'User synced with Stremio successfully',
      user: {
        id: updatedUser._id,
        username: updatedUser.username,
        email: updatedUser.email,
        role: updatedUser.role,
        stremioSynced: updatedUser.stremioSynced
      }
    });
  } catch (error) {
    console.error('Stremio sync error:', error);
    res.status(500).json({ message: 'Failed to sync with Stremio: ' + error.message });
  }
};

/**
 * Register a new user on Stremio
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.registerOnStremio = async (req, res) => {
  try {
    const { email, password } = req.body;
    const userId = req.user.id;

    // Register on Stremio
    const stremioData = await stremioService.register({
      email,
      password
    });

    // Update user with Stremio data
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      {
        stremioAuthKey: stremioData.authKey,
        stremioUserId: stremioData.user._id,
        stremioSynced: true
      },
      { new: true }
    );

    res.json({
      message: 'User registered on Stremio successfully',
      user: {
        id: updatedUser._id,
        username: updatedUser.username,
        email: updatedUser.email,
        role: updatedUser.role,
        stremioSynced: updatedUser.stremioSynced
      }
    });
  } catch (error) {
    console.error('Stremio registration error:', error);
    res.status(500).json({ message: 'Failed to register on Stremio: ' + error.message });
  }
};

/**
 * Get current user profile
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};