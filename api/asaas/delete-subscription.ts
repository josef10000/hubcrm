import type { VercelRequest, VercelResponse } from '@vercel/node';
import { asaasRequest } from '../_utils/asaas';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { subscriptionId } = req.body;
    const data = await asaasRequest(`/subscriptions/${subscriptionId}`, "DELETE");
    return res.status(200).json(data);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}
