#!/usr/bin/env node

// Ultra-simple test server for cPanel
console.log('STARTING BASIC TEST SERVER');
console.log('Node version:', process.version);
console.log('PORT from env:', process.env.PORT);
console.log('Current directory:', process.cwd());

const http = require('http');
const port = process.env.PORT || 3000;

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('BASIC TEST WORKING - Node.js is running!');
});

server.listen(port, '0.0.0.0', () => {
  console.log('Server listening on port:', port);
});

server.on('error', (err) => {
  console.error('Server error:', err);
});
