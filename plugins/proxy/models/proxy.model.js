/**
 * Proxy Model
 * 
 * Defines the schema for proxy configurations
 */

const mongoose = require('mongoose');

const proxySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    default: ''
  },
  target: {
    type: String,
    required: true,
    trim: true
  },
  path: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  active: {
    type: Boolean,
    default: true
  },
  headers: {
    type: Map,
    of: String,
    default: {}
  },
  auth: {
    username: {
      type: String,
      default: ''
    },
    password: {
      type: String,
      default: ''
    }
  },
  rateLimit: {
    enabled: {
      type: Boolean,
      default: false
    },
    maxRequests: {
      type: Number,
      default: 100
    },
    timeWindow: {
      type: Number,
      default: 60 * 1000 // 1 minute in milliseconds
    }
  },
  caching: {
    enabled: {
      type: Boolean,
      default: false
    },
    ttl: {
      type: Number,
      default: 300 // 5 minutes in seconds
    }
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  usageStats: {
    totalRequests: {
      type: Number,
      default: 0
    },
    lastUsed: {
      type: Date,
      default: null
    }
  }
}, {
  timestamps: true
});

// Create indexes for better performance
proxySchema.index({ path: 1 }, { unique: true });
proxySchema.index({ active: 1 });

const Proxy = mongoose.model('Proxy', proxySchema);

module.exports = Proxy;