const User = require('../models/user.model');

/**
 * Get all resellers
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getAllResellers = async (req, res) => {
  try {
    const resellers = await User.find({ role: 'reseller' })
      .select('-password')
      .populate({
        path: 'addons',
        select: 'name addonId'
      });
    
    res.json(resellers);
  } catch (error) {
    console.error('Get all resellers error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Get reseller by ID
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getResellerById = async (req, res) => {
  try {
    const reseller = await User.findOne({ 
      _id: req.params.id,
      role: 'reseller'
    })
    .select('-password')
    .populate({
      path: 'addons',
      select: 'name addonId description'
    });
    
    if (!reseller) {
      return res.status(404).json({ message: 'Reseller not found' });
    }
    
    res.json(reseller);
  } catch (error) {
    console.error('Get reseller by ID error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Create a new reseller
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.createReseller = async (req, res) => {
  try {
    const { username, email, password, credits } = req.body;
    
    // Check if user already exists
    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }
    
    // Create new reseller
    const reseller = new User({
      username,
      email,
      password,
      role: 'reseller',
      credits: credits || 0
    });
    
    await reseller.save();
    
    res.status(201).json({
      message: 'Reseller created successfully',
      reseller: {
        id: reseller._id,
        username: reseller.username,
        email: reseller.email,
        role: reseller.role,
        credits: reseller.credits
      }
    });
  } catch (error) {
    console.error('Create reseller error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Update a reseller
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.updateReseller = async (req, res) => {
  try {
    const { username, email, credits, active } = req.body;
    const resellerId = req.params.id;
    
    // Find reseller
    const reseller = await User.findOne({ 
      _id: resellerId,
      role: 'reseller'
    });
    
    if (!reseller) {
      return res.status(404).json({ message: 'Reseller not found' });
    }
    
    // Update reseller fields
    if (username) reseller.username = username;
    if (email) reseller.email = email;
    if (credits !== undefined) reseller.credits = credits;
    if (active !== undefined) reseller.active = active;
    
    await reseller.save();
    
    res.json({
      message: 'Reseller updated successfully',
      reseller: {
        id: reseller._id,
        username: reseller.username,
        email: reseller.email,
        role: reseller.role,
        credits: reseller.credits,
        active: reseller.active
      }
    });
  } catch (error) {
    console.error('Update reseller error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Delete a reseller
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.deleteReseller = async (req, res) => {
  try {
    const resellerId = req.params.id;
    
    // Find reseller
    const reseller = await User.findOne({ 
      _id: resellerId,
      role: 'reseller'
    });
    
    if (!reseller) {
      return res.status(404).json({ message: 'Reseller not found' });
    }
    
    // Update all users assigned to this reseller
    await User.updateMany(
      { reseller: resellerId },
      { reseller: null }
    );
    
    // Delete reseller
    await User.findByIdAndDelete(resellerId);
    
    res.json({ message: 'Reseller deleted successfully' });
  } catch (error) {
    console.error('Delete reseller error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Add credits to a reseller
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.addCredits = async (req, res) => {
  try {
    const { credits } = req.body;
    const resellerId = req.params.id;
    
    if (!credits || credits <= 0) {
      return res.status(400).json({ message: 'Invalid credits amount' });
    }
    
    // Find reseller
    const reseller = await User.findOne({ 
      _id: resellerId,
      role: 'reseller'
    });
    
    if (!reseller) {
      return res.status(404).json({ message: 'Reseller not found' });
    }
    
    // Add credits
    reseller.credits += credits;
    await reseller.save();
    
    res.json({
      message: 'Credits added successfully',
      reseller: {
        id: reseller._id,
        username: reseller.username,
        email: reseller.email,
        credits: reseller.credits
      }
    });
  } catch (error) {
    console.error('Add credits error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Get users assigned to a reseller
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getResellerUsers = async (req, res) => {
  try {
    const resellerId = req.params.id;
    
    // Find reseller
    const reseller = await User.findOne({ 
      _id: resellerId,
      role: 'reseller'
    });
    
    if (!reseller) {
      return res.status(404).json({ message: 'Reseller not found' });
    }
    
    // Check if current user is the reseller or an admin
    if (req.user.role !== 'admin' && req.user.id !== resellerId) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    // Get users assigned to this reseller
    const users = await User.find({ reseller: resellerId })
      .select('-password')
      .populate('addons', 'name addonId');
    
    res.json(users);
  } catch (error) {
    console.error('Get reseller users error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Get reseller statistics
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getResellerStats = async (req, res) => {
  try {
    const resellerId = req.params.id || req.user.id;
    
    // Find reseller
    const reseller = await User.findOne({ 
      _id: resellerId,
      role: 'reseller'
    });
    
    if (!reseller) {
      return res.status(404).json({ message: 'Reseller not found' });
    }
    
    // Check if current user is the reseller or an admin
    if (req.user.role !== 'admin' && req.user.id !== resellerId) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    // Get users count
    const totalUsers = await User.countDocuments({ reseller: resellerId });
    
    // Get active users count
    const activeUsers = await User.countDocuments({ 
      reseller: resellerId,
      active: true,
      $or: [
        { expiresAt: null },
        { expiresAt: { $gt: new Date() } }
      ]
    });
    
    // Get expired users count
    const expiredUsers = await User.countDocuments({ 
      reseller: resellerId,
      expiresAt: { $lte: new Date() }
    });
    
    // Get users with Stremio sync
    const syncedUsers = await User.countDocuments({ 
      reseller: resellerId,
      stremioSynced: true
    });
    
    // Get users created in the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const newUsers = await User.countDocuments({ 
      reseller: resellerId,
      createdAt: { $gte: thirtyDaysAgo }
    });
    
    res.json({
      resellerId,
      username: reseller.username,
      email: reseller.email,
      credits: reseller.credits,
      stats: {
        totalUsers,
        activeUsers,
        expiredUsers,
        syncedUsers,
        newUsers
      }
    });
  } catch (error) {
    console.error('Get reseller stats error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};