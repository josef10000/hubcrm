import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { collection, onSnapshot, query, where, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { UserProfile } from '@/types';
import { createCRMSlice } from './slices/crmSlice';
import { createWikiSlice } from './slices/wikiSlice';
import { createFinanceSlice } from './slices/financeSlice';
import { createPeopleSlice } from './slices/peopleSlice';
import { createSupportSlice } from './slices/supportSlice';
import { createSystemSlice } from './slices/systemSlice';
import { createPreferencesSlice } from './slices/preferencesSlice';
import { CRMStoreState } from './types';
import { Logger } from '@/lib/logger';

const createListener = (
  orgId: string,
  collPath: string,
  setter: (data: any[]) => void,
  sortFn?: (a: any, b: any) => number,
  filterFn?: (data: any[]) => any[]
) => {
  try {
    const ref = collection(db, 'organizations', orgId, collPath);
    return onSnapshot(ref, (snap) => {
      let data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      if (filterFn) data = filterFn(data);
      if (sortFn) data.sort(sortFn);
      setter(data);
    }, (err) => {
      Logger.error(`[CRMStore] Error in listener ${collPath}:`, err);
    });
  } catch (err: any) {
    Logger.error(`[CRMStore] Failed to setup listener ${collPath}:`, err);
    return () => {};
  }
};

export const useCRMStore = create<CRMStoreState>()(
  persist(
    (set, get, api) => ({
      // Base State
      currentUserId: null,
      effectiveOrgId: null,
      userProfile: null,
      loading: true,
      initialized: false,

      // App Config / UI State
      churnRiskDays: 30,
      newTransaction: { type: 'EXPENSE' },
      isSyncing: false,
      errorMsg: null,

      // Slices
      ...createCRMSlice(set, get, api),
      ...createWikiSlice(set, get, api),
      ...createFinanceSlice(set, get, api),
      ...createPeopleSlice(set, get, api),
      ...createSupportSlice(set, get, api),
      ...createSystemSlice(set, get, api),
      ...createPreferencesSlice(set, get, api),

      // Base Actions
      setLoading: (loading) => set({ loading }),
      setNewTransaction: (newTransaction) => set({ newTransaction }),

      init: (userId, orgId, permissions, profile) => get().initialize(userId, orgId, permissions, profile),

      initialize: (userId, orgId, permissions, profile) => {
        if (get().effectiveOrgId !== orgId || get().currentUserId !== userId || get().userProfile?.uid !== profile?.uid) {
          set({ 
            effectiveOrgId: orgId, 
            currentUserId: userId, 
            userProfile: profile || null,
            loading: true, 
            initialized: true,
            errorMsg: null 
          });
        }

        const unsubscribers: (() => void)[] = [];

        // Core Listeners (CRM, Roles, Configs)
        unsubscribers.push(createListener(orgId, 'clients', (data) => set({ clients: data }), undefined, (data) => {
          if (!permissions.includes('MANAGE_TEAM') && !permissions.includes('MANAGE_SETTINGS')) {
            return data.filter(c => c.assignedTo === userId);
          }
          return data;
        }));
        unsubscribers.push(createListener(orgId, 'leads', (data) => set({ leads: data }), (a, b) => b.createdAt - a.createdAt));
        unsubscribers.push(createListener(orgId, 'offers', (data) => set({ offers: data }), (a, b) => (a.order || 0) - (b.order || 0)));
        unsubscribers.push(createListener(orgId, 'tags', (data) => set({ tags: data }), (a, b) => a.name.localeCompare(b.name)));
        unsubscribers.push(createListener(orgId, 'roles', (data) => set({ orgRoles: data })));

        try {
          const prefRef = doc(db, 'organizations', orgId, 'settings', 'preferences');
          const unsubPrefs = onSnapshot(prefRef, (docSnap) => {
            if (docSnap.exists()) {
              set({ ...docSnap.data() });
            }
          }, (err) => {
            Logger.warn("[CRMStore] Preferences listener failed (likely empty or permissions):", err);
          });
          unsubscribers.push(unsubPrefs);
        } catch (err) {
          Logger.error("[CRMStore] Failed to setup Preferences listener:", err);
        }

        try {
          const qProfiles = query(collection(db, 'profiles'), where('orgId', '==', orgId));
          const unsubProfiles = onSnapshot(qProfiles, (snap) => {
            set({ teamProfiles: snap.docs.map(d => ({ uid: d.id, ...d.data() } as UserProfile)) });
          });
          unsubscribers.push(unsubProfiles);
        } catch (err) {
          Logger.error("[CRMStore] Team profiles listener failed:", err);
        }

        const timeout = setTimeout(() => {
          if (get().loading) set({ loading: false });
        }, 3000);

        return () => {
          clearTimeout(timeout);
          unsubscribers.forEach(unsub => unsub());
        };
      },

      subscribeToFinance: (orgId) => {
        // Finance server state is now handled by React Query (TanStack Query)
        // This empty subscription is kept for backwards compatibility if called elsewhere
        return () => {};
      },

      subscribeToWiki: (orgId) => {
        const unsubscribers: (() => void)[] = [];
        unsubscribers.push(createListener(orgId, 'wikiArticles', (data) => set({ wikiArticles: data }), (a, b) => b.createdAt - a.createdAt));
        return () => unsubscribers.forEach(unsub => unsub());
      },

      subscribeToSupport: (orgId) => {
        const unsubscribers: (() => void)[] = [];
        unsubscribers.push(createListener(orgId, 'supportRequests', (data) => set({ supportRequests: data }), (a, b) => b.createdAt - a.createdAt));
        return () => unsubscribers.forEach(unsub => unsub());
      },

      subscribeToPeople: (orgId) => {
        const unsubscribers: (() => void)[] = [];
        unsubscribers.push(createListener(orgId, 'vacations', (data) => set({ vacations: data })));
        unsubscribers.push(createListener(orgId, 'appointments', (data) => set({ appointments: data }), (a, b) => b.startTime - a.startTime));
        unsubscribers.push(createListener(orgId, 'availabilityBlocks', (data) => set({ availabilityBlocks: data })));
        unsubscribers.push(createListener(orgId, 'onboarding_questions', (data) => set({ onboardingQuestions: data }), (a, b) => (a.order || 0) - (b.order || 0)));
        unsubscribers.push(createListener(orgId, 'okrs', (data) => set({ okrs: data }), (a, b) => b.createdAt - a.createdAt));
        unsubscribers.push(createListener(orgId, 'feedbackRequests', (data) => set({ feedbackRequests: data }), (a, b) => b.createdAt - a.createdAt));
        return () => unsubscribers.forEach(unsub => unsub());
      },
    }),
    {
      name: 'hubcrm-crm-storage',
      version: 3, // Incrementado para invalidar caches antigos/bugados
      partialize: (state) => ({ 
        clients: state.clients, 
        leads: state.leads, 
        teamProfiles: state.teamProfiles,
        offers: state.offers,
        tags: state.tags,
        supportRequests: state.supportRequests,
        availabilityBlocks: state.availabilityBlocks,
        okrs: state.okrs,
        feedbackRequests: state.feedbackRequests
      }),
      // Garante que, se algo vier nulo do storage, mantenha o valor padrão (array vazio)
      merge: (persistedState: any, currentState) => ({
        ...currentState,
        ...(persistedState || {}),
        clients: persistedState?.clients || [],
        leads: persistedState?.leads || [],
        teamProfiles: persistedState?.teamProfiles || [],
        offers: persistedState?.offers || [],
        tags: persistedState?.tags || [],
        supportRequests: persistedState?.supportRequests || [],
        availabilityBlocks: persistedState?.availabilityBlocks || [],
        okrs: persistedState?.okrs || [],
        feedbackRequests: persistedState?.feedbackRequests || []
      })
    }
  )
);
