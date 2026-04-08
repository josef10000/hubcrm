import { doc, updateDoc } from 'firebase/firestore';
import { auth, db } from './lib/firebase';
import { authFetch } from './lib/authFetch';
import { Client } from './types';

export const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const getSetupPrice = (plan?: string, client?: Partial<Client>) => {
  if (client?.setupPrice !== undefined) return client.setupPrice;
  if (client?.customSetupPrice !== undefined) return client.customSetupPrice;
  
  // Dynamic defaults based on common plans
  if (plan === 'Profissional') return 7500;
  if (plan === 'Ecossistema Essencial') return 2500;
  
  return 2500; // Final fallback
};

export const getPlanPrice = (plan?: string, billingCycle?: string, client?: Partial<Client> | number, customSetupPrice?: number) => {
  let finalMonthlyPrice: number = 0;
  let finalSetupPrice: number = 0;

  if (typeof client === 'number') {
    finalMonthlyPrice = client;
    finalSetupPrice = customSetupPrice !== undefined ? customSetupPrice : getSetupPrice(plan);
  } else {
    // Priority 1: Explicit planPrice or customMonthlyPrice in client record
    if (client?.customMonthlyPrice !== undefined) {
      finalMonthlyPrice = client.customMonthlyPrice;
    } else if (client?.planPrice !== undefined) {
      finalMonthlyPrice = client.planPrice;
    } else {
      // Priority 2: Fallback to hardcoded defaults for standard plans
      if (plan === 'Profissional') finalMonthlyPrice = 897;
      else if (plan === 'Ecossistema Essencial') finalMonthlyPrice = 397;
      else finalMonthlyPrice = 0;
    }

    // Priority 1: Explicit setupPrice in client record
    if (client?.customSetupPrice !== undefined) {
      finalSetupPrice = client.customSetupPrice;
    } else if (client?.setupPrice !== undefined) {
      finalSetupPrice = client.setupPrice;
    } else {
      finalSetupPrice = getSetupPrice(plan, client);
    }
  }

  // Calculate total based on billing cycle
  if (billingCycle === 'YEARLY') {
    // Yearly discount: 12 months for the price of 9 + Setup
    return finalSetupPrice + (finalMonthlyPrice * 9);
  }
  
  return finalMonthlyPrice;
};

export const calculateDiscount = (client: Client, clientsList: Client[]) => {
  if (!client || client.referralRewardType === 'commission') return 0;
  
  // Find active referred clients
  const activeReferred = clientsList.filter(c => c.referredBy === client.id && c.status !== 'Cancelado' && c.referralConfirmed === true);
  const discountAmount = activeReferred.length * 100;
  
  const basePrice = getPlanPrice(client.plan, client.billingCycle, client);
  const maxDiscount = basePrice * 0.5; // 50% limit
  
  return Math.min(discountAmount, maxDiscount);
};

export const updateReferrerSubscription = async (referrerId: string, updatedClients: Client[]) => {
  const referrer = updatedClients.find(c => c.id === referrerId);
  if (!referrer || referrer.referralRewardType === 'commission') return;

  const discount = calculateDiscount(referrer, updatedClients);
  
  try {
    // Also save the current discount to Firestore for display
    if (auth.currentUser) {
      await updateDoc(doc(db, 'users', auth.currentUser.uid, 'clients', referrer.id), {
        currentDiscount: discount
      });
    }

    if (!referrer.asaasSubscriptionId) return;

    const monthlyValue = getPlanPrice(referrer.plan, referrer.billingCycle, referrer) - discount;

    const updateRes = await authFetch('/api/asaas_subscriptions?action=update-subscription', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subscriptionId: referrer.asaasSubscriptionId,
        updatePendingPayments: true,
        value: monthlyValue
      })
    });
    if (!updateRes.ok) {
      console.error("Failed to update referrer subscription in Asaas");
    }
  } catch (e) {
    console.error("Error updating referrer subscription", e);
  }
};
