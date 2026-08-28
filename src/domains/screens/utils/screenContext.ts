import { useEffect, useState } from 'react';
import type { Client, Offer, Transaction } from '@/types';

export type ScreenContext = 'ALL' | 'B2B' | 'B2C' | `PRODUCT:${string}`;

export const getScreenContext = (): ScreenContext => {
  if (typeof window === 'undefined') return 'ALL';
  const value = new URLSearchParams(window.location.search).get('context');
  if (value === 'B2B' || value === 'B2C') return value;
  if (value?.startsWith('PRODUCT:')) return value as ScreenContext;
  return 'ALL';
};

export const getProductContextId = (context: ScreenContext) =>
  context.startsWith('PRODUCT:') ? context.slice('PRODUCT:'.length) : null;

export function useScreenContext(): ScreenContext {
  const [context, setContext] = useState<ScreenContext>(() => getScreenContext());

  useEffect(() => {
    const handleContext = (event: Event) => {
      const next = (event as CustomEvent<ScreenContext>).detail;
      setContext(next || getScreenContext());
    };
    const handlePopState = () => setContext(getScreenContext());
    window.addEventListener('hubcrm:screen-context', handleContext);
    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('hubcrm:screen-context', handleContext);
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  return context;
}

export function filterTransactionsByContext(
  transactions: Transaction[],
  offers: Offer[],
  context: ScreenContext
): Transaction[] {
  if (context === 'ALL') return transactions;
  const productId = getProductContextId(context);
  const matchingOfferIds = new Set(
    offers
      .filter(offer => productId ? offer.id === productId : (offer as any).portfolioSegment === context)
      .map(offer => offer.id)
  );
  return transactions.filter(tx => matchingOfferIds.has(tx.offerId || ''));
}

export function filterClientsByContext(
  clients: Client[],
  transactions: Transaction[],
  offers: Offer[],
  context: ScreenContext
): Client[] {
  if (context === 'ALL') return clients;
  const productId = getProductContextId(context);
  const matchingOfferIds = new Set(
    offers
      .filter(offer => productId ? offer.id === productId : (offer as any).portfolioSegment === context)
      .map(offer => offer.id)
  );
  const transactionClientIds = new Set(
    transactions
      .filter(tx => matchingOfferIds.has(tx.offerId || ''))
      .map(tx => tx.clientId)
      .filter(Boolean)
  );
  return clients.filter(client =>
    matchingOfferIds.has(client.offerId || '') || transactionClientIds.has(client.id)
  );
}
