#!/usr/bin/env node

/**
 * Simplified startup for cPanel
 */

console.log('🚀 Starting Mokawalat ERP...');

// Load environment variables first
require('dotenv').config();

// Set production environment
process.env.NODE_ENV = 'production';

console.log('Environment:', process.env.NODE_ENV);
console.log('Port:', process.env.PORT || 3000);

// Start the server with better error handling
try {
  console.log('Loading Next.js...');
  require('./server.js');
} catch (error) {
  console.error('❌ Startup failed:', error.message);
  console.error('Stack:', error.stack);
  
  // Exit with error
  process.exit(1);
}
