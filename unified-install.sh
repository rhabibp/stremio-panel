#!/bin/bash

# Unified Installation Script for Stremio Management Panel
# Version: 1.0.0
# Created: 2025-08-21

# =============================================================================
# CONFIGURATION VARIABLES
# =============================================================================
INSTALL_DIR="/opt/stremio-panel"
MONGO_URI="mongodb://localhost:27017/stremio-panel"
PORT="5000"
FRONTEND_PORT="3000"
NODE_VERSION="16"
MONGODB_VERSION="4.4"
LOG_FILE="/var/log/stremio-panel-install.log"

# =============================================================================
# UTILITY FUNCTIONS
# =============================================================================

# Print and log status messages
log_status() {
  local timestamp=$(date "+%Y-%m-%d %H:%M:%S")
  echo -e "[*] $1"
  echo -e "$timestamp [INFO] $1" >> "$LOG_FILE"
}

# Print and log success messages
log_success() {
  local timestamp=$(date "+%Y-%m-%d %H:%M:%S")
  echo -e "[✓] $1"
  echo -e "$timestamp [SUCCESS] $1" >> "$LOG_FILE"
}

# Print and log error messages
log_error() {
  local timestamp=$(date "+%Y-%m-%d %H:%M:%S")
  echo -e "[✗] $1"
  echo -e "$timestamp [ERROR] $1" >> "$LOG_FILE"
}

# Print and log warning messages
log_warning() {
  local timestamp=$(date "+%Y-%m-%d %H:%M:%S")
  echo -e "[!] $1"
  echo -e "$timestamp [WARNING] $1" >> "$LOG_FILE"
}

# Execute command with error handling
execute_command() {
  local cmd="$1"
  local error_msg="$2"
  local success_msg="$3"
  
  log_status "Executing: $cmd"
  
  # Execute the command and capture output
  output=$(eval "$cmd" 2>&1)
  exit_code=$?
  
  # Log the command output
  echo "$output" >> "$LOG_FILE"
  
  if [ $exit_code -ne 0 ]; then
    log_error "$error_msg"
    log_error "Command output: $output"
    return $exit_code
  else
    if [ -n "$success_msg" ]; then
      log_success "$success_msg"
    fi
    return 0
  fi
}

# Check if a command exists
command_exists() {
  command -v "$1" >/dev/null 2>&1
}

# Check if a service is running
service_running() {
  systemctl is-active --quiet "$1"
}

# Check if a port is in use
port_in_use() {
  netstat -tuln | grep -q ":$1 "
}

# Check system requirements
check_system_requirements() {
  log_status "Checking system requirements..."
  
  # Check if running as root
  if [ "$EUID" -ne 0 ]; then
    log_error "This script must be run as root or with sudo"
    exit 1
  fi
  
  # Check for minimum RAM (2GB)
  local total_ram=$(free -m | awk '/^Mem:/{print $2}')
  if [ "$total_ram" -lt 2000 ]; then
    log_warning "System has less than 2GB RAM ($total_ram MB). Performance may be affected."
  else
    log_success "System has adequate RAM: $total_ram MB"
  fi
  
  # Check for minimum disk space (5GB free)
  local free_space=$(df -m / | awk 'NR==2 {print $4}')
  if [ "$free_space" -lt 5000 ]; then
    log_warning "System has less than 5GB free disk space ($free_space MB). Installation may fail."
  else
    log_success "System has adequate disk space: $free_space MB free"
  fi
  
  # Check for required commands
  for cmd in curl wget unzip; do
    if ! command_exists "$cmd"; then
      log_error "Required command '$cmd' not found. Please install it and try again."
      exit 1
    fi
  done
  
  log_success "System requirements check passed"
}

# Create a backup of the installation
create_backup() {
  if [ -d "$INSTALL_DIR" ]; then
    local backup_dir="/opt/stremio-panel-backup-$(date +%Y%m%d%H%M%S)"
    log_status "Creating backup of existing installation to $backup_dir..."
    
    execute_command "cp -r $INSTALL_DIR $backup_dir" \
      "Failed to create backup" \
      "Backup created successfully at $backup_dir"
      
    # Backup MongoDB database
    if service_running "mongod"; then
      local db_backup_dir="$backup_dir/mongodb-backup"
      execute_command "mkdir -p $db_backup_dir" "Failed to create database backup directory"
      execute_command "mongodump --out $db_backup_dir" \
        "Failed to backup MongoDB database" \
        "MongoDB database backed up to $db_backup_dir"
    fi
  else
    log_status "No existing installation found, skipping backup"
  fi
}

# Install system dependencies
install_dependencies() {
  log_status "Updating system packages..."
  execute_command "apt-get update -qq" "Failed to update system packages" "System packages updated"
  
  log_status "Installing dependencies..."
  execute_command "apt-get install -y curl wget git unzip build-essential apt-transport-https ca-certificates gnupg lsb-release" \
    "Failed to install dependencies" \
    "Dependencies installed"
}

# Install Node.js
install_nodejs() {
  log_status "Installing Node.js ${NODE_VERSION}.x..."
  
  if command_exists "node"; then
    local current_version=$(node -v | cut -d 'v' -f 2 | cut -d '.' -f 1)
    if [ "$current_version" -ge "$NODE_VERSION" ]; then
      log_success "Node.js v$(node -v) is already installed and meets requirements"
      return 0
    else
      log_warning "Node.js v$(node -v) is installed but version $NODE_VERSION.x is required. Updating..."
    fi
  fi
  
  execute_command "curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | bash -" \
    "Failed to set up Node.js repository"
    
  execute_command "apt-get install -y nodejs" \
    "Failed to install Node.js" \
    "Node.js installed: $(node -v)"
}

# Install MongoDB
install_mongodb() {
  log_status "Installing MongoDB ${MONGODB_VERSION}..."
  
  if command_exists "mongod"; then
    log_success "MongoDB is already installed: $(mongod --version | head -n 1)"
    
    if ! service_running "mongod"; then
      log_warning "MongoDB service is not running. Starting it..."
      execute_command "systemctl start mongod" "Failed to start MongoDB service" "MongoDB service started"
    else
      log_success "MongoDB service is running"
    fi
    
    return 0
  fi
  
  execute_command "wget -qO - https://www.mongodb.org/static/pgp/server-${MONGODB_VERSION}.asc | apt-key add -" \
    "Failed to add MongoDB GPG key"
    
  execute_command "echo &quot;deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu $(lsb_release -cs)/mongodb-org/${MONGODB_VERSION} multiverse&quot; | tee /etc/apt/sources.list.d/mongodb-org-${MONGODB_VERSION}.list" \
    "Failed to add MongoDB repository"
    
  execute_command "apt-get update -qq" \
    "Failed to update package lists after adding MongoDB repository"
    
  execute_command "apt-get install -y mongodb-org" \
    "Failed to install MongoDB" \
    "MongoDB installed"
    
  execute_command "systemctl enable mongod" \
    "Failed to enable MongoDB service" \
    "MongoDB service enabled"
    
  execute_command "systemctl start mongod" \
    "Failed to start MongoDB service" \
    "MongoDB service started"
}

# Install Nginx
install_nginx() {
  log_status "Installing Nginx..."
  
  if command_exists "nginx"; then
    log_success "Nginx is already installed: $(nginx -v 2>&1)"
    return 0
  fi
  
  execute_command "apt-get install -y nginx" \
    "Failed to install Nginx" \
    "Nginx installed"
}

# Install PM2
install_pm2() {
  log_status "Installing PM2..."
  
  if command_exists "pm2"; then
    log_success "PM2 is already installed: $(pm2 -v)"
    return 0
  fi
  
  execute_command "npm install -g pm2" \
    "Failed to install PM2" \
    "PM2 installed: $(pm2 -v)"
}

# Extract application files
extract_files() {
  log_status "Preparing installation directory..."
  
  # Create installation directory if it doesn't exist
  if [ ! -d "$INSTALL_DIR" ]; then
    execute_command "mkdir -p $INSTALL_DIR" \
      "Failed to create installation directory" \
      "Installation directory created: $INSTALL_DIR"
  else
    log_warning "Installation directory already exists: $INSTALL_DIR"
  fi
  
  log_status "Extracting application files..."
  
  # Find the ZIP file
  local zip_file=$(ls stremio-panel-*.zip 2>/dev/null | head -n 1)
  if [ -z "$zip_file" ]; then
    log_error "Zip file not found. Please make sure the stremio-panel-*.zip file is in the current directory."
    exit 1
  fi
  
  # Extract the ZIP file
  execute_command "unzip -q &quot;$zip_file&quot; -d &quot;$INSTALL_DIR&quot;" \
    "Failed to extract files"
  
  # Move files from temp directory if needed
  execute_command "mv &quot;$INSTALL_DIR&quot;/temp-zip-dir/* &quot;$INSTALL_DIR&quot;/ 2>/dev/null || true" \
    "Failed to move files from temp directory"
    
  execute_command "rm -rf &quot;$INSTALL_DIR&quot;/temp-zip-dir 2>/dev/null || true" \
    "Failed to remove temp directory"
    
  log_success "Files extracted successfully"
}

# Configure backend
configure_backend() {
  log_status "Configuring backend..."
  
  # Generate JWT secret
  local jwt_secret=$(openssl rand -hex 32)
  log_status "Generated JWT secret"
  
  # Create backend .env file
  log_status "Creating backend environment file..."
  cat > "$INSTALL_DIR/backend/.env" << EOF
PORT=$PORT
NODE_ENV=production
MONGODB_URI=$MONGO_URI
JWT_SECRET=$jwt_secret
JWT_EXPIRES_IN=7d
STREMIO_API_URL=https://api.strem.io

# Admin Creation
ADMIN_USERNAME=$ADMIN_USERNAME
ADMIN_EMAIL=$ADMIN_EMAIL
ADMIN_PASSWORD=$ADMIN_PASSWORD
EOF

  log_success "Backend environment file created"
  
  # Install backend dependencies
  log_status "Installing backend dependencies..."
  cd "$INSTALL_DIR/backend"
  execute_command "npm install --production" \
    "Failed to install backend dependencies" \
    "Backend dependencies installed"
}

# Configure frontend
configure_frontend() {
  log_status "Configuring frontend..."
  
  cd "$INSTALL_DIR/frontend"
  
  # Update frontend package.json
  log_status "Updating frontend package.json..."
  cat > package.json << EOF
{
  "name": "stremio-panel-frontend",
  "private": true,
  "version": "1.0.0",
  "type": "commonjs",
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
    "bootstrap": "^5.3.0",
    "date-fns": "^2.30.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.3.0"
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
  log_success "Frontend package.json updated"
  
  # Update vite.config.js
  log_status "Updating Vite configuration..."
  cat > "vite.config.js" << EOF
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    'process.env': {},
    'global': {},
  },
  build: {
    rollupOptions: {
      external: [
        'bootstrap/dist/css/bootstrap.min.css'
      ]
    }
  }
})
EOF
  log_success "Vite configuration updated"
  
  # Install frontend dependencies
  log_status "Installing frontend dependencies..."
  execute_command "npm install" \
    "Failed to install frontend dependencies" \
    "Frontend dependencies installed"
    
  # Create a simple development server
  log_status "Setting up development server for frontend..."
  cat > "server.js" << EOF
const express = require('express');
const path = require('path');
const http = require('http');
const app = express();
const PORT = $FRONTEND_PORT;

// Middleware to log requests
app.use((req, res, next) => {
  console.log(\`\${new Date().toISOString()} - \${req.method} \${req.url}\`);
  next();
});

// Proxy middleware for API requests
app.use('/api', (req, res) => {
  const apiOptions = {
    hostname: 'localhost',
    port: $PORT,
    path: req.url,
    method: req.method,
    headers: {
      ...req.headers,
      host: 'localhost:$PORT'
    }
  };

  const apiReq = http.request(apiOptions, (apiRes) => {
    res.writeHead(apiRes.statusCode, apiRes.headers);
    apiRes.pipe(res);
  });

  apiReq.on('error', (e) => {
    console.error(\`API request error: \${e.message}\`);
    res.status(500).send('Error connecting to API server');
  });

  if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
    req.pipe(apiReq);
  } else {
    apiReq.end();
  }
});

// Serve static files from the React app
app.use(express.static(path.join(__dirname, 'dist')));

// For any request that doesn't match one above, send back React's index.html file
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(\`Server is running on port \${PORT}\`);
});
EOF
  
  # Install express for the development server
  execute_command "npm install express" \
    "Failed to install Express for development server" \
    "Development server setup complete"
}

# Build frontend
build_frontend() {
  log_status "Building frontend..."
  cd "$INSTALL_DIR/frontend"
  
  # Increase Node.js memory limit for build
  execute_command "NODE_OPTIONS=--max_old_space_size=4096 npm run build" \
    "Frontend build failed"
  
  if [ $? -ne 0 ]; then
    log_warning "Frontend build failed. Will use development server."
    return 1
  else
    log_success "Frontend built successfully"
    return 0
  fi
}

# Configure static frontend fallback
configure_static_frontend() {
  log_status "Setting up static frontend fallback..."
  
  # Create static-frontend directory if it doesn't exist
  if [ ! -d "$INSTALL_DIR/static-frontend" ]; then
    execute_command "mkdir -p $INSTALL_DIR/static-frontend" \
      "Failed to create static-frontend directory"
  fi
  
  # Create static-server.js
  cat > "$INSTALL_DIR/static-server.js" << EOF
const express = require('express');
const path = require('path');
const http = require('http');
const app = express();
const PORT = $FRONTEND_PORT;

// Middleware to log requests
app.use((req, res, next) => {
  console.log(\`\${new Date().toISOString()} - \${req.method} \${req.url}\`);
  next();
});

// Proxy middleware for API requests
app.use('/api', (req, res) => {
  const apiOptions = {
    hostname: 'localhost',
    port: $PORT,
    path: req.url,
    method: req.method,
    headers: {
      ...req.headers,
      host: 'localhost:$PORT'
    }
  };

  const apiReq = http.request(apiOptions, (apiRes) => {
    res.writeHead(apiRes.statusCode, apiRes.headers);
    apiRes.pipe(res);
  });

  apiReq.on('error', (e) => {
    console.error(\`API request error: \${e.message}\`);
    res.status(500).send('Error connecting to API server');
  });

  if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
    req.pipe(apiReq);
  } else {
    apiReq.end();
  }
});

// Serve static files from the static-frontend directory
app.use(express.static(path.join(__dirname, 'static-frontend')));

// Serve index.html for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'static-frontend', 'index.html'));
});

// Start the server
app.listen(PORT, '0.0.0.0', () => {
  console.log(\`Static frontend server running on port \${PORT}\`);
});
EOF
  
  # Create static frontend HTML
  cat > "$INSTALL_DIR/static-frontend/index.html" << EOF
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Stremio Management Panel</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <style>
        body {
            background-color: #121212;
            color: #ffffff;
            font-family: Arial, sans-serif;
        }
        .container {
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
        }
        .card {
            background-color: #1e1e1e;
            border: none;
            margin-bottom: 20px;
        }
        .btn-primary {
            background-color: #1976d2;
            border-color: #1976d2;
        }
        .header {
            text-align: center;
            margin-bottom: 40px;
        }
        .header h1 {
            color: #1976d2;
        }
        .login-form {
            max-width: 400px;
            margin: 0 auto;
        }
        .form-control {
            background-color: #333;
            border-color: #444;
            color: #fff;
        }
        .form-control:focus {
            background-color: #444;
            border-color: #1976d2;
            color: #fff;
        }
    </style>
</head>
<body>
    <div class="container mt-5">
        <div class="header">
            <h1>Stremio Management Panel</h1>
            <p>Access your Stremio management interface</p>
        </div>

        <div class="card">
            <div class="card-body">
                <div class="login-form">
                    <h3 class="mb-4">Login</h3>
                    <div class="mb-3">
                        <label for="username" class="form-label">Username</label>
                        <input type="text" class="form-control" id="username" placeholder="Enter username">
                    </div>
                    <div class="mb-3">
                        <label for="password" class="form-label">Password</label>
                        <input type="password" class="form-control" id="password" placeholder="Enter password">
                    </div>
                    <div class="d-grid gap-2">
                        <button class="btn btn-primary" id="loginButton">Login</button>
                    </div>
                    <div class="mt-3" id="errorMessage" style="color: #f44336; display: none;"></div>
                </div>
            </div>
        </div>

        <div class="card" id="dashboardCard" style="display: none;">
            <div class="card-body">
                <h3>Dashboard</h3>
                <p>Welcome to the Stremio Management Panel. You are now logged in.</p>
                <div class="d-grid gap-2">
                    <button class="btn btn-primary" id="usersButton">Manage Users</button>
                    <button class="btn btn-primary" id="addonsButton">Manage Addons</button>
                    <button class="btn btn-primary" id="resellersButton">Manage Resellers</button>
                    <button class="btn btn-danger" id="logoutButton">Logout</button>
                </div>
            </div>
        </div>
    </div>

    <script>
        // Store the token
        let authToken = localStorage.getItem('authToken');
        let currentUser = null;

        // Check if user is already logged in
        if (authToken) {
            fetchUserProfile();
        }

        // Login button click handler
        document.getElementById('loginButton').addEventListener('click', async () => {
            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;
            
            if (!username || !password) {
                showError('Please enter both username and password');
                return;
            }
            
            try {
                const response = await fetch('/api/auth/login', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ username, password })
                });
                
                const data = await response.json();
                
                if (!response.ok) {
                    throw new Error(data.message || 'Login failed');
                }
                
                // Store token and user data
                authToken = data.token;
                currentUser = data.user;
                localStorage.setItem('authToken', authToken);
                
                // Show dashboard
                showDashboard();
                
            } catch (error) {
                showError(error.message || 'Login failed. Please try again.');
            }
        });

        // Logout button click handler
        document.getElementById('logoutButton').addEventListener('click', () => {
            authToken = null;
            currentUser = null;
            localStorage.removeItem('authToken');
            hideDashboard();
        });

        // Fetch user profile
        async function fetchUserProfile() {
            try {
                const response = await fetch('/api/auth/profile', {
                    headers: {
                        'Authorization': `Bearer ${authToken}`
                    }
                });
                
                if (!response.ok) {
                    throw new Error('Failed to fetch user profile');
                }
                
                currentUser = await response.json();
                showDashboard();
                
            } catch (error) {
                console.error('Error fetching profile:', error);
                localStorage.removeItem('authToken');
            }
        }

        // Show error message
        function showError(message) {
            const errorElement = document.getElementById('errorMessage');
            errorElement.textContent = message;
            errorElement.style.display = 'block';
        }

        // Show dashboard
        function showDashboard() {
            document.querySelector('.login-form').style.display = 'none';
            document.getElementById('dashboardCard').style.display = 'block';
        }

        // Hide dashboard
        function hideDashboard() {
            document.querySelector('.login-form').style.display = 'block';
            document.getElementById('dashboardCard').style.display = 'none';
        }

        // Button handlers for dashboard actions
        document.getElementById('usersButton').addEventListener('click', () => {
            alert('User management is not available in this simplified interface.');
        });

        document.getElementById('addonsButton').addEventListener('click', () => {
            alert('Addon management is not available in this simplified interface.');
        });

        document.getElementById('resellersButton').addEventListener('click', () => {
            alert('Reseller management is not available in this simplified interface.');
        });
    </script>
</body>
</html>
EOF
  
  # Install express for the static server
  cd "$INSTALL_DIR"
  execute_command "npm install express" \
    "Failed to install Express for static server" \
    "Static frontend fallback setup complete"
}

# Configure Nginx
configure_nginx() {
  local frontend_type="$1"
  log_status "Configuring Nginx for $frontend_type..."
  
  if [ "$frontend_type" = "production" ]; then
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
  elif [ "$frontend_type" = "development" ]; then
    # Configure Nginx to proxy to the dev server
    cat > /etc/nginx/sites-available/stremio-panel.conf << EOF
server {
    listen 80 default_server;

    location / {
        proxy_pass http://localhost:$FRONTEND_PORT;
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
  elif [ "$frontend_type" = "static" ]; then
    # Configure Nginx to proxy to the static server
    cat > /etc/nginx/sites-available/stremio-panel.conf << EOF
server {
    listen 80 default_server;

    location / {
        proxy_pass http://localhost:$FRONTEND_PORT;
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
  
  # Enable the site
  execute_command "ln -sf /etc/nginx/sites-available/stremio-panel.conf /etc/nginx/sites-enabled/" \
    "Failed to enable Nginx site configuration"
    
  # Test Nginx configuration
  execute_command "nginx -t" \
    "Nginx configuration test failed" \
    "Nginx configuration test passed"
    
  # Restart Nginx
  execute_command "systemctl restart nginx" \
    "Failed to restart Nginx" \
    "Nginx restarted successfully"
}

# Initialize database
initialize_database() {
  log_status "Initializing database..."
  
  # Install mongoose in the root directory for init-db.js
  cd "$INSTALL_DIR"
  execute_command "npm init -y" \
    "Failed to initialize npm in root directory"
    
  execute_command "npm install mongoose dotenv" \
    "Failed to install mongoose and dotenv" \
    "Mongoose and dotenv installed"
    
  # Run init-db.js
  execute_command "node init-db.js" \
    "Failed to initialize database. Continuing anyway..." \
    "Database initialized successfully"
}

# Create admin user
create_admin_user() {
  log_status "Creating admin user..."
  
  cd "$INSTALL_DIR"
  execute_command "node create-admin.js" \
    "Failed to create admin user. Continuing anyway..." \
    "Admin user created successfully"
}

# Configure PM2
configure_pm2() {
  log_status "Creating PM2 ecosystem config..."
  
  cat > "$INSTALL_DIR/ecosystem.config.js" << EOF
module.exports = {
  apps: [
    {
      name: 'stremio-panel-backend',
      script: './backend/src/server.js',
      cwd: '$INSTALL_DIR',
      env: {
        NODE_ENV: 'production',
      },
      max_memory_restart: '300M',
      restart_delay: 3000,
      max_restarts: 10
    }
  ]
};
EOF

  log_success "PM2 ecosystem config created"
}

# Start services with PM2
start_services() {
  local frontend_type="$1"
  log_status "Starting services with PM2..."
  
  # Start backend
  cd "$INSTALL_DIR"
  execute_command "pm2 start ecosystem.config.js" \
    "Failed to start backend service" \
    "Backend service started"
    
  # Start frontend based on type
  if [ "$frontend_type" = "production" ]; then
    # Add frontend server to PM2 config
    execute_command "pm2 start frontend/server.js --name stremio-panel-frontend" \
      "Failed to start frontend service" \
      "Frontend service started"
  elif [ "$frontend_type" = "development" ]; then
    # Start frontend dev server
    execute_command "cd frontend && pm2 start npm --name stremio-panel-frontend -- run dev -- --host 0.0.0.0 --port $FRONTEND_PORT" \
      "Failed to start frontend development server" \
      "Frontend development server started"
  elif [ "$frontend_type" = "static" ]; then
    # Start static frontend server
    execute_command "pm2 start static-server.js --name stremio-panel-frontend" \
      "Failed to start static frontend server" \
      "Static frontend server started"
  fi
  
  # Save PM2 configuration
  execute_command "pm2 save" \
    "Failed to save PM2 configuration" \
    "PM2 configuration saved"
    
  # Configure PM2 to start on boot
  execute_command "pm2 startup" \
    "Failed to configure PM2 startup" \
    "PM2 configured to start on boot"
}

# Create health check script
create_health_check() {
  log_status "Creating health check script..."
  
  cat > "$INSTALL_DIR/health-check.sh" << EOF
#!/bin/bash

# Health check script for Stremio Management Panel
# This script checks the status of all services and attempts to restart them if needed

# Check if MongoDB is running
check_mongodb() {
  if systemctl is-active --quiet mongod; then
    echo "[✓] MongoDB is running"
    return 0
  else
    echo "[✗] MongoDB is not running. Attempting to restart..."
    systemctl restart mongod
    sleep 5
    if systemctl is-active --quiet mongod; then
      echo "[✓] MongoDB restarted successfully"
      return 0
    else
      echo "[✗] Failed to restart MongoDB"
      return 1
    fi
  fi
}

# Check if Nginx is running
check_nginx() {
  if systemctl is-active --quiet nginx; then
    echo "[✓] Nginx is running"
    return 0
  else
    echo "[✗] Nginx is not running. Attempting to restart..."
    systemctl restart nginx
    sleep 2
    if systemctl is-active --quiet nginx; then
      echo "[✓] Nginx restarted successfully"
      return 0
    else
      echo "[✗] Failed to restart Nginx"
      return 1
    fi
  fi
}

# Check if backend is running
check_backend() {
  if pm2 list | grep -q "stremio-panel-backend.*online"; then
    echo "[✓] Backend service is running"
    return 0
  else
    echo "[✗] Backend service is not running. Attempting to restart..."
    pm2 restart stremio-panel-backend
    sleep 5
    if pm2 list | grep -q "stremio-panel-backend.*online"; then
      echo "[✓] Backend service restarted successfully"
      return 0
    else
      echo "[✗] Failed to restart backend service"
      return 1
    fi
  fi
}

# Check if frontend is running
check_frontend() {
  if pm2 list | grep -q "stremio-panel-frontend.*online"; then
    echo "[✓] Frontend service is running"
    return 0
  else
    echo "[✗] Frontend service is not running. Attempting to restart..."
    pm2 restart stremio-panel-frontend
    sleep 5
    if pm2 list | grep -q "stremio-panel-frontend.*online"; then
      echo "[✓] Frontend service restarted successfully"
      return 0
    else
      echo "[✗] Failed to restart frontend service"
      return 1
    fi
  fi
}

# Check if API is responding
check_api() {
  if curl -s -o /dev/null -w "%{http_code}" http://localhost:$PORT/api/health | grep -q "200"; then
    echo "[✓] API is responding"
    return 0
  else
    echo "[✗] API is not responding. Backend may need attention."
    return 1
  fi
}

# Run all checks
echo "=== Stremio Management Panel Health Check ==="
echo "$(date)"
echo "----------------------------------------"

check_mongodb
mongodb_status=$?

check_nginx
nginx_status=$?

check_backend
backend_status=$?

check_frontend
frontend_status=$?

check_api
api_status=$?

echo "----------------------------------------"
echo "Health check summary:"
echo "MongoDB: $([ $mongodb_status -eq 0 ] && echo "OK" || echo "FAIL")"
echo "Nginx: $([ $nginx_status -eq 0 ] && echo "OK" || echo "FAIL")"
echo "Backend: $([ $backend_status -eq 0 ] && echo "OK" || echo "FAIL")"
echo "Frontend: $([ $frontend_status -eq 0 ] && echo "OK" || echo "FAIL")"
echo "API: $([ $api_status -eq 0 ] && echo "OK" || echo "FAIL")"

# Overall status
if [ $mongodb_status -eq 0 ] && [ $nginx_status -eq 0 ] && [ $backend_status -eq 0 ] && [ $frontend_status -eq 0 ]; then
  echo "Overall status: HEALTHY"
  exit 0
else
  echo "Overall status: UNHEALTHY - Some services need attention"
  exit 1
fi
EOF
  
  # Make the script executable
  execute_command "chmod +x $INSTALL_DIR/health-check.sh" \
    "Failed to make health check script executable" \
    "Health check script created"
    
  # Create a cron job to run the health check every 15 minutes
  log_status "Setting up health check cron job..."
  (crontab -l 2>/dev/null; echo "*/15 * * * * $INSTALL_DIR/health-check.sh >> /var/log/stremio-panel-health.log 2>&1") | crontab -
  log_success "Health check cron job created"
}

# Create API health endpoint
create_api_health_endpoint() {
  log_status "Creating API health endpoint..."
  
  # Create health route file
  mkdir -p "$INSTALL_DIR/backend/src/routes"
  cat > "$INSTALL_DIR/backend/src/routes/health.js" << EOF
const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

router.get('/', async (req, res) => {
  try {
    // Check MongoDB connection
    const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
    
    // Return health status
    res.status(200).json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      services: {
        api: 'running',
        database: dbStatus
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});

module.exports = router;
EOF
  
  # Update server.js to include the health route
  # First, check if the health route is already included
  if ! grep -q "health" "$INSTALL_DIR/backend/src/server.js"; then
    # Find the line where routes are defined
    local routes_line=$(grep -n "app.use('/api" "$INSTALL_DIR/backend/src/server.js" | head -1 | cut -d':' -f1)
    
    if [ -n "$routes_line" ]; then
      # Insert the health route before the first route
      sed -i "${routes_line}i// Health check route\nconst healthRoutes = require('./routes/health');\napp.use('/api/health', healthRoutes);\n" "$INSTALL_DIR/backend/src/server.js"
      log_success "API health endpoint added to server.js"
    else
      log_warning "Could not find routes in server.js. Health endpoint not added."
    fi
  else
    log_success "API health endpoint already exists"
  fi
}

# Print installation summary
print_summary() {
  local frontend_type="$1"
  
  echo "============================================================"
  echo "          Stremio Management Panel - Installation Complete          "
  echo "============================================================"
  echo "Installation Directory: $INSTALL_DIR"
  local ip_address=$(hostname -I | awk '{print $1}')
  echo "Access URL: http://$ip_address"
  echo "Admin Username: $ADMIN_USERNAME"
  echo "Admin Email: $ADMIN_EMAIL"
  echo "Backend Port: $PORT"
  echo "Frontend Port: $FRONTEND_PORT"
  echo "MongoDB URI: $MONGO_URI"
  echo "Frontend Type: $frontend_type"
  echo ""
  echo "Important Commands:"
  echo "1. Check service status: pm2 status"
  echo "2. View backend logs: pm2 logs stremio-panel-backend"
  echo "3. View frontend logs: pm2 logs stremio-panel-frontend"
  echo "4. Restart services: pm2 restart all"
  echo "5. Run health check: $INSTALL_DIR/health-check.sh"
  echo ""
  echo "Thank you for installing the Stremio Management Panel!"
}

# =============================================================================
# MAIN INSTALLATION PROCESS
# =============================================================================

# Create log file
touch "$LOG_FILE"
chmod 644 "$LOG_FILE"

log_status "Starting Stremio Management Panel installation..."
log_status "Installation log: $LOG_FILE"

# Check system requirements
check_system_requirements

# Create backup of existing installation
create_backup

# Install system dependencies
install_dependencies

# Install Node.js
install_nodejs

# Install MongoDB
install_mongodb

# Install Nginx
install_nginx

# Install PM2
install_pm2

# Get admin credentials
log_status "Setting up admin credentials..."
ADMIN_USERNAME="admin"
log_status "Admin username: $ADMIN_USERNAME"

ADMIN_EMAIL="admin@example.com"
log_status "Admin email: $ADMIN_EMAIL"

echo "Please enter admin password: "
read -s ADMIN_PASSWORD
if [ -z "$ADMIN_PASSWORD" ]; then
  log_error "Admin password cannot be empty."
  exit 1
fi

echo "Please confirm admin password: "
read -s ADMIN_PASSWORD_CONFIRM
if [ "$ADMIN_PASSWORD" != "$ADMIN_PASSWORD_CONFIRM" ]; then
  log_error "Passwords do not match."
  exit 1
fi

# Extract application files
extract_files

# Configure backend
configure_backend

# Configure frontend
configure_frontend

# Create API health endpoint
create_api_health_endpoint

# Try to build frontend
build_frontend
frontend_build_success=$?

# Configure services based on frontend build success
if [ $frontend_build_success -eq 0 ]; then
  # Frontend build succeeded, use production setup
  configure_nginx "production"
  configure_pm2
  initialize_database
  create_admin_user
  start_services "production"
  create_health_check
  print_summary "production"
else
  # Frontend build failed, try development server
  log_warning "Frontend build failed. Trying development server..."
  
  configure_nginx "development"
  configure_pm2
  initialize_database
  create_admin_user
  start_services "development"
  
  # Check if development server is working
  sleep 5
  if curl -s -o /dev/null -w "%{http_code}" http://localhost:$FRONTEND_PORT | grep -q "200"; then
    log_success "Development server is working"
    create_health_check
    print_summary "development"
  else
    # Development server failed, use static frontend
    log_warning "Development server failed. Setting up static frontend..."
    
    configure_static_frontend
    configure_nginx "static"
    start_services "static"
    create_health_check
    print_summary "static"
  fi
fi

log_success "Installation completed successfully!"