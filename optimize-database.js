/**
 * Database Optimization Script for Stremio Management Panel
 * 
 * This script performs various optimizations on the MongoDB database:
 * 1. Creates appropriate indexes for better query performance
 * 2. Validates and repairs collections if needed
 * 3. Compacts the database to reclaim space
 * 4. Provides statistics on database usage
 */

require('dotenv').config({ path: './backend/.env' });
const mongoose = require('mongoose');
const { exec } = require('child_process');
const readline = require('readline');

// MongoDB connection string from environment variable or default
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/stremio-panel';

// Connect to MongoDB
console.log(`Connecting to MongoDB at ${MONGODB_URI}...`);
mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => {
  console.log('Connected to MongoDB successfully');
  startOptimization();
})
.catch(err => {
  console.error('Failed to connect to MongoDB:', err);
  process.exit(1);
});

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Main optimization function
async function startOptimization() {
  try {
    console.log('\n=== Stremio Management Panel Database Optimization ===\n');
    
    // Get list of collections
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log(`Found ${collections.length} collections in the database`);
    
    // Display database statistics
    await displayDatabaseStats();
    
    // Ask for confirmation before proceeding
    rl.question('\nDo you want to proceed with database optimization? (y/n): ', async (answer) => {
      if (answer.toLowerCase() !== 'y') {
        console.log('Optimization cancelled');
        cleanup();
        return;
      }
      
      // Create indexes
      await createIndexes();
      
      // Validate collections
      await validateCollections(collections);
      
      // Compact database
      await compactDatabase();
      
      // Display final statistics
      console.log('\n=== Optimization Complete ===');
      await displayDatabaseStats();
      
      cleanup();
    });
  } catch (error) {
    console.error('Error during optimization:', error);
    cleanup(1);
  }
}

// Display database statistics
async function displayDatabaseStats() {
  console.log('\n=== Database Statistics ===');
  
  try {
    const stats = await mongoose.connection.db.stats();
    console.log(`Database size: ${formatBytes(stats.dataSize)}`);
    console.log(`Storage size: ${formatBytes(stats.storageSize)}`);
    console.log(`Index size: ${formatBytes(stats.indexSize)}`);
    console.log(`Objects: ${stats.objects}`);
    console.log(`Collections: ${stats.collections}`);
    console.log(`Indexes: ${stats.indexes}`);
    
    // Get collection-specific stats
    console.log('\n=== Collection Statistics ===');
    const collections = await mongoose.connection.db.listCollections().toArray();
    
    for (const collection of collections) {
      const collStats = await mongoose.connection.db.collection(collection.name).stats();
      console.log(`\n${collection.name}:`);
      console.log(`  Documents: ${collStats.count}`);
      console.log(`  Size: ${formatBytes(collStats.size)}`);
      console.log(`  Storage: ${formatBytes(collStats.storageSize)}`);
      console.log(`  Indexes: ${collStats.nindexes}`);
      console.log(`  Index size: ${formatBytes(collStats.totalIndexSize)}`);
    }
  } catch (error) {
    console.error('Error getting database statistics:', error);
  }
}

// Create indexes for better performance
async function createIndexes() {
  console.log('\n=== Creating Indexes ===');
  
  try {
    // Users collection indexes
    console.log('Creating indexes for users collection...');
    await mongoose.connection.db.collection('users').createIndex({ username: 1 }, { unique: true });
    await mongoose.connection.db.collection('users').createIndex({ email: 1 }, { unique: true });
    await mongoose.connection.db.collection('users').createIndex({ role: 1 });
    await mongoose.connection.db.collection('users').createIndex({ createdAt: 1 });
    await mongoose.connection.db.collection('users').createIndex({ 'stremio.id': 1 });
    console.log('✓ Users indexes created');
    
    // Addons collection indexes
    console.log('Creating indexes for addons collection...');
    await mongoose.connection.db.collection('addons').createIndex({ name: 1 });
    await mongoose.connection.db.collection('addons').createIndex({ type: 1 });
    await mongoose.connection.db.collection('addons').createIndex({ createdAt: 1 });
    console.log('✓ Addons indexes created');
    
    // Resellers collection indexes
    console.log('Creating indexes for resellers collection...');
    await mongoose.connection.db.collection('resellers').createIndex({ username: 1 }, { unique: true });
    await mongoose.connection.db.collection('resellers').createIndex({ email: 1 }, { unique: true });
    await mongoose.connection.db.collection('resellers').createIndex({ createdAt: 1 });
    console.log('✓ Resellers indexes created');
    
    // User-addon relationships
    console.log('Creating indexes for user-addon relationships...');
    await mongoose.connection.db.collection('useraddons').createIndex({ userId: 1 });
    await mongoose.connection.db.collection('useraddons').createIndex({ addonId: 1 });
    await mongoose.connection.db.collection('useraddons').createIndex({ userId: 1, addonId: 1 }, { unique: true });
    console.log('✓ User-addon relationship indexes created');
    
    console.log('All indexes created successfully');
  } catch (error) {
    console.error('Error creating indexes:', error);
    if (error.code === 11000) {
      console.log('Some indexes already exist. Continuing with optimization...');
    }
  }
}

// Validate and repair collections
async function validateCollections(collections) {
  console.log('\n=== Validating Collections ===');
  
  try {
    for (const collection of collections) {
      console.log(`Validating collection: ${collection.name}...`);
      const validation = await mongoose.connection.db.admin().command({
        validate: collection.name,
        full: true
      });
      
      if (validation.valid) {
        console.log(`✓ Collection ${collection.name} is valid`);
      } else {
        console.log(`⚠ Collection ${collection.name} has issues. Attempting repair...`);
        
        // Repair collection using mongod repair command
        await new Promise((resolve, reject) => {
          exec(`mongod --repair --dbpath /var/lib/mongodb`, (error, stdout, stderr) => {
            if (error) {
              console.error(`Error repairing collection: ${stderr}`);
              reject(error);
            } else {
              console.log(`✓ Repair completed for ${collection.name}`);
              resolve();
            }
          });
        });
      }
    }
    
    console.log('Collection validation completed');
  } catch (error) {
    console.error('Error validating collections:', error);
  }
}

// Compact database to reclaim space
async function compactDatabase() {
  console.log('\n=== Compacting Database ===');
  
  try {
    const collections = await mongoose.connection.db.listCollections().toArray();
    
    for (const collection of collections) {
      console.log(`Compacting collection: ${collection.name}...`);
      await mongoose.connection.db.command({ compact: collection.name });
      console.log(`✓ Collection ${collection.name} compacted`);
    }
    
    console.log('Database compaction completed');
  } catch (error) {
    console.error('Error compacting database:', error);
  }
}

// Format bytes to human-readable format
function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

// Cleanup function
function cleanup(exitCode = 0) {
  rl.close();
  mongoose.connection.close();
  process.exit(exitCode);
}