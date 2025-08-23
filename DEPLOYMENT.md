# Stremio Management Panel Deployment Guide

This guide provides detailed instructions for deploying the Stremio Management Panel.

## 1. Introduction

The Stremio Management Panel is a web-based application for managing Stremio users, resellers, and addons. It consists of a Node.js backend, a React frontend, and can be extended with plugins.

## 2. Prerequisites

Before you begin, ensure you have the following software installed on your server:

*   **Node.js** (v16 or later)
*   **npm** (v8 or later)
*   **Git**
*   **Docker** (for containerized deployment)
*   **Docker Compose** (for containerized deployment)
*   **PM2** (for manual deployment)
*   **Nginx** (for manual deployment)

## 3. Installation

### 3.1. Clone the Repository

```bash
git clone https://github.com/your-repository/stremio-panel.git
cd stremio-panel
```

### 3.2. Install Dependencies

You can install dependencies for both the backend and frontend using the following command from the root directory:

```bash
npm run install:all
```

Alternatively, you can install them separately:

```bash
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### 3.3. Configure the Environment

The backend requires a `.env` file for configuration. Create a file named `.env` in the `backend` directory and add the following variables:

```
PORT=5000
NODE_ENV=production
MONGODB_URI=mongodb://stremio:stremiopassword@mongodb:27017/stremio-panel?authSource=admin
JWT_SECRET=your_jwt_secret_change_this_in_production
JWT_EXPIRES_IN=7d
STREMIO_API_URL=https://api.strem.io
```

**Note:** For a production environment, it is crucial to change `JWT_SECRET` to a secure, random string.

## 4. Deployment

You can deploy the application using Docker Compose (recommended) or by deploying the backend and frontend manually.

### 4.1. Docker Compose Deployment (Recommended)

The `docker-compose.yml` file is configured to run the backend, frontend, and a MongoDB database.

1.  **Generate SSL Certificates:** The `docker-deploy.sh` script can generate self-signed certificates for testing purposes. For production, you should use your own SSL certificates. Place your `fullchain.pem` and `privkey.pem` in a `ssl` directory in the project root.

2.  **Run the Deployment Script:** The `docker-deploy.sh` script automates the deployment process. It will generate a `JWT_SECRET`, update the `docker-compose.yml` file, and start the containers.

    ```bash
    ./docker-deploy.sh
    ```

3.  **Access the Application:** The application will be accessible at `http://localhost` and `https://localhost`.

### 4.2. Manual Deployment

#### 4.2.1. Build the Frontend

From the `frontend` directory, run the build command:

```bash
npm run build
```

The production-ready files will be located in the `frontend/dist` directory.

#### 4.2.2. Run the Backend with PM2

PM2 is a process manager for Node.js applications. It will keep your backend running in the background and restart it if it crashes.

1.  **Start the Backend:** From the project root directory, run:

    ```bash
    pm2 start backend/src/server.js --name stremio-panel-backend
    ```

2.  **Verify:** Check the status of the application:

    ```bash
    pm2 list
    ```

#### 4.2.3. Configure Nginx

You need to configure Nginx as a reverse proxy to serve the frontend and forward API requests to the backend. A sample configuration is provided in `nginx-config.conf`.

**Note:** Remember to replace `your-domain.com` and the paths to your SSL certificates and frontend build files.

## 5. Plugin Installation

The application supports plugins to extend its functionality. The `pin-auth` and `proxy` plugins are included.

To install a plugin, you can use the `install-plugin.js` script:

```bash
node install-plugin.js <plugin-name>
```

For example, to install the `pin-auth` plugin:

```bash
node install-plugin.js pin-auth
```

The script will add the plugin's dependencies to the backend's `package.json` and enable it in the application. After installing a plugin, you need to restart the backend.

## 6. Post-Installation

### 6.1. Create an Admin User

After deploying the application, you need to create an admin user to access the management panel. You can do this by running the `create-admin.js` script from the project root:

```bash
node create-admin.js
```

You will be prompted to enter a username, email, and password for the new admin user.

## 7. Troubleshooting

*   **`.env` file not found:** Make sure you have created a `.env` file in the `backend` directory with all the required variables.
*   **PM2 process not starting:** Check the PM2 logs for errors: `pm2 logs stremio-panel-backend`.
*   **Nginx errors:** Check the Nginx error logs for any configuration issues. The log file paths are specified in your Nginx configuration.
*   **Docker container issues:** Use `docker-compose logs -f` to view the logs of all running containers.
