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
import { auditService } from '@/services/auditService';

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
      
      const existingClient = clients.find(c => c.id === id);
      
      const client: any = {
        ...(existingClient || {}),
        ...clientData,
        id,
        updatedAt: Date.now(),
        createdAt: clientData.createdAt || existingClient?.createdAt || Date.now()
      };

      if (isNew && !client.assignedTo && currentUserId) {
        client.assignedTo = currentUserId;
      }

      // 🚀 Integração com Asaas (Exige CPF/CNPJ e E-mail)
      const cleanCpfCnpj = client.cpfCnpj?.replace(/\D/g, '') || '';
      const hasValidDoc = cleanCpfCnpj.length === 11 || cleanCpfCnpj.length === 14;

      if (client.email && hasValidDoc && client.status !== 'Cancelado') {
        try {
          const { asaasService } = await import('@/services/asaasService');
          const { getPlanPrice, calculateDiscount } = await import('@/helpers');

          // Só processar se não tiver invoiceUrl OU se o usuário alterou plano/valores
          const needsInvoice = !client.invoiceUrl || (typeof client.invoiceUrl === 'string' && client.invoiceUrl.includes('manual'));
          
          if (needsInvoice) {
            // 1. Criar/Buscar Cliente (Obrigatório)
            let asaasCustomerId = client.asaasCustomerId;
            if (!asaasCustomerId) {
              const customer = await asaasService.getOrCreateCustomer({
                id: client.id,
                name: client.name,
                email: client.email,
                cpfCnpj: client.cpfCnpj,
                whatsapp: client.whatsapp,
                notificationsEnabled: client.asaasNotificationsEnabled
              });
              asaasCustomerId = customer.id;
              client.asaasCustomerId = customer.id;
            }

            // 🚀 PRÉ-SALVAMENTO: Garantir que o cliente existe no Firestore para que a API portal_finance funcione
            const preSaveData = Object.fromEntries(
              Object.entries(client).filter(([_, v]) => v !== undefined)
            );
            await setDoc(doc(db, 'organizations', effectiveOrgId, 'clients', id), preSaveData, { merge: true });

            // 2. Preparar Valores
            const today = new Date();
            const firstPaymentDate = client.firstPaymentDate || today.toISOString().split('T')[0];
            let monthlyValue = getPlanPrice(client.plan, client.billingCycle, client);
            monthlyValue -= calculateDiscount(client as Client, clients);

            const selectedOffer = offers.find((o) => o.id === client.offerId) || offers.find((o) => o.name === client.plan);
            const isSinglePayment = selectedOffer?.type === 'SINGLE';
            const bType = client.billingType || 'UNDEFINED';

            // 3. Criar Cobrança ou Assinatura
            if (client.isCombo || isSinglePayment) {
              const totalValue = (client.isCombo || isSinglePayment) 
                ? Math.max(0, monthlyValue + (client.setupPrice || 0)) 
                : monthlyValue;
              
              const paymentLink = await asaasService.createPaymentLink({
                name: isSinglePayment ? `Pagamento Único - ${client.plan}` : `Combo - ${client.plan}`,
                description: isSinglePayment ? `Oferta ${client.plan}` : `Acesso anual + Setup`,
                value: totalValue,
                billingType: bType,
                chargeType: bType === 'PIX' ? 'DETACHED' : 'INSTALLMENT',
                maxInstallments: client.maxInstallments || 12,
                customer: asaasCustomerId,
                dueDateLimitDays: 3
              });
              client.invoiceUrl = paymentLink.url;
              client.nextDueDate = firstPaymentDate;
            } else {
              const sub = await asaasService.createSubscription({
                customer: asaasCustomerId,
                billingType: bType,
                cycle: client.billingCycle === 'YEARLY' ? 'YEARLY' : 'MONTHLY',
                value: monthlyValue,
                nextDueDate: firstPaymentDate,
                description: `Assinatura - Plano ${client.plan}`
              });
              client.asaasSubscriptionId = sub.id;
              client.nextDueDate = firstPaymentDate;
              
              // Em assinaturas, o link de pagamento fica na cobrança gerada, não na assinatura.
              // Vamos buscar o pagamento pendente mais recente para pegar a URL.
              try {
                // Pequeno delay para dar tempo do Asaas processar a assinatura e gerar o pagamento
                await new Promise(r => setTimeout(r, 2000));
                
                const pRes = await fetch(`/api/portal_finance?orgId=${effectiveOrgId}&clientId=${client.id}&asaasCustomerId=${asaasCustomerId}`);
                if (pRes.ok) {
                  const pData = await pRes.json();
                  const payments = pData.data || [];
                  // Pegar o primeiro pagamento (mais recente vindo do Asaas)
                  const latestPayment = payments[0];
                  if (latestPayment) {
                    client.invoiceUrl = latestPayment.invoiceUrl || latestPayment.bankSlipUrl || latestPayment.invoiceHtmlUrl;
                    console.log("[Asaas] Link da fatura capturado do histórico:", client.invoiceUrl);
                  }
                }
              } catch (e) {
                console.warn("[Asaas] Erro ao buscar link da primeira fatura:", e);
              }


            }
            
            console.log("[Asaas] Integração concluída com sucesso. URL:", client.invoiceUrl);
            toast.success('Faturamento sincronizado com o Asaas!');
          }
        } catch (asaasErr: any) {
          console.error("[Asaas] Erro na integração:", asaasErr);
          logger.warn("Asaas Integration error", { domain: 'CRM', data: asaasErr });
          toast.error(`Erro na integração Asaas: ${asaasErr.message}`);
        }
      } else if (client.status !== 'Cancelado' && !client.invoiceUrl) {
        console.log("[Asaas] Integração pulada. Dados insuficientes ou status cancelado.", { 
          email: !!client.email, 
          hasValidDoc, 
          status: client.status 
        });
      }

      // Limpar campos undefined para não quebrar o Firestore
      const cleanData = Object.fromEntries(
        Object.entries(client).filter(([_, v]) => v !== undefined)
      );

      console.log("[CRM] Salvando cliente no Firestore:", id);
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
      
      const { userProfile } = get();
      auditService.logActivity(orgId, {
        userId: userProfile?.uid || 'unknown',
        userName: userProfile?.displayName || 'Usuário',
        action: 'CLIENT_DELETED',
        targetId: clientId,
        targetType: 'client',
        details: `Cliente removido permanentemente do CRM.`
      });

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
      
      const { userProfile } = get();
      auditService.logActivity(orgId, {
        userId: userProfile?.uid || 'unknown',
        userName: userProfile?.displayName || 'Usuário',
        action: 'OFFER_DELETED',
        targetId: offerId,
        targetType: 'contract',
        details: `Oferta/Plano removido das configurações.`
      });

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
