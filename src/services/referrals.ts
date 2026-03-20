import { auth, db } from '../lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import type { Client } from '../types';
import { getPlanPrice, calculateDiscount } from './pricing';
import { updateSubscription } from './asaas';

/**
 * Recalculates and applies the referral discount to a referrer's subscription.
 * Used when a referred client is canceled or confirmed.
 */
export const updateReferrerSubscription = async (
  referrerId: string,
  updatedClients: Client[]
) => {
  const referrer = updatedClients.find(c => c.id === referrerId);
  if (!referrer || referrer.referralRewardType === 'commission') return;

  const discount = calculateDiscount(referrer, updatedClients);

  try {
    // Save the current discount to Firestore for display
    if (auth.currentUser) {
      await updateDoc(
        doc(db, 'users', auth.currentUser.uid, 'clients', referrer.id),
        { currentDiscount: discount }
      );
    }

    if (!referrer.asaasSubscriptionId) return;

    const monthlyValue = getPlanPrice(referrer.plan, referrer.billingCycle) - discount;

    await updateSubscription({
      subscriptionId: referrer.asaasSubscriptionId,
      updatePendingPayments: true,
      value: monthlyValue,
    });
  } catch (e) {
    console.error('Error updating referrer subscription', e);
  }
};
