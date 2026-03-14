import type { VercelRequest, VercelResponse } from '@vercel/node';
import { db } from '../_utils/firebase.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    // Ensure body is parsed
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const { event, payment, subscription } = body;
    
    console.log("Asaas Webhook Received:", event, payment?.id || subscription?.id);
    
    if (event && event.startsWith('PAYMENT_')) {
      const paymentData = payment || body.payment;
      if (!paymentData || !paymentData.customer) {
        return res.status(200).json({ received: true, ignored: true, reason: 'No payment or customer data' });
      }

      const clientsRef = db.collectionGroup('clients');
      const snapshot = await clientsRef.where('asaasCustomerId', '==', paymentData.customer).get();

      if (snapshot.empty) {
        console.log('Client not found for Asaas customer:', paymentData.customer);
        return res.status(200).json({ received: true, notFound: true });
      }

      const updates: any = {};
      if (event === 'PAYMENT_RECEIVED' || event === 'PAYMENT_CONFIRMED') {
        updates.paymentStatus = 'Pago';
      } else if (event === 'PAYMENT_OVERDUE') {
        updates.paymentStatus = 'Atrasado';
      } else if (event === 'PAYMENT_DELETED' || event === 'PAYMENT_REFUNDED') {
        updates.paymentStatus = 'Pendente';
      }

      if (Object.keys(updates).length > 0) {
        const batch = db.batch();
        snapshot.docs.forEach(doc => {
          batch.update(doc.ref, updates);
        });
        await batch.commit();
        console.log(`Updated ${snapshot.size} clients with status ${updates.paymentStatus}`);
      }
    } else if (event && event.startsWith('SUBSCRIPTION_')) {
      const subData = subscription || body.subscription;
      if (!subData || !subData.customer) {
        return res.status(200).json({ received: true, ignored: true, reason: 'No subscription or customer data' });
      }

      const clientsRef = db.collectionGroup('clients');
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
        updates.paymentStatus = 'Cancelado';
      } else if (event === 'SUBSCRIPTION_INACTIVATED' || status === 'INACTIVE') {
        updates.status = 'Inativo';
        updates.paymentStatus = 'Pendente';
      } else if (event === 'SUBSCRIPTION_CREATED' || event === 'SUBSCRIPTION_UPDATED') {
        // Only update if it's active
        if (status === 'ACTIVE') {
          updates.paymentStatus = 'Ativo';
        }
      }

      if (Object.keys(updates).length > 0) {
        const batch = db.batch();
        snapshot.docs.forEach(doc => {
          batch.update(doc.ref, updates);
        });
        await batch.commit();
        console.log(`Updated ${snapshot.size} clients with subscription updates`);
      }
    }

    return res.status(200).json({ received: true });
  } catch (error: any) {
    console.error('Webhook Error:', error);
    return res.status(200).json({ received: true, error: error.message });
  }
}
