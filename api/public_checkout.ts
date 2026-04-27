import type { VercelRequest, VercelResponse } from '@vercel/node';
import { db } from './_utils/firebase.js';
import { asaasRequest, safeErrorResponse } from './_utils/asaas.js';
import { sendFaturaEmitidaEmail } from '../src/services/emailService.js';

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
    const { orgId, clientData, briefingAnswers } = req.body;

    if (!orgId) return res.status(400).json({ error: 'ID da organização é obrigatório' });
    if (!clientData || !clientData.email || !clientData.offerId) {
      return res.status(400).json({ error: 'Dados do cliente incompletos' });
    }

    // 1. Fetch Offer from Firestore
    const offerDoc = await db.collection('organizations').doc(orgId).collection('offers').doc(clientData.offerId).get();
    
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
        observations: `Lead vindo do Checkout Público. CRM Org: ${orgId}`
      });
    }

    // 3. Calculate Final Price
    const isYearly = clientData.billingCycle === 'YEARLY' && offer.type === 'SUBSCRIPTION';
    let value = offer.price;
    let cycle = 'MONTHLY';
    
    if (isYearly) {
      value = offer.price * 12 * 0.85; 
    }

    const setupPrice = offer.setupPrice || 0;
    const total = (offer.type === 'SUBSCRIPTION' && !isYearly) ? value : (value + setupPrice);

    // 4. Create Charge in Asaas
    let checkoutUrl = '';
    let currentPaymentId = '';
    
    // Yearly Subscription becomes a Single Payment as requested
    if (offer.type === 'SUBSCRIPTION' && !isYearly) {
      const subscription = await asaasRequest("/subscriptions", "POST", {
        customer: asaasCustomer.id,
        billingType: "UNDEFINED",
        value: value,
        nextDueDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
        cycle: cycle,
        description: `Assinatura: ${offer.name}`,
        observations: `Referência: ${offer.id}`
      });

      const payments = await asaasRequest(`/subscriptions/${subscription.id}/payments`, "GET");
      if (payments.data && payments.data.length > 0) {
        checkoutUrl = payments.data[0].invoiceUrl;
        currentPaymentId = payments.data[0].id;
      } else {
        checkoutUrl = subscription.paymentLink || '';
      }
    } else {
      // Single Payment OR Yearly One-Time Payment
      const payment = await asaasRequest("/payments", "POST", {
        customer: asaasCustomer.id,
        billingType: "UNDEFINED",
        value: total,
        dueDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
        description: isYearly ? `Plano Anual: ${offer.name} (12 meses)` : `Compra: ${offer.name}`,
        observations: isYearly ? `Pagamento Único Anual com 15% de desconto. CRM Org: ${orgId}` : `Checkout Público`
      });
      checkoutUrl = payment.invoiceUrl;
      currentPaymentId = payment.id;
    }

    // 5. Register Lead in CRM
    const clientRef = db.collection('organizations').doc(orgId).collection('clients').doc();
    const annualNote = isYearly ? "\n[OBS: Plano Anual - Validade: 12 meses (Renovação Manual)]" : "";
    
    await clientRef.set({
      id: clientRef.id,
      name: clientData.name,
      email: clientData.email,
      whatsapp: clientData.whatsapp,
      asaasCustomerId: asaasCustomer.id,
      status: 'Pendente',
      plan: offer.name + (isYearly ? ' (Anual)' : ''),
      offerId: clientData.offerId,
      onboardingAnswers: briefingAnswers,
      contracts: req.body.contract?.accepted ? [{
        id: `signed_${Date.now()}`,
        type: 'text',
        content: req.body.contract.content || "",
        status: 'signed',
        createdAt: Date.now(),
        signedAt: Date.now(),
        signatureName: req.body.contract.signatureName
      }] : [],
      notes: (briefingAnswers ? "Respostas do Briefing registradas." : "") + 
             (req.body.contract?.accepted ? "\n[Contrato assinado digitalmente]" : "") + annualNote,
      onboardingCompleted: true,
      createdAt: Date.now(),
      lastUpdate: Date.now(),
      convertedVia: 'Public Checkout',
      billingCycle: clientData.billingCycle || 'MONTHLY',
      invoiceUrl: checkoutUrl,
      nextDueDate: new Date(Date.now() + 86400000).toISOString().split('T')[0]
    });

    // 6. Send Email Automation
    try {
      const vencimento = new Date(Date.now() + 86400000).toLocaleDateString('pt-BR');
      await sendFaturaEmitidaEmail(
        clientData.email,
        clientData.name,
        total,
        vencimento,
        checkoutUrl,
        `Plano ${offer.name}`,
        `Sua fatura está pronta - ${offer.name}`
      );
      console.log(`[PublicCheckout] Automation: Welcome/Invoice email sent to ${clientData.email}`);
      
      // Marcar evento como enviado para o webhook não duplicar
      if (currentPaymentId) {
        const eventKey = `PAYMENT_CREATED_${currentPaymentId}`;
        await clientRef.update({
          sentEvents: [eventKey],
          welcomeEmailSent: true // Também marcamos boas-vindas como enviado
        });
      }
    } catch (emailErr) {
      console.error('[PublicCheckout] Email Automation Error:', emailErr);
    }

    return res.status(200).json({ checkoutUrl });

  } catch (error: any) {
    console.error('[PublicCheckout] Error:', error);
    // Retorna a mensagem real do erro para o frontend para facilitar a identificação do problema
    return res.status(500).json({ error: `Erro ao processar: ${error.message || 'Falha interna'}` });
  }
}
