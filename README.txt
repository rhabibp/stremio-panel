# Stremio Management Panel

A comprehensive web-based panel for managing Stremio users, resellers, and addons. This panel allows you to create and manage users, sync them with official Stremio, and manage addon distribution.

## Features

- User Management: Create, update, and delete users with different roles (admin, reseller, user)
- Addon Management: Create, import, and assign addons to users
- Reseller System: Create resellers with credits for user creation
- Stremio Integration: Sync users and addons with the official Stremio API
- Dashboard: View statistics and monitor system usage
- Role-based Access Control: Different permissions for admins, resellers, and users

## Quick Start

### Prerequisites

- Node.js (v16 or higher)
- MongoDB (v4.4 or higher)
- npm or yarn

### Installation

#### Option 1: Standard Installation

1. Clone the repository:
   git clone https://github.com/yourusername/stremio-panel.git
   cd stremio-panel

2. Install dependencies:
   npm install

3. Configure environment variables:
   cp .env.example .env
   # Edit .env with your settings

4. Initialize the database:
   node init-db.js

5. Create admin user:
   node create-admin.js

6. Start the application:
   npm start

#### Option 2: Docker Installation

1. Clone the repository:
   git clone https://github.com/yourusername/stremio-panel.git
   cd stremio-panel

2. Configure environment variables:
   cp .env.example .env
   # Edit .env with your settings

3. Start with Docker Compose:
   docker-compose up -d

4. Create admin user:
   docker-compose exec backend node create-admin.js

For detailed installation instructions, see the Installation Guide (installation-guide.md).

## Documentation

- User Guide (user-guide.md): Comprehensive guide for using the application
- Installation Guide (installation-guide.md): Detailed installation instructions
- Test Plan (test-plan.md): Plan for testing the application

## Backend Setup

1. Navigate to the backend directory:
   cd backend

2. Install dependencies:
   npm install

3. Create a .env file in the backend directory with the following content:
   PORT=5000
   NODE_ENV=development
   MONGODB_URI=mongodb://localhost:27017/stremio-panel
   JWT_SECRET=your_jwt_secret_key_change_in_production
   JWT_EXPIRES_IN=7d
   STREMIO_API_URL=https://api.strem.io

4. Start the backend server:
   npm run dev

## Frontend Setup

1. Navigate to the frontend directory:
   cd frontend

2. Install dependencies:
   npm install

3. Start the frontend development server:
   npm run dev

## Architecture

The Stremio Management Panel consists of:

- Backend: Node.js with Express, MongoDB for data storage
- Frontend: React with Material UI components
- API Integration: Official Stremio API for user and addon synchronization

## VPS Deployment

### Backend Deployment

1. Set up a MongoDB database on your VPS or use a cloud service like MongoDB Atlas.

2. Install Node.js and npm on your VPS.

3. Clone the repository and navigate to the backend directory.

4. Install dependencies:
   npm install

5. Create a .env file with production settings:
   PORT=5000
   NODE_ENV=production
   MONGODB_URI=your_mongodb_connection_string
   JWT_SECRET=your_secure_jwt_secret
   JWT_EXPIRES_IN=7d
   STREMIO_API_URL=https://api.strem.io

6. Build the backend:
   npm run build

7. Use PM2 to run the backend server:
   npm install -g pm2
   pm2 start src/server.js --name stremio-panel-backend

### Frontend Deployment

1. Navigate to the frontend directory.

2. Install dependencies:
   npm install

3. Build the frontend:
   npm run build

4. Deploy the contents of the dist directory to your web server (Nginx, Apache, etc.).

5. Configure your web server to proxy API requests to the backend server.

Example Nginx configuration:
server {
    listen 80;
    server_name your-domain.com;

    root /path/to/frontend/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}

## Usage

### Admin Account

After setting up the application, you need to create an admin account:

1. Use the provided create-admin.js script to create an admin account:
   node create-admin.js

2. Follow the prompts to set up your admin username, email, and password.

### User Management

- Create Users: Admins and resellers can create new users
- Assign Addons: Assign addons to users
- Sync with Stremio: Link users to their Stremio accounts

### Addon Management

- Create Addons: Create new addons with specific resources and types
- Import Official Addons: Import addons from the official Stremio catalog
- Manage Addons: Update addon details and configuration
- Sync Addons: Sync addons with user Stremio accounts

### Reseller Management

- Create Resellers: Admins can create reseller accounts
- Assign Credits: Give credits to resellers for creating users
- Monitor Activity: Track reseller user creation and activity

## License

MIT