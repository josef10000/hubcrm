import { useState, useEffect } from 'react';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';

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

export interface NexusData {
  folders: LinkFolder[];
  links: PersonalLink[];
  goals: PersonalGoal[];
  notes: string;
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

export function useNexus() {
  const { user } = useAuth();
  const [data, setData] = useState<NexusData>({
    folders: [],
    links: [],
    goals: [],
    notes: ''
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const profileRef = doc(db, 'profiles', user.uid);
    
    const unsubscribe = onSnapshot(profileRef, (snap) => {
      if (snap.exists()) {
        const profileData = snap.data();
        const nexus = profileData.nexusData || null;

        if (nexus) {
          setData(nexus);
          setLoading(false);
        } else {
          // Tenta migrar do localStorage ou usa padrão
          const savedFolders = localStorage.getItem('hub_workspace_folders');
          const savedLinks = localStorage.getItem('hub_workspace_links');
          const savedGoals = localStorage.getItem('hub_workspace_goals');
          const savedNotes = localStorage.getItem('hub_workspace_notes');

          const initialData: NexusData = {
            folders: savedFolders ? JSON.parse(savedFolders) : DEFAULT_FOLDERS,
            links: savedLinks ? JSON.parse(savedLinks) : DEFAULT_LINKS,
            goals: savedGoals ? JSON.parse(savedGoals) : [],
            notes: savedNotes || ''
          };

          // Salva no Firestore pela primeira vez
          updateDoc(profileRef, { nexusData: initialData });
          setData(initialData);
          setLoading(false);
        }
      }
    });

    return () => unsubscribe();
  }, [user]);

  const updateNexus = async (newData: Partial<NexusData>) => {
    if (!user) return;
    const profileRef = doc(db, 'profiles', user.uid);
    try {
      const updatedData = { ...data, ...newData };
      await updateDoc(profileRef, { nexusData: updatedData });
    } catch (err) {
      console.error("[Nexus] Error updating data:", err);
    }
  };

  return {
    ...data,
    loading,
    setFolders: (folders: LinkFolder[]) => updateNexus({ folders }),
    setLinks: (links: PersonalLink[]) => updateNexus({ links }),
    setGoals: (goals: PersonalGoal[]) => updateNexus({ goals }),
    setNotes: (notes: string) => updateNexus({ notes })
  };
}
