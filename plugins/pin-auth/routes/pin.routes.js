/**
 * PIN Authentication Routes
 * 
 * Defines API routes for PIN authentication
 */

const express = require('express');
const router = express.Router();
const pinController = require('../controllers/pin.controller');
const authMiddleware = require('../../../backend/src/middleware/auth.middleware');

// Generate a new PIN
router.post('/generate', pinController.generatePin);

// Verify a PIN with Stremio authentication
router.post('/verify', pinController.verifyPin);

// Check PIN status
router.get('/status/:sessionId', pinController.checkPinStatus);

// Login with Stremio credentials and generate PIN
router.post('/login-stremio', pinController.loginWithStremio);

// Admin routes
router.get('/stats', 
  authMiddleware.authenticate, 
  authMiddleware.authorize(['admin']), 
  pinController.getPinStats
);

router.post('/cleanup', 
  authMiddleware.authenticate, 
  authMiddleware.authorize(['admin']), 
  pinController.cleanupExpiredPins
);

module.exports = router;