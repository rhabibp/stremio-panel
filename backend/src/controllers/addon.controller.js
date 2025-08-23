const Addon = require('../models/addon.model');
const User = require('../models/user.model');
const stremioService = require('../services/stremio.service');

/**
 * Get all addons
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getAllAddons = async (req, res) => {
  try {
    let query = {};
    
    // For resellers, only return their addons or public addons
    if (req.user.role === 'reseller') {
      query = { 
        $or: [
          { creator: req.user.id },
          { public: true }
        ]
      };
    }
    
    // For regular users, only return their assigned addons or public addons
    if (req.user.role === 'user') {
      const user = await User.findById(req.user.id);
      query = {
        $or: [
          { _id: { $in: user.addons } },
          { public: true }
        ]
      };
    }
    
    const addons = await Addon.find(query)
      .populate('creator', 'username email')
      .populate('users', 'username email');
    
    res.json(addons);
  } catch (error) {
    console.error('Get all addons error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Get addon by ID
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getAddonById = async (req, res) => {
  try {
    const addon = await Addon.findById(req.params.id)
      .populate('creator', 'username email')
      .populate('users', 'username email');
    
    if (!addon) {
      return res.status(404).json({ message: 'Addon not found' });
    }
    
    // Check if user has access to this addon
    if (req.user.role === 'user') {
      const user = await User.findById(req.user.id);
      const hasAccess = user.addons.some(a => a.toString() === addon._id.toString());
      
      if (!hasAccess && !addon.public) {
        return res.status(403).json({ message: 'Access denied' });
      }
    }
    
    res.json(addon);
  } catch (error) {
    console.error('Get addon by ID error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Create a new addon
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.createAddon = async (req, res) => {
  try {
    const { 
      name, 
      description, 
      version, 
      transportUrl, 
      addonId,
      resources, 
      types, 
      public,
      config 
    } = req.body;
    
    // Check if addon URL already exists
    const existingAddon = await Addon.findOne({ transportUrl });
    if (existingAddon) {
      return res.status(400).json({ message: 'Addon with this URL already exists' });
    }
    
    // Validate the addon with Stremio
    let manifest;
    try {
      manifest = await stremioService.validateAddon(transportUrl);
    } catch (error) {
      return res.status(400).json({ 
        message: 'Invalid addon URL. Could not fetch manifest.',
        error: error.message
      });
    }
    
    // Create new addon
    const addon = new Addon({
      name: name || manifest.name,
      description: description || manifest.description || 'No description provided',
      version: version || manifest.version || '1.0.0',
      transportUrl,
      addonId: addonId || manifest.id,
      resources: resources || manifest.resources || [],
      types: types || manifest.types || [],
      creator: req.user.id,
      public: public || false,
      config: config || {},
      manifest,
      validated: true,
      lastValidated: new Date()
    });
    
    await addon.save();
    
    res.status(201).json({
      message: 'Addon created successfully',
      addon
    });
  } catch (error) {
    console.error('Create addon error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Update an addon
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.updateAddon = async (req, res) => {
  try {
    const { 
      name, 
      description, 
      version, 
      transportUrl, 
      resources, 
      types, 
      public,
      active,
      config 
    } = req.body;
    
    const addonId = req.params.id;
    
    // Find addon
    const addon = await Addon.findById(addonId);
    if (!addon) {
      return res.status(404).json({ message: 'Addon not found' });
    }
    
    // Check if user is the creator or admin
    if (addon.creator.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    // If transportUrl is changed, validate the new URL
    if (transportUrl && transportUrl !== addon.transportUrl) {
      try {
        const manifest = await stremioService.validateAddon(transportUrl);
        addon.manifest = manifest;
        addon.validated = true;
        addon.lastValidated = new Date();
        addon.transportUrl = transportUrl;
        
        // Update fields from manifest if not provided
        if (!name) addon.name = manifest.name;
        if (!description) addon.description = manifest.description || 'No description provided';
        if (!version) addon.version = manifest.version || '1.0.0';
        if (!resources) addon.resources = manifest.resources || [];
        if (!types) addon.types = manifest.types || [];
      } catch (error) {
        return res.status(400).json({ 
          message: 'Invalid addon URL. Could not fetch manifest.',
          error: error.message
        });
      }
    } else {
      // Update fields if provided
      if (name) addon.name = name;
      if (description) addon.description = description;
      if (version) addon.version = version;
      if (resources) addon.resources = resources;
      if (types) addon.types = types;
    }
    
    // Update other fields
    if (public !== undefined) addon.public = public;
    if (active !== undefined) addon.active = active;
    if (config) addon.config = { ...addon.config, ...config };
    
    await addon.save();
    
    // If addon was updated, sync with all users who have this addon
    if (addon.users.length > 0) {
      // Get all users with this addon who are synced with Stremio
      const users = await User.find({
        _id: { $in: addon.users },
        stremioSynced: true,
        stremioAuthKey: { $ne: null }
      });
      
      // Update addon for each user
      for (const user of users) {
        try {
          await stremioService.addAddonToUser(user.stremioAuthKey, addon.transportUrl);
        } catch (error) {
          console.error(`Failed to sync addon update for user ${user._id}:`, error);
          // Continue with next user even if one fails
        }
      }
    }
    
    res.json({
      message: 'Addon updated successfully',
      addon
    });
  } catch (error) {
    console.error('Update addon error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Delete an addon
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.deleteAddon = async (req, res) => {
  try {
    const addonId = req.params.id;
    
    // Find addon
    const addon = await Addon.findById(addonId);
    if (!addon) {
      return res.status(404).json({ message: 'Addon not found' });
    }
    
    // Check if user is the creator or admin
    if (addon.creator.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    // Before deleting, remove addon from all users
    if (addon.users.length > 0) {
      // Get all users with this addon
      const users = await User.find({
        _id: { $in: addon.users }
      });
      
      // Remove addon from each user
      for (const user of users) {
        user.addons = user.addons.filter(a => a.toString() !== addonId);
        await user.save();
        
        // If user is synced with Stremio, update their addon collection
        if (user.stremioSynced && user.stremioAuthKey) {
          try {
            await stremioService.removeAddonFromUser(user.stremioAuthKey, addon.transportUrl);
          } catch (error) {
            console.error(`Failed to sync addon removal for user ${user._id}:`, error);
            // Continue with next user even if one fails
          }
        }
      }
    }
    
    // Delete addon
    await Addon.findByIdAndDelete(addonId);
    
    res.json({ message: 'Addon deleted successfully' });
  } catch (error) {
    console.error('Delete addon error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Get users assigned to an addon
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getAddonUsers = async (req, res) => {
  try {
    const addonId = req.params.id;
    
    // Find addon
    const addon = await Addon.findById(addonId);
    if (!addon) {
      return res.status(404).json({ message: 'Addon not found' });
    }
    
    // Check if user is the creator, admin, or reseller with access
    if (addon.creator.toString() !== req.user.id && 
        req.user.role !== 'admin' && 
        !(req.user.role === 'reseller' && addon.public)) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    // Get users assigned to this addon
    const users = await User.find({ addons: addonId })
      .select('username email role stremioSynced')
      .populate('reseller', 'username email');
    
    res.json(users);
  } catch (error) {
    console.error('Get addon users error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Validate an addon by checking its manifest
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.validateAddon = async (req, res) => {
  try {
    const { transportUrl } = req.body;
    
    if (!transportUrl) {
      return res.status(400).json({ message: 'Transport URL is required' });
    }
    
    try {
      const manifest = await stremioService.validateAddon(transportUrl);
      
      res.json({
        valid: true,
        manifest,
        message: 'Addon validated successfully'
      });
    } catch (error) {
      res.status(400).json({
        valid: false,
        message: 'Invalid addon',
        error: error.message
      });
    }
  } catch (error) {
    console.error('Validate addon error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Sync addon with all assigned users
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.syncAddonWithUsers = async (req, res) => {
  try {
    const addonId = req.params.id;
    
    // Find addon
    const addon = await Addon.findById(addonId);
    if (!addon) {
      return res.status(404).json({ message: 'Addon not found' });
    }
    
    // Check if user is the creator or admin
    if (addon.creator.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    // Get all users with this addon who are synced with Stremio
    const users = await User.find({
      addons: addonId,
      stremioSynced: true,
      stremioAuthKey: { $ne: null }
    });
    
    const results = {
      total: users.length,
      successful: 0,
      failed: 0,
      errors: []
    };
    
    // Sync addon with each user
    for (const user of users) {
      try {
        await stremioService.addAddonToUser(user.stremioAuthKey, addon.transportUrl);
        results.successful++;
      } catch (error) {
        console.error(`Failed to sync addon for user ${user._id}:`, error);
        results.failed++;
        results.errors.push({
          userId: user._id,
          username: user.username,
          error: error.message
        });
      }
    }
    
    res.json({
      message: 'Addon sync process completed',
      results
    });
  } catch (error) {
    console.error('Sync addon with users error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Get official Stremio addons
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getOfficialAddons = async (req, res) => {
  try {
    // List of official Stremio addons
    const officialAddons = [
      {
        name: 'Cinemeta',
        description: 'The official addon for movie and series catalogs',
        transportUrl: 'https://v3-cinemeta.strem.io/manifest.json',
        addonId: 'com.linvo.cinemeta',
        resources: ['catalog', 'meta', 'addon_catalog'],
        types: ['movie', 'series']
      },
      {
        name: 'Stremio Channels',
        description: 'Watch YouTube channels within Stremio',
        transportUrl: 'https://v3-channels.strem.io/manifest.json',
        addonId: 'com.linvo.stremiochannels',
        resources: ['catalog', 'meta'],
        types: ['channel']
      },
      {
        name: 'WatchHub',
        description: 'Find where to watch movies and shows',
        transportUrl: 'https://watchhub.strem.io/manifest.json',
        addonId: 'org.stremio.watchhub',
        resources: ['stream'],
        types: ['movie', 'series']
      },
      {
        name: 'OpenSubtitles',
        description: 'The official addon for subtitles',
        transportUrl: 'https://v3-opensubs.strem.io/manifest.json',
        addonId: 'org.stremio.opensubtitles',
        resources: ['subtitles'],
        types: ['movie', 'series']
      }
    ];
    
    res.json(officialAddons);
  } catch (error) {
    console.error('Get official addons error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Import an official addon to the database
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.importOfficialAddon = async (req, res) => {
  try {
    const { transportUrl } = req.body;
    
    if (!transportUrl) {
      return res.status(400).json({ message: 'Transport URL is required' });
    }
    
    // Check if addon already exists
    const existingAddon = await Addon.findOne({ transportUrl });
    if (existingAddon) {
      return res.status(400).json({ message: 'Addon already exists in the database' });
    }
    
    // Validate the addon
    let manifest;
    try {
      manifest = await stremioService.validateAddon(transportUrl);
    } catch (error) {
      return res.status(400).json({ 
        message: 'Invalid addon URL. Could not fetch manifest.',
        error: error.message
      });
    }
    
    // Create new addon
    const addon = new Addon({
      name: manifest.name,
      description: manifest.description || 'No description provided',
      version: manifest.version || '1.0.0',
      transportUrl,
      addonId: manifest.id,
      resources: manifest.resources || [],
      types: manifest.types || [],
      creator: req.user.id,
      public: true, // Official addons are public by default
      manifest,
      validated: true,
      lastValidated: new Date()
    });
    
    await addon.save();
    
    res.status(201).json({
      message: 'Official addon imported successfully',
      addon
    });
  } catch (error) {
    console.error('Import official addon error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};