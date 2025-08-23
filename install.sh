#!/bin/bash

# Stremio Management Panel Installation Script

echo "====================================="
echo "Stremio Management Panel Installation"
echo "====================================="

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "Node.js is not installed. Please install Node.js v14 or higher."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d 'v' -f 2 | cut -d '.' -f 1)
if [ "$NODE_VERSION" -lt 14 ]; then
    echo "Node.js version is less than 14. Please upgrade Node.js to v14 or higher."
    exit 1
fi

# Check if MongoDB is installed
if ! command -v mongod &> /dev/null; then
    echo "MongoDB is not installed. Please install MongoDB v4 or higher."
    echo "You can also use a cloud MongoDB service like MongoDB Atlas."
fi

echo "Installing backend dependencies..."
cd backend
npm install

echo "Creating .env file for backend..."
if [ ! -f .env ]; then
    cat > .env << EOL
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/stremio-panel
JWT_SECRET=$(openssl rand -hex 32)
JWT_EXPIRES_IN=7d
STREMIO_API_URL=https://api.strem.io
EOL
    echo ".env file created with a random JWT secret."
else
    echo ".env file already exists. Skipping."
fi

echo "Installing frontend dependencies..."
cd ../frontend
npm install

echo "====================================="
echo "Installation complete!"
echo "====================================="
echo "To start the backend server:"
echo "  cd backend"
echo "  npm run dev"
echo ""
echo "To start the frontend development server:"
echo "  cd frontend"
echo "  npm run dev"
echo ""
echo "After starting both servers, access the application at:"
echo "  http://localhost:3000"
echo ""
echo "Don't forget to create an admin account as described in the README.md file."
echo "====================================="