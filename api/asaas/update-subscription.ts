import type { VercelRequest, VercelResponse } from '@vercel/node';
import { asaasRequest } from '../_utils/asaas.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { subscriptionId, nextDueDate, value, updatePendingPayments } = req.body;
    
    if (!subscriptionId) {
      return res.status(400).json({ error: 'Subscription ID is required' });
    }

    const payload: any = {};
    if (nextDueDate) payload.nextDueDate = nextDueDate;
    if (value) payload.value = value;
    if (updatePendingPayments !== undefined) payload.updatePendingPayments = updatePendingPayments;

    const data = await asaasRequest(`/subscriptions/${subscriptionId}`, "POST", payload);
    return res.status(200).json(data);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}
