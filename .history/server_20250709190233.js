
// This file is the custom server for Next.js.
// It's used for hosting environments that need a single startup file.
require('dotenv').config();

const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');

// Set memory limits for shared hosting
process.env.NODE_OPTIONS = '--max-old-space-size=1024';

const dev = process.env.NODE_ENV !== 'production';
// Use '0.0.0.0' to accept connections on all network interfaces, which is necessary for many hosting environments.
const hostname = '0.0.0.0'; 
// The hosting provider (like cPanel) will set the PORT environment variable.
const port = process.env.PORT || 3000; 

// Configure Next.js for production optimization
const app = next({ 
  dev,
  // Disable file system caching to reduce memory usage
  conf: {
    generateEtags: false,
    compress: true,
    poweredByHeader: false,
    // Optimize for shared hosting
    experimental: {
      // Reduce memory usage
      isrMemoryCacheSize: 0,
      // Disable webpack memory cache in production
      webpackMemoryOptimizations: true
    }
  }
});
const handle = app.getRequestHandler();

app.prepare().then(() => {
  createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('internal server error');
    }
  }).listen(port, hostname, (err) => {
    if (err) throw err;
    console.log(`> Ready on http://${hostname}:${port}`);
    console.log(`> Environment: ${process.env.NODE_ENV || 'development'}`);
    
    // Monitor memory usage for shared hosting
    if (process.env.NODE_ENV === 'production') {
      setInterval(() => {
        const memUsage = process.memoryUsage();
        if (memUsage.heapUsed > 800 * 1024 * 1024) { // 800MB warning
          console.warn('High memory usage detected:', Math.round(memUsage.heapUsed / 1024 / 1024) + 'MB');
          if (global.gc) {
            global.gc();
            console.log('Garbage collection triggered');
          }
        }
      }, 30000); // Check every 30 seconds
    }
  });
}).catch((ex) => {
  console.error('Server failed to start:', ex.stack);
  process.exit(1);
});
