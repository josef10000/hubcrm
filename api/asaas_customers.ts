import type { VercelRequest, VercelResponse } from '@vercel/node';
import customersHandler from './_logic/asaas/customers';
import updateCustomerHandler from './_logic/asaas/update-customer';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const { action } = req.query;
    console.log(`[API] asaas_customers: action=${action}, method=${req.method}, body=${JSON.stringify(req.body).substring(0, 100)}...`);
    
    if (action === 'update-customer') {
      return await updateCustomerHandler(req, res);
    }
    
    // Default ou create-customer
    return await customersHandler(req, res);
  } catch (error: any) {
    console.error(`[CRITICAL] asaas_customers failed:`, error);
    return res.status(500).json({ 
      error: 'Erro interno na função de clientes', 
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined 
    });
  }
}
