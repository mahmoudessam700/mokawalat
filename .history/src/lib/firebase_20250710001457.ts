
import { getApp, getApps, initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getStorage, connectStorageEmulator } from 'firebase/storage';
import { getAnalytics, isSupported } from 'firebase/analytics';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID!,
};

// Validate configuration
const hasValidConfig = firebaseConfig.apiKey && 
                      firebaseConfig.projectId && 
                      firebaseConfig.apiKey !== 'demo-api-key';

if (!hasValidConfig) {
  console.error('❌ Firebase configuration is missing or invalid. Please check your environment variables.');
}

// Initialize Firebase
let app;
try {
  app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
  console.log('✅ Firebase initialized successfully with project:', firebaseConfig.projectId);
} catch (error) {
  console.error('❌ Failed to initialize Firebase:', error);
  throw error;
}

const auth = getAuth(app);
const firestore = getFirestore(app);
const storage = getStorage(app);

// Connect to emulators in demo mode (development only)
if (isDemoConfig && typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  try {
    if (!auth._delegate?.config) {
      connectAuthEmulator(auth, 'http://localhost:9099');
    }
    if (!firestore._delegate?._settings?.host?.includes('localhost')) {
      connectFirestoreEmulator(firestore, 'localhost', 8080);
    }
    if (!storage._delegate?._config?.emulatorOrigin) {
      connectStorageEmulator(storage, 'localhost', 9199);
    }
  } catch (error) {
    console.debug('Firebase emulators not available:', error);
  }
}

export { app, auth, firestore, storage, isDemoConfig };
