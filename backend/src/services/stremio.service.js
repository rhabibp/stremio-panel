const axios = require('axios');
const config = require('../config/config');

class StremioService {
  constructor() {
    this.apiClient = axios.create({
      baseURL: config.stremioApiUrl,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }

  /**
   * Login to Stremio API
   * @param {Object} credentials - User credentials
   * @param {string} credentials.email - User email
   * @param {string} credentials.password - User password
   * @returns {Promise<Object>} - Stremio user data with authKey
   */
  async login(credentials) {
    try {
      const response = await this.apiClient.post('/api/login', credentials);
      return response.data.result;
    } catch (error) {
      console.error('Stremio login error:', error.response?.data || error.message);
      throw new Error(error.response?.data?.error || 'Failed to login to Stremio');
    }
  }

  /**
   * Register a new user on Stremio
   * @param {Object} userData - User data
   * @param {string} userData.email - User email
   * @param {string} userData.password - User password
   * @returns {Promise<Object>} - Stremio user data with authKey
   */
  async register(userData) {
    try {
      const response = await this.apiClient.post('/api/register', userData);
      return response.data.result;
    } catch (error) {
      console.error('Stremio register error:', error.response?.data || error.message);
      throw new Error(error.response?.data?.error || 'Failed to register on Stremio');
    }
  }

  /**
   * Get user data from Stremio
   * @param {string} authKey - Stremio authentication key
   * @returns {Promise<Object>} - Stremio user data
   */
  async getUser(authKey) {
    try {
      const response = await this.apiClient.post('/api/getUser', { authKey });
      return response.data.result;
    } catch (error) {
      console.error('Stremio getUser error:', error.response?.data || error.message);
      throw new Error(error.response?.data?.error || 'Failed to get user from Stremio');
    }
  }

  /**
   * Save user data to Stremio
   * @param {string} authKey - Stremio authentication key
   * @param {Object} userData - User data to save
   * @returns {Promise<Object>} - Updated Stremio user data
   */
  async saveUser(authKey, userData) {
    try {
      const response = await this.apiClient.post('/api/saveUser', { 
        authKey,
        ...userData
      });
      return response.data.result;
    } catch (error) {
      console.error('Stremio saveUser error:', error.response?.data || error.message);
      throw new Error(error.response?.data?.error || 'Failed to save user to Stremio');
    }
  }

  /**
   * Get addon collection for a user
   * @param {string} authKey - Stremio authentication key
   * @returns {Promise<Object>} - Addon collection data
   */
  async getAddonCollection(authKey) {
    try {
      const response = await this.apiClient.post('/api/addonCollectionGet', { 
        authKey,
        update: true
      });
      return response.data.result;
    } catch (error) {
      console.error('Stremio getAddonCollection error:', error.response?.data || error.message);
      throw new Error(error.response?.data?.error || 'Failed to get addon collection from Stremio');
    }
  }

  /**
   * Set addon collection for a user
   * @param {string} authKey - Stremio authentication key
   * @param {Array} addons - Array of addon descriptors
   * @returns {Promise<Object>} - Result of operation
   */
  async setAddonCollection(authKey, addons) {
    try {
      const response = await this.apiClient.post('/api/addonCollectionSet', { 
        authKey,
        addons
      });
      return response.data.result;
    } catch (error) {
      console.error('Stremio setAddonCollection error:', error.response?.data || error.message);
      throw new Error(error.response?.data?.error || 'Failed to set addon collection on Stremio');
    }
  }

  /**
   * Validate an addon by fetching its manifest
   * @param {string} transportUrl - The URL of the addon
   * @returns {Promise<Object>} - Addon manifest data
   */
  async validateAddon(transportUrl) {
    try {
      // Fetch the manifest from the transportUrl
      const response = await axios.get(transportUrl);
      
      if (!response.data || !response.data.id || !response.data.name) {
        throw new Error('Invalid addon manifest');
      }
      
      return response.data;
    } catch (error) {
      console.error('Addon validation error:', error.message);
      throw new Error(`Failed to validate addon: ${error.message}`);
    }
  }

  /**
   * Add an addon to a user's collection
   * @param {string} authKey - Stremio authentication key
   * @param {string} transportUrl - The URL of the addon to add
   * @returns {Promise<boolean>} - Success status
   */
  async addAddonToUser(authKey, transportUrl) {
    try {
      // Get current addon collection
      const collection = await this.getAddonCollection(authKey);
      
      // Check if addon already exists in collection
      const addonExists = collection.addons.some(addon => 
        addon.transportUrl === transportUrl
      );
      
      if (addonExists) {
        return true; // Addon already in collection
      }
      
      // Add the new addon
      const updatedAddons = [
        ...collection.addons,
        {
          transportUrl,
          transportName: 'http'
        }
      ];
      
      // Update the collection
      await this.setAddonCollection(authKey, updatedAddons);
      return true;
    } catch (error) {
      console.error('Add addon to user error:', error.message);
      throw new Error(`Failed to add addon to user: ${error.message}`);
    }
  }

  /**
   * Remove an addon from a user's collection
   * @param {string} authKey - Stremio authentication key
   * @param {string} transportUrl - The URL of the addon to remove
   * @returns {Promise<boolean>} - Success status
   */
  async removeAddonFromUser(authKey, transportUrl) {
    try {
      // Get current addon collection
      const collection = await this.getAddonCollection(authKey);
      
      // Filter out the addon to remove
      const updatedAddons = collection.addons.filter(addon => 
        addon.transportUrl !== transportUrl
      );
      
      // If no addons were removed, return early
      if (updatedAddons.length === collection.addons.length) {
        return true; // Addon wasn't in collection
      }
      
      // Update the collection
      await this.setAddonCollection(authKey, updatedAddons);
      return true;
    } catch (error) {
      console.error('Remove addon from user error:', error.message);
      throw new Error(`Failed to remove addon from user: ${error.message}`);
    }
  }

  /**
   * Sync all addons for a user
   * @param {string} authKey - Stremio authentication key
   * @param {Array<string>} transportUrls - Array of addon transportUrls to sync
   * @returns {Promise<Object>} - Result with success count and errors
   */
  async syncUserAddons(authKey, transportUrls) {
    try {
      // Get current addon collection
      const collection = await this.getAddonCollection(authKey);
      
      // Create a set of current transportUrls for quick lookup
      const currentUrls = new Set(
        collection.addons.map(addon => addon.transportUrl)
      );
      
      // Create updated addons array starting with current addons
      const updatedAddons = [...collection.addons];
      
      // Add new addons that aren't already in the collection
      let addedCount = 0;
      for (const url of transportUrls) {
        if (!currentUrls.has(url)) {
          updatedAddons.push({
            transportUrl: url,
            transportName: 'http'
          });
          addedCount++;
        }
      }
      
      // If no changes, return early
      if (addedCount === 0) {
        return { 
          success: true, 
          message: 'No new addons to sync',
          addedCount: 0
        };
      }
      
      // Update the collection
      await this.setAddonCollection(authKey, updatedAddons);
      
      return {
        success: true,
        message: `Successfully synced ${addedCount} new addons`,
        addedCount
      };
    } catch (error) {
      console.error('Sync user addons error:', error.message);
      throw new Error(`Failed to sync user addons: ${error.message}`);
    }
  }
}

module.exports = new StremioService();