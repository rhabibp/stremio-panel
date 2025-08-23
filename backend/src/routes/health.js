const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

/**
 * @route   GET /api/health
 * @desc    Health check endpoint for monitoring
 * @access  Public
 */
router.get('/', async (req, res) => {
  try {
    // Check MongoDB connection
    const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
    
    // Get system info
    const systemInfo = {
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch
    };
    
    // Return health status
    res.status(200).json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      services: {
        api: 'running',
        database: dbStatus
      },
      system: systemInfo
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});

/**
 * @route   GET /api/health/detailed
 * @desc    Detailed health check with component status
 * @access  Private (Admin only)
 */
router.get('/detailed', async (req, res) => {
  try {
    // Check MongoDB connection
    const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
    
    // Get MongoDB stats if connected
    let dbStats = null;
    if (dbStatus === 'connected') {
      try {
        dbStats = await mongoose.connection.db.stats();
      } catch (err) {
        dbStats = { error: err.message };
      }
    }
    
    // Get system info
    const systemInfo = {
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch
    };
    
    // Return detailed health status
    res.status(200).json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      services: {
        api: {
          status: 'running',
          uptime: process.uptime()
        },
        database: {
          status: dbStatus,
          stats: dbStats
        }
      },
      system: systemInfo,
      env: {
        nodeEnv: process.env.NODE_ENV
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});

module.exports = router;