import React, { useState, useEffect } from 'react';
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
import UserManagement from './pages/users/UserManagement';
import UserDetails from './pages/users/UserDetails';
import AddonManagement from './pages/addons/AddonManagement';
import AddonDetails from './pages/addons/AddonDetails';
import ResellerManagement from './pages/resellers/ResellerManagement';
import ResellerDetails from './pages/resellers/ResellerDetails';
import Profile from './pages/profile/Profile';
import NotFound from './pages/NotFound';

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

function App({ plugins }) {
  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <AuthProvider>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          
          {/* Protected routes */}
          <Route element={<ProtectedRoute><Layout menuItems={plugins.menuItems} /></ProtectedRoute>}>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            
            {/* User routes */}
            <Route path="/users" element={<UserManagement />} />
            <Route path="/users/:id" element={<UserDetails />} />
            
            {/* Addon routes */}
            <Route path="/addons" element={<AddonManagement />} />
            <Route path="/addons/:id" element={<AddonDetails />} />
            
            {/* Reseller routes */}
            <Route path="/resellers" element={<ResellerManagement />} />
            <Route path="/resellers/:id" element={<ResellerDetails />} />
            
            {/* Profile route */}
            <Route path="/profile" element={<Profile />} />

            {/* Plugin routes */}
            {plugins.routes.map(route => (
              <Route key={route.path} path={route.path} element={<route.component />} />
            ))}
          </Route>
          
          {/* 404 route */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;