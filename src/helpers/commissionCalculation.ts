import { Client, Offer, CommissionEntry } from '@/types';

/**
 * Calcula a comissão para um cliente baseado na oferta associada.
 * Retorna null se não houver comissão configurada ou se não houver vendedor atribuído.
 */
export function calculateCommissionForClient(
  client: Client, 
  offers: Offer[],
  userName: string
): CommissionEntry | null {
  if (!client.assignedTo || !client.offerId) return null;

  const offer = offers.find(o => o.id === client.offerId);
  if (!offer || !offer.commissionValue || offer.commissionValue <= 0) return null;

  return {
    id: `comm_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    clientId: client.id,
    clientName: client.name,
    userId: client.assignedTo,
    userName: userName,
    amount: offer.commissionValue,
    date: Date.now(),
    status: 'PENDING',
    offerName: offer.name
  };
}
