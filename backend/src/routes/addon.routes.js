const express = require('express');
const router = express.Router();
const addonController = require('../controllers/addon.controller');
const authMiddleware = require('../middleware/auth.middleware');

// All routes require authentication
router.use(authMiddleware.authenticate);

// Routes accessible by all authenticated users
router.get('/', addonController.getAllAddons);
router.get('/:id', addonController.getAddonById);

// Routes for admins and resellers
router.post('/', authMiddleware.isResellerOrAdmin, addonController.createAddon);
router.put('/:id', authMiddleware.isResellerOrAdmin, addonController.updateAddon);
router.delete('/:id', authMiddleware.isResellerOrAdmin, addonController.deleteAddon);

// Additional addon routes
router.get('/:id/users', authMiddleware.isResellerOrAdmin, addonController.getAddonUsers);
router.post('/:id/sync', authMiddleware.isResellerOrAdmin, addonController.syncAddonWithUsers);

module.exports = router;