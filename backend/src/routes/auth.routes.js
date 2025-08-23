const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const authMiddleware = require('../middleware/auth.middleware');

// Public routes
router.post('/register', authController.register);
router.post('/login', authController.login);

// Protected routes
router.get('/profile', authMiddleware.authenticate, authController.getProfile);
router.post('/sync-stremio', authMiddleware.authenticate, authController.syncWithStremio);
router.post('/register-stremio', authMiddleware.authenticate, authController.registerOnStremio);

module.exports = router;