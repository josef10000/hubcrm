import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { collection, doc, setDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Client, Offer, OnboardingQuestion, Expense, PlanType, SiteStatus, Transaction, TransactionCategory, Budget } from '../types';

// ── Hooks ──
import { useSettings } from '../hooks/useSettings';
import { useFinance } from '../hooks/useFinance';
import { useOffers } from '../hooks/useOffers';
import { useClients } from '../hooks/useClients';

// ─── View Type ──────────────────────────────────────────────────────────────────
export type CRMView = 'dashboard' | 'analytics' | 'support' | 'finance' | 'settings' | 'calendar' | 'referrals' | 'marketing' | 'products' | 'monitoring' | 'map' | 'leads';

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
  setCurrentPage: React.Dispatch<React.SetStateAction<number>>;
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
  // ── Local UI State ──
  const [clients, setClients] = useState<Client[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const clientsPerPage = 9;
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [view, setView] = useState<CRMView>('dashboard');
  const [dashboardMode, setDashboardMode] = useState<'list' | 'kanban'>('list');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<SiteStatus | 'Todos'>('Todos');
  const [sortBy, setSortBy] = useState<'recent' | 'alphabetical' | 'value'>('recent');

  const [supportRequests, setSupportRequests] = useState<any[]>([]);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyMessage, setReplyMessage] = useState('');

  const [services, setServices] = useState<any[]>([]);

  // ── Specialized Hooks ──
  const settings = useSettings(user.uid);
  const finance = useFinance(user.uid);
  const offerActions = useOffers(user.uid, offers, setOffers);
  const clientActions = useClients({
    userId: user.uid,
    clients,
    offers,
    editingClient,
    setEditingClient,
    setIsModalOpen,
    defaultStages: settings.defaultStages,
    searchTerm,
    filterStatus,
    sortBy,
    churnRiskDays: settings.churnRiskDays,
  });

  // ═══ Firestore Listeners (core data only) ═══
  useEffect(() => {
    setLoading(true);
    setErrorMsg(null);
    let timeoutId: NodeJS.Timeout;
    let unsubscribeClients: () => void = () => {};
    let unsubscribeRequests: () => void = () => {};
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

      // Services listener
      const servicesRef = collection(db, 'users', user.uid, 'services');
      const unsubServices = onSnapshot(servicesRef, (snapshot) => {
        const loadedServices: any[] = [];
        snapshot.forEach((d) => loadedServices.push({ id: d.id, ...d.data() }));
        setServices(loadedServices.sort((a, b) => (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0)));
      });

      timeoutId = setTimeout(() => {
        console.warn('Firestore initialization timed out.');
        setLoading(false);
        setErrorMsg('O tempo limite de conexão com o banco de dados foi excedido. Verifique sua conexão ou se o navegador está bloqueando o acesso.');
      }, 10000);

      return () => {
        unsubscribeClients();
        unsubscribeRequests();
        unsubscribeOffers();
        unsubServices();
        clearTimeout(timeoutId);
      };
    } catch (err: any) {
      console.error('Firestore Init Error:', err);
      setErrorMsg(err.message);
      setLoading(false);
    }
  }, [user.uid]);

  // Reset pagination on filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterStatus, sortBy]);

  // ═══ Context Value ═══
  const value: CRMContextType = {
    user,
    clients, offers, filteredClients: clientActions.filteredClients, supportRequests,
    expenses: finance.expenses, transactions: finance.transactions,
    transactionCategories: finance.transactionCategories, budgets: finance.budgets, services,
    loading, errorMsg, isSyncing: clientActions.isSyncing,
    currentPage, setCurrentPage, clientsPerPage,
    view, setView, dashboardMode, setDashboardMode, sidebarOpen, setSidebarOpen,
    isModalOpen, setIsModalOpen, editingClient, setEditingClient,
    isOfferModalOpen: offerActions.isOfferModalOpen, setIsOfferModalOpen: offerActions.setIsOfferModalOpen,
    editingOffer: offerActions.editingOffer, setEditingOffer: offerActions.setEditingOffer,
    isDeleteOfferConfirmOpen: offerActions.isDeleteOfferConfirmOpen, setIsDeleteOfferConfirmOpen: offerActions.setIsDeleteOfferConfirmOpen,
    offerToDelete: offerActions.offerToDelete, setOfferToDelete: offerActions.setOfferToDelete,
    searchTerm, setSearchTerm, filterStatus, setFilterStatus, sortBy, setSortBy,
    themeColor: settings.themeColor, setThemeColor: settings.setThemeColor,
    churnRiskDays: settings.churnRiskDays, setChurnRiskDays: settings.setChurnRiskDays,
    defaultStages: settings.defaultStages, setDefaultStages: settings.setDefaultStages,
    onboardingQuestions: settings.onboardingQuestions, setOnboardingQuestions: settings.setOnboardingQuestions,
    defaultContractText: settings.defaultContractText, setDefaultContractText: settings.setDefaultContractText,
    replyingTo, setReplyingTo, replyMessage, setReplyMessage,
    newExpense: finance.newExpense, setNewExpense: finance.setNewExpense,
    globalAnnouncement: settings.globalAnnouncement, setGlobalAnnouncement: settings.setGlobalAnnouncement,
    handleSaveClient: clientActions.handleSaveClient, handleDeleteClient: clientActions.handleDeleteClient,
    handleSaveOffer: offerActions.handleSaveOffer, handleDeleteOffer: offerActions.handleDeleteOffer,
    restoreDefaultOffers: offerActions.restoreDefaultOffers,
    handleExportCSV: clientActions.handleExportCSV, syncPayments: clientActions.syncPayments,
    isChurnRisk: clientActions.isChurnRisk, isComboNearRenewal: clientActions.isComboNearRenewal,
  };

  return <CRMContext.Provider value={value}>{children}</CRMContext.Provider>;
}
