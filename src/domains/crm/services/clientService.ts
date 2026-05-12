import { db } from '@/lib/firebase';
import { collection, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { Client } from '@/types';
import { eventBus, HUB_EVENTS } from '@core/events/eventBus';

export const clientService = {
  async createFromLead(orgId: string, lead: any, totalAmount: number): Promise<string> {
    const clientRef = doc(collection(db, 'organizations', orgId, 'clients'));
    const clientId = clientRef.id;

    const newClient: Partial<Client> & { publicToken: string } = {
      id: clientId,
      name: lead.name,
      email: lead.email,
      whatsapp: lead.whatsapp,
      status: 'Ativo',
      planPrice: totalAmount,
      publicToken: crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, ''), // 64 chars hex-like
      assignedTo: lead.assignedTo || 'system',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      logs: [
        {
          id: Math.random().toString(36).substring(7),
          text: `Cliente convertido automaticamente via Checkout Direto. Valor: R$ ${totalAmount}`,
          date: Date.now()
        }
      ]
    };

    await setDoc(clientRef, newClient);
    
    // Emitir evento de novo cliente
    eventBus.emit(HUB_EVENTS.CRM.CLIENT_CREATED, newClient);
    
    return clientId;
  }
};
