import type { VercelRequest, VercelResponse } from '@vercel/node';
import { db } from '../_utils/firebase.js';
import { 
  sendPagamentoRecebidoEmail, 
  sendBoasVindasEmail, 
  sendFaturaEmitidaEmail, 
  sendFaturaVencimentoEmail 
} from '../../src/services/emailService.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const webhookToken = process.env.ASAAS_WEBHOOK_TOKEN;
    if (!webhookToken) {
      console.error('CRITICAL: ASAAS_WEBHOOK_TOKEN not configured');
      return res.status(500).json({ error: 'Webhook not configured' });
    }

    const cleanToken = (t: any) => String(t || '').replace(/["']/g, '').trim();
    const receivedToken = cleanToken(req.headers['asaas-access-token']);
    const expectedToken = cleanToken(webhookToken);

    if (receivedToken !== expectedToken) {
      console.error(`Token Mismatch!`);
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const { event, payment, subscription, customer } = body;
    
    console.log(`[ASAAS WEBHOOK] Evento: ${event} | EventID: ${body.id}`);

    const clientsRef = db.collectionGroup('clients');

    // Função auxiliar para buscar cliente com retry e fallback por e-mail
    async function findClient(asaasId: string, asaasEmail?: string, retries = 3) {
      for (let i = 0; i < retries; i++) {
        console.log(`[DEBUG] Buscando cliente AsaasID: ${asaasId} | Email: ${asaasEmail} (Tentativa ${i+1}/${retries})`);
        
        let snapshot = await clientsRef.where('asaasCustomerId', '==', asaasId).get();
        
        if (snapshot.empty && asaasEmail) {
          const variations = [
            asaasEmail.toLowerCase().trim(),
            asaasEmail.trim(),
            asaasEmail 
          ];
          const uniqueVariations = [...new Set(variations)];
          for (const emailVar of uniqueVariations) {
            snapshot = await clientsRef.where('email', '==', emailVar).get();
            if (!snapshot.empty) break; 
          }
        }
        
        if (!snapshot.empty) return snapshot;

        // Se falhou e ainda tem tentativas, aguarda antes de tentar novamente (soluciona o delay do banco vs Asaas)
        if (i < retries - 1) {
          console.log(`[DEBUG] Cliente não encontrado. Aguardando 2.5s antes da próxima tentativa...`);
          await new Promise(resolve => setTimeout(resolve, 2500));
        }
      }
      return { empty: true, docs: [] } as any;
    }

    // --- EVENTO: CUSTOMER_CREATED (Boas-vindas Único) ---
    if (event === 'CUSTOMER_CREATED') {
      const customerData = customer || body.customer;
      if (customerData?.id) {
        const snapshot = await findClient(customerData.id, customerData.email);
        if (snapshot.empty) return res.status(200).json({ received: true });

        for (const doc of snapshot.docs) {
          const clientData = doc.data();
          
          // Transação Atômica para Boas-Vindas
          const wasWelcomeSent = await db.runTransaction(async (t) => {
            const freshSnap = await t.get(doc.ref);
            const freshData = freshSnap.data();
            if (freshData && !freshData.welcomeEmailSent) {
              t.update(doc.ref, { welcomeEmailSent: true, asaasCustomerId: customerData.id });
              return true;
            }
            return false;
          });

          if (wasWelcomeSent) {
            console.log(`[EMAIL] Enviando Boas-vindas para: ${clientData.email}`);
            await sendBoasVindasEmail(clientData.email, clientData.name || 'Cliente')
              .catch(err => console.error('Erro Boas-vindas:', err));
          }
        }
      }
    }

    // --- EVENTOS DE COBRANÇA (PAYMENT) ---
    if (event && event.startsWith('PAYMENT_')) {
      const paymentData = payment || body.payment;
      if (paymentData?.customer) {
        const snapshot = await findClient(paymentData.customer);
        if (snapshot.empty) return res.status(200).json({ received: true });

        const updates: any = {};
        if (event === 'PAYMENT_RECEIVED' || event === 'PAYMENT_CONFIRMED') {
          updates.paymentStatus = 'RECEIVED';
          updates.status = 'Ativo';
        } else if (event === 'PAYMENT_OVERDUE') {
          updates.paymentStatus = 'OVERDUE';
          updates.status = 'Inadimplente';
        }

        for (const doc of snapshot.docs) {
          if (Object.keys(updates).length > 0) await doc.ref.update(updates);
          
          const clientData = doc.data();
          const pValue = paymentData.value || 0;
          const pLink = paymentData.invoiceUrl || paymentData.bankSlipUrl || '';
          const pDueDate = paymentData.dueDate ? paymentData.dueDate.split('-').reverse().join('/') : '';
          const pDesc = paymentData.description || 'Fatura Hub Symples';

          // SAFETY NET: Boas-vindas via PAYMENT_CREATED caso o CUSTOMER_CREATED tenha falhado no timing
          const wasWelcomeSent = await db.runTransaction(async (t) => {
            const freshSnap = await t.get(doc.ref);
            const freshData = freshSnap.data();
            if (freshData && !freshData.welcomeEmailSent) {
              t.update(doc.ref, { welcomeEmailSent: true });
              return true;
            }
            return false;
          });

          if (wasWelcomeSent) {
            console.log(`[EMAIL] Fallback: Enviando Boas-vindas atrasado para: ${clientData.email}`);
            await sendBoasVindasEmail(clientData.email, clientData.name || 'Cliente')
              .catch(err => console.error('Erro Boas-vindas (Fallback):', err));
          }

          // 1. Nova Fatura (Criada ou Link de Pagamento)
          if (event === 'PAYMENT_CREATED') {
            console.log(`[DEBUG] Processando PAYMENT_CREATED para ${clientData.email}. Descrição: ${pDesc}`);
            
            // REGRA ANTI-DUPLICIDADE DE ASSINATURA + SETUP:
            // Se a data de vencimento for maior que 15 dias, não enviamos o e-mail de "Nova Fatura".
            // Isso impede que a mensalidade do mês que vem chegue junto com a adesão de hoje.
            const today = new Date();
            const dueDateObj = paymentData.dueDate ? new Date(paymentData.dueDate + 'T12:00:00Z') : new Date();
            const diffDays = Math.ceil((dueDateObj.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
            
            const lowerDesc = pDesc.toLowerCase();

            if (diffDays > 15 && (paymentData.subscription || lowerDesc.includes('assinatura') || lowerDesc.includes('mensalidade'))) {
               console.log(`[DEBUG] Ignorando e-mail de Fatura (Mensalidade) pois o vencimento é daqui a ${diffDays} dias.`);
            } else {
               let subject = 'Sua Fatura - Hub Symples';
               
               if (lowerDesc.includes('adesão') || lowerDesc.includes('setup') || lowerDesc.includes('ativação')) {
                 subject = 'Sua Fatura de Adesão - Hub Symples';
               } else if (paymentData.subscription || lowerDesc.includes('assinatura') || lowerDesc.includes('mensalidade')) {
                 subject = 'Sua Fatura de Mensalidade - Hub Symples';
               } else if (lowerDesc.includes('único') || lowerDesc.includes('compra')) {
                  subject = 'Sua Fatura de Compra - Hub Symples';
               }

               await sendFaturaEmitidaEmail(clientData.email, clientData.name || 'Cliente', pValue, pDueDate, pLink, pDesc, subject)
                 .catch(e => console.error('Erro Fatura Emitida:', e));
            }
          }

          // 2. Pagamento Confirmado
          if (event === 'PAYMENT_RECEIVED' || event === 'PAYMENT_CONFIRMED') {
            const pDate = (paymentData.paymentDate || new Date().toISOString().split('T')[0]).split('-').reverse().join('/');
            await sendPagamentoRecebidoEmail(clientData.email, clientData.name || 'Cliente', pValue, pDate, pDesc)
              .catch(e => console.error('Erro Pagamento Recebido:', e));
          }
        }
      }
    }

    // --- EVENTOS DE ASSINATURA (SUBSCRIPTION) ---
    if (event && event.startsWith('SUBSCRIPTION_')) {
      const subData = subscription || body.subscription;
      if (subData?.customer) {
        const snapshot = await findClient(subData.customer);
        if (snapshot.empty) return res.status(200).json({ received: true });

        const updates: any = {};
        if (event === 'SUBSCRIPTION_DELETED') updates.status = 'Cancelado';
        
        for (const doc of snapshot.docs) {
          if (Object.keys(updates).length > 0) await doc.ref.update(updates);
        }
      }
    }

    return res.status(200).json({ received: true });

  } catch (error: any) {
    console.error('CRITICAL Webhook Error:', error);
    return res.status(500).json({ error: 'Internal error' });
  }
}
