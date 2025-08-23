const express = require('express');
const path = require('path');
const http = require('http');
const app = express();
const PORT = 3000;

// Middleware to log requests
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// Proxy middleware for API requests
app.use('/api', (req, res) => {
  const apiOptions = {
    hostname: 'localhost',
    port: 5000,
    path: req.url,
    method: req.method,
    headers: {
      ...req.headers,
      host: 'localhost:5000'
    }
  };

  const apiReq = http.request(apiOptions, (apiRes) => {
    res.writeHead(apiRes.statusCode, apiRes.headers);
    apiRes.pipe(res);
  });

  apiReq.on('error', (e) => {
    console.error(`API request error: ${e.message}`);
    res.status(500).send('Error connecting to API server');
  });

  if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
    req.pipe(apiReq);
  } else {
    apiReq.end();
  }
});

// Serve static files from the static-frontend directory
app.use(express.static(path.join(__dirname, 'static-frontend')));

// Serve index.html for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'static-frontend', 'index.html'));
});

// Start the server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Static frontend server running on port ${PORT}`);
});