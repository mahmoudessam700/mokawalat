#!/usr/bin/env node

/**
 * cPanel Node.js startup file
 * This file is specifically designed for cPanel shared hosting environments
 */

// Set memory limits immediately
process.env.NODE_OPTIONS = '--max-old-space-size=1024';

// Load environment variables
require('dotenv').config();

// Set production environment if not already set
if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = 'production';
}

// Enable garbage collection
if (global.gc) {
  global.gc();
}

console.log('Starting Mokawalat ERP Application...');
console.log('Node.js version:', process.version);
console.log('Environment:', process.env.NODE_ENV);
console.log('Memory limit:', process.env.NODE_OPTIONS);

// Import and start the main server
try {
  require('./server.js');
} catch (error) {
  console.error('Failed to start server:', error);
  process.exit(1);
}
