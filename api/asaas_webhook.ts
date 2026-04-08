import type { VercelRequest, VercelResponse } from '@vercel/node';
import webhookHandler from './_logic/asaas/webhook.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  return webhookHandler(req, res);
}
