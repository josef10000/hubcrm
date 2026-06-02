import type { VercelRequest, VercelResponse } from '@vercel/node';
import customersHandler from './_logic/asaas/customers.js';
import updateCustomerHandler from './_logic/asaas/update-customer.js';
import paymentsHandler from './_logic/asaas/payments.js';
import editPaymentHandler from './_logic/asaas/edit-payment.js';
import deletePaymentHandler from './_logic/asaas/delete-payment.js';
import receiveInCashHandler from './_logic/asaas/receive-in-cash.js';
import paymentLinksHandler from './_logic/asaas/payment-links.js';
import subscriptionsHandler from './_logic/asaas/subscriptions.js';
import updateSubscriptionHandler from './_logic/asaas/update-subscription.js';
import deleteSubscriptionHandler from './_logic/asaas/delete-subscription.js';
import balanceHandler from './_logic/asaas/balance.js';
import transferHandler from './_logic/asaas/transfer.js';
import requestAdvanceHandler from './_logic/asaas/request-advance.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const { action } = req.query;
    console.log(`[AsaasHandler] Action: ${action}, Method: ${req.method}`);

    switch (action) {
      // Saldos e Transferências
      case 'balance':
        return await balanceHandler(req, res);
      case 'transfer':
        return await transferHandler(req, res);
      case 'request-advance':
        return await requestAdvanceHandler(req, res);

      // Clientes
      case 'customers':
      case 'create-customer':
        return await customersHandler(req, res);
      case 'update-customer':
        return await updateCustomerHandler(req, res);
      
      // Pagamentos
      case 'payments':
        return await paymentsHandler(req, res);
      case 'edit-payment':
        return await editPaymentHandler(req, res);
      case 'delete-payment':
        return await deletePaymentHandler(req, res);
      case 'receive-in-cash':
        return await receiveInCashHandler(req, res);
      case 'payment-links':
        return await paymentLinksHandler(req, res);
      
      // Assinaturas
      case 'subscriptions':
        return await subscriptionsHandler(req, res);
      case 'update-subscription':
        return await updateSubscriptionHandler(req, res);
      case 'delete-subscription':
        return await deleteSubscriptionHandler(req, res);
      
      default:
        return res.status(400).json({ error: 'Ação do Asaas inválida ou não fornecida' });
    }
  } catch (error: any) {
    console.error(`[CRITICAL] AsaasHandler failed:`, error);
    return res.status(500).json({ 
      error: 'Erro interno na gestão do Asaas', 
      details: error.message 
    });
  }
}
