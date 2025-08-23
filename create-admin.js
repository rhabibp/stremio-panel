/**
 * Script to create or update an admin user in the database
 * Usage: node create-admin.js <username> <email> <password>
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables from .env file
dotenv.config({ path: path.join(__dirname, 'backend', '.env') });

// MongoDB connection string
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/stremio-panel';

// Get command line arguments
const args = process.argv.slice(2);
if (args.length !== 3) {
  console.error('Usage: node create-admin.js <username> <email> <password>');
  process.exit(1);
}

const [username, email, password] = args;

// Define User schema
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

// Create User model
const User = mongoose.model('User', userSchema);

// Connect to MongoDB
mongoose.connect(MONGODB_URI)
  .then(async () => {
    console.log('Connected to MongoDB');
    
    try {
      // Check if user already exists
      const existingUser = await User.findOne({ $or: [{ username }, { email }] });
      
      if (existingUser) {
        // Update existing user to admin
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        
        await User.updateOne(
          { _id: existingUser._id },
          { 
            $set: { 
              role: 'admin',
              password: hashedPassword,
              active: true
            } 
          }
        );
        
        console.log(`User '${username}' updated to admin role successfully!`);
      } else {
        // Create new admin user
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        
        const newAdmin = new User({
          username,
          email,
          password: hashedPassword,
          role: 'admin',
          active: true
        });
        
        await newAdmin.save();
        console.log(`Admin user '${username}' created successfully!`);
      }
    } catch (error) {
      console.error('Error creating/updating admin user:', error);
    } finally {
      mongoose.disconnect();
    }
  })
  .catch(err => {
    console.error('Failed to connect to MongoDB:', err);
    process.exit(1);
  });