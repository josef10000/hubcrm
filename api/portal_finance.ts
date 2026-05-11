import type { VercelRequest, VercelResponse } from '@vercel/node';
import { asaasRequest, safeErrorResponse } from './_utils/asaas.js';
import { db } from './_utils/firebase.js';

/**
 * Public endpoint for the Client Portal to fetch payments.
 * Security: Requires valid orgId, clientId and asaasCustomerId.
 * Verifies that the client exists and matches the provided Asaas ID.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { orgId, clientId, asaasCustomerId } = req.query;

    if (!orgId || !clientId || !asaasCustomerId) {
      return res.status(400).json({ error: 'Parâmetros insuficientes' });
    }

    // 1. Verify Client in Firestore
    const clientDoc = await db
      .collection('organizations')
      .doc(orgId as string)
      .collection('clients')
      .doc(clientId as string)
      .get();

    if (!clientDoc.exists) {
      console.warn(`[PortalFinance] Client not found: ${clientId} in org ${orgId}`);
      return res.status(404).json({ error: 'Cliente não encontrado' });
    }

    const clientData = clientDoc.data();
    
    // 2. Security Check: Compare Asaas Customer ID
    if (clientData?.asaasCustomerId !== asaasCustomerId) {
      console.warn(`[PortalFinance] Security mismatch: Provided ${asaasCustomerId} but found ${clientData?.asaasCustomerId}`);
      return res.status(403).json({ error: 'Acesso não autorizado aos dados financeiros' });
    }

    // 3. Fetch Payments from Asaas
    const data = await asaasRequest(`/payments?customer=${asaasCustomerId}`, "GET");
    
    return res.status(200).json(data);
  } catch (error: any) {
    console.error("[PortalFinance] Critical Error:", error);
    return safeErrorResponse(res, error, 'Erro ao carregar faturamento do portal');
  }
}
