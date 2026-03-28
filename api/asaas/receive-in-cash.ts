import type { VercelRequest, VercelResponse } from '@vercel/node';
import { asaasRequest, safeErrorResponse } from '../_utils/asaas.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { paymentId } = req.body;
    if (!paymentId) {
      return res.status(400).json({ error: 'Payment ID is required' });
    }

    // Mark as received in cash to zero out the invoice and avoid fees
    const data = await asaasRequest(`/payments/${paymentId}/receiveInCash`, "POST", {
      paymentDate: new Date().toISOString().split('T')[0],
      // value is optional, if not sent it uses the full payment value
    });
    return res.status(200).json(data);
  } catch (error: any) {
    return safeErrorResponse(res, error, 'Erro ao registrar pagamento em dinheiro');
  }
}
