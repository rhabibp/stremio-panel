/**
 * Proxy Routes
 * 
 * Defines API routes for proxy management
 */

const express = require('express');
const router = express.Router();
const proxyController = require('../controllers/proxy.controller');
const authMiddleware = require('../../../backend/src/middleware/auth.middleware');

// Get all proxies
router.get('/', authMiddleware.authenticate, proxyController.getAllProxies);

// Get proxy by ID
router.get('/:id', authMiddleware.authenticate, proxyController.getProxyById);

// Create new proxy
router.post('/', 
  authMiddleware.authenticate, 
  authMiddleware.authorize(['admin']), 
  proxyController.createProxy
);

// Update proxy
router.put('/:id', 
  authMiddleware.authenticate, 
  authMiddleware.authorize(['admin']), 
  proxyController.updateProxy
);

// Delete proxy
router.delete('/:id', 
  authMiddleware.authenticate, 
  authMiddleware.authorize(['admin']), 
  proxyController.deleteProxy
);

// Get proxy statistics
router.get('/stats/summary', 
  authMiddleware.authenticate, 
  authMiddleware.authorize(['admin']), 
  proxyController.getProxyStats
);

// Test proxy configuration
router.post('/test', 
  authMiddleware.authenticate, 
  authMiddleware.authorize(['admin']), 
  proxyController.testProxy
);

module.exports = router;