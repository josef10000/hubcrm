import type { VercelRequest, VercelResponse } from '@vercel/node';
import { initializeApp, getApps, cert, type ServiceAccount } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

// Initialize Firebase Admin (singleton)
if (!getApps().length) {
  const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (serviceAccount) {
    initializeApp({
      credential: cert(JSON.parse(serviceAccount) as ServiceAccount),
    });
  } else {
    // Fallback: initialize with application default credentials
    initializeApp();
  }
}

const adminAuth = getAuth();

/**
 * Verifies the Firebase Auth token from the Authorization header.
 * Returns the decoded token's UID if valid, or sends a 401 response and returns null.
 *
 * Usage in any API route:
 *   const uid = await verifyAuth(req, res);
 *   if (!uid) return; // response already sent
 */
export async function verifyAuth(
  req: VercelRequest,
  res: VercelResponse
): Promise<string | null> {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or invalid Authorization header' });
    return null;
  }

  try {
    const token = authHeader.split('Bearer ')[1];
    const decoded = await adminAuth.verifyIdToken(token);
    return decoded.uid;
  } catch (err: any) {
    console.error('Auth verification failed:', err.message);
    res.status(401).json({ error: 'Invalid or expired token' });
    return null;
  }
}
