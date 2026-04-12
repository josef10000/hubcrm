import React, { createContext, useContext, useState, useEffect } from 'react';
import { collection, doc, setDoc, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Client, Offer, Expense, Transaction, TransactionCategory, Budget, Lead, UserProfile } from '../types';
import { VacationPeriod } from '../types/people';
import { useAuth } from './AuthContext';

// ── Hooks ──
import { useSettings } from '../hooks/useSettings';
import { useFinance } from '../hooks/useFinance';
import { useOffers } from '../hooks/useOffers';
import { useClients } from '../hooks/useClients';
import { useUI } from './UIContext';

// ─── Context Type ───────────────────────────────────────────────────────────────
interface CRMContextType {
  // Core Data
  clients: Client[];
  leads: Lead[];
  offers: Offer[];
  supportRequests: any[];
  expenses: Expense[];
  transactions: Transaction[];
  transactionCategories: TransactionCategory[];
  budgets: Budget[];
  services: any[];
  vacations: VacationPeriod[];
  teamProfiles: UserProfile[];
  activeLeadsCount: number;
  effectiveOrgId: string;
  userProfile: any | null;

  // Loading / Error
  loading: boolean;
  errorMsg: string | null;
  isSyncing: boolean;
  isEmailLoading: string | null;

  // Offer logic
  isOfferModalOpen: boolean;
  setIsOfferModalOpen: (open: boolean) => void;
  editingOffer: Partial<Offer> | null;
  setEditingOffer: (offer: Partial<Offer> | null) => void;
  isDeleteOfferConfirmOpen: boolean;
  setIsDeleteOfferConfirmOpen: (open: boolean) => void;
  offerToDelete: string | null;
  setOfferToDelete: (id: string | null) => void;

  // Edit Client logic
  editingClient: Client | null;
  setEditingClient: (client: Client | null) => void;

  // Settings
  churnRiskDays: number;
  setChurnRiskDays: (days: number) => void;
  defaultStages: { id: string; name: string }[];
  setDefaultStages: (stages: { id: string; name: string }[]) => void;
  onboardingQuestions: any[];
  setOnboardingQuestions: (questions: any[]) => void;
  defaultContractText: string;
  setDefaultContractText: (text: string) => void;
  checkoutTitle: string;
  setCheckoutTitle: (title: string) => void;
  checkoutDescription: string;
  setCheckoutDescription: (desc: string) => void;
  enpsQuestion: string;
  setEnpsQuestion: (question: string) => void;
  enpsFrequency: string;
  setEnpsFrequency: (freq: 'mensal' | 'trimestral' | 'semestral') => void;
  csatTitle: string;
  setCsatTitle: (title: string) => void;
  csatQuestion: string;
  setCsatQuestion: (question: string) => void;

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
  handleExportCSV: (dataToExport: Client[]) => void;
  syncPayments: () => Promise<void>;
  triggerManualEmail: (clientId: string, emailType: 'WELCOME' | 'INVOICE' | 'OVERDUE' | 'WELCOME_SUBSCRIPTION' | 'WELCOME_LINK') => Promise<boolean>;
  toggleAsaasNotifications: (clientId: string, enabled: boolean) => Promise<void>;

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
export function CRMProvider({ children }: { children: React.ReactNode }) {
  const { user, userProfile } = useAuth();
  const { setIsModalOpen } = useUI();

  // ── Local Core Data State ──
  const [clients, setClients] = useState<Client[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [vacations, setVacations] = useState<VacationPeriod[]>([]);
  const [teamProfiles, setTeamProfiles] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [supportRequests, setSupportRequests] = useState<any[]>([]);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyMessage, setReplyMessage] = useState('');
  const [services, setServices] = useState<any[]>([]);

  // ── Specialized Hooks ──
  const effectiveOrgId = userProfile?.orgId || user?.uid || '';
  const settings = effectiveOrgId ? useSettings(effectiveOrgId) : ({} as any);
  const finance = effectiveOrgId ? useFinance(effectiveOrgId) : ({} as any);
  const offerActions = useOffers(effectiveOrgId, offers, setOffers);
  const clientActions = useClients({
    userId: effectiveOrgId,
    clients,
    offers,
    editingClient,
    setEditingClient,
    setIsModalOpen,
    defaultStages: settings.defaultStages || [],
    churnRiskDays: settings.churnRiskDays || 7,
  });

  // ═══ Firestore Listeners (core data only) ═══
  useEffect(() => {
    if (!effectiveOrgId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setErrorMsg(null);
    let timeoutId: NodeJS.Timeout;
    let unsubscribeClients: () => void = () => { };
    let unsubscribeLeads: () => void = () => { };
    let unsubscribeRequests: () => void = () => { };
    let unsubscribeOffers: () => void = () => { };
    let unsubServices: () => void = () => { };

    try {
      const offersRef = collection(db, 'organizations', effectiveOrgId, 'offers');
      unsubscribeOffers = onSnapshot(offersRef, async (snapshot) => {
        if (snapshot.empty && setOffers) {
          const defaultOffers: Offer[] = [
            { id: Date.now().toString(36) + Math.random().toString(36).substring(2), name: 'Ecossistema Essencial', type: 'SUBSCRIPTION', price: 397, setupPrice: 2500, active: true, displayContext: 'PORTAL', createdAt: Date.now() },
            { id: Date.now().toString(36) + Math.random().toString(36).substring(2), name: 'Profissional', type: 'SUBSCRIPTION', price: 897, setupPrice: 7500, active: true, displayContext: 'PORTAL', createdAt: Date.now() },
          ];
          for (const offer of defaultOffers) {
            await setDoc(doc(db, 'organizations', effectiveOrgId, 'offers', offer.id), offer);
          }
        } else {
          const loadedOffers: Offer[] = [];
          snapshot.forEach((d) => loadedOffers.push(d.data() as Offer));
          setOffers(loadedOffers.sort((a, b) => (a.order || 0) - (b.order || 0) || b.createdAt - a.createdAt));
        }
      });

      const clientsRef = collection(db, 'organizations', effectiveOrgId, 'clients');
      unsubscribeClients = onSnapshot(
        clientsRef,
        (snapshot) => {
          let loadedClients: Client[] = [];
          snapshot.forEach((d) => loadedClients.push({ id: d.id, ...d.data() } as Client));
          
          // Filtro por cargo: Equipe comercial só vê o que está atribuído a ela
          if (userProfile?.role === 'SDR' || userProfile?.role === 'Executive') {
            loadedClients = loadedClients.filter(c => c.assignedTo === user?.uid);
          }
          
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

      const leadsRef = collection(db, 'organizations', effectiveOrgId, 'leads');
      unsubscribeLeads = onSnapshot(leadsRef, (snapshot) => {
        let loaded: Lead[] = [];
        snapshot.forEach((d) => loaded.push({ id: d.id, ...d.data() } as Lead));
        
        // Filtro por cargo: Equipe comercial só vê o que está atribuído a ela
        if (userProfile?.role === 'SDR' || userProfile?.role === 'Executive') {
          loaded = loaded.filter(l => l.assignedTo === user?.uid);
        }
        
        setLeads(loaded.sort((a, b) => b.createdAt - a.createdAt));
      });

      const requestsRef = collection(db, 'organizations', effectiveOrgId, 'supportRequests');
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

      const servicesRef = collection(db, 'organizations', effectiveOrgId, 'services');
      unsubServices = onSnapshot(servicesRef, (snapshot) => {
        const loadedServices: any[] = [];
        snapshot.forEach((d) => loadedServices.push({ id: d.id, ...d.data() }));
        setServices(loadedServices.sort((a, b) => (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0)));
      });

      // Listener para Perfis da Equipe (Aniversários e Gestão People)
      const profilesRef = collection(db, 'profiles');
      const qProfiles = query(profilesRef, where('orgId', '==', effectiveOrgId));
      const unsubProfiles = onSnapshot(qProfiles, (snapshot) => {
        const loaded: UserProfile[] = [];
        snapshot.forEach((d) => loaded.push({ uid: d.id, ...d.data() } as UserProfile));
        setTeamProfiles(loaded);
      });

      // Listener para Férias/Ausências
      const vacationsRef = collection(db, 'organizations', effectiveOrgId, 'vacations');
      const unsubVacations = onSnapshot(vacationsRef, (snapshot) => {
        const loaded: VacationPeriod[] = [];
        snapshot.forEach((d) => loaded.push({ ...d.data(), id: d.id } as VacationPeriod));
        setVacations(loaded);
      });

      timeoutId = setTimeout(() => {
        console.warn('Firestore initialization timed out.');
        setLoading(false);
        setErrorMsg('O tempo limite de conexão com o banco de dados foi excedido.');
      }, 10000);

      return () => {
        unsubscribeClients();
        unsubscribeLeads();
        unsubscribeRequests();
        unsubscribeOffers();
        unsubServices();
        unsubProfiles();
        unsubVacations();
        clearTimeout(timeoutId);
      };
    } catch (err: any) {
      console.error('Firestore Init Error:', err);
      setErrorMsg(err.message);
      setLoading(false);
    }
  }, [effectiveOrgId]);

  const value: CRMContextType = {
    clients, leads, offers, supportRequests,
    activeLeadsCount: leads.filter(l => !['Convertido', 'Perdido'].includes(l.status || '')).length,
    expenses: finance?.expenses || [], transactions: finance?.transactions || [],
    transactionCategories: finance?.transactionCategories || [], budgets: finance?.budgets || [], services,
    loading, errorMsg, isSyncing: clientActions.isSyncing,

    editingClient, setEditingClient,

    isOfferModalOpen: offerActions.isOfferModalOpen, setIsOfferModalOpen: offerActions.setIsOfferModalOpen,
    editingOffer: offerActions.editingOffer, setEditingOffer: offerActions.setEditingOffer,
    isDeleteOfferConfirmOpen: offerActions.isDeleteOfferConfirmOpen, setIsDeleteOfferConfirmOpen: offerActions.setIsDeleteOfferConfirmOpen,
    offerToDelete: offerActions.offerToDelete, setOfferToDelete: offerActions.setOfferToDelete,

    churnRiskDays: settings?.churnRiskDays || 7, setChurnRiskDays: settings?.setChurnRiskDays || (() => { }),
    defaultStages: settings?.defaultStages || [], setDefaultStages: settings?.setDefaultStages || (() => { }),
    onboardingQuestions: settings?.onboardingQuestions || [], setOnboardingQuestions: settings?.setOnboardingQuestions || (() => { }),
    defaultContractText: settings?.defaultContractText || '', setDefaultContractText: settings?.setDefaultContractText || (() => { }),
    checkoutTitle: settings?.checkoutTitle || '', setCheckoutTitle: settings?.setCheckoutTitle || (() => { }),
    checkoutDescription: settings?.checkoutDescription || '', setCheckoutDescription: settings?.setCheckoutDescription || (() => { }),
    enpsQuestion: settings?.enpsQuestion || '', setEnpsQuestion: settings?.setEnpsQuestion || (() => { }),
    enpsFrequency: settings?.enpsFrequency || 'mensal', setEnpsFrequency: settings?.setEnpsFrequency || (() => { }),
    csatTitle: settings?.csatTitle || '', setCsatTitle: settings?.setCsatTitle || (() => { }),
    csatQuestion: settings?.csatQuestion || '', setCsatQuestion: settings?.setCsatQuestion || (() => { }),

    replyingTo, setReplyingTo, replyMessage, setReplyMessage,
    newExpense: finance?.newExpense || {}, setNewExpense: finance?.setNewExpense || (() => { }),
    globalAnnouncement: settings?.globalAnnouncement || { title: '', message: '', type: 'info', isActive: false },
    setGlobalAnnouncement: settings?.setGlobalAnnouncement || (() => { }),

    handleSaveClient: clientActions.handleSaveClient, handleDeleteClient: clientActions.handleDeleteClient,
    handleSaveOffer: offerActions.handleSaveOffer, handleDeleteOffer: offerActions.handleDeleteOffer,
    restoreDefaultOffers: offerActions.restoreDefaultOffers,
    handleExportCSV: clientActions.handleExportCSV, syncPayments: clientActions.syncPayments,
    triggerManualEmail: clientActions.triggerManualEmail, isEmailLoading: clientActions.isEmailLoading,
    toggleAsaasNotifications: clientActions.toggleAsaasNotifications,
    isChurnRisk: clientActions.isChurnRisk, isComboNearRenewal: clientActions.isComboNearRenewal,
    effectiveOrgId, userProfile, vacations, teamProfiles
  };

  return <CRMContext.Provider value={value}>{children}</CRMContext.Provider>;
}
