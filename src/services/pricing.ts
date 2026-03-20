import type { Client } from '../types';

/**
 * Returns the price for a given plan and billing cycle.
 */
export const getPlanPrice = (plan?: string, billingCycle?: string): number => {
  if (billingCycle === 'YEARLY') {
    if (plan === 'Profissional') return 3573;
    if (plan === 'Autoridade') return 8973;
    return 1323; // Essencial
  }
  
  if (plan === 'Profissional') return 397;
  if (plan === 'Autoridade') return 997;
  return 147; // Essencial
};

/**
 * Returns the setup fee for a given plan.
 */
export const getSetupPrice = (plan?: string): number => {
  if (plan === 'Profissional') return 2500;
  if (plan === 'Autoridade') return 7500;
  return 500; // Essencial
};

/**
 * Calculates the referral discount for a client.
 * - commission-type referrals get 0 discount
 * - each active confirmed referral gives R$100 discount
 * - max 50% of plan price
 */
export const calculateDiscount = (client: Client, clientsList: Client[]): number => {
  if (!client || client.referralRewardType === 'commission') return 0;
  
  // Find active referred clients
  const activeReferred = clientsList.filter(
    c => c.referredBy === client.id && c.status !== 'Cancelado' && c.referralConfirmed === true
  );
  const discountAmount = activeReferred.length * 100;
  
  const basePrice = getPlanPrice(client.plan, client.billingCycle);
  const maxDiscount = basePrice * 0.5; // 50% limit
  
  return Math.min(discountAmount, maxDiscount);
};
