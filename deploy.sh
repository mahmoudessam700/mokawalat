#!/bin/bash

# Deployment Guide for cPanel/Shared Hosting
# This script helps you prepare files for upload to your cPanel hosting

echo "🚀 Preparing files for cPanel deployment..."

# Create deployment directory
mkdir -p deployment

# Copy essential files
echo "📁 Copying essential files..."
cp -r .next deployment/
cp -r public deployment/
cp server.js deployment/
cp app.js deployment/
cp package.json deployment/
cp next.config.js deployment/
cp .env deployment/ 2>/dev/null || echo "⚠️  .env file not found - make sure to create it on the server"

# Create a simplified package.json for production
cat > deployment/package-prod.json << 'EOF'
{
  "name": "mokawalat-erp",
  "version": "1.0.0",
  "main": "app.js",
  "scripts": {
    "start": "node app.js",
    "cpanel": "node app.js"
  },
  "dependencies": {
    "next": "14.2.4",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "dotenv": "^16.4.5"
  },
  "engines": {
    "node": ">=18.0.0"
  }
}
EOF

echo "✅ Files prepared in 'deployment' folder!"
echo ""
echo "📋 Upload these files/folders to your cPanel:"
echo "   - .next/ (entire folder)"
echo "   - public/ (entire folder)"
echo "   - app.js"
echo "   - server.js"
echo "   - package.json (or use package-prod.json for minimal dependencies)"
echo "   - next.config.js"
echo "   - .env (create manually on server with your environment variables)"
echo ""
echo "🔧 On your cPanel server, run:"
echo "   1. npm install --production"
echo "   2. Set startup file to: app.js"
echo "   3. Set application mode to: production"
echo "   4. Restart your Node.js app"
echo ""
echo "⚠️  REMEMBER: Never run 'npm run build' on the server - always build locally!"
