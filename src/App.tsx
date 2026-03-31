import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  LayoutDashboard, Users, Plus, X, DollarSign, CheckCircle, Clock, 
  MapPin, Phone, Tag, Menu, Building2, FileText, Briefcase, AlignLeft,
  Search, BarChart3, Calendar, Paperclip, Copy, MessageCircle, Trash2, Snowflake, LogOut, Globe, Image as ImageIcon, Sparkles, Wand2, Star, Zap,
  Filter, ArrowDownAZ, ArrowUpRight, RefreshCw, Download, Link as LinkIcon, AlertTriangle, TrendingDown, TrendingUp, Settings, MessageSquare,
  Megaphone, Pin, ShoppingCart, Eye, EyeOff, Package, Edit2, Map as MapIcon, Loader2
} from 'lucide-react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area, CartesianGrid } from 'recharts';
import { auth, db, isFirebaseConfigured } from './lib/firebase';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { collection, doc, setDoc, onSnapshot, deleteDoc, updateDoc, query, where, getDocs, addDoc } from 'firebase/firestore';
import Auth from './components/Auth';
import CalendarView from './components/CalendarView';
import MonitoringView from './components/MonitoringView';
import ClientMapView from './components/ClientMapView';
import { toast } from 'sonner';
import { z } from 'zod';
import { clientSchema, Client, Offer, ClientLog, ClientAttachment, ClientStage, ClientCredential, OnboardingQuestion, Expense, PlanType, SiteStatus } from './types';
import { delay, getSetupPrice, getPlanPrice, calculateDiscount, updateReferrerSubscription } from './helpers';


// Re-export types for backward compatibility (other components import from './App')
export type { PlanType, SiteStatus, ClientLog, ClientAttachment, ClientStage, ClientCredential, Offer, Client, OnboardingQuestion, Expense } from './types';
export { clientSchema } from './types';
export { getSetupPrice, getPlanPrice, calculateDiscount, updateReferrerSubscription } from './helpers';


import ConfirmationModal from './components/ConfirmationModal';
import OfferModal from './components/OfferModal';
import ClientModal from './components/ClientModal';
import ReferralsView from './components/ReferralsView';



function CRM({ user }: { user: User }) {
  const [clients, setClients] = useState<Client[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const clientsPerPage = 9;
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const syncPayments = async () => {
    setIsSyncing(true);
    try {
      const clientsToSync = clients.filter(c => c.asaasCustomerId && c.status !== 'Cancelado');
      let updatedCount = 0;
      
      for (const client of clientsToSync) {
        try {
          // Fetch all payments for this customer
          const paymentsRes = await fetch(`/api/asaas/payments?customer=${client.asaasCustomerId}`);
          
          let subscription = null;
          if (client.asaasSubscriptionId) {
            const subRes = await fetch(`/api/asaas/subscriptions/${client.asaasSubscriptionId}`);
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
              if (!targetPayment) {
                targetPayment = payments.find((p: any) => p.status === 'PENDING');
              }
              if (!targetPayment) {
                targetPayment = [...payments].sort((a: any, b: any) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime())[0];
              }
              
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
              
              // Use the target payment's due date if it's pending/overdue, otherwise use subscription's next due date
              const nextDueDate = (status === 'PENDING' || status === 'OVERDUE') 
                ? latestPayment.dueDate 
                : (subscription?.nextDueDate || client.nextDueDate);
              
              if (newPaymentStatus !== client.paymentStatus || newSiteStatus !== client.status || nextDueDate !== client.nextDueDate || (latestPayment.invoiceUrl && latestPayment.invoiceUrl !== client.invoiceUrl)) {
                const updatedClient = {
                  ...client,
                  paymentStatus: newPaymentStatus,
                  status: newSiteStatus,
                  nextDueDate: nextDueDate,
                  invoiceUrl: latestPayment.invoiceUrl || client.invoiceUrl
                };
                
                await setDoc(doc(db, 'users', user.uid, 'clients', client.id), updatedClient);
                updatedCount++;
              }
            }
          }
        } catch (e) {
          console.error(`Error syncing client ${client.name}:`, e);
        }
      }
      
      if (updatedCount > 0) {
        // The onSnapshot listener will automatically update the UI
        console.log(`Synced ${updatedCount} clients`);
      }
    } catch (error) {
      console.error("Error syncing payments:", error);
    } finally {
      setIsSyncing(false);
    }
  };
  const [view, setView] = useState<'dashboard' | 'analytics' | 'support' | 'finance' | 'settings' | 'calendar' | 'referrals' | 'marketing' | 'products' | 'monitoring' | 'map'>('dashboard');
  const [dashboardMode, setDashboardMode] = useState<'list' | 'kanban'>('list');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [isOfferModalOpen, setIsOfferModalOpen] = useState(false);
  const [editingOffer, setEditingOffer] = useState<Partial<Offer> | null>(null);
  const [isDeleteOfferConfirmOpen, setIsDeleteOfferConfirmOpen] = useState(false);
  const [offerToDelete, setOfferToDelete] = useState<string | null>(null);
  const [lastDeletedOffer, setLastDeletedOffer] = useState<Offer | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<SiteStatus | 'Todos'>('Todos');
  const [sortBy, setSortBy] = useState<'recent' | 'alphabetical' | 'value'>('recent');

  // Theme State
  const [themeColor, setThemeColor] = useState(() => {
    return localStorage.getItem('theme-color') || 'orange';
  });
  
  // Churn Risk Setting
  const [churnRiskDays, setChurnRiskDays] = useState(() => {
    return parseInt(localStorage.getItem('churnRiskDays') || '15', 10);
  });

  const [defaultStages, setDefaultStages] = useState<{id: string, name: string}[]>([
    { id: '1', name: 'Briefing' },
    { id: '2', name: 'Design UI' },
    { id: '3', name: 'Desenvolvimento' },
    { id: '4', name: 'Revisão' },
    { id: '5', name: 'Publicação' }
  ]);

  const [onboardingQuestions, setOnboardingQuestions] = useState<OnboardingQuestion[]>([
    { id: '1', text: 'Qual o nome da sua empresa?', type: 'text', required: true },
    { id: '2', text: 'Descreva brevemente o seu negócio', type: 'textarea', required: true },
    { id: '3', text: 'Quais são as suas cores preferidas?', type: 'text', required: false },
    { id: '4', text: 'Logo da Empresa (Opcional)', type: 'file', required: false }
  ]);

  useEffect(() => {
    if (!user) return;
    const settingsRef = doc(db, 'users', user.uid, 'settings', 'preferences');
    const unsubscribe = onSnapshot(settingsRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.defaultStages) setDefaultStages(data.defaultStages);
        if (data.onboardingQuestions) setOnboardingQuestions(data.onboardingQuestions);
      }
    });
    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    document.documentElement.classList.add('dark');
  }, []);

  useEffect(() => {
    localStorage.setItem('churnRiskDays', churnRiskDays.toString());
  }, [churnRiskDays]);

  useEffect(() => {
    localStorage.setItem('theme-color', themeColor);
    document.documentElement.classList.remove('theme-orange', 'theme-blue', 'theme-green', 'theme-purple', 'theme-rose');
    document.documentElement.classList.add(`theme-${themeColor}`);
  }, [themeColor]);
  const [supportRequests, setSupportRequests] = useState<any[]>([]);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyMessage, setReplyMessage] = useState('');
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [newExpense, setNewExpense] = useState<Partial<Expense>>({ category: 'Ferramentas' });

  const [globalAnnouncement, setGlobalAnnouncement] = useState<{title: string, message: string, type: string, isActive: boolean}>({ title: '', message: '', type: 'info', isActive: false });
  const [services, setServices] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    const globalRef = doc(db, 'users', user.uid, 'settings', 'global');
    const unsubGlobal = onSnapshot(globalRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.announcement) setGlobalAnnouncement(data.announcement);
      }
    });

    const servicesRef = collection(db, 'users', user.uid, 'services');
    const unsubServices = onSnapshot(servicesRef, (snapshot) => {
      const loadedServices: any[] = [];
      snapshot.forEach(doc => loadedServices.push({ id: doc.id, ...doc.data() }));
      setServices(loadedServices.sort((a, b) => (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0)));
    });

    return () => {
      unsubGlobal();
      unsubServices();
    };
  }, [user]);

  useEffect(() => {
    setLoading(true);
    setErrorMsg(null);
    let timeoutId: NodeJS.Timeout;
    let unsubscribeClients: () => void = () => {};
    let unsubscribeRequests: () => void = () => {};
    let unsubscribeExpenses: () => void = () => {};
    let unsubscribeOffers: () => void = () => {};

    try {
      const offersRef = collection(db, 'users', user.uid, 'offers');
      unsubscribeOffers = onSnapshot(offersRef, async (snapshot) => {
        if (snapshot.empty) {
          // Seed initial offers
          const defaultOffers: Offer[] = [
            { id: Date.now().toString(36) + Math.random().toString(36).substring(2), name: 'Ecossistema Essencial', type: 'SUBSCRIPTION', price: 397, setupPrice: 2500, active: true, createdAt: Date.now() },
            { id: Date.now().toString(36) + Math.random().toString(36).substring(2), name: 'Profissional', type: 'SUBSCRIPTION', price: 897, setupPrice: 7500, active: true, createdAt: Date.now() }
          ];
          for (const offer of defaultOffers) {
            await setDoc(doc(db, 'users', user.uid, 'offers', offer.id), offer);
          }
        } else {
          const loadedOffers: Offer[] = [];
          snapshot.forEach((doc) => {
            loadedOffers.push(doc.data() as Offer);
          });
          setOffers(loadedOffers.sort((a, b) => b.createdAt - a.createdAt));
        }
      });

      const clientsRef = collection(db, 'users', user.uid, 'clients');
      unsubscribeClients = onSnapshot(clientsRef, (snapshot) => {
        const loadedClients: Client[] = [];
        snapshot.forEach((doc) => {
          loadedClients.push(doc.data() as Client);
        });
        setClients(loadedClients);
        setLoading(false);
        clearTimeout(timeoutId);
      }, (error: any) => {
        console.error("Error fetching clients:", error);
        setErrorMsg(`Erro ao carregar dados do banco: ${error.message}`);
        setLoading(false);
        clearTimeout(timeoutId);
      });

      const requestsRef = collection(db, 'users', user.uid, 'supportRequests');
      unsubscribeRequests = onSnapshot(requestsRef, (snapshot) => {
        const loadedRequests: any[] = [];
        snapshot.forEach((doc) => {
          loadedRequests.push({ id: doc.id, ...doc.data() });
        });
        loadedRequests.sort((a, b) => {
          const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
          const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
          return timeB - timeA;
        });
        setSupportRequests(loadedRequests);
      });

      const expensesRef = collection(db, 'users', user.uid, 'expenses');
      unsubscribeExpenses = onSnapshot(expensesRef, (snapshot) => {
        const loadedExpenses: Expense[] = [];
        snapshot.forEach((doc) => {
          loadedExpenses.push(doc.data() as Expense);
        });
        setExpenses(loadedExpenses.sort((a, b) => b.date - a.date));
      });

      timeoutId = setTimeout(() => {
        console.warn("Firestore initialization timed out.");
        setLoading(false);
        setErrorMsg("O tempo limite de conexão com o banco de dados foi excedido. Verifique sua conexão ou se o navegador está bloqueando o acesso.");
      }, 10000);

    } catch (err: any) {
      console.error("Firestore Init Error:", err);
      setErrorMsg(err.message);
      setLoading(false);
    }

    return () => {
      unsubscribeClients();
      unsubscribeRequests();
      unsubscribeExpenses();
      unsubscribeOffers();
      clearTimeout(timeoutId);
    };
  }, [user.uid]);

  const handleSaveOffer = async (offerData: Partial<Offer>) => {
    if (!auth.currentUser) return;
    try {
      if (!offerData.name || offerData.price === undefined) {
        toast.error('Nome e preço são obrigatórios');
        return;
      }
      
      const isNew = !offerData.id;
      const offerRef = isNew ? doc(collection(db, 'users', auth.currentUser.uid, 'offers')) : doc(db, 'users', auth.currentUser.uid, 'offers', offerData.id!);
      const offerId = offerRef.id;
      
      const offerToSave: any = {
        id: offerId,
        name: offerData.name,
        type: offerData.type || 'SUBSCRIPTION',
        price: offerData.price,
        active: offerData.active !== undefined ? offerData.active : true,
        createdAt: isNew ? Date.now() : (offerData.createdAt || Date.now()),
      };

      if (offerData.setupPrice !== undefined) {
        offerToSave.setupPrice = offerData.setupPrice;
      }
      if (offerData.maxInstallments !== undefined) {
        offerToSave.maxInstallments = offerData.maxInstallments;
      }

      await setDoc(offerRef, offerToSave);
      toast.success(isNew ? 'Oferta criada com sucesso!' : 'Oferta atualizada com sucesso!');
      setIsOfferModalOpen(false);
    } catch (error: any) {
      console.error("Error saving offer:", error);
      toast.error(`Erro ao salvar oferta: ${error.message || 'Erro desconhecido'}`);
    }
  };

  const handleDeleteOffer = async (offerId: string) => {
    if (!auth.currentUser) return;
    const offerToBackup = offers.find(o => o.id === offerId);
    try {
      await deleteDoc(doc(db, 'users', auth.currentUser.uid, 'offers', offerId));
      if (offerToBackup) setLastDeletedOffer(offerToBackup);
      toast.success('Oferta excluída com sucesso!', {
        action: {
          label: 'Desfazer',
          onClick: () => offerToBackup && undoDeleteOffer(offerToBackup)
        }
      });
      setIsDeleteOfferConfirmOpen(false);
      setOfferToDelete(null);
    } catch (error) {
      console.error("Error deleting offer:", error);
      toast.error('Erro ao excluir oferta');
    }
  };

  const undoDeleteOffer = async (offer: Offer) => {
    if (!auth.currentUser || !offer) return;
    try {
      await setDoc(doc(db, 'users', auth.currentUser.uid, 'offers', offer.id), offer);
      setLastDeletedOffer(null);
      toast.success('Oferta restaurada!');
    } catch (error) {
      console.error("Error undoing delete:", error);
      toast.error('Erro ao restaurar oferta');
    }
  };

  const restoreDefaultOffers = async () => {
    if (!auth.currentUser) return;
    try {
      const defaultOffers: Offer[] = [
        { id: Date.now().toString(36) + Math.random().toString(36).substring(2), name: 'Ecossistema Essencial', type: 'SUBSCRIPTION', price: 397, setupPrice: 2500, active: true, createdAt: Date.now() },
        { id: Date.now().toString(36) + Math.random().toString(36).substring(2), name: 'Profissional', type: 'SUBSCRIPTION', price: 897, setupPrice: 7500, active: true, createdAt: Date.now() }
      ];
      for (const offer of defaultOffers) {
        // Check if offer already exists by name to avoid duplicates
        const exists = offers.some(o => o.name === offer.name);
        if (!exists) {
          await setDoc(doc(db, 'users', auth.currentUser.uid, 'offers', offer.id), offer);
        }
      }
      toast.success('Ofertas padrão restauradas com sucesso!');
    } catch (error) {
      console.error("Error restoring default offers:", error);
      toast.error('Erro ao restaurar ofertas padrão');
    }
  };

  const handleSaveClient = async (clientData: Partial<Client>) => {
    try {
      clientSchema.parse(clientData);
    } catch (error) {
      if (error instanceof z.ZodError) {
        error.issues.forEach(err => toast.error(err.message));
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
      plan: clientData.plan as PlanType || '',
      offerId: clientData.offerId,
      planPrice: clientData.planPrice,
      setupPrice: clientData.setupPrice,
      status: clientData.status as SiteStatus || 'Em Desenvolvimento',
      siteLink: clientData.siteLink,
      niche: clientData.niche,
      notes: clientData.notes,
      logs: clientData.logs,
      leadSource: clientData.leadSource,
      stages: clientData.stages || (isNew ? defaultStages.map(s => ({ ...s, completed: false, approvedAt: null })) : undefined),
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
      referralRewardType: (clientData.billingCycle === 'YEARLY' || clientData.isCombo) 
        ? 'commission' 
        : (clientData.referralRewardType || (editingClient?.referralRewardType || 'discount')),
    };

    try { 
      // Handle Update Subscription
      if (!isNew && client.asaasSubscriptionId && editingClient && (
          editingClient.recurringPaymentDay !== client.recurringPaymentDay || 
          editingClient.billingType !== client.billingType || 
          editingClient.billingCycle !== client.billingCycle ||
          editingClient.plan !== client.plan
      )) {
        let monthlyValue = getPlanPrice(client.plan, client.billingCycle, client);
        monthlyValue -= calculateDiscount(client as Client, clients);

        let nextSubDateStr = client.nextDueDate;
        if (editingClient.recurringPaymentDay !== client.recurringPaymentDay) {
          const today = new Date();
          let nextSubDate = new Date(today.getFullYear(), today.getMonth(), client.recurringPaymentDay, 12, 0, 0);
          
          if (nextSubDate.getTime() < today.getTime()) {
            nextSubDate.setMonth(nextSubDate.getMonth() + 1);
          }
          nextSubDateStr = nextSubDate.toISOString().split('T')[0];
        }

        const updateRes = await fetch('/api/asaas/update-subscription', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            subscriptionId: client.asaasSubscriptionId,
            ...(nextSubDateStr ? { nextDueDate: nextSubDateStr } : {}),
            updatePendingPayments: true,
            billingType: client.billingType,
            cycle: client.billingCycle === 'YEARLY' ? 'YEARLY' : 'MONTHLY',
            value: monthlyValue,
            description: `Assinatura ${client.billingCycle === 'YEARLY' ? 'Anual' : 'Mensal'} - Plano ${client.plan} - Hub Central`
          })
        });
        if (!updateRes.ok) {
          console.error("Failed to update subscription in Asaas");
          toast.error("Aviso: Não foi possível atualizar a assinatura no Asaas.");
        } else {
          if (nextSubDateStr) client.nextDueDate = nextSubDateStr;
        }
      }

      // Handle Cancellation
      if (!isNew && client.status === 'Cancelado') {
        // Handle Referral Revocation
        if (editingClient && editingClient.referredBy) {
          const referrer = clients.find(c => c.id === editingClient.referredBy);
          if (referrer) {
            const referralsRef = collection(db, 'users', user.uid, 'referrals');
            const q = query(referralsRef, where('referredClientId', '==', client.id));
            const querySnapshot = await getDocs(q);
            
            if (!querySnapshot.empty) {
              const referralDoc = querySnapshot.docs[0];
              const referralData = referralDoc.data();
              
              if (referralData.status === 'confirmed' || referralData.status === 'applied') {
                const bonusToRevoke = referralData.bonusAmount || 0;
                
                // Update referrer balance
                const newBalance = Math.max(0, (referrer.referralBalance || 0) - bonusToRevoke);
                const newCount = Math.max(0, (referrer.referralCount || 0) - 1);
                
                await updateDoc(doc(db, 'users', user.uid, 'clients', referrer.id), {
                  referralBalance: newBalance,
                  referralCount: newCount
                });
                
                // Mark referral as cancelled
                await updateDoc(referralDoc.ref, {
                  status: 'cancelled',
                  bonusAmount: 0
                });

                if (referrer.referralRewardType === 'discount' || !referrer.referralRewardType) {
                  const updatedClients = clients.map(c => c.id === client.id ? { ...c, status: 'Cancelado' as SiteStatus } : c);
                  await updateReferrerSubscription(referrer.id, updatedClients);
                }
              }
            }
          }
        }

        if (client.asaasCustomerId) {
          // Cancel subscription if exists
          if (client.asaasSubscriptionId) {
          const delRes = await fetch('/api/asaas/delete-subscription', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ subscriptionId: client.asaasSubscriptionId })
          });
          if (!delRes.ok) {
            console.error("Failed to cancel subscription in Asaas");
            toast.error("Aviso: Não foi possível cancelar a assinatura no Asaas automaticamente.");
          } else {
            client.paymentStatus = 'N/A';
            client.invoiceUrl = undefined;
          }
        }

        // Cancel pending/overdue single charges
        try {
          const paymentsRes = await fetch(`/api/asaas/payments?customer=${client.asaasCustomerId}`);
          if (paymentsRes.ok) {
            const paymentsData = await paymentsRes.json();
            const payments = paymentsData.data || [];
            for (const payment of payments) {
              if (payment.status === 'PENDING' || payment.status === 'OVERDUE') {
                await fetch('/api/asaas/delete-payment', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ paymentId: payment.id })
                });
              }
            }
          }
        } catch (e) {
          console.error("Error cancelling pending payments", e);
        }
      }
    }

      // Integrate with Asaas for new clients or clients without Asaas ID
      if (!client.asaasCustomerId && client.cpfCnpj && client.email && client.status !== 'Cancelado') {
        // 1. Create Customer in Asaas
        const phoneClean = client.whatsapp ? client.whatsapp.replace(/\D/g, '') : '';
        const isMobile = phoneClean.length === 11;
        const isLandline = phoneClean.length === 10;
        
        const customerRes = await fetch('/api/asaas/customers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: client.name,
            cpfCnpj: client.cpfCnpj ? client.cpfCnpj.replace(/\D/g, '') : '',
            email: client.email,
            mobilePhone: isMobile ? phoneClean : undefined,
            phone: isLandline ? phoneClean : undefined
          })
        });
        
        if (customerRes.ok) {
          const customerData = await customerRes.json();
          client.asaasCustomerId = customerData.id;

          // 2. Create Subscription in Asaas
          const today = new Date();
          const firstPaymentDate = client.firstPaymentDate || today.toISOString().split('T')[0];
          
          let monthlyValue = getPlanPrice(client.plan, client.billingCycle, client);
          monthlyValue -= calculateDiscount(client as Client, clients);
          let setupValue = getSetupPrice(client.plan, client);

          const selectedOffer = offers.find(o => o.id === client.offerId) || offers.find(o => o.name === client.plan);
          const isSinglePayment = selectedOffer?.type === 'SINGLE';

          if (client.isCombo || isSinglePayment) {
            // COMBO LOGIC: Setup + Annual in one parcelable payment link
            // Or SINGLE PAYMENT LOGIC: One-time payment with installments
            const totalValue = isSinglePayment ? Math.max(0, monthlyValue + (client.setupPrice || 0)) : monthlyValue;
            const paymentName = isSinglePayment ? `Pagamento Único - ${client.plan}` : `Combo (Setup + Plano Anual) - Plano ${client.plan}`;
            const paymentDesc = isSinglePayment ? `Pagamento referente à oferta ${client.plan}.` : `Acesso anual ao Plano ${client.plan} com taxa de setup inclusa.`;
            
            const paymentRes = await fetch('/api/asaas/payment-links', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                name: paymentName,
                description: paymentDesc,
                value: totalValue,
                billingType: client.billingType || 'CREDIT_CARD',
                chargeType: client.billingType === 'PIX' ? 'DETACHED' : 'INSTALLMENT', // Allow client to choose installments if credit card
                ...(client.billingType !== 'PIX' ? { maxInstallmentCount: client.maxInstallments || 12 } : {}), // Max installments
                dueDateLimitDays: 3, // 3 business days for payment due date
                customer: client.asaasCustomerId,
                endDate: new Date(new Date().getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Link valid for 7 days
              })
            });

            if (paymentRes.ok) {
              const paymentData = await paymentRes.json();
              client.invoiceUrl = paymentData.url; // Payment Link URL
              client.nextDueDate = firstPaymentDate;
              
              if (client.isCombo) {
                // Set renewal date to 1 year from now
                const renewalDate = new Date(firstPaymentDate + 'T12:00:00Z');
                renewalDate.setFullYear(renewalDate.getFullYear() + 1);
                client.comboRenewalDate = renewalDate.toISOString().split('T')[0];
                toast.success("Combo criado com sucesso! O cliente pode escolher o parcelamento no checkout.");
              } else {
                toast.success("Link de pagamento criado com sucesso! O cliente pode escolher o parcelamento no checkout.");
              }
            } else {
              const errorData = await paymentRes.json();
              toast.error(`Erro ao criar link de pagamento: ${errorData.error || 'Erro desconhecido'}`);
              console.error("Payment Link Error:", errorData);
            }
          } else {
            // STANDARD LOGIC: Setup Fee + Subscription
            if (setupValue > 0) {
              // A. Create single charge for first payment (Setup Fee)
              const paymentRes = await fetch('/api/asaas/payments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  customer: client.asaasCustomerId,
                  billingType: client.billingType,
                  value: setupValue,
                  dueDate: firstPaymentDate,
                  description: `Taxa de Adesão - Plano ${client.plan} - Hub Central`
                })
              });

              if (paymentRes.ok) {
                const paymentData = await paymentRes.json();
                client.invoiceUrl = paymentData.invoiceUrl || paymentData.bankSlipUrl;
                client.nextDueDate = firstPaymentDate;
              } else {
                console.error("Failed to create initial payment", await paymentRes.text());
                toast.error("Erro ao criar taxa de adesão no Asaas.");
              }

              // B. Create subscription for future payments
              const firstDateObj = new Date(firstPaymentDate + 'T12:00:00Z');
              let nextSubDate = new Date(firstDateObj);
              
              if (client.recurringPaymentDay) {
                nextSubDate = new Date(firstDateObj.getFullYear(), firstDateObj.getMonth(), client.recurringPaymentDay, 12, 0, 0);
                
                if (nextSubDate.getTime() <= firstDateObj.getTime()) {
                  nextSubDate.setMonth(nextSubDate.getMonth() + 1);
                }

                const diffTime = nextSubDate.getTime() - firstDateObj.getTime();
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
                if (diffDays < 15) {
                  nextSubDate.setMonth(nextSubDate.getMonth() + 1);
                }
              } else {
                nextSubDate.setMonth(nextSubDate.getMonth() + 1);
              }
              
              const nextSubDateStr = nextSubDate.toISOString().split('T')[0];

              const subRes = await fetch('/api/asaas/subscriptions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  customer: client.asaasCustomerId,
                  billingType: client.billingType,
                  cycle: client.billingCycle === 'YEARLY' ? 'YEARLY' : 'MONTHLY',
                  value: monthlyValue,
                  nextDueDate: nextSubDateStr,
                  description: `Assinatura ${client.billingCycle === 'YEARLY' ? 'Anual' : 'Mensal'} - Plano ${client.plan} - Hub Central`
                })
              });

              if (subRes.ok) {
                const subData = await subRes.json();
                client.asaasSubscriptionId = subData.id;
              } else {
                let errText = await subRes.text();
                let err;
                try { err = JSON.parse(errText); } catch(e) { err = { error: errText }; }
                console.error("Asaas Subscription Error:", err);
                toast.error(`Erro ao criar assinatura no Asaas: ${err.error || 'Erro desconhecido'}`);
              }
            } else {
              // No setup fee, just create the subscription starting on firstPaymentDate
              const subRes = await fetch('/api/asaas/subscriptions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  customer: client.asaasCustomerId,
                  billingType: client.billingType,
                  cycle: client.billingCycle === 'YEARLY' ? 'YEARLY' : 'MONTHLY',
                  value: monthlyValue,
                  nextDueDate: firstPaymentDate,
                  description: `Assinatura ${client.billingCycle === 'YEARLY' ? 'Anual' : 'Mensal'} - Plano ${client.plan} - Hub Central`
                })
              });

              if (subRes.ok) {
                const subData = await subRes.json();
                client.asaasSubscriptionId = subData.id;
                client.nextDueDate = firstPaymentDate;
                toast.success("Assinatura criada com sucesso!");
              } else {
                let errText = await subRes.text();
                let err;
                try { err = JSON.parse(errText); } catch(e) { err = { error: errText }; }
                console.error("Asaas Subscription Error:", err);
                toast.error(`Erro ao criar assinatura no Asaas: ${err.error || 'Erro desconhecido'}`);
              }
            }
          }
        } else {
          let errText = await customerRes.text();
          let err;
          try { err = JSON.parse(errText); } catch(e) { err = { error: errText }; }
          console.error("Asaas Customer Error:", err);
          toast.error(`Erro ao criar cliente no Asaas: ${err.error || 'Erro desconhecido'}`);
        }
      }

      const cleanClient = Object.fromEntries(Object.entries(client).filter(([_, v]) => v !== undefined));
      await setDoc(doc(db, 'users', user.uid, 'clients', client.id), cleanClient);
      
      setIsModalOpen(false); 
      setEditingClient(null);
    } catch (error: any) { 
      console.error("Save Error:", error);
      toast.error(`Erro ao salvar cliente: ${error.message}`);
    }
  };

  const handleDeleteClient = async (clientId: string) => {
    setIsModalOpen(false);
    
    // Find the client to get the subscription ID
    const clientToDelete = clients.find(c => c.id === clientId);
    
    if (clientToDelete?.asaasCustomerId) {
      if (clientToDelete.asaasSubscriptionId) {
        try {
          const delRes = await fetch('/api/asaas/delete-subscription', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ subscriptionId: clientToDelete.asaasSubscriptionId })
          });
          if (!delRes.ok) {
            console.error("Failed to cancel subscription in Asaas before deletion");
            toast.error("Aviso: O cliente foi excluído, mas não foi possível cancelar a assinatura no Asaas automaticamente.");
          }
        } catch (e) {
          console.error("Error calling delete-subscription API", e);
        }
      }

      // Cancel pending/overdue single charges
      try {
        const paymentsRes = await fetch(`/api/asaas/payments?customer=${clientToDelete.asaasCustomerId}`);
        if (paymentsRes.ok) {
          const paymentsData = await paymentsRes.json();
          const payments = paymentsData.data || [];
          for (const payment of payments) {
            if (payment.status === 'PENDING' || payment.status === 'OVERDUE') {
              await fetch('/api/asaas/delete-payment', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ paymentId: payment.id })
              });
            }
          }
        }
      } catch (e) {
        console.error("Error cancelling pending payments before deletion", e);
      }
    }

    // Delete UptimeRobot monitor if exists
    if (clientToDelete?.siteLink) {
      try {
        const monitorsRes = await fetch('/api/uptimerobot/monitors');
        if (monitorsRes.ok) {
          const monitors = await monitorsRes.json();
          const clientUrl = clientToDelete.siteLink.replace(/^https?:\/\//, '').replace(/\/$/, '');
          const monitorToDelete = monitors.find((m: any) => m.url.includes(clientUrl));
          
          if (monitorToDelete) {
            await fetch('/api/uptimerobot/monitors', {
              method: 'DELETE',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ id: monitorToDelete.id })
            });
            console.log("Monitor deleted from UptimeRobot");
          }
        }
      } catch (e) {
        console.error("Error deleting monitor from UptimeRobot", e);
      }
    }

    setEditingClient(null);
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'clients', clientId));
    } catch (error: any) {
      console.error(error);
      toast.error(`Erro ao excluir: ${error.message}`);
    }
  };

  const filteredClients = useMemo(() => {
    let result = clients.filter(c => {
      const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            c.whatsapp.includes(searchTerm) ||
                            (c.cpfCnpj && c.cpfCnpj.includes(searchTerm)) ||
                            (c.niche && c.niche.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesStatus = filterStatus === 'Todos' || c.status === filterStatus;
      return matchesSearch && matchesStatus;
    });

    result.sort((a, b) => {
      if (sortBy === 'alphabetical') {
        return a.name.localeCompare(b.name);
      } else if (sortBy === 'value') {
        let valA = getPlanPrice(a.plan, a.billingCycle, a);
        let valB = getPlanPrice(b.plan, b.billingCycle, b);
        return valB - valA;
      } else {
        return b.createdAt - a.createdAt;
      }
    });

    return result;
  }, [clients, searchTerm, filterStatus, sortBy]);

  const handleExportCSV = () => {
    const headers = ['Nome', 'WhatsApp', 'CPF/CNPJ', 'Email', 'Plano', 'Status', 'Status Pagamento', 'Vencimento'];
    const csvContent = [
      headers.join(','),
      ...filteredClients.map(c => [
        `"${c.name}"`,
        `"${c.whatsapp}"`,
        `"${c.cpfCnpj || ''}"`,
        `"${c.email || ''}"`,
        `"${c.plan}"`,
        `"${c.status}"`,
        `"${c.paymentStatus || 'N/A'}"`,
        `"${c.nextDueDate ? new Date(c.nextDueDate).toLocaleDateString('pt-BR') : ''}"`
      ].join(','))
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

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterStatus, sortBy]);

  const isChurnRisk = (client: Client) => {
    if (client.status === 'Cancelado') return false;
    if (client.paymentStatus === 'OVERDUE' && client.nextDueDate) {
      const dueDate = new Date(client.nextDueDate);
      const today = new Date();
      const diffTime = today.getTime() - dueDate.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays >= churnRiskDays;
    }
    return false;
  };

  const isComboNearRenewal = (client: Client) => {
    if (!client.isCombo || !client.comboRenewalDate) return false;
    const renewalDate = new Date(client.comboRenewalDate + 'T12:00:00Z');
    const today = new Date();
    const diffTime = renewalDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    // Alert if renewal is within 30 days
    return diffDays <= 30 && diffDays >= -7;
  };

  const renderDashboard = () => {
    const indexOfLastClient = currentPage * clientsPerPage;
    const indexOfFirstClient = indexOfLastClient - clientsPerPage;
    const currentClients = filteredClients.slice(indexOfFirstClient, indexOfLastClient);
    const totalPages = Math.ceil(filteredClients.length / clientsPerPage);

    // Calculate Metrics
    const activeClients = clients.filter(c => c.status === 'Ativo').length;
    const mrr = clients.filter(c => c.status === 'Ativo' || c.status === 'Inadimplente').reduce((acc, c) => {
      return acc + getPlanPrice(c.plan, c.billingCycle, c);
    }, 0);
    const overdueAmount = clients.filter(c => c.status === 'Inadimplente').reduce((acc, c) => {
      return acc + getPlanPrice(c.plan, c.billingCycle, c);
    }, 0);
    
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    const expectedThisMonth = clients.filter(c => {
      if (c.status === 'Cancelado') return false;
      if (!c.nextDueDate) return true; // Assume it's due if no date
      const dueDate = new Date(c.nextDueDate);
      return dueDate.getMonth() === currentMonth && dueDate.getFullYear() === currentYear;
    }).reduce((acc, c) => {
      return acc + getPlanPrice(c.plan, c.billingCycle, c);
    }, 0);

    // Chart Data
    const statusData = [
      { name: 'Em Dev', value: clients.filter(c => c.status === 'Em Desenvolvimento').length, color: '#eab308' },
      { name: 'Ativo', value: clients.filter(c => c.status === 'Ativo').length, color: '#10b981' },
      { name: 'Inadimplente', value: clients.filter(c => c.status === 'Inadimplente').length, color: '#ef4444' },
      { name: 'Cancelado', value: clients.filter(c => c.status === 'Cancelado').length, color: '#6b7280' },
    ];

    const nicheCounts = clients.reduce((acc, c) => {
      const niche = c.niche || 'Outros';
      acc[niche] = (acc[niche] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const nicheData = Object.entries(nicheCounts)
      .map(([name, value]) => ({ name, value: Number(value) }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5); // Top 5 niches
      
    const COLORS = ['#f97316', '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6', '#f43f5e'];

    const overdueClients = clients.filter(c => c.status === 'Inadimplente' || c.paymentStatus === 'OVERDUE');
    const comboRenewalClients = clients.filter(c => isComboNearRenewal(c));

    return (
      <div className="flex-1 overflow-y-auto p-6 bg-transparent custom-scrollbar relative z-10">
        <div className="max-w-7xl mx-auto">
          
          {/* Overdue Alert Panel */}
          {overdueClients.length > 0 && (
            <div className="mb-4 bg-red-500/10 border border-red-500/30 rounded-2xl p-5 shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center">
                <div className="p-3 bg-red-500/20 text-red-400 rounded-xl mr-4 shrink-0">
                  <AlertTriangle size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">Atenção: {overdueClients.length} cliente(s) inadimplente(s)</h3>
                  <p className="text-sm text-red-200/80">Verifique a situação e envie um lembrete de cobrança.</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {overdueClients.slice(0, 3).map(c => (
                  <button 
                    key={c.id} 
                    onClick={() => { setEditingClient(c); setIsModalOpen(true); }}
                    className="px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 text-red-300 text-sm rounded-lg transition-colors flex items-center"
                  >
                    {c.name.split(' ')[0]}
                  </button>
                ))}
                {overdueClients.length > 3 && (
                  <button 
                    onClick={() => { setFilterStatus('Inadimplente'); setView('dashboard'); }}
                    className="px-3 py-1.5 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:bg-white/10 border border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-300 text-sm rounded-lg transition-colors"
                  >
                    + {overdueClients.length - 3}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Combo Renewal Alert Panel */}
          {comboRenewalClients.length > 0 && (
            <div className="mb-8 bg-purple-500/10 border border-purple-500/30 rounded-2xl p-5 shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center">
                <div className="p-3 bg-purple-500/20 text-purple-400 rounded-xl mr-4 shrink-0">
                  <Zap size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">Renovação de Combo: {comboRenewalClients.length} cliente(s)</h3>
                  <p className="text-sm text-purple-200/80">Clientes com plano anual combo vencendo em breve. Entre em contato para renovar.</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {comboRenewalClients.slice(0, 3).map(c => (
                  <button 
                    key={c.id} 
                    onClick={() => { setEditingClient(c); setIsModalOpen(true); }}
                    className="px-3 py-1.5 bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/30 text-purple-300 text-sm rounded-lg transition-colors flex items-center"
                  >
                    {c.name.split(' ')[0]}
                  </button>
                ))}
                {comboRenewalClients.length > 3 && (
                  <button 
                    onClick={() => { setView('dashboard'); }}
                    className="px-3 py-1.5 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:bg-white/10 border border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-300 text-sm rounded-lg transition-colors"
                  >
                    + {comboRenewalClients.length - 3}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Metrics Dashboard */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div className="bg-gray-100 dark:bg-white/5 backdrop-blur-xl border border-gray-200 dark:border-white/10 p-5 rounded-2xl flex items-center shadow-lg">
              <div className="p-3 bg-emerald-500/20 text-emerald-400 rounded-xl mr-4">
                <Users size={24} />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Clientes Ativos</p>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{activeClients}</h3>
              </div>
            </div>
            
            <div className="bg-gray-100 dark:bg-white/5 backdrop-blur-xl border border-gray-200 dark:border-white/10 p-5 rounded-2xl flex items-center shadow-lg">
              <div className="p-3 bg-blue-500/20 text-blue-400 rounded-xl mr-4">
                <BarChart3 size={24} />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">MRR (Recorrente)</p>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white">R$ {mrr.toFixed(2).replace('.', ',')}</h3>
              </div>
            </div>

            <div className="bg-gray-100 dark:bg-white/5 backdrop-blur-xl border border-gray-200 dark:border-white/10 p-5 rounded-2xl flex items-center shadow-lg">
              <div className="p-3 bg-red-500/20 text-red-400 rounded-xl mr-4">
                <DollarSign size={24} />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Inadimplência</p>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white">R$ {overdueAmount.toFixed(2).replace('.', ',')}</h3>
              </div>
            </div>

            <div className="bg-gray-100 dark:bg-white/5 backdrop-blur-xl border border-gray-200 dark:border-white/10 p-5 rounded-2xl flex items-center shadow-lg">
              <div className="p-3 bg-primary-500/20 text-primary-400 rounded-xl mr-4">
                <Calendar size={24} />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">A Receber (Mês)</p>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white">R$ {expectedThisMonth.toFixed(2).replace('.', ',')}</h3>
              </div>
            </div>
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
            <div className="bg-gray-100 dark:bg-white/5 backdrop-blur-xl border border-gray-200 dark:border-white/10 p-5 rounded-2xl shadow-lg">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Clientes por Status</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={statusData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                    <XAxis dataKey="name" stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip cursor={{fill: '#ffffff05'}} contentStyle={{backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px'}} />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                      {statusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-gray-100 dark:bg-white/5 backdrop-blur-xl border border-gray-200 dark:border-white/10 p-5 rounded-2xl shadow-lg">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Top Nichos</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={nicheData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      labelLine={false}
                    >
                      {nicheData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px'}} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Quick Filters & Sort */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
            <div className="flex bg-gray-100 dark:bg-white/5 backdrop-blur-xl border border-gray-200 dark:border-white/10 p-1 rounded-2xl overflow-x-auto max-w-full custom-scrollbar">
              {['Todos', 'Em Desenvolvimento', 'Ativo', 'Inadimplente', 'Cancelado'].map((status) => {
                const count = status === 'Todos' ? clients.length : clients.filter(c => c.status === status).length;
                return (
                  <button
                    key={status}
                    onClick={() => { setFilterStatus(status as any); setCurrentPage(1); }}
                    className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                      filterStatus === status 
                        ? 'bg-primary-500 text-white shadow-sm' 
                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-primary-500/20 dark:bg-white/5'
                    }`}
                  >
                    {status} <span className="ml-1 opacity-60 text-xs">({count})</span>
                  </button>
                );
              })}
            </div>
            
            <div className="flex items-center space-x-2 bg-gray-100 dark:bg-white/5 backdrop-blur-xl border border-gray-200 dark:border-white/10 p-1 rounded-2xl">
              <button 
                onClick={syncPayments} 
                disabled={isSyncing}
                className={`px-3 py-2 rounded-xl text-sm font-medium transition-all flex items-center ${isSyncing ? 'text-primary-400 bg-gray-100 dark:bg-white/5' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-primary-500/20 dark:bg-white/5 hover:text-gray-900 dark:text-white'}`}
                title="Sincronizar pagamentos com Asaas"
              >
                <RefreshCw size={16} className={`mr-2 ${isSyncing ? 'animate-spin' : ''}`}/> 
                <span className="hidden sm:inline">Sincronizar</span>
              </button>
              <div className="w-px h-6 bg-gray-200 dark:bg-white/10 mx-1"></div>
              <button onClick={() => setDashboardMode('list')} className={`px-3 py-2 rounded-xl text-sm font-medium transition-all flex items-center ${dashboardMode === 'list' ? 'bg-gray-200 dark:bg-white/10 text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-primary-500/20 dark:bg-white/5'}`}><AlignLeft size={16} className="mr-2"/> Lista</button>
              <button onClick={() => setDashboardMode('kanban')} className={`px-3 py-2 rounded-xl text-sm font-medium transition-all flex items-center ${dashboardMode === 'kanban' ? 'bg-gray-200 dark:bg-white/10 text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-primary-500/20 dark:bg-white/5'}`}><LayoutDashboard size={16} className="mr-2"/> Kanban</button>
              <div className="w-px h-6 bg-gray-200 dark:bg-white/10 mx-1"></div>
              <button onClick={() => setSortBy('recent')} className={`px-3 py-2 rounded-xl text-sm font-medium transition-all flex items-center ${sortBy === 'recent' ? 'bg-gray-200 dark:bg-white/10 text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-primary-500/20 dark:bg-white/5'}`}><Clock size={16} className="mr-2"/> Recentes</button>
              <button onClick={() => setSortBy('alphabetical')} className={`px-3 py-2 rounded-xl text-sm font-medium transition-all flex items-center ${sortBy === 'alphabetical' ? 'bg-gray-200 dark:bg-white/10 text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-primary-500/20 dark:bg-white/5'}`}><ArrowDownAZ size={16} className="mr-2"/> A-Z</button>
              <button onClick={() => setSortBy('value')} className={`px-3 py-2 rounded-xl text-sm font-medium transition-all flex items-center ${sortBy === 'value' ? 'bg-gray-200 dark:bg-white/10 text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-primary-500/20 dark:bg-white/5'}`}><DollarSign size={16} className="mr-2"/> Valor</button>
            </div>
          </div>

          {dashboardMode === 'list' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              {currentClients.map(client => (
                <div key={client.id} onClick={() => { setEditingClient(client); setIsModalOpen(true); }} className="bg-gray-200 dark:bg-white/10 backdrop-blur-2xl border border-gray-300 dark:border-white/20 p-6 rounded-3xl cursor-pointer hover:bg-gray-100 dark:hover:bg-primary-500/20 transition-all group relative overflow-hidden shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] hover:shadow-[0_8px_32px_0_rgba(249,115,22,0.15)] hover:-translate-y-1 flex flex-col h-full">
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary-500 to-primary-400 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white truncate pr-4 flex items-center gap-2">
                      {client.name}
                      {isChurnRisk(client) && (
                        <span title={`Fatura atrasada há mais de ${churnRiskDays} dias`} className="animate-pulse bg-red-500/20 text-red-500 border border-red-500/30 px-2 py-0.5 rounded-full text-[10px] uppercase font-bold tracking-wider flex items-center gap-1">
                          <AlertTriangle size={10} />
                          Risco Churn
                        </span>
                      )}
                    </h3>
                    <div className="flex flex-col items-end space-y-2">
                      <div className="flex gap-2">
                        {client.isCombo && (
                          <span className="px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center gap-1">
                            <Zap size={10} />
                            Combo
                          </span>
                        )}
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap backdrop-blur-md ${
                          client.status === 'Ativo' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 
                          client.status === 'Cancelado' ? 'bg-zinc-500/20 text-zinc-300 border border-zinc-500/30' : 
                          client.status === 'Inadimplente' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' : 
                          'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30'
                        }`}>
                          {client.status}
                        </span>
                      </div>
                      {client.paymentStatus && client.paymentStatus !== 'N/A' && (
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                          client.paymentStatus === 'RECEIVED' ? 'bg-green-500/20 text-green-400 border border-green-500/30' :
                          client.paymentStatus === 'OVERDUE' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                          'bg-primary-500/20 text-primary-400 border border-primary-500/30'
                        }`}>
                          {client.paymentStatus === 'RECEIVED' ? 'Pago' : client.paymentStatus === 'OVERDUE' ? 'Atrasado' : 'Pendente'}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="space-y-3 flex-1">
                    <div className="flex items-center text-gray-600 dark:text-gray-300 text-sm">
                      <Phone size={16} className="mr-3 text-primary-400 opacity-80" />
                      {client.whatsapp}
                    </div>
                    
                    <div className="flex items-center text-gray-600 dark:text-gray-300 text-sm">
                      <Tag size={16} className="mr-3 text-primary-400 opacity-80" />
                      Plano {client.plan} <span className="ml-2 text-xs opacity-60">(R$ {getPlanPrice(client.plan, client.billingCycle, client).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})</span>
                    </div>
                    
                    {client.nextDueDate && client.status !== 'Cancelado' && (
                      <div className="flex items-center text-gray-600 dark:text-gray-300 text-sm">
                        <Calendar size={16} className="mr-3 text-primary-400 opacity-80" />
                        Vencimento: {new Date(client.nextDueDate + 'T12:00:00Z').toLocaleDateString('pt-BR')}
                      </div>
                    )}

                    {client.isCombo && client.comboRenewalDate && (
                      <div className="flex items-center text-purple-400 text-sm font-medium">
                        <Clock size={16} className="mr-3 opacity-80" />
                        Renovação: {new Date(client.comboRenewalDate + 'T12:00:00Z').toLocaleDateString('pt-BR')}
                      </div>
                    )}
                    
                    {client.niche && (
                      <div className="flex items-center text-gray-600 dark:text-gray-300 text-sm">
                        <Briefcase size={16} className="mr-3 text-primary-400 opacity-80 shrink-0" />
                        <span className="truncate">{client.niche}</span>
                      </div>
                    )}
                    
                    {client.siteLink && (
                      <div className="flex items-center text-gray-600 dark:text-gray-300 text-sm">
                        <Globe size={16} className="mr-3 text-primary-400 opacity-80" />
                        <a href={client.siteLink} target="_blank" rel="noreferrer" className="text-blue-400 hover:text-blue-300 hover:underline truncate" onClick={e => e.stopPropagation()}>
                          {client.siteLink}
                        </a>
                      </div>
                    )}
                  </div>

                  <div className="mt-6 pt-4 border-t border-gray-200 dark:border-white/10 flex flex-col gap-2">
                    {client.invoiceUrl && (
                      <div className="flex gap-2">
                        <a 
                          href={client.invoiceUrl}
                          target="_blank"
                          rel="noreferrer"
                          onClick={e => e.stopPropagation()}
                          className="flex-1 flex items-center justify-center py-2.5 rounded-xl bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 border border-blue-500/30 transition-colors text-sm font-medium"
                        >
                          <DollarSign size={18} className="mr-2" />
                          Ver Fatura
                        </a>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigator.clipboard.writeText(client.invoiceUrl!);
                            toast.success('Link de pagamento copiado!');
                          }}
                          className="flex items-center justify-center px-3 rounded-xl bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 border border-blue-500/30 transition-colors"
                          title="Copiar Link de Pagamento"
                        >
                          <LinkIcon size={18} />
                        </button>
                      </div>
                    )}
                    <div className="flex gap-2 w-full">
                      <a 
                        href={`https://wa.me/55${(client.whatsapp || '').replace(/\D/g, '')}?text=Olá ${client.name}, tudo bem? Aqui é do Hub central.`}
                        target="_blank"
                        rel="noreferrer"
                        onClick={e => e.stopPropagation()}
                        className="flex items-center justify-center flex-1 py-2.5 rounded-xl bg-[#25D366]/20 text-[#25D366] hover:bg-[#25D366]/30 border border-[#25D366]/30 transition-colors text-sm font-medium"
                      >
                        <MessageCircle size={18} className="mr-2" />
                        WhatsApp
                      </a>
                      {client.invoiceUrl && (
                        <a 
                          href={`https://wa.me/55${(client.whatsapp || '').replace(/\D/g, '')}?text=Olá ${client.name}, sua fatura de R$ ${getPlanPrice(client.plan, client.billingCycle, client).toFixed(2).replace('.', ',')} vence dia ${client.nextDueDate ? new Date(client.nextDueDate).toLocaleDateString('pt-BR') : ''}. Segue o link para pagamento via PIX: ${client.invoiceUrl}`}
                          target="_blank"
                          rel="noreferrer"
                          onClick={e => e.stopPropagation()}
                          className="flex items-center justify-center flex-1 py-2.5 rounded-xl bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/30 transition-colors text-sm font-medium"
                          title="Cobrar Fatura"
                        >
                          <AlertTriangle size={18} className="mr-2" />
                          Cobrar
                        </a>
                      )}
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const url = `${window.location.origin}/cliente/${user.uid}/${client.id}`;
                        navigator.clipboard.writeText(url);
                        toast.success('Link do Portal copiado para a área de transferência!');
                      }}
                      className="flex items-center justify-center w-full py-2.5 rounded-xl bg-primary-500/20 text-primary-400 hover:bg-primary-500/30 border border-primary-500/30 transition-colors text-sm font-medium"
                    >
                      <Copy size={18} className="mr-2" />
                      Link do Portal
                    </button>
                  </div>
                </div>
              ))}
              
              {filteredClients.length === 0 && (
                <div className="col-span-full py-16 text-center border border-gray-200 dark:border-white/10 bg-gray-100 dark:bg-white/5 backdrop-blur-xl rounded-3xl">
                  <div className="w-16 h-16 bg-gray-100 dark:bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Users size={32} className="text-gray-500 dark:text-gray-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Nenhum cliente encontrado</h3>
                  <p className="text-gray-500 dark:text-gray-400">Ajuste os filtros ou adicione um novo cliente.</p>
                </div>
              )}
            </div>
          ) : (
            <div className="flex gap-6 overflow-x-auto pb-8 custom-scrollbar items-start">
              {['Em Desenvolvimento', 'Ativo', 'Inadimplente', 'Cancelado'].map(status => {
                const columnClients = filteredClients.filter(c => c.status === status);
                return (
                  <div key={status} className="min-w-[320px] w-[320px] bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl p-4 flex flex-col max-h-[70vh]">
                    <div className="flex justify-between items-center mb-4 px-2">
                      <h3 className="text-gray-900 dark:text-white font-medium">{status}</h3>
                      <span className="bg-gray-200 dark:bg-white/10 text-gray-600 dark:text-gray-300 text-xs px-2 py-1 rounded-full">{columnClients.length}</span>
                    </div>
                    <div className="flex flex-col gap-4 overflow-y-auto custom-scrollbar pr-2 pb-2">
                      {columnClients.map(client => (
                        <div key={client.id} onClick={() => { setEditingClient(client); setIsModalOpen(true); }} className="bg-gray-200 dark:bg-white/10 border border-gray-200 dark:border-white/10 p-4 rounded-xl cursor-pointer hover:bg-gray-100 dark:hover:bg-primary-500/20 transition-all group relative">
                          <h4 className="font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2 flex-wrap">
                            {client.name}
                            {isChurnRisk(client) && (
                              <span title={`Fatura atrasada há mais de ${churnRiskDays} dias`} className="animate-pulse bg-red-500/20 text-red-500 border border-red-500/30 px-1.5 py-0.5 rounded-full text-[9px] uppercase font-bold tracking-wider flex items-center gap-1">
                                <AlertTriangle size={8} />
                                Risco
                              </span>
                            )}
                          </h4>
                          <div className="flex items-center text-gray-500 dark:text-gray-400 text-xs mb-2">
                            <Phone size={12} className="mr-2 text-primary-400" />
                            {client.whatsapp}
                          </div>
                          {client.paymentStatus && client.paymentStatus !== 'N/A' && (
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                              client.paymentStatus === 'RECEIVED' ? 'bg-green-500/20 text-green-400 border border-green-500/30' :
                              client.paymentStatus === 'OVERDUE' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                              'bg-primary-500/20 text-primary-400 border border-primary-500/30'
                            }`}>
                              {client.paymentStatus === 'RECEIVED' ? 'Pago' : client.paymentStatus === 'OVERDUE' ? 'Atrasado' : 'Pendente'}
                            </span>
                          )}
                        </div>
                      ))}
                      {columnClients.length === 0 && (
                        <div className="text-center py-8 text-gray-500 text-sm border border-dashed border-gray-200 dark:border-white/10 rounded-xl">
                          Vazio
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center space-x-2 mt-8 mb-4">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  currentPage === 1 
                    ? 'bg-gray-100 dark:bg-white/5 text-gray-500 cursor-not-allowed' 
                    : 'bg-gray-200 dark:bg-white/10 text-gray-900 dark:text-white hover:bg-gray-300 dark:bg-white/20'
                }`}
              >
                Anterior
              </button>
              
              <div className="flex space-x-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`w-10 h-10 rounded-xl text-sm font-medium transition-all flex items-center justify-center ${
                      currentPage === page 
                        ? 'bg-primary-500 text-gray-900 dark:text-white shadow-lg shadow-primary-500/50' 
                        : 'bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:bg-white/10 hover:text-gray-900 dark:text-white'
                    }`}
                  >
                    {page}
                  </button>
                ))}
              </div>

              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  currentPage === totalPages 
                    ? 'bg-gray-100 dark:bg-white/5 text-gray-500 cursor-not-allowed' 
                    : 'bg-gray-200 dark:bg-white/10 text-gray-900 dark:text-white hover:bg-gray-300 dark:bg-white/20'
                }`}
              >
                Próxima
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderAnalytics = () => {
    const totalClients = clients.length;
    const activeClients = clients.filter(c => c.status === 'Ativo').length;
    const activeClientsList = clients.filter(c => c.status === 'Ativo');
    const mrr = activeClientsList.reduce((acc, c) => {
      return acc + getPlanPrice(c.plan, c.billingCycle, c);
    }, 0);
    
    const overdueClients = clients.filter(c => c.paymentStatus === 'OVERDUE');
    const overdueAmount = overdueClients.reduce((acc, c) => {
      return acc + getPlanPrice(c.plan, c.billingCycle, c);
    }, 0);
    const overdueRate = activeClients > 0 ? ((overdueClients.length / activeClients) * 100).toFixed(1) : '0.0';

    const canceledClientsList = clients.filter(c => c.status === 'Cancelado');
    const canceledClients = canceledClientsList.length;
    const churnRate = totalClients > 0 ? ((canceledClients / totalClients) * 100).toFixed(1) : '0.0';

    const todayDate = new Date();
    todayDate.setHours(0, 0, 0, 0);
    const currentYear = todayDate.getFullYear();
    const currentMonth = todayDate.getMonth();

    // Novas Métricas Gerenciais
    const ticketMedio = activeClients > 0 ? mrr / activeClients : 0;
    
    const novosClientesMesList = clients.filter(c => {
      const d = new Date(c.createdAt);
      return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
    });
    const novosClientesMes = novosClientesMesList.length;
    
    const mrrNovo = novosClientesMesList.filter(c => c.status === 'Ativo').reduce((acc, c) => acc + getPlanPrice(c.plan, c.billingCycle, c), 0);
    
    // Assumindo cancelamentos do mês baseados em uma data de cancelamento (se não houver, usamos os criados no mês que cancelaram para simplificar, ou apenas 0 se não tivermos a data exata)
    // Para ser mais preciso, precisaríamos de um campo canceledAt. Vamos simular com os que estão cancelados.
    const mrrPerdido = canceledClientsList.reduce((acc, c) => acc + getPlanPrice(c.plan, c.billingCycle, c), 0); // Total histórico perdido
    const mrrLiquido = mrrNovo - mrrPerdido; // Simplificado

    const clientsWithDelivery = clients.filter(c => c.deliveryDate && c.createdAt);
    const tempoMedioEntrega = clientsWithDelivery.length > 0 
      ? clientsWithDelivery.reduce((acc, c) => {
          const start = new Date(c.createdAt).getTime();
          const end = new Date(c.deliveryDate!).getTime();
          return acc + Math.max(0, (end - start) / (1000 * 60 * 60 * 24));
        }, 0) / clientsWithDelivery.length
      : 0;

    const taxaBriefing = totalClients > 0 ? (clients.filter(c => c.onboardingAnswers && Object.keys(c.onboardingAnswers).length > 0).length / totalClients * 100).toFixed(1) : '0.0';
    const taxaIndicacao = totalClients > 0 ? (clients.filter(c => c.referredBy).length / totalClients * 100).toFixed(1) : '0.0';
    const taxaUpsell = totalClients > 0 ? (clients.filter(c => c.isCombo).length / totalClients * 100).toFixed(1) : '0.0';

    // Cohorts
    const cohortsMap: Record<string, { total: number, retained: number, mrr: number, channels: Record<string, number> }> = {};
    clients.forEach(c => {
      const d = new Date(c.createdAt);
      const cohortKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (!cohortsMap[cohortKey]) {
        cohortsMap[cohortKey] = { total: 0, retained: 0, mrr: 0, channels: {} };
      }
      cohortsMap[cohortKey].total++;
      if (c.status === 'Ativo') {
        cohortsMap[cohortKey].retained++;
        cohortsMap[cohortKey].mrr += getPlanPrice(c.plan, c.billingCycle, c);
      }
      const source = c.leadSource || 'Desconhecido';
      cohortsMap[cohortKey].channels[source] = (cohortsMap[cohortKey].channels[source] || 0) + 1;
    });
    const cohortsData = Object.entries(cohortsMap).sort((a, b) => a[0].localeCompare(b[0])).map(([key, data]) => {
      const bestChannel = Object.entries(data.channels).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';
      return {
        mes: key,
        total: data.total,
        retencao: data.total > 0 ? ((data.retained / data.total) * 100).toFixed(1) : '0.0',
        mrr: data.mrr,
        melhorCanal: bestChannel
      };
    });

    // Origem do Lead
    const leadSourcesMap: Record<string, { total: number, mrr: number, overdue: number, canceled: number }> = {};
    clients.forEach(c => {
      const source = c.leadSource || 'Desconhecido';
      if (!leadSourcesMap[source]) {
        leadSourcesMap[source] = { total: 0, mrr: 0, overdue: 0, canceled: 0 };
      }
      leadSourcesMap[source].total++;
      if (c.status === 'Ativo') leadSourcesMap[source].mrr += getPlanPrice(c.plan, c.billingCycle, c);
      if (c.paymentStatus === 'OVERDUE') leadSourcesMap[source].overdue++;
      if (c.status === 'Cancelado') leadSourcesMap[source].canceled++;
    });
    const leadSourcesData = Object.entries(leadSourcesMap).sort((a, b) => b[1].total - a[1].total).map(([source, data]) => ({
      source,
      total: data.total,
      mrr: data.mrr,
      inadimplencia: data.total > 0 ? ((data.overdue / data.total) * 100).toFixed(1) : '0.0',
      cancelamento: data.total > 0 ? ((data.canceled / data.total) * 100).toFixed(1) : '0.0'
    }));
    
    let cash7Days = 0;
    let cash15Days = 0;
    let cash30Days = 0;

    clients.forEach(c => {
      if (c.status === 'Ativo' && c.nextDueDate) {
        // Asaas nextDueDate is YYYY-MM-DD
        const [year, month, day] = c.nextDueDate.split('-');
        const dueDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        dueDate.setHours(0, 0, 0, 0);
        
        const diffTime = dueDate.getTime() - todayDate.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        let value = getPlanPrice(c.plan, c.billingCycle, c);

        if (diffDays >= 0 && diffDays <= 7) cash7Days += value;
        if (diffDays >= 0 && diffDays <= 15) cash15Days += value;
        if (diffDays >= 0 && diffDays <= 30) cash30Days += value;
      }
    });

    const cashFlowData = [
      { name: '7 dias', value: cash7Days },
      { name: '15 dias', value: cash15Days },
      { name: '30 dias', value: cash30Days },
    ];

    const planCounts: Record<string, number> = {};
    clients.forEach(c => {
      if (c.plan) {
        planCounts[c.plan] = (planCounts[c.plan] || 0) + 1;
      }
    });
    
    const colors = ['#f97316', '#3b82f6', '#10b981', '#8b5cf6', '#ec4899'];
    const planData = Object.entries(planCounts).map(([name, value], index) => ({
      name,
      value,
      color: colors[index % colors.length]
    }));

    const statusData = [
      { name: 'Em Desenvolvimento', value: clients.filter(c => c.status === 'Em Desenvolvimento').length, color: '#eab308' },
      { name: 'Ativo', value: activeClients, color: '#10b981' },
      { name: 'Inadimplente', value: clients.filter(c => c.status === 'Inadimplente').length, color: '#f43f5e' },
      { name: 'Cancelado', value: clients.filter(c => c.status === 'Cancelado').length, color: '#ef4444' }
    ];

    const paymentMethodData = [
      { name: 'PIX', value: clients.filter(c => c.billingType === 'PIX').length, color: '#10b981' },
      { name: 'Cartão', value: clients.filter(c => c.billingType === 'CREDIT_CARD' || !c.billingType).length, color: '#3b82f6' }
    ];

    const now = Date.now();
    const oneWeek = 7 * 24 * 60 * 60 * 1000;
    const thisWeekCount = clients.filter(c => now - c.createdAt <= oneWeek).length;
    const lastWeekCount = clients.filter(c => (now - c.createdAt > oneWeek) && (now - c.createdAt <= 2 * oneWeek)).length;
    
    let weeklyGrowth = 0;
    if (lastWeekCount > 0) {
      weeklyGrowth = Math.round(((thisWeekCount - lastWeekCount) / lastWeekCount) * 100);
    } else if (thisWeekCount > 0) {
      weeklyGrowth = 100;
    }

    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

    const monthlyData = months.map((m, i) => {
      const monthClients = clients.filter(c => {
        const d = new Date(c.createdAt);
        return d.getFullYear() === currentYear && d.getMonth() === i;
      });
      
      const mrrUpToThisMonth = activeClientsList.filter(c => {
        const d = new Date(c.createdAt);
        return d.getFullYear() < currentYear || (d.getFullYear() === currentYear && d.getMonth() <= i);
      }).reduce((acc, c) => {
        return acc + getPlanPrice(c.plan, c.billingCycle, c);
      }, 0);

      return { 
        name: m, 
        novos: monthClients.length,
        mrr: i <= currentMonth ? mrrUpToThisMonth : null
      };
    });

    return (
      <div className="flex-1 overflow-y-auto p-6 bg-transparent custom-scrollbar relative z-10">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-8">Dashboard Financeiro</h2>
          
          {/* Top Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
            <div className="bg-gray-200 dark:bg-white/10 backdrop-blur-2xl border border-gray-300 dark:border-white/20 p-6 rounded-3xl shadow-[0_8px_32px_0_rgba(0,0,0,0.3)]">
              <p className="text-gray-500 dark:text-gray-400 text-sm font-medium mb-2">Total de Clientes</p>
              <p className="text-4xl font-bold text-gray-900 dark:text-white">{totalClients}</p>
            </div>
            
            <div className="bg-gray-200 dark:bg-white/10 backdrop-blur-2xl border border-gray-300 dark:border-white/20 p-6 rounded-3xl shadow-[0_8px_32px_0_rgba(0,0,0,0.3)]">
              <p className="text-gray-500 dark:text-gray-400 text-sm font-medium mb-2">Clientes Ativos</p>
              <p className="text-4xl font-bold text-emerald-400">{activeClients}</p>
            </div>
            
            <div className="bg-gray-200 dark:bg-white/10 backdrop-blur-2xl border border-gray-300 dark:border-white/20 p-6 rounded-3xl shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] relative overflow-hidden">
              <div className="absolute top-[-20%] right-[-10%] w-32 h-32 bg-primary-500/20 rounded-full blur-3xl"></div>
              <p className="text-gray-500 dark:text-gray-400 text-sm font-medium mb-2">MRR (Recorrente)</p>
              <p className="text-4xl font-bold text-primary-400">R$ {mrr.toLocaleString('pt-BR')}</p>
            </div>

            <div className="bg-gray-200 dark:bg-white/10 backdrop-blur-2xl border border-gray-300 dark:border-white/20 p-6 rounded-3xl shadow-[0_8px_32px_0_rgba(0,0,0,0.3)]">
              <p className="text-gray-500 dark:text-gray-400 text-sm font-medium mb-2">Inadimplência (Atrasados)</p>
              <div className="flex items-end gap-3">
                <p className="text-4xl font-bold text-red-400">R$ {overdueAmount.toLocaleString('pt-BR')}</p>
                <span className="text-sm text-red-400/80 mb-1 font-medium">({overdueRate}%)</span>
              </div>
            </div>

            <div className="bg-gray-200 dark:bg-white/10 backdrop-blur-2xl border border-gray-300 dark:border-white/20 p-6 rounded-3xl shadow-[0_8px_32px_0_rgba(0,0,0,0.3)]">
              <p className="text-gray-500 dark:text-gray-400 text-sm font-medium mb-2">Taxa de Churn</p>
              <div className="flex items-end gap-3">
                <p className="text-4xl font-bold text-gray-600 dark:text-gray-300">{churnRate}%</p>
                <span className="text-sm text-gray-500 dark:text-gray-400 mb-1 font-medium">({canceledClients} cancelados)</span>
              </div>
            </div>
          </div>

          {/* Main Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <div className="bg-gray-200 dark:bg-white/10 backdrop-blur-2xl border border-gray-300 dark:border-white/20 p-6 rounded-3xl shadow-[0_8px_32px_0_rgba(0,0,0,0.3)]">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Crescimento do MRR ({currentYear})</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={monthlyData.filter(d => d.mrr !== null)} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorMrr" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f97316" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 12 }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 12 }} tickFormatter={(value) => `R$${value}`} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                      itemStyle={{ color: '#fff' }}
                      formatter={(value: number) => [`R$ ${value.toLocaleString('pt-BR')}`, 'MRR']}
                    />
                    <Area type="monotone" dataKey="mrr" stroke="#f97316" strokeWidth={3} fillOpacity={1} fill="url(#colorMrr)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-gray-200 dark:bg-white/10 backdrop-blur-2xl border border-gray-300 dark:border-white/20 p-6 rounded-3xl shadow-[0_8px_32px_0_rgba(0,0,0,0.3)]">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Aquisição de Clientes ({currentYear})</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 12 }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 12 }} allowDecimals={false} />
                    <Tooltip 
                      cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                      contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                      formatter={(value: number) => [value, 'Novos Clientes']}
                    />
                    <Bar dataKey="novos" fill="#10b981" radius={[4, 4, 0, 0]} barSize={30} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Bottom Row */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-gray-200 dark:bg-white/10 backdrop-blur-2xl border border-gray-300 dark:border-white/20 p-6 rounded-3xl shadow-[0_8px_32px_0_rgba(0,0,0,0.3)]">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Projeção de Caixa</h3>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={cashFlowData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 12 }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 12 }} tickFormatter={(value) => `R$${value}`} />
                    <Tooltip 
                      cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                      contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                      formatter={(value: number) => [`R$ ${value.toLocaleString('pt-BR')}`, 'Receita Prevista']}
                    />
                    <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={30} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-gray-200 dark:bg-white/10 backdrop-blur-2xl border border-gray-300 dark:border-white/20 p-6 rounded-3xl shadow-[0_8px_32px_0_rgba(0,0,0,0.3)]">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Distribuição por Plano</h3>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={planData} cx="50%" cy="50%" innerRadius={50} outerRadius={70} paddingAngle={5} dataKey="value">
                      {planData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                      itemStyle={{ color: '#fff' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex justify-center gap-4 mt-4">
                {planData.map(plan => (
                  <div key={plan.name} className="flex items-center text-sm text-gray-600 dark:text-gray-300">
                    <div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: plan.color }}></div>
                    {plan.name} ({plan.value})
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-gray-200 dark:bg-white/10 backdrop-blur-2xl border border-gray-300 dark:border-white/20 p-6 rounded-3xl shadow-[0_8px_32px_0_rgba(0,0,0,0.3)]">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Status dos Clientes</h3>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={statusData} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                    <XAxis type="number" hide />
                    <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 12 }} width={120} />
                    <Tooltip 
                      cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                      contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                    />
                    <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={20}>
                      {statusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-gray-200 dark:bg-white/10 backdrop-blur-2xl border border-gray-300 dark:border-white/20 p-6 rounded-3xl shadow-[0_8px_32px_0_rgba(0,0,0,0.3)]">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Formas de Pagamento</h3>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={paymentMethodData} cx="50%" cy="50%" innerRadius={50} outerRadius={70} paddingAngle={5} dataKey="value">
                      {paymentMethodData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                      itemStyle={{ color: '#fff' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex justify-center gap-4 mt-4">
                {paymentMethodData.map(method => (
                  <div key={method.name} className="flex items-center text-sm text-gray-600 dark:text-gray-300">
                    <div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: method.color }}></div>
                    {method.name} ({method.value})
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Visão Gerencial */}
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 mt-12">Visão Gerencial</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-gray-200 dark:bg-white/10 backdrop-blur-2xl border border-gray-300 dark:border-white/20 p-6 rounded-3xl shadow-[0_8px_32px_0_rgba(0,0,0,0.3)]">
              <p className="text-gray-500 dark:text-gray-400 text-sm font-medium mb-2">Ticket Médio</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">R$ {ticketMedio.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}</p>
            </div>
            <div className="bg-gray-200 dark:bg-white/10 backdrop-blur-2xl border border-gray-300 dark:border-white/20 p-6 rounded-3xl shadow-[0_8px_32px_0_rgba(0,0,0,0.3)]">
              <p className="text-gray-500 dark:text-gray-400 text-sm font-medium mb-2">Novos Clientes (Mês)</p>
              <div className="flex items-end gap-3">
                <p className="text-3xl font-bold text-emerald-400">{novosClientesMes}</p>
                <span className="text-sm text-emerald-400/80 mb-1 font-medium">(+ R$ {mrrNovo.toLocaleString('pt-BR')})</span>
              </div>
            </div>
            <div className="bg-gray-200 dark:bg-white/10 backdrop-blur-2xl border border-gray-300 dark:border-white/20 p-6 rounded-3xl shadow-[0_8px_32px_0_rgba(0,0,0,0.3)]">
              <p className="text-gray-500 dark:text-gray-400 text-sm font-medium mb-2">Cancelamentos (Total)</p>
              <div className="flex items-end gap-3">
                <p className="text-3xl font-bold text-red-400">{canceledClients}</p>
                <span className="text-sm text-red-400/80 mb-1 font-medium">(- R$ {mrrPerdido.toLocaleString('pt-BR')})</span>
              </div>
            </div>
            <div className="bg-gray-200 dark:bg-white/10 backdrop-blur-2xl border border-gray-300 dark:border-white/20 p-6 rounded-3xl shadow-[0_8px_32px_0_rgba(0,0,0,0.3)]">
              <p className="text-gray-500 dark:text-gray-400 text-sm font-medium mb-2">MRR Líquido (Mês)</p>
              <p className={`text-3xl font-bold ${mrrLiquido >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {mrrLiquido >= 0 ? '+' : '-'} R$ {Math.abs(mrrLiquido).toLocaleString('pt-BR')}
              </p>
            </div>
            <div className="bg-gray-200 dark:bg-white/10 backdrop-blur-2xl border border-gray-300 dark:border-white/20 p-6 rounded-3xl shadow-[0_8px_32px_0_rgba(0,0,0,0.3)]">
              <p className="text-gray-500 dark:text-gray-400 text-sm font-medium mb-2">Tempo Médio de Entrega</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">{tempoMedioEntrega.toFixed(1)} dias</p>
            </div>
            <div className="bg-gray-200 dark:bg-white/10 backdrop-blur-2xl border border-gray-300 dark:border-white/20 p-6 rounded-3xl shadow-[0_8px_32px_0_rgba(0,0,0,0.3)]">
              <p className="text-gray-500 dark:text-gray-400 text-sm font-medium mb-2">Taxa de Briefing Concluído</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">{taxaBriefing}%</p>
            </div>
            <div className="bg-gray-200 dark:bg-white/10 backdrop-blur-2xl border border-gray-300 dark:border-white/20 p-6 rounded-3xl shadow-[0_8px_32px_0_rgba(0,0,0,0.3)]">
              <p className="text-gray-500 dark:text-gray-400 text-sm font-medium mb-2">Taxa de Indicação</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">{taxaIndicacao}%</p>
            </div>
            <div className="bg-gray-200 dark:bg-white/10 backdrop-blur-2xl border border-gray-300 dark:border-white/20 p-6 rounded-3xl shadow-[0_8px_32px_0_rgba(0,0,0,0.3)]">
              <p className="text-gray-500 dark:text-gray-400 text-sm font-medium mb-2">Upsell por Cliente (Combo)</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">{taxaUpsell}%</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Cohorts */}
            <div className="bg-gray-200 dark:bg-white/10 backdrop-blur-2xl border border-gray-300 dark:border-white/20 p-6 rounded-3xl shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] overflow-hidden">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Análise de Cohort (Turmas)</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-gray-300 dark:border-white/10">
                      <th className="pb-3 text-sm font-medium text-gray-500 dark:text-gray-400">Mês de Entrada</th>
                      <th className="pb-3 text-sm font-medium text-gray-500 dark:text-gray-400">Total</th>
                      <th className="pb-3 text-sm font-medium text-gray-500 dark:text-gray-400">Retenção</th>
                      <th className="pb-3 text-sm font-medium text-gray-500 dark:text-gray-400">MRR Gerado</th>
                      <th className="pb-3 text-sm font-medium text-gray-500 dark:text-gray-400">Melhor Canal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cohortsData.map((cohort, idx) => (
                      <tr key={idx} className="border-b border-gray-300/50 dark:border-white/5 last:border-0">
                        <td className="py-3 text-sm text-gray-900 dark:text-white font-medium">{cohort.mes}</td>
                        <td className="py-3 text-sm text-gray-600 dark:text-gray-300">{cohort.total}</td>
                        <td className="py-3 text-sm text-gray-600 dark:text-gray-300">{cohort.retencao}%</td>
                        <td className="py-3 text-sm text-emerald-600 dark:text-emerald-400">R$ {cohort.mrr.toLocaleString('pt-BR')}</td>
                        <td className="py-3 text-sm text-gray-600 dark:text-gray-300">{cohort.melhorCanal}</td>
                      </tr>
                    ))}
                    {cohortsData.length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-4 text-center text-sm text-gray-500">Nenhum dado de cohort disponível.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Origem do Lead */}
            <div className="bg-gray-200 dark:bg-white/10 backdrop-blur-2xl border border-gray-300 dark:border-white/20 p-6 rounded-3xl shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] overflow-hidden">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Origem do Lead / Canais</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-gray-300 dark:border-white/10">
                      <th className="pb-3 text-sm font-medium text-gray-500 dark:text-gray-400">Canal</th>
                      <th className="pb-3 text-sm font-medium text-gray-500 dark:text-gray-400">Clientes</th>
                      <th className="pb-3 text-sm font-medium text-gray-500 dark:text-gray-400">MRR</th>
                      <th className="pb-3 text-sm font-medium text-gray-500 dark:text-gray-400">Inadimplência</th>
                      <th className="pb-3 text-sm font-medium text-gray-500 dark:text-gray-400">Cancelamento</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leadSourcesData.map((source, idx) => (
                      <tr key={idx} className="border-b border-gray-300/50 dark:border-white/5 last:border-0">
                        <td className="py-3 text-sm text-gray-900 dark:text-white font-medium">{source.source}</td>
                        <td className="py-3 text-sm text-gray-600 dark:text-gray-300">{source.total}</td>
                        <td className="py-3 text-sm text-emerald-600 dark:text-emerald-400">R$ {source.mrr.toLocaleString('pt-BR')}</td>
                        <td className="py-3 text-sm text-red-600 dark:text-red-400">{source.inadimplencia}%</td>
                        <td className="py-3 text-sm text-red-600 dark:text-red-400">{source.cancelamento}%</td>
                      </tr>
                    ))}
                    {leadSourcesData.length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-4 text-center text-sm text-gray-500">Nenhum dado de origem disponível.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Previsão de Caixa */}
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 mt-12">Previsão de Caixa (Forecast)</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-gray-200 dark:bg-white/10 backdrop-blur-2xl border border-gray-300 dark:border-white/20 p-6 rounded-3xl shadow-[0_8px_32px_0_rgba(0,0,0,0.3)]">
              <p className="text-gray-500 dark:text-gray-400 text-sm font-medium mb-2">Receita Prevista (30 dias)</p>
              <p className="text-3xl font-bold text-primary-400">R$ {cash30Days.toLocaleString('pt-BR')}</p>
            </div>
            <div className="bg-gray-200 dark:bg-white/10 backdrop-blur-2xl border border-gray-300 dark:border-white/20 p-6 rounded-3xl shadow-[0_8px_32px_0_rgba(0,0,0,0.3)]">
              <p className="text-gray-500 dark:text-gray-400 text-sm font-medium mb-2">Receita Próxima (7 dias)</p>
              <p className="text-3xl font-bold text-emerald-400">R$ {cash7Days.toLocaleString('pt-BR')}</p>
            </div>
            <div className="bg-gray-200 dark:bg-white/10 backdrop-blur-2xl border border-gray-300 dark:border-white/20 p-6 rounded-3xl shadow-[0_8px_32px_0_rgba(0,0,0,0.3)]">
              <p className="text-gray-500 dark:text-gray-400 text-sm font-medium mb-2">Cobranças em Risco</p>
              <div className="flex items-end gap-3">
                <p className="text-3xl font-bold text-red-400">R$ {overdueAmount.toLocaleString('pt-BR')}</p>
                <span className="text-sm text-red-400/80 mb-1 font-medium">({overdueClients.length} clientes)</span>
              </div>
            </div>
            <div className="bg-gray-200 dark:bg-white/10 backdrop-blur-2xl border border-gray-300 dark:border-white/20 p-6 rounded-3xl shadow-[0_8px_32px_0_rgba(0,0,0,0.3)]">
              <p className="text-gray-500 dark:text-gray-400 text-sm font-medium mb-2">Impacto de Cancelamentos</p>
              <div className="flex items-end gap-3">
                <p className="text-3xl font-bold text-red-400">R$ {mrrPerdido.toLocaleString('pt-BR')}</p>
                <span className="text-sm text-red-400/80 mb-1 font-medium">({canceledClients} clientes)</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderFinance = () => {
    const totalMRR = clients.filter(c => c.status === 'Ativo' || c.status === 'Inadimplente').reduce((acc, c) => {
      return acc + getPlanPrice(c.plan, c.billingCycle, c);
    }, 0);
    const totalExpenses = expenses.reduce((acc, e) => acc + e.amount, 0);
    const netProfit = totalMRR - totalExpenses;

    const handleAddExpense = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!newExpense.description || !newExpense.amount || !newExpense.date) return;

      try {
        const expenseId = Date.now().toString(36) + Math.random().toString(36).substring(2);
        const expense: Expense = {
          id: expenseId,
          description: newExpense.description,
          amount: Number(newExpense.amount),
          date: new Date(newExpense.date).getTime(),
          category: newExpense.category || 'Ferramentas',
          clientId: newExpense.clientId || undefined
        };

        await setDoc(doc(db, 'users', user.uid, 'expenses', expenseId), expense);
        setNewExpense({ category: 'Ferramentas' });
        toast.success('Despesa adicionada com sucesso!');
      } catch (error) {
        console.error("Error adding expense:", error);
        toast.error('Erro ao adicionar despesa.');
      }
    };

    const handleDeleteExpense = async (id: string) => {
      try {
        await deleteDoc(doc(db, 'users', user.uid, 'expenses', id));
        toast.success('Despesa removida!');
      } catch (error) {
        console.error("Error deleting expense:", error);
        toast.error('Erro ao remover despesa.');
      }
    };

    return (
      <div className="flex-1 overflow-y-auto p-6 bg-transparent custom-scrollbar relative z-10">
        <div className="max-w-7xl mx-auto">
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
            <div className="bg-gray-100 dark:bg-white/5 backdrop-blur-xl border border-gray-200 dark:border-white/10 p-6 rounded-3xl shadow-lg">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-gray-500 dark:text-gray-400 font-medium">Receita (MRR)</h3>
                <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-lg"><TrendingUp size={20} /></div>
              </div>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">R$ {totalMRR.toFixed(2).replace('.', ',')}</p>
            </div>
            
            <div className="bg-gray-100 dark:bg-white/5 backdrop-blur-xl border border-gray-200 dark:border-white/10 p-6 rounded-3xl shadow-lg">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-gray-500 dark:text-gray-400 font-medium">Despesas</h3>
                <div className="p-2 bg-red-500/20 text-red-400 rounded-lg"><TrendingDown size={20} /></div>
              </div>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">R$ {totalExpenses.toFixed(2).replace('.', ',')}</p>
            </div>

            <div className="bg-gray-100 dark:bg-white/5 backdrop-blur-xl border border-gray-200 dark:border-white/10 p-6 rounded-3xl shadow-lg">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-gray-500 dark:text-gray-400 font-medium">Lucro Líquido</h3>
                <div className="p-2 bg-blue-500/20 text-blue-400 rounded-lg"><DollarSign size={20} /></div>
              </div>
              <p className={`text-3xl font-bold ${netProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                R$ {netProfit.toFixed(2).replace('.', ',')}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1">
              <div className="bg-gray-100 dark:bg-white/5 backdrop-blur-xl border border-gray-200 dark:border-white/10 p-6 rounded-3xl shadow-lg">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Nova Despesa</h3>
                <form onSubmit={handleAddExpense} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Descrição</label>
                    <input required type="text" value={newExpense.description || ''} onChange={e => setNewExpense({...newExpense, description: e.target.value})} className="w-full px-4 py-3 bg-black/20 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white rounded-xl focus:ring-2 focus:ring-primary-500 outline-none transition-all" placeholder="Ex: Hospedagem AWS" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Valor (R$)</label>
                    <input required type="number" step="0.01" value={newExpense.amount || ''} onChange={e => setNewExpense({...newExpense, amount: e.target.value})} className="w-full px-4 py-3 bg-black/20 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white rounded-xl focus:ring-2 focus:ring-primary-500 outline-none transition-all" placeholder="0.00" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Data</label>
                    <input required type="date" value={newExpense.date || ''} onChange={e => setNewExpense({...newExpense, date: e.target.value})} className="w-full px-4 py-3 bg-black/20 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white rounded-xl focus:ring-2 focus:ring-primary-500 outline-none transition-all" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Categoria</label>
                    <select value={newExpense.category || 'Ferramentas'} onChange={e => setNewExpense({...newExpense, category: e.target.value})} className="w-full px-4 py-3 bg-black/20 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white rounded-xl focus:ring-2 focus:ring-primary-500 outline-none transition-all">
                      <option value="Ferramentas" className="bg-[#030712] text-white">Ferramentas / Software</option>
                      <option value="Infraestrutura" className="bg-[#030712] text-white">Infraestrutura / Hospedagem</option>
                      <option value="Impostos" className="bg-[#030712] text-white">Impostos / Taxas</option>
                      <option value="Marketing" className="bg-[#030712] text-white">Marketing / Anúncios</option>
                      <option value="Outros" className="bg-[#030712] text-white">Outros</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Cliente (Opcional)</label>
                    <select value={newExpense.clientId || ''} onChange={e => setNewExpense({...newExpense, clientId: e.target.value})} className="w-full px-4 py-3 bg-black/20 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white rounded-xl focus:ring-2 focus:ring-primary-500 outline-none transition-all">
                      <option value="" className="bg-[#030712] text-white">Nenhum (Custo Geral)</option>
                      {clients.map(c => (
                        <option key={c.id} value={c.id} className="bg-[#030712] text-white">{c.name}</option>
                      ))}
                    </select>
                  </div>
                  <button type="submit" className="w-full py-3 bg-primary-500 hover:bg-primary-600 text-gray-900 dark:text-white rounded-xl font-medium transition-all shadow-lg shadow-primary-500/20">
                    Adicionar Despesa
                  </button>
                </form>
              </div>
            </div>

            <div className="lg:col-span-2">
              <div className="bg-gray-100 dark:bg-white/5 backdrop-blur-xl border border-gray-200 dark:border-white/10 p-6 rounded-3xl shadow-lg h-full">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Histórico de Despesas</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-gray-200 dark:border-white/10 text-gray-500 dark:text-gray-400 text-sm">
                        <th className="pb-3 font-medium">Data</th>
                        <th className="pb-3 font-medium">Descrição</th>
                        <th className="pb-3 font-medium">Categoria</th>
                        <th className="pb-3 font-medium">Cliente</th>
                        <th className="pb-3 font-medium text-right">Valor</th>
                        <th className="pb-3 font-medium text-right">Ação</th>
                      </tr>
                    </thead>
                    <tbody>
                      {expenses.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-gray-500">Nenhuma despesa registrada.</td>
                        </tr>
                      ) : (
                        expenses.map(expense => (
                          <tr key={expense.id} className="border-b border-white/5 hover:bg-gray-100 dark:hover:bg-primary-500/20 dark:bg-white/5 transition-colors group">
                            <td className="py-4 text-gray-600 dark:text-gray-300 text-sm">{new Date(expense.date).toLocaleDateString('pt-BR')}</td>
                            <td className="py-4 text-gray-900 dark:text-white font-medium">{expense.description}</td>
                            <td className="py-4 text-gray-500 dark:text-gray-400 text-sm">
                              <span className="px-2 py-1 bg-gray-100 dark:bg-white/5 rounded-md border border-white/5">{expense.category}</span>
                            </td>
                            <td className="py-4 text-gray-500 dark:text-gray-400 text-sm">
                              {expense.clientId ? clients.find(c => c.id === expense.clientId)?.name || 'Desconhecido' : '-'}
                            </td>
                            <td className="py-4 text-red-400 font-medium text-right">
                              - R$ {expense.amount.toFixed(2).replace('.', ',')}
                            </td>
                            <td className="py-4 text-right">
                              <button onClick={() => handleDeleteExpense(expense.id)} className="text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity p-1">
                                <Trash2 size={18} />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8">
            <div className="bg-gray-100 dark:bg-white/5 backdrop-blur-xl border border-gray-200 dark:border-white/10 p-6 rounded-3xl shadow-lg">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Custos e Margem por Cliente</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-white/10 text-gray-500 dark:text-gray-400 text-sm">
                      <th className="pb-3 font-medium">Cliente</th>
                      <th className="pb-3 font-medium text-right">Receita (MRR)</th>
                      <th className="pb-3 font-medium text-right">Custos</th>
                      <th className="pb-3 font-medium text-right">Lucro</th>
                      <th className="pb-3 font-medium text-right">Margem</th>
                    </tr>
                  </thead>
                  <tbody>
                    {clients.filter(c => c.status === 'Ativo' || expenses.some(e => e.clientId === c.id)).map(client => {
                      const clientExpenses = expenses.filter(e => e.clientId === client.id).reduce((acc, e) => acc + e.amount, 0);
                      const mrr = client.status === 'Ativo' ? getPlanPrice(client.plan, client.billingCycle, client) : 0;
                      const profit = mrr - clientExpenses;
                      const margin = mrr > 0 ? (profit / mrr) * 100 : 0;
                      
                      return (
                        <tr key={client.id} className="border-b border-white/5 hover:bg-gray-100 dark:hover:bg-primary-500/20 dark:bg-white/5 transition-colors group">
                          <td className="py-4 text-gray-900 dark:text-white font-medium">{client.name}</td>
                          <td className="py-4 text-emerald-400 font-medium text-right">R$ {mrr.toFixed(2).replace('.', ',')}</td>
                          <td className="py-4 text-red-400 font-medium text-right">R$ {clientExpenses.toFixed(2).replace('.', ',')}</td>
                          <td className={`py-4 font-medium text-right ${profit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>R$ {profit.toFixed(2).replace('.', ',')}</td>
                          <td className="py-4 text-gray-500 dark:text-gray-400 text-sm text-right">
                            <span className={`px-2 py-1 rounded-md border ${margin >= 50 ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : margin >= 20 ? 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400' : 'bg-red-500/10 border-red-500/20 text-red-400'}`}>
                              {margin.toFixed(1)}%
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderSupport = () => {
    return (
      <div className="flex-1 overflow-y-auto p-6 bg-transparent custom-scrollbar relative z-10">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Chamados de Suporte</h2>
              <p className="text-gray-500 dark:text-gray-400">Gerencie as solicitações feitas pelos clientes no Portal.</p>
            </div>
          </div>

          <div className="space-y-4">
            {supportRequests.length === 0 ? (
              <div className="text-center py-12 bg-gray-100 dark:bg-white/5 backdrop-blur-xl border border-gray-200 dark:border-white/10 rounded-3xl">
                <MessageCircle className="w-12 h-12 text-gray-500 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Nenhum chamado aberto</h3>
                <p className="text-gray-500 dark:text-gray-400">Seus clientes ainda não enviaram nenhuma solicitação.</p>
              </div>
            ) : (
              supportRequests.map((req) => (
                <div key={req.id} className={`bg-gray-100 dark:bg-white/5 backdrop-blur-xl border ${req.status === 'concluido' ? 'border-emerald-500/30 opacity-70' : 'border-gray-200 dark:border-white/10'} p-6 rounded-3xl shadow-lg transition-all`}>
                  <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                    <div className="flex-1 w-full">
                      <div className="flex flex-wrap items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{String(req.clientName || 'Cliente Desconhecido')}</h3>
                        <span className="px-2 py-1 rounded-md text-xs font-bold uppercase tracking-wider bg-primary-500/20 text-primary-600 dark:text-primary-400 border border-primary-500/30">
                          {req.status === 'concluido' ? 'Concluído' : req.status === 'em_analise' ? 'Em Análise' : 'Aberto'}
                        </span>
                        {req.category && (
                          <span className="px-2 py-1 rounded-md text-xs font-medium bg-primary-500/10 text-primary-600 dark:text-primary-400 border border-primary-500/20">
                            {String(req.category)}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                        Enviado em: {req.createdAt && typeof req.createdAt.toDate === 'function' ? req.createdAt.toDate().toLocaleString('pt-BR') : 'Data desconhecida'}
                      </p>
                      <div className="bg-white dark:bg-black/20 p-4 rounded-xl border border-gray-200 dark:border-white/5 text-gray-700 dark:text-gray-200 whitespace-pre-wrap mb-4">
                        {String(req.message || '')}
                      </div>

                      {req.reply && (
                        <div className="bg-primary-500/10 p-4 rounded-xl border border-primary-500/20 text-gray-900 dark:text-white whitespace-pre-wrap mb-4 relative">
                          <div className="absolute -top-2 left-6 w-4 h-4 bg-primary-500/10 rotate-45 border-l border-t border-primary-500/20"></div>
                          <p className="text-xs text-primary-500 dark:text-primary-400 font-bold uppercase tracking-wider mb-2">Sua Resposta</p>
                          {String(req.reply)}
                        </div>
                      )}

                      {replyingTo === req.id && (
                        <div className="mt-4 animate-in fade-in slide-in-from-top-2">
                          <textarea
                            value={replyMessage}
                            onChange={(e) => setReplyMessage(e.target.value)}
                            placeholder="Escreva sua resposta para o cliente..."
                            className="w-full min-h-[100px] px-4 py-3 bg-white dark:bg-black/20 border border-gray-300 dark:border-white/10 text-gray-900 dark:text-white rounded-xl focus:ring-2 focus:ring-primary-500 outline-none transition-all placeholder-gray-500 custom-scrollbar resize-none mb-3"
                          ></textarea>
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => {
                                setReplyingTo(null);
                                setReplyMessage('');
                              }}
                              className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/10 rounded-lg transition-colors"
                            >
                              Cancelar
                            </button>
                            <button
                              onClick={async () => {
                                if (!replyMessage.trim()) return;
                                try {
                                  await setDoc(doc(db, 'users', user.uid, 'supportRequests', req.id), { 
                                    reply: replyMessage,
                                    status: req.status === 'aberto' ? 'em_analise' : req.status
                                  }, { merge: true });
                                  toast.success('Resposta enviada com sucesso!');
                                  setReplyingTo(null);
                                  setReplyMessage('');
                                } catch (e) {
                                  toast.error('Erro ao enviar resposta.');
                                }
                              }}
                              className="px-4 py-2 text-sm font-medium bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-colors"
                            >
                              Enviar Resposta
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col gap-2 shrink-0 w-full sm:w-auto">
                      {req.status === 'aberto' && (
                        <button 
                          onClick={async () => {
                            try {
                              await setDoc(doc(db, 'users', user.uid, 'supportRequests', req.id), { status: 'em_analise' }, { merge: true });
                              toast.success('Chamado em análise!');
                            } catch (e) {
                              toast.error('Erro ao atualizar chamado.');
                            }
                          }}
                          className="flex items-center justify-center space-x-2 bg-primary-500/10 hover:bg-primary-500/20 text-primary-600 dark:text-primary-400 border border-primary-500/30 px-4 py-2 rounded-xl transition-all font-medium"
                        >
                          <Clock size={18} />
                          <span>Analisar</span>
                        </button>
                      )}
                      
                      {req.status !== 'concluido' && (
                        <button 
                          onClick={() => {
                            setReplyingTo(replyingTo === req.id ? null : req.id);
                            setReplyMessage(req.reply || '');
                          }}
                          className="flex items-center justify-center space-x-2 bg-primary-500/10 hover:bg-primary-500/20 text-primary-600 dark:text-primary-400 border border-primary-500/30 px-4 py-2 rounded-xl transition-all font-medium"
                        >
                          <MessageSquare size={18} />
                          <span>Responder</span>
                        </button>
                      )}

                      {req.status !== 'concluido' && (
                        <button 
                          onClick={async () => {
                            try {
                              await setDoc(doc(db, 'users', user.uid, 'supportRequests', req.id), { status: 'concluido' }, { merge: true });
                              toast.success('Chamado marcado como concluído!');
                            } catch (e) {
                              toast.error('Erro ao atualizar chamado.');
                            }
                          }}
                          className="flex items-center justify-center space-x-2 bg-primary-500/10 hover:bg-primary-500/20 text-primary-600 dark:text-primary-400 border border-primary-500/30 px-4 py-2 rounded-xl transition-all font-medium"
                        >
                          <CheckCircle size={18} />
                          <span>Concluir</span>
                        </button>
                      )}
                      <button 
                        onClick={async () => {
                          if (window.confirm('Tem certeza que deseja excluir este chamado?')) {
                            try {
                              await deleteDoc(doc(db, 'users', user.uid, 'supportRequests', req.id));
                              toast.success('Chamado excluído!');
                            } catch (e) {
                              toast.error('Erro ao excluir chamado.');
                            }
                          }
                        }}
                        className="flex items-center justify-center space-x-2 bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 border border-red-500/30 px-4 py-2 rounded-xl transition-all font-medium"
                      >
                        <Trash2 size={18} />
                        <span>Excluir</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderMarketing = () => {
    const handleSaveAnnouncement = async () => {
      try {
        await setDoc(doc(db, 'users', user.uid, 'settings', 'global'), {
          announcement: globalAnnouncement
        }, { merge: true });
        toast.success('Aviso global atualizado com sucesso!');
      } catch (err) {
        toast.error('Erro ao atualizar aviso.');
      }
    };

    return (
      <div className="space-y-6">
        <div className="bg-white dark:bg-[#111111] p-6 rounded-3xl border border-gray-200 dark:border-white/10 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Megaphone className="w-5 h-5 text-primary-500" />
            Aviso Global (Portal do Cliente)
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
            Este aviso aparecerá no topo do portal de todos os seus clientes. Use para comunicar recessos, novos serviços ou atualizações importantes.
          </p>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-white/5 rounded-2xl border border-gray-200 dark:border-white/10">
              <div>
                <p className="font-medium text-gray-900 dark:text-white">Status do Aviso</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Ativar ou desativar o aviso no portal</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  className="sr-only peer"
                  checked={globalAnnouncement.isActive}
                  onChange={(e) => setGlobalAnnouncement({...globalAnnouncement, isActive: e.target.checked})}
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary-500"></div>
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Título do Aviso</label>
                <input 
                  type="text" 
                  value={globalAnnouncement.title}
                  onChange={(e) => setGlobalAnnouncement({...globalAnnouncement, title: e.target.value})}
                  className="w-full px-4 py-2 bg-white dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none"
                  placeholder="Ex: Recesso de Fim de Ano"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tipo de Aviso</label>
                <select 
                  value={globalAnnouncement.type}
                  onChange={(e) => setGlobalAnnouncement({...globalAnnouncement, type: e.target.value})}
                  className="w-full px-4 py-2 bg-white dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none"
                >
                  <option value="info" className="bg-[#0a0a0a] text-white">Informativo (Azul)</option>
                  <option value="warning" className="bg-[#0a0a0a] text-white">Atenção (Amarelo)</option>
                  <option value="success" className="bg-[#0a0a0a] text-white">Novidade/Sucesso (Verde)</option>
                  <option value="new_feature" className="bg-[#0a0a0a] text-white">Lançamento (Primária)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Mensagem</label>
              <textarea 
                value={globalAnnouncement.message}
                onChange={(e) => setGlobalAnnouncement({...globalAnnouncement, message: e.target.value})}
                className="w-full px-4 py-2 bg-white dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none min-h-[100px] resize-none"
                placeholder="Detalhes do aviso..."
              />
            </div>

            <div className="flex justify-end">
              <button 
                onClick={handleSaveAnnouncement}
                className="px-6 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-xl font-medium transition-colors"
              >
                Salvar Aviso
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderProducts = () => {
    return (
      <div className="flex-1 overflow-y-auto p-6 bg-transparent custom-scrollbar relative z-10">
        <div className="max-w-4xl mx-auto">
          <div className="bg-black/20 backdrop-blur-xl border border-gray-200 dark:border-white/10 rounded-3xl p-8 shadow-lg mb-8">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6 flex items-center">
              <Package className="mr-2 text-primary-500" size={20} />
              Ofertas e Produtos
            </h3>
            
            <div className="space-y-4">
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Gerencie as ofertas disponíveis para seus clientes. Elas aparecerão na hora de criar um novo cliente.</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {offers.map((offer) => (
                  <div key={offer.id} className="bg-white dark:bg-black/40 border border-gray-200 dark:border-white/10 rounded-2xl p-5 flex flex-col justify-between hover:border-primary-500/50 transition-colors">
                    <div>
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-bold text-gray-900 dark:text-white text-lg">{offer.name}</h4>
                        <span className={`px-2 py-1 text-[10px] font-bold uppercase tracking-wider rounded-md ${offer.active ? 'bg-emerald-500/20 text-emerald-500' : 'bg-gray-500/20 text-gray-500'}`}>
                          {offer.active ? 'Ativa' : 'Inativa'}
                        </span>
                      </div>
                      <div className="space-y-1 mb-4">
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          <span className="font-medium">Tipo:</span> {offer.type === 'SUBSCRIPTION' ? 'Assinatura' : 'Pagamento Único'}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          <span className="font-medium">Preço:</span> R$ {(offer.price || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </p>
                        {offer.type === 'SUBSCRIPTION' && offer.setupPrice !== undefined && offer.setupPrice > 0 && (
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            <span className="font-medium">Setup:</span> R$ {(offer.setupPrice || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </p>
                        )}
                        {offer.type === 'SINGLE' && offer.maxInstallments && (
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            <span className="font-medium">Parcelamento:</span> Até {offer.maxInstallments}x
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex justify-end gap-2 pt-4 border-t border-gray-100 dark:border-white/5">
                      <button 
                        onClick={() => { setEditingOffer(offer); setIsOfferModalOpen(true); }}
                        className="p-2 text-gray-500 hover:text-primary-500 transition-colors rounded-lg hover:bg-primary-500/10"
                        title="Editar Oferta"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button 
                        onClick={() => { setOfferToDelete(offer.id); setIsDeleteOfferConfirmOpen(true); }}
                        className="p-2 text-gray-500 hover:text-red-500 transition-colors rounded-lg hover:bg-red-500/10"
                        title="Excluir Oferta"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex mt-6 gap-3">
                <button
                  onClick={() => { setEditingOffer(null); setIsOfferModalOpen(true); }}
                  className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-primary-500 to-primary-400 hover:from-primary-600 hover:to-primary-600 text-gray-900 dark:text-white rounded-xl transition-all font-medium shadow-lg shadow-primary-500/20 hover:scale-105 active:scale-95"
                >
                  <Plus size={18} />
                  Novo Produto
                </button>
                <button
                  onClick={restoreDefaultOffers}
                  className="flex items-center gap-2 px-5 py-3 bg-gray-200 dark:bg-white/5 hover:bg-gray-300 dark:hover:bg-white/10 text-gray-900 dark:text-white rounded-xl transition-all font-medium border border-gray-200 dark:border-white/10"
                >
                  <RefreshCw size={18} />
                  Restaurar Padrões
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderSettings = () => {
    const themes = [
      { id: 'orange', name: 'Laranja (Original)', color: 'bg-orange-500' },
      { id: 'blue', name: 'Azul', color: 'bg-blue-500' },
      { id: 'green', name: 'Verde', color: 'bg-green-500' },
      { id: 'purple', name: 'Roxo', color: 'bg-purple-500' },
      { id: 'rose', name: 'Rosa', color: 'bg-rose-500' },
    ];

    return (
      <div className="flex-1 overflow-y-auto p-6 bg-transparent custom-scrollbar relative z-10">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-8">Configurações</h2>
          
          <div className="bg-gray-100 dark:bg-white/5 backdrop-blur-xl border border-gray-200 dark:border-white/10 rounded-3xl p-8 shadow-lg mb-8">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6 flex items-center">
              <Settings className="mr-2 text-primary-500" size={20} />
              Aparência
            </h3>
            
            <div className="space-y-8">
              {/* Churn Risk Setting */}
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-gray-900 dark:text-white font-medium mb-1">Risco de Cancelamento (Churn)</h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Dias de atraso na fatura para alertar risco</p>
                </div>
                <div className="flex items-center gap-2">
                  <input 
                    type="number" 
                    min="1" 
                    max="90"
                    value={churnRiskDays}
                    onChange={(e) => setChurnRiskDays(parseInt(e.target.value) || 15)}
                    className="w-20 px-3 py-2 bg-white dark:bg-black/20 border border-gray-300 dark:border-white/10 text-gray-900 dark:text-white rounded-xl focus:ring-2 focus:ring-primary-500 outline-none text-center"
                  />
                  <span className="text-sm text-gray-500 dark:text-gray-400">dias</span>
                </div>
              </div>

              <div className="h-px bg-gray-200 dark:bg-white/10 w-full"></div>

              {/* Accent Color Picker */}
              <div>
                <h4 className="text-gray-900 dark:text-white font-medium mb-3">Cor de Destaque</h4>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Escolha a cor principal do sistema</p>
                <div className="flex flex-wrap gap-4">
                  {themes.map(t => (
                    <button
                      key={t.id}
                      onClick={() => setThemeColor(t.id)}
                      className={`flex items-center space-x-2 px-4 py-2 rounded-xl border transition-all ${themeColor === t.id ? 'border-primary-500 bg-primary-500/10' : 'border-gray-200 dark:border-white/10 hover:border-gray-300 dark:hover:border-white/20'}`}
                    >
                      <div className={`w-4 h-4 rounded-full ${t.color}`}></div>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">{t.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-black/40 backdrop-blur-xl border border-gray-200 dark:border-white/10 rounded-3xl p-8 shadow-lg mb-8">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6 flex items-center">
              <CheckCircle className="mr-2 text-primary-500" size={20} />
              Etapas do Projeto
            </h3>
            
            <div className="space-y-4">
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Defina as etapas padrão que aparecerão para novos clientes.</p>
              {defaultStages.map((stage, index) => (
                <div key={stage.id} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary-500/20 text-primary-500 flex items-center justify-center font-bold text-sm shrink-0">
                    {index + 1}
                  </div>
                  <input
                    type="text"
                    value={stage.name}
                    onChange={(e) => {
                      const newStages = [...defaultStages];
                      newStages[index].name = e.target.value;
                      setDefaultStages(newStages);
                    }}
                    className="flex-1 px-4 py-2 bg-black/40 border border-gray-300 dark:border-white/10 text-gray-900 dark:text-white rounded-xl focus:ring-2 focus:ring-primary-500 outline-none"
                  />
                  <button
                    onClick={() => {
                      const newStages = defaultStages.filter(s => s.id !== stage.id);
                      setDefaultStages(newStages);
                    }}
                    className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              ))}
              <div className="flex gap-3 mt-4">
                <button
                  onClick={() => {
                    const newStages = [...defaultStages, { id: Date.now().toString(36) + Math.random().toString(36).substring(2), name: 'Nova Etapa' }];
                    setDefaultStages(newStages);
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-200 dark:bg-white/5 hover:bg-gray-300 dark:hover:bg-white/10 text-gray-900 dark:text-white rounded-xl transition-colors text-sm font-medium"
                >
                  <Plus size={16} />
                  Adicionar Etapa
                </button>
                <button
                  onClick={async () => {
                    if (!auth.currentUser) return;
                    try {
                      await setDoc(doc(db, 'users', auth.currentUser.uid, 'settings', 'preferences'), { defaultStages }, { merge: true });
                      toast.success('Etapas salvas com sucesso!');
                    } catch (error) {
                      toast.error('Erro ao salvar etapas.');
                    }
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-xl transition-colors text-sm font-medium shadow-lg shadow-primary-500/20"
                >
                  <CheckCircle size={16} />
                  Salvar Etapas
                </button>
              </div>
            </div>
          </div>

          <div className="bg-black/20 backdrop-blur-xl border border-gray-200 dark:border-white/10 rounded-3xl p-8 shadow-lg mb-8">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6 flex items-center">
              <FileText className="mr-2 text-primary-500" size={20} />
              Formulário de Onboarding
            </h3>
            
            <div className="space-y-4">
              {onboardingQuestions.map((question, index) => (
                <div key={question.id} className="flex flex-col gap-3 p-4 bg-black/20 border border-gray-200 dark:border-white/10 rounded-xl">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 space-y-3">
                      <input
                        type="text"
                        value={question.text}
                        placeholder="Pergunta"
                        onChange={(e) => {
                          const newQ = [...onboardingQuestions];
                          newQ[index].text = e.target.value;
                          setOnboardingQuestions(newQ);
                        }}
                        className="w-full px-4 py-2 bg-transparent border-b border-gray-300 dark:border-white/10 text-gray-900 dark:text-white focus:border-primary-500 outline-none"
                      />
                      <div className="flex items-center gap-4">
                        <select
                          value={question.type}
                          onChange={(e) => {
                            const newQ = [...onboardingQuestions];
                            newQ[index].type = e.target.value as any;
                            setOnboardingQuestions(newQ);
                          }}
                          className="px-3 py-1.5 bg-black/40 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white rounded-lg text-sm outline-none"
                        >
                          <option value="text" className="bg-zinc-900">Texto Curto</option>
                          <option value="textarea" className="bg-zinc-900">Texto Longo</option>
                          <option value="select" className="bg-zinc-900">Múltipla Escolha</option>
                          <option value="file" className="bg-zinc-900">Anexo de Arquivo (Logo/Imagens)</option>
                        </select>
                        
                        <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={question.required}
                            onChange={(e) => {
                              const newQ = [...onboardingQuestions];
                              newQ[index].required = e.target.checked;
                              setOnboardingQuestions(newQ);
                            }}
                            className="rounded border-gray-300 text-primary-500 focus:ring-primary-500"
                          />
                          Obrigatório
                        </label>
                      </div>
                      
                      {question.type === 'select' && (
                        <input
                          type="text"
                          value={question.options || ''}
                          placeholder="Opções separadas por vírgula (ex: Azul, Verde, Vermelho)"
                          onChange={(e) => {
                            const newQ = [...onboardingQuestions];
                            newQ[index].options = e.target.value;
                            setOnboardingQuestions(newQ);
                          }}
                          className="w-full px-4 py-2 bg-black/40 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white rounded-lg text-sm outline-none"
                        />
                      )}
                    </div>
                    <button
                      onClick={() => {
                        const newQ = onboardingQuestions.filter(q => q.id !== question.id);
                        setOnboardingQuestions(newQ);
                      }}
                      className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              ))}
              
              <div className="flex gap-3 mt-4">
                <button
                  onClick={() => {
                    const newQ = [...onboardingQuestions, { id: Date.now().toString(36) + Math.random().toString(36).substring(2), text: '', type: 'text', required: false }];
                    setOnboardingQuestions(newQ as OnboardingQuestion[]);
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-black/40 hover:bg-black/60 border border-white/10 text-gray-900 dark:text-white rounded-xl transition-colors text-sm font-medium"
                >
                  <Plus size={16} />
                  Adicionar Pergunta
                </button>

                <button
                  onClick={() => {
                    const newQ = [...onboardingQuestions, { id: Date.now().toString(36) + Math.random().toString(36).substring(2), text: 'Logo da Empresa', type: 'file', required: false }];
                    setOnboardingQuestions(newQ as OnboardingQuestion[]);
                    toast.success('Pergunta de Logo adicionada!');
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-primary-500/20 hover:bg-primary-500/30 border border-primary-500/30 text-primary-400 rounded-xl transition-colors text-sm font-medium"
                >
                  <ImageIcon size={16} />
                  Adicionar Pedido de Logo
                </button>
                <button
                  onClick={async () => {
                    if (!auth.currentUser) return;
                    try {
                      await setDoc(doc(db, 'users', auth.currentUser.uid, 'settings', 'preferences'), { onboardingQuestions }, { merge: true });
                      toast.success('Formulário salvo com sucesso!');
                    } catch (error) {
                      toast.error('Erro ao salvar formulário.');
                    }
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-xl transition-colors text-sm font-medium shadow-lg shadow-primary-500/20"
                >
                  <CheckCircle size={16} />
                  Salvar Formulário
                </button>
              </div>
            </div>
          </div>

          <div className="bg-red-500/5 backdrop-blur-xl border border-red-500/20 rounded-3xl p-8 shadow-lg mb-8">
            <h3 className="text-lg font-semibold text-red-500 mb-6 flex items-center">
              <LogOut className="mr-2" size={20} />
              Conta
            </h3>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-900 dark:text-white font-medium">Sair do Sistema</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Encerre sua sessão atual com segurança</p>
              </div>
              <button
                onClick={() => signOut(auth)}
                className="flex items-center gap-2 px-6 py-3 bg-red-500 hover:bg-red-600 text-white rounded-2xl transition-all font-bold shadow-lg shadow-red-500/20 active:scale-95"
              >
                <LogOut size={18} />
                Sair da Conta
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-[#0a0a0a] font-sans overflow-hidden text-gray-900 dark:text-gray-100 relative">
      {/* Liquid Glass Background Orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[40vw] h-[40vw] bg-primary-600/20 rounded-full blur-[120px] pointer-events-none mix-blend-screen"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40vw] h-[40vw] bg-primary-600/20 rounded-full blur-[120px] pointer-events-none mix-blend-screen"></div>
      <div className="absolute top-[40%] left-[60%] w-[30vw] h-[30vw] bg-purple-600/10 rounded-full blur-[100px] pointer-events-none mix-blend-screen"></div>

      <aside className={`w-64 bg-gray-900/20 dark:bg-black/40 backdrop-blur-3xl border-r border-gray-200 dark:border-white/10 flex flex-col transition-all duration-300 z-30 ${sidebarOpen ? 'translate-x-0 absolute inset-y-0 left-0' : '-translate-x-full absolute md:relative md:translate-x-0'}`}>
        <div className="p-6 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <img src="https://i.imgur.com/2H9UPAW.png" alt="Hub central Logo" className="h-20 w-auto object-contain drop-shadow-lg" referrerPolicy="no-referrer" />
            <h1 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white whitespace-nowrap">Hub central</h1>
          </div>
          <button className="md:hidden text-gray-500 hover:text-gray-900 dark:text-white shrink-0 ml-2" onClick={() => setSidebarOpen(false)}><X size={20} /></button>
        </div>
        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto custom-scrollbar">
          <button onClick={() => { setView('dashboard'); setSidebarOpen(false); }} className={`w-full flex items-center space-x-3 px-4 py-3 rounded-2xl transition-all ${view === 'dashboard' ? 'bg-primary-500/20 text-primary-600 dark:text-primary-400 shadow-sm border border-primary-500/30' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-primary-500/20 dark:bg-white/5 hover:text-gray-900 dark:hover:text-white dark:text-white border border-transparent'}`}><LayoutDashboard size={20} /><span className="font-medium">Dashboard</span></button>
          <button onClick={() => { setView('analytics'); setSidebarOpen(false); }} className={`w-full flex items-center space-x-3 px-4 py-3 rounded-2xl transition-all ${view === 'analytics' ? 'bg-primary-500/20 text-primary-600 dark:text-primary-400 shadow-sm border border-primary-500/30' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-primary-500/20 dark:bg-white/5 hover:text-gray-900 dark:hover:text-white dark:text-white border border-transparent'}`}><BarChart3 size={20} /><span className="font-medium">Analytics</span></button>
          <button onClick={() => { setView('support'); setSidebarOpen(false); }} className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl transition-all ${view === 'support' ? 'bg-primary-500/20 text-primary-600 dark:text-primary-400 shadow-sm border border-primary-500/30' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-primary-500/20 dark:bg-white/5 hover:text-gray-900 dark:hover:text-white dark:text-white border border-transparent'}`}>
            <div className="flex items-center space-x-3">
              <MessageCircle size={20} />
              <span className="font-medium">Chamados</span>
            </div>
            {supportRequests.filter(r => r.status === 'aberto' || r.status === 'em_analise').length > 0 && (
              <span className="bg-primary-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                {supportRequests.filter(r => r.status === 'aberto' || r.status === 'em_analise').length}
              </span>
            )}
          </button>
          <button onClick={() => { setView('calendar'); setSidebarOpen(false); }} className={`w-full flex items-center space-x-3 px-4 py-3 rounded-2xl transition-all ${view === 'calendar' ? 'bg-primary-500/20 text-primary-600 dark:text-primary-400 shadow-sm border border-primary-500/30' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-primary-500/20 dark:bg-white/5 hover:text-gray-900 dark:hover:text-white dark:text-white border border-transparent'}`}><Calendar size={20} /><span className="font-medium">Agenda</span></button>
          <button onClick={() => { setView('finance'); setSidebarOpen(false); }} className={`w-full flex items-center space-x-3 px-4 py-3 rounded-2xl transition-all ${view === 'finance' ? 'bg-primary-500/20 text-primary-600 dark:text-primary-400 shadow-sm border border-primary-500/30' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-primary-500/20 dark:bg-white/5 hover:text-gray-900 dark:hover:text-white dark:text-white border border-transparent'}`}><DollarSign size={20} /><span className="font-medium">Gestão de Custos</span></button>
          <button onClick={() => { setView('referrals'); setSidebarOpen(false); }} className={`w-full flex items-center space-x-3 px-4 py-3 rounded-2xl transition-all ${view === 'referrals' ? 'bg-primary-500/20 text-primary-600 dark:text-primary-400 shadow-sm border border-primary-500/30' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-primary-500/20 dark:bg-white/5 hover:text-gray-900 dark:hover:text-white dark:text-white border border-transparent'}`}><Users size={20} /><span className="font-medium">Indicações</span></button>
          <button onClick={() => { setView('marketing'); setSidebarOpen(false); }} className={`w-full flex items-center space-x-3 px-4 py-3 rounded-2xl transition-all ${view === 'marketing' ? 'bg-primary-500/20 text-primary-600 dark:text-primary-400 shadow-sm border border-primary-500/30' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-primary-500/20 dark:bg-white/5 hover:text-gray-900 dark:hover:text-white dark:text-white border border-transparent'}`}><Megaphone size={20} /><span className="font-medium">Avisos</span></button>
          <button onClick={() => { setView('products'); setSidebarOpen(false); }} className={`w-full flex items-center space-x-3 px-4 py-3 rounded-2xl transition-all ${view === 'products' ? 'bg-primary-500/20 text-primary-600 dark:text-primary-400 shadow-sm border border-primary-500/30' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-primary-500/20 dark:bg-white/5 hover:text-gray-900 dark:hover:text-white dark:text-white border border-transparent'}`}><Package size={20} /><span className="font-medium">Produtos</span></button>
          <button onClick={() => { setView('monitoring'); setSidebarOpen(false); }} className={`w-full flex items-center space-x-3 px-4 py-3 rounded-2xl transition-all ${view === 'monitoring' ? 'bg-primary-500/20 text-primary-600 dark:text-primary-400 shadow-sm border border-primary-500/30' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-primary-500/20 dark:bg-white/5 hover:text-gray-900 dark:hover:text-white dark:text-white border border-transparent'}`}><Globe size={20} /><span className="font-medium">Monitoramento</span></button>
          <button onClick={() => { setView('map'); setSidebarOpen(false); }} className={`w-full flex items-center space-x-3 px-4 py-3 rounded-2xl transition-all ${view === 'map' ? 'bg-primary-500/20 text-primary-600 dark:text-primary-400 shadow-sm border border-primary-500/30' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-primary-500/20 dark:bg-white/5 hover:text-gray-900 dark:hover:text-white dark:text-white border border-transparent'}`}><MapIcon size={20} /><span className="font-medium">Mapa</span></button>
          <button onClick={() => { setView('settings'); setSidebarOpen(false); }} className={`w-full flex items-center space-x-3 px-4 py-3 rounded-2xl transition-all ${view === 'settings' ? 'bg-primary-500/20 text-primary-600 dark:text-primary-400 shadow-sm border border-primary-500/30' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-primary-500/20 dark:bg-white/5 hover:text-gray-900 dark:hover:text-white dark:text-white border border-transparent'}`}><Settings size={20} /><span className="font-medium">Configurações</span></button>
        </nav>
        <div className="p-4 border-t border-gray-200 dark:border-white/10">
          <div className="flex items-center justify-between px-4 py-3 bg-gray-100 dark:bg-white/5 backdrop-blur-xl rounded-2xl border border-gray-200 dark:border-white/10">
            <div className="flex items-center space-x-3 overflow-hidden">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-500 to-primary-400 flex items-center justify-center text-gray-900 dark:text-white font-bold shrink-0 shadow-lg shadow-primary-500/20">
                {user.email?.[0].toUpperCase() || 'U'}
              </div>
              <div className="truncate">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{user.displayName || 'Usuário'}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user.email}</p>
              </div>
            </div>
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col h-screen overflow-hidden relative z-20">
        <header className="bg-black/20 backdrop-blur-2xl border-b border-gray-200 dark:border-white/10 px-6 py-4 flex items-center justify-between shrink-0 z-30 gap-4">
          <div className="flex items-center flex-1">
            <button className="md:hidden mr-4 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:text-white" onClick={() => setSidebarOpen(true)}><Menu size={24} /></button>
            {view === 'dashboard' && (
              <div className="flex items-center w-full max-w-xl relative">
                <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400" />
                <input type="text" placeholder="Buscar por Nome, CPF, E-mail ou Status..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full bg-white/80 dark:bg-zinc-900/50 backdrop-blur-xl border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white text-sm rounded-2xl pl-12 pr-4 py-3 focus:outline-none focus:border-primary-500/50 focus:ring-1 focus:ring-primary-500/50 transition-all placeholder-gray-500 shadow-inner" />
              </div>
            )}
            {view === 'analytics' && <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Métricas</h2>}
            {view === 'calendar' && <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Agenda Central</h2>}
            {view === 'support' && <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Chamados</h2>}
            {view === 'finance' && <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Gestão de Custos e Financeiro</h2>}
            {view === 'settings' && <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Configurações</h2>}
            {view === 'referrals' && <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Programa de Indicações</h2>}
            {view === 'marketing' && <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Avisos</h2>}
            {view === 'products' && <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Produtos</h2>}
            {view === 'monitoring' && <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Monitoramento de Sites</h2>}
            {view === 'map' && <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Mapa de Clientes</h2>}
          </div>
          <div className="flex items-center gap-3">
            {view === 'dashboard' && (
              <button onClick={handleExportCSV} className="hidden sm:flex items-center space-x-2 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:bg-white/10 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white px-4 py-3 rounded-2xl transition-all font-medium shrink-0" title="Exportar para CSV">
                <Download size={18} />
                <span>Exportar</span>
              </button>
            )}
            <button onClick={() => { setEditingClient(null); setIsModalOpen(true); }} className="flex items-center space-x-2 bg-gradient-to-r from-primary-500 to-primary-400 hover:from-primary-600 hover:to-primary-600 text-gray-900 dark:text-white px-5 py-3 rounded-2xl transition-all font-medium shadow-xl shadow-primary-500/30 hover:shadow-2xl shadow-primary-500/50 hover:scale-105 active:scale-95 shrink-0"><Plus size={18} /><span className="hidden sm:inline">Novo Cliente</span></button>
          </div>
        </header>

        {loading ? (
          <div className="flex-1 p-6">
            <div className="max-w-7xl mx-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 p-5 rounded-2xl h-24 animate-pulse"></div>
                ))}
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
                <div className="bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 p-5 rounded-2xl h-72 animate-pulse"></div>
                <div className="bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 p-5 rounded-2xl h-72 animate-pulse"></div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3, 4, 5, 6].map(i => (
                  <div key={i} className="bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 p-6 rounded-3xl h-64 animate-pulse"></div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          errorMsg ? (
            <div className="flex-1 flex items-center justify-center p-6">
              <div className="bg-gray-200 dark:bg-white/10 border border-red-500/30 p-6 rounded-2xl max-w-md text-center">
                <h2 className="text-red-400 font-semibold mb-2">Erro de Conexão</h2>
                <p className="text-gray-600 dark:text-gray-300 text-sm mb-4">{errorMsg}</p>
                <button onClick={() => window.location.reload()} className="px-4 py-2 bg-gray-200 dark:bg-white/10 hover:bg-gray-300 dark:bg-white/20 text-gray-900 dark:text-white rounded-xl transition-colors text-sm">Tentar Novamente</button>
              </div>
            </div>
          ) : (
            view === 'dashboard' ? renderDashboard() : 
            view === 'analytics' ? renderAnalytics() : 
            view === 'calendar' ? <CalendarView clients={clients} onClientClick={(client) => { setEditingClient(client); setIsModalOpen(true); }} /> :
            view === 'finance' ? renderFinance() :
            view === 'referrals' ? <ReferralsView clients={clients} user={user} /> :
            view === 'marketing' ? renderMarketing() :
            view === 'products' ? renderProducts() :
            view === 'monitoring' ? <MonitoringView clients={clients} /> :
            view === 'map' ? <ClientMapView clients={clients} onClientClick={(client) => { setEditingClient(client); setIsModalOpen(true); }} /> :
            view === 'settings' ? renderSettings() :
            renderSupport()
          )
        )}
      </main>

      <ClientModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSave={handleSaveClient} 
        onDelete={handleDeleteClient} 
        initialData={editingClient} 
        onboardingQuestions={onboardingQuestions}
        user={user}
        offers={offers}
      />
      <OfferModal
        isOpen={isOfferModalOpen}
        onClose={() => setIsOfferModalOpen(false)}
        onSave={handleSaveOffer}
        onDelete={handleDeleteOffer}
        initialData={editingOffer}
      />
      <ConfirmationModal
        isOpen={isDeleteOfferConfirmOpen}
        onClose={() => { setIsDeleteOfferConfirmOpen(false); setOfferToDelete(null); }}
        onConfirm={() => offerToDelete && handleDeleteOffer(offerToDelete)}
        title="Excluir Oferta"
        message="Tem certeza que deseja excluir esta oferta? Esta ação não pode ser desfeita, mas você pode restaurar as ofertas padrão se necessário."
        confirmText="Excluir"
        cancelText="Cancelar"
      />
      {sidebarOpen && <div className="fixed inset-0 bg-black/60 z-20 md:hidden backdrop-blur-md" onClick={() => setSidebarOpen(false)}></div>}
    </div>
  );
}

function Dashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    
    try {
      const unsubscribe = onAuthStateChanged(auth, (u) => {
        setUser(u);
        setAuthLoading(false);
        clearTimeout(timeoutId);
      }, (error) => {
        console.error("Auth Error:", error);
        setAuthError(error.message);
        setAuthLoading(false);
        clearTimeout(timeoutId);
      });

      // Fallback timeout in case onAuthStateChanged never fires (e.g. blocked storage in Safari iframes)
      timeoutId = setTimeout(() => {
        console.warn("Auth initialization timed out. This may happen in restricted browsers (like Safari in an iframe).");
        setAuthLoading(false);
        setAuthError("O tempo limite de autenticação foi excedido. Se você estiver no iPhone/Safari, tente abrir o link diretamente no navegador (fora de outros apps) ou permita cookies de terceiros.");
      }, 10000);

      return () => {
        unsubscribe();
        clearTimeout(timeoutId);
      };
    } catch (err: any) {
      console.error("Auth Init Error:", err);
      setAuthError(err.message);
      setAuthLoading(false);
    }
  }, []);

  if (authLoading) {
    return <div className="min-h-screen bg-gray-50 dark:bg-[#0a0a0a] flex flex-col items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mb-4"></div><p className="text-gray-500 dark:text-gray-400 text-sm">Carregando autenticação...</p></div>;
  }

  if (authError) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-[#0a0a0a] flex items-center justify-center p-6">
        <div className="bg-gray-200 dark:bg-white/10 border border-red-500/30 p-6 rounded-2xl max-w-md text-center">
          <h2 className="text-red-400 font-semibold mb-2">Erro de Autenticação</h2>
          <p className="text-gray-600 dark:text-gray-300 text-sm mb-4">{authError}</p>
          <button onClick={() => window.location.reload()} className="px-4 py-2 bg-gray-200 dark:bg-white/10 hover:bg-gray-300 dark:bg-white/20 text-gray-900 dark:text-white rounded-xl transition-colors text-sm">Tentar Novamente</button>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Auth />;
  }

  return <CRM user={user} />;
}

import { BrowserRouter, Routes, Route } from 'react-router-dom';
import ClientPortal from './components/ClientPortal';
import OnboardingForm from './components/OnboardingForm';
import { Toaster } from 'sonner';

export default function App() {
  return (
    <BrowserRouter>
      {!isFirebaseConfigured && (
        <div className="fixed top-0 left-0 right-0 z-[9999] bg-red-600 text-white p-4 text-center font-bold shadow-lg">
          <div className="flex items-center justify-center gap-2">
            <AlertTriangle size={20} />
            <span>Firebase não configurado! Adicione as chaves no painel de Secrets do AI Studio.</span>
          </div>
        </div>
      )}
      <Toaster position="top-right" theme="dark" />
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/cliente/:userId/:clientId" element={<ClientPortal />} />
        <Route path="/onboarding/:userId" element={<OnboardingForm />} />
        <Route path="/onboarding/:userId/:clientId" element={<OnboardingForm />} />
      </Routes>
    </BrowserRouter>
  );
}
