/**
 * Proxy Controller
 * 
 * Handles proxy-related API requests
 */

const ProxyService = require('../services/proxy.service');

/**
 * Get all proxies
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getAllProxies = async (req, res) => {
  try {
    const { active } = req.query;
    const filter = {};
    
    if (active !== undefined) {
      filter.active = active === 'true';
    }
    
    const proxies = await ProxyService.getAllProxies(filter);
    
    res.json({
      success: true,
      data: proxies
    });
  } catch (error) {
    console.error('Error getting proxies:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get proxies',
      error: error.message
    });
  }
};

/**
 * Get a proxy by ID
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getProxyById = async (req, res) => {
  try {
    const { id } = req.params;
    const proxy = await ProxyService.getProxyById(id);
    
    if (!proxy) {
      return res.status(404).json({
        success: false,
        message: 'Proxy not found'
      });
    }
    
    res.json({
      success: true,
      data: proxy
    });
  } catch (error) {
    console.error('Error getting proxy:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get proxy',
      error: error.message
    });
  }
};

/**
 * Create a new proxy
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.createProxy = async (req, res) => {
  try {
    const proxyData = req.body;
    const userId = req.user.id;
    
    // Validate required fields
    if (!proxyData.name || !proxyData.target || !proxyData.path) {
      return res.status(400).json({
        success: false,
        message: 'Name, target, and path are required'
      });
    }
    
    // Create proxy
    const proxy = await ProxyService.createProxy(proxyData, userId);
    
    res.status(201).json({
      success: true,
      message: 'Proxy created successfully',
      data: proxy
    });
  } catch (error) {
    console.error('Error creating proxy:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create proxy',
      error: error.message
    });
  }
};

/**
 * Update a proxy
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.updateProxy = async (req, res) => {
  try {
    const { id } = req.params;
    const proxyData = req.body;
    
    // Update proxy
    const proxy = await ProxyService.updateProxy(id, proxyData);
    
    res.json({
      success: true,
      message: 'Proxy updated successfully',
      data: proxy
    });
  } catch (error) {
    console.error('Error updating proxy:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update proxy',
      error: error.message
    });
  }
};

/**
 * Delete a proxy
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.deleteProxy = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Delete proxy
    await ProxyService.deleteProxy(id);
    
    res.json({
      success: true,
      message: 'Proxy deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting proxy:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete proxy',
      error: error.message
    });
  }
};

/**
 * Get proxy statistics
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getProxyStats = async (req, res) => {
  try {
    const stats = await ProxyService.getProxyStats();
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error getting proxy stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get proxy statistics',
      error: error.message
    });
  }
};

/**
 * Test a proxy configuration
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.testProxy = async (req, res) => {
  try {
    const proxyConfig = req.body;
    
    // Validate required fields
    if (!proxyConfig.target) {
      return res.status(400).json({
        success: false,
        message: 'Target URL is required'
      });
    }
    
    // Test proxy
    const testResult = await ProxyService.testProxy(proxyConfig);
    
    res.json({
      success: true,
      data: testResult
    });
  } catch (error) {
    console.error('Error testing proxy:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to test proxy',
      error: error.message
    });
  }
};