import type { VercelRequest, VercelResponse } from '@vercel/node';
import { asaasRequest } from '../_utils/asaas.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { name, description, endDate, value, billingType, chargeType, maxInstallmentCount, customer } = req.body;
    
    // Create a Payment Link in Asaas
    // This allows the client to choose the number of installments on the checkout page
    const data = await asaasRequest("/paymentLinks", "POST", {
      name,
      description,
      endDate,
      value,
      billingType: billingType || "UNDEFINED",
      chargeType: chargeType || "DETACHED", // DETACHED is for one-time payments
      maxInstallmentCount: maxInstallmentCount || 12, // Allow up to 12 installments
      subscriptionCycle: null,
      customer
    });
    
    return res.status(200).json(data);
  } catch (error: any) {
    console.error("Payment Link Error:", error.message);
    return res.status(500).json({ error: error.message });
  }
}
