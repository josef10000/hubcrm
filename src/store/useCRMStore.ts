import { create } from 'zustand';
import { 
  collection, doc, setDoc, addDoc, deleteDoc, onSnapshot, 
  query, where, serverTimestamp, arrayUnion, arrayRemove, getDoc 
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { 
  Client, Offer, Expense, Transaction, TransactionCategory, Budget, 
  Lead, UserProfile, CommissionEntry, Tag, WikiArticle, WikiComment, UserRole 
} from '../types';
import { VacationPeriod, Appointment, AvailabilityBlock } from '../types/people';
import { toast } from 'sonner';

interface CRMState {
  // Core Data
  clients: Client[];
  leads: Lead[];
  offers: Offer[];
  vacations: VacationPeriod[];
  teamProfiles: UserProfile[];
  commissions: CommissionEntry[];
  tags: Tag[];
  appointments: Appointment[];
  availabilityBlocks: AvailabilityBlock[];
  wikiArticles: WikiArticle[];
  orgRoles: UserRole[];
  supportRequests: any[];
  services: any[];
  
  // UI / Global State
  loading: boolean;
  errorMsg: string | null;
  effectiveOrgId: string | null;
  initialized: boolean;
  
  // Actions
  init: (orgId: string, userId: string, permissions: string[]) => () => void;
  
  // Client Actions
  handleSaveClient: (clientData: Partial<Client>) => Promise<void>;
  handleDeleteClient: (clientId: string) => Promise<void>;
  handleAddClientLog: (clientId: string, logText: string) => Promise<void>;
  
  // Offer Actions
  handleSaveOffer: (offerData: Partial<Offer>) => Promise<void>;
  handleDeleteOffer: (offerId: string) => Promise<void>;
  
  // Wiki Actions
  handleSaveWikiArticle: (articleData: Partial<WikiArticle>) => Promise<void>;
  handleDeleteWikiArticle: (articleId: string) => Promise<void>;
  handleToggleWikiStar: (articleId: string, userId: string) => Promise<void>;
  handleAddWikiComment: (articleId: string, comment: Partial<WikiComment>) => Promise<void>;
  
  // People/HR Actions
  handleSaveVacationRequest: (vacationData: Partial<VacationPeriod>) => Promise<void>;
  handleDeleteVacationRequest: (id: string) => Promise<void>;
  handleRequestAppointment: (appointment: Partial<Appointment>, userId: string) => Promise<void>;
  handleUpdateAppointmentStatus: (id: string, status: Appointment['status'], userId: string) => Promise<void>;
  
  // Helpers (Calculated)
  isChurnRisk: (client: Client, churnRiskDays: number) => boolean;
}

export const useCRMStore = create<CRMState>((set, get) => ({
  clients: [],
  leads: [],
  offers: [],
  vacations: [],
  teamProfiles: [],
  commissions: [],
  tags: [],
  appointments: [],
  availabilityBlocks: [],
  wikiArticles: [],
  orgRoles: [],
  supportRequests: [],
  services: [],
  loading: true,
  errorMsg: null,
  effectiveOrgId: null,
  initialized: false,

  init: (orgId: string, userId: string, permissions: string[]) => {
    if (get().initialized && get().effectiveOrgId === orgId) return () => {};
    
    set({ effectiveOrgId: orgId, loading: true, initialized: true });

    const unsubscribers: (() => void)[] = [];

    const setupListener = (collPath: string, setter: (data: any[]) => void, sortFn?: (a: any, b: any) => number, filterFn?: (data: any[]) => any[]) => {
      const ref = collection(db, 'organizations', orgId, collPath);
      const unsub = onSnapshot(ref, (snap) => {
        let data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        if (filterFn) data = filterFn(data);
        if (sortFn) data.sort(sortFn);
        setter(data);
      }, (err) => {
        console.error(`[CRMStore] Error loading ${collPath}:`, err);
      });
      unsubscribers.push(unsub);
    };

    // 1. Clientes (com filtro de permissão)
    setupListener('clients', 
      (data) => set({ clients: data, loading: false }),
      undefined,
      (data) => {
        if (!permissions.includes('MANAGE_TEAM') && !permissions.includes('MANAGE_SETTINGS')) {
          return data.filter(c => c.assignedTo === userId);
        }
        return data;
      }
    );

    // 2. Leads (com filtro de permissão)
    setupListener('leads',
      (data) => set({ leads: data }),
      (a, b) => (b.createdAt || 0) - (a.createdAt || 0),
      (data) => {
        if (!permissions.includes('MANAGE_TEAM') && !permissions.includes('MANAGE_SETTINGS')) {
          return data.filter(l => l.assignedTo === userId);
        }
        return data;
      }
    );

    // 3. Outros Listeners
    setupListener('offers', (data) => set({ offers: data }), (a, b) => (a.order || 0) - (b.order || 0));
    setupListener('vacations', (data) => set({ vacations: data }));
    setupListener('commissions', (data) => set({ commissions: data }), (a, b) => b.date - a.date);
    setupListener('tags', (data) => set({ tags: data }), (a, b) => a.name.localeCompare(b.name));
    setupListener('wikiArticles', (data) => set({ wikiArticles: data }), (a, b) => b.createdAt - a.createdAt);
    setupListener('appointments', (data) => set({ appointments: data }), (a, b) => b.startTime - a.startTime);
    setupListener('supportRequests', (data) => set({ supportRequests: data }), (a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
    setupListener('services', (data) => set({ services: data }), (a, b) => (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0));
    setupListener('roles', (data) => set({ orgRoles: data }), (a, b) => a.name.localeCompare(b.name));

    // 4. Perfis da Equipe (Global)
    const profilesRef = collection(db, 'profiles');
    const qProfiles = query(profilesRef, where('orgId', '==', orgId));
    const unsubProfiles = onSnapshot(qProfiles, (snapshot) => {
      const loaded: UserProfile[] = snapshot.docs.map(d => ({ uid: d.id, ...d.data() } as UserProfile));
      set({ teamProfiles: loaded });
    });
    unsubscribers.push(unsubProfiles);

    return () => unsubscribers.forEach(unsub => unsub());
  },

  handleSaveClient: async (clientData) => {
    const orgId = get().effectiveOrgId;
    if (!orgId) return;
    try {
      const id = clientData.id || doc(collection(db, 'organizations', orgId, 'clients')).id;
      await setDoc(doc(db, 'organizations', orgId, 'clients', id), {
        ...clientData,
        id,
        updatedAt: serverTimestamp(),
        createdAt: clientData.createdAt || serverTimestamp()
      }, { merge: true });
      toast.success('Cliente salvo com sucesso!');
    } catch (err) {
      console.error("[CRMStore] Error saving client:", err);
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
      console.error("[CRMStore] Error deleting client:", err);
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
      console.error("[CRMStore] Error adding log:", err);
    }
  },

  handleSaveOffer: async (offerData) => {
    const orgId = get().effectiveOrgId;
    if (!orgId) return;
    const id = offerData.id || doc(collection(db, 'organizations', orgId, 'offers')).id;
    await setDoc(doc(db, 'organizations', orgId, 'offers', id), { ...offerData, id }, { merge: true });
  },

  handleDeleteOffer: async (offerId) => {
    const orgId = get().effectiveOrgId;
    if (!orgId) return;
    await deleteDoc(doc(db, 'organizations', orgId, 'offers', offerId));
  },

  handleSaveWikiArticle: async (articleData) => {
    const orgId = get().effectiveOrgId;
    if (!orgId) return;
    const id = articleData.id || doc(collection(db, 'organizations', orgId, 'wikiArticles')).id;
    await setDoc(doc(db, 'organizations', orgId, 'wikiArticles', id), {
      ...articleData,
      id,
      updatedAt: serverTimestamp(),
      createdAt: articleData.createdAt || serverTimestamp()
    }, { merge: true });
    toast.success('Artigo salvo!');
  },

  handleDeleteWikiArticle: async (articleId) => {
    const orgId = get().effectiveOrgId;
    if (!orgId) return;
    await deleteDoc(doc(db, 'organizations', orgId, 'wikiArticles', articleId));
    toast.success('Artigo removido.');
  },

  handleToggleWikiStar: async (articleId, userId) => {
    const orgId = get().effectiveOrgId;
    if (!orgId) return;
    const article = get().wikiArticles.find(a => a.id === articleId);
    if (!article) return;
    const stars = article.stars || [];
    const newStars = stars.includes(userId) ? stars.filter(u => u !== userId) : [...stars, userId];
    await setDoc(doc(db, 'organizations', orgId, 'wikiArticles', articleId), { stars: newStars }, { merge: true });
  },

  handleAddWikiComment: async (articleId, comment) => {
    const orgId = get().effectiveOrgId;
    if (!orgId) return;
    const commentId = doc(collection(db, 'organizations', orgId, 'wikiArticles', articleId, 'comments')).id;
    await setDoc(doc(db, 'organizations', orgId, 'wikiArticles', articleId, 'comments', commentId), {
      ...comment,
      id: commentId,
      createdAt: Date.now()
    });
  },

  handleSaveVacationRequest: async (vacationData) => {
    const orgId = get().effectiveOrgId;
    if (!orgId) return;
    const id = vacationData.id || doc(collection(db, 'organizations', orgId, 'vacations')).id;
    await setDoc(doc(db, 'organizations', orgId, 'vacations', id), { ...vacationData, id, createdAt: vacationData.createdAt || Date.now() }, { merge: true });
    toast.success('Solicitação processada.');
  },

  handleDeleteVacationRequest: async (id) => {
    const orgId = get().effectiveOrgId;
    if (!orgId) return;
    await deleteDoc(doc(db, 'organizations', orgId, 'vacations', id));
  },

  handleRequestAppointment: async (data, userId) => {
    const orgId = get().effectiveOrgId;
    if (!orgId) return;
    const id = doc(collection(db, 'organizations', orgId, 'appointments')).id;
    await setDoc(doc(db, 'organizations', orgId, 'appointments', id), {
      ...data,
      id,
      requesterId: userId,
      status: 'pending',
      orgId,
      createdAt: Date.now()
    });
    toast.success('Agendamento solicitado!');
  },

  handleUpdateAppointmentStatus: async (id, status, userId) => {
    const orgId = get().effectiveOrgId;
    if (!orgId) return;
    await setDoc(doc(db, 'organizations', orgId, 'appointments', id), { status }, { merge: true });
    
    const app = get().appointments.find(a => a.id === id);
    if (status === 'approved' && app) {
      // Criar chat
      await addDoc(collection(db, 'organizations', orgId, 'chats'), {
        name: `🤝 ${app.meetingName}`,
        members: [app.requesterId, app.targetId],
        type: 'group',
        orgId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        createdBy: userId,
        isSystemGenerated: true
      });
    }
  },

  isChurnRisk: (client, churnRiskDays) => {
    if (!client.lastContactAt) return true;
    const diff = (Date.now() - client.lastContactAt) / (1000 * 60 * 60 * 24);
    return diff > churnRiskDays;
  }
}));
