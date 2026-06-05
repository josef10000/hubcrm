import type { VercelRequest, VercelResponse } from '@vercel/node';
import { db } from './_utils/firebase.js';
import { asaasRequest, safeErrorResponse } from './_utils/asaas.js';
import type { ClientBase } from '../shared/types.js';
import { portalFinanceSchema, validateSchema } from '../shared/schemas.js';

/**
 * Unified Portal Handler
 * - POST: Autenticação e vinculação de perfil do portal (antigo portal_auth)
 * - GET: Busca de dados financeiros do portal (antigo portal_finance)
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'POST') {
    return handleAuth(req, res);
  }
  if (req.method === 'GET') {
    return handleFinance(req, res);
  }
  return res.status(405).json({ error: 'Method Not Allowed' });
}

// ============================================================
// POST — Autenticação e Vinculação de Perfil (antigo portal_auth)
// ============================================================
async function handleAuth(req: VercelRequest, res: VercelResponse) {
  try {
    const { email, uid } = req.body;

    if (!email || !uid) {
      return res.status(400).json({ error: 'Parâmetros email e uid são obrigatórios.' });
    }

    const cleanEmail = email.trim().toLowerCase();

    // 1. Busca em lote em todas as organizações por um cliente com o e-mail fornecido
    const clientsQuery = await db
      .collectionGroup('clients')
      .where('email', '==', cleanEmail)
      .limit(1)
      .get();

    if (clientsQuery.empty) {
      console.warn(`[PortalAuth] E-mail não encontrado em nenhum card de cliente: ${cleanEmail}`);
      return res.status(404).json({ 
        error: 'Este e-mail não está associado a nenhuma empresa no sistema. Solicite ao suporte que insira seu e-mail no seu cadastro.' 
      });
    }

    const clientDoc = clientsQuery.docs[0];
    const clientId = clientDoc.id;
    const orgId = clientDoc.ref.parent.parent?.id;

    if (!orgId) {
      console.error(`[PortalAuth] Erro ao extrair orgId para o cliente ${clientId}`);
      return res.status(500).json({ error: 'Erro de integrabilidade estrutural do banco.' });
    }

    // 2. Cria ou atualiza o perfil do usuário na coleção /profiles
    const profileRef = db.collection('profiles').doc(uid);
    await profileRef.set({
      email: cleanEmail,
      role: 'client_admin',
      orgId: orgId,
      clientId: clientId,
      updatedAt: new Date()
    }, { merge: true });

    console.log(`[PortalAuth] Vinculado com sucesso: ${cleanEmail} -> org: ${orgId}, client: ${clientId}`);

    return res.status(200).json({
      success: true,
      orgId,
      clientId
    });

  } catch (error: any) {
    console.error("[PortalAuth] Erro crítico na vinculação:", error);
    return res.status(500).json({ error: 'Erro interno ao autenticar e vincular conta do portal.' });
  }
}

// ============================================================
// GET — Dados Financeiros do Portal (antigo portal_finance)
// ============================================================
async function handleFinance(req: VercelRequest, res: VercelResponse) {
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

    const isCourtesy = clientData.isCourtesy === true;
    const asaasCustomerId = clientData.asaasCustomerId;
    if (!isCourtesy && !asaasCustomerId) {
      return res.status(404).json({ error: 'Configuração financeira pendente' });
    }

    // Criamos as Promises para rodar todas em paralelo
    const asaasPromise = !isCourtesy && asaasCustomerId
      ? asaasRequest(`/payments?customer=${asaasCustomerId}&limit=100`, "GET")
      : Promise.resolve({ data: [] });

    const requestsPromise = db
      .collection('organizations')
      .doc(orgId)
      .collection('supportRequests')
      .where('clientId', '==', clientId)
      .limit(20)
      .get();

    const offersPromise = db
      .collection('organizations')
      .doc(orgId)
      .collection('offers')
      .where('active', '==', true)
      .limit(10)
      .get();

    const orgPromise = db.collection('organizations').doc(orgId).get();

    // Executamos todas as chamadas em paralelo
    const [paymentsData, requestsSnap, offersSnap, orgSnap] = await Promise.all([
      asaasPromise,
      requestsPromise,
      offersPromise,
      orgPromise
    ]);

    // 3. Processamento de Pagamentos do Asaas
    let filteredPayments: any[] = [];
    if (!isCourtesy) {
      let allPayments = paymentsData.data || [];
      const clientPayments = allPayments.filter((p: any) => p.externalReference === clientId);

      const paid = clientPayments.filter((p: any) => p.status === 'RECEIVED' || p.status === 'CONFIRMED');
      const pendingOrOverdue = clientPayments
        .filter((p: any) => p.status === 'PENDING' || p.status === 'OVERDUE')
        .sort((a: any, b: any) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime());
      
      const currentInvoice = pendingOrOverdue.length > 0 ? [pendingOrOverdue[0]] : [];
      filteredPayments = [...paid, ...currentInvoice];
    }

    // 4. Processamento de chamados de suporte
    const requests = requestsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    // 5. Processamento de ofertas
    const offers = offersSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    // 6. Processamento de anúncio da organização
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
        planPrice: clientData.planPrice,
        setupPrice: clientData.setupPrice,
        customMonthlyPrice: clientData.customMonthlyPrice,
        customSetupPrice: clientData.customSetupPrice,
        isCourtesy: clientData.isCourtesy,
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
