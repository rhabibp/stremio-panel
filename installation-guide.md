# Stremio Management Panel Installation Guide

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Installation Options](#installation-options)
3. [Standard Installation](#standard-installation)
4. [Docker Installation](#docker-installation)
5. [Configuration](#configuration)
6. [First-Time Setup](#first-time-setup)
7. [Updating](#updating)
8. [Troubleshooting](#troubleshooting)

## Prerequisites

Before installing the Stremio Management Panel, ensure your system meets the following requirements:

### System Requirements

- **Operating System**: Linux (Ubuntu 20.04+ recommended), macOS, or Windows
- **CPU**: 1+ cores
- **RAM**: 1GB+ (2GB+ recommended)
- **Storage**: 1GB+ free space
- **Network**: Internet connection

### Software Requirements

- **Node.js**: v16.x or higher
- **MongoDB**: v4.4 or higher
- **Nginx** (recommended for production)
- **Git** (for installation from source)
- **Docker & Docker Compose** (for Docker installation)

## Installation Options

You can install the Stremio Management Panel using one of the following methods:

1. **Standard Installation**: Manual installation on your server
2. **Docker Installation**: Using Docker and Docker Compose

## Standard Installation

### Step 1: Clone the Repository

```bash
git clone https://github.com/your-repo/stremio-panel.git
cd stremio-panel
```

### Step 2: Install Dependencies

```bash
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### Step 3: Configure Environment Variables

Create a `.env` file in the backend directory:

```bash
cd ../backend
cp .env.example .env
```

Edit the `.env` file with your configuration (see [Configuration](#configuration) section).

### Step 4: Build the Frontend

```bash
cd ../frontend
npm run build
```

### Step 5: Set Up MongoDB

Ensure MongoDB is running and accessible with the connection string specified in your `.env` file.

### Step 6: Initialize the Database

```bash
cd ..
node init-db.js
```

### Step 7: Create Admin User

```bash
node create-admin.js
```

Follow the prompts to create your admin user.

### Step 8: Start the Application

For development:

```bash
# Start both frontend and backend in development mode
npm run dev
```

For production:

```bash
# Start the backend server
cd backend
npm start
```

Use a process manager like PM2 for production:

```bash
npm install -g pm2
pm2 start src/server.js --name stremio-panel
```

### Step 9: Set Up Nginx (Production)

Create an Nginx configuration file:

```bash
sudo cp nginx-config.conf /etc/nginx/sites-available/stremio-panel.conf
```

Edit the file to match your domain and paths:

```bash
sudo nano /etc/nginx/sites-available/stremio-panel.conf
```

Enable the site and restart Nginx:

```bash
sudo ln -s /etc/nginx/sites-available/stremio-panel.conf /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

## Docker Installation

### Step 1: Clone the Repository

```bash
git clone https://github.com/your-repo/stremio-panel.git
cd stremio-panel
```

### Step 2: Configure Environment Variables

Create a `.env` file in the root directory:

```bash
cp .env.example .env
```

Edit the `.env` file with your configuration (see [Configuration](#configuration) section).

### Step 3: Start the Docker Containers

```bash
docker-compose up -d
```

This will start the following containers:
- MongoDB database
- Backend API server
- Frontend web server (Nginx)

### Step 4: Create Admin User

```bash
docker-compose exec backend node create-admin.js
```

Follow the prompts to create your admin user.

### Step 5: Access the Application

The application should now be running at http://localhost:80 (or the port you configured).

## Configuration

### Environment Variables

The following environment variables can be configured in your `.env` file:

#### Required Variables

```
# MongoDB Connection
MONGODB_URI=mongodb://localhost:27017/stremio-panel

# JWT Authentication
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=24h

# Server Configuration
PORT=5000
NODE_ENV=production

# Stremio API
STREMIO_API_URL=https://api.strem.io
```

#### Optional Variables

```
# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:3000

# Admin Creation (used by create-admin.js)
ADMIN_USERNAME=admin
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=securepassword

# Logging
LOG_LEVEL=info

# Rate Limiting
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX=100
```

## First-Time Setup

After installing the application, follow these steps to set up your system:

### 1. Log in with Admin Account

Use the admin account you created during installation to log in.

### 2. Import Official Addons

1. Navigate to "Addons" in the sidebar
2. Click the "Official Addons" tab
3. Import the addons you want to use

### 3. Create Resellers (Optional)

If you plan to use the reseller system:

1. Navigate to "Resellers" in the sidebar
2. Click "Add Reseller"
3. Fill in the required information
4. Add credits to the reseller

### 4. Create Users

1. Navigate to "Users" in the sidebar
2. Click "Add User"
3. Fill in the required information

## Updating

### Standard Installation

```bash
cd stremio-panel
git pull

# Update backend
cd backend
npm install

# Update frontend
cd ../frontend
npm install
npm run build

# Restart the server
cd ../backend
pm2 restart stremio-panel
```

### Docker Installation

```bash
cd stremio-panel
git pull
docker-compose down
docker-compose up -d
```

## Troubleshooting

### Common Issues

#### MongoDB Connection Errors

If you see errors connecting to MongoDB:

1. Verify MongoDB is running: `sudo systemctl status mongodb`
2. Check your connection string in the `.env` file
3. Ensure network connectivity between the application and MongoDB
4. Check MongoDB authentication settings

#### Application Not Starting

If the application fails to start:

1. Check the logs: `pm2 logs stremio-panel` or `docker-compose logs`
2. Verify all environment variables are set correctly
3. Ensure all dependencies are installed: `npm install`
4. Check for port conflicts: `netstat -tuln | grep <port>`

#### Nginx Configuration Issues

If you can't access the application through Nginx:

1. Check Nginx error logs: `sudo tail -f /var/log/nginx/error.log`
2. Verify Nginx configuration: `sudo nginx -t`
3. Ensure Nginx is running: `sudo systemctl status nginx`
4. Check firewall settings: `sudo ufw status`

#### Docker Issues

If you have problems with the Docker installation:

1. Check container status: `docker-compose ps`
2. View container logs: `docker-compose logs`
3. Ensure Docker and Docker Compose are up to date
4. Verify Docker has sufficient resources

### Getting Help

If you continue to experience issues:

1. Check the project's GitHub issues
2. Join the community support channels
3. Contact the development team with detailed information about your problem