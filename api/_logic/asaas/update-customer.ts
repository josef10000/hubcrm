import type { VercelRequest, VercelResponse } from '@vercel/node';
import { asaasRequest, safeErrorResponse } from '../../_utils/asaas';
import { verifyAuth } from '../../_utils/authMiddleware';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Auth check
  const uid = await verifyAuth(req, res);
  if (!uid) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { asaasCustomerId, notificationDisabled } = req.body;
    
    if (!asaasCustomerId) {
      return res.status(400).json({ error: 'asaasCustomerId é obrigatório' });
    }

    const payload: any = {};
    if (notificationDisabled !== undefined) {
      payload.notificationDisabled = notificationDisabled;
    }

    const data = await asaasRequest(`/customers/${asaasCustomerId}`, "POST", payload);
    return res.status(200).json(data);
  } catch (error: any) {
    console.error("Asaas Customer Update Error:", error);
    return safeErrorResponse(res, error, 'Erro ao atualizar cliente no Asaas');
  }
}
