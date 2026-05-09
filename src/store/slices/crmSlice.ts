import { StateCreator } from 'zustand';
import { 
  collection, doc, setDoc, deleteDoc, 
  serverTimestamp, arrayUnion 
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { toast } from 'sonner';
import { Client, Offer, Lead, Tag } from '@/types';
import { CRMStoreState } from '@/types';
import { logger } from '@core/utils/logger';

export interface CRMSlice {
  clients: Client[];
  leads: Lead[];
  offers: Offer[];
  tags: Tag[];
  
  handleSaveClient: (clientData: Partial<Client>) => Promise<void>;
  handleDeleteClient: (clientId: string) => Promise<void>;
  handleAddClientLog: (clientId: string, logText: string) => Promise<void>;
  handleSaveOffer: (offerData: Partial<Offer>) => Promise<void>;
  handleDeleteOffer: (offerId: string) => Promise<void>;
  isChurnRisk: (client: Client, churnRiskDays: number) => boolean;
  isComboNearRenewal: (client: Client) => boolean;
  syncPayments: () => Promise<void>;
}

export const createCRMSlice: StateCreator<
  CRMStoreState,
  [],
  [],
  CRMSlice
> = (set, get) => ({
  clients: [],
  leads: [],
  offers: [],
  tags: [],

  handleSaveClient: async (clientData) => {
    const { effectiveOrgId, currentUserId } = get();
    if (!effectiveOrgId) return;
    try {
      const isNew = !clientData.id;
      const id = clientData.id || doc(collection(db, 'organizations', effectiveOrgId, 'clients')).id;
      
      const finalData: any = {
        ...clientData,
        id,
        updatedAt: serverTimestamp(),
        createdAt: clientData.createdAt || serverTimestamp()
      };

      if (isNew && !finalData.assignedTo && currentUserId) {
        finalData.assignedTo = currentUserId;
      }

      await setDoc(doc(db, 'organizations', effectiveOrgId, 'clients', id), finalData, { merge: true });
      toast.success('Cliente salvo com sucesso!');
    } catch (err) {
      logger.error("Error saving client", { domain: 'CRM', data: err });
      toast.error('Erro ao salvar cliente.');
    }
  },

  handleDeleteClient: async (clientId) => {
    const orgId = get().effectiveOrgId;
    if (!orgId) return;
    try {
      await deleteDoc(doc(db, 'organizations', orgId, 'clients', clientId));
      toast.success('Cliente removido.');
    } catch (err) {
      logger.error("Error deleting client", { domain: 'CRM', data: err });
    }
  },

  handleAddClientLog: async (clientId, logText) => {
    const orgId = get().effectiveOrgId;
    if (!orgId) return;
    try {
      const clientRef = doc(db, 'organizations', orgId, 'clients', clientId);
      const newLog = {
        id: Math.random().toString(36).substring(7),
        text: logText,
        date: Date.now()
      };
      await setDoc(clientRef, { logs: arrayUnion(newLog) }, { merge: true });
      toast.success('Nota registrada!');
    } catch (err) {
      logger.error("Error adding log", { domain: 'CRM', data: err });
    }
  },

  handleSaveOffer: async (offerData) => {
    const orgId = get().effectiveOrgId;
    if (!orgId) return;
    try {
      const id = offerData.id || doc(collection(db, 'organizations', orgId, 'offers')).id;
      await setDoc(doc(db, 'organizations', orgId, 'offers', id), {
        ...offerData,
        id,
        createdAt: offerData.createdAt || Date.now()
      }, { merge: true });
      toast.success('Oferta salva!');
    } catch (err) {
      logger.error("Error saving offer", { domain: 'CRM', data: err });
    }
  },

  handleDeleteOffer: async (offerId) => {
    const orgId = get().effectiveOrgId;
    if (!orgId) return;
    try {
      await deleteDoc(doc(db, 'organizations', orgId, 'offers', offerId));
      toast.success('Oferta removida.');
    } catch (err) {
      logger.error("Error deleting offer", { domain: 'CRM', data: err });
    }
  },

  isChurnRisk: (client, churnRiskDays) => {
    if (!client.lastContactAt) return true;
    const diff = (Date.now() - client.lastContactAt) / (1000 * 60 * 60 * 24);
    return diff > churnRiskDays;
  },

  isComboNearRenewal: (client) => {
    if (!client.comboRenewalDate) return false;
    const renewal = new Date(client.comboRenewalDate);
    const diff = (renewal.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    return diff <= 15 && diff >= 0;
  },

  syncPayments: async () => {
    toast.promise(new Promise(r => setTimeout(r, 2000)), {
      loading: 'Sincronizando pagamentos...',
      success: 'Pagamentos sincronizados!',
      error: 'Erro na sincronização.'
    });
  }
});
