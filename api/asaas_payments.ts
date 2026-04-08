import type { VercelRequest, VercelResponse } from '@vercel/node';
import paymentsHandler from './_logic/asaas/payments';
import deletePaymentHandler from './_logic/asaas/delete-payment';
import editPaymentHandler from './_logic/asaas/edit-payment';
import receiveInCashHandler from './_logic/asaas/receive-in-cash';
import paymentLinksHandler from './_logic/asaas/payment-links';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { action } = req.query;
  
  switch (action) {
    case 'delete-payment':
      return deletePaymentHandler(req, res);
    case 'edit-payment':
      return editPaymentHandler(req, res);
    case 'receive-in-cash':
      return receiveInCashHandler(req, res);
    case 'payment-links':
      return paymentLinksHandler(req, res);
    default:
      return paymentsHandler(req, res);
  }
}
