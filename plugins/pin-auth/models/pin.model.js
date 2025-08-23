/**
 * PIN Authentication Model
 * 
 * Defines the schema for PIN authentication sessions
 */

const mongoose = require('mongoose');

const pinSchema = new mongoose.Schema({
  pin: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 4,
    maxlength: 6
  },
  sessionId: {
    type: String,
    required: true,
    unique: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  deviceInfo: {
    type: Object,
    default: {}
  },
  status: {
    type: String,
    enum: ['pending', 'verified', 'expired', 'used'],
    default: 'pending'
  },
  expiresAt: {
    type: Date,
    required: true,
    index: { expires: 0 } // TTL index, will be set to actual expiry time
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Create indexes for better performance
pinSchema.index({ pin: 1 }, { unique: true });
pinSchema.index({ sessionId: 1 }, { unique: true });
pinSchema.index({ status: 1 });
pinSchema.index({ expiresAt: 1 });

// Set TTL index to expire documents after they expire
pinSchema.pre('save', function(next) {
  // Calculate TTL in seconds from now until expiresAt
  const ttlSeconds = Math.floor((this.expiresAt - new Date()) / 1000);
  
  // Update the TTL index
  if (this.isNew) {
    const collection = mongoose.connection.collections['pins'];
    if (collection) {
      collection.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 })
        .then(() => next())
        .catch(err => next(err));
    } else {
      next();
    }
  } else {
    next();
  }
});

// Method to check if PIN is expired
pinSchema.methods.isExpired = function() {
  return new Date() > this.expiresAt;
};

// Method to verify PIN
pinSchema.methods.verify = function(userId, deviceInfo = {}) {
  this.userId = userId;
  this.deviceInfo = deviceInfo;
  this.status = 'verified';
  return this.save();
};

// Method to mark PIN as used
pinSchema.methods.markAsUsed = function() {
  this.status = 'used';
  return this.save();
};

// Method to mark PIN as expired
pinSchema.methods.markAsExpired = function() {
  this.status = 'expired';
  return this.save();
};

const Pin = mongoose.model('Pin', pinSchema);

module.exports = Pin;