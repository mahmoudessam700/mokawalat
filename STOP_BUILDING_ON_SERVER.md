# 🚨 CRITICAL DEPLOYMENT INSTRUCTIONS 🚨

## ❌ **WHAT YOU'RE DOING WRONG:**
You're running `npm run build` on your cPanel server, which causes:
- Out of memory errors
- 503 Service Unavailable 
- Build process failures

## ✅ **CORRECT DEPLOYMENT PROCESS:**

### 1. **NEVER BUILD ON cPanel SERVER**
- ❌ Do NOT run `npm run build` on cPanel
- ❌ Do NOT run `npm run dev` on cPanel
- ❌ Do NOT install devDependencies on cPanel

### 2. **BUILD LOCALLY, UPLOAD BUILT FILES**

**On your local computer:**
```bash
# Build the application (this was already done successfully)
npm run build
```

**Upload these files to cPanel:**
- `.next/` folder (complete folder with all contents)
- `public/` folder  
- `app.js`
- `server.js`
- `package.json`
- `next.config.js`
- `.env` (with your Firebase config)

### 3. **cPanel Configuration:**
- **Startup file:** `app.js` (NOT package.json)
- **Application mode:** `production`
- **Node version:** 20.x

### 4. **Commands on cPanel:**
```bash
# ONLY run this command on cPanel:
npm install --production

# Then restart your Node.js app in cPanel
```

### 5. **Environment Variables on cPanel:**
Create `.env` file with:
```env
NODE_ENV=production
PORT=3000
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyC0A7BEYUqMYqmdMzPjE-ZToKYkq-w9WTo
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=mokawalat-c0115.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=mokawalat-c0115
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=mokawalat-c0115.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=867421818537
NEXT_PUBLIC_FIREBASE_APP_ID=1:867421818537:web:8b9cd497015e190a68a3b8
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=G-LGVQ9NCV2L
```

## 🎯 **WHY THIS WORKS:**
- ✅ Local build uses your computer's full resources
- ✅ Pre-built files are optimized and small
- ✅ Server only runs the application, doesn't build it
- ✅ Avoids memory limitations of shared hosting

## 📋 **DEPLOYMENT CHECKLIST:**
- [ ] Built locally ✅ (already done)
- [ ] Upload `.next` folder to cPanel
- [ ] Upload other required files
- [ ] Set startup file to `app.js`
- [ ] Create `.env` with Firebase config
- [ ] Run `npm install --production` on cPanel
- [ ] Restart Node.js app in cPanel

**Stop trying to build on the server!** Upload the built files instead! 🚀
