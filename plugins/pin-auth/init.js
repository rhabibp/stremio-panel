/**
 * PIN Authentication Plugin Initialization
 * 
 * This file initializes the PIN authentication plugin and sets up the necessary middleware.
 */

const socketIo = require('socket.io');
const PinService = require('./services/pin.service');

/**
 * Initialize the PIN authentication plugin
 * @param {Object} app - Express app instance
 * @param {Object} options - Plugin options
 */
module.exports = function init(app, options = {}) {
  console.log('Initializing PIN authentication plugin...');
  
  // Set up socket.io for real-time PIN status updates
  const server = options.server;
  
  if (server) {
    const io = socketIo(server, {
      path: '/api/plugins/pin-auth/socket.io',
      cors: {
        origin: '*',
        methods: ['GET', 'POST']
      }
    });
    
    // Socket.io namespace for PIN authentication
    const pinNamespace = io.of('/pin-auth');
    
    pinNamespace.on('connection', (socket) => {
      console.log('Client connected to PIN authentication socket');
      
      // Join a room for a specific PIN session
      socket.on('join-session', (sessionId) => {
        if (!sessionId) return;
        
        socket.join(`session-${sessionId}`);
        console.log(`Client joined session: ${sessionId}`);
      });
      
      // Leave a PIN session room
      socket.on('leave-session', (sessionId) => {
        if (!sessionId) return;
        
        socket.leave(`session-${sessionId}`);
        console.log(`Client left session: ${sessionId}`);
      });
      
      // Disconnect event
      socket.on('disconnect', () => {
        console.log('Client disconnected from PIN authentication socket');
      });
    });
    
    // Store socket.io instance for use in controllers
    app.set('pin-auth-io', pinNamespace);
    
    // Set up a hook to notify clients when a PIN is verified
    const originalVerifyPin = PinService.verifyPin;
    PinService.verifyPin = async function(pin, stremioAuthKey, deviceInfo) {
      const result = await originalVerifyPin.call(this, pin, stremioAuthKey, deviceInfo);
      
      // Notify clients that the PIN has been verified
      pinNamespace.to(`session-${result.sessionId}`).emit('pin-verified', {
        sessionId: result.sessionId,
        status: 'verified'
      });
      
      return result;
    };
  }
  
  // Set up scheduled task to clean up expired PINs
  const cleanupInterval = setInterval(async () => {
    try {
      const deletedCount = await PinService.cleanupExpiredPins();
      if (deletedCount > 0) {
        console.log(`Cleaned up ${deletedCount} expired PINs`);
      }
    } catch (error) {
      console.error('Error cleaning up expired PINs:', error);
    }
  }, 15 * 60 * 1000); // Run every 15 minutes
  
  // Store cleanup interval for cleanup on shutdown
  app.set('pin-auth-cleanup-interval', cleanupInterval);
  
  console.log('PIN authentication plugin initialized successfully');
  
  // Return cleanup function
  return function cleanup() {
    clearInterval(cleanupInterval);
    console.log('PIN authentication plugin cleanup completed');
  };
};