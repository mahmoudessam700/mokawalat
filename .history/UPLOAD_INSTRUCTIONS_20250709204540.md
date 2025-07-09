# Deployment Files for cPanel Upload

## ✅ SUCCESSFUL LOCAL BUILD COMPLETED!

The application has been built successfully locally. **DO NOT run `npm run build` on your cPanel server** - it will cause out of memory errors.

## 📤 Files to Upload to Your cPanel:

### Required Files/Folders:
1. **`.next/`** - (Entire folder) - This contains the built application
2. **`public/`** - (Entire folder) - Static assets
3. **`app.js`** - Startup file for cPanel
4. **`server.js`** - Next.js server
5. **`package.json`** - Dependencies configuration
6. **`next.config.js`** - Next.js configuration

### Optional but Recommended:
7. **`.env`** - Environment variables (create manually on server)

## 🔧 Steps on cPanel Server:

### 1. Upload Files
Upload all the files listed above to your domain folder on cPanel.

### 2. Install Dependencies (Production Only)
```bash
cd /path/to/your/domain
npm install --production
```

### 3. Configure cPanel Node.js App
- **Startup file:** `app.js`
- **Application mode:** `production`
- **Node.js version:** 20.x
- Click **"RESTART"**

### 4. Create Environment Variables
Create a `.env` file on your server with:
```env
NODE_ENV=production
PORT=3000
# Add your Firebase and other environment variables here
```

## ⚠️ CRITICAL: What NOT to Do on Server:

- ❌ **Never run `npm run build`** - This causes out of memory errors
- ❌ **Never run `npm run dev`** - This is for development only
- ❌ **Don't install devDependencies** - Use `--production` flag

## ✅ What TO Do on Server:

- ✅ **Upload the built `.next` folder** from your local machine
- ✅ **Use `app.js` as startup file** in cPanel Node.js settings
- ✅ **Set environment to `production`**
- ✅ **Only install production dependencies**

## 🔍 If You Still Get 503 Errors:

1. Check cPanel Node.js App logs
2. Verify `.next` folder was uploaded completely
3. Ensure `app.js` is set as startup file
4. Check that `NODE_ENV=production` is set

## 📁 Minimal Package.json for Server

If you want to minimize dependencies on the server, use this package.json:

```json
{
  "name": "mokawalat-erp",
  "version": "1.0.0",
  "main": "app.js",
  "scripts": {
    "start": "node app.js"
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
```

The build completed successfully! Your application is ready for deployment. 🎉
