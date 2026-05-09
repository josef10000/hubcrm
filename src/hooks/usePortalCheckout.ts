import { useState } from 'react';
import { Offer, Client, ClientPlan } from '../types';
import { authFetch } from '@/lib/authFetch';
import { db } from '@/lib/firebase';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { toast } from 'sonner';

export function usePortalCheckout(client: Client) {
  const [isLoading, setIsLoading] = useState(false);

  const hireOffer = async (offer: Offer) => {
    if (!client) {
      toast.error('Cliente não identificado.');
      return;
    }

    setIsLoading(true);
    try {
      const isSubscription = offer.type === 'SUBSCRIPTION';
      const action = isSubscription ? 'subscriptions' : 'payment-links';
      
      const payload: any = {
        customer: client.asaasCustomerId,
        value: offer.price + (offer.setupPrice || 0),
        description: `Contratação: ${offer.name}`,
      };

      if (isSubscription) {
        payload.cycle = 'MONTHLY';
        payload.nextDueDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]; // 3 days from now
      } else {
        payload.name = offer.name;
        payload.chargeType = 'DETACHED';
      }

      // 1. Create Asaas Resource
      const response = await authFetch(`/api/asaas?action=${action}`, {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error('Falha ao criar cobrança no Asaas');
      }

      const asaasData = await response.json();
      const invoiceUrl = asaasData.invoiceUrl || asaasData.url;

      // 2. Add Plan to Client (Pending status)
      const newPlan: ClientPlan = {
        id: asaasData.id,
        offerId: offer.id,
        name: offer.name,
        type: offer.type,
        price: offer.price,
        status: 'Pendente',
        invoiceUrl: invoiceUrl,
        asaasSubscriptionId: isSubscription ? asaasData.id : undefined,
        asaasPaymentId: !isSubscription ? asaasData.id : undefined,
        createdAt: Date.now()
      };

      // Find the client document. Since it's a collectionGroup query in some places, 
      // we might need the full path. But in the portal context, we usually have the orgId.
      // For now, let's assume we can update via the client.id if we find the correct path.
      // The client object should ideally have the path or we can search for it.
      // In HubCRM, clients are under organizations/{orgId}/clients/{clientId}
      
      // Let's use a trick: search for the client doc if we don't have orgId
      // Or better, let's assume ClientPortalLayout provides enough context.
      
      // Assuming we need to find the orgId first or it's passed.
      // In the portal, we usually have orgId in the URL or context.
      const orgId = window.location.pathname.split('/')[2]; 
      if (!orgId) throw new Error('Organização não identificada.');

      const clientRef = doc(db, 'organizations', orgId, 'clients', client.id);
      await updateDoc(clientRef, {
        plans: arrayUnion(newPlan)
      });

      toast.success('Redirecionando para o pagamento...');
      
      // 3. Redirect
      window.location.href = invoiceUrl;

    } catch (error: any) {
      console.error('Checkout error:', error);
      toast.error(error.message || 'Erro ao processar contratação.');
    } finally {
      setIsLoading(false);
    }
  };

  return { hireOffer, isLoading };
}
