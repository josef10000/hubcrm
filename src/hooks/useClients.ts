import { useState, useMemo, useCallback } from 'react';
import { collection, doc, setDoc, deleteDoc, updateDoc, query, where, getDocs } from 'firebase/firestore';
import { z } from 'zod';
import { toast } from 'sonner';
import { auth, db } from '../lib/firebase';
import { authFetch } from '../lib/authFetch';
import { Client, Offer, PlanType, SiteStatus, clientSchema } from '../types';
import { getPlanPrice, getSetupPrice, calculateDiscount, updateReferrerSubscription } from '../helpers';

interface UseClientsOptions {
  userId: string;
  clients: Client[];
  offers: Offer[];
  editingClient: Client | null;
  setEditingClient: (client: Client | null) => void;
  setIsModalOpen: (open: boolean) => void;
  defaultStages: { id: string; name: string }[];
  churnRiskDays: number;
}

export function useClients(opts: UseClientsOptions) {
  const {
    userId, clients, offers, editingClient, setEditingClient, setIsModalOpen,
    defaultStages, churnRiskDays,
  } = opts;

  const [isSyncing, setIsSyncing] = useState(false);


  // ═══ Helpers ═══
  const isChurnRisk = useCallback((client: Client) => {
    if (client.status === 'Cancelado') return false;
    if (client.paymentStatus === 'OVERDUE' && client.nextDueDate) {
      const dueDate = new Date(client.nextDueDate);
      const today = new Date();
      const diffTime = today.getTime() - dueDate.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays >= churnRiskDays;
    }
    return false;
  }, [churnRiskDays]);

  const isComboNearRenewal = useCallback((client: Client) => {
    if (!client.isCombo || !client.comboRenewalDate) return false;
    const renewalDate = new Date(client.comboRenewalDate + 'T12:00:00Z');
    const today = new Date();
    const diffTime = renewalDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= 30 && diffDays >= -7;
  }, []);

  // ═══ Sync Payments ═══
  const syncPayments = async () => {
    setIsSyncing(true);
    try {
      const clientsToSync = clients.filter((c) => c.asaasCustomerId && c.status !== 'Cancelado');
      let updatedCount = 0;

      for (const client of clientsToSync) {
        try {
          const paymentsRes = await authFetch(`/api/asaas/payments?customer=${client.asaasCustomerId}`);
          let subscription = null;
          if (client.asaasSubscriptionId) {
            const subRes = await authFetch(`/api/asaas/subscriptions/${client.asaasSubscriptionId}`);
            if (subRes.ok) {
              const subData = await subRes.json();
              subscription = subData.subscription;
            }
          }

          if (paymentsRes.ok) {
            const paymentsData = await paymentsRes.json();
            const payments = paymentsData.data || [];

            if (payments.length > 0) {
              let targetPayment = payments.find((p: any) => p.status === 'OVERDUE');
              if (!targetPayment) targetPayment = payments.find((p: any) => p.status === 'PENDING');
              if (!targetPayment) targetPayment = [...payments].sort((a: any, b: any) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime())[0];

              const latestPayment = targetPayment;
              const status = latestPayment.status;

              let newPaymentStatus: 'PENDING' | 'RECEIVED' | 'OVERDUE' | 'N/A' = 'PENDING';
              let newSiteStatus: SiteStatus = client.status;

              if (status === 'RECEIVED' || status === 'CONFIRMED') {
                newPaymentStatus = 'RECEIVED';
                newSiteStatus = 'Ativo';
              } else if (status === 'OVERDUE') {
                newPaymentStatus = 'OVERDUE';
                newSiteStatus = 'Inadimplente';
              }

              const nextDueDate = status === 'PENDING' || status === 'OVERDUE' ? latestPayment.dueDate : subscription?.nextDueDate || client.nextDueDate;

              if (newPaymentStatus !== client.paymentStatus || newSiteStatus !== client.status || nextDueDate !== client.nextDueDate || (latestPayment.invoiceUrl && latestPayment.invoiceUrl !== client.invoiceUrl)) {
                const updatedClient = {
                  ...client,
                  paymentStatus: newPaymentStatus,
                  status: newSiteStatus,
                  nextDueDate: nextDueDate,
                  invoiceUrl: latestPayment.invoiceUrl || client.invoiceUrl,
                };
                await setDoc(doc(db, 'users', userId, 'clients', client.id), updatedClient);
                updatedCount++;
              }
            }
          }
        } catch (e) {
          console.error(`Error syncing client ${client.name}:`, e);
        }
      }

      if (updatedCount > 0) console.log(`Synced ${updatedCount} clients`);
    } catch (error) {
      console.error('Error syncing payments:', error);
    } finally {
      setIsSyncing(false);
    }
  };

  // ═══ Save Client ═══
  const handleSaveClient = async (clientData: Partial<Client>) => {
    try {
      clientSchema.parse(clientData);
    } catch (error) {
      if (error instanceof z.ZodError) {
        error.issues.forEach((err) => toast.error(err.message));
        return;
      }
    }

    const isNew = !clientData.id;
    const clientRef = isNew ? doc(collection(db, 'users', auth.currentUser!.uid, 'clients')) : doc(db, 'users', auth.currentUser!.uid, 'clients', clientData.id!);
    const client: Client = {
      ...(editingClient || {}),
      id: clientRef.id,
      name: clientData.name || '',
      whatsapp: clientData.whatsapp || '',
      plan: (clientData.plan as PlanType) || '',
      offerId: clientData.offerId,
      planPrice: clientData.planPrice,
      setupPrice: clientData.setupPrice,
      status: (clientData.status as SiteStatus) || 'Em Desenvolvimento',
      siteLink: clientData.siteLink,
      niche: clientData.niche,
      notes: clientData.notes,
      logs: clientData.logs,
      leadSource: clientData.leadSource,
      stages: clientData.stages || (isNew ? defaultStages.map((s) => ({ ...s, completed: false, approvedAt: null })) : undefined),
      createdAt: clientData.createdAt || Date.now(),
      cpfCnpj: clientData.cpfCnpj,
      email: clientData.email,
      cep: clientData.cep,
      endereco: clientData.endereco,
      bairro: clientData.bairro,
      cidade: clientData.cidade,
      estado: clientData.estado,
      asaasCustomerId: clientData.asaasCustomerId,
      asaasSubscriptionId: clientData.asaasSubscriptionId,
      invoiceUrl: clientData.invoiceUrl,
      nextDueDate: clientData.nextDueDate,
      paymentStatus: clientData.paymentStatus || 'PENDING',
      billingType: clientData.billingType || 'CREDIT_CARD',
      billingCycle: clientData.billingCycle || 'MONTHLY',
      firstPaymentDate: clientData.firstPaymentDate,
      recurringPaymentDay: clientData.recurringPaymentDay,
      deliveryDate: clientData.deliveryDate,
      isCombo: clientData.isCombo,
      maxInstallments: clientData.maxInstallments,
      comboRenewalDate: clientData.comboRenewalDate,
      referralRewardType: clientData.billingCycle === 'YEARLY' || clientData.isCombo ? 'commission' : clientData.referralRewardType || editingClient?.referralRewardType || 'discount',
    };

    try {
      // Handle Update Subscription
      if (!isNew && client.asaasSubscriptionId && editingClient && (editingClient.recurringPaymentDay !== client.recurringPaymentDay || editingClient.billingType !== client.billingType || editingClient.billingCycle !== client.billingCycle || editingClient.plan !== client.plan)) {
        let monthlyValue = getPlanPrice(client.plan, client.billingCycle, client);
        monthlyValue -= calculateDiscount(client as Client, clients);

        let nextSubDateStr = client.nextDueDate;
        if (editingClient.recurringPaymentDay !== client.recurringPaymentDay) {
          const today = new Date();
          let nextSubDate = new Date(today.getFullYear(), today.getMonth(), client.recurringPaymentDay, 12, 0, 0);
          if (nextSubDate.getTime() < today.getTime()) nextSubDate.setMonth(nextSubDate.getMonth() + 1);
          nextSubDateStr = nextSubDate.toISOString().split('T')[0];
        }

        const updateRes = await authFetch('/api/asaas/update-subscription', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            subscriptionId: client.asaasSubscriptionId,
            ...(nextSubDateStr ? { nextDueDate: nextSubDateStr } : {}),
            updatePendingPayments: true,
            billingType: client.billingType,
            cycle: client.billingCycle === 'YEARLY' ? 'YEARLY' : 'MONTHLY',
            value: monthlyValue,
            description: `Assinatura ${client.billingCycle === 'YEARLY' ? 'Anual' : 'Mensal'} - Plano ${client.plan} - Hub Central`,
          }),
        });
        if (!updateRes.ok) {
          console.error('Failed to update subscription in Asaas');
          toast.error('Aviso: Não foi possível atualizar a assinatura no Asaas.');
        } else {
          if (nextSubDateStr) client.nextDueDate = nextSubDateStr;
        }
      }

      // Handle Cancellation
      if (!isNew && client.status === 'Cancelado') {
        if (editingClient && editingClient.referredBy) {
          const referrer = clients.find((c) => c.id === editingClient.referredBy);
          if (referrer) {
            const referralsRef = collection(db, 'users', userId, 'referrals');
            const q = query(referralsRef, where('referredClientId', '==', client.id));
            const querySnapshot = await getDocs(q);
            if (!querySnapshot.empty) {
              const referralDoc = querySnapshot.docs[0];
              const referralData = referralDoc.data();
              if (referralData.status === 'confirmed' || referralData.status === 'applied') {
                const bonusToRevoke = referralData.bonusAmount || 0;
                const newBalance = Math.max(0, (referrer.referralBalance || 0) - bonusToRevoke);
                const newCount = Math.max(0, (referrer.referralCount || 0) - 1);
                await updateDoc(doc(db, 'users', userId, 'clients', referrer.id), { referralBalance: newBalance, referralCount: newCount });
                await updateDoc(referralDoc.ref, { status: 'cancelled', bonusAmount: 0 });
                if (referrer.referralRewardType === 'discount' || !referrer.referralRewardType) {
                  const updatedClients = clients.map((c) => (c.id === client.id ? ({ ...c, status: 'Cancelado' } as Client) : c));
                  await updateReferrerSubscription(referrer.id, updatedClients);
                }
              }
            }
          }
        }

        if (client.asaasCustomerId) {
          if (client.asaasSubscriptionId) {
            const delRes = await authFetch('/api/asaas/delete-subscription', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ subscriptionId: client.asaasSubscriptionId }) });
            if (!delRes.ok) {
              console.error('Failed to cancel subscription in Asaas');
              toast.error('Aviso: Não foi possível cancelar a assinatura no Asaas automaticamente.');
            } else {
              client.paymentStatus = 'N/A';
              client.invoiceUrl = undefined;
            }
          }
          try {
            const paymentsRes = await authFetch(`/api/asaas/payments?customer=${client.asaasCustomerId}`);
            if (paymentsRes.ok) {
              const paymentsData = await paymentsRes.json();
              const payments = paymentsData.data || [];
              for (const payment of payments) {
                if (payment.status === 'PENDING' || payment.status === 'OVERDUE') {
                  await authFetch('/api/asaas/delete-payment', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ paymentId: payment.id }) });
                }
              }
            }
          } catch (e) {
            console.error('Error cancelling pending payments', e);
          }
        }
      }

      // Integrate with Asaas for new clients
      if (!client.asaasCustomerId && client.cpfCnpj && client.email && client.status !== 'Cancelado') {
        const phoneClean = client.whatsapp ? client.whatsapp.replace(/\D/g, '') : '';
        const isMobile = phoneClean.length === 11;
        const isLandline = phoneClean.length === 10;

        const customerRes = await authFetch('/api/asaas/customers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: client.name, cpfCnpj: client.cpfCnpj ? client.cpfCnpj.replace(/\D/g, '') : '', email: client.email, mobilePhone: isMobile ? phoneClean : undefined, phone: isLandline ? phoneClean : undefined }),
        });

        if (customerRes.ok) {
          const customerData = await customerRes.json();
          client.asaasCustomerId = customerData.id;
          const today = new Date();
          const firstPaymentDate = client.firstPaymentDate || today.toISOString().split('T')[0];
          let monthlyValue = getPlanPrice(client.plan, client.billingCycle, client);
          monthlyValue -= calculateDiscount(client as Client, clients);
          let setupValue = getSetupPrice(client.plan, client);
          const selectedOffer = offers.find((o) => o.id === client.offerId) || offers.find((o) => o.name === client.plan);
          const isSinglePayment = selectedOffer?.type === 'SINGLE';

          if (client.isCombo || isSinglePayment) {
            const totalValue = isSinglePayment ? Math.max(0, monthlyValue + (client.setupPrice || 0)) : monthlyValue;
            const paymentName = isSinglePayment ? `Pagamento Único - ${client.plan}` : `Combo (Setup + Plano Anual) - Plano ${client.plan}`;
            const paymentDesc = isSinglePayment ? `Pagamento referente à oferta ${client.plan}.` : `Acesso anual ao Plano ${client.plan} com taxa de setup inclusa.`;
            const paymentRes = await authFetch('/api/asaas/payment-links', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                name: paymentName,
                description: paymentDesc,
                value: totalValue,
                billingType: client.billingType || 'CREDIT_CARD',
                chargeType: client.billingType === 'PIX' ? 'DETACHED' : 'INSTALLMENT',
                ...(client.billingType !== 'PIX' ? { maxInstallmentCount: client.maxInstallments || 12 } : {}),
                dueDateLimitDays: 3,
                customer: client.asaasCustomerId,
                endDate: new Date(new Date().getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
              }),
            });
            if (paymentRes.ok) {
              const paymentData = await paymentRes.json();
              client.invoiceUrl = paymentData.url;
              client.nextDueDate = firstPaymentDate;
              if (client.isCombo) {
                const renewalDate = new Date(firstPaymentDate + 'T12:00:00Z');
                renewalDate.setFullYear(renewalDate.getFullYear() + 1);
                client.comboRenewalDate = renewalDate.toISOString().split('T')[0];
                toast.success('Combo criado com sucesso! O cliente pode escolher o parcelamento no checkout.');
              } else {
                toast.success('Link de pagamento criado com sucesso! O cliente pode escolher o parcelamento no checkout.');
              }
            } else {
              const errorData = await paymentRes.json();
              toast.error(`Erro ao criar link de pagamento: ${errorData.error || 'Erro desconhecido'}`);
              console.error('Payment Link Error:', errorData);
            }
          } else {
            if (setupValue > 0) {
              const paymentRes = await authFetch('/api/asaas/payments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ customer: client.asaasCustomerId, billingType: client.billingType, value: setupValue, dueDate: firstPaymentDate, description: `Taxa de Adesão - Plano ${client.plan} - Hub Central` }),
              });
              if (paymentRes.ok) {
                const paymentData = await paymentRes.json();
                client.invoiceUrl = paymentData.invoiceUrl || paymentData.bankSlipUrl;
                client.nextDueDate = firstPaymentDate;
              } else {
                console.error('Failed to create initial payment', await paymentRes.text());
                toast.error('Erro ao criar taxa de adesão no Asaas.');
              }

              const firstDateObj = new Date(firstPaymentDate + 'T12:00:00Z');
              let nextSubDate = new Date(firstDateObj);
              if (client.recurringPaymentDay) {
                nextSubDate = new Date(firstDateObj.getFullYear(), firstDateObj.getMonth(), client.recurringPaymentDay, 12, 0, 0);
                if (nextSubDate.getTime() <= firstDateObj.getTime()) nextSubDate.setMonth(nextSubDate.getMonth() + 1);
                const diffTime = nextSubDate.getTime() - firstDateObj.getTime();
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                if (diffDays < 15) nextSubDate.setMonth(nextSubDate.getMonth() + 1);
              } else {
                nextSubDate.setMonth(nextSubDate.getMonth() + 1);
              }
              const nextSubDateStr = nextSubDate.toISOString().split('T')[0];

              const subRes = await authFetch('/api/asaas/subscriptions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ customer: client.asaasCustomerId, billingType: client.billingType, cycle: client.billingCycle === 'YEARLY' ? 'YEARLY' : 'MONTHLY', value: monthlyValue, nextDueDate: nextSubDateStr, description: `Assinatura ${client.billingCycle === 'YEARLY' ? 'Anual' : 'Mensal'} - Plano ${client.plan} - Hub Central` }),
              });
              if (subRes.ok) {
                const subData = await subRes.json();
                client.asaasSubscriptionId = subData.id;
              } else {
                let errText = await subRes.text();
                let err;
                try { err = JSON.parse(errText); } catch (e) { err = { error: errText }; }
                console.error('Asaas Subscription Error:', err);
                toast.error(`Erro ao criar assinatura no Asaas: ${err.error || 'Erro desconhecido'}`);
              }
            } else {
              const subRes = await authFetch('/api/asaas/subscriptions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ customer: client.asaasCustomerId, billingType: client.billingType, cycle: client.billingCycle === 'YEARLY' ? 'YEARLY' : 'MONTHLY', value: monthlyValue, nextDueDate: firstPaymentDate, description: `Assinatura ${client.billingCycle === 'YEARLY' ? 'Anual' : 'Mensal'} - Plano ${client.plan} - Hub Central` }),
              });
              if (subRes.ok) {
                const subData = await subRes.json();
                client.asaasSubscriptionId = subData.id;
                client.nextDueDate = firstPaymentDate;
                toast.success('Assinatura criada com sucesso!');
              } else {
                let errText = await subRes.text();
                let err;
                try { err = JSON.parse(errText); } catch (e) { err = { error: errText }; }
                console.error('Asaas Subscription Error:', err);
                toast.error(`Erro ao criar assinatura no Asaas: ${err.error || 'Erro desconhecido'}`);
              }
            }
          }
        } else {
          let errText = await customerRes.text();
          let err;
          try { err = JSON.parse(errText); } catch (e) { err = { error: errText }; }
          console.error('Asaas Customer Error:', err);
          const errDetail = err.details ? ` (${err.details})` : (err.code ? ` [${err.code}]` : '');
          toast.error(`Erro ao criar cliente no Asaas: ${err.error || 'Erro desconhecido'}${errDetail}`);
        }
      }

      const cleanClient = Object.fromEntries(Object.entries(client).filter(([_, v]) => v !== undefined));
      await setDoc(doc(db, 'users', userId, 'clients', client.id), cleanClient);
      setIsModalOpen(false);
      setEditingClient(null);
    } catch (error: any) {
      console.error('Save Error:', error);
      toast.error(`Erro ao salvar cliente: ${error.message}`);
    }
  };

  // ═══ Delete Client ═══
  const handleDeleteClient = async (clientId: string) => {
    setIsModalOpen(false);
    const clientToDelete = clients.find((c) => c.id === clientId);

    if (clientToDelete?.asaasCustomerId) {
      if (clientToDelete.asaasSubscriptionId) {
        try {
          const delRes = await authFetch('/api/asaas/delete-subscription', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ subscriptionId: clientToDelete.asaasSubscriptionId }) });
          if (!delRes.ok) {
            console.error('Failed to cancel subscription in Asaas before deletion');
            toast.error('Aviso: O cliente foi excluído, mas não foi possível cancelar a assinatura no Asaas automaticamente.');
          }
        } catch (e) {
          console.error('Error calling delete-subscription API', e);
        }
      }
      try {
        const paymentsRes = await authFetch(`/api/asaas/payments?customer=${clientToDelete.asaasCustomerId}`);
        if (paymentsRes.ok) {
          const paymentsData = await paymentsRes.json();
          const payments = paymentsData.data || [];
          for (const payment of payments) {
            if (payment.status === 'PENDING' || payment.status === 'OVERDUE') {
              await authFetch('/api/asaas/delete-payment', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ paymentId: payment.id }) });
            }
          }
        }
      } catch (e) {
        console.error('Error cancelling pending payments before deletion', e);
      }
    }

    if (clientToDelete?.siteLink) {
      try {
        const monitorsRes = await authFetch('/api/uptimerobot/monitors');
        if (monitorsRes.ok) {
          const monitors = await monitorsRes.json();
          const clientUrl = clientToDelete.siteLink.replace(/^https?:\/\//, '').replace(/\/$/, '');
          const monitorToDelete = monitors.find((m: any) => m.url.includes(clientUrl));
          if (monitorToDelete) {
            await authFetch('/api/uptimerobot/monitors', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: monitorToDelete.id }) });
            console.log('Monitor deleted from UptimeRobot');
          }
        }
      } catch (e) {
        console.error('Error deleting monitor from UptimeRobot', e);
      }
    }

    setEditingClient(null);
    try {
      await deleteDoc(doc(db, 'users', userId, 'clients', clientId));
    } catch (error: any) {
      console.error(error);
      toast.error(`Erro ao excluir: ${error.message}`);
    }
  };

  // ═══ Export CSV ═══
  const handleExportCSV = (dataToExport: Client[]) => {
    const headers = ['Nome', 'WhatsApp', 'CPF/CNPJ', 'Email', 'Plano', 'Status', 'Status Pagamento', 'Vencimento'];
    const csvContent = [
      headers.join(','),
      ...dataToExport.map((c) =>
        [`"${c.name}"`, `"${c.whatsapp}"`, `"${c.cpfCnpj || ''}"`, `"${c.email || ''}"`, `"${c.plan}"`, `"${c.status}"`, `"${c.paymentStatus || 'N/A'}"`, `"${c.nextDueDate ? new Date(c.nextDueDate).toLocaleDateString('pt-BR') : ''}"`].join(',')
      ),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `clientes_hub_central_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Lista de clientes exportada com sucesso!');
  };

  return {
    isSyncing,
    handleSaveClient,
    handleDeleteClient,
    handleExportCSV,
    syncPayments,
    isChurnRisk,
    isComboNearRenewal,
  };
}
