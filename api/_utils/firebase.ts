import * as adminNamespace from 'firebase-admin';

const admin = (adminNamespace as any).default || adminNamespace;
export { admin };
export const FieldValue = adminNamespace.firestore.FieldValue;

/**
 * Ensures Firebase Admin is initialized exactly once.
 * Handles both JSON strings and Base64 encoded strings in FIREBASE_SERVICE_ACCOUNT.
 */
export function getFirebaseAdmin() {
  try {
    const apps = admin.apps || [];
    if (apps.length > 0) {
      return admin;
    }

    const serviceAccountStr = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (!serviceAccountStr) {
      console.error('[CRITICAL] FIREBASE_SERVICE_ACCOUNT is not defined in env');
      throw new Error('FIREBASE_SERVICE_ACCOUNT_MISSING');
    }

    let serviceAccount: any;
    // Remove extra whitespace or quotes that might have been added in Vercel dashboard
    const cleanStr = serviceAccountStr.trim().replace(/^['"]|['"]$/g, '');

    try {
      serviceAccount = JSON.parse(cleanStr);
    } catch (e) {
      try {
        // Fallback: check if it's base64 encoded
        serviceAccount = JSON.parse(Buffer.from(cleanStr, 'base64').toString('utf8'));
      } catch (e2) {
        console.error('[CRITICAL] Failed to parse FIREBASE_SERVICE_ACCOUNT as JSON or Base64');
        throw new Error('FIREBASE_SERVICE_ACCOUNT_PARSE_ERROR');
      }
    }

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    
    console.log('[Firebase] Admin initialized successfully');
    return admin;
  } catch (error: any) {
    console.error('[Firebase] Initialization error:', error.message);
    throw error;
  }
}

// Export a proxy for db that ensures initialization and handles errors gracefully
export const db = new Proxy({} as FirebaseFirestore.Firestore, {
  get(target, prop) {
    // Basic inspection protection: don't trigger init for common introspection props
    if (prop === 'then' || prop === 'toJSON' || typeof prop === 'symbol') return undefined;
    
    const firebaseAdmin = getFirebaseAdmin();
    const firestore = firebaseAdmin.firestore();
    const value = (firestore as any)[prop];
    return typeof value === 'function' ? value.bind(firestore) : value;
  }
});

