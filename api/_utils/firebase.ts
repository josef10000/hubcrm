// firebase-admin is CommonJS; handle both ESM default and namespace imports
import adminImport from 'firebase-admin';
const admin = (adminImport as any).default || adminImport;

/**
 * Ensures Firebase Admin is initialized exactly once.
 */
export function getFirebaseAdmin() {
  const apps = admin.apps ?? [];
  if (apps.length > 0) {
    return admin;
  }

  try {
    const serviceAccountStr = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (!serviceAccountStr) {
      throw new Error('FIREBASE_SERVICE_ACCOUNT_MISSING');
    }

    let serviceAccount;
    try {
      serviceAccount = JSON.parse(serviceAccountStr);
    } catch (e) {
      try {
        serviceAccount = JSON.parse(Buffer.from(serviceAccountStr, 'base64').toString());
      } catch (e2) {
        throw new Error('FIREBASE_SERVICE_ACCOUNT_PARSE_ERROR');
      }
    }

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    return admin;
  } catch (error) {
    console.error('Firebase Admin initialization error', error);
    throw error;
  }
}

// Export a proxy for db that ensures initialization and handles errors gracefully
export const db = new Proxy({} as FirebaseFirestore.Firestore, {
  get(target, prop) {
    const firebaseAdmin = getFirebaseAdmin();
    const firestore = firebaseAdmin.firestore();
    const value = (firestore as any)[prop];
    return typeof value === 'function' ? value.bind(firestore) : value;
  }
});

