/**
 * PIN Authentication Plugin Frontend Integration
 * 
 * This file exports the components and routes for the PIN authentication plugin.
 */

import PinLogin from './PinLogin';
import PinManager from './PinManager';

// Plugin metadata
export const metadata = {
  name: 'PIN Authentication Plugin',
  version: '1.0.0',
  description: 'Allows users to register and authenticate using the official Stremio app PIN system'
};

// Plugin routes to be added to the frontend router
export const routes = [
  {
    path: '/pin-login',
    component: PinLogin,
    exact: true,
    requiredRole: null, // Public route
    name: 'PIN Login',
    showInSidebar: false
  },
  {
    path: '/pin-manager',
    component: PinManager,
    exact: true,
    requiredRole: 'admin',
    name: 'PIN Manager',
    icon: 'VpnKey',
    showInSidebar: true,
    sidebarCategory: 'System'
  }
];

// Plugin menu items to be added to the sidebar
export const menuItems = [
  {
    name: 'PIN Manager',
    path: '/pin-manager',
    icon: 'VpnKey',
    requiredRole: 'admin',
    category: 'System'
  }
];

// Add login method to the login page
export const loginMethods = [
  {
    name: 'Login with PIN',
    description: 'Use the Stremio app to login with a PIN',
    icon: 'QrCode',
    path: '/pin-login',
    priority: 20 // Higher number = higher priority
  }
];

// Plugin initialization function
export const initialize = (app) => {
  console.log('Initializing PIN Authentication Plugin frontend...');
  
  // You can perform additional initialization here if needed
  
  return {
    success: true,
    message: 'PIN Authentication Plugin frontend initialized successfully'
  };
};