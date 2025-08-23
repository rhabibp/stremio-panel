/**
 * PIN Authentication Controller
 * 
 * Handles PIN-related API requests
 */

const PinService = require('../services/pin.service');
const StremioService = require('../../../backend/src/services/stremio.service');

/**
 * Generate a new PIN for authentication
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.generatePin = async (req, res) => {
  try {
    const { expiryMinutes } = req.body;
    
    // Generate PIN with optional expiry time (default: 10 minutes)
    const pinData = await PinService.generatePin(expiryMinutes || 10);
    
    res.json({
      success: true,
      data: pinData
    });
  } catch (error) {
    console.error('Error generating PIN:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate PIN',
      error: error.message
    });
  }
};

/**
 * Verify a PIN with Stremio authentication
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.verifyPin = async (req, res) => {
  try {
    const { pin, stremioAuthKey } = req.body;
    
    // Get device info from request
    const deviceInfo = {
      userAgent: req.headers['user-agent'],
      ip: req.ip,
      timestamp: new Date()
    };
    
    // Verify PIN
    const result = await PinService.verifyPin(pin, stremioAuthKey, deviceInfo);
    
    res.json({
      success: true,
      message: 'PIN verified successfully',
      data: result
    });
  } catch (error) {
    console.error('Error verifying PIN:', error);
    res.status(400).json({
      success: false,
      message: 'Failed to verify PIN',
      error: error.message
    });
  }
};

/**
 * Check PIN status and get authentication token if verified
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.checkPinStatus = async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    // Check PIN status
    const result = await PinService.checkPinStatus(sessionId);
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error checking PIN status:', error);
    res.status(400).json({
      success: false,
      message: 'Failed to check PIN status',
      error: error.message
    });
  }
};

/**
 * Get PIN statistics
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getPinStats = async (req, res) => {
  try {
    const stats = await PinService.getPinStats();
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error getting PIN stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get PIN statistics',
      error: error.message
    });
  }
};

/**
 * Clean up expired PINs
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.cleanupExpiredPins = async (req, res) => {
  try {
    const deletedCount = await PinService.cleanupExpiredPins();
    
    res.json({
      success: true,
      message: `Cleaned up ${deletedCount} expired PINs`,
      deletedCount
    });
  } catch (error) {
    console.error('Error cleaning up expired PINs:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to clean up expired PINs',
      error: error.message
    });
  }
};

/**
 * Login with Stremio credentials and generate PIN
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.loginWithStremio = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Login to Stremio
    const stremioData = await StremioService.login({
      email,
      password
    });
    
    // Generate PIN
    const pinData = await PinService.generatePin(10);
    
    res.json({
      success: true,
      message: 'Stremio login successful',
      data: {
        stremio: {
          authKey: stremioData.authKey,
          user: {
            id: stremioData.user._id,
            email: stremioData.user.email
          }
        },
        pin: pinData
      }
    });
  } catch (error) {
    console.error('Error logging in with Stremio:', error);
    res.status(401).json({
      success: false,
      message: 'Failed to login with Stremio',
      error: error.message
    });
  }
};