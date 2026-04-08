import type { VercelRequest, VercelResponse } from '@vercel/node';
import subscriptionsHandler from './_logic/asaas/subscriptions.js';
import deleteSubscriptionHandler from './_logic/asaas/delete-subscription.js';
import updateSubscriptionHandler from './_logic/asaas/update-subscription.js';
import getByIdHandler from './_logic/asaas/subscriptions/get-by-id.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const { action, id } = req.query;
    console.log(`[API] asaas_subscriptions: action=${action}, id=${id}, method=${req.method}`);
    
    // Tratamento para rota dinâmica de ID de assinatura
    if (id) {
      return await getByIdHandler(req, res);
    }

    switch (action) {
      case 'delete-subscription':
        return await deleteSubscriptionHandler(req, res);
      case 'update-subscription':
        return await updateSubscriptionHandler(req, res);
      default:
        return await subscriptionsHandler(req, res);
    }
  } catch (error: any) {
    console.error(`[CRITICAL] asaas_subscriptions failed:`, error);
    return res.status(500).json({ error: 'Erro interno no serviço de assinaturas', details: error.message });
  }
}
