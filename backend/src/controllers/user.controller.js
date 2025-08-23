const User = require('../models/user.model');
const Addon = require('../models/addon.model');
const stremioService = require('../services/stremio.service');

/**
 * Get all users
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getAllUsers = async (req, res) => {
  try {
    // For resellers, only return their users
    if (req.user.role === 'reseller') {
      const users = await User.find({ reseller: req.user.id })
        .select('-password')
        .populate('addons', 'name transportUrl');
      return res.json(users);
    }
    
    // For admins, return all users
    const users = await User.find()
      .select('-password')
      .populate('addons', 'name transportUrl')
      .populate('reseller', 'username email');
    
    res.json(users);
  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Get user by ID
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-password')
      .populate('addons', 'name transportUrl description')
      .populate('reseller', 'username email');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Check if reseller is trying to access a user that doesn't belong to them
    if (req.user.role === 'reseller' && user.reseller?.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    res.json(user);
  } catch (error) {
    console.error('Get user by ID error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Create a new user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.createUser = async (req, res) => {
  try {
    const { username, email, password, role, expiresAt } = req.body;
    
    // Check if user already exists
    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }
    
    // Create new user
    const user = new User({
      username,
      email,
      password,
      role: role || 'user',
      expiresAt: expiresAt || null
    });
    
    // If created by a reseller, set the reseller field
    if (req.user.role === 'reseller') {
      user.reseller = req.user.id;
      
      // Deduct credits from reseller
      const reseller = await User.findById(req.user.id);
      if (reseller.credits <= 0) {
        return res.status(400).json({ message: 'Insufficient credits' });
      }
      
      reseller.credits -= 1;
      await reseller.save();
    }
    
    await user.save();
    
    res.status(201).json({
      message: 'User created successfully',
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        expiresAt: user.expiresAt
      }
    });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Update a user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.updateUser = async (req, res) => {
  try {
    const { username, email, role, active, expiresAt } = req.body;
    const userId = req.params.id;
    
    // Find user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Check if reseller is trying to update a user that doesn't belong to them
    if (req.user.role === 'reseller' && user.reseller?.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    // Update user fields
    if (username) user.username = username;
    if (email) user.email = email;
    
    // Only admin can update role
    if (role && req.user.role === 'admin') {
      user.role = role;
    }
    
    // Update active status and expiration date
    if (active !== undefined) user.active = active;
    if (expiresAt) user.expiresAt = expiresAt;
    
    await user.save();
    
    res.json({
      message: 'User updated successfully',
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        active: user.active,
        expiresAt: user.expiresAt
      }
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Delete a user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.deleteUser = async (req, res) => {
  try {
    const userId = req.params.id;
    
    // Find user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Check if reseller is trying to delete a user that doesn't belong to them
    if (req.user.role === 'reseller' && user.reseller?.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    // Remove user from addons
    await Addon.updateMany(
      { users: userId },
      { $pull: { users: userId } }
    );
    
    // Delete user
    await User.findByIdAndDelete(userId);
    
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Assign addon to user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.assignAddon = async (req, res) => {
  try {
    const { userId, addonId } = req.body;
    
    // Find user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Check if reseller is trying to update a user that doesn't belong to them
    if (req.user.role === 'reseller' && user.reseller?.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    // Find addon
    const addon = await Addon.findById(addonId);
    if (!addon) {
      return res.status(404).json({ message: 'Addon not found' });
    }
    
    // Check if addon is already assigned to user
    if (user.addons.includes(addonId)) {
      return res.status(400).json({ message: 'Addon already assigned to user' });
    }
    
    // Add addon to user
    user.addons.push(addonId);
    await user.save();
    
    // Add user to addon
    addon.users.push(userId);
    await addon.save();
    
    // If user is synced with Stremio, update their addon collection
    if (user.stremioSynced && user.stremioAuthKey) {
      try {
        await stremioService.addAddonToUser(user.stremioAuthKey, addon.transportUrl);
      } catch (error) {
        console.error('Failed to sync addon with Stremio:', error);
        // Continue execution even if Stremio sync fails
      }
    }
    
    res.json({ 
      message: 'Addon assigned to user successfully',
      user: await User.findById(userId)
        .select('-password')
        .populate('addons', 'name transportUrl')
    });
  } catch (error) {
    console.error('Assign addon error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Remove addon from user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.removeAddon = async (req, res) => {
  try {
    const { userId, addonId } = req.params;
    
    // Find user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Check if reseller is trying to update a user that doesn't belong to them
    if (req.user.role === 'reseller' && user.reseller?.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    // Find addon
    const addon = await Addon.findById(addonId);
    if (!addon) {
      return res.status(404).json({ message: 'Addon not found' });
    }
    
    // Remove addon from user
    user.addons = user.addons.filter(a => a.toString() !== addonId);
    await user.save();
    
    // Remove user from addon
    addon.users = addon.users.filter(u => u.toString() !== userId);
    await addon.save();
    
    // If user is synced with Stremio, update their addon collection
    if (user.stremioSynced && user.stremioAuthKey) {
      try {
        await stremioService.removeAddonFromUser(user.stremioAuthKey, addon.transportUrl);
      } catch (error) {
        console.error('Failed to sync addon removal with Stremio:', error);
        // Continue execution even if Stremio sync fails
      }
    }
    
    res.json({ 
      message: 'Addon removed from user successfully',
      user: await User.findById(userId)
        .select('-password')
        .populate('addons', 'name transportUrl')
    });
  } catch (error) {
    console.error('Remove addon error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Sync user addons with Stremio
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.syncAddons = async (req, res) => {
  try {
    const userId = req.params.id;
    
    // Find user
    const user = await User.findById(userId).populate('addons');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Check if reseller is trying to update a user that doesn't belong to them
    if (req.user.role === 'reseller' && user.reseller?.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    // Check if user is synced with Stremio
    if (!user.stremioSynced || !user.stremioAuthKey) {
      return res.status(400).json({ message: 'User is not synced with Stremio' });
    }
    
    // Get transportUrls from user's addons
    const transportUrls = user.addons.map(addon => addon.transportUrl);
    
    // Sync addons with Stremio
    const syncResult = await stremioService.syncUserAddons(user.stremioAuthKey, transportUrls);
    
    res.json({ 
      message: 'Addons synced with Stremio successfully',
      result: syncResult,
      addons: user.addons.map(addon => ({
        id: addon._id,
        name: addon.name,
        transportUrl: addon.transportUrl
      }))
    });
  } catch (error) {
    console.error('Sync addons error:', error);
    res.status(500).json({ message: 'Server error: ' + error.message });
  }
};

/**
 * Get Stremio status for a user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getStremioStatus = async (req, res) => {
  try {
    const userId = req.params.id;
    
    // Find user
    const user = await User.findById(userId).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Check if reseller is trying to access a user that doesn't belong to them
    if (req.user.role === 'reseller' && user.reseller?.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    // If user is not synced with Stremio, return basic status
    if (!user.stremioSynced || !user.stremioAuthKey) {
      return res.json({
        synced: false,
        message: 'User is not synced with Stremio'
      });
    }
    
    // Try to get user data from Stremio to verify the auth key is still valid
    try {
      const stremioUser = await stremioService.getUser(user.stremioAuthKey);
      
      return res.json({
        synced: true,
        valid: true,
        stremioUserId: stremioUser._id,
        stremioEmail: stremioUser.email,
        message: 'User is synced with Stremio and the connection is valid'
      });
    } catch (error) {
      // If we get an error, the auth key might be invalid
      return res.json({
        synced: true,
        valid: false,
        message: 'User is synced with Stremio but the connection might be invalid',
        error: error.message
      });
    }
  } catch (error) {
    console.error('Get Stremio status error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};