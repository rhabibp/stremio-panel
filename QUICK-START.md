# Stremio Management Panel - Quick Start Guide

This guide provides quick instructions for installing and using the enhanced version of the Stremio Management Panel.

## Installation

### Option 1: Unified Installation Script (Recommended)

The unified installation script handles all aspects of installation and configuration automatically:

```bash
# Make the script executable
chmod +x unified-install.sh

# Run the installation script
sudo ./unified-install.sh
```

Follow the on-screen prompts to complete the installation.

### Option 2: Manual Installation

If you prefer to install components manually, follow these steps:

1. **Set up MongoDB:**
   ```bash
   sudo apt-get update
   sudo apt-get install -y mongodb
   sudo systemctl enable mongod
   sudo systemctl start mongod
   ```

2. **Install Node.js:**
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_16.x | sudo -E bash -
   sudo apt-get install -y nodejs
   ```

3. **Install backend dependencies:**
   ```bash
   cd backend
   npm install
   ```

4. **Install frontend dependencies:**
   ```bash
   cd frontend
   npm install
   ```

5. **Build the frontend:**
   ```bash
   npm run build
   ```

6. **Configure environment variables:**
   ```bash
   # Create .env file in the backend directory
   echo "PORT=5000
   NODE_ENV=production
   MONGODB_URI=mongodb://localhost:27017/stremio-panel
   JWT_SECRET=$(openssl rand -hex 32)
   JWT_EXPIRES_IN=7d
   STREMIO_API_URL=https://api.strem.io" > backend/.env
   ```

7. **Initialize the database:**
   ```bash
   node init-db.js
   ```

8. **Create admin user:**
   ```bash
   node create-admin.js
   ```

9. **Start the services:**
   ```bash
   npm install -g pm2
   pm2 start backend/src/server.js --name stremio-panel-backend
   pm2 start frontend/server.js --name stremio-panel-frontend
   pm2 save
   ```

## Setting Up Monitoring

To set up the monitoring dashboard:

```bash
# Make the script executable
chmod +x setup-monitoring.sh

# Run the setup script
sudo ./setup-monitoring.sh
```

The monitoring dashboard will be available at `http://your-server-ip:8080`.

## Database Optimization

To optimize the database for better performance:

```bash
# Run the optimization script
node optimize-database.js
```

Follow the on-screen prompts to complete the optimization.

## Batch Operations

To perform batch operations on users and addons:

```bash
# Run the batch operations tool
node batch-operations.js
```

Select the desired operation from the menu and follow the prompts.

## Health Check

To manually run a health check:

```bash
# Run the health check script
/opt/stremio-panel/health-check.sh
```

## Common Operations

### Managing Users

1. **Create a user:**
   - Log in to the admin panel
   - Navigate to Users > Add User
   - Fill in the required information and click Save

2. **Assign addons to a user:**
   - Navigate to Users > User List
   - Click on a user to edit
   - Go to the Addons tab
   - Select addons to assign and click Save

3. **Batch create users:**
   - Run `node batch-operations.js`
   - Select "Batch User Creation"
   - Follow the prompts

### Managing Addons

1. **Create an addon:**
   - Log in to the admin panel
   - Navigate to Addons > Add Addon
   - Fill in the required information and click Save

2. **Batch assign addons:**
   - Run `node batch-operations.js`
   - Select "Batch Addon Assignment"
   - Follow the prompts

### Managing Resellers

1. **Create a reseller:**
   - Log in to the admin panel
   - Navigate to Resellers > Add Reseller
   - Fill in the required information and click Save

2. **Assign credits to a reseller:**
   - Navigate to Resellers > Reseller List
   - Click on a reseller to edit
   - Update the credits field and click Save

## Troubleshooting

### Frontend Build Issues

If you encounter issues with the frontend build:

1. Try using the development server:
   ```bash
   cd frontend
   npm run dev
   ```

2. If that fails, use the static frontend:
   ```bash
   node static-server.js
   ```

### Database Connection Issues

If you have issues connecting to the database:

1. Check if MongoDB is running:
   ```bash
   sudo systemctl status mongod
   ```

2. If it's not running, start it:
   ```bash
   sudo systemctl start mongod
   ```

3. Verify the connection string in the `.env` file

### API Connection Issues

If the frontend cannot connect to the API:

1. Check if the backend service is running:
   ```bash
   pm2 status
   ```

2. If it's not running, start it:
   ```bash
   pm2 start stremio-panel-backend
   ```

3. Check the backend logs for errors:
   ```bash
   pm2 logs stremio-panel-backend
   ```

## Additional Resources

- **Full Documentation:** See the `README.md`, `installation-guide.md`, and `user-guide.md` files
- **Enhancement Details:** See the `ENHANCEMENTS.md` file
- **Testing Procedures:** See the `test-plan.md` file