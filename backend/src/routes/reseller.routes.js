const express = require('express');
const router = express.Router();
const resellerController = require('../controllers/reseller.controller');
const authMiddleware = require('../middleware/auth.middleware');

// All routes require authentication
router.use(authMiddleware.authenticate);

// Routes only for admins
router.get('/', authMiddleware.isAdmin, resellerController.getAllResellers);
router.post('/', authMiddleware.isAdmin, resellerController.createReseller);
router.put('/:id', authMiddleware.isAdmin, resellerController.updateReseller);
router.delete('/:id', authMiddleware.isAdmin, resellerController.deleteReseller);
router.post('/:id/credits', authMiddleware.isAdmin, resellerController.addCredits);

// Routes for admins and the reseller themselves
router.get('/:id', authMiddleware.authenticate, resellerController.getResellerById);
router.get('/:id/users', authMiddleware.authenticate, resellerController.getResellerUsers);
router.get('/:id/stats', authMiddleware.authenticate, resellerController.getResellerStats);

// Route for resellers to see their own stats
router.get('/stats/me', authMiddleware.isResellerOrAdmin, resellerController.getResellerStats);

module.exports = router;