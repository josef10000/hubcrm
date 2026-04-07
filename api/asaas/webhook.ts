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
    // Validate Asaas Webhook Token (MANDATORY)
    const webhookToken = process.env.ASAAS_WEBHOOK_TOKEN;
    if (!webhookToken) {
      console.error('CRITICAL: ASAAS_WEBHOOK_TOKEN is not configured — rejecting all webhooks');
      return res.status(500).json({ error: 'Webhook not configured' });
    }
    const receivedToken = req.headers['asaas-access-token'];
    if (receivedToken !== webhookToken) {
      console.error('Invalid webhook token received');
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Ensure body is parsed
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const { event, payment, subscription } = body;
    
    console.log("Asaas Webhook Received:", event, payment?.id || subscription?.id);
    
    const clientsRef = db.collectionGroup('clients');

    // --- EVENTOS DE COBRANÇA (PAYMENT) ---
    if (event && event.startsWith('PAYMENT_')) {
      const paymentData = payment || body.payment;
      if (!paymentData || !paymentData.customer) {
        return res.status(200).json({ received: true, ignored: true, reason: 'No payment or customer data' });
      }

      const snapshot = await clientsRef.where('asaasCustomerId', '==', paymentData.customer).get();

      if (snapshot.empty) {
        console.log('Client not found for Asaas customer:', paymentData.customer);
        return res.status(200).json({ received: true, notFound: true });
      }

      const updates: any = {};
      if (event === 'PAYMENT_RECEIVED' || event === 'PAYMENT_CONFIRMED') {
        updates.paymentStatus = 'RECEIVED';
      } else if (event === 'PAYMENT_OVERDUE') {
        updates.paymentStatus = 'OVERDUE';
      } else if (event === 'PAYMENT_DELETED' || event === 'PAYMENT_REFUNDED') {
        updates.paymentStatus = 'PENDING';
      }

      const batch = db.batch();
      snapshot.docs.forEach(doc => {
        if (Object.keys(updates).length > 0) {
          batch.update(doc.ref, updates);
        }
        
        const clientData = doc.data();
        const clientEmail = clientData.email;
        const clientName = clientData.name || clientData.razaoSocial || 'Cliente';
        const paymentValue = paymentData.value || 0;
        const dueDate = paymentData.dueDate ? paymentData.dueDate.split('-').reverse().join('/') : '';
        const paymentLink = paymentData.invoiceUrl || paymentData.bankSlipUrl || '';
        const description = paymentData.description || 'Fatura Hub Symples';

        // 1. Pagamento Confirmado
        if (event === 'PAYMENT_RECEIVED' || event === 'PAYMENT_CONFIRMED') {
          const paymentDateStr = paymentData.paymentDate || new Date().toISOString().split('T')[0];
          const dataFormatoBR = paymentDateStr.split('-').reverse().join('/');
          if (clientEmail) {
            sendPagamentoRecebidoEmail(clientEmail, clientName, paymentValue, dataFormatoBR, description)
              .catch((err) => console.error('Erro (Pagamento Recebido):', err));
          }
        }

        // 2. Nova Fatura Emitida
        if (event === 'PAYMENT_CREATED') {
          if (clientEmail) {
            sendFaturaEmitidaEmail(clientEmail, clientName, paymentValue, dueDate, paymentLink, description)
              .catch((err) => console.error('Erro (Fatura Emitida):', err));
          }
        }

        // 3. Aviso de Vencimento (Falta 1 dia ou configurado no Asaas)
        if (event === 'PAYMENT_DUEDATE_WARNING') {
          if (clientEmail) {
            sendFaturaVencimentoEmail(clientEmail, clientName, paymentValue, dueDate, paymentLink, description)
              .catch((err) => console.error('Erro (Aviso Vencimento):', err));
          }
        }
      });
      
      if (Object.keys(updates).length > 0) {
        await batch.commit();
        console.log(`Updated ${snapshot.size} clients with status ${updates.paymentStatus}`);
      }
    } 
    
    // --- EVENTOS DE ASSINATURA (SUBSCRIPTION) ---
    else if (event && event.startsWith('SUBSCRIPTION_')) {
      const subData = subscription || body.subscription;
      if (!subData || !subData.customer) {
        return res.status(200).json({ received: true, ignored: true, reason: 'No subscription or customer data' });
      }

      const snapshot = await clientsRef.where('asaasCustomerId', '==', subData.customer).get();

      if (snapshot.empty) {
        console.log('Client not found for Asaas customer:', subData.customer);
        return res.status(200).json({ received: true, notFound: true });
      }

      const status = subData.status ?? null;
      const deleted = Boolean(subData.deleted);
      const updates: any = {};

      if (event === 'SUBSCRIPTION_DELETED' || deleted) {
        updates.status = 'Cancelado';
        updates.paymentStatus = 'N/A';
      } else if (event === 'SUBSCRIPTION_INACTIVATED' || status === 'INACTIVE') {
        updates.status = 'Inadimplente';
        updates.paymentStatus = 'OVERDUE';
      } else if (event === 'SUBSCRIPTION_CREATED' || event === 'SUBSCRIPTION_UPDATED') {
        if (status === 'ACTIVE') {
          updates.status = 'Ativo';
        }
      }

      const batch = db.batch();
      snapshot.docs.forEach(doc => {
        if (Object.keys(updates).length > 0) {
          batch.update(doc.ref, updates);
        }

        // 4. Boas-vindas (Quando a assinatura é criada)
        if (event === 'SUBSCRIPTION_CREATED') {
          const clientData = doc.data();
          const clientEmail = clientData.email;
          const clientName = clientData.name || clientData.razaoSocial || 'Cliente';
          if (clientEmail) {
            sendBoasVindasEmail(clientEmail, clientName)
              .catch((err) => console.error('Erro (Boas-vindas):', err));
          }
        }
      });

      if (Object.keys(updates).length > 0) {
        await batch.commit();
        console.log(`Updated ${snapshot.size} clients with subscription updates`);
      }
    }

    return res.status(200).json({ received: true });
  } catch (error: any) {
    console.error('Webhook Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

