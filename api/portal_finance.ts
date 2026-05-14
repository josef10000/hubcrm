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
    const paymentsData = await asaasRequest(`/payments?customer=${asaasCustomerId}&limit=100`, "GET");
    let allPayments = paymentsData.data || [];

    // 🚀 Lógica de Filtro: Remover faturas "lixo" de testes anteriores.
    // Regra: Mostrar todas as pagas (RECEIVED/CONFIRMED) para histórico.
    // Regra: Mostrar apenas a MAIS RECENTE das pendentes/vencidas (PENDING/OVERDUE).
    const paid = allPayments.filter((p: any) => p.status === 'RECEIVED' || p.status === 'CONFIRMED');
    const pendingOrOverdue = allPayments
      .filter((p: any) => p.status === 'PENDING' || p.status === 'OVERDUE')
      .sort((a: any, b: any) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime());
    
    // Pegamos apenas a primeira (mais recente) das pendentes/vencidas
    const currentInvoice = pendingOrOverdue.length > 0 ? [pendingOrOverdue[0]] : [];

    const filteredPayments = [...paid, ...currentInvoice];
    // 4. Fetch Support Requests
    const requestsSnap = await db
      .collection('organizations')
      .doc(orgId)
      .collection('supportRequests')
      .where('clientId', '==', clientId)
      .limit(20)
      .get();
    
    const requests = requestsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    // 5. Fetch Active Offers
    const offersSnap = await db
      .collection('organizations')
      .doc(orgId)
      .collection('offers')
      .where('active', '==', true)
      .limit(10)
      .get();
    
    const offers = offersSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    // 6. Fetch Org Announcement
    const orgSnap = await db.collection('organizations').doc(orgId).get();
    const orgData = orgSnap.data();
    const announcement = orgData?.announcement?.isActive ? orgData.announcement : null;

    return res.status(200).json({
      client: {
        id: clientId,
        name: clientData.name,
        email: clientData.email,
        status: clientData.status,
        plan: clientData.plan,
        billingCycle: clientData.billingCycle,
        nextDueDate: clientData.nextDueDate,
        invoiceUrl: clientData.invoiceUrl,
        whatsapp: clientData.whatsapp,
        siteLink: clientData.siteLink,
        niche: clientData.niche,
        createdAt: clientData.createdAt,
        assignedTo: clientData.assignedTo,
        // Não expor dados sensíveis como notes ou tokens internos
      },
      payments: filteredPayments,
      requests: requests.sort((a: any, b: any) => (b.createdAt?._seconds || 0) - (a.createdAt?._seconds || 0)),
      offers,
      announcement
    });
  } catch (error: any) {
    console.error("[PortalFinance] Critical Error:", error);
    return safeErrorResponse(res, error, 'Erro ao carregar faturamento do portal');
  }
}
