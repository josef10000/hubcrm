import * as admin from 'firebase-admin';

let isInitialized = false;

function initializeFirebase() {
  if (admin.apps.length > 0) {
    isInitialized = true;
    return;
  }

  try {
    const serviceAccountStr = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (!serviceAccountStr) {
      console.warn('FIREBASE_SERVICE_ACCOUNT environment variable is missing.');
      return;
    }

    let serviceAccount;
    try {
      serviceAccount = JSON.parse(serviceAccountStr);
    } catch (e) {
      // If it's not JSON, maybe it's base64 encoded
      try {
        serviceAccount = JSON.parse(Buffer.from(serviceAccountStr, 'base64').toString());
      } catch (e2) {
        console.error('Failed to parse FIREBASE_SERVICE_ACCOUNT as JSON or Base64 JSON');
        return;
      }
    }

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    isInitialized = true;
  } catch (error) {
    console.error('Firebase Admin initialization error', error);
  }
}

// Initialize immediately
initializeFirebase();

// Export a proxy for db that ensures initialization and handles errors gracefully
export const db = new Proxy({} as admin.firestore.Firestore, {
  get(target, prop) {
    if (!isInitialized) {
      // Try to initialize again in case it was a transient failure or env vars weren't ready
      initializeFirebase();
    }

    if (!isInitialized) {
      throw new Error('Firebase Admin is not initialized. Check FIREBASE_SERVICE_ACCOUNT environment variable.');
    }

    const firestore = admin.firestore();
    const value = (firestore as any)[prop];
    return typeof value === 'function' ? value.bind(firestore) : value;
  }
});

