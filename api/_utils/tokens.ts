import crypto from 'crypto';

/**
 * Gera um token de segurança aleatório de 64 caracteres.
 * Usado para acesso público ao portal do cliente e checkout.
 */
export function generatePublicToken(): string {
  return crypto.randomBytes(32).toString('hex');
}
