// firebase-admin is CommonJS; handle both ESM default and namespace imports
import adminImport from 'firebase-admin';
const admin = (adminImport as any).default || adminImport;

let isInitialized = false;

function initializeFirebase() {
  const apps = admin.apps ?? [];
  if (apps.length > 0) {
    isInitialized = true;
    return;
  }

  try {
    const serviceAccountStr = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (!serviceAccountStr) {
      throw new Error('CRITICAL: FIREBASE_SERVICE_ACCOUNT environment variable is missing.');
    }

    let serviceAccount;
    try {
      serviceAccount = JSON.parse(serviceAccountStr);
    } catch (e) {
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
export const db = new Proxy({} as FirebaseFirestore.Firestore, {
  get(target, prop) {
    if (!isInitialized) {
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

