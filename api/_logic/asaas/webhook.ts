import type { VercelRequest, VercelResponse } from '@vercel/node';
import { db } from '../../_utils/firebase.js';
import { 
  sendPagamentoRecebidoEmail, 
  sendBoasVindasSubscriptionEmail, 
  sendFaturaEmitidaEmail, 
  sendFaturaVencimentoEmail 
} from '../../../src/services/emailService.js';
import { logEmailHistory } from '../../_utils/emailLogger.js';

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
    const { event, payment, subscription, customer: customerDataInBody } = body;
    const eventID = body.id;
    
    console.log(`[ASAAS WEBHOOK] Evento: ${event} | EventID: ${eventID}`);

    // --- IDEMPOTÊNCIA GLOBAL EXTERNA ---
    // Evita processar o MESMO webhook (mesmo ID do Asaas) duas vezes.
    if (eventID) {
      const eventRef = db.collection('webhookEvents').doc(eventID);
      const wasProcessed = await db.runTransaction(async (t) => {
        const snap = await t.get(eventRef);
        if (snap.exists) return true;
        t.set(eventRef, { processedAt: new Date().toISOString(), event: event });
        return false;
      });
      if (wasProcessed) {
        console.log(`[DEBUG] Webhook ${eventID} já foi processado anteriormente. Abortando.`);
        return res.status(200).json({ received: true, duplicate: true });
      }
    }

    const clientsRef = db.collectionGroup('clients');

    // Função auxiliar para buscar cliente com retry e fallback por e-mail
    async function findClient(asaasId: string, asaasEmail?: string, retries = 3) {
      // Tenta primeiro pelo externalReference se disponível no payload
      const externalRef = body.customer?.externalReference || body.externalReference;
      
      for (let i = 0; i < retries; i++) {
        console.log(`[DEBUG] Buscando cliente AsaasID: ${asaasId} | Ref: ${externalRef} (Tentativa ${i+1}/${retries})`);
        
        // 1. Prioridade: ID Interno (externalReference)
        if (externalRef) {
          const snapRef = await clientsRef.where('id', '==', externalRef).limit(1).get();
          if (!snapRef.empty) return snapRef;
        }

        // 2. Segunda: asaasCustomerId
        let snapshot = await clientsRef.where('asaasCustomerId', '==', asaasId).limit(1).get();
        
        // 3. Terceira: Email (Fallback) - SEMPRE LIMITANDO A 1 PARA EVITAR SPAM
        if (snapshot.empty && asaasEmail) {
          const variations = [
            asaasEmail.toLowerCase().trim(),
            asaasEmail.trim()
          ];
          const uniqueVariations = [...new Set(variations)];
          for (const emailVar of uniqueVariations) {
            snapshot = await clientsRef.where('email', '==', emailVar).limit(1).get();
            if (!snapshot.empty) break; 
          }
        }
        
        if (!snapshot.empty) return snapshot;

        if (i < retries - 1) {
          console.log(`[DEBUG] Cliente não encontrado. Aguardando 2.5s antes da próxima tentativa...`);
          await new Promise(resolve => setTimeout(resolve, 2500));
        }
      }
      return { empty: true, docs: [] } as any;
    }

    // --- EVENTO: CUSTOMER_CREATED (Boas-vindas Único) ---
    if (event === 'CUSTOMER_CREATED') {
      const customerData = customerDataInBody || body.customer;
      if (customerData?.id) {
        const snapshot = await findClient(customerData.id, customerData.email);
        if (snapshot.empty) return res.status(200).json({ received: true });

        // Processa apenas o primeiro (limit(1) já garante isso, mas forçamos aqui)
        const doc = snapshot.docs[0];
        const clientData = doc.data();
        
        // Transação Atômica para apenas registrar o AsaasID (Boas-Vindas agora é no pagamento)
        await db.runTransaction(async (t) => {
          const freshSnap = await t.get(doc.ref as any);
          const freshData = (freshSnap as any).data();
          if (freshData && !freshData.asaasCustomerId) {
            t.update(doc.ref, { asaasCustomerId: customerData.id });
          }
          return true;
        });
        console.log(`[ASAAS] Cliente vinculado: ${clientData.email}`);
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

        // Apenas o primeiro doc
        const doc = snapshot.docs[0];
        if (Object.keys(updates).length > 0) await doc.ref.update(updates);
        
        const clientData = doc.data();
        const pValue = paymentData.value || 0;
        const pLink = paymentData.invoiceUrl || paymentData.bankSlipUrl || '';
        const pDueDate = paymentData.dueDate ? paymentData.dueDate.split('-').reverse().join('/') : '';
        const pDesc = paymentData.description || 'Fatura Hub Symples';

        // --- LÓGICA DE BOAS-VINDAS UNIFICADO (No Primeiro Pagamento) ---
        let skipInvoiceEmail = false;
        const wasWelcomeSent = await db.runTransaction(async (t) => {
          const freshSnap = await t.get(doc.ref as any);
          const freshData = (freshSnap as any).data();
          if (freshData && !freshData.welcomeEmailSent && (event === 'PAYMENT_CREATED' || event === 'PAYMENT_CONFIRMED')) {
            t.update(doc.ref, { welcomeEmailSent: true });
            return true;
          }
          return false;
        });

        if (wasWelcomeSent) {
          console.log(`[EMAIL] Enviando Boas-vindas Unificado (Template novo) para: ${clientData.email}`);
          skipInvoiceEmail = true;
          await sendBoasVindasSubscriptionEmail(
            clientData.email, 
            clientData.name || 'Cliente',
            pValue,
            pDueDate,
            pLink
          )
            .then(() => {
              const userId = doc.ref.parent.parent?.id;
              if (userId) logEmailHistory(userId, doc.id, {
                type: 'WELCOME_SUBSCRIPTION',
                status: 'sent',
                sentAt: Date.now(),
                recipient: clientData.email,
                subject: 'Bem-vindo ao Hub Symples - Seu plano está pronto!'
              });
            })
            .catch(err => console.error('Erro Boas-vindas Unificado:', err));
          
          // Se já enviamos o boas-vindas unificado, não precisamos enviar a fatura separada abaixo se for o MESMO link
          // mas por segurança e para evitar bugs de timing, deixamos o fluxo de fatura seguir se for um evento novo.
        }

        // 1. Nova Fatura (Criada ou Link de Pagamento)
        if (event === 'PAYMENT_CREATED') {
          console.log(`[DEBUG] Processando PAYMENT_CREATED para ${clientData.email}. Descrição: ${pDesc}`);
          
          const eventKey = `PAYMENT_CREATED_${paymentData.id}`;
          const wasEventHandled = await db.runTransaction(async (t) => {
            const freshSnap = await t.get(doc.ref as any);
            const freshData = (freshSnap as any).data();
            const sentEvents = freshData.sentEvents || [];
            if (!sentEvents.includes(eventKey)) {
              t.update(doc.ref, { sentEvents: [...sentEvents, eventKey] });
              return true;
            }
            return false;
          });

          if (!wasEventHandled) {
            console.log(`[DEBUG] Anti-Spam: Ignorando Fatura Emitida para ${paymentData.id} - E-mail já enviado anteriormente.`);
          } else {
            // REGRA ANTI-DUPLICIDADE DE ASSINATURA + SETUP:
            // Impede disparos simultâneos de setup + mensalidade se vierem juntos.
            const today = new Date();
            const dueDateObj = paymentData.dueDate ? new Date(paymentData.dueDate + 'T12:00:00Z') : new Date();
            const diffDays = Math.ceil((dueDateObj.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
            
            const lowerDesc = pDesc.toLowerCase();

            if (diffDays > 15 && (paymentData.subscription || lowerDesc.includes('assinatura') || lowerDesc.includes('mensalidade'))) {
               console.log(`[DEBUG] Ignorando e-mail de Fatura (Mensalidade) pois o vencimento é daqui a ${diffDays} dias.`);
            } else {
               let subject = 'Sua Fatura - Hub Symples';
               let isSetup = false;
               
               if (lowerDesc.includes('adesão') || lowerDesc.includes('setup') || lowerDesc.includes('ativação')) {
                 subject = 'Sua Fatura de Adesão - Hub Symples';
                 isSetup = true;
               } else if (paymentData.subscription || lowerDesc.includes('assinatura') || lowerDesc.includes('mensalidade')) {
                 subject = 'Sua Fatura de Mensalidade - Hub Symples';
               } else if (lowerDesc.includes('único') || lowerDesc.includes('compra')) {
                  subject = 'Sua Fatura de Compra - Hub Symples';
               }

               // TRAVA DE SEGURANÇA: Só envia e-mail de Fatura de Adesão/Setup se o valor for > 0 
               // E se não tivermos acabado de enviar o e-mail de Boas-vindas unificado.
               if (skipInvoiceEmail) {
                 console.log(`[DEBUG] Ignorando e-mail de Fatura para ${clientData.email} pois o Boas-vindas unificado já foi enviado.`);
               } else if (isSetup && pValue <= 0) {
                 console.log(`[DEBUG] Ignorando e-mail de Adesão para ${clientData.email} pois o valor é R$ ${pValue}.`);
               } else {
                 await sendFaturaEmitidaEmail(clientData.email, clientData.name || 'Cliente', pValue, pDueDate, pLink, pDesc, subject)
                   .then(() => {
                     const userId = doc.ref.parent.parent?.id;
                     if (userId) logEmailHistory(userId, doc.id, {
                       type: 'INVOICE',
                       status: 'sent',
                       sentAt: Date.now(),
                       recipient: clientData.email,
                       subject: subject
                     });
                   })
                   .catch(e => console.error('Erro Fatura Emitida:', e));
               }
            }
          }
        }

        // 2. Pagamento Confirmado
        if (event === 'PAYMENT_RECEIVED' || event === 'PAYMENT_CONFIRMED') {
          const eventKey = `PAYMENT_RECEIVED_${paymentData.id}`;
          const wasEventHandled = await db.runTransaction(async (t) => {
            const freshSnap = await t.get(doc.ref as any);
            const freshData = (freshSnap as any).data();
            const sentEvents = freshData.sentEvents || [];
            if (!sentEvents.includes(eventKey)) {
              t.update(doc.ref, { sentEvents: [...sentEvents, eventKey] });
              return true;
            }
            return false;
          });

          if (!wasEventHandled) {
            console.log(`[DEBUG] Anti-Spam: Ignorando Pagamento Confirmado para ${paymentData.id} - E-mail já enviado anteriormente.`);
          } else {
            const pDate = (paymentData.paymentDate || new Date().toISOString().split('T')[0]).split('-').reverse().join('/');
            
            // --- REGISTRO DE TRANSAÇÃO FINANCEIRA (NOVO) ---
            try {
              const orgId = doc.ref.parent.parent?.id;
              if (orgId) {
                const transactionId = `asaas_${paymentData.id}`;
                const amount = paymentData.value || 0;
                const netAmount = paymentData.netValue || amount;
                const gatewayFee = Number((amount - netAmount).toFixed(2));
                
                await db.collection('organizations').doc(orgId).collection('transactions').doc(transactionId).set({
                  id: transactionId,
                  description: pDesc || `Pagamento Asaas - ${clientData.name}`,
                  amount: amount,
                  netAmount: netAmount,
                  gatewayFee: gatewayFee,
                  date: Date.now(),
                  paymentDate: Date.now(),
                  type: 'INCOME',
                  status: 'PAID',
                  clientId: doc.id,
                  paymentId: paymentData.id,
                  categoryName: 'Assinatura' // Fallback para visualização se categoryId não for mapeado
                });
                console.log(`[FINANCE] Transação registrada para ${clientData.email}: R$ ${amount} (Taxa: R$ ${gatewayFee})`);
              }
            } catch (finErr) {
              console.error('[CRITICAL] Erro ao registrar transação financeira:', finErr);
            }

            await sendPagamentoRecebidoEmail(clientData.email, clientData.name || 'Cliente', pValue, pDate, pDesc)
              .then(() => {
                const userId = doc.ref.parent.parent?.id;
                if (userId) logEmailHistory(userId, doc.id, {
                  type: 'RECEIPT',
                  status: 'sent',
                  sentAt: Date.now(),
                  recipient: clientData.email,
                  subject: 'Pagamento Recebido - Hub central'
                });
              })
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

        const doc = snapshot.docs[0];
        const updates: any = {};
        if (event === 'SUBSCRIPTION_DELETED') updates.status = 'Cancelado';
        
        if (Object.keys(updates).length > 0) await doc.ref.update(updates);
      }
    }

    return res.status(200).json({ received: true });

  } catch (error: any) {
    console.error('CRITICAL Webhook Error:', error);
    return res.status(500).json({ error: 'Internal error' });
  }
}
