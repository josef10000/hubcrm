import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { User } from 'firebase/auth';
import { collection, doc, setDoc, deleteDoc, onSnapshot, updateDoc, query, where, getDocs } from 'firebase/firestore';
import { z } from 'zod';
import { toast } from 'sonner';
import { auth, db } from '../lib/firebase';
import { Client, Offer, OnboardingQuestion, Expense, PlanType, SiteStatus, clientSchema, Transaction, TransactionCategory, Budget } from '../types';
import { getPlanPrice, getSetupPrice, calculateDiscount, updateReferrerSubscription } from '../helpers';

// ─── View Type ──────────────────────────────────────────────────────────────────
export type CRMView = 'dashboard' | 'analytics' | 'support' | 'finance' | 'settings' | 'calendar' | 'referrals' | 'marketing' | 'products' | 'monitoring' | 'map';

// ─── Context Type ───────────────────────────────────────────────────────────────
interface CRMContextType {
  // Auth
  user: User;

  // Core Data
  clients: Client[];
  offers: Offer[];
  filteredClients: Client[];
  supportRequests: any[];
  expenses: Expense[];
  transactions: Transaction[];
  transactionCategories: TransactionCategory[];
  budgets: Budget[];
  services: any[];

  // Loading / Error
  loading: boolean;
  errorMsg: string | null;
  isSyncing: boolean;

  // Pagination
  currentPage: number;
  setCurrentPage: (page: number) => void;
  clientsPerPage: number;

  // Navigation
  view: CRMView;
  setView: (view: CRMView) => void;
  dashboardMode: 'list' | 'kanban';
  setDashboardMode: (mode: 'list' | 'kanban') => void;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;

  // Client Modal
  isModalOpen: boolean;
  setIsModalOpen: (open: boolean) => void;
  editingClient: Client | null;
  setEditingClient: (client: Client | null) => void;

  // Offer Modal
  isOfferModalOpen: boolean;
  setIsOfferModalOpen: (open: boolean) => void;
  editingOffer: Partial<Offer> | null;
  setEditingOffer: (offer: Partial<Offer> | null) => void;
  isDeleteOfferConfirmOpen: boolean;
  setIsDeleteOfferConfirmOpen: (open: boolean) => void;
  offerToDelete: string | null;
  setOfferToDelete: (id: string | null) => void;

  // Filters & Sort
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  filterStatus: SiteStatus | 'Todos';
  setFilterStatus: (status: SiteStatus | 'Todos') => void;
  sortBy: 'recent' | 'alphabetical' | 'value';
  setSortBy: (sort: 'recent' | 'alphabetical' | 'value') => void;

  // Theme
  themeColor: string;
  setThemeColor: (color: string) => void;

  // Settings
  churnRiskDays: number;
  setChurnRiskDays: (days: number) => void;
  defaultStages: { id: string; name: string }[];
  setDefaultStages: (stages: { id: string; name: string }[]) => void;
  onboardingQuestions: OnboardingQuestion[];
  setOnboardingQuestions: (questions: OnboardingQuestion[]) => void;
  defaultContractText: string;
  setDefaultContractText: (text: string) => void;

  // Support
  replyingTo: string | null;
  setReplyingTo: (id: string | null) => void;
  replyMessage: string;
  setReplyMessage: (msg: string) => void;

  // Finance
  newExpense: Partial<Expense>;
  setNewExpense: (expense: Partial<Expense>) => void;

  // Marketing
  globalAnnouncement: { title: string; message: string; type: string; isActive: boolean };
  setGlobalAnnouncement: (announcement: { title: string; message: string; type: string; isActive: boolean }) => void;

  // Actions
  handleSaveClient: (clientData: Partial<Client>) => Promise<void>;
  handleDeleteClient: (clientId: string) => Promise<void>;
  handleSaveOffer: (offerData: Partial<Offer>) => Promise<void>;
  handleDeleteOffer: (offerId: string) => Promise<void>;
  restoreDefaultOffers: () => Promise<void>;
  handleExportCSV: () => void;
  syncPayments: () => Promise<void>;

  // Helpers
  isChurnRisk: (client: Client) => boolean;
  isComboNearRenewal: (client: Client) => boolean;
}

const CRMContext = createContext<CRMContextType | null>(null);

export function useCRM() {
  const context = useContext(CRMContext);
  if (!context) {
    throw new Error('useCRM must be used within a CRMProvider');
  }
  return context;
}

// ─── Provider ───────────────────────────────────────────────────────────────────
export function CRMProvider({ user, children }: { user: User; children: React.ReactNode }) {
  // ---- Core State ----
  const [clients, setClients] = useState<Client[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const clientsPerPage = 9;
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // ---- Navigation ----
  const [view, setView] = useState<CRMView>('dashboard');
  const [dashboardMode, setDashboardMode] = useState<'list' | 'kanban'>('list');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [isOfferModalOpen, setIsOfferModalOpen] = useState(false);
  const [editingOffer, setEditingOffer] = useState<Partial<Offer> | null>(null);
  const [isDeleteOfferConfirmOpen, setIsDeleteOfferConfirmOpen] = useState(false);
  const [offerToDelete, setOfferToDelete] = useState<string | null>(null);
  const [lastDeletedOffer, setLastDeletedOffer] = useState<Offer | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // ---- Filters ----
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<SiteStatus | 'Todos'>('Todos');
  const [sortBy, setSortBy] = useState<'recent' | 'alphabetical' | 'value'>('recent');

  // ---- Theme ----
  const [themeColor, setThemeColor] = useState(() => localStorage.getItem('theme-color') || 'orange');
  const [churnRiskDays, setChurnRiskDays] = useState(() => parseInt(localStorage.getItem('churnRiskDays') || '15', 10));

  // ---- Settings ----
  const [defaultStages, setDefaultStages] = useState<{ id: string; name: string }[]>([
    { id: '1', name: 'Briefing' },
    { id: '2', name: 'Design UI' },
    { id: '3', name: 'Desenvolvimento' },
    { id: '4', name: 'Revisão' },
    { id: '5', name: 'Publicação' },
  ]);
  const [onboardingQuestions, setOnboardingQuestions] = useState<OnboardingQuestion[]>([
    { id: '1', text: 'Qual o nome da sua empresa?', type: 'text', required: true },
    { id: '2', text: 'Descreva brevemente o seu negócio', type: 'textarea', required: true },
    { id: '3', text: 'Quais são as suas cores preferidas?', type: 'text', required: false },
    { id: '4', text: 'Logo da Empresa (Opcional)', type: 'file', required: false },
  ]);
  const [defaultContractText, setDefaultContractText] = useState<string>('CONTRATO DE PRESTAÇÃO DE SERVIÇOS\n\n1. OBJETO DO CONTRATO\nO presente instrumento tem como objeto a prestação de serviços digitais acordados entre as partes no plano ou projeto selecionado.\n\n2. PRAZOS E ENTREGAS\nAs entregas serão realizadas conforme cronograma acordado.\n\n3. PAGAMENTOS E CANCELAMENTOS\nEm caso de suspensão de pagamento, o serviço será suspenso após X dias. Cancelamentos devem ser notificados antecipadamente.');

  // ---- Support ----
  const [supportRequests, setSupportRequests] = useState<any[]>([]);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyMessage, setReplyMessage] = useState('');

  // ---- Finance ----
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [transactionCategories, setTransactionCategories] = useState<TransactionCategory[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [newExpense, setNewExpense] = useState<Partial<Expense>>({ category: 'Ferramentas' });

  // ---- Marketing ----
  const [globalAnnouncement, setGlobalAnnouncement] = useState<{ title: string; message: string; type: string; isActive: boolean }>({
    title: '',
    message: '',
    type: 'info',
    isActive: false,
  });
  const [services, setServices] = useState<any[]>([]);

  // ═══════════════════════ EFFECTS ═══════════════════════

  // Dark mode
  useEffect(() => {
    document.documentElement.classList.add('dark');
  }, []);

  // Theme color
  useEffect(() => {
    localStorage.setItem('theme-color', themeColor);
    document.documentElement.classList.remove('theme-orange', 'theme-blue', 'theme-green', 'theme-purple', 'theme-rose');
    document.documentElement.classList.add(`theme-${themeColor}`);
  }, [themeColor]);

  // Churn risk days
  useEffect(() => {
    localStorage.setItem('churnRiskDays', churnRiskDays.toString());
  }, [churnRiskDays]);

  // Settings listener
  useEffect(() => {
    if (!user) return;
    const settingsRef = doc(db, 'users', user.uid, 'settings', 'preferences');
    const unsubscribe = onSnapshot(settingsRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.defaultStages) setDefaultStages(data.defaultStages);
        if (data.onboardingQuestions) setOnboardingQuestions(data.onboardingQuestions);
        if (data.defaultContractText !== undefined) setDefaultContractText(data.defaultContractText);
      }
    });
    return () => unsubscribe();
  }, [user]);

  // Global announcement + services listener
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
      snapshot.forEach((d) => loadedServices.push({ id: d.id, ...d.data() }));
      setServices(loadedServices.sort((a, b) => (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0)));
    });

    return () => {
      unsubGlobal();
      unsubServices();
    };
  }, [user]);

  // Main Firestore listeners (clients, offers, support, expenses)
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
          const defaultOffers: Offer[] = [
            { id: Date.now().toString(36) + Math.random().toString(36).substring(2), name: 'Ecossistema Essencial', type: 'SUBSCRIPTION', price: 397, setupPrice: 2500, active: true, createdAt: Date.now() },
            { id: Date.now().toString(36) + Math.random().toString(36).substring(2), name: 'Profissional', type: 'SUBSCRIPTION', price: 897, setupPrice: 7500, active: true, createdAt: Date.now() },
          ];
          for (const offer of defaultOffers) {
            await setDoc(doc(db, 'users', user.uid, 'offers', offer.id), offer);
          }
        } else {
          const loadedOffers: Offer[] = [];
          snapshot.forEach((d) => loadedOffers.push(d.data() as Offer));
          setOffers(loadedOffers.sort((a, b) => b.createdAt - a.createdAt));
        }
      });

      const clientsRef = collection(db, 'users', user.uid, 'clients');
      unsubscribeClients = onSnapshot(
        clientsRef,
        (snapshot) => {
          const loadedClients: Client[] = [];
          snapshot.forEach((d) => loadedClients.push(d.data() as Client));
          setClients(loadedClients);
          setLoading(false);
          clearTimeout(timeoutId);
        },
        (error: any) => {
          console.error('Error fetching clients:', error);
          setErrorMsg(`Erro ao carregar dados do banco: ${error.message}`);
          setLoading(false);
          clearTimeout(timeoutId);
        }
      );

      const requestsRef = collection(db, 'users', user.uid, 'supportRequests');
      unsubscribeRequests = onSnapshot(requestsRef, (snapshot) => {
        const loadedRequests: any[] = [];
        snapshot.forEach((d) => loadedRequests.push({ id: d.id, ...d.data() }));
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
        snapshot.forEach((d) => loadedExpenses.push(d.data() as Expense));
        setExpenses(loadedExpenses.sort((a, b) => b.date - a.date));
      });

      const transactionsRef = collection(db, 'users', user.uid, 'transactions');
      const unsubscribeTransactions = onSnapshot(transactionsRef, (snapshot) => {
        const loaded: Transaction[] = [];
        snapshot.forEach((d) => loaded.push(d.data() as Transaction));
        setTransactions(loaded.sort((a, b) => b.date - a.date));
      });

      const categoriesRef = collection(db, 'users', user.uid, 'transactionCategories');
      const unsubscribeCategories = onSnapshot(categoriesRef, (snapshot) => {
        const loaded: TransactionCategory[] = [];
        snapshot.forEach((d) => loaded.push(d.data() as TransactionCategory));
        setTransactionCategories(loaded);
      });

      const budgetsRef = collection(db, 'users', user.uid, 'budgets');
      const unsubscribeBudgets = onSnapshot(budgetsRef, (snapshot) => {
        const loaded: Budget[] = [];
        snapshot.forEach((d) => loaded.push(d.data() as Budget));
        setBudgets(loaded);
      });

      timeoutId = setTimeout(() => {
        console.warn('Firestore initialization timed out.');
        setLoading(false);
        setErrorMsg('O tempo limite de conexão com o banco de dados foi excedido. Verifique sua conexão ou se o navegador está bloqueando o acesso.');
      }, 10000);
    } catch (err: any) {
      console.error('Firestore Init Error:', err);
      setErrorMsg(err.message);
      setLoading(false);
    }

    return () => {
      unsubscribeClients();
      unsubscribeRequests();
      unsubscribeExpenses();
      unsubscribeOffers();
      if (typeof unsubscribeTransactions === 'function') unsubscribeTransactions();
      if (typeof unsubscribeCategories === 'function') unsubscribeCategories();
      if (typeof unsubscribeBudgets === 'function') unsubscribeBudgets();
      clearTimeout(timeoutId);
    };
  }, [user.uid]);

  // Reset pagination on filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterStatus, sortBy]);

  // ═══════════════════════ COMPUTED ═══════════════════════

  const filteredClients = useMemo(() => {
    let result = clients.filter((c) => {
      const matchesSearch =
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.whatsapp.includes(searchTerm) ||
        (c.cpfCnpj && c.cpfCnpj.includes(searchTerm)) ||
        (c.niche && c.niche.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesStatus = filterStatus === 'Todos' || c.status === filterStatus;
      return matchesSearch && matchesStatus;
    });

    result.sort((a, b) => {
      if (sortBy === 'alphabetical') return a.name.localeCompare(b.name);
      if (sortBy === 'value') return getPlanPrice(b.plan, b.billingCycle, b) - getPlanPrice(a.plan, a.billingCycle, a);
      return b.createdAt - a.createdAt;
    });

    return result;
  }, [clients, searchTerm, filterStatus, sortBy]);

  // ═══════════════════════ ACTIONS ═══════════════════════

  const syncPayments = async () => {
    setIsSyncing(true);
    try {
      const clientsToSync = clients.filter((c) => c.asaasCustomerId && c.status !== 'Cancelado');
      let updatedCount = 0;

      for (const client of clientsToSync) {
        try {
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
                await setDoc(doc(db, 'users', user.uid, 'clients', client.id), updatedClient);
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
        createdAt: isNew ? Date.now() : offerData.createdAt || Date.now(),
      };
      if (offerData.setupPrice !== undefined) offerToSave.setupPrice = offerData.setupPrice;
      if (offerData.maxInstallments !== undefined) offerToSave.maxInstallments = offerData.maxInstallments;

      await setDoc(offerRef, offerToSave);
      toast.success(isNew ? 'Oferta criada com sucesso!' : 'Oferta atualizada com sucesso!');
      setIsOfferModalOpen(false);
    } catch (error: any) {
      console.error('Error saving offer:', error);
      toast.error(`Erro ao salvar oferta: ${error.message || 'Erro desconhecido'}`);
    }
  };

  const handleDeleteOffer = async (offerId: string) => {
    if (!auth.currentUser) return;
    const offerToBackup = offers.find((o) => o.id === offerId);
    try {
      await deleteDoc(doc(db, 'users', auth.currentUser.uid, 'offers', offerId));
      if (offerToBackup) setLastDeletedOffer(offerToBackup);
      toast.success('Oferta excluída com sucesso!', {
        action: { label: 'Desfazer', onClick: () => offerToBackup && undoDeleteOffer(offerToBackup) },
      });
      setIsDeleteOfferConfirmOpen(false);
      setOfferToDelete(null);
    } catch (error) {
      console.error('Error deleting offer:', error);
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
      console.error('Error undoing delete:', error);
      toast.error('Erro ao restaurar oferta');
    }
  };

  const restoreDefaultOffers = async () => {
    if (!auth.currentUser) return;
    try {
      const defaultOffers: Offer[] = [
        { id: Date.now().toString(36) + Math.random().toString(36).substring(2), name: 'Ecossistema Essencial', type: 'SUBSCRIPTION', price: 397, setupPrice: 2500, active: true, createdAt: Date.now() },
        { id: Date.now().toString(36) + Math.random().toString(36).substring(2), name: 'Profissional', type: 'SUBSCRIPTION', price: 897, setupPrice: 7500, active: true, createdAt: Date.now() },
      ];
      for (const offer of defaultOffers) {
        const exists = offers.some((o) => o.name === offer.name);
        if (!exists) await setDoc(doc(db, 'users', auth.currentUser!.uid, 'offers', offer.id), offer);
      }
      toast.success('Ofertas padrão restauradas com sucesso!');
    } catch (error) {
      console.error('Error restoring default offers:', error);
      toast.error('Erro ao restaurar ofertas padrão');
    }
  };

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
            const referralsRef = collection(db, 'users', user.uid, 'referrals');
            const q = query(referralsRef, where('referredClientId', '==', client.id));
            const querySnapshot = await getDocs(q);
            if (!querySnapshot.empty) {
              const referralDoc = querySnapshot.docs[0];
              const referralData = referralDoc.data();
              if (referralData.status === 'confirmed' || referralData.status === 'applied') {
                const bonusToRevoke = referralData.bonusAmount || 0;
                const newBalance = Math.max(0, (referrer.referralBalance || 0) - bonusToRevoke);
                const newCount = Math.max(0, (referrer.referralCount || 0) - 1);
                await updateDoc(doc(db, 'users', user.uid, 'clients', referrer.id), { referralBalance: newBalance, referralCount: newCount });
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
            const delRes = await fetch('/api/asaas/delete-subscription', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ subscriptionId: client.asaasSubscriptionId }) });
            if (!delRes.ok) {
              console.error('Failed to cancel subscription in Asaas');
              toast.error('Aviso: Não foi possível cancelar a assinatura no Asaas automaticamente.');
            } else {
              client.paymentStatus = 'N/A';
              client.invoiceUrl = undefined;
            }
          }
          try {
            const paymentsRes = await fetch(`/api/asaas/payments?customer=${client.asaasCustomerId}`);
            if (paymentsRes.ok) {
              const paymentsData = await paymentsRes.json();
              const payments = paymentsData.data || [];
              for (const payment of payments) {
                if (payment.status === 'PENDING' || payment.status === 'OVERDUE') {
                  await fetch('/api/asaas/delete-payment', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ paymentId: payment.id }) });
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

        const customerRes = await fetch('/api/asaas/customers', {
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
            const paymentRes = await fetch('/api/asaas/payment-links', {
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
              const paymentRes = await fetch('/api/asaas/payments', {
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

              const subRes = await fetch('/api/asaas/subscriptions', {
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
              const subRes = await fetch('/api/asaas/subscriptions', {
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
          toast.error(`Erro ao criar cliente no Asaas: ${err.error || 'Erro desconhecido'}`);
        }
      }

      const cleanClient = Object.fromEntries(Object.entries(client).filter(([_, v]) => v !== undefined));
      await setDoc(doc(db, 'users', user.uid, 'clients', client.id), cleanClient);
      setIsModalOpen(false);
      setEditingClient(null);
    } catch (error: any) {
      console.error('Save Error:', error);
      toast.error(`Erro ao salvar cliente: ${error.message}`);
    }
  };

  const handleDeleteClient = async (clientId: string) => {
    setIsModalOpen(false);
    const clientToDelete = clients.find((c) => c.id === clientId);

    if (clientToDelete?.asaasCustomerId) {
      if (clientToDelete.asaasSubscriptionId) {
        try {
          const delRes = await fetch('/api/asaas/delete-subscription', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ subscriptionId: clientToDelete.asaasSubscriptionId }) });
          if (!delRes.ok) {
            console.error('Failed to cancel subscription in Asaas before deletion');
            toast.error('Aviso: O cliente foi excluído, mas não foi possível cancelar a assinatura no Asaas automaticamente.');
          }
        } catch (e) {
          console.error('Error calling delete-subscription API', e);
        }
      }
      try {
        const paymentsRes = await fetch(`/api/asaas/payments?customer=${clientToDelete.asaasCustomerId}`);
        if (paymentsRes.ok) {
          const paymentsData = await paymentsRes.json();
          const payments = paymentsData.data || [];
          for (const payment of payments) {
            if (payment.status === 'PENDING' || payment.status === 'OVERDUE') {
              await fetch('/api/asaas/delete-payment', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ paymentId: payment.id }) });
            }
          }
        }
      } catch (e) {
        console.error('Error cancelling pending payments before deletion', e);
      }
    }

    if (clientToDelete?.siteLink) {
      try {
        const monitorsRes = await fetch('/api/uptimerobot/monitors');
        if (monitorsRes.ok) {
          const monitors = await monitorsRes.json();
          const clientUrl = clientToDelete.siteLink.replace(/^https?:\/\//, '').replace(/\/$/, '');
          const monitorToDelete = monitors.find((m: any) => m.url.includes(clientUrl));
          if (monitorToDelete) {
            await fetch('/api/uptimerobot/monitors', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: monitorToDelete.id }) });
            console.log('Monitor deleted from UptimeRobot');
          }
        }
      } catch (e) {
        console.error('Error deleting monitor from UptimeRobot', e);
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

  const handleExportCSV = () => {
    const headers = ['Nome', 'WhatsApp', 'CPF/CNPJ', 'Email', 'Plano', 'Status', 'Status Pagamento', 'Vencimento'];
    const csvContent = [
      headers.join(','),
      ...filteredClients.map((c) =>
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

  // ═══════════════════════ HELPERS ═══════════════════════

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
    return diffDays <= 30 && diffDays >= -7;
  };

  // ═══════════════════════ CONTEXT VALUE ═══════════════════════

  const value: CRMContextType = {
    user,
    clients, offers, filteredClients, supportRequests, expenses, transactions, transactionCategories, budgets, services,
    loading, errorMsg, isSyncing,
    currentPage, setCurrentPage, clientsPerPage,
    view, setView, dashboardMode, setDashboardMode, sidebarOpen, setSidebarOpen,
    isModalOpen, setIsModalOpen, editingClient, setEditingClient,
    isOfferModalOpen, setIsOfferModalOpen, editingOffer, setEditingOffer,
    isDeleteOfferConfirmOpen, setIsDeleteOfferConfirmOpen, offerToDelete, setOfferToDelete,
    searchTerm, setSearchTerm, filterStatus, setFilterStatus, sortBy, setSortBy,
    themeColor, setThemeColor,
    churnRiskDays, setChurnRiskDays, defaultStages, setDefaultStages,
    onboardingQuestions, setOnboardingQuestions,
    defaultContractText, setDefaultContractText,
    replyingTo, setReplyingTo, replyMessage, setReplyMessage,
    newExpense, setNewExpense,
    globalAnnouncement, setGlobalAnnouncement,
    handleSaveClient, handleDeleteClient,
    handleSaveOffer, handleDeleteOffer, restoreDefaultOffers,
    handleExportCSV, syncPayments,
    isChurnRisk, isComboNearRenewal,
  };

  return <CRMContext.Provider value={value}>{children}</CRMContext.Provider>;
}
