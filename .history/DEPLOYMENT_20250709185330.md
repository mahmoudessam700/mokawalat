# Deployment Guide for cPanel/Shared Hosting

## 🚀 Deployment Steps for mochahost/cPanel

### 1. Build the Application Locally
```bash
npm install
npm run build
```

### 2. Upload Files to Server
Upload these files/folders to your hosting directory:
- `.next/` (entire folder)
- `public/` (entire folder) 
- `server.js`
- `package.json`
- `.env` (your environment variables)
- `next.config.js`

### 3. Install Dependencies on Server
In cPanel Terminal or SSH:
```bash
cd /path/to/your/domain
npm install --production
```

### 4. Start the Application
**For cPanel/Shared Hosting, use:**
```bash
npm run cpanel
```

**DO NOT use `npm run dev` on production servers!**

### 5. Configure Environment Variables
Create `.env` file with:
```env
NODE_ENV=production
PORT=3000
NEXT_PUBLIC_FIREBASE_API_KEY=your-firebase-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id
```

### 6. Memory Optimization
The server is configured with:
- Memory limit: 1GB (`--max-old-space-size=1024`)
- Automatic garbage collection
- Memory monitoring
- Webpack optimizations

### 7. Troubleshooting

#### Memory Issues:
- Use `npm run cpanel` instead of `npm run dev`
- Ensure NODE_ENV=production
- Build locally and upload `.next` folder

#### Port Issues:
- Set PORT environment variable in cPanel
- Default port is 3000

#### File Permissions:
- Ensure server.js is executable
- Set proper permissions for uploaded files

### 8. Alternative Startup Commands

If `npm run cpanel` doesn't work, try:
```bash
NODE_ENV=production node server.js
```

Or with explicit memory limit:
```bash
node --max-old-space-size=1024 server.js
```

## 🔧 Production Environment Setup

1. **Build First**: Always build locally with `npm run build`
2. **Upload Built Files**: Upload `.next/` folder and other required files
3. **Production Mode**: Set `NODE_ENV=production`
4. **Use Production Script**: Run `npm run cpanel` or `node server.js`

## ⚠️ Important Notes

- **Never run development server (`npm run dev`) in production**
- **Always build the application before deployment**
- **Use production environment variables**
- **Monitor memory usage in shared hosting**

## 📁 Required Files for Upload

```
your-domain/
├── .next/                 # Build output (required)
├── public/               # Static assets (required)
├── server.js            # Production server (required)
├── package.json         # Dependencies (required)
├── next.config.js       # Next.js config (required)
├── .env                 # Environment variables (required)
└── node_modules/        # Install with npm install
```
