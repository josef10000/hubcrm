import type { VercelRequest, VercelResponse } from '@vercel/node';
import webhookHandler from './_logic/asaas/webhook';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    console.log(`[API] asaas_webhook_handler: method=${req.method}`);
    return await webhookHandler(req, res);
  } catch (error: any) {
    console.error(`[CRITICAL] asaas_webhook_handler failed:`, error);
    return res.status(500).json({ error: 'Erro interno no webhook do Asaas' });
  }
}
