import type { VercelRequest, VercelResponse } from '@vercel/node';
import { asaasRequest, safeErrorResponse } from '../../_utils/asaas.js';
import { verifyAuth } from '../../_utils/authMiddleware.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Auth check
  const uid = await verifyAuth(req, res);
  if (!uid) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { subscriptionId, nextDueDate, value, updatePendingPayments, billingType, cycle, description } = req.body;
    
    if (!subscriptionId) {
      return res.status(400).json({ error: 'Subscription ID is required' });
    }

    const payload: any = {};
    if (nextDueDate) payload.nextDueDate = nextDueDate;
    if (value) payload.value = value;
    if (updatePendingPayments !== undefined) payload.updatePendingPayments = updatePendingPayments;
    if (billingType) payload.billingType = billingType;
    if (cycle) payload.cycle = cycle;
    if (description) payload.description = description;

    const data = await asaasRequest(`/subscriptions/${subscriptionId}`, "POST", payload);
    return res.status(200).json(data);
  } catch (error: any) {
    return safeErrorResponse(res, error, 'Erro ao atualizar assinatura');
  }
}
