/**
 * Proxy Service
 * 
 * Provides functionality for managing and using proxies
 */

const Proxy = require('../models/proxy.model');
const cache = require('memory-cache');

class ProxyService {
  /**
   * Get a proxy configuration by path
   * @param {string} path - The proxy path
   * @returns {Promise<Object>} - The proxy configuration
   */
  async getProxyForTarget(path) {
    // Check cache first
    const cacheKey = `proxy:${path}`;
    const cachedProxy = cache.get(cacheKey);
    
    if (cachedProxy) {
      return cachedProxy;
    }
    
    // Find active proxy for the path
    const proxy = await Proxy.findOne({ path, active: true });
    
    if (!proxy) {
      return null;
    }
    
    // Convert to plain object
    const proxyConfig = proxy.toObject();
    
    // Cache for 5 minutes
    cache.put(cacheKey, proxyConfig, 5 * 60 * 1000);
    
    return proxyConfig;
  }
  
  /**
   * Record proxy usage
   * @param {string} path - The proxy path
   * @returns {Promise<void>}
   */
  async recordProxyUsage(path) {
    await Proxy.updateOne(
      { path },
      { 
        $inc: { 'usageStats.totalRequests': 1 },
        $set: { 'usageStats.lastUsed': new Date() }
      }
    );
  }
  
  /**
   * Create a new proxy configuration
   * @param {Object} proxyData - The proxy data
   * @param {string} userId - The ID of the user creating the proxy
   * @returns {Promise<Object>} - The created proxy
   */
  async createProxy(proxyData, userId) {
    const proxy = new Proxy({
      ...proxyData,
      createdBy: userId
    });
    
    await proxy.save();
    
    // Clear cache for this path
    cache.del(`proxy:${proxy.path}`);
    
    return proxy;
  }
  
  /**
   * Update a proxy configuration
   * @param {string} proxyId - The ID of the proxy to update
   * @param {Object} proxyData - The updated proxy data
   * @returns {Promise<Object>} - The updated proxy
   */
  async updateProxy(proxyId, proxyData) {
    const proxy = await Proxy.findById(proxyId);
    
    if (!proxy) {
      throw new Error('Proxy not found');
    }
    
    // Clear cache for old path
    cache.del(`proxy:${proxy.path}`);
    
    // Update proxy
    Object.assign(proxy, proxyData);
    await proxy.save();
    
    // Clear cache for new path
    cache.del(`proxy:${proxy.path}`);
    
    return proxy;
  }
  
  /**
   * Delete a proxy configuration
   * @param {string} proxyId - The ID of the proxy to delete
   * @returns {Promise<boolean>} - Success status
   */
  async deleteProxy(proxyId) {
    const proxy = await Proxy.findById(proxyId);
    
    if (!proxy) {
      throw new Error('Proxy not found');
    }
    
    // Clear cache
    cache.del(`proxy:${proxy.path}`);
    
    await Proxy.deleteOne({ _id: proxyId });
    
    return true;
  }
  
  /**
   * Get all proxy configurations
   * @param {Object} filter - Filter criteria
   * @returns {Promise<Array>} - Array of proxy configurations
   */
  async getAllProxies(filter = {}) {
    return Proxy.find(filter).sort({ createdAt: -1 });
  }
  
  /**
   * Get proxy usage statistics
   * @returns {Promise<Object>} - Proxy usage statistics
   */
  async getProxyStats() {
    const stats = await Proxy.aggregate([
      {
        $group: {
          _id: null,
          totalProxies: { $sum: 1 },
          activeProxies: { $sum: { $cond: ['$active', 1, 0] } },
          totalRequests: { $sum: '$usageStats.totalRequests' }
        }
      }
    ]);
    
    const topProxies = await Proxy.find()
      .sort({ 'usageStats.totalRequests': -1 })
      .limit(5)
      .select('name path usageStats');
    
    return {
      summary: stats.length > 0 ? stats[0] : { totalProxies: 0, activeProxies: 0, totalRequests: 0 },
      topProxies
    };
  }
  
  /**
   * Test a proxy configuration
   * @param {Object} proxyConfig - The proxy configuration to test
   * @returns {Promise<Object>} - Test results
   */
  async testProxy(proxyConfig) {
    try {
      const axios = require('axios');
      
      const response = await axios({
        method: 'GET',
        url: proxyConfig.target,
        timeout: 5000,
        headers: proxyConfig.headers || {},
        ...(proxyConfig.auth?.username && {
          auth: {
            username: proxyConfig.auth.username,
            password: proxyConfig.auth.password
          }
        })
      });
      
      return {
        success: true,
        statusCode: response.status,
        contentType: response.headers['content-type'],
        responseTime: response.headers['x-response-time'] || 'unknown'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        statusCode: error.response?.status || 'unknown'
      };
    }
  }
}

module.exports = new ProxyService();