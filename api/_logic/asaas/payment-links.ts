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
    const { name, description, endDate, value, billingType, chargeType, maxInstallmentCount, customer, dueDateLimitDays } = req.body;
    
    // Create a Payment Link in Asaas
    const payload: any = {
      name,
      description,
      endDate,
      value,
      chargeType: chargeType || "DETACHED", // DETACHED is for one-time payments
      dueDateLimitDays: dueDateLimitDays || 3, // Default to 3 business days for payment due date
      subscriptionCycle: null,
      customer
    };

    if (payload.chargeType === 'INSTALLMENT') {
      payload.maxInstallmentCount = maxInstallmentCount || 12; // Allow up to 12 installments
    }

    if (billingType && billingType !== "UNDEFINED") {
      payload.billingType = billingType;
      if (billingType === 'CREDIT_CARD') {
        payload.chargeType = 'INSTALLMENT';
        payload.maxInstallmentCount = maxInstallmentCount || 12;
      }
    }

    const data = await asaasRequest("/paymentLinks", "POST", payload);
    
    return res.status(200).json(data);
  } catch (error: any) {
    return safeErrorResponse(res, error, 'Erro ao criar link de pagamento');
  }
}
