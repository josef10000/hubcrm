import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { doc, onSnapshot, updateDoc, getDoc, setDoc, collection, addDoc, deleteDoc, query, orderBy, writeBatch } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Logger } from '@/lib/logger';

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

export const BOOK_CATEGORIES = [
  'Ficção',
  'Não-Ficção',
  'Filosofia',
  'Fantasia',
  'Ficção Científica',
  'Suspense & Thriller',
  'Terror',
  'História',
  'Biologia & Ciências',
  'Negócios & Finanças',
  'Tecnologia',
  'Autoajuda'
] as const;

export type BookCategory = typeof BOOK_CATEGORIES[number];

export interface NexusBook {
  id: string;
  title: string;
  author?: string;
  description?: string;
  category?: string;
  publishedAt?: string;
  pdfUrl: string;
  coverUrl?: string;
  currentPage?: number;
  totalPages?: number;
  addedAt: number;
  ownerId?: string;
  isCommunity?: boolean;
  sharedBy?: { uid: string; name: string };
  originalBookId?: string;
}

export interface NexusData {
  folders: LinkFolder[];
  links: PersonalLink[];
  goals: PersonalGoal[];
  tasks: NexusTask[];
  books: NexusBook[];
}

interface NexusState extends NexusData {
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
  setBooks: (books: NexusBook[]) => Promise<void>;
  
  // Notas — Operações individuais via subcoleção
  addNote: (note: Omit<NexusNote, 'id'>) => Promise<string | null>;
  updateNote: (noteId: string, data: Partial<NexusNote>) => Promise<void>;
  deleteNote: (noteId: string) => Promise<void>;
  
  // Livros
  shareBook: (book: NexusBook, targetUserId: string, targetUserName: string) => Promise<void>;
  publishToCommunity: (book: NexusBook, orgId: string) => Promise<void>;
  updateBookDetails: (bookId: string, details: Partial<NexusBook>) => Promise<void>;
  deleteBook: (bookId: string) => Promise<void>;
  
  // Internal
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

export const useNexusStore = create<NexusState>()(
  persist(
    (set, get) => ({
      folders: [],
      links: [],
      goals: [],
      tasks: [],
      notes: [],
      books: [],
      loading: true,
      initialized: false,
      error: null,
      uid: null,

  init: (uid: string) => {
    if (get().initialized && get().uid === uid) return () => {};
    
    set({ uid, loading: true });
    const profileRef = doc(db, 'profiles', uid);
    const notesColRef = collection(db, 'profiles', uid, 'notes');
    const notesQuery = query(notesColRef, orderBy('updatedAt', 'desc'));
    
    // === Subscription 1: Perfil (folders, links, goals, tasks, books) ===
    const unsubProfile = onSnapshot(profileRef, async (snap) => {
      if (snap.exists()) {
        const profileData = snap.data();
        const nexus = profileData.nexusData || null;

        if (nexus) {
          // ===== AUTO-MIGRAÇÃO DE NOTAS LEGADAS =====
          // Se o perfil ainda tem notas no array, migra para subcoleção
          let legacyNotes: NexusNote[] = [];
          if (typeof nexus.notes === 'string' && nexus.notes.trim() !== '') {
            legacyNotes = [{
              id: 'legacy',
              title: 'Minhas Notas',
              content: nexus.notes,
              updatedAt: Date.now()
            }];
          } else if (Array.isArray(nexus.notes) && nexus.notes.length > 0) {
            legacyNotes = nexus.notes;
          }

          if (legacyNotes.length > 0) {
            try {
              Logger.info('[NexusStore] Migrando notas legadas para subcoleção...', { count: legacyNotes.length });
              const batch = writeBatch(db);
              for (const note of legacyNotes) {
                const noteRef = doc(notesColRef, note.id || Date.now().toString());
                batch.set(noteRef, {
                  title: note.title || 'Sem título',
                  content: note.content || '',
                  color: note.color || null,
                  updatedAt: note.updatedAt || Date.now()
                });
              }
              // Limpa o array de notas do perfil
              batch.update(profileRef, { 'nexusData.notes': [] });
              await batch.commit();
              Logger.info('[NexusStore] Migração de notas concluída com sucesso.');
            } catch (err) {
              Logger.error('[NexusStore] Falha na migração de notas legadas', err);
            }
          }

          set({
            folders: nexus.folders || [],
            links: nexus.links || [],
            goals: nexus.goals || [],
            tasks: nexus.tasks || [],
            books: nexus.books || [],
            loading: false,
            initialized: true
          });
        } else {
          const initialData: NexusData = {
            folders: DEFAULT_FOLDERS,
            links: DEFAULT_LINKS,
            goals: [],
            tasks: [],
            books: []
          };

          try {
            await updateDoc(profileRef, { nexusData: initialData });
          } catch (err) {
            Logger.error('[NexusStore] Falha ao criar nexusData inicial', err);
          }
          set({ ...initialData, loading: false, initialized: true });
        }
      }
    }, (err) => {
      Logger.error("[NexusStore] Profile subscription error:", err);
      set({ error: err.message, loading: false });
    });

    // === Subscription 2: Notas (subcoleção privada) ===
    const unsubNotes = onSnapshot(notesQuery, (snap) => {
      const loadedNotes = snap.docs.map(d => ({
        ...d.data(),
        id: d.id
      } as NexusNote));
      set({ notes: loadedNotes });
    }, (err) => {
      Logger.error("[NexusStore] Notes subscription error:", err);
    });

    // Retorna função de cleanup que limpa ambas subscriptions
    return () => {
      unsubProfile();
      unsubNotes();
    };
  },

  _updateFirestore: async (newData: Partial<NexusData>) => {
    const { uid, folders, links, goals, tasks, books } = get();
    if (!uid) return;

    set(state => ({ ...state, ...newData }));

    const profileRef = doc(db, 'profiles', uid);
    try {
      // NÃO inclui notes — elas agora vivem na subcoleção
      const baseData = { folders, links, goals, tasks, books };
      const merged = { ...baseData, ...newData };
      
      const sanitized: any = {};
      Object.keys(merged).forEach(key => {
        const val = (merged as any)[key];
        if (val !== undefined) sanitized[key] = val;
      });

      await updateDoc(profileRef, { nexusData: sanitized });
    } catch (err) {
      Logger.error("[NexusStore] Error updating firestore:", err);
    }
  },

  setFolders: async (folders) => {
    try {
      await get()._updateFirestore({ folders });
    } catch (err) {
      Logger.error('[NexusStore] Falha ao salvar pastas', err);
    }
  },
  setLinks: async (links) => {
    try {
      await get()._updateFirestore({ links });
    } catch (err) {
      Logger.error('[NexusStore] Falha ao salvar links', err);
    }
  },
  setGoals: async (goals) => {
    try {
      await get()._updateFirestore({ goals });
    } catch (err) {
      Logger.error('[NexusStore] Falha ao salvar metas', err);
    }
  },
  setTasks: async (tasks) => {
    try {
      await get()._updateFirestore({ tasks });
    } catch (err) {
      Logger.error('[NexusStore] Falha ao salvar tarefas', err);
    }
  },
  setBooks: async (books) => {
    try {
      await get()._updateFirestore({ books });
    } catch (err) {
      Logger.error('[NexusStore] Falha ao salvar livros', err);
    }
  },

  // =============================================
  // NOTAS — Operações via Subcoleção Firestore
  // =============================================
  addNote: async (noteData) => {
    const { uid } = get();
    if (!uid) return null;

    try {
      const notesColRef = collection(db, 'profiles', uid, 'notes');
      const docRef = await addDoc(notesColRef, {
        ...noteData,
        updatedAt: Date.now()
      });
      return docRef.id;
    } catch (err) {
      Logger.error('[NexusStore] Falha ao criar nota', err);
      return null;
    }
  },

  updateNote: async (noteId, data) => {
    const { uid } = get();
    if (!uid) return;

    try {
      const noteRef = doc(db, 'profiles', uid, 'notes', noteId);
      await updateDoc(noteRef, { ...data, updatedAt: Date.now() });
    } catch (err) {
      Logger.error('[NexusStore] Falha ao atualizar nota', err);
    }
  },

  deleteNote: async (noteId) => {
    const { uid } = get();
    if (!uid) return;

    try {
      const noteRef = doc(db, 'profiles', uid, 'notes', noteId);
      await deleteDoc(noteRef);
    } catch (err) {
      Logger.error('[NexusStore] Falha ao excluir nota', err);
    }
  },

  // =============================================
  // LIVROS — Com blindagem de erros
  // =============================================
  shareBook: async (book, targetUserId, targetUserName) => {
    const { uid } = get();
    if (!uid) return;

    try {
      const targetRef = doc(db, 'profiles', targetUserId);
      const targetSnap = await getDoc(targetRef);
      
      if (targetSnap.exists()) {
        const data = targetSnap.data();
        const nexus = data.nexusData || { folders: [], links: [], goals: [], tasks: [], books: [] };
        const books = nexus.books || [];
        
        // Evita duplicatas
        if (books.some((b: NexusBook) => b.pdfUrl === book.pdfUrl)) return;

        const newBook: NexusBook = {
          ...book,
          id: doc(collection(db, 'tmp')).id,
          currentPage: 0,
          addedAt: Date.now(),
          sharedBy: { uid, name: targetUserName },
          originalBookId: book.id
        };

        await updateDoc(targetRef, {
          "nexusData.books": [...books, newBook]
        });
      }
    } catch (err) {
      Logger.error('[NexusStore] Falha ao compartilhar livro', err);
      throw err; // Re-throw para o componente mostrar toast
    }
  },

  publishToCommunity: async (book, orgId) => {
    const { uid } = get();
    if (!uid) return;

    try {
      const communityRef = doc(db, 'organizations', orgId, 'communityBooks', book.id);
      await setDoc(communityRef, {
        ...book,
        ownerId: uid,
        isCommunity: true,
        addedAt: Date.now(),
        currentPage: 0
      }, { merge: true });
    } catch (err) {
      Logger.error('[NexusStore] Falha ao publicar livro na comunidade', err);
      throw err;
    }
  },

  removeFromCommunity: async (bookId, orgId) => {
    try {
      const communityRef = doc(db, 'organizations', orgId, 'communityBooks', bookId);
      await deleteDoc(communityRef);
    } catch (err) {
      Logger.error('[NexusStore] Falha ao remover livro da comunidade', err);
      throw err;
    }
  },

  updateBookDetails: async (bookId, details) => {
    try {
      const { books, setBooks } = get();
      const updated = books.map(b => b.id === bookId ? { ...b, ...details } : b);
      await setBooks(updated);
    } catch (err) {
      Logger.error('[NexusStore] Falha ao atualizar detalhes do livro', err);
    }
  },

  deleteBook: async (bookId) => {
    try {
      const { books, setBooks } = get();
      const updated = books.filter(b => b.id !== bookId);
      await setBooks(updated);
    } catch (err) {
      Logger.error('[NexusStore] Falha ao excluir livro', err);
    }
  }
}), {
  name: 'hubcrm-nexus-storage',
  version: 4,
  partialize: (state) => ({
    folders: state.folders,
    links: state.links,
    goals: state.goals,
    tasks: state.tasks,
    books: state.books
  }),
  merge: (persistedState: any, currentState) => ({
    ...currentState,
    ...(persistedState || {}),
    folders: persistedState?.folders || [],
    links: persistedState?.links || [],
    goals: persistedState?.goals || [],
    tasks: persistedState?.tasks || [],
    books: persistedState?.books || []
  })
}));
