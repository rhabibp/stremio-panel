#!/bin/bash

# Stremio Management Panel Zip Creation Script

echo "====================================="
echo "Creating Stremio Management Panel Zip"
echo "====================================="

# Get current date for zip filename
CURRENT_DATE=$(date +"%Y-%m-%d")
ZIP_NAME="stremio-panel-$CURRENT_DATE.zip"

# Create temporary directory for files to include in zip
TEMP_DIR="temp-zip-dir"
mkdir -p $TEMP_DIR

# Copy necessary files to temporary directory
echo "Copying files..."
cp -r backend $TEMP_DIR/
cp -r frontend $TEMP_DIR/
cp README.md $TEMP_DIR/
cp README.txt $TEMP_DIR/ 2>/dev/null || echo "README.txt not found"
cp install.sh $TEMP_DIR/
cp deploy.sh $TEMP_DIR/
cp docker-deploy.sh $TEMP_DIR/
cp docker-compose.yml $TEMP_DIR/
cp nginx-config.conf $TEMP_DIR/
cp create-admin.js $TEMP_DIR/
cp init-db.js $TEMP_DIR/
cp package.json $TEMP_DIR/
cp dev.sh $TEMP_DIR/

# Copy documentation files
echo "Copying documentation files..."
cp installation-guide.md $TEMP_DIR/ 2>/dev/null || echo "installation-guide.md not found"
cp user-guide.md $TEMP_DIR/ 2>/dev/null || echo "user-guide.md not found"
cp test-plan.md $TEMP_DIR/ 2>/dev/null || echo "test-plan.md not found"

# Create text versions of documentation files
echo "Creating text versions of documentation files..."
cp installation-guide.md $TEMP_DIR/installation-guide.txt 2>/dev/null || echo "installation-guide.md not found"
cp user-guide.md $TEMP_DIR/user-guide.txt 2>/dev/null || echo "user-guide.md not found"
cp test-plan.md $TEMP_DIR/test-plan.txt 2>/dev/null || echo "test-plan.md not found"

# Remove node_modules directories to reduce size
echo "Removing node_modules directories..."
rm -rf $TEMP_DIR/backend/node_modules
rm -rf $TEMP_DIR/frontend/node_modules

# Remove any .env files for security
echo "Removing .env files..."
rm -f $TEMP_DIR/backend/.env

# Create zip file
echo "Creating zip file..."
zip -r $ZIP_NAME $TEMP_DIR

# Move zip file to current directory and rename
mv $ZIP_NAME.zip $ZIP_NAME

# Clean up temporary directory
echo "Cleaning up..."
rm -rf $TEMP_DIR

echo "====================================="
echo "Zip file created: $ZIP_NAME"
echo "====================================="