/**
 * Proxy Plugin Initialization
 * 
 * This file initializes the proxy plugin and sets up the necessary middleware.
 */

const { createProxyMiddleware } = require('http-proxy-middleware');
const ProxyService = require('./services/proxy.service');

/**
 * Initialize the proxy plugin
 * @param {Object} app - Express app instance
 * @param {Object} options - Plugin options
 */
module.exports = function init(app, options = {}) {
  console.log('Initializing proxy plugin...');
  
  // Set up dynamic proxy middleware
  app.use('/api/proxy/*', async (req, res, next) => {
    try {
      // Extract target from URL path
      const targetPath = req.path.replace('/api/proxy/', '');
      
      if (!targetPath) {
        return res.status(400).json({ error: 'No proxy target specified' });
      }
      
      // Get proxy configuration
      const proxyConfig = await ProxyService.getProxyForTarget(targetPath);
      
      if (!proxyConfig) {
        return res.status(404).json({ error: 'No proxy configuration found for this target' });
      }
      
      // Create proxy middleware
      const proxyMiddleware = createProxyMiddleware({
        target: proxyConfig.target,
        changeOrigin: true,
        pathRewrite: {
          [`^/api/proxy/${targetPath}`]: '/'
        },
        onProxyReq: (proxyReq, req, res) => {
          // Add custom headers if configured
          if (proxyConfig.headers) {
            Object.entries(proxyConfig.headers).forEach(([key, value]) => {
              proxyReq.setHeader(key, value);
            });
          }
          
          // Log proxy request if in development mode
          if (process.env.NODE_ENV !== 'production') {
            console.log(`Proxying request to: ${proxyConfig.target}`);
          }
        },
        onError: (err, req, res) => {
          console.error('Proxy error:', err);
          res.status(500).json({ error: 'Proxy error', message: err.message });
        }
      });
      
      // Apply proxy middleware
      proxyMiddleware(req, res, next);
      
      // Update proxy usage statistics
      ProxyService.recordProxyUsage(targetPath).catch(err => {
        console.error('Error recording proxy usage:', err);
      });
    } catch (error) {
      console.error('Error in proxy middleware:', error);
      res.status(500).json({ error: 'Internal server error', message: error.message });
    }
  });
  
  console.log('Proxy plugin initialized successfully');
};