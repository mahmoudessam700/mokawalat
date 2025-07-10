#!/usr/bin/env node

/**
 * Test server to verify cPanel Node.js configuration
 * Use this as startup file to test basic functionality
 */

const http = require('http');
const port = process.env.PORT || 3000;
const hostname = '0.0.0.0';

console.log('🔧 Test server starting...');
console.log('Port:', port);
console.log('Hostname:', hostname);
console.log('Node.js version:', process.version);
console.log('Environment:', process.env.NODE_ENV);
console.log('Time:', new Date().toISOString());

const server = http.createServer((req, res) => {
  console.log('✅ Request received:', req.url);
  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>✅ cPanel Test Server</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 40px; background: #f5f5f5; }
          .container { background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
          .success { color: #28a745; }
          .info { background: #e9ecef; padding: 15px; border-radius: 4px; margin: 10px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1 class="success">✅ Test Server Working!</h1>
          <div class="info">
            <p><strong>Port:</strong> ${port}</p>
            <p><strong>Hostname:</strong> ${hostname}</p>
            <p><strong>Node.js:</strong> ${process.version}</p>
            <p><strong>Environment:</strong> ${process.env.NODE_ENV || 'development'}</p>
            <p><strong>Time:</strong> ${new Date().toISOString()}</p>
          </div>
          <p>If you see this page, your cPanel Node.js configuration is working correctly!</p>
          <p>Next step: Change startup file back to <code>simple-app.js</code> or <code>app.js</code></p>
        </div>
      </body>
    </html>
  `);
});

server.listen(port, hostname, (err) => {
  if (err) {
    console.error('❌ Server failed to start:', err);
    process.exit(1);
  }
  console.log(`✅ Test server running on http://${hostname}:${port}`);
});

server.on('error', (err) => {
  console.error('❌ Server error:', err);
  process.exit(1);
});

process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received, shutting down...');
  server.close(() => process.exit(0));
});

process.on('SIGINT', () => {
  console.log('🛑 SIGINT received, shutting down...');
  server.close(() => process.exit(0));
});
