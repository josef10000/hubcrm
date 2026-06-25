import { db, admin } from '../../../_utils/firebase.js';
import { sendFaturaEmitidaEmail, sendBoasVindasSubscriptionEmail } from '../../../../src/services/emailService.js';
import { logEmailHistory } from '../../../_utils/emailLogger.js';

export async function handlePaymentCreated(doc: any, clientData: any, paymentData: any) {
  const pValue = paymentData.value || 0;
  const pLink = paymentData.invoiceUrl || paymentData.bankSlipUrl || '';
  const pDueDate = paymentData.dueDate ? paymentData.dueDate.split('-').reverse().join('/') : '';
  const pDesc = paymentData.description || 'Fatura Hub Symples';

  // --- LÓGICA DE BOAS-VINDAS UNIFICADO (No Primeiro Pagamento) ---
  let skipInvoiceEmail = false;
  const wasWelcomeSent = await db.runTransaction(async (t) => {
    const freshSnap = await t.get(doc.ref as any);
    const freshData = (freshSnap as any).data();
    if (freshData && !freshData.welcomeEmailSent) {
      t.update(doc.ref, { welcomeEmailSent: true });
      return true;
    }
    return false;
  });

  if (wasWelcomeSent) {
    skipInvoiceEmail = true;
    await sendBoasVindasSubscriptionEmail(clientData.email, clientData.name || 'Cliente', pValue, pDueDate, pLink)
      .then(() => {
        const orgId = doc.ref.parent.parent?.id;
        if (orgId) logEmailHistory(orgId, doc.id, {
          type: 'WELCOME_SUBSCRIPTION',
          status: 'sent',
          sentAt: Date.now(),
          recipient: clientData.email,
          subject: 'Bem-vindo ao Hub Central - Seu plano está pronto!'
        });
      })
      .catch(err => console.error('Erro Boas-vindas:', err));
  }

  // --- ATUALIZAÇÃO DO DOCUMENTO DO CLIENTE ---
  try {
    const updates: any = {
      invoiceUrl: pLink,
      currentPaymentId: paymentData.id,
      paymentStatus: 'PENDING',
      updatedAt: Date.now()
    };

    // Sincronizar data de vencimento se disponível
    if (paymentData.dueDate) {
      updates.nextDueDate = paymentData.dueDate;
    }

    await doc.ref.update(updates);
    console.log(`[ASAAS] Cliente ${doc.id} atualizado com nova fatura: ${pLink}`);
  } catch (updErr) {
    console.error('[ASAAS] Erro ao atualizar invoiceUrl no cliente:', updErr);
  }

  if (skipInvoiceEmail) return;

  // --- ENVIO DE FATURA PADRÃO ---
  let subject = 'Sua Fatura - Hub Central';
  const lowerDesc = pDesc.toLowerCase();
  if (lowerDesc.includes('adesão') || lowerDesc.includes('setup')) subject = 'Sua Fatura de Adesão - Hub Central';
  
  await sendFaturaEmitidaEmail(clientData.email, clientData.name || 'Cliente', pValue, pDueDate, pLink, pDesc, subject)
    .then(() => {
      const orgId = doc.ref.parent.parent?.id;
      if (orgId) logEmailHistory(orgId, doc.id, {
        type: 'INVOICE',
        status: 'sent',
        sentAt: Date.now(),
        recipient: clientData.email,
        subject: subject
      });
    })
    .catch(e => console.error('Erro Fatura Emitida:', e));
}
