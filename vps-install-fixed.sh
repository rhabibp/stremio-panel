#!/bin/bash

# Stremio Management Panel - VPS Installation Script
# This script automates the installation of the Stremio Management Panel on a VPS server

# Text formatting
BOLD=$(tput bold)
RED=$(tput setaf 1)
GREEN=$(tput setaf 2)
YELLOW=$(tput setaf 3)
BLUE=$(tput setaf 4)
RESET=$(tput sgr0)

# Print header
echo "${BOLD}${BLUE}"
echo "============================================================"
echo "          Stremio Management Panel - VPS Installer          "
echo "============================================================"
echo "${RESET}"

# Check if running as root
if [ "$EUID" -ne 0 ]; then
  echo "${RED}Please run this script as root or with sudo${RESET}"
  exit 1
fi

# Function to print status messages
print_status() {
  echo "${BOLD}${BLUE}[*] $1${RESET}"
}

# Function to print success messages
print_success() {
  echo "${BOLD}${GREEN}[✓] $1${RESET}"
}

# Function to print error messages
print_error() {
  echo "${BOLD}${RED}[✗] $1${RESET}"
}

# Function to print warning messages
print_warning() {
  echo "${BOLD}${YELLOW}[!] $1${RESET}"
}

# Function to check if a command exists
command_exists() {
  command -v "$1" >/dev/null 2>&1
}

# Check system requirements
print_status "Checking system requirements..."

# Check OS
if [ -f /etc/os-release ]; then
  . /etc/os-release
  OS=$NAME
  VER=$VERSION_ID
  
  if [[ "$OS" != *"Ubuntu"* ]] && [[ "$OS" != *"Debian"* ]]; then
    print_warning "This script is optimized for Ubuntu/Debian. You're using $OS $VER."
    echo -n "${BOLD}${BLUE}Continue anyway? [y/N]: ${RESET}"
    read -r continue_anyway
    if [[ ! "$continue_anyway" =~ ^[Yy]$ ]]; then
      print_error "Installation aborted."
      exit 1
    fi
  else
    print_success "Operating System: $OS $VER"
  fi
else
  print_warning "Could not determine OS. Proceeding anyway."
fi

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

# Install Node.js if not already installed
if ! command_exists node; then
  print_status "Installing Node.js..."
  curl -fsSL https://deb.nodesource.com/setup_16.x | bash -
  apt-get install -y nodejs
  if ! command_exists node; then
    print_error "Failed to install Node.js."
    exit 1
  fi
  print_success "Node.js installed: $(node -v)"
else
  print_success "Node.js already installed: $(node -v)"
fi

# Install MongoDB if not already installed
if ! command_exists mongod; then
  print_status "Installing MongoDB..."
  wget -qO - https://www.mongodb.org/static/pgp/server-4.4.asc | apt-key add -
  echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu $(lsb_release -cs)/mongodb-org/4.4 multiverse" | tee /etc/apt/sources.list.d/mongodb-org-4.4.list
  apt-get update -qq
  apt-get install -y mongodb-org
  systemctl enable mongod
  systemctl start mongod
  if ! systemctl is-active --quiet mongod; then
    print_error "Failed to start MongoDB."
    exit 1
  fi
  print_success "MongoDB installed and started."
else
  print_success "MongoDB already installed."
  if ! systemctl is-active --quiet mongod; then
    print_status "Starting MongoDB..."
    systemctl start mongod
    if ! systemctl is-active --quiet mongod; then
      print_error "Failed to start MongoDB."
      exit 1
    fi
    print_success "MongoDB started."
  else
    print_success "MongoDB is already running."
  fi
fi

# Install Nginx if not already installed
if ! command_exists nginx; then
  print_status "Installing Nginx..."
  apt-get install -y nginx
  if ! command_exists nginx; then
    print_error "Failed to install Nginx."
    exit 1
  fi
  print_success "Nginx installed."
else
  print_success "Nginx already installed."
fi

# Install PM2 if not already installed
if ! command_exists pm2; then
  print_status "Installing PM2..."
  npm install -g pm2
  if ! command_exists pm2; then
    print_error "Failed to install PM2."
    exit 1
  fi
  print_success "PM2 installed."
else
  print_success "PM2 already installed."
fi

# Get installation directory
INSTALL_DIR="/opt/stremio-panel"
echo -n "${BOLD}${BLUE}Enter installation directory [${YELLOW}$INSTALL_DIR${BLUE}]: ${RESET}"
read -r input_install_dir
if [ -n "$input_install_dir" ]; then
  INSTALL_DIR="$input_install_dir"
fi

# Create installation directory
print_status "Creating installation directory..."
mkdir -p "$INSTALL_DIR"
if [ ! -d "$INSTALL_DIR" ]; then
  print_error "Failed to create installation directory."
  exit 1
fi
print_success "Installation directory created."

# Ask for domain name
echo -n "${BOLD}${BLUE}Enter your domain name (leave empty for IP-based access): ${RESET}"
read -r DOMAIN_NAME

# Ask for MongoDB connection string
MONGO_URI="mongodb://localhost:27017/stremio-panel"
echo -n "${BOLD}${BLUE}Enter MongoDB connection string [${YELLOW}$MONGO_URI${BLUE}]: ${RESET}"
read -r input_mongo_uri
if [ -n "$input_mongo_uri" ]; then
  MONGO_URI="$input_mongo_uri"
fi

# Ask for JWT secret
JWT_SECRET=$(openssl rand -hex 32)
echo -n "${BOLD}${BLUE}Enter JWT secret key [${YELLOW}$JWT_SECRET${BLUE}]: ${RESET}"
read -r input_jwt_secret
if [ -n "$input_jwt_secret" ]; then
  JWT_SECRET="$input_jwt_secret"
fi

# Ask for port
PORT="5000"
echo -n "${BOLD}${BLUE}Enter backend port [${YELLOW}$PORT${BLUE}]: ${RESET}"
read -r input_port
if [ -n "$input_port" ]; then
  PORT="$input_port"
fi

# Ask for admin credentials
ADMIN_USERNAME="admin"
echo -n "${BOLD}${BLUE}Enter admin username [${YELLOW}$ADMIN_USERNAME${BLUE}]: ${RESET}"
read -r input_admin_username
if [ -n "$input_admin_username" ]; then
  ADMIN_USERNAME="$input_admin_username"
fi

ADMIN_EMAIL="admin@example.com"
echo -n "${BOLD}${BLUE}Enter admin email [${YELLOW}$ADMIN_EMAIL${BLUE}]: ${RESET}"
read -r input_admin_email
if [ -n "$input_admin_email" ]; then
  ADMIN_EMAIL="$input_admin_email"
fi

# Ask for admin password with hidden input
ADMIN_PASSWORD=""
while [ -z "$ADMIN_PASSWORD" ]; do
  echo -n "${BOLD}${BLUE}Enter admin password (input will be hidden): ${RESET}"
  read -rs ADMIN_PASSWORD
  echo
  if [ -z "$ADMIN_PASSWORD" ]; then
    print_error "Admin password cannot be empty."
  fi
done

# Confirm admin password
echo -n "${BOLD}${BLUE}Confirm admin password (input will be hidden): ${RESET}"
read -rs ADMIN_PASSWORD_CONFIRM
echo

# Check if passwords match
if [ "$ADMIN_PASSWORD" != "$ADMIN_PASSWORD_CONFIRM" ]; then
  print_error "Passwords do not match. Please try again."
  exit 1
fi

# Extract files
print_status "Extracting files..."
ZIP_FILES=$(ls stremio-panel-*.zip 2>/dev/null)
if [ -n "$ZIP_FILES" ]; then
  ZIP_FILE=$(ls stremio-panel-*.zip | head -n 1)
  unzip -q "$ZIP_FILE" -d "$INSTALL_DIR"
  if [ $? -ne 0 ]; then
    print_error "Failed to extract files."
    exit 1
  fi
  # Move files from the temp directory to the installation directory
  mv "$INSTALL_DIR"/temp-zip-dir/* "$INSTALL_DIR"/ 2>/dev/null || true
  rm -rf "$INSTALL_DIR"/temp-zip-dir 2>/dev/null || true
  print_success "Files extracted."
else
  print_error "Zip file not found. Please make sure the stremio-panel-*.zip file is in the current directory."
  exit 1
fi

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
if [ $? -ne 0 ]; then
  print_error "Failed to install backend dependencies."
  exit 1
fi
print_success "Backend dependencies installed."

# Fix for crypto.getRandomValues issue in Vite
print_status "Applying fix for crypto.getRandomValues issue..."
cat > "$INSTALL_DIR/frontend/vite.config.js.new" << EOF
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    // Fix for crypto.getRandomValues issue
    '__vite_process_env_NODE_ENV': JSON.stringify(process.env.NODE_ENV),
    'process.env': {}
  },
  build: {
    commonjsOptions: {
      transformMixedEsModules: true
    }
  }
})
EOF

mv "$INSTALL_DIR/frontend/vite.config.js.new" "$INSTALL_DIR/frontend/vite.config.js"
print_success "Fix applied."

# Install frontend dependencies and build
print_status "Installing frontend dependencies..."
cd "$INSTALL_DIR/frontend"
npm install
if [ $? -ne 0 ]; then
  print_error "Failed to install frontend dependencies."
  exit 1
fi
print_success "Frontend dependencies installed."

# Install crypto-browserify and other polyfills
print_status "Installing polyfills for browser compatibility..."
npm install --save crypto-browserify stream-browserify buffer process
print_success "Polyfills installed."

# Create a polyfill file
print_status "Creating polyfill file..."
mkdir -p "$INSTALL_DIR/frontend/src/utils"
cat > "$INSTALL_DIR/frontend/src/utils/polyfills.js" << EOF
import { Buffer } from 'buffer';
import process from 'process';

window.Buffer = Buffer;
window.process = process;

// Polyfill for crypto.getRandomValues
if (!window.crypto) {
  window.crypto = {};
}
if (!window.crypto.getRandomValues) {
  window.crypto.getRandomValues = function(array) {
    for (let i = 0; i < array.length; i++) {
      array[i] = Math.floor(Math.random() * 256);
    }
    return array;
  };
}
EOF

# Update main.jsx to import polyfills
print_status "Updating main.jsx to import polyfills..."
sed -i '1s/^/import ".\/utils\/polyfills.js";\n/' "$INSTALL_DIR/frontend/src/main.jsx"
print_success "Main.jsx updated."

print_status "Building frontend..."
cd "$INSTALL_DIR/frontend"
NODE_OPTIONS=--max_old_space_size=4096 npm run build
if [ $? -ne 0 ]; then
  print_error "Failed to build frontend."
  
  # Fallback to serving the frontend in development mode
  print_warning "Attempting to serve frontend in development mode as a fallback..."
  
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
  
  # Update the Nginx configuration to proxy to the dev server
  print_status "Updating Nginx configuration to use development server..."
  if [ -n "$DOMAIN_NAME" ]; then
    # Domain-based configuration
    cat > /etc/nginx/sites-available/stremio-panel.conf << EOF
server {
    listen 80;
    server_name $DOMAIN_NAME;

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
    # IP-based configuration
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
  fi
  
  print_warning "Frontend will run in development mode. This is not recommended for production."
else
  print_success "Frontend built successfully."
  
  # Configure Nginx for production build
  print_status "Configuring Nginx..."
  if [ -n "$DOMAIN_NAME" ]; then
    # Domain-based configuration
    cat > /etc/nginx/sites-available/stremio-panel.conf << EOF
server {
    listen 80;
    server_name $DOMAIN_NAME;

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
  else
    # IP-based configuration
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
fi

# Initialize database
print_status "Initializing database..."
cd "$INSTALL_DIR"
node init-db.js
if [ $? -ne 0 ]; then
  print_error "Failed to initialize database."
  exit 1
fi
print_success "Database initialized."

# Create admin user
print_status "Creating admin user..."
node create-admin.js
if [ $? -ne 0 ]; then
  print_error "Failed to create admin user."
  exit 1
fi
print_success "Admin user created."

# Configure PM2 for backend
print_status "Configuring PM2 for backend..."
cd "$INSTALL_DIR/backend"
pm2 start src/server.js --name stremio-panel-backend
if [ $? -ne 0 ]; then
  print_error "Failed to start backend with PM2."
  exit 1
fi
pm2 save
pm2 startup
print_success "Backend started with PM2."

# Enable the site
ln -sf /etc/nginx/sites-available/stremio-panel.conf /etc/nginx/sites-enabled/
# Test Nginx configuration
nginx -t
if [ $? -ne 0 ]; then
  print_error "Nginx configuration test failed."
  exit 1
fi
# Restart Nginx
systemctl restart nginx
if [ $? -ne 0 ]; then
  print_error "Failed to restart Nginx."
  exit 1
fi
print_success "Nginx configured and restarted."

# Print installation summary
echo "${BOLD}${GREEN}"
echo "============================================================"
echo "          Stremio Management Panel - Installation Complete          "
echo "============================================================"
echo "${RESET}"
echo "${BOLD}Installation Directory:${RESET} $INSTALL_DIR"
if [ -n "$DOMAIN_NAME" ]; then
  echo "${BOLD}Access URL:${RESET} http://$DOMAIN_NAME"
else
  IP_ADDRESS=$(hostname -I | awk '{print $1}')
  echo "${BOLD}Access URL:${RESET} http://$IP_ADDRESS"
fi
echo "${BOLD}Admin Username:${RESET} $ADMIN_USERNAME"
echo "${BOLD}Admin Email:${RESET} $ADMIN_EMAIL"
echo "${BOLD}Backend Port:${RESET} $PORT"
echo "${BOLD}MongoDB URI:${RESET} $MONGO_URI"
echo ""
echo "${BOLD}${YELLOW}Important Notes:${RESET}"
echo "1. If you want to use HTTPS, please install certbot and run:"
echo "   sudo certbot --nginx -d $DOMAIN_NAME"
echo "2. To check the backend status, run: pm2 status"
echo "3. To view backend logs, run: pm2 logs stremio-panel-backend"
echo "4. To restart the backend, run: pm2 restart stremio-panel-backend"
echo "5. To update the panel in the future, download the new zip file and run this script again."
echo ""
echo "${BOLD}${GREEN}Thank you for installing the Stremio Management Panel!${RESET}"