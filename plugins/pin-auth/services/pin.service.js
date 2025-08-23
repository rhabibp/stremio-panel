/**
 * PIN Authentication Service
 * 
 * Provides functionality for PIN-based authentication
 */

const Pin = require('../models/pin.model');
const User = require('../../../backend/src/models/user.model');
const { v4: uuidv4 } = require('uuid');
const QRCode = require('qrcode');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const config = require('../../../backend/src/config/config');

class PinAuthService {
  /**
   * Generate a new PIN for authentication
   * @param {number} expiryMinutes - Minutes until PIN expires
   * @returns {Promise<Object>} - PIN data with QR code
   */
  async generatePin(expiryMinutes = 10) {
    // Generate a random 6-digit PIN
    const pin = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Generate a unique session ID
    const sessionId = uuidv4();
    
    // Calculate expiry time
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + expiryMinutes);
    
    // Create PIN document
    const pinDoc = new Pin({
      pin,
      sessionId,
      expiresAt,
      status: 'pending'
    });
    
    await pinDoc.save();
    
    // Generate QR code with the PIN
    const qrData = JSON.stringify({
      pin,
      sessionId,
      expiresAt: expiresAt.toISOString()
    });
    
    const qrCodeDataUrl = await QRCode.toDataURL(qrData);
    
    return {
      pin,
      sessionId,
      expiresAt,
      qrCode: qrCodeDataUrl
    };
  }
  
  /**
   * Verify a PIN with Stremio authentication
   * @param {string} pin - The PIN to verify
   * @param {string} stremioAuthKey - Stremio authentication key
   * @param {Object} deviceInfo - Device information
   * @returns {Promise<Object>} - Verification result
   */
  async verifyPin(pin, stremioAuthKey, deviceInfo = {}) {
    // Find the PIN document
    const pinDoc = await Pin.findOne({ pin, status: 'pending' });
    
    if (!pinDoc) {
      throw new Error('Invalid or expired PIN');
    }
    
    if (pinDoc.isExpired()) {
      await pinDoc.markAsExpired();
      throw new Error('PIN has expired');
    }
    
    // Find or create user based on Stremio auth key
    let user = await User.findOne({ stremioAuthKey });
    
    if (!user) {
      // Create a new user with the Stremio auth key
      const username = `stremio_${crypto.randomBytes(4).toString('hex')}`;
      const email = `${username}@stremio.user`;
      const password = crypto.randomBytes(16).toString('hex');
      
      user = new User({
        username,
        email,
        password,
        role: 'user',
        stremioAuthKey,
        stremioSynced: true
      });
      
      await user.save();
    }
    
    // Update the PIN document
    await pinDoc.verify(user._id, deviceInfo);
    
    return {
      success: true,
      message: 'PIN verified successfully',
      sessionId: pinDoc.sessionId,
      userId: user._id
    };
  }
  
  /**
   * Check PIN status and get authentication token if verified
   * @param {string} sessionId - The session ID
   * @returns {Promise<Object>} - PIN status and token if verified
   */
  async checkPinStatus(sessionId) {
    const pinDoc = await Pin.findOne({ sessionId }).populate('userId');
    
    if (!pinDoc) {
      throw new Error('Invalid session ID');
    }
    
    if (pinDoc.isExpired()) {
      await pinDoc.markAsExpired();
      return {
        status: 'expired',
        message: 'PIN has expired'
      };
    }
    
    if (pinDoc.status === 'pending') {
      return {
        status: 'pending',
        message: 'Waiting for PIN verification'
      };
    }
    
    if (pinDoc.status === 'verified') {
      // Generate JWT token
      const token = jwt.sign(
        { id: pinDoc.userId._id, role: pinDoc.userId.role },
        config.jwtSecret,
        { expiresIn: config.jwtExpiresIn }
      );
      
      // Mark PIN as used
      await pinDoc.markAsUsed();
      
      return {
        status: 'verified',
        message: 'PIN verified successfully',
        token,
        user: {
          id: pinDoc.userId._id,
          username: pinDoc.userId.username,
          email: pinDoc.userId.email,
          role: pinDoc.userId.role
        }
      };
    }
    
    return {
      status: pinDoc.status,
      message: `PIN status: ${pinDoc.status}`
    };
  }
  
  /**
   * Get PIN statistics
   * @returns {Promise<Object>} - PIN statistics
   */
  async getPinStats() {
    const totalPins = await Pin.countDocuments();
    const pendingPins = await Pin.countDocuments({ status: 'pending' });
    const verifiedPins = await Pin.countDocuments({ status: 'verified' });
    const usedPins = await Pin.countDocuments({ status: 'used' });
    const expiredPins = await Pin.countDocuments({ status: 'expired' });
    
    const recentPins = await Pin.find()
      .sort({ createdAt: -1 })
      .limit(10)
      .select('pin status createdAt expiresAt');
    
    return {
      total: totalPins,
      pending: pendingPins,
      verified: verifiedPins,
      used: usedPins,
      expired: expiredPins,
      recentPins
    };
  }
  
  /**
   * Clean up expired PINs
   * @returns {Promise<number>} - Number of deleted PINs
   */
  async cleanupExpiredPins() {
    const result = await Pin.deleteMany({
      $or: [
        { status: 'expired' },
        { expiresAt: { $lt: new Date() } }
      ]
    });
    
    return result.deletedCount;
  }
}

module.exports = new PinAuthService();