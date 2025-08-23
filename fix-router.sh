#!/bin/bash

# Fix script for path-to-regexp error in Stremio Management Panel

# Check if running as root
if [ "$EUID" -ne 0 ]; then
  echo "Please run this script as root or with sudo"
  exit 1
fi

# Set installation directory
INSTALL_DIR="/opt/stremio-panel"
echo "[*] Using installation directory: $INSTALL_DIR"

# Check if the directory exists
if [ ! -d "$INSTALL_DIR" ]; then
  echo "[✗] Installation directory not found. Please specify the correct path."
  exit 1
fi

# Stop the frontend service
echo "[*] Stopping frontend service..."
pm2 stop stremio-panel-frontend

# Install specific version of react-router-dom
echo "[*] Installing compatible version of react-router-dom..."
cd "$INSTALL_DIR/frontend"
npm install react-router-dom@6.3.0 --save

# Create a fixed App.jsx with proper route definitions
echo "[*] Creating fixed App.jsx..."
cat > "$INSTALL_DIR/frontend/src/App.jsx" << 'EOF'
import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';

// Layout components
import Layout from './components/layout/Layout';
import ProtectedRoute from './components/common/ProtectedRoute';

// Pages
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import Dashboard from './pages/dashboard/Dashboard';
import Profile from './pages/profile/Profile';
import NotFound from './pages/NotFound';

// User pages
import UserManagement from './pages/users/UserManagement';
import UserDetails from './pages/users/UserDetails';

// Addon pages
import AddonManagement from './pages/addons/AddonManagement';
import AddonDetails from './pages/addons/AddonDetails';

// Reseller pages
import ResellerManagement from './pages/resellers/ResellerManagement';
import ResellerDetails from './pages/resellers/ResellerDetails';

// Auth context
import { AuthProvider } from './context/AuthContext';

const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#f50057',
    },
    background: {
      default: '#121212',
      paper: '#1e1e1e',
    },
  },
});

function App() {
  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <AuthProvider>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          
          {/* Protected routes */}
          <Route path="/" element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            
            {/* User routes */}
            <Route path="users" element={<UserManagement />} />
            <Route path="users/:id" element={<UserDetails />} />
            <Route path="users/create" element={<UserDetails />} />
            
            {/* Addon routes */}
            <Route path="addons" element={<AddonManagement />} />
            <Route path="addons/:id" element={<AddonDetails />} />
            <Route path="addons/create" element={<AddonDetails />} />
            
            {/* Reseller routes */}
            <Route path="resellers" element={<ResellerManagement />} />
            <Route path="resellers/:id" element={<ResellerDetails />} />
            <Route path="resellers/create" element={<ResellerDetails />} />
            
            {/* Profile route */}
            <Route path="profile" element={<Profile />} />
          </Route>
          
          {/* 404 route */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
EOF

# Create a fixed ProtectedRoute component
echo "[*] Creating fixed ProtectedRoute component..."
mkdir -p "$INSTALL_DIR/frontend/src/components/common"
cat > "$INSTALL_DIR/frontend/src/components/common/ProtectedRoute.jsx" << 'EOF'
import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import CircularProgress from '@mui/material/CircularProgress';
import Box from '@mui/material/Box';

const ProtectedRoute = ({ children }) => {
  const { currentUser, loading } = useAuth();

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  return children ? children : <Outlet />;
};

export default ProtectedRoute;
EOF

# Rebuild the frontend
echo "[*] Rebuilding frontend..."
cd "$INSTALL_DIR/frontend"
npm run build

# Restart the frontend service
echo "[*] Restarting frontend service..."
pm2 restart stremio-panel-frontend

echo "[✓] Fix applied successfully!"
echo "Please check the frontend logs with: pm2 logs stremio-panel-frontend"