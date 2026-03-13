import * as admin from 'firebase-admin';

let isInitialized = false;

if (!admin.apps.length) {
  try {
    const serviceAccountStr = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (!serviceAccountStr) {
      console.warn('FIREBASE_SERVICE_ACCOUNT environment variable is missing.');
    } else {
      const serviceAccount = JSON.parse(serviceAccountStr);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
      isInitialized = true;
    }
  } catch (error) {
    console.error('Firebase Admin initialization error', error);
  }
} else {
  isInitialized = true;
}

// Only export db if initialized, otherwise export a proxy that throws a clear error when used
export const db = isInitialized 
  ? admin.firestore() 
  : new Proxy({} as admin.firestore.Firestore, {
      get(target, prop) {
        throw new Error('Firebase Admin is not initialized. Check FIREBASE_SERVICE_ACCOUNT environment variable in Vercel.');
      }
    });

