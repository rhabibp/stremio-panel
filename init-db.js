/**
 * Script to initialize the database with required collections and indexes
 * Usage: node init-db.js
 */

const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables from .env file
dotenv.config({ path: path.join(__dirname, 'backend', '.env') });

// MongoDB connection string
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/stremio-panel';

// Connect to MongoDB
mongoose.connect(MONGODB_URI)
  .then(async () => {
    console.log('Connected to MongoDB');
    
    try {
      // Create User schema
      const userSchema = new mongoose.Schema({
        username: {
          type: String,
          required: true,
          unique: true,
          trim: true
        },
        email: {
          type: String,
          required: true,
          unique: true,
          trim: true,
          lowercase: true
        },
        password: {
          type: String,
          required: true
        },
        role: {
          type: String,
          enum: ['admin', 'reseller', 'user'],
          default: 'user'
        },
        stremioAuthKey: {
          type: String,
          default: null
        },
        stremioUserId: {
          type: String,
          default: null
        },
        stremioSynced: {
          type: Boolean,
          default: false
        },
        addons: [{
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Addon'
        }],
        reseller: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          default: null
        },
        credits: {
          type: Number,
          default: 0
        },
        active: {
          type: Boolean,
          default: true
        },
        expiresAt: {
          type: Date,
          default: null
        }
      }, {
        timestamps: true
      });

      // Create Addon schema
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
        addonId: {
          type: String,
          required: true,
          unique: true
        },
        transportUrl: {
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
        }
      }, {
        timestamps: true
      });

      // Create models
      const User = mongoose.model('User', userSchema);
      const Addon = mongoose.model('Addon', addonSchema);

      // Create indexes
      await User.createIndexes();
      await Addon.createIndexes();

      console.log('Database initialized successfully!');
      console.log('Created collections:');
      console.log('- users');
      console.log('- addons');
      
      // Count existing documents
      const userCount = await User.countDocuments();
      const addonCount = await Addon.countDocuments();
      
      console.log(`\nExisting documents:`);
      console.log(`- users: ${userCount}`);
      console.log(`- addons: ${addonCount}`);
      
      console.log('\nTo create an admin user, run:');
      console.log('node create-admin.js <username> <email> <password>');
      
    } catch (error) {
      console.error('Error initializing database:', error);
    } finally {
      mongoose.disconnect();
    }
  })
  .catch(err => {
    console.error('Failed to connect to MongoDB:', err);
    process.exit(1);
  });