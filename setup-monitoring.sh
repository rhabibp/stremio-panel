#!/bin/bash

# Setup Monitoring for Stremio Management Panel
# Version: 1.0.0
# Created: 2025-08-21

# Check if running as root
if [ "$EUID" -ne 0 ]; then
  echo "Please run this script as root or with sudo"
  exit 1
fi

# Set installation directory
INSTALL_DIR="/opt/stremio-panel"
MONITORING_PORT=3001
LOG_FILE="/var/log/stremio-panel-monitoring.log"

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

# Create log file
touch "$LOG_FILE"
chmod 644 "$LOG_FILE"

print_status "Setting up monitoring for Stremio Management Panel..."

# Check if installation directory exists
if [ ! -d "$INSTALL_DIR" ]; then
  print_error "Installation directory not found: $INSTALL_DIR"
  exit 1
fi

# Create monitoring directory
print_status "Creating monitoring directory..."
mkdir -p "$INSTALL_DIR/monitoring"
print_success "Monitoring directory created"

# Copy monitoring dashboard
print_status "Setting up monitoring dashboard..."
cp monitoring-dashboard.html "$INSTALL_DIR/monitoring/index.html"
print_success "Monitoring dashboard copied"

# Create monitoring server
print_status "Creating monitoring server..."
cat > "$INSTALL_DIR/monitoring/server.js" << EOF
const express = require('express');
const path = require('path');
const { exec } = require('child_process');
const fs = require('fs');
const app = express();
const PORT = $MONITORING_PORT;

// Middleware to log requests
app.use((req, res, next) => {
  console.log(\`\${new Date().toISOString()} - \${req.method} \${req.url}\`);
  next();
});

// Serve static files
app.use(express.static(path.join(__dirname)));

// API endpoint to get system status
app.get('/api/status', (req, res) => {
  const data = {
    timestamp: new Date().toISOString(),
    services: {},
    system: {},
    database: {}
  };
  
  // Get PM2 process list
  exec('pm2 jlist', (err, stdout) => {
    if (err) {
      console.error('Error getting PM2 processes:', err);
      data.services.error = 'Failed to get PM2 processes';
    } else {
      try {
        const processes = JSON.parse(stdout);
        data.services.processes = processes.map(p => ({
          name: p.name,
          status: p.pm2_env.status,
          uptime: p.pm2_env.pm_uptime ? Math.floor((Date.now() - p.pm2_env.pm_uptime) / 1000) : 0,
          memory: p.monit ? p.monit.memory : 0,
          cpu: p.monit ? p.monit.cpu : 0
        }));
      } catch (e) {
        console.error('Error parsing PM2 output:', e);
        data.services.error = 'Failed to parse PM2 output';
      }
    }
    
    // Get system info
    exec('cat /proc/uptime && free -b && df -B1 / && cat /proc/loadavg', (err, stdout) => {
      if (err) {
        console.error('Error getting system info:', err);
        data.system.error = 'Failed to get system info';
      } else {
        try {
          const lines = stdout.split('\\n');
          
          // Parse uptime
          const uptime = parseFloat(lines[0].split(' ')[0]);
          data.system.uptime = uptime;
          
          // Parse memory info
          const memInfo = lines[1].split(/\\s+/);
          data.system.memory = {
            total: parseInt(memInfo[1], 10),
            used: parseInt(memInfo[2], 10),
            free: parseInt(memInfo[3], 10),
            usagePercent: Math.round((parseInt(memInfo[2], 10) / parseInt(memInfo[1], 10)) * 100)
          };
          
          // Parse disk info
          const diskInfo = lines[3].split(/\\s+/);
          data.system.disk = {
            total: parseInt(diskInfo[1], 10),
            used: parseInt(diskInfo[2], 10),
            free: parseInt(diskInfo[3], 10),
            usagePercent: Math.round((parseInt(diskInfo[2], 10) / parseInt(diskInfo[1], 10)) * 100)
          };
          
          // Parse CPU load
          const loadInfo = lines[4].split(' ');
          data.system.load = {
            load1: parseFloat(loadInfo[0]),
            load5: parseFloat(loadInfo[1]),
            load15: parseFloat(loadInfo[2])
          };
        } catch (e) {
          console.error('Error parsing system info:', e);
          data.system.error = 'Failed to parse system info';
        }
      }
      
      // Get MongoDB status
      exec('mongo --eval "db.stats()"', (err, stdout) => {
        if (err) {
          console.error('Error getting MongoDB stats:', err);
          data.database.status = 'disconnected';
          data.database.error = 'Failed to connect to MongoDB';
        } else {
          try {
            data.database.status = 'connected';
            
            // Try to parse MongoDB stats
            const statsMatch = stdout.match(/\{[\s\S]*\}/);
            if (statsMatch) {
              try {
                const statsStr = statsMatch[0].replace(/NumberLong\((\d+)\)/g, '$1')
                                              .replace(/NumberInt\((\d+)\)/g, '$1');
                data.database.stats = JSON.parse(statsStr);
              } catch (e) {
                console.error('Error parsing MongoDB stats:', e);
                data.database.error = 'Failed to parse MongoDB stats';
              }
            }
          } catch (e) {
            console.error('Error processing MongoDB output:', e);
            data.database.error = 'Failed to process MongoDB output';
          }
        }
        
        // Get service status
        exec('systemctl is-active nginx && systemctl is-active mongod', (err, stdout) => {
          const services = stdout.split('\\n');
          data.services.nginx = services[0].trim();
          data.services.mongodb = services[1].trim();
          
          // Return the complete data
          res.json(data);
        });
      });
    });
  });
});

// API endpoint to run health check
app.get('/api/health-check', (req, res) => {
  exec('bash /opt/stremio-panel/health-check.sh', (err, stdout, stderr) => {
    res.json({
      timestamp: new Date().toISOString(),
      success: !err,
      output: stdout,
      error: stderr
    });
  });
});

// API endpoint to get logs
app.get('/api/logs', (req, res) => {
  const source = req.query.source || 'all';
  const lines = parseInt(req.query.lines || '100', 10);
  
  let command = '';
  
  switch (source) {
    case 'backend':
      command = \`pm2 logs stremio-panel-backend --lines \${lines} --nostream\`;
      break;
    case 'frontend':
      command = \`pm2 logs stremio-panel-frontend --lines \${lines} --nostream\`;
      break;
    case 'nginx':
      command = \`tail -n \${lines} /var/log/nginx/error.log\`;
      break;
    case 'mongodb':
      command = \`tail -n \${lines} /var/log/mongodb/mongod.log\`;
      break;
    case 'all':
    default:
      command = \`
        echo "=== Backend Logs ===";
        pm2 logs stremio-panel-backend --lines \${lines/2} --nostream;
        echo "\\n=== Frontend Logs ===";
        pm2 logs stremio-panel-frontend --lines \${lines/2} --nostream;
      \`;
      break;
  }
  
  exec(command, (err, stdout, stderr) => {
    res.json({
      timestamp: new Date().toISOString(),
      source: source,
      logs: stdout,
      error: err ? stderr : null
    });
  });
});

// API endpoint to manage services
app.post('/api/services/:service/:action', express.json(), (req, res) => {
  const { service, action } = req.params;
  
  // Validate service and action
  const validServices = ['stremio-panel-backend', 'stremio-panel-frontend', 'nginx', 'mongod'];
  const validActions = ['start', 'stop', 'restart'];
  
  if (!validServices.includes(service)) {
    return res.status(400).json({ error: 'Invalid service' });
  }
  
  if (!validActions.includes(action)) {
    return res.status(400).json({ error: 'Invalid action' });
  }
  
  let command = '';
  
  // PM2 services
  if (service === 'stremio-panel-backend' || service === 'stremio-panel-frontend') {
    command = \`pm2 \${action} \${service}\`;
  } 
  // System services
  else {
    command = \`systemctl \${action} \${service}\`;
  }
  
  exec(command, (err, stdout, stderr) => {
    if (err) {
      console.error(\`Error \${action}ing \${service}:\`, err);
      return res.status(500).json({
        success: false,
        error: stderr || err.message
      });
    }
    
    res.json({
      success: true,
      service: service,
      action: action,
      output: stdout
    });
  });
});

// Serve index.html for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Start the server
app.listen(PORT, '0.0.0.0', () => {
  console.log(\`Monitoring server running on port \${PORT}\`);
});
EOF
print_success "Monitoring server created"

# Install dependencies
print_status "Installing dependencies..."
cd "$INSTALL_DIR/monitoring"
npm init -y
npm install express
print_success "Dependencies installed"

# Create PM2 config for monitoring server
print_status "Creating PM2 config for monitoring server..."
cat > "$INSTALL_DIR/monitoring/ecosystem.config.js" << EOF
module.exports = {
  apps: [
    {
      name: 'stremio-panel-monitoring',
      script: './server.js',
      cwd: '$INSTALL_DIR/monitoring',
      env: {
        NODE_ENV: 'production',
      },
      max_memory_restart: '200M',
      restart_delay: 3000,
      max_restarts: 10
    }
  ]
};
EOF
print_success "PM2 config created"

# Start monitoring server
print_status "Starting monitoring server..."
cd "$INSTALL_DIR/monitoring"
pm2 start ecosystem.config.js
pm2 save
print_success "Monitoring server started"

# Configure Nginx for monitoring dashboard
print_status "Configuring Nginx for monitoring dashboard..."
cat > /etc/nginx/sites-available/stremio-panel-monitoring.conf << EOF
server {
    listen 8080;
    server_name _;

    location / {
        proxy_pass http://localhost:$MONITORING_PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
        
        # Basic authentication
        auth_basic "Stremio Management Panel Monitoring";
        auth_basic_user_file /etc/nginx/.htpasswd;
    }
}
EOF

# Create basic auth credentials
print_status "Setting up basic authentication..."
echo "Please enter username for monitoring dashboard:"
read -r MONITOR_USER

if [ -z "$MONITOR_USER" ]; then
  MONITOR_USER="admin"
  echo "Using default username: $MONITOR_USER"
fi

echo "Please enter password for monitoring dashboard:"
read -rs MONITOR_PASS

if [ -z "$MONITOR_PASS" ]; then
  MONITOR_PASS=$(openssl rand -base64 12)
  echo "Using generated password: $MONITOR_PASS"
fi

# Install apache2-utils for htpasswd if not already installed
if ! command -v htpasswd &> /dev/null; then
  print_status "Installing apache2-utils for htpasswd..."
  apt-get install -y apache2-utils
  print_success "apache2-utils installed"
fi

# Create htpasswd file
htpasswd -bc /etc/nginx/.htpasswd "$MONITOR_USER" "$MONITOR_PASS"
chmod 640 /etc/nginx/.htpasswd
chown www-data:www-data /etc/nginx/.htpasswd
print_success "Basic authentication configured"

# Enable the site
ln -sf /etc/nginx/sites-available/stremio-panel-monitoring.conf /etc/nginx/sites-enabled/
nginx -t
systemctl restart nginx
print_success "Nginx configured for monitoring dashboard"

# Create a cron job to restart monitoring if it goes down
print_status "Setting up monitoring watchdog..."
(crontab -l 2>/dev/null; echo "*/5 * * * * if ! pm2 pid stremio-panel-monitoring > /dev/null; then cd $INSTALL_DIR/monitoring && pm2 start ecosystem.config.js; fi") | crontab -
print_success "Monitoring watchdog configured"

# Print summary
IP_ADDRESS=$(hostname -I | awk '{print $1}')
echo "============================================================"
echo "          Stremio Management Panel - Monitoring Setup          "
echo "============================================================"
echo "Monitoring URL: http://$IP_ADDRESS:8080"
echo "Username: $MONITOR_USER"
echo "Password: $MONITOR_PASS"
echo ""
echo "Important Notes:"
echo "1. The monitoring dashboard is protected with basic authentication"
echo "2. The monitoring server runs on port $MONITORING_PORT internally"
echo "3. The dashboard is accessible on port 8080 externally"
echo "4. To check monitoring status, run: pm2 status stremio-panel-monitoring"
echo "5. To view monitoring logs, run: pm2 logs stremio-panel-monitoring"
echo ""
echo "Monitoring setup complete!"