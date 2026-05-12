import { db, admin } from '../../../_utils/firebase.js';
import { sendPagamentoRecebidoEmail } from '../../../../src/services/emailService.js';
import { logEmailHistory } from '../../../_utils/emailLogger.js';

export async function handlePaymentReceived(doc: any, clientData: any, paymentData: any, event: string) {
  const updates: any = {
    paymentStatus: 'RECEIVED',
    status: 'Ativo'
  };

  // --- ATUALIZAÇÃO DO ARRAY PLANS ---
  if (clientData.plans && clientData.plans.length > 0) {
    const planId = paymentData.subscription || paymentData.id;
    const planIndex = clientData.plans.findIndex((p: any) => 
      p.id === planId || p.asaasSubscriptionId === planId || p.asaasPaymentId === planId
    );
    
    if (planIndex !== -1) {
      const updatedPlans = [...clientData.plans];
      updatedPlans[planIndex].status = 'Ativo';
      if (paymentData.dueDate) updatedPlans[planIndex].nextDueDate = paymentData.dueDate;
      updates.plans = updatedPlans;
    }
  }

  await doc.ref.update(updates);

  // --- REGISTRO DE TRANSAÇÃO FINANCEIRA ---
  try {
    const orgId = doc.ref.parent.parent?.id;
    if (orgId) {
      const transactionId = `asaas_${paymentData.id}`;
      const amount = paymentData.value || 0;
      const netAmount = paymentData.netValue || amount;
      const gatewayFee = Number((amount - netAmount).toFixed(2));
      const pDesc = paymentData.description || 'Fatura Hub Symples';

      await db.collection('organizations').doc(orgId).collection('transactions').doc(transactionId).set({
        id: transactionId,
        description: pDesc || `Pagamento Asaas - ${clientData.name}`,
        amount,
        netAmount,
        gatewayFee,
        date: Date.now(),
        paymentDate: Date.now(),
        type: 'INCOME',
        status: 'PAID',
        clientId: doc.id,
        paymentId: paymentData.id,
        categoryName: 'Assinatura'
      });
    }
  } catch (finErr) {
    console.error('[FINANCE] Erro ao registrar transação:', finErr);
  }

  // --- ENVIO DE E-MAIL ---
  const pValue = paymentData.value || 0;
  const pDate = (paymentData.paymentDate || new Date().toISOString().split('T')[0]).split('-').reverse().join('/');
  const pDesc = paymentData.description || 'Fatura Hub Symples';

  await sendPagamentoRecebidoEmail(clientData.email, clientData.name || 'Cliente', pValue, pDate, pDesc)
    .then(() => {
      const orgId = doc.ref.parent.parent?.id;
      if (orgId) logEmailHistory(orgId, doc.id, {
        type: 'RECEIPT',
        status: 'sent',
        sentAt: Date.now(),
        recipient: clientData.email,
        subject: 'Pagamento Recebido - Hub Central'
      });
    })
    .catch(e => console.error('Erro e-mail recebimento:', e));
}
