#!/usr/bin/env node

/**
 * Simplified cPanel startup file
 * This file loads your Next.js application with enhanced error handling
 */

console.log('🚀 Starting Mokawalat ERP Application...');
console.log('Time:', new Date().toISOString());

// Load environment variables
require('dotenv').config();

// Set production environment
process.env.NODE_ENV = 'production';

console.log('✅ Environment:', process.env.NODE_ENV);
console.log('✅ Port:', process.env.PORT || 3000);
console.log('✅ Node.js version:', process.version);

// Enhanced error handling
process.on('uncaughtException', (error) => {
  console.error('💥 Uncaught Exception:', error.message);
  console.error('Stack:', error.stack);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled Rejection:', reason);
  process.exit(1);
});

// Start the server with comprehensive error handling
try {
  console.log('📦 Loading server module...');
  require('./server.js');
  console.log('✅ Server module loaded successfully');
} catch (error) {
  console.error('❌ Failed to load server:', error.message);
  console.error('❌ Stack trace:', error.stack);
  
  // Detailed error information
  if (error.code === 'MODULE_NOT_FOUND') {
    console.error('❌ Module not found. Check if server.js exists and all dependencies are installed.');
  }
  
  console.error('❌ Application startup failed');
  process.exit(1);
}
