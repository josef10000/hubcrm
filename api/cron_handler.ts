import type { VercelRequest, VercelResponse } from '@vercel/node';
import { runDailyCron } from './_cron/daily_cron.js';
import { runFinanceEngine } from './_cron/finance_engine.js';
import { runProcessScheduler } from './_cron/process_scheduler.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { action } = req.query;

  console.log(`[Cron Handler] Ação recebida: ${action}`);

  switch (action) {
    case 'daily':
      return runDailyCron(req, res);
    case 'finance':
      return runFinanceEngine(req, res);
    case 'scheduler':
      return runProcessScheduler(req, res);
    default:
      return res.status(400).json({ error: `Invalid cron action: ${action}` });
  }
}
