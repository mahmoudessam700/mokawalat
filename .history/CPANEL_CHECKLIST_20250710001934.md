# cPanel Deployment Checklist ✅

## Files to Upload (Built Locally):
- [ ] .next/ folder (entire built application)
- [ ] public/ folder (static files)
- [ ] app.js (startup file)
- [ ] server.js (Next.js server)
- [ ] package.json (dependencies)
- [ ] next.config.js (configuration)

## cPanel Node.js App Settings:
- [ ] Startup file: app.js
- [ ] Application mode: production
- [ ] Node.js version: 20.x
- [ ] Click RESTART

## Commands to Run on Server:
- [ ] npm install --production
- [ ] Create .env file with your Firebase configuration:
```env
NODE_ENV=production
PORT=3000
NEXT_PUBLIC_FIREBASE_API_KEY="AIzaSyC0A7BEYUqMYqmdMzPjE-ZToKYkq-w9WTo"
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="mokawalat-c0115.firebaseapp.com"
NEXT_PUBLIC_FIREBASE_PROJECT_ID="mokawalat-c0115"
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="mokawalat-c0115.firebasestorage.app"
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="867421818537"
NEXT_PUBLIC_FIREBASE_APP_ID="1:867421818537:web:8b9cd497015e190a68a3b8"
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID="G-LGVQ9NCV2L"
```

## What NOT to do on server:
- [ ] ❌ npm run build (causes memory error)
- [ ] ❌ npm run dev (development only)
- [ ] ❌ Set package.json as startup file

## Expected Result:
- [ ] ✅ Application runs on your domain
- [ ] ✅ No 503 errors
- [ ] ✅ No memory errors

## If still getting 503:
1. Check cPanel Node.js app error logs
2. Verify .next folder uploaded completely
3. Ensure app.js is the startup file
4. Check NODE_ENV=production is set
