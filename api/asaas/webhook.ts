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
      console.error('CRITICAL: ASAAS_WEBHOOK_TOKEN environment variable is not configured — rejecting all webhooks');
      return res.status(500).json({ error: 'Webhook not configured — missing ASAAS_WEBHOOK_TOKEN' });
    }
    const cleanToken = (t: any) => String(t || '').replace(/["']/g, '').trim();
    const receivedToken = cleanToken(req.headers['asaas-access-token']);
    const expectedToken = cleanToken(webhookToken);

    if (receivedToken !== expectedToken) {
      const expectedCharFirst = expectedToken[0] || '?';
      const expectedCharLast = expectedToken[expectedToken.length - 1] || '?';
      const receivedCharFirst = receivedToken[0] || '?';
      const receivedCharLast = receivedToken[receivedToken.length - 1] || '?';
      
      console.error(`Token Mismatch! 
        Expected (Vercel): ${expectedCharFirst}...${expectedCharLast} (Length: ${expectedToken.length})
        Received (Asaas): ${receivedCharFirst}...${receivedCharLast} (Length: ${receivedToken.length})`);
        
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Ensure body is parsed
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const { event, payment, subscription, customer } = body;
    
    console.log("Asaas Webhook Received:", event, payment?.id || subscription?.id || customer?.id);
    
    const clientsRef = db.collectionGroup('clients');

    // --- EVENTOS DE CLIENTE (CUSTOMER) ---
    // --- EVENTOS DE CLIENTE (CUSTOMER) ---
    if (event === 'CUSTOMER_CREATED') {
      const customerData = customer || body.customer;
      if (!customerData || !customerData.id) {
        return res.status(200).json({ received: true, ignored: true, reason: 'No customer data' });
      }

      const asaasId = customerData.id;
      const asaasEmail = customerData.email;

      console.log(`Webhook: Processando CUSTOMER_CREATED para ${asaasEmail} (${asaasId})`);

      // 1. Tenta por ID
      let snapshot = await clientsRef.where('asaasCustomerId', '==', asaasId).get();
      
      // 2. Fallback por E-mail (evita race condition do frontend)
      if (snapshot.empty && asaasEmail) {
        console.log(`ID ${asaasId} não encontrado. Tentando fallback por e-mail: ${asaasEmail}`);
        snapshot = await clientsRef.where('email', '==', asaasEmail).get();
      }

      if (snapshot.empty) {
        console.log('Client not found for Asaas customer by ID or Email:', asaasId, asaasEmail);
        return res.status(200).json({ received: true, notFound: true });
      }

      for (const doc of snapshot.docs) {
        const clientData = doc.data();
        const clientEmail = clientData.email;
        const clientName = clientData.name || clientData.razaoSocial || 'Cliente';

        // 3. Verifica se já enviamos para este documento específico
        if (clientEmail && !clientData.welcomeEmailSent) {
          console.log(`Enviando Boas-vindas para ${clientEmail}`);
          await sendBoasVindasEmail(clientEmail, clientName)
            .then(() => {
              // Marca como enviado e já garante o ID do Asaas no banco
              doc.ref.update({ 
                welcomeEmailSent: true,
                asaasCustomerId: asaasId 
              });
            })
            .catch((err) => console.error('Erro ao enviar Boas-vindas:', err));
        } else {
          console.log(`E-mail de boas-vindas já enviado ou flag ativa para ${clientEmail}`);
        }
      }
    }

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
        // REGRA: Só fica Ativo quando o Asaas confirma qualquer pagamento (Adesão ou Mensalidade)
        updates.status = 'Ativo';
        console.log(`Webhook: Identificado pagamento confirmado. Movendo cliente para Ativo.`);
      } else if (event === 'PAYMENT_OVERDUE') {
        updates.paymentStatus = 'OVERDUE';
        updates.status = 'Inadimplente';
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
            // Lógica para definir o assunto baseado na descrição/tipo
            let customSubject = 'Nova Fatura Emitida - Hub Symples';
            const lowerDesc = description.toLowerCase();
            
            if (lowerDesc.includes('adesão') || lowerDesc.includes('setup') || lowerDesc.includes('entrada')) {
              customSubject = 'Sua Fatura de Adesão - Hub Symples';
            } else if (paymentData.subscription) {
              customSubject = 'Sua Fatura de Mensalidade - Hub Symples';
            } else {
              customSubject = 'Sua Fatura - Hub Symples';
            }

            sendFaturaEmitidaEmail(
              clientEmail, 
              clientName, 
              paymentValue, 
              dueDate, 
              paymentLink, 
              description,
              customSubject
            ).catch((err) => console.error('Erro (Fatura Emitida):', err));

            // FALLBACK FINAL: Se por acaso o webhhok de CUSTOMER_CREATED não enviou o Boas-vindas, enviamos agora.
            if (clientEmail && !clientData.welcomeEmailSent) {
              console.log(`Fallback: Enviando Boas-vindas via PAYMENT_CREATED para ${clientEmail}`);
              sendBoasVindasEmail(clientEmail, clientName)
                .then(() => {
                   doc.ref.update({ welcomeEmailSent: true });
                })
                .catch((err) => console.error('Erro (Boas-vindas Fallback):', err));
            }
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
        console.log(`Webhook: Cliente NÃO encontrado para Assinatura do cliente Asaas: ${subData.customer}`);
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
      }
      // A mudança para Ativo foi removida daqui e movida para o evento de pagamento (PAYMENT_RECEIVED)

      const batch = db.batch();
      snapshot.docs.forEach(doc => {
        if (Object.keys(updates).length > 0) {
          batch.update(doc.ref, updates);
        }

        // Removido disparo de boas-vindas daqui pois agora é feito no CUSTOMER_CREATED
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

