import type { VercelRequest, VercelResponse } from '@vercel/node';
import { db } from './_utils/firebase.js';
import { asaasRequest, safeErrorResponse } from './_utils/asaas.js';
import { sendFaturaEmitidaEmail } from '../src/services/emailService.js';
import { generatePublicToken } from './_utils/tokens.js';

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
    let pixData: any = null;
    let boletoData: any = null;
    let paymentStatusResult = 'PENDING';
    
    const billingType = req.body.paymentMethod || 'UNDEFINED';

    // Yearly Subscription becomes a Single Payment as requested
    if (offer.type === 'SUBSCRIPTION' && !isYearly) {
      const subscription = await asaasRequest("/subscriptions", "POST", {
        customer: asaasCustomer.id,
        billingType: billingType,
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
        paymentStatusResult = payments.data[0].status || 'PENDING';
      } else {
        checkoutUrl = subscription.paymentLink || '';
      }
    } else {
      // Single Payment OR Yearly One-Time Payment
      const payment = await asaasRequest("/payments", "POST", {
        customer: asaasCustomer.id,
        billingType: billingType,
        value: total,
        dueDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
        description: isYearly ? `Plano Anual: ${offer.name} (12 meses)` : `Compra: ${offer.name}`,
        observations: isYearly ? `Pagamento Único Anual com 15% de desconto. CRM Org: ${orgId}` : `Checkout Público`
      });
      checkoutUrl = payment.invoiceUrl;
      currentPaymentId = payment.id;
      paymentStatusResult = payment.status || 'PENDING';
    }

    // 4.1 Processar PIX se selecionado
    if (billingType === 'PIX' && currentPaymentId) {
      try {
        const pixRes = await asaasRequest(`/payments/${currentPaymentId}/pixQrCode`, "GET");
        if (pixRes && pixRes.encodedImage && pixRes.payload) {
          pixData = {
            encodedImage: pixRes.encodedImage,
            payload: pixRes.payload,
            expirationDate: pixRes.expirationDate
          };
        }
      } catch (pixErr) {
        console.error('[PublicCheckout] Erro ao obter PIX QR Code:', pixErr);
      }
    }

    // 4.2 Processar CARTÃO DE CRÉDITO se dados informados
    if (billingType === 'CREDIT_CARD' && currentPaymentId && req.body.creditCard) {
      try {
        const cardRes = await asaasRequest(`/payments/${currentPaymentId}/payWithCreditCard`, "POST", {
          creditCard: req.body.creditCard,
          creditCardHolderInfo: {
            name: clientData.name,
            email: clientData.email,
            cpfCnpj: cleanCpfCnpj,
            mobilePhone: clientData.whatsapp ? clientData.whatsapp.replace(/\D/g, '') : undefined,
            postalCode: req.body.creditCard.postalCode || '00000000',
            addressNumber: req.body.creditCard.addressNumber || '0'
          }
        });
        if (cardRes && cardRes.status) {
          paymentStatusResult = cardRes.status;
        }
      } catch (cardErr: any) {
        console.error('[PublicCheckout] Erro ao pagar com Cartão:', cardErr);
        return res.status(400).json({ error: `Erro no cartão: ${cardErr.message || 'Dados inválidos'}` });
      }
    }

    // 4.3 Processar BOLETO se selecionado
    if (billingType === 'BOLETO' && currentPaymentId) {
      try {
        const boletoRes = await asaasRequest(`/payments/${currentPaymentId}/identificationField`, "GET");
        if (boletoRes && boletoRes.identificationField) {
          boletoData = {
            identificationField: boletoRes.identificationField,
            barCode: boletoRes.barCode,
            bankSlipUrl: checkoutUrl
          };
        }
      } catch (bolErr) {
        console.error('[PublicCheckout] Erro ao obter linha digitável do boleto:', bolErr);
      }
    }

    // 5. Register Lead in CRM
    const clientRef = db.collection('organizations').doc(orgId).collection('clients').doc();
    const annualNote = isYearly ? "\n[OBS: Plano Anual - Validade: 12 meses (Renovação Manual)]" : "";
    
    const hasPortalAccess = offer.hasPortalAccess !== undefined ? offer.hasPortalAccess : true;

    await clientRef.set({
      id: clientRef.id,
      name: clientData.name,
      email: clientData.email,
      whatsapp: clientData.whatsapp,
      asaasCustomerId: asaasCustomer.id,
      publicToken: generatePublicToken(),
      status: hasPortalAccess ? 'Em Desenvolvimento' : 'Ativo',
      paymentStatus: paymentStatusResult,
      plan: offer.name + (isYearly ? ' (Anual)' : ''),
      offerId: clientData.offerId,
      hasPortalAccess: hasPortalAccess,
      isAvulso: !hasPortalAccess,
      productType: hasPortalAccess ? 'portal_hub' : 'venda_avulsa',
      onboardingAnswers: briefingAnswers || {},
      contracts: req.body.contract?.accepted ? [{
        id: `signed_${Date.now()}`,
        type: 'text',
        content: req.body.contract.content || "",
        status: 'signed',
        createdAt: Date.now(),
        signedAt: Date.now(),
        signatureName: req.body.contract.signatureName
      }] : [],
      notes: (!hasPortalAccess ? "[Venda Avulsa Pontual - Sem Portal]" : "Venda via Pagamento Transparente") + annualNote,
      onboardingCompleted: true,
      createdAt: Date.now(),
      lastUpdate: Date.now(),
      convertedVia: 'Pagamento Transparente',
      billingCycle: clientData.billingCycle || 'MONTHLY',
      invoiceUrl: checkoutUrl,
      currentPaymentId: currentPaymentId || '',
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
      
      if (currentPaymentId) {
        const eventKey = `PAYMENT_CREATED_${currentPaymentId}`;
        await clientRef.update({
          sentEvents: [eventKey],
          welcomeEmailSent: true
        });
      }
    } catch (emailErr) {
      console.error('[PublicCheckout] Email Automation Error:', emailErr);
    }

    return res.status(200).json({ 
      success: true,
      checkoutUrl, 
      paymentId: currentPaymentId, 
      clientId: clientRef.id,
      publicToken: clientRef.id,
      pixData, 
      boletoData,
      paymentStatus: paymentStatusResult
    });

  } catch (error: any) {
    console.error('[PublicCheckout] Error:', error);
    // Retorna a mensagem real do erro para o frontend para facilitar a identificação do problema
    return res.status(500).json({ error: `Erro ao processar: ${error.message || 'Falha interna'}` });
  }
}
