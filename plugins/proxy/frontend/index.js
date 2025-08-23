/**
 * Proxy Plugin Frontend Integration
 * 
 * This file exports the components and routes for the proxy plugin.
 */

import ProxyManager from './ProxyManager';

// Plugin metadata
export const metadata = {
  name: 'Proxy Plugin',
  version: '1.0.0',
  description: 'Adds proxy functionality to route Stremio traffic through configurable proxies'
};

// Plugin routes to be added to the frontend router
export const routes = [
  {
    path: '/proxy',
    component: ProxyManager,
    exact: true,
    requiredRole: 'admin',
    name: 'Proxy Manager',
    icon: 'SwapHoriz',
    showInSidebar: true,
    sidebarCategory: 'System'
  }
];

// Plugin menu items to be added to the sidebar
export const menuItems = [
  {
    name: 'Proxy Manager',
    path: '/proxy',
    icon: 'SwapHoriz',
    requiredRole: 'admin',
    category: 'System'
  }
];

// Plugin initialization function
export const initialize = (app) => {
  console.log('Initializing Proxy Plugin frontend...');
  
  // You can perform additional initialization here if needed
  
  return {
    success: true,
    message: 'Proxy Plugin frontend initialized successfully'
  };
};