import type { VercelRequest, VercelResponse } from '@vercel/node';
import monitorsHandler from './_logic/uptimerobot/monitors.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  return monitorsHandler(req, res);
}
