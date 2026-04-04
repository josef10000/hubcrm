import type { VercelRequest, VercelResponse } from '@vercel/node';
import { asaasRequest, safeErrorResponse } from '../_utils/asaas.js';
import { verifyAuth } from '../_utils/authMiddleware.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Auth check
  const uid = await verifyAuth(req, res);
  if (!uid) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { paymentId } = req.body;
    
    if (!paymentId) {
      return res.status(400).json({ error: 'Payment ID is required' });
    }

    const data = await asaasRequest(`/payments/${paymentId}`, "DELETE");
    return res.status(200).json(data);
  } catch (error: any) {
    return safeErrorResponse(res, error, 'Erro ao excluir pagamento');
  }
}
