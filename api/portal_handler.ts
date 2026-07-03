import type { VercelRequest, VercelResponse } from '@vercel/node';
import { admin, db } from './_utils/firebase.js';
import { asaasRequest, safeErrorResponse, AsaasApiError } from './_utils/asaas.js';
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
    if (req.body.action === 'checkout_pay') {
      return handleCheckoutPay(req, res);
    }
    if (req.body.action === 'support_create') {
      return handleSupportCreate(req, res);
    }
    if (req.body.action === 'support_reply') {
      return handleSupportReply(req, res);
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
    if (req.query.action === 'public_get_bio') {
      return handlePublicGetBio(req, res);
    }
    if (req.query.action === 'public_get_wallet_pass') {
      return handlePublicGetWalletPass(req, res);
    }
    if (req.query.action === 'checkout_info') {
      return handleCheckoutInfo(req, res);
    }
    if (req.query.action === 'checkout_pix') {
      return handleCheckoutPix(req, res);
    }
    if (req.query.action === 'checkout_boleto') {
      return handleCheckoutBoleto(req, res);
    }
    if (req.query.action === 'support_list') {
      return handleSupportList(req, res);
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

// ============================================================
// GET public_get_bio — Busca dados consolidados e públicos da Bio/Agendamento
// ============================================================
async function handlePublicGetBio(req: VercelRequest, res: VercelResponse) {
  try {
    const { orgId, clientId } = req.query;
    if (!orgId) {
      return res.status(400).json({ error: 'Parâmetro orgId é obrigatório.' });
    }

    const orgRef = db.collection('organizations').doc(orgId as string);
    const orgSnap = await orgRef.get();
    if (!orgSnap.exists) {
      return res.status(404).json({ error: 'Organização não encontrada.' });
    }
    const orgData = orgSnap.data();

    // Tenta detectar o clientId se não for informado
    let targetClientId = (clientId as string) || '';
    if (!targetClientId) {
      const clientsSnap = await db
        .collection('organizations')
        .doc(orgId as string)
        .collection('clients')
        .limit(1)
        .get();
      if (!clientsSnap.empty) {
        targetClientId = clientsSnap.docs[0].id;
      }
    }

    let bioSettings = {
      title: orgData?.name || 'Nosso Negócio',
      description: 'Seja bem-vindo à nossa página pública. Veja nossos links e faça um agendamento online.',
      avatarUrl: orgData?.logoUrl || '',
      links: [],
      showBooking: true
    };
    let schedulingSettings = {};
    let fidelitySettings = {};

    if (targetClientId) {
      const clientSnap = await db
        .collection('organizations')
        .doc(orgId as string)
        .collection('clients')
        .doc(targetClientId)
        .get();

      if (clientSnap.exists) {
        const clientData = clientSnap.data();
        if (clientData?.bioSettings) {
          bioSettings = { ...bioSettings, ...clientData.bioSettings };
        }
        if (clientData?.schedulingSettings) {
          schedulingSettings = clientData.schedulingSettings;
        }
        if (clientData?.fidelitySettings) {
          fidelitySettings = clientData.fidelitySettings;
        }
      }
    }

    // Busca a lista de serviços ativos
    const servicesSnap = await db
      .collection('organizations')
      .doc(orgId as string)
      .collection('client_services')
      .orderBy('createdAt', 'desc')
      .get();
    
    const services = servicesSnap.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    return res.status(200).json({
      success: true,
      org: {
        id: orgSnap.id,
        name: orgData?.name || '',
        logoUrl: orgData?.logoUrl || ''
      },
      clientId: targetClientId,
      bioSettings,
      schedulingSettings,
      fidelitySettings,
      services
    });

  } catch (error: any) {
    console.error('[PortalPublicGetBio] Erro ao obter dados públicos do Mini-Site:', error);
    return res.status(500).json({ error: 'Erro interno ao carregar os dados públicos do Mini-Site.', details: error.message });
  }
}

// ============================================================
// GET — Geração e Visualização do Passe Digital (Apple & Google Wallet Simulator)
// ============================================================
async function handlePublicGetWalletPass(req: VercelRequest, res: VercelResponse) {
  try {
    const { type, orgId, id, clientId } = req.query;
    if (!orgId) {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.status(400).send('<h1>Erro: orgId é obrigatório</h1>');
    }

    const orgSnap = await db.collection('organizations').doc(orgId as string).get();
    if (!orgSnap.exists) {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.status(404).send('<h1>Erro: Organização não encontrada</h1>');
    }
    const orgData = orgSnap.data();

    let title = orgData?.name || 'Portal Hub';
    let cardColor = '#6366f1';
    let textColor = '#ffffff';
    let detailsHtml = '';
    let barcodeValue = (id as string) || (clientId as string) || '1234567890';

    if (type === 'fidelity') {
      const clientsSnap = await db.collection('organizations').doc(orgId as string).collection('clients').limit(1).get();
      let fidelityConfig: any = {};
      let rewardText = 'Prêmio Especial';

      if (!clientsSnap.empty) {
        const clientDoc = clientsSnap.docs[0];
        const clientData = clientDoc.data();
        fidelityConfig = clientData?.fidelitySettings || {};
        cardColor = fidelityConfig.walletCardColor || '#b89430';
        textColor = fidelityConfig.walletTextColor || '#ffffff';
        rewardText = fidelityConfig.reward || 'Prêmio Especial';
      }

      title = `Cartão Fidelidade — ${title}`;
      detailsHtml = `
        <div style="font-size: 11px; opacity: 0.75; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px;">PRÊMIO FIDELIDADE</div>
        <div style="font-size: 22px; font-weight: 900; margin-bottom: 20px; color: ${textColor}; line-height: 1.2;">${rewardText}</div>
        <div style="font-size: 12px; opacity: 0.8; margin-bottom: 8px;">Meta: <strong>${fidelityConfig.goal || 10} visitas</strong> completas</div>
        <div style="font-size: 11px; opacity: 0.6; font-style: italic;">Apresente este cartão no local para carimbar.</div>
      `;
    } else {
      if (!id) {
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        return res.status(400).send('<h1>Erro: id do agendamento é obrigatório</h1>');
      }
      const appSnap = await db.collection('organizations').doc(orgId as string).collection('appointments').doc(id as string).get();
      if (!appSnap.exists) {
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        return res.status(404).send('<h1>Erro: Agendamento não encontrado</h1>');
      }
      const appData = appSnap.data();
      
      const clientsSnap = await db.collection('organizations').doc(orgId as string).collection('clients').limit(1).get();
      if (!clientsSnap.empty) {
        const clientData = clientsSnap.docs[0].data();
        cardColor = clientData?.fidelitySettings?.walletCardColor || '#6366f1';
        textColor = clientData?.fidelitySettings?.walletTextColor || '#ffffff';
      }

      title = `Ticket de Agendamento`;
      
      const dateFormatted = appData?.date ? new Date(appData.date + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '';
      detailsHtml = `
        <div style="font-size: 11px; opacity: 0.75; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px;">SERVIÇO CONFIRMADO</div>
        <div style="font-size: 20px; font-weight: 900; margin-bottom: 20px; color: ${textColor}; line-height: 1.2;">${appData?.serviceName || 'Serviço'}</div>
        
        <div style="display: grid; grid-template-cols: 1fr 1fr; grid-auto-flow: column; gap: 15px; margin-bottom: 20px;">
          <div>
            <div style="font-size: 10px; opacity: 0.6; text-transform: uppercase; letter-spacing: 0.5px;">DATA</div>
            <div style="font-size: 14px; font-weight: bold; color: ${textColor}">${dateFormatted}</div>
          </div>
          <div>
            <div style="font-size: 10px; opacity: 0.6; text-transform: uppercase; letter-spacing: 0.5px;">HORÁRIO</div>
            <div style="font-size: 14px; font-weight: bold; color: ${textColor}">${appData?.time || ''}</div>
          </div>
        </div>

        <div style="border-t: 1px solid rgba(255,255,255,0.15); pt-15; margin-top: 15px;">
          <div style="font-size: 10px; opacity: 0.6; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 2px;">CLIENTE</div>
          <div style="font-size: 13px; font-weight: bold; color: ${textColor}">${appData?.clientName || ''}</div>
        </div>
      `;
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title}</title>
        <style>
          body {
            background-color: #050505;
            color: #ffffff;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            margin: 0;
            padding: 20px;
            box-sizing: border-box;
          }
          .pass-container {
            width: 100%;
            max-width: 340px;
            background-color: ${cardColor};
            color: ${textColor};
            border-radius: 28px;
            box-shadow: 0 30px 60px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255, 255, 255, 0.15);
            overflow: hidden;
            transition: transform 0.3s;
          }
          .pass-container:hover {
            transform: translateY(-5px);
          }
          .pass-header {
            padding: 20px 24px;
            display: flex;
            align-items: center;
            gap: 12px;
            border-bottom: 1px dashed rgba(255, 255, 255, 0.2);
            position: relative;
          }
          .pass-header::before, .pass-header::after {
            content: '';
            position: absolute;
            bottom: -8px;
            width: 16px;
            height: 16px;
            border-radius: 50%;
            background-color: #050505;
          }
          .pass-header::before { left: -8px; }
          .pass-header::after { right: -8px; }
          .pass-logo {
            width: 36px;
            height: 36px;
            border-radius: 50%;
            background-color: rgba(255, 255, 255, 0.1);
            object-fit: cover;
            border: 1px solid rgba(255, 255, 255, 0.25);
          }
          .pass-body {
            padding: 24px;
          }
          .pass-footer {
            background-color: #ffffff;
            color: #000000;
            padding: 24px;
            text-align: center;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 6px;
            border-top: 1px dashed rgba(0, 0, 0, 0.1);
          }
          .barcode {
            font-family: 'Libre Barcode 128', "Courier New", monospace;
            font-size: 52px;
            margin: 0;
            line-height: 1;
            letter-spacing: 1px;
          }
          .barcode-text {
            font-size: 9px;
            color: #777;
            font-weight: bold;
            letter-spacing: 1px;
            text-transform: uppercase;
          }
          .btn-back {
            margin-top: 25px;
            padding: 12px 24px;
            background-color: rgba(255, 255, 255, 0.04);
            border: 1px solid rgba(255, 255, 255, 0.1);
            color: #999;
            text-decoration: none;
            border-radius: 16px;
            font-size: 11px;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 1px;
            transition: all 0.2s;
          }
          .btn-back:hover {
            background-color: rgba(255, 255, 255, 0.08);
            color: #fff;
            border-color: rgba(255, 255, 255, 0.2);
          }
        </style>
        <link href="https://fonts.googleapis.com/css2?family=Libre+Barcode+128&display=swap" rel="stylesheet">
      </head>
      <body>
        <div class="pass-container">
          <div class="pass-header">
            ${orgData?.logoUrl ? `<img src="${orgData.logoUrl}" class="pass-logo" alt="Logo">` : '<div class="pass-logo" style="display:flex;align-items:center;justify-content:center;font-weight:bold;font-size:16px;">H</div>'}
            <div style="font-weight: 800; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px; color: ${textColor}">${orgData?.name || 'Estabelecimento'}</div>
          </div>
          <div class="pass-body">
            ${detailsHtml}
          </div>
          <div class="pass-footer">
            <div class="barcode">*${barcodeValue.substring(0, 10)}*</div>
            <div class="barcode-text">${barcodeValue}</div>
          </div>
        </div>
        <a href="javascript:window.close();" class="btn-back">Fechar Visualizador</a>
      </body>
      </html>
    `;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(200).send(htmlContent);

  } catch (e: any) {
    console.error('[PortalGetWalletPass] Erro ao gerar passe digital:', e);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(500).send(`<h1>Erro Interno</h1><p>${e.message}</p>`);
  }
}

// ============================================================
// CHECKOUT TRANSPARENTE — AUXILIARES & ENDPOINTS
// ============================================================

async function validateCheckoutAccess(req: VercelRequest) {
  const orgId = req.method === 'POST' ? req.body.orgId : req.query.orgId;
  const clientId = req.method === 'POST' ? req.body.clientId : req.query.clientId;
  const paymentId = req.method === 'POST' ? req.body.paymentId : req.query.paymentId;
  const token = req.method === 'POST' ? req.body.token : req.query.token;

  if (!orgId || !clientId || !paymentId || !token) {
    throw new AsaasApiError(400, 'Missing security parameters', 'Parâmetros de segurança ausentes');
  }

  // 1. Fetch client from Firestore
  const clientDoc = await db
    .collection('organizations')
    .doc(String(orgId))
    .collection('clients')
    .doc(String(clientId))
    .get();

  if (!clientDoc.exists) {
    throw new AsaasApiError(404, 'Client not found in CRM', 'Cliente não cadastrado');
  }

  const clientData = clientDoc.data();
  
  // 2. Validate token
  if (!clientData?.publicToken || clientData.publicToken !== token) {
    throw new AsaasApiError(403, 'Invalid publicToken', 'Acesso não autorizado ou link expirado');
  }

  // 3. Fetch payment details from Asaas
  let payment;
  if (paymentId === 'latest') {
    if (!clientData.asaasCustomerId) {
      throw new AsaasApiError(404, 'No Asaas customer ID', 'Cliente sem configuração financeira no Asaas');
    }
    
    // Buscar faturas pendentes
    const pendingList = await asaasRequest(`/payments?customer=${clientData.asaasCustomerId}&status=PENDING&limit=1`, 'GET');
    if (pendingList.data && pendingList.data.length > 0) {
      payment = pendingList.data[0];
    } else {
      // Buscar faturas vencidas
      const overdueList = await asaasRequest(`/payments?customer=${clientData.asaasCustomerId}&status=OVERDUE&limit=1`, 'GET');
      if (overdueList.data && overdueList.data.length > 0) {
        payment = overdueList.data[0];
      }
    }

    if (!payment) {
      // Se não houver pendente/vencida, tenta achar a última recebida/confirmada para mostrar como paga
      const fallbackList = await asaasRequest(`/payments?customer=${clientData.asaasCustomerId}&limit=1`, 'GET');
      if (fallbackList.data && fallbackList.data.length > 0) {
        payment = fallbackList.data[0];
      }
    }
  } else if (String(paymentId).startsWith('sub_')) {
    const subPayments = await asaasRequest(`/subscriptions/${paymentId}/payments`, 'GET');
    if (subPayments.data && subPayments.data.length > 0) {
      payment = subPayments.data.find((p: any) => p.status === 'PENDING' || p.status === 'OVERDUE') || subPayments.data[0];
    }
  } else {
    payment = await asaasRequest(`/payments/${paymentId}`, 'GET');
  }

  if (!payment) {
    throw new AsaasApiError(404, 'Payment not found in Asaas', 'Fatura não encontrada');
  }

  // 4. Validate ownership
  if (payment.customer !== clientData.asaasCustomerId) {
    throw new AsaasApiError(403, 'Payment does not belong to this customer', 'Acesso não autorizado para esta fatura');
  }

  return { clientData, payment };
}

async function handleCheckoutInfo(req: VercelRequest, res: VercelResponse) {
  try {
    const { payment, clientData } = await validateCheckoutAccess(req);

    const clientBillingType = clientData.billingType || 'UNDEFINED';
    let allowedMethods = ['PIX', 'CREDIT_CARD', 'BOLETO'];
    
    if (clientBillingType === 'PIX') {
      allowedMethods = ['PIX'];
    } else if (clientBillingType === 'CREDIT_CARD') {
      allowedMethods = ['CREDIT_CARD'];
    } else if (clientBillingType === 'BOLETO') {
      allowedMethods = ['BOLETO'];
    }

    return res.status(200).json({
      paymentId: payment.id,
      value: payment.value,
      dueDate: payment.dueDate,
      description: payment.description || 'Fatura Hub Central',
      billingType: payment.billingType,
      clientName: clientData.name,
      status: payment.status,
      allowedMethods
    });
  } catch (error: any) {
    return safeErrorResponse(res, error, 'Erro ao carregar dados do checkout');
  }
}

async function handleCheckoutPay(req: VercelRequest, res: VercelResponse) {
  try {
    const { payment } = await validateCheckoutAccess(req);

    if (payment.status === 'RECEIVED' || payment.status === 'CONFIRMED') {
      return res.status(400).json({ error: 'Esta fatura já está paga.' });
    }

    const { creditCard, creditCardHolderInfo } = req.body;
    if (!creditCard || !creditCardHolderInfo) {
      return res.status(400).json({ error: 'Dados do cartão de crédito obrigatórios.' });
    }

    const rawIp = req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || req.socket.remoteAddress || '127.0.0.1';
    const remoteIp = String(rawIp).split(',')[0].trim();

    const response = await asaasRequest(`/payments/${payment.id}/payWithCreditCard`, 'POST', {
      creditCard,
      creditCardHolderInfo,
      remoteIp
    });

    return res.status(200).json({
      success: true,
      status: response.status,
      paymentId: response.id
    });
  } catch (error: any) {
    return safeErrorResponse(res, error, 'Erro ao pagar com cartão de crédito');
  }
}

async function handleCheckoutPix(req: VercelRequest, res: VercelResponse) {
  try {
    const { payment } = await validateCheckoutAccess(req);

    if (payment.status === 'RECEIVED' || payment.status === 'CONFIRMED') {
      return res.status(400).json({ error: 'Esta fatura já está paga.' });
    }

    const pixData = await asaasRequest(`/payments/${payment.id}/pixQrCode`, 'GET');

    return res.status(200).json({
      encodedImage: pixData.encodedImage,
      payload: pixData.payload,
      expirationDate: pixData.expirationDate
    });
  } catch (error: any) {
    return safeErrorResponse(res, error, 'Erro ao obter Pix QR Code');
  }
}

async function handleCheckoutBoleto(req: VercelRequest, res: VercelResponse) {
  try {
    const { payment } = await validateCheckoutAccess(req);

    if (payment.status === 'RECEIVED' || payment.status === 'CONFIRMED') {
      return res.status(400).json({ error: 'Esta fatura já está paga.' });
    }

    const identification = await asaasRequest(`/payments/${payment.id}/identificationField`, 'GET');

    return res.status(200).json({
      identificationField: identification.identificationField,
      nossoNumero: identification.nossoNumero,
      barCode: identification.barCode,
      bankSlipUrl: payment.bankSlipUrl || payment.invoiceUrl || ''
    });
  } catch (error: any) {
    return safeErrorResponse(res, error, 'Erro ao carregar boleto');
  }
}

// ============================================================
// SUPORTE EXTERNO BILATERAL
// ============================================================

async function validateSupportAccess(req: VercelRequest) {
  const orgId = req.method === 'POST' ? req.body.orgId : req.query.orgId;
  const clientId = req.method === 'POST' ? req.body.clientId : req.query.clientId;
  const token = req.method === 'POST' ? req.body.token : req.query.token;

  if (!orgId || !clientId || !token) {
    throw new AsaasApiError(400, 'Missing security parameters', 'Parâmetros de segurança ausentes');
  }

  const clientDoc = await db
    .collection('organizations')
    .doc(String(orgId))
    .collection('clients')
    .doc(String(clientId))
    .get();

  if (!clientDoc.exists) {
    throw new AsaasApiError(404, 'Client not found in CRM', 'Cliente não cadastrado');
  }

  const clientData = clientDoc.data();
  
  if (!clientData?.publicToken || clientData.publicToken !== token) {
    throw new AsaasApiError(403, 'Invalid publicToken', 'Acesso não autorizado ou link expirado');
  }

  return { clientData };
}

async function handleSupportCreate(req: VercelRequest, res: VercelResponse) {
  try {
    const { clientData } = await validateSupportAccess(req);
    const { orgId, clientId, category, priority, subject, message } = req.body;

    if (!category || !priority || !subject || !message) {
      return res.status(400).json({ error: 'Parâmetros ausentes: category, priority, subject e message são obrigatórios.' });
    }

    const docRef = await db
      .collection('organizations')
      .doc(String(orgId))
      .collection('supportRequests')
      .add({
        clientId,
        clientName: clientData.name || '',
        category,
        priority,
        message: `${subject}: ${message}`,
        status: 'aberto',
        origin: 'external_saas',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });

    return res.status(200).json({ success: true, requestId: docRef.id });
  } catch (e: any) {
    console.error('[PortalSupportCreate] Erro ao criar chamado externo:', e);
    return res.status(e.statusCode || 500).json({ error: e.message || 'Erro interno ao processar o chamado' });
  }
}

async function handleSupportReply(req: VercelRequest, res: VercelResponse) {
  try {
    await validateSupportAccess(req);
    const { orgId, requestId, message } = req.body;

    if (!requestId || !message) {
      return res.status(400).json({ error: 'Parâmetros ausentes: requestId e message são obrigatórios.' });
    }

    await db
      .collection('organizations')
      .doc(String(orgId))
      .collection('supportRequests')
      .doc(String(requestId))
      .update({
        message,
        status: 'aberto',
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });

    return res.status(200).json({ success: true });
  } catch (e: any) {
    console.error('[PortalSupportReply] Erro ao enviar réplica:', e);
    return res.status(e.statusCode || 500).json({ error: e.message || 'Erro interno ao atualizar o chamado' });
  }
}

async function handleSupportList(req: VercelRequest, res: VercelResponse) {
  try {
    await validateSupportAccess(req);
    const { orgId, clientId } = req.query;

    const snapshot = await db
      .collection('organizations')
      .doc(String(orgId))
      .collection('supportRequests')
      .where('clientId', '==', String(clientId))
      .orderBy('createdAt', 'desc')
      .get();

    const requests = snapshot.docs.map(doc => {
      const data = doc.data();
      
      const createdAt = data.createdAt ? (data.createdAt.toDate ? data.createdAt.toDate().toISOString() : data.createdAt) : null;
      const repliedAt = data.repliedAt ? (data.repliedAt.toDate ? data.repliedAt.toDate().toISOString() : data.repliedAt) : null;
      const updatedAt = data.updatedAt ? (data.updatedAt.toDate ? data.updatedAt.toDate().toISOString() : data.updatedAt) : null;

      return {
        id: doc.id,
        ...data,
        createdAt,
        repliedAt,
        updatedAt
      };
    });

    return res.status(200).json({ success: true, requests });
  } catch (e: any) {
    console.error('[PortalSupportList] Erro ao listar chamados externos:', e);
    return res.status(e.statusCode || 500).json({ error: e.message || 'Erro interno ao listar os chamados' });
  }
}
