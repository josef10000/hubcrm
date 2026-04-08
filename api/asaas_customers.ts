import type { VercelRequest, VercelResponse } from '@vercel/node';
import customersHandler from './_logic/asaas/customers';
import updateCustomerHandler from './_logic/asaas/update-customer';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { action } = req.query;
  
  if (action === 'update-customer') {
    return updateCustomerHandler(req, res);
  }
  
  // Default ou create-customer
  return customersHandler(req, res);
}
