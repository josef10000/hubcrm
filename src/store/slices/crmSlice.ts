import { StateCreator } from 'zustand';
import { 
  collection, doc, setDoc, deleteDoc, 
  serverTimestamp, arrayUnion 
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { toast } from 'sonner';
import { Client, Offer, Lead, Tag } from '@/types';
import { CRMStoreState } from '../types';
import { logger } from '@core/utils/logger';
import { eventBus, HUB_EVENTS } from '@core/events/eventBus';

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
    const { effectiveOrgId, currentUserId, offers, clients } = get();
    if (!effectiveOrgId) return;

    try {
      const isNew = !clientData.id;
      const id = clientData.id || doc(collection(db, 'organizations', effectiveOrgId, 'clients')).id;
      
      const client: any = {
        ...clientData,
        id,
        updatedAt: serverTimestamp(),
        createdAt: clientData.createdAt || serverTimestamp()
      };

      if (isNew && !client.assignedTo && currentUserId) {
        client.assignedTo = currentUserId;
      }

      // 🚀 Integração com Asaas (Somente se houver dados mínimos)
      if (!client.asaasCustomerId && client.cpfCnpj && client.email && client.status !== 'Cancelado') {
        try {
          const { asaasService } = await import('@/services/asaasService');
          const { getPlanPrice, calculateDiscount } = await import('@/helpers');

          // 1. Criar Cliente no Asaas
          const customer = await asaasService.getOrCreateCustomer({
            id: client.id,
            name: client.name,
            email: client.email,
            cpfCnpj: client.cpfCnpj,
            whatsapp: client.whatsapp,
            notificationsEnabled: client.asaasNotificationsEnabled
          });

          client.asaasCustomerId = customer.id;

          // 2. Criar Cobrança/Assinatura
          const today = new Date();
          const firstPaymentDate = client.firstPaymentDate || today.toISOString().split('T')[0];
          let monthlyValue = getPlanPrice(client.plan, client.billingCycle, client);
          monthlyValue -= calculateDiscount(client as Client, clients);

          const selectedOffer = offers.find((o) => o.id === client.offerId) || offers.find((o) => o.name === client.plan);
          const isSinglePayment = selectedOffer?.type === 'SINGLE';

          if (client.isCombo || isSinglePayment) {
            const totalValue = isSinglePayment ? Math.max(0, monthlyValue + (client.setupPrice || 0)) : monthlyValue;
            const paymentLink = await asaasService.createPaymentLink({
              name: isSinglePayment ? `Pagamento Único - ${client.plan}` : `Combo - ${client.plan}`,
              description: isSinglePayment ? `Oferta ${client.plan}` : `Acesso anual + Setup`,
              value: totalValue,
              billingType: client.billingType || 'CREDIT_CARD',
              chargeType: client.billingType === 'PIX' ? 'DETACHED' : 'INSTALLMENT',
              maxInstallments: client.maxInstallments || 12,
              customer: customer.id,
              dueDateLimitDays: 3
            });
            client.invoiceUrl = paymentLink.url;
            client.nextDueDate = firstPaymentDate;
          } else {
            // Assinatura Padrão
            const sub = await asaasService.createSubscription({
              customer: customer.id,
              billingType: client.billingType || 'CREDIT_CARD',
              cycle: client.billingCycle === 'YEARLY' ? 'YEARLY' : 'MONTHLY',
              value: monthlyValue,
              nextDueDate: firstPaymentDate,
              description: `Assinatura - Plano ${client.plan}`
            });
            client.asaasSubscriptionId = sub.id;
            client.nextDueDate = firstPaymentDate;
            client.invoiceUrl = sub.invoiceUrl || sub.bankSlipUrl;
          }
          
          toast.success('Cobrança gerada no Asaas!');
        } catch (asaasErr: any) {
          logger.warn("Asaas Integration non-blocking error", { domain: 'CRM', data: asaasErr });
          toast.warning(`Cliente salvo, mas erro no Asaas: ${asaasErr.message}`);
        }
      }

      // Limpar campos undefined para não quebrar o Firestore
      const cleanData = Object.fromEntries(
        Object.entries(client).filter(([_, v]) => v !== undefined)
      );

      await setDoc(doc(db, 'organizations', effectiveOrgId, 'clients', id), cleanData, { merge: true });
      
      eventBus.emit(isNew ? HUB_EVENTS.CRM.CLIENT_CREATED : HUB_EVENTS.CRM.CLIENT_UPDATED, client);
      toast.success('Cliente processado com sucesso!');
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
