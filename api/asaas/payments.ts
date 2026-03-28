import type { VercelRequest, VercelResponse } from '@vercel/node';
import { asaasRequest, safeErrorResponse } from '../_utils/asaas.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') {
    try {
      const { customer } = req.query;
      if (!customer) {
        return res.status(400).json({ error: 'Customer ID is required' });
      }
      const data = await asaasRequest(`/payments?customer=${customer}&limit=10`, "GET");
      return res.status(200).json(data);
    } catch (error: any) {
      return safeErrorResponse(res, error, 'Erro ao buscar pagamentos');
    }
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { customer, billingType, value, description, dueDate, installmentCount } = req.body;
    const data = await asaasRequest("/payments", "POST", {
      customer,
      billingType: billingType || "UNDEFINED",
      value,
      dueDate,
      description,
      installmentCount
    });
    return res.status(200).json(data);
  } catch (error: any) {
    return safeErrorResponse(res, error, 'Erro ao criar pagamento');
  }
}
