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

    // Função auxiliar para buscar cliente com fallback por e-mail
    async function findClient(asaasId: string, asaasEmail?: string) {
      console.log(`[DEBUG] Buscando cliente AsaasID: ${asaasId} | Email: ${asaasEmail}`);
      
      // 1. Tenta por ID
      let snapshot = await clientsRef.where('asaasCustomerId', '==', asaasId).get();
      
      // 2. Fallback por E-mail (Normalizado)
      if (snapshot.empty && asaasEmail) {
        const emailLower = asaasEmail.toLowerCase().trim();
        snapshot = await clientsRef.where('email', '==', emailLower).get();
        if (snapshot.empty) {
          snapshot = await clientsRef.where('email', '==', asaasEmail.trim()).get();
        }
      }
      return snapshot;
    }

    // --- EVENTO: CUSTOMER_CREATED ---
    if (event === 'CUSTOMER_CREATED') {
      const customerData = customer || body.customer;
      if (customerData?.id) {
        const snapshot = await findClient(customerData.id, customerData.email);
        
        if (snapshot.empty) {
          console.warn(`[WF] Cliente não encontrado para CUSTOMER_CREATED: ${customerData.email}`);
          return res.status(200).json({ received: true, notFound: true });
        }

        for (const doc of snapshot.docs) {
          const clientData = doc.data();
          if (!clientData.welcomeEmailSent) {
            console.log(`[EMAIL] Disparando Boas-vindas para: ${clientData.email}`);
            await sendBoasVindasEmail(clientData.email, clientData.name || 'Cliente')
              .then(() => doc.ref.update({ welcomeEmailSent: true, asaasCustomerId: customerData.id }))
              .catch(err => console.error('Erro Boas-vindas:', err));
          }
        }
      }
    }

    // --- EVENTOS: PAYMENT_ (Cobrancas) ---
    if (event && event.startsWith('PAYMENT_')) {
      const paymentData = payment || body.payment;
      if (paymentData?.customer) {
        // Buscamos o cliente (ID ou Email se disponível nos dados do pagamento do Asaas nem sempre vem o email, mas podemos tentar)
        const snapshot = await findClient(paymentData.customer);

        if (snapshot.empty) {
          console.error(`[FALHA] Pagamento ignorado. Cliente ${paymentData.customer} não existe no Firestore.`);
          return res.status(200).json({ received: true, notFound: true });
        }

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

          // Envio de E-mails de Pagamento
          if (event === 'PAYMENT_CREATED') {
            // Se ainda não recebeu Boas-vindas, envia agora (fallback)
            if (!clientData.welcomeEmailSent) {
               console.log(`[EMAIL] Boas-vindas atrasado via PAYMENT_CREATED para ${clientData.email}`);
               await sendBoasVindasEmail(clientData.email, clientData.name || 'Cliente')
                .then(() => doc.ref.update({ welcomeEmailSent: true }))
                .catch(e => console.error(e));
            }

            let subject = pDesc.toLowerCase().includes('adesão') ? 'Sua Fatura de Adesão - Hub Symples' : 'Sua Fatura - Hub Symples';
            await sendFaturaEmitidaEmail(clientData.email, clientData.name || 'Cliente', pValue, pDueDate, pLink, pDesc, subject)
              .catch(e => console.error('Erro Fatura:', e));
          }

          if (event === 'PAYMENT_RECEIVED' || event === 'PAYMENT_CONFIRMED') {
            const pDate = (paymentData.paymentDate || new Date().toISOString().split('T')[0]).split('-').reverse().join('/');
            await sendPagamentoRecebidoEmail(clientData.email, clientData.name || 'Cliente', pValue, pDate, pDesc)
              .catch(e => console.error('Erro Recebido:', e));
          }
        }
      }
    }

    // --- EVENTOS: SUBSCRIPTION_ (Assinaturas) ---
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
