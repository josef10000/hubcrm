import { StateCreator } from 'zustand';
import { CRMStoreState } from '../types';
import { db } from '@/lib/firebase';
import { collection, query, orderBy, limit, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { logger } from '@core/utils/logger';

export interface ReleaseNote {
  id: string;
  version: string;
  title: string;
  content: string;
  type: 'feature' | 'fix' | 'security' | 'improvement';
  date: number;
  author: string;
}

export interface SystemSlice {
  releaseNotes: ReleaseNote[];
  hasUnreadNotes: boolean;
  isSystemLoading: boolean;
  
  fetchReleaseNotes: () => Promise<void>;
  markNotesAsRead: () => void;
  publishReleaseNote: (note: Omit<ReleaseNote, 'id' | 'date'>) => Promise<void>;
}

export const createSystemSlice: StateCreator<
  CRMStoreState,
  [['zustand/persist', unknown]],
  [],
  SystemSlice
> = (set, get) => ({
  releaseNotes: [],
  hasUnreadNotes: false,
  isSystemLoading: false,

  fetchReleaseNotes: async () => {
    const orgId = get().effectiveOrgId;
    if (!orgId) return;

    set({ isSystemLoading: true });
    try {
      const q = query(
        collection(db, 'system_updates'),
        orderBy('date', 'desc'),
        limit(20)
      );
      
      const querySnapshot = await getDocs(q);
      const notes = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ReleaseNote[];

      const lastReadDate = (get() as any).lastReadNotesDate || 0;
      const latestNoteDate = notes.length > 0 ? notes[0].date : 0;

      set({ 
        releaseNotes: notes, 
        hasUnreadNotes: latestNoteDate > lastReadDate,
        isSystemLoading: false 
      });
    } catch (err) {
      logger.error("Error fetching release notes", { domain: 'SYSTEM', data: err });
      set({ isSystemLoading: false });
    }
  },

  markNotesAsRead: () => {
    const latestDate = get().releaseNotes.length > 0 ? get().releaseNotes[0].date : Date.now();
    set({ hasUnreadNotes: false, lastReadNotesDate: latestDate } as any);
  },

  publishReleaseNote: async (note) => {
    try {
      const finalNote = {
        ...note,
        date: Date.now(),
        serverTimestamp: serverTimestamp()
      };
      
      await addDoc(collection(db, 'system_updates'), finalNote);
      get().fetchReleaseNotes();
      
      logger.info(`New Release Note published: ${note.version}`, { domain: 'SYSTEM' });
    } catch (err) {
      logger.error("Error publishing release note", { domain: 'SYSTEM', data: err });
    }
  }
});
