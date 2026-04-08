import type { VercelRequest, VercelResponse } from '@vercel/node';
import { asaasRequest, safeErrorResponse } from '../../../_utils/asaas';
import { verifyAuth } from '../../../_utils/authMiddleware';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Auth check
  const uid = await verifyAuth(req, res);
  if (!uid) return;

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { id } = req.query;
    const data = await asaasRequest(`/subscriptions/${id}`, "GET");
    
    // Also get the latest payment for this subscription to check if it's paid
    const paymentsData = await asaasRequest(`/payments?subscription=${id}`, "GET");
    
    return res.status(200).json({
      subscription: data,
      payments: paymentsData.data || []
    });
  } catch (error: any) {
    return safeErrorResponse(res, error, 'Erro ao buscar assinatura');
  }
}
