import { db } from '../../../_utils/firebase.js';
import { logActivity } from '../../../_utils/audit.js';

export async function handlePaymentOverdue(doc: any, clientData: any, paymentData: any) {
  const updates: any = {
    paymentStatus: 'OVERDUE',
    status: 'Inadimplente'
  };

  if (clientData.plans && clientData.plans.length > 0) {
    const planId = paymentData.subscription || paymentData.id;
    const planIndex = clientData.plans.findIndex((p: any) => 
      p.id === planId || p.asaasSubscriptionId === planId || p.asaasPaymentId === planId
    );
    if (planIndex !== -1) {
      const updatedPlans = [...clientData.plans];
      updatedPlans[planIndex].status = 'Inadimplente';
      updates.plans = updatedPlans;
    }
  }

  await doc.ref.update(updates);

  // --- DUNNING: TICKET DE SUPORTE AUTOMÁTICO ---
  try {
    const orgId = doc.ref.parent.parent?.id;
    if (orgId) {
      const ticketRef = db.collection('organizations').doc(orgId).collection('supportRequests').doc();
      await ticketRef.set({
        id: ticketRef.id,
        clientId: doc.id,
        clientName: clientData.name || 'Cliente',
        category: 'Financeiro',
        priority: 'alta',
        status: 'aberto',
        origin: 'interno',
        message: `⚠️ COBRANÇA VENCIDA: A fatura de R$ ${paymentData.value} venceu em ${paymentData.dueDate}. Necessário contato urgente: ${clientData.whatsapp}`,
        createdAt: new Date(),
        whatsappContext: clientData.whatsapp
      });
      
      await logActivity({
        orgId,
        userId: 'SYSTEM',
        userName: 'Hub Automator',
        action: 'DUNNING_TICKET_CREATED',
        targetId: ticketRef.id,
        targetType: 'client',
        details: `Ticket de cobrança automática criado para ${clientData.name} (Vencimento)`
      });
    }
  } catch (tErr) {
    console.error('Erro ao criar ticket de dunning:', tErr);
  }
}
