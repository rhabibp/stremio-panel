#!/bin/bash

# Stremio Management Panel Docker Deployment Script

echo "====================================="
echo "Stremio Management Panel Docker Deployment"
echo "====================================="

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "Docker is not installed. Please install Docker and Docker Compose."
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo "Docker Compose is not installed. Please install Docker Compose."
    exit 1
fi

# Create SSL directory if it doesn't exist
mkdir -p ssl

# Check if SSL certificates exist
if [ ! -f ssl/fullchain.pem ] || [ ! -f ssl/privkey.pem ]; then
    echo "SSL certificates not found in the ssl directory."
    echo "For production deployment, please place your SSL certificates in the ssl directory:"
    echo "  - ssl/fullchain.pem"
    echo "  - ssl/privkey.pem"
    echo ""
    echo "For development or testing, you can generate self-signed certificates:"
    read -p "Generate self-signed certificates for testing? (y/n): " generate_ssl
    
    if [ "$generate_ssl" = "y" ] || [ "$generate_ssl" = "Y" ]; then
        echo "Generating self-signed SSL certificates..."
        openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
            -keyout ssl/privkey.pem -out ssl/fullchain.pem \
            -subj "/C=US/ST=State/L=City/O=Organization/CN=localhost"
        echo "Self-signed certificates generated."
    else
        echo "Please add your SSL certificates and run this script again."
        exit 1
    fi
fi

# Update JWT secret in docker-compose.yml
JWT_SECRET=$(openssl rand -hex 32)
sed -i "s/your_jwt_secret_change_this_in_production/$JWT_SECRET/g" docker-compose.yml

echo "Building and starting Docker containers..."
docker-compose up -d --build

echo "====================================="
echo "Docker deployment complete!"
echo "====================================="
echo "The Stremio Management Panel is now running in Docker containers."
echo ""
echo "To view logs:"
echo "  docker-compose logs -f"
echo ""
echo "To stop the containers:"
echo "  docker-compose down"
echo ""
echo "To restart the containers:"
echo "  docker-compose restart"
echo ""
echo "Access the panel at:"
echo "  http://localhost (HTTP)"
echo "  https://localhost (HTTPS)"
echo ""
echo "Don't forget to create an admin account as described in the README.md file."
echo "====================================="