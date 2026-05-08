import { create } from 'zustand';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

export interface PersonalLink {
  id: string;
  label: string;
  url: string;
  icon: string;
  folderId?: string;
}

export interface LinkFolder {
  id: string;
  label: string;
  icon: string;
  color: string;
}

export interface PersonalGoal {
  id: string;
  label: string;
  current: number;
  target: number;
  unit: string;
}

export interface NexusTask {
  id: string;
  label: string;
  completed: boolean;
  createdAt: number;
}

export interface NexusNote {
  id: string;
  title: string;
  content: string;
  color?: string;
  updatedAt: number;
}

export interface NexusData {
  folders: LinkFolder[];
  links: PersonalLink[];
  goals: PersonalGoal[];
  tasks: NexusTask[];
  notes: NexusNote[];
}

interface NexusState extends Omit<NexusData, 'notes'> {
  notes: NexusNote[];
  loading: boolean;
  initialized: boolean;
  error: string | null;
  
  // Actions
  init: (uid: string) => () => void;
  setFolders: (folders: LinkFolder[]) => Promise<void>;
  setLinks: (links: PersonalLink[]) => Promise<void>;
  setGoals: (goals: PersonalGoal[]) => Promise<void>;
  setTasks: (tasks: NexusTask[]) => Promise<void>;
  setNotes: (notes: NexusNote[]) => Promise<void>;
  
  // Internal update
  _updateFirestore: (newData: Partial<NexusData>) => Promise<void>;
  uid: string | null;
}

const DEFAULT_FOLDERS: LinkFolder[] = [
  { id: '1', label: 'Recursos Diários', icon: 'ph-star', color: 'amber' },
  { id: '2', label: 'Ferramentas de Vendas', icon: 'ph-funnel', color: 'primary' },
  { id: '3', label: 'Referências Wiki', icon: 'ph-book-open', color: 'emerald' }
];

const DEFAULT_LINKS: PersonalLink[] = [
  { id: '1', label: 'Dashboard Hub', url: 'https://hubcrm.io', icon: 'ph-monitor', folderId: '1' },
  { id: '2', label: 'Figma Design', url: 'https://figma.com', icon: 'ph-figma-logo', folderId: '1' }
];

export const useNexusStore = create<NexusState>((set, get) => ({
  folders: [],
  links: [],
  goals: [],
  tasks: [],
  notes: [],
  loading: true,
  initialized: false,
  error: null,
  uid: null,

  init: (uid: string) => {
    if (get().initialized && get().uid === uid) return () => {};
    
    set({ uid, loading: true });
    const profileRef = doc(db, 'profiles', uid);
    
    const unsubscribe = onSnapshot(profileRef, (snap) => {
      if (snap.exists()) {
        const profileData = snap.data();
        const nexus = profileData.nexusData || null;

        if (nexus) {
          // Lógica de migração de notas (string -> array)
          let migratedNotes: NexusNote[] = [];
          if (typeof nexus.notes === 'string' && nexus.notes.trim() !== '') {
            migratedNotes = [{
              id: 'legacy',
              title: 'Minhas Notas',
              content: nexus.notes,
              updatedAt: Date.now()
            }];
          } else if (Array.isArray(nexus.notes)) {
            migratedNotes = nexus.notes;
          }

          set({
            folders: nexus.folders || [],
            links: nexus.links || [],
            goals: nexus.goals || [],
            tasks: nexus.tasks || [],
            notes: migratedNotes,
            loading: false,
            initialized: true
          });
          
          // Se migrou, já salva no firestore para evitar re-migração
          if (typeof nexus.notes === 'string') {
            updateDoc(profileRef, { "nexusData.notes": migratedNotes });
          }
        } else {
          const initialData: NexusData = {
            folders: DEFAULT_FOLDERS,
            links: DEFAULT_LINKS,
            goals: [],
            tasks: [],
            notes: []
          };

          updateDoc(profileRef, { nexusData: initialData });
          set({ ...initialData, loading: false, initialized: true });
        }
      }
    }, (err) => {
      console.error("[NexusStore] Subscription error:", err);
      set({ error: err.message, loading: false });
    });

    return unsubscribe;
  },

  _updateFirestore: async (newData: Partial<NexusData>) => {
    const { uid, folders, links, goals, tasks, notes } = get();
    if (!uid) return;

    set(state => ({ ...state, ...newData }));

    const profileRef = doc(db, 'profiles', uid);
    try {
      const baseData = { folders, links, goals, tasks, notes };
      const merged = { ...baseData, ...newData };
      
      const sanitized: any = {};
      Object.keys(merged).forEach(key => {
        const val = (merged as any)[key];
        if (val !== undefined) sanitized[key] = val;
      });

      await updateDoc(profileRef, { nexusData: sanitized });
    } catch (err) {
      console.error("[NexusStore] Error updating firestore:", err);
    }
  },

  setFolders: (folders) => get()._updateFirestore({ folders }),
  setLinks: (links) => get()._updateFirestore({ links }),
  setGoals: (goals) => get()._updateFirestore({ goals }),
  setTasks: (tasks) => get()._updateFirestore({ tasks }),
  setNotes: (notes) => get()._updateFirestore({ notes }),
}));
