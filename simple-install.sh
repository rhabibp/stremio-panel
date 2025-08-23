#!/bin/bash

# Simple installation script for Stremio Management Panel

# Check if running as root
if [ "$EUID" -ne 0 ]; then
  echo "Please run this script as root or with sudo"
  exit 1
fi

# Print status messages
print_status() {
  echo "[*] $1"
}

# Print success messages
print_success() {
  echo "[✓] $1"
}

# Print error messages
print_error() {
  echo "[✗] $1"
}

# Print warning messages
print_warning() {
  echo "[!] $1"
}

# Update system packages
print_status "Updating system packages..."
apt-get update -qq
if [ $? -ne 0 ]; then
  print_error "Failed to update system packages."
  exit 1
fi
print_success "System packages updated."

# Install dependencies
print_status "Installing dependencies..."
apt-get install -y curl wget git unzip build-essential apt-transport-https ca-certificates gnupg lsb-release
if [ $? -ne 0 ]; then
  print_error "Failed to install dependencies."
  exit 1
fi
print_success "Dependencies installed."

# Install Node.js 16.x
print_status "Installing Node.js 16.x..."
curl -fsSL https://deb.nodesource.com/setup_16.x | bash -
apt-get install -y nodejs
print_success "Node.js installed: $(node -v)"

# Install MongoDB
print_status "Installing MongoDB..."
wget -qO - https://www.mongodb.org/static/pgp/server-4.4.asc | apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu $(lsb_release -cs)/mongodb-org/4.4 multiverse" | tee /etc/apt/sources.list.d/mongodb-org-4.4.list
apt-get update -qq
apt-get install -y mongodb-org
systemctl enable mongod
systemctl start mongod
print_success "MongoDB installed and started."

# Install Nginx
print_status "Installing Nginx..."
apt-get install -y nginx
print_success "Nginx installed."

# Install PM2
print_status "Installing PM2..."
npm install -g pm2
print_success "PM2 installed."

# Set installation directory
INSTALL_DIR="/opt/stremio-panel"
print_status "Installation directory: $INSTALL_DIR"

# Create installation directory
mkdir -p $INSTALL_DIR
print_success "Installation directory created."

# Ask for MongoDB connection string
MONGO_URI="mongodb://localhost:27017/stremio-panel"
echo "Using MongoDB URI: $MONGO_URI"

# Generate JWT secret
JWT_SECRET=$(openssl rand -hex 32)
echo "Generated JWT secret: $JWT_SECRET"

# Set backend port
PORT="5000"
echo "Using backend port: $PORT"

# Set admin credentials
ADMIN_USERNAME="admin"
echo "Admin username: $ADMIN_USERNAME"

ADMIN_EMAIL="admin@example.com"
echo "Admin email: $ADMIN_EMAIL"

echo "Please enter admin password: "
read -s ADMIN_PASSWORD
if [ -z "$ADMIN_PASSWORD" ]; then
  print_error "Admin password cannot be empty."
  exit 1
fi

echo "Please confirm admin password: "
read -s ADMIN_PASSWORD_CONFIRM
if [ "$ADMIN_PASSWORD" != "$ADMIN_PASSWORD_CONFIRM" ]; then
  print_error "Passwords do not match."
  exit 1
fi

# Extract files
print_status "Extracting files..."
ZIP_FILE=$(ls stremio-panel-*.zip 2>/dev/null | head -n 1)
if [ -z "$ZIP_FILE" ]; then
  print_error "Zip file not found. Please make sure the stremio-panel-*.zip file is in the current directory."
  exit 1
fi

unzip -q "$ZIP_FILE" -d "$INSTALL_DIR"
if [ $? -ne 0 ]; then
  print_error "Failed to extract files."
  exit 1
fi

# Move files from the temp directory to the installation directory
mv "$INSTALL_DIR"/temp-zip-dir/* "$INSTALL_DIR"/ 2>/dev/null || true
rm -rf "$INSTALL_DIR"/temp-zip-dir 2>/dev/null || true
print_success "Files extracted."

# Create backend .env file
print_status "Creating backend environment file..."
cat > "$INSTALL_DIR/backend/.env" << EOF
PORT=$PORT
NODE_ENV=production
MONGODB_URI=$MONGO_URI
JWT_SECRET=$JWT_SECRET
JWT_EXPIRES_IN=7d
STREMIO_API_URL=https://api.strem.io

# Admin Creation
ADMIN_USERNAME=$ADMIN_USERNAME
ADMIN_EMAIL=$ADMIN_EMAIL
ADMIN_PASSWORD=$ADMIN_PASSWORD
EOF
print_success "Backend environment file created."

# Install backend dependencies
print_status "Installing backend dependencies..."
cd "$INSTALL_DIR/backend"
npm install --production
print_success "Backend dependencies installed."

# Update frontend package.json
print_status "Updating frontend package.json..."
cd "$INSTALL_DIR/frontend"
cat > package.json << EOF
{
  "name": "stremio-panel-frontend",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "lint": "eslint . --ext js,jsx --report-unused-disable-directives --max-warnings 0",
    "preview": "vite preview"
  },
  "dependencies": {
    "@emotion/react": "^11.11.1",
    "@emotion/styled": "^11.11.0",
    "@mui/icons-material": "^5.14.3",
    "@mui/material": "^5.14.5",
    "@mui/x-date-pickers": "^6.11.2",
    "axios": "^1.4.0",
    "date-fns": "^2.30.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.15.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.15",
    "@types/react-dom": "^18.2.7",
    "@vitejs/plugin-react": "^4.0.3",
    "eslint": "^8.45.0",
    "eslint-plugin-react": "^7.32.2",
    "eslint-plugin-react-hooks": "^4.6.0",
    "eslint-plugin-react-refresh": "^0.4.3",
    "vite": "^4.4.5"
  }
}
EOF
print_success "Frontend package.json updated."

# Update vite.config.js
print_status "Updating Vite configuration..."
cat > "$INSTALL_DIR/frontend/vite.config.js" << EOF
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    'process.env': {}
  }
})
EOF
print_success "Vite configuration updated."

# Install frontend dependencies
print_status "Installing frontend dependencies..."
npm install
print_success "Frontend dependencies installed."

# Build frontend
print_status "Building frontend..."
NODE_OPTIONS=--max_old_space_size=4096 npm run build
if [ $? -ne 0 ]; then
  print_error "Failed to build frontend. Setting up development server instead."
  
  # Create a PM2 config for the frontend dev server
  cat > "$INSTALL_DIR/frontend/ecosystem.config.js" << EOF
module.exports = {
  apps: [{
    name: 'stremio-panel-frontend',
    script: 'npm',
    args: 'run dev -- --host 0.0.0.0 --port 3000',
    cwd: '$INSTALL_DIR/frontend',
    env: {
      NODE_ENV: 'production',
    }
  }]
};
EOF
  
  # Start the frontend dev server with PM2
  pm2 start "$INSTALL_DIR/frontend/ecosystem.config.js"
  
  # Configure Nginx to proxy to the dev server
  cat > /etc/nginx/sites-available/stremio-panel.conf << EOF
server {
    listen 80 default_server;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }

    location /api {
        proxy_pass http://localhost:$PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF
else
  print_success "Frontend built successfully."
  
  # Configure Nginx for production build
  cat > /etc/nginx/sites-available/stremio-panel.conf << EOF
server {
    listen 80 default_server;

    root $INSTALL_DIR/frontend/dist;
    index index.html;

    location / {
        try_files \$uri \$uri/ /index.html;
    }

    location /api {
        proxy_pass http://localhost:$PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF
fi

# Initialize database
print_status "Initializing database..."
cd "$INSTALL_DIR"
node init-db.js
print_success "Database initialized."

# Create admin user
print_status "Creating admin user..."
node create-admin.js
print_success "Admin user created."

# Configure PM2 for backend
print_status "Configuring PM2 for backend..."
cd "$INSTALL_DIR/backend"
pm2 start src/server.js --name stremio-panel-backend
pm2 save
pm2 startup
print_success "Backend started with PM2."

# Enable the site
ln -sf /etc/nginx/sites-available/stremio-panel.conf /etc/nginx/sites-enabled/
nginx -t
systemctl restart nginx
print_success "Nginx configured and restarted."

# Print installation summary
echo "============================================================"
echo "          Stremio Management Panel - Installation Complete          "
echo "============================================================"
echo "Installation Directory: $INSTALL_DIR"
IP_ADDRESS=$(hostname -I | awk '{print $1}')
echo "Access URL: http://$IP_ADDRESS"
echo "Admin Username: $ADMIN_USERNAME"
echo "Admin Email: $ADMIN_EMAIL"
echo "Backend Port: $PORT"
echo "MongoDB URI: $MONGO_URI"
echo ""
echo "Important Notes:"
echo "1. To check the backend status, run: pm2 status"
echo "2. To view backend logs, run: pm2 logs stremio-panel-backend"
echo "3. To restart the backend, run: pm2 restart stremio-panel-backend"
echo ""
echo "Thank you for installing the Stremio Management Panel!"