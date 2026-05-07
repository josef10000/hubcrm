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

export interface NexusData {
  folders: LinkFolder[];
  links: PersonalLink[];
  goals: PersonalGoal[];
  tasks: NexusTask[];
  notes: string;
}

interface NexusState extends NexusData {
  loading: boolean;
  initialized: boolean;
  error: string | null;
  
  // Actions
  init: (uid: string) => () => void;
  setFolders: (folders: LinkFolder[]) => Promise<void>;
  setLinks: (links: PersonalLink[]) => Promise<void>;
  setGoals: (goals: PersonalGoal[]) => Promise<void>;
  setTasks: (tasks: NexusTask[]) => Promise<void>;
  setNotes: (notes: string) => Promise<void>;
  
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
  notes: '',
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
          set({
            folders: nexus.folders || [],
            links: nexus.links || [],
            goals: nexus.goals || [],
            tasks: nexus.tasks || [],
            notes: nexus.notes || '',
            loading: false,
            initialized: true
          });
        } else {
          // Migração / Inicialização
          const savedFolders = localStorage.getItem('hub_workspace_folders');
          const savedLinks = localStorage.getItem('hub_workspace_links');
          const savedGoals = localStorage.getItem('hub_workspace_goals');
          const savedTasks = localStorage.getItem('hub_workspace_tasks');
          const savedNotes = localStorage.getItem('hub_workspace_notes');

          const initialData: NexusData = {
            folders: savedFolders ? JSON.parse(savedFolders) : DEFAULT_FOLDERS,
            links: savedLinks ? JSON.parse(savedLinks) : DEFAULT_LINKS,
            goals: savedGoals ? JSON.parse(savedGoals) : [],
            tasks: savedTasks ? JSON.parse(savedTasks) : [],
            notes: savedNotes || ''
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

    const profileRef = doc(db, 'profiles', uid);
    try {
      const updatedData = {
        folders,
        links,
        goals,
        tasks,
        notes,
        ...newData
      };
      await updateDoc(profileRef, { nexusData: updatedData });
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
