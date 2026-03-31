import { doc, updateDoc } from 'firebase/firestore';
import { auth, db } from './lib/firebase';
import { Client } from './types';

export const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const getSetupPrice = (plan?: string, client?: Partial<Client>) => {
  if (client && client.setupPrice !== undefined) return client.setupPrice;
  if (client && client.customSetupPrice !== undefined) return client.customSetupPrice;
  if (plan === 'Profissional') return 7500;
  return 2500; // Essencial
};

export const getPlanPrice = (plan?: string, billingCycle?: string, client?: Partial<Client> | number, customSetupPrice?: number) => {
  let finalMonthlyPrice: number;
  let finalSetupPrice: number;

  if (typeof client === 'number') {
    finalMonthlyPrice = client;
    finalSetupPrice = customSetupPrice !== undefined ? customSetupPrice : getSetupPrice(plan);
  } else {
    finalMonthlyPrice = client?.customMonthlyPrice !== undefined ? client.customMonthlyPrice : (client?.planPrice !== undefined ? client.planPrice : (plan === 'Profissional' ? 897 : 397));
    finalSetupPrice = client?.customSetupPrice !== undefined ? client.customSetupPrice : (client?.setupPrice !== undefined ? client.setupPrice : getSetupPrice(plan, client));
  }

  if (billingCycle === 'YEARLY') {
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

    const updateRes = await fetch('/api/asaas/update-subscription', {
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
