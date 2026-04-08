import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getFirebaseAdmin } from './firebase';

// ── Rate Limiting (in-memory, per-IP) ────────────────────────────────────────
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_MAX = 30; // max requests
const RATE_LIMIT_WINDOW_MS = 60_000; // per 1 minute

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }

  if (entry.count >= RATE_LIMIT_MAX) {
    return false;
  }

  entry.count++;
  return true;
}

// Clean up stale entries every 5 minutes to prevent memory leak
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [ip, entry] of rateLimitMap.entries()) {
      if (now > entry.resetAt) rateLimitMap.delete(ip);
    }
  }, 5 * 60_000);
}

// ── Auth Middleware ─────────────────────────────────────────────────────────
export interface AuthenticatedRequest extends VercelRequest {
  uid?: string;
}

/**
 * Verifies Firebase ID token from Authorization header.
 * Returns the decoded UID or sends an error response and returns null.
 */
export async function verifyAuth(
  req: AuthenticatedRequest,
  res: VercelResponse
): Promise<string | null> {
  // Rate limiting
  const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() 
    || req.headers['x-real-ip'] as string 
    || 'unknown';

  if (!checkRateLimit(ip)) {
    res.status(429).json({ error: 'Muitas requisições. Tente novamente em 1 minuto.' });
    return null;
  }

  // Extract Bearer token
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Token de autenticação não fornecido' });
    return null;
  }

  const idToken = authHeader.split('Bearer ')[1];
  if (!idToken) {
    res.status(401).json({ error: 'Token de autenticação inválido' });
    return null;
  }

  try {
    const firebaseAdmin = getFirebaseAdmin();
    const decoded = await firebaseAdmin.auth().verifyIdToken(idToken);
    req.uid = decoded.uid;
    return decoded.uid;
  } catch (error: any) {
    console.error('[AuthMiddleware] Verification failed:', error.message);
    
    // Explicitly handle initialization errors to return 500 instead of crashing Vercel
    if (error.message === 'FIREBASE_SERVICE_ACCOUNT_MISSING' || 
        error.message === 'FIREBASE_SERVICE_ACCOUNT_PARSE_ERROR' ||
        error.message.includes('initialization error')) {
      res.status(500).json({ 
        error: 'Erro de configuração no servidor de autenticação',
        details: 'O serviço de autenticação não pôde ser inicializado. Verifique as variáveis de ambiente.'
      });
      return null;
    }
    
    // Auth token errors
    let userMessage = 'Token de autenticação expirado ou inválido';
    if (error.code === 'auth/id-token-expired') userMessage = 'Sua sessão expirou. Recarregue a página.';
    if (error.code === 'auth/argument-error') userMessage = 'Erro técnico na autenticação.';
    
    res.status(401).json({ 
      error: userMessage,
      details: error.message,
      code: error.code
    });
    return null;
  }
}
