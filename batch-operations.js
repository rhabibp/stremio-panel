/**
 * Batch Operations Script for Stremio Management Panel
 * 
 * This script provides functionality for performing batch operations on users, addons, and resellers.
 * It supports operations like:
 * - Batch user creation
 * - Batch addon assignment
 * - Batch user import/export
 * - Batch addon import/export
 */

require('dotenv').config({ path: './backend/.env' });
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const crypto = require('crypto');
const { exec } = require('child_process');

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
  startBatchOperations();
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

// Define schemas
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['admin', 'reseller', 'user'], default: 'user' },
  stremio: {
    id: String,
    authKey: String,
    syncedAt: Date
  },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const addonSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String },
  type: { type: String, required: true },
  endpoint: { type: String },
  resources: [String],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const resellerSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  credits: { type: Number, default: 0 },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const userAddonSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  addonId: { type: mongoose.Schema.Types.ObjectId, ref: 'Addon', required: true },
  assignedAt: { type: Date, default: Date.now },
  assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
});

// Create models
const User = mongoose.model('User', userSchema);
const Addon = mongoose.model('Addon', addonSchema);
const Reseller = mongoose.model('Reseller', resellerSchema);
const UserAddon = mongoose.model('UserAddon', userAddonSchema);

// Main function to start batch operations
async function startBatchOperations() {
  console.log('\n=== Stremio Management Panel Batch Operations ===\n');
  
  const operations = [
    '1. Batch User Creation',
    '2. Batch Addon Assignment',
    '3. Export Users to CSV',
    '4. Import Users from CSV',
    '5. Export Addons to CSV',
    '6. Import Addons from CSV',
    '7. Batch User Deletion',
    '8. Batch Addon Deletion',
    '9. Generate User Statistics',
    '10. Exit'
  ];
  
  console.log('Available Operations:');
  operations.forEach(op => console.log(op));
  
  rl.question('\nSelect an operation (1-10): ', async (answer) => {
    const option = parseInt(answer);
    
    switch (option) {
      case 1:
        await batchUserCreation();
        break;
      case 2:
        await batchAddonAssignment();
        break;
      case 3:
        await exportUsersToCSV();
        break;
      case 4:
        await importUsersFromCSV();
        break;
      case 5:
        await exportAddonsToCSV();
        break;
      case 6:
        await importAddonsFromCSV();
        break;
      case 7:
        await batchUserDeletion();
        break;
      case 8:
        await batchAddonDeletion();
        break;
      case 9:
        await generateUserStatistics();
        break;
      case 10:
        console.log('Exiting...');
        cleanup();
        break;
      default:
        console.log('Invalid option. Please try again.');
        startBatchOperations();
        break;
    }
  });
}

// 1. Batch User Creation
async function batchUserCreation() {
  console.log('\n=== Batch User Creation ===\n');
  
  rl.question('How many users do you want to create? ', async (countStr) => {
    const count = parseInt(countStr);
    
    if (isNaN(count) || count <= 0) {
      console.log('Invalid number. Please enter a positive integer.');
      return batchUserCreation();
    }
    
    rl.question('Username prefix (e.g., "user" will create user1, user2, etc.): ', async (prefix) => {
      rl.question('Email domain (e.g., "example.com" will create user1@example.com): ', async (domain) => {
        rl.question('Default password for all users: ', async (password) => {
          rl.question('User role (admin, reseller, user) [default: user]: ', async (role) => {
            const userRole = role || 'user';
            
            if (!['admin', 'reseller', 'user'].includes(userRole)) {
              console.log('Invalid role. Using "user" as default.');
              userRole = 'user';
            }
            
            console.log(`\nCreating ${count} users with:`);
            console.log(`- Username prefix: ${prefix}`);
            console.log(`- Email domain: ${domain}`);
            console.log(`- Role: ${userRole}`);
            
            rl.question('\nProceed? (y/n): ', async (confirm) => {
              if (confirm.toLowerCase() !== 'y') {
                console.log('Operation cancelled.');
                return startBatchOperations();
              }
              
              console.log('\nCreating users...');
              
              const createdUsers = [];
              const errors = [];
              
              // Hash password
              const hashedPassword = crypto.createHash('sha256').update(password).digest('hex');
              
              for (let i = 1; i <= count; i++) {
                const username = `${prefix}${i}`;
                const email = `${username}@${domain}`;
                
                try {
                  const user = new User({
                    username,
                    email,
                    password: hashedPassword,
                    role: userRole
                  });
                  
                  await user.save();
                  createdUsers.push(username);
                  process.stdout.write(`\rCreated ${createdUsers.length}/${count} users...`);
                } catch (error) {
                  errors.push({ username, error: error.message });
                }
              }
              
              console.log('\n\nUser creation completed.');
              console.log(`Successfully created ${createdUsers.length} users.`);
              
              if (errors.length > 0) {
                console.log(`Failed to create ${errors.length} users:`);
                errors.forEach(err => console.log(`- ${err.username}: ${err.error}`));
              }
              
              // Save results to file
              const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
              const resultsFile = `user_creation_results_${timestamp}.json`;
              
              fs.writeFileSync(resultsFile, JSON.stringify({
                created: createdUsers,
                errors
              }, null, 2));
              
              console.log(`\nResults saved to ${resultsFile}`);
              
              rl.question('\nReturn to main menu? (y/n): ', (answer) => {
                if (answer.toLowerCase() === 'y') {
                  startBatchOperations();
                } else {
                  cleanup();
                }
              });
            });
          });
        });
      });
    });
  });
}

// 2. Batch Addon Assignment
async function batchAddonAssignment() {
  console.log('\n=== Batch Addon Assignment ===\n');
  
  // Get available addons
  const addons = await Addon.find({}, 'name _id');
  
  if (addons.length === 0) {
    console.log('No addons found in the database. Please create addons first.');
    return startBatchOperations();
  }
  
  console.log('Available Addons:');
  addons.forEach((addon, index) => {
    console.log(`${index + 1}. ${addon.name} (ID: ${addon._id})`);
  });
  
  rl.question('\nSelect addon to assign (enter number): ', async (addonIndexStr) => {
    const addonIndex = parseInt(addonIndexStr) - 1;
    
    if (isNaN(addonIndex) || addonIndex < 0 || addonIndex >= addons.length) {
      console.log('Invalid selection. Please try again.');
      return batchAddonAssignment();
    }
    
    const selectedAddon = addons[addonIndex];
    console.log(`\nSelected addon: ${selectedAddon.name}`);
    
    rl.question('\nAssign to users by (1. Username pattern, 2. Role): ', async (assignTypeStr) => {
      const assignType = parseInt(assignTypeStr);
      
      if (assignType === 1) {
        // Assign by username pattern
        rl.question('Enter username pattern (e.g., "user" will match all usernames containing "user"): ', async (pattern) => {
          const users = await User.find({ username: { $regex: pattern, $options: 'i' } }, 'username _id');
          
          if (users.length === 0) {
            console.log('No users found matching the pattern.');
            return batchAddonAssignment();
          }
          
          console.log(`\nFound ${users.length} users matching the pattern:`);
          users.slice(0, 10).forEach(user => console.log(`- ${user.username}`));
          
          if (users.length > 10) {
            console.log(`... and ${users.length - 10} more`);
          }
          
          rl.question(`\nAssign addon "${selectedAddon.name}" to all ${users.length} users? (y/n): `, async (confirm) => {
            if (confirm.toLowerCase() !== 'y') {
              console.log('Operation cancelled.');
              return startBatchOperations();
            }
            
            await performAddonAssignment(users, selectedAddon);
          });
        });
      } else if (assignType === 2) {
        // Assign by role
        rl.question('Enter user role (admin, reseller, user): ', async (role) => {
          if (!['admin', 'reseller', 'user'].includes(role)) {
            console.log('Invalid role. Please enter admin, reseller, or user.');
            return batchAddonAssignment();
          }
          
          const users = await User.find({ role }, 'username _id');
          
          if (users.length === 0) {
            console.log(`No users found with role "${role}".`);
            return batchAddonAssignment();
          }
          
          console.log(`\nFound ${users.length} users with role "${role}":`);
          users.slice(0, 10).forEach(user => console.log(`- ${user.username}`));
          
          if (users.length > 10) {
            console.log(`... and ${users.length - 10} more`);
          }
          
          rl.question(`\nAssign addon "${selectedAddon.name}" to all ${users.length} users? (y/n): `, async (confirm) => {
            if (confirm.toLowerCase() !== 'y') {
              console.log('Operation cancelled.');
              return startBatchOperations();
            }
            
            await performAddonAssignment(users, selectedAddon);
          });
        });
      } else {
        console.log('Invalid option. Please try again.');
        return batchAddonAssignment();
      }
    });
  });
}

// Helper function for addon assignment
async function performAddonAssignment(users, addon) {
  console.log('\nAssigning addon to users...');
  
  const results = {
    success: [],
    alreadyAssigned: [],
    errors: []
  };
  
  for (let i = 0; i < users.length; i++) {
    const user = users[i];
    
    try {
      // Check if addon is already assigned to user
      const existingAssignment = await UserAddon.findOne({
        userId: user._id,
        addonId: addon._id
      });
      
      if (existingAssignment) {
        results.alreadyAssigned.push(user.username);
      } else {
        // Create new assignment
        const userAddon = new UserAddon({
          userId: user._id,
          addonId: addon._id
        });
        
        await userAddon.save();
        results.success.push(user.username);
      }
    } catch (error) {
      results.errors.push({ username: user.username, error: error.message });
    }
    
    process.stdout.write(`\rProcessed ${i + 1}/${users.length} users...`);
  }
  
  console.log('\n\nAddon assignment completed.');
  console.log(`Successfully assigned to ${results.success.length} users.`);
  console.log(`Already assigned to ${results.alreadyAssigned.length} users.`);
  
  if (results.errors.length > 0) {
    console.log(`Failed to assign to ${results.errors.length} users.`);
  }
  
  // Save results to file
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const resultsFile = `addon_assignment_results_${timestamp}.json`;
  
  fs.writeFileSync(resultsFile, JSON.stringify(results, null, 2));
  
  console.log(`\nResults saved to ${resultsFile}`);
  
  rl.question('\nReturn to main menu? (y/n): ', (answer) => {
    if (answer.toLowerCase() === 'y') {
      startBatchOperations();
    } else {
      cleanup();
    }
  });
}

// 3. Export Users to CSV
async function exportUsersToCSV() {
  console.log('\n=== Export Users to CSV ===\n');
  
  rl.question('Export users by role (all, admin, reseller, user): ', async (role) => {
    const query = role !== 'all' ? { role } : {};
    
    try {
      const users = await User.find(query).select('-password');
      
      if (users.length === 0) {
        console.log('No users found matching the criteria.');
        return startBatchOperations();
      }
      
      console.log(`Found ${users.length} users.`);
      
      // Create CSV content
      let csvContent = 'id,username,email,role,createdAt,stremioId\n';
      
      users.forEach(user => {
        csvContent += `${user._id},${user.username},${user.email},${user.role},${user.createdAt},${user.stremio?.id || ''}\n`;
      });
      
      // Save to file
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `users_export_${role}_${timestamp}.csv`;
      
      fs.writeFileSync(filename, csvContent);
      
      console.log(`\nExported ${users.length} users to ${filename}`);
      
      rl.question('\nReturn to main menu? (y/n): ', (answer) => {
        if (answer.toLowerCase() === 'y') {
          startBatchOperations();
        } else {
          cleanup();
        }
      });
    } catch (error) {
      console.error('Error exporting users:', error);
      startBatchOperations();
    }
  });
}

// 4. Import Users from CSV
async function importUsersFromCSV() {
  console.log('\n=== Import Users from CSV ===\n');
  console.log('CSV file should have the following format:');
  console.log('username,email,role,password');
  console.log('user1,user1@example.com,user,password1');
  console.log('user2,user2@example.com,reseller,password2');
  console.log('...');
  
  rl.question('\nEnter CSV file path: ', async (filePath) => {
    try {
      if (!fs.existsSync(filePath)) {
        console.log('File not found. Please check the path and try again.');
        return importUsersFromCSV();
      }
      
      const fileContent = fs.readFileSync(filePath, 'utf8');
      const lines = fileContent.split('\n');
      
      // Skip header line
      const users = [];
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        const [username, email, role, password] = line.split(',');
        
        if (!username || !email || !role || !password) {
          console.log(`Skipping line ${i + 1}: Invalid format`);
          continue;
        }
        
        if (!['admin', 'reseller', 'user'].includes(role)) {
          console.log(`Skipping line ${i + 1}: Invalid role "${role}"`);
          continue;
        }
        
        users.push({ username, email, role, password });
      }
      
      if (users.length === 0) {
        console.log('No valid users found in the CSV file.');
        return startBatchOperations();
      }
      
      console.log(`\nFound ${users.length} users in the CSV file.`);
      console.log('Sample users:');
      users.slice(0, 3).forEach(user => {
        console.log(`- ${user.username} (${user.email}, ${user.role})`);
      });
      
      rl.question('\nProceed with import? (y/n): ', async (confirm) => {
        if (confirm.toLowerCase() !== 'y') {
          console.log('Import cancelled.');
          return startBatchOperations();
        }
        
        console.log('\nImporting users...');
        
        const results = {
          success: [],
          errors: []
        };
        
        for (let i = 0; i < users.length; i++) {
          const userData = users[i];
          
          try {
            // Hash password
            const hashedPassword = crypto.createHash('sha256').update(userData.password).digest('hex');
            
            const user = new User({
              username: userData.username,
              email: userData.email,
              password: hashedPassword,
              role: userData.role
            });
            
            await user.save();
            results.success.push(userData.username);
          } catch (error) {
            results.errors.push({ username: userData.username, error: error.message });
          }
          
          process.stdout.write(`\rImported ${i + 1}/${users.length} users...`);
        }
        
        console.log('\n\nUser import completed.');
        console.log(`Successfully imported ${results.success.length} users.`);
        
        if (results.errors.length > 0) {
          console.log(`Failed to import ${results.errors.length} users:`);
          results.errors.slice(0, 5).forEach(err => console.log(`- ${err.username}: ${err.error}`));
          
          if (results.errors.length > 5) {
            console.log(`... and ${results.errors.length - 5} more errors`);
          }
        }
        
        // Save results to file
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const resultsFile = `user_import_results_${timestamp}.json`;
        
        fs.writeFileSync(resultsFile, JSON.stringify(results, null, 2));
        
        console.log(`\nResults saved to ${resultsFile}`);
        
        rl.question('\nReturn to main menu? (y/n): ', (answer) => {
          if (answer.toLowerCase() === 'y') {
            startBatchOperations();
          } else {
            cleanup();
          }
        });
      });
    } catch (error) {
      console.error('Error importing users:', error);
      startBatchOperations();
    }
  });
}

// 5. Export Addons to CSV
async function exportAddonsToCSV() {
  console.log('\n=== Export Addons to CSV ===\n');
  
  try {
    const addons = await Addon.find({});
    
    if (addons.length === 0) {
      console.log('No addons found in the database.');
      return startBatchOperations();
    }
    
    console.log(`Found ${addons.length} addons.`);
    
    // Create CSV content
    let csvContent = 'id,name,description,type,endpoint,resources\n';
    
    addons.forEach(addon => {
      const resources = addon.resources ? addon.resources.join('|') : '';
      csvContent += `${addon._id},${addon.name},${addon.description || ''},${addon.type},${addon.endpoint || ''},${resources}\n`;
    });
    
    // Save to file
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `addons_export_${timestamp}.csv`;
    
    fs.writeFileSync(filename, csvContent);
    
    console.log(`\nExported ${addons.length} addons to ${filename}`);
    
    rl.question('\nReturn to main menu? (y/n): ', (answer) => {
      if (answer.toLowerCase() === 'y') {
        startBatchOperations();
      } else {
        cleanup();
      }
    });
  } catch (error) {
    console.error('Error exporting addons:', error);
    startBatchOperations();
  }
}

// 6. Import Addons from CSV
async function importAddonsFromCSV() {
  console.log('\n=== Import Addons from CSV ===\n');
  console.log('CSV file should have the following format:');
  console.log('name,description,type,endpoint,resources');
  console.log('Movie Addon,A movie addon,movie,https://example.com/addon,stream|meta');
  console.log('TV Addon,A TV addon,series,https://example.com/tv,stream|meta');
  console.log('...');
  
  rl.question('\nEnter CSV file path: ', async (filePath) => {
    try {
      if (!fs.existsSync(filePath)) {
        console.log('File not found. Please check the path and try again.');
        return importAddonsFromCSV();
      }
      
      const fileContent = fs.readFileSync(filePath, 'utf8');
      const lines = fileContent.split('\n');
      
      // Skip header line
      const addons = [];
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        const [name, description, type, endpoint, resourcesStr] = line.split(',');
        
        if (!name || !type) {
          console.log(`Skipping line ${i + 1}: Missing required fields`);
          continue;
        }
        
        const resources = resourcesStr ? resourcesStr.split('|') : [];
        
        addons.push({ name, description, type, endpoint, resources });
      }
      
      if (addons.length === 0) {
        console.log('No valid addons found in the CSV file.');
        return startBatchOperations();
      }
      
      console.log(`\nFound ${addons.length} addons in the CSV file.`);
      console.log('Sample addons:');
      addons.slice(0, 3).forEach(addon => {
        console.log(`- ${addon.name} (${addon.type}, ${addon.resources.length} resources)`);
      });
      
      rl.question('\nProceed with import? (y/n): ', async (confirm) => {
        if (confirm.toLowerCase() !== 'y') {
          console.log('Import cancelled.');
          return startBatchOperations();
        }
        
        console.log('\nImporting addons...');
        
        const results = {
          success: [],
          errors: []
        };
        
        for (let i = 0; i < addons.length; i++) {
          const addonData = addons[i];
          
          try {
            const addon = new Addon({
              name: addonData.name,
              description: addonData.description,
              type: addonData.type,
              endpoint: addonData.endpoint,
              resources: addonData.resources
            });
            
            await addon.save();
            results.success.push(addonData.name);
          } catch (error) {
            results.errors.push({ name: addonData.name, error: error.message });
          }
          
          process.stdout.write(`\rImported ${i + 1}/${addons.length} addons...`);
        }
        
        console.log('\n\nAddon import completed.');
        console.log(`Successfully imported ${results.success.length} addons.`);
        
        if (results.errors.length > 0) {
          console.log(`Failed to import ${results.errors.length} addons:`);
          results.errors.forEach(err => console.log(`- ${err.name}: ${err.error}`));
        }
        
        // Save results to file
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const resultsFile = `addon_import_results_${timestamp}.json`;
        
        fs.writeFileSync(resultsFile, JSON.stringify(results, null, 2));
        
        console.log(`\nResults saved to ${resultsFile}`);
        
        rl.question('\nReturn to main menu? (y/n): ', (answer) => {
          if (answer.toLowerCase() === 'y') {
            startBatchOperations();
          } else {
            cleanup();
          }
        });
      });
    } catch (error) {
      console.error('Error importing addons:', error);
      startBatchOperations();
    }
  });
}

// 7. Batch User Deletion
async function batchUserDeletion() {
  console.log('\n=== Batch User Deletion ===\n');
  console.log('WARNING: This operation will permanently delete users and cannot be undone.');
  
  rl.question('Delete users by (1. Username pattern, 2. Role): ', async (deleteTypeStr) => {
    const deleteType = parseInt(deleteTypeStr);
    
    if (deleteType === 1) {
      // Delete by username pattern
      rl.question('Enter username pattern (e.g., "test" will match all usernames containing "test"): ', async (pattern) => {
        const users = await User.find({ username: { $regex: pattern, $options: 'i' } }, 'username _id');
        
        if (users.length === 0) {
          console.log('No users found matching the pattern.');
          return batchUserDeletion();
        }
        
        console.log(`\nFound ${users.length} users matching the pattern:`);
        users.slice(0, 10).forEach(user => console.log(`- ${user.username}`));
        
        if (users.length > 10) {
          console.log(`... and ${users.length - 10} more`);
        }
        
        rl.question(`\nDELETE all ${users.length} users? This cannot be undone! (type "DELETE" to confirm): `, async (confirm) => {
          if (confirm !== 'DELETE') {
            console.log('Operation cancelled.');
            return startBatchOperations();
          }
          
          console.log('\nDeleting users...');
          
          let deletedCount = 0;
          const errors = [];
          
          for (const user of users) {
            try {
              // Delete user-addon relationships
              await UserAddon.deleteMany({ userId: user._id });
              
              // Delete the user
              await User.deleteOne({ _id: user._id });
              
              deletedCount++;
              process.stdout.write(`\rDeleted ${deletedCount}/${users.length} users...`);
            } catch (error) {
              errors.push({ username: user.username, error: error.message });
            }
          }
          
          console.log('\n\nUser deletion completed.');
          console.log(`Successfully deleted ${deletedCount} users.`);
          
          if (errors.length > 0) {
            console.log(`Failed to delete ${errors.length} users:`);
            errors.forEach(err => console.log(`- ${err.username}: ${err.error}`));
          }
          
          rl.question('\nReturn to main menu? (y/n): ', (answer) => {
            if (answer.toLowerCase() === 'y') {
              startBatchOperations();
            } else {
              cleanup();
            }
          });
        });
      });
    } else if (deleteType === 2) {
      // Delete by role
      rl.question('Enter user role to delete (admin, reseller, user): ', async (role) => {
        if (!['admin', 'reseller', 'user'].includes(role)) {
          console.log('Invalid role. Please enter admin, reseller, or user.');
          return batchUserDeletion();
        }
        
        const users = await User.find({ role }, 'username _id');
        
        if (users.length === 0) {
          console.log(`No users found with role "${role}".`);
          return batchUserDeletion();
        }
        
        console.log(`\nFound ${users.length} users with role "${role}":`);
        users.slice(0, 10).forEach(user => console.log(`- ${user.username}`));
        
        if (users.length > 10) {
          console.log(`... and ${users.length - 10} more`);
        }
        
        rl.question(`\nDELETE all ${users.length} ${role} users? This cannot be undone! (type "DELETE" to confirm): `, async (confirm) => {
          if (confirm !== 'DELETE') {
            console.log('Operation cancelled.');
            return startBatchOperations();
          }
          
          console.log('\nDeleting users...');
          
          let deletedCount = 0;
          const errors = [];
          
          for (const user of users) {
            try {
              // Delete user-addon relationships
              await UserAddon.deleteMany({ userId: user._id });
              
              // Delete the user
              await User.deleteOne({ _id: user._id });
              
              deletedCount++;
              process.stdout.write(`\rDeleted ${deletedCount}/${users.length} users...`);
            } catch (error) {
              errors.push({ username: user.username, error: error.message });
            }
          }
          
          console.log('\n\nUser deletion completed.');
          console.log(`Successfully deleted ${deletedCount} users.`);
          
          if (errors.length > 0) {
            console.log(`Failed to delete ${errors.length} users:`);
            errors.forEach(err => console.log(`- ${err.username}: ${err.error}`));
          }
          
          rl.question('\nReturn to main menu? (y/n): ', (answer) => {
            if (answer.toLowerCase() === 'y') {
              startBatchOperations();
            } else {
              cleanup();
            }
          });
        });
      });
    } else {
      console.log('Invalid option. Please try again.');
      return batchUserDeletion();
    }
  });
}

// 8. Batch Addon Deletion
async function batchAddonDeletion() {
  console.log('\n=== Batch Addon Deletion ===\n');
  console.log('WARNING: This operation will permanently delete addons and cannot be undone.');
  
  rl.question('Delete addons by (1. Name pattern, 2. Type): ', async (deleteTypeStr) => {
    const deleteType = parseInt(deleteTypeStr);
    
    if (deleteType === 1) {
      // Delete by name pattern
      rl.question('Enter name pattern (e.g., "test" will match all addon names containing "test"): ', async (pattern) => {
        const addons = await Addon.find({ name: { $regex: pattern, $options: 'i' } }, 'name _id');
        
        if (addons.length === 0) {
          console.log('No addons found matching the pattern.');
          return batchAddonDeletion();
        }
        
        console.log(`\nFound ${addons.length} addons matching the pattern:`);
        addons.forEach(addon => console.log(`- ${addon.name}`));
        
        rl.question(`\nDELETE all ${addons.length} addons? This cannot be undone! (type "DELETE" to confirm): `, async (confirm) => {
          if (confirm !== 'DELETE') {
            console.log('Operation cancelled.');
            return startBatchOperations();
          }
          
          console.log('\nDeleting addons...');
          
          let deletedCount = 0;
          const errors = [];
          
          for (const addon of addons) {
            try {
              // Delete user-addon relationships
              await UserAddon.deleteMany({ addonId: addon._id });
              
              // Delete the addon
              await Addon.deleteOne({ _id: addon._id });
              
              deletedCount++;
              process.stdout.write(`\rDeleted ${deletedCount}/${addons.length} addons...`);
            } catch (error) {
              errors.push({ name: addon.name, error: error.message });
            }
          }
          
          console.log('\n\nAddon deletion completed.');
          console.log(`Successfully deleted ${deletedCount} addons.`);
          
          if (errors.length > 0) {
            console.log(`Failed to delete ${errors.length} addons:`);
            errors.forEach(err => console.log(`- ${err.name}: ${err.error}`));
          }
          
          rl.question('\nReturn to main menu? (y/n): ', (answer) => {
            if (answer.toLowerCase() === 'y') {
              startBatchOperations();
            } else {
              cleanup();
            }
          });
        });
      });
    } else if (deleteType === 2) {
      // Delete by type
      rl.question('Enter addon type to delete (e.g., movie, series): ', async (type) => {
        const addons = await Addon.find({ type }, 'name _id');
        
        if (addons.length === 0) {
          console.log(`No addons found with type "${type}".`);
          return batchAddonDeletion();
        }
        
        console.log(`\nFound ${addons.length} addons with type "${type}":`);
        addons.forEach(addon => console.log(`- ${addon.name}`));
        
        rl.question(`\nDELETE all ${addons.length} ${type} addons? This cannot be undone! (type "DELETE" to confirm): `, async (confirm) => {
          if (confirm !== 'DELETE') {
            console.log('Operation cancelled.');
            return startBatchOperations();
          }
          
          console.log('\nDeleting addons...');
          
          let deletedCount = 0;
          const errors = [];
          
          for (const addon of addons) {
            try {
              // Delete user-addon relationships
              await UserAddon.deleteMany({ addonId: addon._id });
              
              // Delete the addon
              await Addon.deleteOne({ _id: addon._id });
              
              deletedCount++;
              process.stdout.write(`\rDeleted ${deletedCount}/${addons.length} addons...`);
            } catch (error) {
              errors.push({ name: addon.name, error: error.message });
            }
          }
          
          console.log('\n\nAddon deletion completed.');
          console.log(`Successfully deleted ${deletedCount} addons.`);
          
          if (errors.length > 0) {
            console.log(`Failed to delete ${errors.length} addons:`);
            errors.forEach(err => console.log(`- ${err.name}: ${err.error}`));
          }
          
          rl.question('\nReturn to main menu? (y/n): ', (answer) => {
            if (answer.toLowerCase() === 'y') {
              startBatchOperations();
            } else {
              cleanup();
            }
          });
        });
      });
    } else {
      console.log('Invalid option. Please try again.');
      return batchAddonDeletion();
    }
  });
}

// 9. Generate User Statistics
async function generateUserStatistics() {
  console.log('\n=== Generate User Statistics ===\n');
  
  try {
    // Get user counts by role
    const totalUsers = await User.countDocuments();
    const adminCount = await User.countDocuments({ role: 'admin' });
    const resellerCount = await User.countDocuments({ role: 'reseller' });
    const userCount = await User.countDocuments({ role: 'user' });
    
    // Get users with Stremio sync
    const syncedUsers = await User.countDocuments({ 'stremio.id': { $exists: true, $ne: null } });
    
    // Get addon statistics
    const totalAddons = await Addon.countDocuments();
    const addonsByType = await Addon.aggregate([
      { $group: { _id: '$type', count: { $sum: 1 } } }
    ]);
    
    // Get user-addon assignments
    const totalAssignments = await UserAddon.countDocuments();
    const assignmentsPerUser = await UserAddon.aggregate([
      { $group: { _id: '$userId', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);
    
    // Get top addons by assignment count
    const topAddons = await UserAddon.aggregate([
      { $group: { _id: '$addonId', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);
    
    // Get user creation statistics by date
    const usersByDate = await User.aggregate([
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
            day: { $dayOfMonth: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': -1, '_id.month': -1, '_id.day': -1 } },
      { $limit: 30 }
    ]);
    
    // Prepare statistics report
    const statistics = {
      users: {
        total: totalUsers,
        byRole: {
          admin: adminCount,
          reseller: resellerCount,
          user: userCount
        },
        syncedWithStremio: syncedUsers,
        percentSynced: totalUsers > 0 ? ((syncedUsers / totalUsers) * 100).toFixed(2) : 0
      },
      addons: {
        total: totalAddons,
        byType: addonsByType.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {})
      },
      assignments: {
        total: totalAssignments,
        averagePerUser: totalUsers > 0 ? (totalAssignments / totalUsers).toFixed(2) : 0
      },
      topUsers: await Promise.all(assignmentsPerUser.map(async item => {
        const user = await User.findById(item._id, 'username');
        return {
          username: user ? user.username : 'Unknown',
          addonCount: item.count
        };
      })),
      topAddons: await Promise.all(topAddons.map(async item => {
        const addon = await Addon.findById(item._id, 'name');
        return {
          name: addon ? addon.name : 'Unknown',
          userCount: item.count
        };
      })),
      recentActivity: usersByDate.map(item => ({
        date: `${item._id.year}-${item._id.month.toString().padStart(2, '0')}-${item._id.day.toString().padStart(2, '0')}`,
        newUsers: item.count
      }))
    };
    
    // Save statistics to file
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const statsFile = `user_statistics_${timestamp}.json`;
    
    fs.writeFileSync(statsFile, JSON.stringify(statistics, null, 2));
    
    // Display summary
    console.log('=== User Statistics Summary ===');
    console.log(`Total Users: ${totalUsers}`);
    console.log(`- Admins: ${adminCount}`);
    console.log(`- Resellers: ${resellerCount}`);
    console.log(`- Regular Users: ${userCount}`);
    console.log(`Users Synced with Stremio: ${syncedUsers} (${statistics.users.percentSynced}%)`);
    console.log(`\nTotal Addons: ${totalAddons}`);
    Object.entries(statistics.addons.byType).forEach(([type, count]) => {
      console.log(`- ${type}: ${count}`);
    });
    console.log(`\nTotal Addon Assignments: ${totalAssignments}`);
    console.log(`Average Addons per User: ${statistics.assignments.averagePerUser}`);
    
    console.log('\nTop Users by Addon Count:');
    statistics.topUsers.forEach((user, index) => {
      console.log(`${index + 1}. ${user.username}: ${user.addonCount} addons`);
    });
    
    console.log('\nTop Addons by User Count:');
    statistics.topAddons.forEach((addon, index) => {
      console.log(`${index + 1}. ${addon.name}: ${addon.userCount} users`);
    });
    
    console.log(`\nDetailed statistics saved to ${statsFile}`);
    
    rl.question('\nReturn to main menu? (y/n): ', (answer) => {
      if (answer.toLowerCase() === 'y') {
        startBatchOperations();
      } else {
        cleanup();
      }
    });
  } catch (error) {
    console.error('Error generating statistics:', error);
    startBatchOperations();
  }
}

// Cleanup function
function cleanup(exitCode = 0) {
  rl.close();
  mongoose.connection.close();
  process.exit(exitCode);
}