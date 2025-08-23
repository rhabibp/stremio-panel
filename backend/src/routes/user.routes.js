const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const authMiddleware = require('../middleware/auth.middleware');

// All routes require authentication
router.use(authMiddleware.authenticate);

// Routes for admins and resellers
router.get('/', authMiddleware.isResellerOrAdmin, userController.getAllUsers);
router.post('/', authMiddleware.isResellerOrAdmin, userController.createUser);
router.get('/:id', authMiddleware.isResellerOrAdmin, userController.getUserById);
router.put('/:id', authMiddleware.isResellerOrAdmin, userController.updateUser);
router.delete('/:id', authMiddleware.isResellerOrAdmin, userController.deleteUser);

// Addon assignment routes
router.post('/assign-addon', authMiddleware.isResellerOrAdmin, userController.assignAddon);
router.delete('/:userId/addons/:addonId', authMiddleware.isResellerOrAdmin, userController.removeAddon);
router.post('/:id/sync-addons', authMiddleware.isResellerOrAdmin, userController.syncAddons);

module.exports = router;