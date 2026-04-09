import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getFirebaseAdmin } from './firebase.js';
import { Redis } from '@upstash/redis';

// ── Rate Limiting (via Upstash Redis Serverless) ────────────────────────────
const RATE_LIMIT_MAX = 30; // máximo de requisições permitidas
const RATE_LIMIT_WINDOW_SEC = 60; // janela de tempo de 1 minuto

// Inicializa a conexão com o banco de dados que a Vercel integrou
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || '',
  token: process.env.UPSTASH_REDIS_REST_TOKEN || '',
});

async function checkRateLimit(ip: string): Promise<boolean> {
  // Se estiver rodando no computador local sem o .env atualizado, permite passar para não travar seus testes
  if (!process.env.UPSTASH_REDIS_REST_URL) {
    console.warn('[Upstash] Variáveis do Redis não encontradas. Rate limit ignorado no ambiente local.');
    return true;
  }

  try {
    const key = `ratelimit:${ip}`;
    
    // Incrementa o contador de acessos desse IP na nuvem
    const currentCount = await redis.incr(key);

    // Se for o primeiro acesso, programa a chave para se auto-destruir em 60 segundos
    if (currentCount === 1) {
      await redis.expire(key, RATE_LIMIT_WINDOW_SEC);
    }

    // Se passou do limite, bloqueia
    if (currentCount > RATE_LIMIT_MAX) {
      return false; 
    }

    return true; 
  } catch (error) {
    console.error('[Upstash] Erro no rate limit:', error);
    // Se o banco Upstash cair por algum motivo externo, permitimos o acesso para o CRM não travar
    return true; 
  }
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
  // Captura o IP do usuário
  const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() 
    || req.headers['x-real-ip'] as string 
    || 'unknown';

  // Consulta o Upstash (usando await, pois agora é uma chamada de rede)
  if (!(await checkRateLimit(ip))) {
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
