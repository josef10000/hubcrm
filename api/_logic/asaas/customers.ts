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
    const { id, name, cpfCnpj, email, phone, mobilePhone, asaasNotificationsEnabled } = req.body;
    
    if (!name || name.length < 3) {
      return res.status(400).json({ error: 'O nome deve ter pelo menos 3 caracteres' });
    }

    // First, try to find an existing customer with this CPF/CNPJ
    if (cpfCnpj) {
      const cleanCpfCnpj = cpfCnpj.replace(/\D/g, '');
      if (cleanCpfCnpj.length === 11 || cleanCpfCnpj.length === 14) {
        try {
          const existingCustomers = await asaasRequest(`/customers?cpfCnpj=${cleanCpfCnpj}`, "GET");
          if (existingCustomers.data && existingCustomers.data.length > 0) {
            // Customer already exists, return the first one
            return res.status(200).json(existingCustomers.data[0]);
          }
        } catch (e) {
          console.error("Error checking existing customer:", e);
          // Continue to try creating if check fails
        }
      }
    }

    const payload: any = {
      name,
      cpfCnpj: cpfCnpj ? cpfCnpj.replace(/\D/g, '') : undefined,
      email,
      externalReference: id,
      notificationDisabled: asaasNotificationsEnabled === true ? false : true,
      observations: `UserID: ${uid}`
    };
    
    if (phone) payload.phone = phone;
    if (mobilePhone) payload.mobilePhone = mobilePhone;

    const data = await asaasRequest("/customers", "POST", payload);
    return res.status(200).json(data);
  } catch (error: any) {
    console.error("Asaas Customer API Error:", error);
    return safeErrorResponse(res, error, 'Erro ao processar cliente no Asaas');
  }
}
