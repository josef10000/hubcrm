import type { VercelRequest, VercelResponse } from '@vercel/node';
import manualTriggerHandler from './_logic/email/manual-trigger';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  return manualTriggerHandler(req, res);
}
