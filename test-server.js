#!/usr/bin/env node

/**
 * Simple test server to verify cPanel configuration
 */

const http = require('http');
const port = process.env.PORT || 3000;
const hostname = '0.0.0.0';

console.log('Test server starting...');
console.log('Port:', port);
console.log('Hostname:', hostname);
console.log('Node.js version:', process.version);
console.log('Environment:', process.env.NODE_ENV);

const server = http.createServer((req, res) => {
  console.log('Request received:', req.url);
  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end(`
    <html>
      <head><title>Test Server</title></head>
      <body>
        <h1>✅ Test Server is Working!</h1>
        <p>Port: ${port}</p>
        <p>Hostname: ${hostname}</p>
        <p>Node.js: ${process.version}</p>
        <p>Environment: ${process.env.NODE_ENV}</p>
        <p>Time: ${new Date().toISOString()}</p>
      </body>
    </html>
  `);
});

server.listen(port, hostname, (err) => {
  if (err) {
    console.error('Server failed to start:', err);
    process.exit(1);
  }
  console.log(`✅ Test server running on http://${hostname}:${port}`);
});

server.on('error', (err) => {
  console.error('Server error:', err);
  process.exit(1);
});
