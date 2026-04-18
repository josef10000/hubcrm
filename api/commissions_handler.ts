import { VercelRequest, VercelResponse } from '@vercel/node';
import { db, getFirebaseAdmin } from './_utils/firebase.js';
import { verifyAuth } from './_utils/authMiddleware.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { action } = req.query;

  // 1. Verificar Autenticação
  const uid = await verifyAuth(req, res);
  if (!uid) return;

  try {
    switch (action) {
      case 'generate':
        return await handleGenerate(req, res, uid);
      default:
        return res.status(400).json({ error: 'Ação inválida' });
    }
  } catch (error: any) {
    console.error(`[CommissionsHandler] Erro:`, error);
    return res.status(500).json({ error: error.message });
  }
}

async function handleGenerate(req: VercelRequest, res: VercelResponse, uid: string) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' });
  const { clientId, orgId } = req.body;

  if (!clientId || !orgId) {
    return res.status(400).json({ error: 'Parâmetros ausentes (clientId, orgId)' });
  }

  // 1. Verificar permissões do executor
  const admin = getFirebaseAdmin();
  const editorSnap = await db.collection('profiles').doc(uid).get();
  const editorData = editorSnap.data();
  if (editorData?.orgId !== orgId) {
    return res.status(403).json({ error: 'Acesso negado à organização' });
  }

  const result = await db.runTransaction(async (transaction) => {
    // 2. Buscar Cliente
    const clientRef = db.collection('organizations').doc(orgId).collection('clients').doc(clientId);
    const clientSnap = await transaction.get(clientRef);
    if (!clientSnap.exists) throw new Error('Cliente não encontrado');
    const clientData = clientSnap.data();

    if (clientData?.paymentStatus !== 'RECEIVED') {
      throw new Error('Pagamento não recebido para este cliente');
    }

    if (!clientData.assignedTo || !clientData.offerId) {
      throw new Error('Cliente sem vendedor ou oferta associada');
    }

    // 3. Buscar Oferta
    const offerRef = db.collection('organizations').doc(orgId).collection('offers').doc(clientData.offerId);
    const offerSnap = await transaction.get(offerRef);
    if (!offerSnap.exists) throw new Error('Oferta não encontrada');
    const offerData = offerSnap.data();

    const commissionValue = offerData?.commissionValue;
    if (!commissionValue || commissionValue <= 0) {
      throw new Error('Oferta sem comissão configurada');
    }

    // 4. Verificar se já existe comissão (Uso de ID determinístico para segurança extra)
    // Usamos o ID do cliente como base para evitar duplicidade para o mesmo "venda/ciclo"
    const commissionId = `auto_${clientId}`; 
    const commissionRef = db.collection('organizations').doc(orgId).collection('commissions').doc(commissionId);
    const commSnap = await transaction.get(commissionRef);

    if (commSnap.exists) {
      return { success: true, message: 'Comissão já processada anteriormente', id: commissionId };
    }

    // 5. Buscar nome do Vendedor
    const salespersonSnap = await db.collection('profiles').doc(clientData.assignedTo).get();
    const salespersonName = salespersonSnap.data()?.displayName || 'Vendedor';

    // 6. Criar Comissão
    const commission = {
      id: commissionId,
      clientId,
      clientName: clientData.name,
      userId: clientData.assignedTo,
      userName: salespersonName,
      amount: commissionValue,
      date: Date.now(),
      status: 'PENDING',
      offerName: offerData?.name || 'Oferta',
      paymentId: clientData.asaasSubscriptionId || 'manual'
    };

    transaction.set(commissionRef, commission);
    
    return { success: true, message: 'Comissão gerada com sucesso', id: commissionId };
  });

  return res.status(200).json(result);
}
