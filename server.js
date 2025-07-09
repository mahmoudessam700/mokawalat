
// This file is the custom server for Next.js.
// It's used for hosting environments that need a single startup file.
require('dotenv').config();

const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');

const dev = process.env.NODE_ENV !== 'production';
// Use '0.0.0.0' to accept connections on all network interfaces, which is necessary for many hosting environments.
const hostname = '0.0.0.0'; 
// The hosting provider (like cPanel) will set the PORT environment variable.
const port = process.env.PORT || 3000; 

const app = next({ dev });
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
    console.log(`> Ready on http://localhost:${port}`);
  });
});
