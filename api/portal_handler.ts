import type { VercelRequest, VercelResponse } from '@vercel/node';
import { admin, db } from './_utils/firebase.js';
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
    'https://portalhub.hubsymples.com.br',
    'https://portahub.hubsymples.com.br',
    'http://localhost:3000',
    'http://localhost:5173',
    'http://localhost:4173'
  ];
  
  const origin = req.headers.origin;
  if (origin && (allowedOrigins.includes(origin) || origin.startsWith('http://localhost:'))) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else {
    res.setHeader('Access-Control-Allow-Origin', 'https://portalhub.hubsymples.com.br');
  }
  
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Tratar requisições preflight (OPTIONS)
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'POST') {
    if (req.body.action === 'public_confirm_appointment') {
      return handlePublicConfirmAppointment(req, res);
    }
    if (req.body.action === 'get_client') {
      return handleGetClient(req, res);
    }
    return handleAuth(req, res);
  }
  if (req.method === 'GET') {
    if (req.query.action === 'debug') {
      return handleDebug(req, res);
    }
    if (req.query.action === 'public_get_appointment') {
      return handlePublicGetAppointment(req, res);
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
    const { action, activationCode, email, uid, orgId, clientId, token } = req.body;

    if (action !== 'update_client' && (!email || !uid)) {
      return res.status(400).json({ error: 'Parâmetros email e uid são obrigatórios.' });
    }

    const cleanEmail = email ? email.trim().toLowerCase() : '';
    let targetOrgId = orgId;
    let targetClientId = clientId;

    if (action === 'update_client') {
      if (!orgId || !clientId || !token) {
        return res.status(400).json({ error: 'Parâmetros orgId, clientId e token são obrigatórios para atualizar dados.' });
      }

      const clientRef = db
        .collection('organizations')
        .doc(orgId)
        .collection('clients')
        .doc(clientId);

      const clientDoc = await clientRef.get();
      if (!clientDoc.exists) {
        return res.status(404).json({ error: 'Cliente não encontrado.' });
      }

      const clientData = clientDoc.data();
      if (!clientData?.publicToken || clientData.publicToken !== token) {
        return res.status(403).json({ error: 'Token de segurança inválido ou expirado.' });
      }

      const { clientName, clientPhone, schedulingSettings, fidelitySettings, bioSettings, contracts, logs } = req.body;
      const updatePayload: any = {};

      // Dados cadastrais básicos
      if (clientName && clientName.trim()) {
        updatePayload.name = clientName.trim();
      }
      if (clientPhone !== undefined) {
        updatePayload.phone = clientPhone.trim();
        updatePayload.whatsapp = clientPhone.trim();
      }

      // Configurações de Agenda (expediente, pix, templates WhatsApp, nomenclaturas)
      if (schedulingSettings !== undefined) {
        const existingSched = clientData?.schedulingSettings || {};
        updatePayload.schedulingSettings = { ...existingSched, ...schedulingSettings };
      }

      // Configurações do Clube de Fidelidade
      if (fidelitySettings !== undefined) {
        const existingFid = clientData?.fidelitySettings || {};
        updatePayload.fidelitySettings = { ...existingFid, ...fidelitySettings };
      }

      // Configurações do Mini-Site (Bio)
      if (bioSettings !== undefined) {
        const existingBio = clientData?.bioSettings || {};
        updatePayload.bioSettings = { ...existingBio, ...bioSettings };
      }

      // Contratos assinados digitalmente
      if (contracts !== undefined) {
        updatePayload.contracts = contracts;
      }

      // Logs de atividade
      if (logs !== undefined) {
        updatePayload.logs = logs;
      }

      if (Object.keys(updatePayload).length > 0) {
        await clientRef.update(updatePayload);
        console.log(`[PortalUpdate] Cliente ${clientId} atualizado no CRM com campos: ${Object.keys(updatePayload).join(', ')}`);
      }

      return res.status(200).json({
        success: true,
        message: 'Dados do cliente atualizados com sucesso.'
      });
    }

    if (action === 'activate') {
      if (!activationCode) {
        return res.status(400).json({ error: 'Parâmetro activationCode é obrigatório para ativação.' });
      }

      console.log(`[PortalAuth] Tentativa de ativação com o código: ${activationCode} para o usuário: ${cleanEmail}`);

      // Busca o cliente pelo código de ativação
      const clientsQuery = await db
        .collectionGroup('clients')
        .where('portalActivationCode', '==', activationCode.trim())
        .limit(1)
        .get();

      if (clientsQuery.empty) {
        console.warn(`[PortalAuth] Código de ativação inválido ou não encontrado: ${activationCode}`);
        return res.status(400).json({ error: 'Código de ativação inválido ou já utilizado.' });
      }

      const clientDoc = clientsQuery.docs[0];
      targetClientId = clientDoc.id;
      targetOrgId = clientDoc.ref.parent.parent?.id;

      if (!targetOrgId) {
        console.error(`[PortalAuth] Erro ao extrair orgId para o cliente ${targetClientId} no fluxo de ativação`);
        return res.status(500).json({ error: 'Erro de integrabilidade estrutural do banco de dados.' });
      }
    } else if (orgId && clientId && token) {
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
          error: 'Este e-mail não está associado a nenhuma empresa no sistema. Solicite ao suporte que lhe forneça o Código de Ativação do seu portal.' 
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
    
    // Na ativação por código, opcionalmente removemos o código para que ele não seja reutilizado
    const updateData: any = {
      portalLinked: true,
      portalEmail: cleanEmail,
      portalUserUid: uid,
      portalLinkedAt: new Date()
    };

    if (action === 'activate') {
       updateData.portalActivationCode = admin.firestore.FieldValue.delete();
    }

    await clientRef.update(updateData);

    const finalClientDoc = await clientRef.get();
    const finalClientData = finalClientDoc.data();
    const publicToken = finalClientData?.publicToken || '';

    console.log(`[PortalAuth] Vinculado com sucesso: ${cleanEmail} -> org: ${targetOrgId}, client: ${targetClientId} (Action: ${action || 'normal'})`);

    return res.status(200).json({
      success: true,
      orgId: targetOrgId,
      clientId: targetClientId,
      token: publicToken
    });

  } catch (error: any) {
    console.error("[PortalAuth] Erro crítico na vinculação:", error);
    return res.status(500).json({ 
      error: 'Erro interno ao autenticar e vincular conta do portal.',
      details: error.message
    });
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
        brandAssets: clientData.brandAssets || null,
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

async function handlePublicGetAppointment(req: VercelRequest, res: VercelResponse) {
  try {
    const { orgId, appointmentId, clientId } = req.query;
    if (!orgId || !appointmentId) {
      return res.status(400).json({ error: 'Parâmetros orgId e appointmentId são obrigatórios.' });
    }

    // Busca o agendamento
    const appointmentDoc = await db
      .collection('organizations')
      .doc(orgId as string)
      .collection('appointments')
      .doc(appointmentId as string)
      .get();

    if (!appointmentDoc.exists) {
      return res.status(404).json({ error: 'Agendamento não encontrado.' });
    }

    const appointmentData = appointmentDoc.data();

    // Busca a logo da organização (lendo do brandAssets do cliente correspondente ao assinante no CRM)
    let logoUrl = '';
    if (clientId) {
      const clientDoc = await db
        .collection('organizations')
        .doc(orgId as string)
        .collection('clients')
        .doc(clientId as string)
        .get();

      if (clientDoc.exists) {
        const clientData = clientDoc.data();
        logoUrl = clientData?.brandAssets?.logoUrl || '';
      }
    }

    // Retorna apenas dados públicos não sensíveis
    return res.status(200).json({
      clientName: appointmentData?.clientName || '',
      serviceName: appointmentData?.serviceName || '',
      date: appointmentData?.date || '',
      time: appointmentData?.time || '',
      price: appointmentData?.price || 0,
      status: appointmentData?.status || '',
      logoUrl
    });
  } catch (error: any) {
    console.error('[PortalPublicAppointment] Erro ao buscar agendamento:', error);
    return res.status(500).json({ error: 'Erro interno ao buscar dados do agendamento.', details: error.message });
  }
}

async function handlePublicConfirmAppointment(req: VercelRequest, res: VercelResponse) {
  try {
    const { orgId, appointmentId, status } = req.body;
    if (!orgId || !appointmentId || !status) {
      return res.status(400).json({ error: 'Parâmetros orgId, appointmentId e status são obrigatórios.' });
    }

    if (status !== 'confirmed' && status !== 'cancelled') {
      return res.status(400).json({ error: 'Status de confirmação inválido.' });
    }

    const appointmentRef = db
      .collection('organizations')
      .doc(orgId as string)
      .collection('appointments')
      .doc(appointmentId as string);

    const appointmentDoc = await appointmentRef.get();
    if (!appointmentDoc.exists) {
      return res.status(404).json({ error: 'Agendamento não encontrado.' });
    }

    await appointmentRef.update({
      status,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    console.log(`[PortalPublicAppointment] Agendamento ${appointmentId} atualizado com sucesso para status: ${status}`);

    return res.status(200).json({
      success: true,
      message: `Presença atualizada com sucesso para ${status === 'confirmed' ? 'Confirmado' : 'Cancelado'}.`
    });
  } catch (error: any) {
    console.error('[PortalPublicAppointment] Erro ao atualizar agendamento:', error);
    return res.status(500).json({ error: 'Erro interno ao atualizar presença no agendamento.', details: error.message });
  }
}

// ============================================================
// POST get_client — Busca dados do cliente via token (sem exigir uid/email)
// ============================================================
async function handleGetClient(req: VercelRequest, res: VercelResponse) {
  try {
    const { orgId, clientId, token } = req.body;

    if (!orgId || !clientId || !token) {
      return res.status(400).json({ error: 'Parâmetros orgId, clientId e token são obrigatórios.' });
    }

    const clientRef = db
      .collection('organizations')
      .doc(orgId)
      .collection('clients')
      .doc(clientId);

    const clientDoc = await clientRef.get();
    if (!clientDoc.exists) {
      return res.status(404).json({ error: 'Cliente não encontrado.' });
    }

    const clientData = clientDoc.data();
    if (!clientData?.publicToken || clientData.publicToken !== token) {
      return res.status(403).json({ error: 'Token de segurança inválido ou expirado.' });
    }

    // Retorna apenas os campos seguros (sem informações sensíveis)
    return res.status(200).json({
      success: true,
      client: {
        id: clientDoc.id,
        name: clientData.name,
        email: clientData.email,
        phone: clientData.phone,
        schedulingSettings: clientData.schedulingSettings || {},
        fidelitySettings: clientData.fidelitySettings || {},
        bioSettings: clientData.bioSettings || {},
        contracts: clientData.contracts || [],
        logs: clientData.logs || [],
        packages: clientData.packages || [],
        portalLinked: clientData.portalLinked || false,
      }
    });
  } catch (error: any) {
    console.error('[PortalGetClient] Erro ao buscar dados do cliente:', error);
    return res.status(500).json({ error: 'Erro interno ao buscar dados do cliente.', details: error.message });
  }
}
