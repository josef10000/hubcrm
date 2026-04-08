import type { VercelRequest, VercelResponse } from '@vercel/node';
import subscriptionsHandler from './_logic/asaas/subscriptions';
import deleteSubscriptionHandler from './_logic/asaas/delete-subscription';
import updateSubscriptionHandler from './_logic/asaas/update-subscription';
import getByIdHandler from './_logic/asaas/subscriptions/get-by-id';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { action, id } = req.query;
  
  // Tratamento para rota dinâmica de ID de assinatura
  if (id) {
    return getByIdHandler(req, res);
  }

  switch (action) {
    case 'delete-subscription':
      return deleteSubscriptionHandler(req, res);
    case 'update-subscription':
      return updateSubscriptionHandler(req, res);
    default:
      return subscriptionsHandler(req, res);
  }
}
