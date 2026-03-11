import type { VercelRequest, VercelResponse } from '@vercel/node';
import { db } from '../_utils/firebase.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { event, payment } = req.body;
    console.log("Asaas Webhook Received:", event, payment?.id);
    
    if (!payment || !payment.customer) {
      return res.status(200).json({ received: true, ignored: true });
    }

    // Find the client in Firebase by asaasCustomerId
    const clientsRef = db.collectionGroup('clients');
    const snapshot = await clientsRef.where('asaasCustomerId', '==', payment.customer).get();

    if (snapshot.empty) {
      console.log('Client not found for Asaas customer:', payment.customer);
      return res.status(200).json({ received: true, notFound: true });
    }

    // Update the client's payment status based on the event
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
    
    return res.status(200).json({ received: true });
  } catch (error: any) {
    console.error('Webhook Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
