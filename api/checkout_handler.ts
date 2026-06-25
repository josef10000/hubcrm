import type { VercelRequest, VercelResponse } from '@vercel/node';
import { db } from './_utils/firebase.js';
import { asaasRequest, safeErrorResponse, AsaasApiError } from './_utils/asaas.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS configuration for checkout
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { action } = req.query;

  try {
    switch (action) {
      case 'info':
        return await handleInfo(req, res);
      case 'pay':
        return await handlePay(req, res);
      case 'pix':
        return await handlePix(req, res);
      case 'boleto':
        return await handleBoleto(req, res);
      default:
        return res.status(400).json({ error: 'Ação inválida' });
    }
  } catch (error: any) {
    console.error(`[CheckoutHandler] Action ${action} failed:`, error);
    return safeErrorResponse(res, error, 'Erro ao processar checkout');
  }
}

/**
 * Validates if the client public token matches and if the payment belongs to the client.
 * Returns the client data and payment data from Asaas.
 */
async function validateAccess(req: VercelRequest) {
  const orgId = req.method === 'POST' ? req.body.orgId : req.query.orgId;
  const clientId = req.method === 'POST' ? req.body.clientId : req.query.clientId;
  const paymentId = req.method === 'POST' ? req.body.paymentId : req.query.paymentId;
  const token = req.method === 'POST' ? req.body.token : req.query.token;

  if (!orgId || !clientId || !paymentId || !token) {
    throw new AsaasApiError(400, 'Missing security parameters', 'Parâmetros de segurança ausentes');
  }

  // 1. Fetch client from Firestore
  const clientDoc = await db
    .collection('organizations')
    .doc(String(orgId))
    .collection('clients')
    .doc(String(clientId))
    .get();

  if (!clientDoc.exists) {
    throw new AsaasApiError(404, 'Client not found in CRM', 'Cliente não cadastrado');
  }

  const clientData = clientDoc.data();
  
  // 2. Validate token
  if (!clientData?.publicToken || clientData.publicToken !== token) {
    throw new AsaasApiError(403, 'Invalid publicToken', 'Acesso não autorizado ou link expirado');
  }

  // 3. Fetch payment details from Asaas
  let payment;
  if (paymentId === 'latest') {
    if (!clientData.asaasCustomerId) {
      throw new AsaasApiError(404, 'No Asaas customer ID', 'Cliente sem configuração financeira no Asaas');
    }
    
    // Buscar faturas pendentes
    const pendingList = await asaasRequest(`/payments?customer=${clientData.asaasCustomerId}&status=PENDING&limit=1`, 'GET');
    if (pendingList.data && pendingList.data.length > 0) {
      payment = pendingList.data[0];
    } else {
      // Buscar faturas vencidas
      const overdueList = await asaasRequest(`/payments?customer=${clientData.asaasCustomerId}&status=OVERDUE&limit=1`, 'GET');
      if (overdueList.data && overdueList.data.length > 0) {
        payment = overdueList.data[0];
      }
    }

    if (!payment) {
      // Se não houver pendente/vencida, tenta achar a última recebida/confirmada para mostrar como paga
      const fallbackList = await asaasRequest(`/payments?customer=${clientData.asaasCustomerId}&limit=1`, 'GET');
      if (fallbackList.data && fallbackList.data.length > 0) {
        payment = fallbackList.data[0];
      }
    }
  } else if (String(paymentId).startsWith('sub_')) {
    const subPayments = await asaasRequest(`/subscriptions/${paymentId}/payments`, 'GET');
    if (subPayments.data && subPayments.data.length > 0) {
      // Priorizar faturas PENDING ou OVERDUE, se não houver pega a mais recente
      payment = subPayments.data.find((p: any) => p.status === 'PENDING' || p.status === 'OVERDUE') || subPayments.data[0];
    }
  } else {
    payment = await asaasRequest(`/payments/${paymentId}`, 'GET');
  }

  if (!payment) {
    throw new AsaasApiError(404, 'Payment not found in Asaas', 'Fatura não encontrada');
  }

  // 4. Validate ownership
  if (payment.customer !== clientData.asaasCustomerId) {
    throw new AsaasApiError(403, 'Payment does not belong to this customer', 'Acesso não autorizado para esta fatura');
  }

  return { clientData, payment };
}

/**
 * GET /api/checkout/info
 * Returns invoice information safe for public rendering.
 */
async function handleInfo(req: VercelRequest, res: VercelResponse) {
  const { payment, clientData } = await validateAccess(req);

  // Derive allowed payment methods based on the client card settings
  // If undefined/null, allow all
  const clientBillingType = clientData.billingType || 'UNDEFINED';
  let allowedMethods = ['PIX', 'CREDIT_CARD', 'BOLETO'];
  
  if (clientBillingType === 'PIX') {
    allowedMethods = ['PIX'];
  } else if (clientBillingType === 'CREDIT_CARD') {
    allowedMethods = ['CREDIT_CARD'];
  } else if (clientBillingType === 'BOLETO') {
    allowedMethods = ['BOLETO'];
  }

  return res.status(200).json({
    paymentId: payment.id,
    value: payment.value,
    dueDate: payment.dueDate,
    description: payment.description || 'Fatura Hub Central',
    billingType: payment.billingType,
    clientName: clientData.name,
    status: payment.status, // PENDING, RECEIVED, CONFIRMED, OVERDUE
    allowedMethods
  });
}

/**
 * POST /api/checkout/pay
 * Executes a payment attempt using credit card details.
 */
async function handlePay(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // Validate ownership first
  const { payment } = await validateAccess(req);

  if (payment.status === 'RECEIVED' || payment.status === 'CONFIRMED') {
    return res.status(400).json({ error: 'Esta fatura já está paga.' });
  }

  const { creditCard, creditCardHolderInfo } = req.body;
  if (!creditCard || !creditCardHolderInfo) {
    return res.status(400).json({ error: 'Dados do cartão de crédito obrigatórios.' });
  }

  // Extract client IP address for anti-fraud
  const rawIp = req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || req.socket.remoteAddress || '127.0.0.1';
  const remoteIp = String(rawIp).split(',')[0].trim();

  // Call Asaas payment confirmation
  const response = await asaasRequest(`/payments/${payment.id}/payWithCreditCard`, 'POST', {
    creditCard,
    creditCardHolderInfo,
    remoteIp
  });

  return res.status(200).json({
    success: true,
    status: response.status,
    paymentId: response.id
  });
}

/**
 * GET /api/checkout/pix
 * Returns Pix QR Code base64 and copy-paste payload.
 */
async function handlePix(req: VercelRequest, res: VercelResponse) {
  const { payment } = await validateAccess(req);

  if (payment.status === 'RECEIVED' || payment.status === 'CONFIRMED') {
    return res.status(400).json({ error: 'Esta fatura já está paga.' });
  }

  // Fetch Pix payload and QR Code
  // The body must be empty, Asaas requires empty payload for GET pixQrCode
  const pixData = await asaasRequest(`/payments/${payment.id}/pixQrCode`, 'GET');

  return res.status(200).json({
    encodedImage: pixData.encodedImage,
    payload: pixData.payload,
    expirationDate: pixData.expirationDate
  });
}

/**
 * GET /api/checkout/boleto
 * Returns bank slip digit line and bank slip PDF URL.
 */
async function handleBoleto(req: VercelRequest, res: VercelResponse) {
  const { payment } = await validateAccess(req);

  if (payment.status === 'RECEIVED' || payment.status === 'CONFIRMED') {
    return res.status(400).json({ error: 'Esta fatura já está paga.' });
  }

  // Fetch Bank Slip details (linh digitável)
  const identification = await asaasRequest(`/payments/${payment.id}/identificationField`, 'GET');

  return res.status(200).json({
    identificationField: identification.identificationField,
    nossoNumero: identification.nossoNumero,
    barCode: identification.barCode,
    bankSlipUrl: payment.bankSlipUrl || payment.invoiceUrl || ''
  });
}
