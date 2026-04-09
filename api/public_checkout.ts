import type { VercelRequest, VercelResponse } from '@vercel/node';
import { db } from './_utils/firebase.js';
import { asaasRequest, safeErrorResponse } from './_utils/asaas.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { userId, clientData, briefingAnswers } = req.body;

    if (!userId) return res.status(400).json({ error: 'ID do usuário é obrigatório' });
    if (!clientData || !clientData.email || !clientData.offerId) {
      return res.status(400).json({ error: 'Dados do cliente incompletos' });
    }

    // 1. Fetch Offer from Firestore
    const offerDoc = await db.collection('users').doc(userId).collection('offers').doc(clientData.offerId).get();
    
    if (!offerDoc.exists) {
      return res.status(404).json({ error: 'Oferta não encontrada ou inativa' });
    }
    
    const offer = offerDoc.data();
    if (!offer.active) {
      return res.status(400).json({ error: 'Esta oferta não está mais disponível' });
    }

    // 2. Create/Find Customer in Asaas
    let asaasCustomer;
    const cleanCpfCnpj = clientData.cpfCnpj ? clientData.cpfCnpj.replace(/\D/g, '') : '';
    
    if (cleanCpfCnpj && (cleanCpfCnpj.length === 11 || cleanCpfCnpj.length === 14)) {
      const existing = await asaasRequest(`/customers?cpfCnpj=${cleanCpfCnpj}`, "GET");
      if (existing.data && existing.data.length > 0) {
        asaasCustomer = existing.data[0];
      }
    }

    if (!asaasCustomer) {
      asaasCustomer = await asaasRequest("/customers", "POST", {
        name: clientData.name,
        email: clientData.email,
        mobilePhone: clientData.whatsapp ? clientData.whatsapp.replace(/\D/g, '') : undefined,
        cpfCnpj: cleanCpfCnpj || undefined,
        observations: `Lead vindo do Checkout Público. CRM User: ${userId}`
      });
    }

    // 3. Calculate Final Price
    // Applying 15% discount for yearly billing on subscriptions
    let value = offer.price;
    let cycle = 'MONTHLY';
    
    if (offer.type === 'SUBSCRIPTION' && clientData.billingCycle === 'YEARLY') {
      value = offer.price * 12 * 0.85; 
      cycle = 'YEARLY';
    }

    // 4. Create Charge in Asaas
    let checkoutUrl = '';
    
    if (offer.type === 'SUBSCRIPTION') {
      const subscription = await asaasRequest("/subscriptions", "POST", {
        customer: asaasCustomer.id,
        billingType: "UNDEFINED", // Let client choose (Boleto, Cartão, PIX)
        value: value,
        nextDueDate: new Date(Date.now() + 86400000).toISOString().split('T')[0], // Tomorrow
        cycle: cycle,
        description: `Assinatura: ${offer.name}`,
        observations: `Referência: ${offer.id}`
      });

      // Fetch the first installment/payment
      const payments = await asaasRequest(`/subscriptions/${subscription.id}/payments`, "GET");
      if (payments.data && payments.data.length > 0) {
        checkoutUrl = payments.data[0].invoiceUrl;
      } else {
        // Fallback or handle case where invoice is not generated yet
        checkoutUrl = subscription.paymentLink || '';
      }
    } else {
      // Single Payment
      const total = offer.price + (offer.setupPrice || 0);
      const payment = await asaasRequest("/payments", "POST", {
        customer: asaasCustomer.id,
        billingType: "UNDEFINED",
        value: total,
        dueDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
        description: `Compra: ${offer.name}`,
        observations: `Checkout Público`
      });
      checkoutUrl = payment.invoiceUrl;
    }

    // 5. Register Lead in CRM
    const clientRef = db.collection('users').doc(userId).collection('clients').doc();
    await clientRef.set({
      name: clientData.name,
      email: clientData.email,
      whatsapp: clientData.whatsapp,
      asaasId: asaasCustomer.id,
      status: 'Pendente',
      plan: offer.name,
      offerId: clientData.offerId,
      onboardingAnswers: briefingAnswers,
      onboardingCompleted: true,
      createdAt: Date.now(),
      lastUpdate: Date.now(),
      convertedVia: 'Public Checkout'
    });

    return res.status(200).json({ checkoutUrl });

  } catch (error: any) {
    console.error('[PublicCheckout] Error:', error);
    return safeErrorResponse(res, error, 'Ocorreu um erro ao processar seu cadastro. Tente novamente.');
  }
}
