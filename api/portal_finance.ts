import type { VercelRequest, VercelResponse } from '@vercel/node';
import { asaasRequest, safeErrorResponse } from './_utils/asaas.js';
import { db } from './_utils/firebase.js';
import type { ClientBase } from '../shared/types.js';
import { portalFinanceSchema, validateSchema } from '../shared/schemas.js';

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
    const validation = validateSchema(portalFinanceSchema, req.query);
    if (!validation.success) return res.status(400).json({ error: validation.error });
    const { orgId, clientId, token } = validation.data;

    // 1. Verify Client in Firestore
    const clientRef = db
      .collection('organizations')
      .doc(orgId)
      .collection('clients')
      .doc(clientId);
    
    const clientDoc = await clientRef.get();

    if (!clientDoc.exists) {
      console.warn(`[PortalFinance] Client not found: ${clientId} in org ${orgId}`);
      return res.status(404).json({ error: 'Cliente não encontrado' });
    }

    const clientData = clientDoc.data() as ClientBase & { publicToken?: string };
    
    // 2. Security Check: Compare Security Token
    if (!clientData?.publicToken || clientData.publicToken !== token) {
      console.warn(`[PortalFinance] Security mismatch: Invalid token for client ${clientId}`);
      return res.status(403).json({ error: 'Acesso não autorizado ou link expirado' });
    }

    const asaasCustomerId = clientData.asaasCustomerId;
    if (!asaasCustomerId) {
      return res.status(404).json({ error: 'Configuração financeira pendente' });
    }

    // 3. Fetch Payments from Asaas
    const data = await asaasRequest(`/payments?customer=${asaasCustomerId}`, "GET");
    
    return res.status(200).json(data);
  } catch (error: any) {
    console.error("[PortalFinance] Critical Error:", error);
    return safeErrorResponse(res, error, 'Erro ao carregar faturamento do portal');
  }
}
