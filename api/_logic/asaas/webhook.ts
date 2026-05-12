import type { VercelRequest, VercelResponse } from '@vercel/node';
import { db } from '../../_utils/firebase.js';
import { handlePaymentReceived } from './handlers/payment_received.js';
import { handlePaymentOverdue } from './handlers/payment_overdue.js';
import { handlePaymentCreated } from './handlers/payment_created.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  try {
    const webhookToken = process.env.ASAAS_WEBHOOK_TOKEN;
    if (!webhookToken) {
      console.error('CRITICAL: ASAAS_WEBHOOK_TOKEN not configured');
      return res.status(500).json({ error: 'Webhook not configured' });
    }

    const receivedToken = String(req.headers['asaas-access-token'] || '').replace(/["']/g, '').trim();
    const expectedToken = String(webhookToken || '').replace(/["']/g, '').trim();

    if (receivedToken !== expectedToken) {
      console.error(`[ASAAS] Token Mismatch!`);
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const { event, payment, subscription, id: eventID } = body;
    
    console.log(`[ASAAS WEBHOOK] Evento: ${event} | EventID: ${eventID}`);

    // --- IDEMPOTÊNCIA ---
    if (eventID) {
      const eventRef = db.collection('webhookEvents').doc(eventID);
      const wasProcessed = await db.runTransaction(async (t) => {
        const snap = await t.get(eventRef);
        if (snap.exists) return true;
        t.set(eventRef, { processedAt: new Date().toISOString(), event });
        return false;
      });
      if (wasProcessed) return res.status(200).json({ received: true, duplicate: true });
    }

    const paymentData = payment || body.payment;
    const asaasCustomerId = paymentData?.customer || subscription?.customer || body.customer?.id || body.customer;

    if (!asaasCustomerId) return res.status(200).json({ received: true, info: 'No customer context' });

    // --- BUSCA CLIENTE ---
    const snapshot = await db.collectionGroup('clients').where('asaasCustomerId', '==', asaasCustomerId).limit(1).get();
    if (snapshot.empty) {
      console.warn(`[ASAAS] Cliente não encontrado para AsaasID: ${asaasCustomerId}`);
      return res.status(200).json({ received: true });
    }

    const doc = snapshot.docs[0];
    const clientData = doc.data();

    // --- DISPATCHER DE EVENTOS ---
    switch (event) {
      case 'PAYMENT_CREATED':
        await handlePaymentCreated(doc, clientData, paymentData);
        break;
      
      case 'PAYMENT_RECEIVED':
      case 'PAYMENT_CONFIRMED':
        await handlePaymentReceived(doc, clientData, paymentData, event);
        break;

      case 'PAYMENT_OVERDUE':
        await handlePaymentOverdue(doc, clientData, paymentData);
        break;

      case 'SUBSCRIPTION_DELETED':
        await doc.ref.update({ status: 'Cancelado' });
        break;

      default:
        console.log(`[ASAAS] Evento não tratado explicitamente: ${event}`);
    }

    return res.status(200).json({ received: true });

  } catch (error: any) {
    console.error('CRITICAL Webhook Error:', error);
    return res.status(500).json({ error: 'Internal error' });
  }
}
