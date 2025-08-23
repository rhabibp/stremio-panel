const mongoose = require('mongoose');

const addonSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  version: {
    type: String,
    default: '1.0.0'
  },
  // Using transportUrl as the primary identifier instead of addonId
  transportUrl: {
    type: String,
    required: true,
    unique: true
  },
  // We'll keep addonId for reference, but it's not the primary identifier anymore
  addonId: {
    type: String,
    required: true
  },
  resources: [{
    type: String,
    enum: ['catalog', 'meta', 'stream', 'subtitles', 'addon_catalog']
  }],
  types: [{
    type: String,
    enum: ['movie', 'series', 'channel', 'tv', 'music', 'other']
  }],
  creator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  public: {
    type: Boolean,
    default: false
  },
  users: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  active: {
    type: Boolean,
    default: true
  },
  config: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  // Store the manifest data for reference
  manifest: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  // Track if this addon has been validated with Stremio
  validated: {
    type: Boolean,
    default: false
  },
  // When was the addon last validated
  lastValidated: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// Index for faster lookups
addonSchema.index({ transportUrl: 1 });
addonSchema.index({ addonId: 1 });
addonSchema.index({ creator: 1 });
addonSchema.index({ public: 1 });

const Addon = mongoose.model('Addon', addonSchema);

module.exports = Addon;