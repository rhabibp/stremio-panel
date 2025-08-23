#!/bin/bash

# Stremio Management Panel - VPS Installation Script
# This script automates the installation of the Stremio Management Panel on a VPS server

# Text formatting
BOLD="\e[1m"
RED="\e[31m"
GREEN="\e[32m"
YELLOW="\e[33m"
BLUE="\e[34m"
RESET="\e[0m"

# Print header
echo -e "${BOLD}${BLUE}"
echo "============================================================"
echo "          Stremio Management Panel - VPS Installer          "
echo "============================================================"
echo -e "${RESET}"

# Check if running as root
if [ "$EUID" -ne 0 ]; then
  echo -e "${RED}Please run this script as root or with sudo${RESET}"
  exit 1
fi

# Function to print status messages
print_status() {
  echo -e "${BOLD}${BLUE}[*] $1${RESET}"
}

# Function to print success messages
print_success() {
  echo -e "${BOLD}${GREEN}[✓] $1${RESET}"
}

# Function to print error messages
print_error() {
  echo -e "${BOLD}${RED}[✗] $1${RESET}"
}

# Function to print warning messages
print_warning() {
  echo -e "${BOLD}${YELLOW}[!] $1${RESET}"
}

# Function to check if a command exists
command_exists() {
  command -v "$1" >/dev/null 2>&1
}

# Function to ask for user input
ask_input() {
  local prompt="$1"
  local default="$2"
  local var_name="$3"
  local input=""
  
  if [ -n "$default" ]; then
    echo -ne "${BOLD}${BLUE}$prompt${RESET} [${YELLOW}$default${RESET}]: "
  else
    echo -ne "${BOLD}${BLUE}$prompt${RESET}: "
  fi
  
  read -r input
  
  if [ -z "$input" ] && [ -n "$default" ]; then
    input="$default"
  fi
  
  eval "$var_name=&quot;$input&quot;"
}

# Function to ask for password input (with hidden input)
ask_password() {
  local prompt="$1"
  local var_name="$2"
  local password=""
  
  echo -ne "${BOLD}${BLUE}$prompt${RESET}: "
  read -rs password
  echo
  
  eval "$var_name=&quot;$password&quot;"
}

# Function to ask for yes/no confirmation
ask_yes_no() {
  local prompt="$1"
  local default="$2"
  local var_name="$3"
  local input=""
  local default_display=""
  
  if [ "$default" = "y" ]; then
    default_display="Y/n"
  else
    default_display="y/N"
  fi
  
  echo -ne "${BOLD}${BLUE}$prompt${RESET} [${YELLOW}$default_display${RESET}]: "
  read -r input
  
  if [ -z "$input" ]; then
    input="$default"
  fi
  
  if [[ "$input" =~ ^[Yy]$ ]]; then
    eval "$var_name=true"
  else
    eval "$var_name=false"
  fi
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
    ask_yes_no "Continue anyway?" "n" "continue_anyway"
    if [ "$continue_anyway" = false ]; then
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
ask_input "Enter installation directory" "$INSTALL_DIR" "INSTALL_DIR"

# Create installation directory
print_status "Creating installation directory..."
mkdir -p "$INSTALL_DIR"
if [ ! -d "$INSTALL_DIR" ]; then
  print_error "Failed to create installation directory."
  exit 1
fi
print_success "Installation directory created."

# Ask for domain name
ask_input "Enter your domain name (leave empty for IP-based access)" "" "DOMAIN_NAME"

# Ask for MongoDB connection string
MONGO_URI="mongodb://localhost:27017/stremio-panel"
ask_input "Enter MongoDB connection string" "$MONGO_URI" "MONGO_URI"

# Ask for JWT secret
JWT_SECRET=$(openssl rand -hex 32)
ask_input "Enter JWT secret key" "$JWT_SECRET" "JWT_SECRET"

# Ask for port
PORT="5000"
ask_input "Enter backend port" "$PORT" "PORT"

# Ask for admin credentials
ask_input "Enter admin username" "admin" "ADMIN_USERNAME"
ask_input "Enter admin email" "admin@example.com" "ADMIN_EMAIL"

# Ask for admin password with hidden input
ADMIN_PASSWORD=""
while [ -z "$ADMIN_PASSWORD" ]; do
  ask_password "Enter admin password (input will be hidden)" "ADMIN_PASSWORD"
  if [ -z "$ADMIN_PASSWORD" ]; then
    print_error "Admin password cannot be empty."
  fi
done

# Confirm admin password
ADMIN_PASSWORD_CONFIRM=""
ask_password "Confirm admin password (input will be hidden)" "ADMIN_PASSWORD_CONFIRM"

# Check if passwords match
if [ "$ADMIN_PASSWORD" != "$ADMIN_PASSWORD_CONFIRM" ]; then
  print_error "Passwords do not match. Please try again."
  exit 1
fi

# Extract files
print_status "Extracting files..."
if [ -f "stremio-panel-*.zip" ]; then
  ZIP_FILE=$(ls stremio-panel-*.zip | head -n 1)
  unzip -q "$ZIP_FILE" -d "$INSTALL_DIR"
  if [ $? -ne 0 ]; then
    print_error "Failed to extract files."
    exit 1
  fi
  # Move files from the temp directory to the installation directory
  mv "$INSTALL_DIR"/temp-zip-dir/* "$INSTALL_DIR"/
  rm -rf "$INSTALL_DIR"/temp-zip-dir
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

# Install frontend dependencies and build
print_status "Installing frontend dependencies..."
cd "$INSTALL_DIR/frontend"
npm install
if [ $? -ne 0 ]; then
  print_error "Failed to install frontend dependencies."
  exit 1
fi
print_success "Frontend dependencies installed."

print_status "Building frontend..."
npm run build
if [ $? -ne 0 ]; then
  print_error "Failed to build frontend."
  exit 1
fi
print_success "Frontend built."

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
pm2 start src/server.js --name stremio-panel
if [ $? -ne 0 ]; then
  print_error "Failed to start backend with PM2."
  exit 1
fi
pm2 save
pm2 startup
print_success "Backend started with PM2."

# Configure Nginx
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
echo -e "${BOLD}${GREEN}"
echo "============================================================"
echo "          Stremio Management Panel - Installation Complete          "
echo "============================================================"
echo -e "${RESET}"
echo -e "${BOLD}Installation Directory:${RESET} $INSTALL_DIR"
if [ -n "$DOMAIN_NAME" ]; then
  echo -e "${BOLD}Access URL:${RESET} http://$DOMAIN_NAME"
else
  IP_ADDRESS=$(hostname -I | awk '{print $1}')
  echo -e "${BOLD}Access URL:${RESET} http://$IP_ADDRESS"
fi
echo -e "${BOLD}Admin Username:${RESET} $ADMIN_USERNAME"
echo -e "${BOLD}Admin Email:${RESET} $ADMIN_EMAIL"
echo -e "${BOLD}Backend Port:${RESET} $PORT"
echo -e "${BOLD}MongoDB URI:${RESET} $MONGO_URI"
echo ""
echo -e "${BOLD}${YELLOW}Important Notes:${RESET}"
echo "1. If you want to use HTTPS, please install certbot and run:"
echo "   sudo certbot --nginx -d $DOMAIN_NAME"
echo "2. To check the backend status, run: pm2 status"
echo "3. To view backend logs, run: pm2 logs stremio-panel"
echo "4. To restart the backend, run: pm2 restart stremio-panel"
echo "5. To update the panel in the future, download the new zip file and run this script again."
echo ""
echo -e "${BOLD}${GREEN}Thank you for installing the Stremio Management Panel!${RESET}"