@echo off
echo Creating deployment package for cPanel...

REM Create deployment directory
if exist deployment rmdir /s /q deployment
mkdir deployment

echo Copying built application files (excluding cache)...
xcopy .next deployment\.next\ /E /I /H /EXCLUDE:exclude_cache.txt
xcopy public deployment\public\ /E /I
copy app.js deployment\
copy server.js deployment\
copy package.json deployment\
copy next.config.js deployment\

echo Creating production environment file...
echo NODE_ENV=production > deployment\.env
echo PORT=3000 >> deployment\.env
echo NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyC0A7BEYUqMYqmdMzPjE-ZToKYkq-w9WTo >> deployment\.env
echo NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=mokawalat-c0115.firebaseapp.com >> deployment\.env
echo NEXT_PUBLIC_FIREBASE_PROJECT_ID=mokawalat-c0115 >> deployment\.env
echo NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=mokawalat-c0115.firebasestorage.app >> deployment\.env
echo NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=867421818537 >> deployment\.env
echo NEXT_PUBLIC_FIREBASE_APP_ID=1:867421818537:web:8b9cd497015e190a68a3b8 >> deployment\.env
echo NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=G-LGVQ9NCV2L >> deployment\.env

echo.
echo ✅ Deployment package created in 'deployment' folder!
echo.
echo 📤 Next steps:
echo 1. Upload contents of 'deployment' folder to your cPanel
echo 2. Set startup file to: app.js
echo 3. Set application mode to: production  
echo 4. Run: npm install --production
echo 5. Restart your Node.js app
echo.
echo ⚠️  REMEMBER: NEVER run npm run build on the server!
pause
