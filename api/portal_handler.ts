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
  // Configurações de CORS para o novo domínio separado do Portal Hub
  const allowedOrigins = [
    'https://portahub.hubsymples.com.br',
    'http://localhost:3000',
    'http://localhost:5173',
    'http://localhost:4173'
  ];
  
  const origin = req.headers.origin;
  if (origin && (allowedOrigins.includes(origin) || origin.startsWith('http://localhost:'))) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else {
    res.setHeader('Access-Control-Allow-Origin', 'https://portahub.hubsymples.com.br');
  }
  
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Tratar requisições preflight (OPTIONS)
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'POST') {
    return handleAuth(req, res);
  }
  if (req.method === 'GET') {
    if (req.query.action === 'debug') {
      return handleDebug(req, res);
    }
    return handleFinance(req, res);
  }
  return res.status(405).json({ error: 'Method Not Allowed' });
}

// ============================================================
// POST — Autenticação e Vinculação de Perfil (antigo portal_auth)
// ============================================================
async function handleAuth(req: VercelRequest, res: VercelResponse) {
  try {
    const { email, uid, orgId, clientId, token } = req.body;

    if (!email || !uid) {
      return res.status(400).json({ error: 'Parâmetros email e uid são obrigatórios.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    let targetOrgId = orgId;
    let targetClientId = clientId;

    if (orgId && clientId && token) {
      // Vinculação direta via link seguro (orgId + clientId + token)
      const clientRef = db
        .collection('organizations')
        .doc(orgId)
        .collection('clients')
        .doc(clientId);
      
      const clientDoc = await clientRef.get();
      if (!clientDoc.exists) {
        return res.status(404).json({ error: 'Cliente não encontrado para esta vinculação.' });
      }

      const clientData = clientDoc.data();
      if (!clientData?.publicToken || clientData.publicToken !== token) {
        return res.status(403).json({ error: 'Token de segurança inválido ou expirado.' });
      }
    } else {
      // Fallback: busca por e-mail em lote (legado)
      const clientsQuery = await db
        .collectionGroup('clients')
        .where('email', '==', cleanEmail)
        .limit(1)
        .get();

      if (clientsQuery.empty) {
        console.warn(`[PortalAuth] E-mail não encontrado em nenhum card de cliente: ${cleanEmail}`);
        return res.status(404).json({ 
          error: 'Este e-mail não está associado a nenhuma empresa no sistema. Solicite ao suporte que insira seu e-mail no seu cadastro ou utilize o link de convite correto.' 
        });
      }

      const clientDoc = clientsQuery.docs[0];
      targetClientId = clientDoc.id;
      targetOrgId = clientDoc.ref.parent.parent?.id;

      if (!targetOrgId) {
        console.error(`[PortalAuth] Erro ao extrair orgId para o cliente ${targetClientId}`);
        return res.status(500).json({ error: 'Erro de integrabilidade estrutural do banco.' });
      }
    }

    // 2. Cria ou atualiza o perfil do usuário na coleção /profiles
    const profileRef = db.collection('profiles').doc(uid);
    await profileRef.set({
      email: cleanEmail,
      role: 'client_admin',
      orgId: targetOrgId,
      clientId: targetClientId,
      updatedAt: new Date()
    }, { merge: true });

    // 2.5. Atualiza o card do cliente com as informações de vinculação
    const clientRef = db
      .collection('organizations')
      .doc(targetOrgId)
      .collection('clients')
      .doc(targetClientId);
    await clientRef.update({
      portalLinked: true,
      portalEmail: cleanEmail,
      portalUserUid: uid,
      portalLinkedAt: new Date()
    });

    console.log(`[PortalAuth] Vinculado com sucesso: ${cleanEmail} -> org: ${targetOrgId}, client: ${targetClientId}`);

    return res.status(200).json({
      success: true,
      orgId: targetOrgId,
      clientId: targetClientId
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

// ============================================================
// GET — Diagnóstico de Usuário e Vínculo (Temporário)
// ============================================================
async function handleDebug(req: VercelRequest, res: VercelResponse) {
  try {
    const { email } = req.query;

    if (!email || typeof email !== 'string') {
      return res.status(400).json({ error: 'Parâmetro email é obrigatório.' });
    }

    const cleanEmail = email.trim().toLowerCase();

    // 1. Buscar na coleção 'profiles' pelo e-mail
    const profilesQuery = await db
      .collection('profiles')
      .where('email', '==', cleanEmail)
      .get();

    const profiles: any[] = [];
    profilesQuery.forEach((doc) => {
      profiles.push({
        id: doc.id,
        ...doc.data()
      });
    });

    // 2. Buscar em lote de clientes (collectionGroup 'clients')
    const clientsQuery = await db
      .collectionGroup('clients')
      .where('email', '==', cleanEmail)
      .get();

    const clients: any[] = [];
    clientsQuery.forEach((doc) => {
      const orgId = doc.ref.parent.parent?.id;
      clients.push({
        id: doc.id,
        orgId: orgId || null,
        path: doc.ref.path,
        data: doc.data()
      });
    });

    // 3. Buscar com o e-mail original (para testar case-sensitivity)
    let clientsWithOriginalCase: any[] = [];
    if (email !== cleanEmail) {
      const originalCaseQuery = await db
        .collectionGroup('clients')
        .where('email', '==', email.trim())
        .get();
      
      originalCaseQuery.forEach((doc) => {
        const orgId = doc.ref.parent.parent?.id;
        clientsWithOriginalCase.push({
          id: doc.id,
          orgId: orgId || null,
          path: doc.ref.path,
          data: doc.data()
        });
      });
    }

    return res.status(200).json({
      queryEmail: email,
      cleanEmail,
      profilesFound: profiles.length,
      profiles,
      clientsFound: clients.length,
      clients,
      clientsWithOriginalCaseFound: clientsWithOriginalCase.length,
      clientsWithOriginalCase
    });

  } catch (error: any) {
    console.error("[PortalDebug] Critical Error:", error);
    return res.status(500).json({ error: 'Erro no diagnóstico', message: error.message });
  }
}

