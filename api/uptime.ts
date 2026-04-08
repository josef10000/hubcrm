import type { VercelRequest, VercelResponse } from '@vercel/node';
import monitorsHandler from './_logic/uptimerobot/monitors.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    console.log(`[API] uptime_handler: method=${req.method}`);
    return await monitorsHandler(req, res);
  } catch (error: any) {
    console.error(`[CRITICAL] uptime_handler failed:`, error);
    return res.status(500).json({ error: 'Erro interno no serviço de monitoramento', details: error.message });
  }
}
