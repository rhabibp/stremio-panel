#!/bin/bash

# Create Enhanced Package for Stremio Management Panel
# This script creates a new release package with all enhancements

# Set version
VERSION="2.0.0"
TIMESTAMP=$(date +"%Y-%m-%d")
PACKAGE_NAME="stremio-panel-enhanced-${VERSION}-${TIMESTAMP}"

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

# Check if running in the correct directory
if [ ! -d "backend" ] || [ ! -d "frontend" ]; then
  print_error "Please run this script from the root of the Stremio Management Panel directory"
  exit 1
fi

print_status "Creating enhanced package for Stremio Management Panel v${VERSION}"

# Create temporary directory
print_status "Creating temporary directory..."
TEMP_DIR="${PACKAGE_NAME}"
mkdir -p "${TEMP_DIR}"
print_success "Temporary directory created"

# Copy core files
print_status "Copying core files..."
cp -r backend "${TEMP_DIR}/"
cp -r frontend "${TEMP_DIR}/"
cp README.md "${TEMP_DIR}/"
cp installation-guide.md "${TEMP_DIR}/"
cp user-guide.md "${TEMP_DIR}/"
cp test-plan.md "${TEMP_DIR}/"
cp create-admin.js "${TEMP_DIR}/"
cp init-db.js "${TEMP_DIR}/"
print_success "Core files copied"

# Copy enhancement files
print_status "Copying enhancement files..."
cp unified-install.sh "${TEMP_DIR}/"
cp optimize-database.js "${TEMP_DIR}/"
cp batch-operations.js "${TEMP_DIR}/"
cp setup-monitoring.sh "${TEMP_DIR}/"
cp monitoring-dashboard.html "${TEMP_DIR}/"
cp ENHANCEMENTS.md "${TEMP_DIR}/"
cp QUICK-START.md "${TEMP_DIR}/"

# Create monitoring directory
mkdir -p "${TEMP_DIR}/monitoring"
cp monitoring-dashboard.html "${TEMP_DIR}/monitoring/index.html"

# Create static frontend directory
mkdir -p "${TEMP_DIR}/static-frontend"
cp static-frontend/index.html "${TEMP_DIR}/static-frontend/"

# Copy server scripts
cp simple-server.js "${TEMP_DIR}/"
cp static-server.js "${TEMP_DIR}/"
print_success "Enhancement files copied"

# Make scripts executable
print_status "Making scripts executable..."
chmod +x "${TEMP_DIR}/unified-install.sh"
chmod +x "${TEMP_DIR}/setup-monitoring.sh"
print_success "Scripts made executable"

# Create version file
print_status "Creating version file..."
cat > "${TEMP_DIR}/VERSION.md" << EOF
# Stremio Management Panel - Enhanced Edition

Version: ${VERSION}
Release Date: ${TIMESTAMP}

## Enhancements

- Unified installation script with improved error handling
- Health check system for monitoring deployment status
- Monitoring dashboard for system status
- Database optimization tools
- Batch operations for user and addon management
- Enhanced security features

See ENHANCEMENTS.md for detailed information.
EOF
print_success "Version file created"

# Create README.txt for Windows users
print_status "Creating README.txt..."
cat > "${TEMP_DIR}/README.txt" << EOF
Stremio Management Panel - Enhanced Edition
Version: ${VERSION}
Release Date: ${TIMESTAMP}

INSTALLATION INSTRUCTIONS
------------------------

For detailed installation instructions, please refer to the installation-guide.md file.
For a quick start guide, please refer to the QUICK-START.md file.

Quick Start:
1. Upload all files to your server
2. Make the unified-install.sh script executable: chmod +x unified-install.sh
3. Run the installation script: sudo ./unified-install.sh
4. Follow the on-screen instructions

ENHANCEMENTS
-----------

This enhanced edition includes:
- Unified installation script with improved error handling
- Health check system for monitoring deployment status
- Monitoring dashboard for system status
- Database optimization tools
- Batch operations for user and addon management
- Enhanced security features

For detailed information about the enhancements, please refer to the ENHANCEMENTS.md file.

DOCUMENTATION
------------

- README.md: General information about the application
- QUICK-START.md: Quick start guide for installation and usage
- installation-guide.md: Detailed installation instructions
- user-guide.md: Guide for using the application
- test-plan.md: Testing procedures
- ENHANCEMENTS.md: Details about the enhanced features

SUPPORT
-------

If you encounter any issues, please check the troubleshooting section in the installation guide.
EOF
print_success "README.txt created"

# Create zip package
print_status "Creating zip package..."
zip -r "${PACKAGE_NAME}.zip" "${TEMP_DIR}" > /dev/null
print_success "Zip package created: ${PACKAGE_NAME}.zip"

# Clean up
print_status "Cleaning up..."
rm -rf "${TEMP_DIR}"
print_success "Cleanup completed"

print_success "Enhanced package created successfully: ${PACKAGE_NAME}.zip"
echo "You can now distribute this package to users."