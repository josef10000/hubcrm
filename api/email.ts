import type { VercelRequest, VercelResponse } from '@vercel/node';
import manualTriggerHandler from './_logic/email/manual-trigger';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    console.log(`[API] email_handler: method=${req.method}`);
    return await manualTriggerHandler(req, res);
  } catch (error: any) {
    console.error(`[CRITICAL] email_handler failed:`, error);
    return res.status(500).json({ 
      error: 'Erro interno no serviço de e-mail', 
      details: error.message 
    });
  }
}
