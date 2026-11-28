import { createHash } from 'node:crypto';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { db } from './_utils/firebase.js';
import { AsaasApiError, asaasRequest } from './_utils/asaas.js';
import { sendFaturaEmitidaEmail } from '../src/services/emailService.js';
import { generatePublicToken } from './_utils/tokens.js';

type CardAttempt = {
  fingerprint: string;
  offer: FirebaseFirestore.DocumentData;
  attribution: Record<string, string>;
  createdAt: number;
  clientId: string;
  paymentId?: string;
  subscriptionId?: string;
  checkoutUrl?: string;
  customerId?: string;
  cardRejected?: boolean;
  result?: FirebaseFirestore.DocumentData;
};

const paid = (status: unknown) => ['RECEIVED', 'CONFIRMED', 'PAID'].includes(String(status).toUpperCase());
const uuidV4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const pendingCard = (res: VercelResponse) => res.status(503).json({
  code: 'CARD_REVIEW',
  error: 'Ainda não foi possível confirmar o cartão. Verifique este mesmo pagamento antes de pagar de outra forma.',
});

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

  const isCard = req.body?.paymentMethod === 'CREDIT_CARD';
  try {
    const { orgId, clientData, briefingAnswers, selectedBumpIds } = req.body;

    if (!orgId) return res.status(400).json({ error: 'ID da organização é obrigatório' });
    if (!clientData || !clientData.email || !clientData.offerId) {
      return res.status(400).json({ error: 'Dados do cliente incompletos' });
    }

    const rawAttribution = req.body.attribution && typeof req.body.attribution === 'object' ? req.body.attribution : {};
    const attribution = Object.fromEntries(['utmSource', 'utmMedium', 'utmCampaign', 'utmContent', 'utmTerm', 'fbclid', 'gclid', 'referrer', 'landingPage'].map(key => {
      const value = rawAttribution[key];
      return [key, typeof value === 'string' ? value.trim().slice(0, key === 'referrer' || key === 'landingPage' ? 500 : 180) : ''];
    }));

    if (isCard && [clientData.name, clientData.email, clientData.whatsapp, clientData.cpfCnpj]
      .some(value => typeof value !== 'string' || !value.trim())) {
      return res.status(400).json({ error: 'Preencha todos os dados pessoais obrigatórios.' });
    }

    const { attemptId } = req.body;
    if (isCard && (typeof attemptId !== 'string' || !uuidV4.test(attemptId))) {
      return res.status(400).json({ error: 'Atualize a página antes de pagar com cartão.' });
    }

    const orgRef = db.collection('organizations').doc(orgId);
    // Admin-only document. Never persist card number, expiry date or security code.
    const attemptRef = isCard ? orgRef.collection('cardCheckoutAttempts').doc(attemptId) : null;
    const cleanCpfCnpj = typeof clientData.cpfCnpj === 'string' ? clientData.cpfCnpj.replace(/\D/g, '') : '';
    const fingerprint = isCard ? createHash('sha256').update(JSON.stringify([
      clientData.offerId, String(clientData.email).trim().toLowerCase(),
      cleanCpfCnpj, clientData.billingCycle === 'YEARLY' ? 'YEARLY' : 'MONTHLY',
      Array.isArray(selectedBumpIds) ? [...new Set(selectedBumpIds.filter(id => typeof id === 'string'))].sort() : [],
    ])).digest('hex') : '';
    const offerRef = orgRef.collection('offers').doc(clientData.offerId);
    const clients = orgRef.collection('clients');
    const attempt = attemptRef ? await db.runTransaction(async tx => {
      const existing = (await tx.get(attemptRef)).data() as CardAttempt | undefined;
      if (existing) {
        if (existing.fingerprint !== fingerprint) return { conflict: true } as const;
        if (existing.result) return { result: existing.result } as const;
        const retryCard = existing.cardRejected === true && Boolean(req.body.creditCard);
        if (retryCard) tx.update(attemptRef, { cardRejected: false });
        return { state: existing, owner: false, retryCard } as const;
      }
      // A status-only request with no matching attempt must not start a charge.
      if (!req.body.creditCard) return { missing: true } as const;
      const offer = (await tx.get(offerRef)).data();
      if (!offer) return { notFound: true } as const;
      if (!offer.active) return { inactive: true } as const;
      const state: CardAttempt = {
        fingerprint,
        offer: {
          id: offerRef.id, active: true, name: offer.name || 'Produto digital',
          type: offer.type || 'SINGLE', price: offer.price || 0, setupPrice: offer.setupPrice || 0,
          hasPortalAccess: offer.hasPortalAccess ?? true, orderBumps: offer.orderBumps || [],
        },
        attribution, createdAt: Date.now(), clientId: clients.doc().id,
      };
      tx.create(attemptRef, state);
      return { state, owner: true, retryCard: false } as const;
    }) : null;

    if (attempt && 'conflict' in attempt) {
      return res.status(409).json({
        code: 'CARD_REVIEW',
        error: 'Use os mesmos dados e itens da tentativa original para verificar o pagamento.',
      });
    }
    if (attempt && 'result' in attempt) return res.status(200).json(attempt.result);
    if (attempt && 'missing' in attempt) return res.status(404).json({
      code: 'CARD_NOT_STARTED', error: 'Não encontramos uma tentativa anterior. Confira o cartão antes de enviar.',
    });
    const state = attempt && 'state' in attempt ? attempt.state : undefined;
    const offer = state?.offer ?? (attempt ? undefined : (await offerRef.get()).data());
    if (!offer && !(attempt && 'inactive' in attempt)) {
      return res.status(404).json({ error: 'Oferta não encontrada ou inativa' });
    }
    if (!offer?.active) return res.status(400).json({ error: 'Esta oferta não está mais disponível' });

    let asaasCustomer;
    const resuming = attempt && 'owner' in attempt && !attempt.owner;
    const recoveryReference = attemptRef ? `hubcheckout-${attemptId}` : '';

    // 3. Calculate Final Price com Order Bumps
    let bumpsTotal = 0;
    const selectedBumpNames: string[] = [];

    if (Array.isArray(selectedBumpIds) && selectedBumpIds.length > 0 && Array.isArray(offer.orderBumps)) {
      offer.orderBumps.forEach((b: any) => {
        if (selectedBumpIds.includes(b.id) && b.active !== false) {
          bumpsTotal += (b.price || 0);
          selectedBumpNames.push(b.title || 'Bump Extra');
        }
      });
    }

    const isYearly = clientData.billingCycle === 'YEARLY' && offer.type === 'SUBSCRIPTION';
    let value = (offer.price || 0) + bumpsTotal;
    const cycle = 'MONTHLY';
    
    if (isYearly) {
      value = (offer.price * 12 * 0.85) + bumpsTotal; 
    }

    const setupPrice = offer.setupPrice || 0;
    const total = (offer.type === 'SUBSCRIPTION' && !isYearly) ? value : (value + setupPrice);
    const bumpsDescriptionText = selectedBumpNames.length > 0 ? ` (Bumps inclusos: ${selectedBumpNames.join(', ')})` : '';

    // 4. Create Charge in Asaas
    let checkoutUrl = '';
    let currentPaymentId = '';
    let currentSubscriptionId = '';
    let pixData: any = null;
    let boletoData: any = null;
    let paymentStatusResult = 'PENDING';
    
    const billingType = req.body.paymentMethod || 'UNDEFINED';
    const dueDate = new Date((state?.createdAt ?? Date.now()) + 86400000).toISOString().split('T')[0];

    if (resuming) {
      currentPaymentId = state?.paymentId || '';
      currentSubscriptionId = state?.subscriptionId || '';
      if (currentPaymentId) {
        const payment = await asaasRequest(`/payments/${currentPaymentId}`, 'GET');
        checkoutUrl = payment.invoiceUrl || state?.checkoutUrl || '';
        paymentStatusResult = payment.status || 'PENDING';
        asaasCustomer = { id: state?.customerId || payment.customer };
      } else if (offer.type === 'SUBSCRIPTION' && !isYearly) {
        const subscriptions = currentSubscriptionId ? null : await asaasRequest(
          `/subscriptions?externalReference=${recoveryReference}`, 'GET'
        );
        if (!currentSubscriptionId && subscriptions?.data?.length === 1) {
          currentSubscriptionId = subscriptions.data[0].id;
        }
        if (!currentSubscriptionId) return pendingCard(res);
        const payments = await asaasRequest(`/subscriptions/${currentSubscriptionId}/payments`, 'GET');
        // Without a saved ID, accept only an unambiguous first payment.
        if (payments.data?.length !== 1) return pendingCard(res);
        const payment = payments.data[0];
        currentPaymentId = payment.id;
        checkoutUrl = payment.invoiceUrl || '';
        paymentStatusResult = payment.status || 'PENDING';
        asaasCustomer = { id: state?.customerId || payment.customer };
      } else {
        const payments = await asaasRequest(`/payments?externalReference=${recoveryReference}`, 'GET');
        if (payments.data?.length !== 1) return pendingCard(res);
        const payment = payments.data[0];
        currentPaymentId = payment.id;
        checkoutUrl = payment.invoiceUrl || '';
        paymentStatusResult = payment.status || 'PENDING';
        asaasCustomer = { id: state?.customerId || payment.customer };
      }
    } else {
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

      // Yearly Subscription becomes a Single Payment as requested
      if (offer.type === 'SUBSCRIPTION' && !isYearly) {
        const subscription = await asaasRequest("/subscriptions", "POST", {
          customer: asaasCustomer.id,
          billingType: billingType,
          ...(attemptRef ? { externalReference: recoveryReference } : {}),
          value: value,
          nextDueDate: dueDate,
          cycle: cycle,
          description: `Assinatura: ${offer.name}${bumpsDescriptionText}`,
          observations: `Referência: ${offer.id}`
        });
        currentSubscriptionId = subscription.id || '';
        if (attemptRef && currentSubscriptionId) {
          await attemptRef.update({ subscriptionId: currentSubscriptionId, customerId: asaasCustomer.id });
        }

        const payments = await asaasRequest(`/subscriptions/${subscription.id}/payments`, "GET");
        if (payments.data && payments.data.length > 0) {
          checkoutUrl = payments.data[0].invoiceUrl || '';
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
          ...(attemptRef ? { externalReference: recoveryReference } : {}),
          value: total,
          dueDate,
          description: isYearly ? `Plano Anual: ${offer.name}${bumpsDescriptionText}` : `Compra: ${offer.name}${bumpsDescriptionText}`,
          observations: isYearly ? `Pagamento Único Anual com 15% de desconto. CRM Org: ${orgId}` : `Checkout Público`
        });
        checkoutUrl = payment.invoiceUrl || '';
        currentPaymentId = payment.id;
        paymentStatusResult = payment.status || 'PENDING';
      }
    }

    if (attemptRef && (!currentPaymentId || !asaasCustomer?.id)) return pendingCard(res);
    if (attemptRef && !resuming) {
      await attemptRef.update({
        paymentId: currentPaymentId, subscriptionId: currentSubscriptionId,
        checkoutUrl, customerId: asaasCustomer.id,
      });
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
    if (attemptRef && !paid(paymentStatusResult)) {
      // Rechecking an ambiguous payment is read-only; a definite rejection can
      // allow another explicit submission against this same provider charge.
      if ((resuming && !(attempt && 'retryCard' in attempt && attempt.retryCard))
        || !['PENDING', 'OVERDUE'].includes(paymentStatusResult)) {
        if (state?.cardRejected && !req.body.creditCard) {
          return res.status(422).json({ code: 'CARD_REJECTED', error: 'Cartão recusado. Confira os dados do cartão.' });
        }
        return pendingCard(res);
      }
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
      } catch (cardErr) {
        if (cardErr instanceof AsaasApiError && cardErr.status === 400) {
          const current = await asaasRequest(`/payments/${currentPaymentId}`, 'GET');
          if (paid(current.status)) {
            paymentStatusResult = current.status;
          } else if (['PENDING', 'OVERDUE'].includes(current.status)) {
            await attemptRef.update({ cardRejected: true });
            return res.status(422).json({
              code: 'CARD_REJECTED', error: 'Cartão recusado. Confira os dados e tente novamente.',
            });
          }
        }
        if (!paid(paymentStatusResult)) return pendingCard(res);
      }
      if (!paid(paymentStatusResult)) return pendingCard(res);
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
    const clientRef = state ? clients.doc(state.clientId) : clients.doc();
    const annualNote = isYearly ? "\n[OBS: Plano Anual - Validade: 12 meses (Renovação Manual)]" : "";
    
    const hasPortalAccess = offer.hasPortalAccess !== undefined ? offer.hasPortalAccess : true;
    const isSingleSale = offer.type === 'SINGLE' || !hasPortalAccess;

    const clientRecord = {
      id: clientRef.id,
      name: clientData.name,
      email: clientData.email,
      whatsapp: clientData.whatsapp,
      asaasCustomerId: asaasCustomer.id,
      publicToken: generatePublicToken(),
      status: isSingleSale ? 'Ativo' : 'Em Desenvolvimento',
      paymentStatus: paymentStatusResult,
      plan: offer.name + (isYearly ? ' (Anual)' : ''),
      offerId: clientData.offerId,
      hasPortalAccess: !isSingleSale,
      isAvulso: isSingleSale,
      productType: isSingleSale ? 'venda_avulsa' : 'portal_hub',
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
      notes: (!hasPortalAccess ? "[Venda Avulsa Pontual - Sem Portal]" : "Venda via Pagamento Transparente") + 
             (selectedBumpNames.length > 0 ? `\n[ORDER BUMPS ADQUIRIDOS: ${selectedBumpNames.join(', ')}]` : "") + 
             annualNote,
      onboardingCompleted: true,
      createdAt: Date.now(),
      lastUpdate: Date.now(),
      convertedVia: 'Pagamento Transparente',
      attribution: state?.attribution ?? attribution,
      billingCycle: clientData.billingCycle || 'MONTHLY',
      invoiceUrl: checkoutUrl,
      currentPaymentId: currentPaymentId || '',
      currentSubscriptionId,
      nextDueDate: dueDate
    };

    const orderId = currentPaymentId || clientRef.id;
    const orderRef = orgRef.collection('orders').doc(orderId);
    const orderStatus = paid(paymentStatusResult) ? 'paid' : 'pending';
    const orderRecord = {
      id: orderId,
      paymentId: currentPaymentId || '',
      clientId: clientRef.id,
      clientName: clientData.name,
      clientEmail: clientData.email,
      offerId: offer.id || clientData.offerId,
      productName: offer.name,
      amount: total,
      status: orderStatus,
      fulfillmentStatus: 'needs_review',
      paymentMethod: billingType,
      bumpNames: selectedBumpNames,
      attribution: state?.attribution ?? attribution,
      createdAt: state?.createdAt ?? Date.now(),
      updatedAt: Date.now(),
    };
    const result = {
      success: true,
      checkoutUrl,
      paymentId: currentPaymentId,
      clientId: clientRef.id,
      publicToken: clientRef.id,
      pixData,
      boletoData,
      paymentStatus: paymentStatusResult,
    };

    if (attemptRef) {
      const previous = await db.runTransaction(async tx => {
        const existing = (await tx.get(attemptRef)).data();
        if (existing?.result) return existing.result;
        const existingOrder = (await tx.get(orderRef)).data();
        tx.create(clientRef, clientRecord);
        tx.set(orderRef, {
          ...orderRecord,
          fulfillmentStatus: existingOrder?.fulfillmentStatus ?? orderRecord.fulfillmentStatus,
        }, { merge: true });
        tx.update(attemptRef, { result, completedAt: Date.now() });
        return null;
      });
      if (previous) return res.status(200).json(previous);
    } else {
      await clientRef.set(clientRecord);
      await orderRef.set(orderRecord, { merge: true });
    }

    // 6. Send Email Automation
    try {
      const vencimento = dueDate.split('-').reverse().join('/');
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

    return res.status(200).json(result);
  } catch (error: unknown) {
    if (isCard) {
      // Do not echo processor errors that might include sensitive request details.
      console.error('[PublicCheckout] Não foi possível concluir a tentativa de cartão.');
      return pendingCard(res);
    }
    console.error('[PublicCheckout] Error:', error);
    return res.status(500).json({ error: 'Não foi possível processar o pedido.' });
  }
}
