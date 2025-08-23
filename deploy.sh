#!/bin/bash

# Stremio Management Panel Deployment Script

echo "====================================="
echo "Stremio Management Panel Deployment"
echo "====================================="

# Check if PM2 is installed
if ! command -v pm2 &> /dev/null; then
    echo "PM2 is not installed. Installing PM2..."
    npm install -g pm2
fi

# Check if .env file exists in backend
if [ ! -f backend/.env ]; then
    echo "Error: .env file not found in backend directory."
    echo "Please create a .env file with your production settings."
    exit 1
fi

echo "Building frontend..."
cd frontend
npm install
npm run build

echo "Setting up backend..."
cd ../backend
npm install

# Check if backend is already running in PM2
if pm2 list | grep -q "stremio-panel-backend"; then
    echo "Stopping existing backend process..."
    pm2 stop stremio-panel-backend
    pm2 delete stremio-panel-backend
fi

echo "Starting backend with PM2..."
pm2 start src/server.js --name stremio-panel-backend

echo "====================================="
echo "Deployment complete!"
echo "====================================="
echo "Backend is running with PM2."
echo "Frontend build is available in frontend/dist directory."
echo ""
echo "To view the backend logs:"
echo "  pm2 logs stremio-panel-backend"
echo ""
echo "To restart the backend:"
echo "  pm2 restart stremio-panel-backend"
echo ""
echo "Don't forget to configure your web server (Nginx/Apache) to serve the frontend"
echo "and proxy API requests to the backend as described in the README.md file."
echo "====================================="