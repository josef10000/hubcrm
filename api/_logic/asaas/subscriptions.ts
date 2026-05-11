import type { VercelRequest, VercelResponse } from '@vercel/node';
import { asaasRequest, safeErrorResponse } from '../../_utils/asaas.js';
import { verifyAuth } from '../../_utils/authMiddleware.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Auth check
  const uid = await verifyAuth(req, res);
  if (!uid) return;

  if (req.method === 'GET') {
    try {
      const { id } = req.query;
      if (!id) {
        return res.status(400).json({ error: 'Subscription ID is required' });
      }
      const data = await asaasRequest(`/subscriptions/${id}`, "GET");
      return res.status(200).json(data);
    } catch (error: any) {
      return safeErrorResponse(res, error, 'Erro ao buscar assinatura');
    }
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { customer, billingType, value, nextDueDate, description, cycle } = req.body;
    const data = await asaasRequest("/subscriptions", "POST", {
      customer,
      billingType: billingType || "UNDEFINED",
      value,
      nextDueDate,
      description,
      cycle: cycle || "MONTHLY"
    });
    return res.status(200).json(data);
  } catch (error: any) {
    return safeErrorResponse(res, error, 'Erro ao criar assinatura');
  }
}
