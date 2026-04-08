import type { VercelRequest, VercelResponse } from '@vercel/node';
import paymentsHandler from './_logic/asaas/payments';
import deletePaymentHandler from './_logic/asaas/delete-payment';
import editPaymentHandler from './_logic/asaas/edit-payment';
import receiveInCashHandler from './_logic/asaas/receive-in-cash';
import paymentLinksHandler from './_logic/asaas/payment-links';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const { action } = req.query;
    console.log(`[API] asaas_payments: action=${action}, method=${req.method}`);
    
    switch (action) {
      case 'delete-payment':
        return await deletePaymentHandler(req, res);
      case 'edit-payment':
        return await editPaymentHandler(req, res);
      case 'receive-in-cash':
        return await receiveInCashHandler(req, res);
      case 'payment-links':
        return await paymentLinksHandler(req, res);
      default:
        return await paymentsHandler(req, res);
    }
  } catch (error: any) {
    console.error(`[CRITICAL] asaas_payments failed:`, error);
    return res.status(500).json({ error: 'Erro interno no serviço de pagamentos', details: error.message });
  }
}
