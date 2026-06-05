import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { doc, onSnapshot, updateDoc, getDoc, getDocs, setDoc, collection, addDoc, deleteDoc, query, orderBy, writeBatch } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Logger } from '@/lib/logger';
import { useArenaStore } from './useArenaStore';
import { toast } from 'sonner';

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

export interface NoteFolder {
  id: string;
  name: string;
  parentId?: string; // Para subpastas
  isOpen?: boolean;
}

export interface NexusNote {
  id: string;
  title: string;
  content: string;
  color?: string;
  folderId?: string;
  updatedAt: number;
}

export interface ActivityLog {
  id: string;
  timestamp: number;
  type: 'reading' | 'note' | 'goal' | 'task';
  bookId?: string;
  pagesRead?: number;
  noteId?: string;
  folderId?: string;
}

export const DEFAULT_BOOK_CATEGORIES = [
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
];

export type BookCategory = string;
export type ReadingStatus = 'reading' | 'finished' | 'want_to_read' | 'dropped';

export interface LearningPath {
  id: string;
  name: string;
  description: string;
  benefit: string;
  neonColor: string;
  bookIds: string[];
  hubCoinReward: number;
  createdAt: number;
  createdBy: string;
}

export interface UserPathProgress {
  pathId: string;
  userId: string;
  status: 'ACTIVE' | 'COMPLETED' | 'PAUSED' | 'NOT_STARTED';
  startedAt: number;
  completedAt: number | null;
  completedBookIds: string[];
  progressPercentage: number;
  welcomeRewardClaimed?: boolean;
}

export interface NexusBook {
  id: string;
  title: string;
  author?: string;
  description?: string;
  category?: string;
  publishedAt?: string;
  pdfUrl?: string;
  coverUrl?: string;
  currentPage?: number;
  totalPages?: number;
  addedAt: number;
  ownerId?: string;
  isCommunity?: boolean;
  sharedBy?: { uid: string; name: string };
  originalBookId?: string;
  status?: ReadingStatus;
  isFavorite?: boolean;
  linkedNoteId?: string;
  format?: 'pdf' | 'kindle' | 'physical';
  learningPathId?: string;
  neonColor?: string;
  maxPageRead?: number;
  lastProgressUpdateAt?: number;
}

export interface NexusData {
  folders: LinkFolder[];
  links: PersonalLink[];
  goals: PersonalGoal[];
  tasks: NexusTask[];
  books: NexusBook[];
  noteFolders: NoteFolder[];
  bookCategories: string[];
}

interface NexusState extends NexusData {
  notes: NexusNote[];
  activityLogs: ActivityLog[];
  learningPaths: LearningPath[];
  userPathsProgress: Record<string, UserPathProgress>;
  loading: boolean;
  initialized: boolean;
  error: string | null;
  bookAnimationMode: 'new' | 'fixed_3d' | 'zoom' | 'none' | 'parallax_2.5d' | 'realist_3d';
  setBookAnimationMode: (mode: 'new' | 'fixed_3d' | 'zoom' | 'none' | 'parallax_2.5d' | 'realist_3d') => void;
  
  // Actions
  init: (uid: string) => () => void;
  setFolders: (folders: LinkFolder[]) => Promise<void>;
  setLinks: (links: PersonalLink[]) => Promise<void>;
  setGoals: (goals: PersonalGoal[]) => Promise<void>;
  setTasks: (tasks: NexusTask[]) => Promise<void>;
  setBooks: (books: NexusBook[]) => Promise<void>;
  setNoteFolders: (folders: NoteFolder[]) => Promise<void>;
  setBookCategories: (categories: string[]) => Promise<void>;
  addBookCategory: (category: string) => Promise<void>;
  updateBookCategory: (oldCategory: string, newCategory: string) => Promise<void>;
  deleteBookCategory: (category: string) => Promise<void>;
  
  // Book specific actions
  toggleFavorite: (bookId: string) => Promise<void>;
  updateBookStatus: (bookId: string, status: ReadingStatus) => Promise<void>;
  updateReadingProgress: (bookId: string, page: number) => Promise<void>;
  addNote: (note: Omit<NexusNote, 'id'>) => Promise<string>;
  updateNote: (id: string, note: Partial<NexusNote>) => Promise<void>;
  deleteNote: (id: string) => Promise<void>;
  addNoteFolder: (folder: Omit<NoteFolder, 'id'>) => Promise<void>;
  updateNoteFolder: (id: string, folder: Partial<NoteFolder>) => Promise<void>;
  deleteNoteFolder: (id: string) => Promise<void>;
  
  // Analytics
  addActivityLog: (log: Omit<ActivityLog, 'id'>) => Promise<void>;
  
  // Livros
  shareBook: (book: NexusBook, targetUserId: string, targetUserName: string) => Promise<void>;
  publishToCommunity: (book: NexusBook, orgId: string) => Promise<void>;
  updateBookDetails: (bookId: string, details: Partial<NexusBook>) => Promise<void>;
  deleteBook: (bookId: string) => Promise<void>;
  addBook: (book: NexusBook) => Promise<void>;
  
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
      activityLogs: [],
      noteFolders: [],
      bookCategories: [],
      learningPaths: [],
      userPathsProgress: {},
      loading: true,
      initialized: false,
      error: null,
      uid: null,
      bookAnimationMode: 'new',
      setBookAnimationMode: (mode) => set({ bookAnimationMode: mode }),

  init: (uid: string) => {
    if (get().initialized && get().uid === uid) return () => {};
    
    set({ uid, loading: true });
    const profileRef = doc(db, 'profiles', uid);
    const notesColRef = collection(db, 'profiles', uid, 'notes');
    const notesQuery = query(notesColRef, orderBy('updatedAt', 'desc'));
    
    const logsColRef = collection(db, 'profiles', uid, 'activity_logs');
    const logsQuery = query(logsColRef, orderBy('timestamp', 'desc'));
    
    let unsubPaths: (() => void) | null = null;
    let unsubProgress: (() => void) | null = null;
    let pathsSubscribed = false;
    
    // === Subscription 1: Perfil (folders, links, goals, tasks, books) ===
    const unsubProfile = onSnapshot(profileRef, async (snap) => {
      if (snap.exists()) {
        const profileData = snap.data();
        const orgId = profileData.orgId;
        
        if (orgId && !pathsSubscribed) {
          pathsSubscribed = true;
          
          const pathsCol = collection(db, 'organizations', orgId, 'learningPaths');
          const qPaths = query(pathsCol, orderBy('createdAt', 'desc'));
          unsubPaths = onSnapshot(qPaths, (snap) => {
            const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as LearningPath));
            set({ learningPaths: list });
          }, (err) => {
            console.warn('[useNexusStore] Firestore: escuta de trilhas desativada:', err.message);
          });

          const progressCol = collection(db, 'organizations', orgId, 'users', uid, 'learningPaths');
          unsubProgress = onSnapshot(progressCol, (snap) => {
            const map: Record<string, UserPathProgress> = {};
            snap.docs.forEach(d => {
              map[d.id] = d.data() as UserPathProgress;
            });
            set({ userPathsProgress: map });
          }, (err) => {
            console.warn('[useNexusStore] Firestore: escuta de progressos desativada:', err.message);
          });
        }
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
            noteFolders: nexus.noteFolders || [],
            bookCategories: nexus.bookCategories || DEFAULT_BOOK_CATEGORIES,
            loading: false,
            initialized: true
          });
        } else {
          const initialData: NexusData = {
            folders: DEFAULT_FOLDERS,
            links: DEFAULT_LINKS,
            goals: [],
            tasks: [],
            books: [],
            noteFolders: [],
            bookCategories: DEFAULT_BOOK_CATEGORIES
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

    const unsubLogs = onSnapshot(logsQuery, (snap) => {
      const loadedLogs = snap.docs.map(d => ({
        ...d.data(),
        id: d.id
      } as ActivityLog));
      set({ activityLogs: loadedLogs });
    }, (err) => {
      Logger.error("[NexusStore] Logs subscription error:", err);
    });

    // Retorna função de cleanup que limpa as subscriptions
    return () => {
      unsubProfile();
      unsubNotes();
      unsubLogs();
      if (unsubPaths) unsubPaths();
      if (unsubProgress) unsubProgress();
    };
  },

  _updateFirestore: async (newData: Partial<NexusData>) => {
    const { uid, folders, links, goals, tasks, books, noteFolders, bookCategories } = get();
    if (!uid) return;

    set(state => ({ ...state, ...newData }));

    const profileRef = doc(db, 'profiles', uid);
    try {
      // NÃO inclui notes — elas agora vivem na subcoleção
      const baseData = { folders, links, goals, tasks, books, noteFolders, bookCategories };
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
  setNoteFolders: async (noteFolders) => {
    try {
      await get()._updateFirestore({ noteFolders });
    } catch (err) {
      Logger.error('[NexusStore] Falha ao salvar pastas de notas', err);
    }
  },
  setBookCategories: async (bookCategories) => {
    try {
      await get()._updateFirestore({ bookCategories });
    } catch (err) {
      Logger.error('[NexusStore] Falha ao salvar categorias de livros', err);
    }
  },
  addBookCategory: async (category: string) => {
    const { bookCategories, _updateFirestore } = get();
    if (!bookCategories.includes(category)) {
      const newList = [...bookCategories, category];
      set({ bookCategories: newList });
      await _updateFirestore({ bookCategories: newList });
    }
  },

  updateBookCategory: async (oldCategory: string, newCategory: string) => {
    const { bookCategories, books, _updateFirestore } = get();
    
    // Atualiza a lista de categorias
    const newList = bookCategories.map(c => c === oldCategory ? newCategory : c);
    
    // Atualiza todos os livros que usam essa categoria
    const newBooks = books.map(b => b.category === oldCategory ? { ...b, category: newCategory } : b);
    
    set({ bookCategories: newList, books: newBooks });
    await _updateFirestore({ bookCategories: newList, books: newBooks });
  },

  deleteBookCategory: async (category: string) => {
    const { bookCategories, books, _updateFirestore } = get();
    
    // Remove da lista de categorias
    const newList = bookCategories.filter(c => c !== category);
    
    // Opcional: livros com essa categoria voltam para 'Geral' ou ficam sem categoria?
    // Vou colocar 'Outros' como fallback se for deletada
    const newBooks = books.map(b => b.category === category ? { ...b, category: 'Outros' } : b);
    
    set({ bookCategories: newList, books: newBooks });
    await _updateFirestore({ bookCategories: newList, books: newBooks });
  },

  // =============================================
  // BOOK ACTIONS
  // =============================================
  addBook: async (book: NexusBook) => {
    const { books, _updateFirestore } = get();
    const newList = [...books, book];
    set({ books: newList });
    await _updateFirestore({ books: newList });
  },

  deleteBook: async (bookId: string) => {
    const { books, _updateFirestore } = get();
    const newList = books.filter(b => b.id !== bookId);
    set({ books: newList });
    await _updateFirestore({ books: newList });
  },

  updateBookDetails: async (bookId: string, details: Partial<NexusBook>) => {
    const { books, _updateFirestore } = get();
    const newList = books.map(b => b.id === bookId ? { ...b, ...details } : b);
    set({ books: newList });
    await _updateFirestore({ books: newList });
  },

  toggleFavorite: async (bookId: string) => {
    const { books, updateBookDetails } = get();
    const book = books.find(b => b.id === bookId);
    if (book) {
      await updateBookDetails(bookId, { isFavorite: !book.isFavorite });
    }
  },

  updateBookStatus: async (bookId: string, status: ReadingStatus) => {
    await get().updateBookDetails(bookId, { status });
  },

  updateReadingProgress: async (bookId: string, page: number) => {
    const { books, updateBookDetails, addActivityLog } = get();
    const book = books.find(b => b.id === bookId);
    if (book) {
      const oldPage = book.currentPage || 0;
      
      // Se não houve alteração real, não faz nada
      if (page === oldPage) return;

      // 1. Trava temporal de 24 horas: se o progresso for alterado, não pode ser em menos de 24 horas
      const lastUpdate = book.lastProgressUpdateAt || 0;
      const diffMs = Date.now() - lastUpdate;
      const oneDayMs = 24 * 60 * 60 * 1000;
      
      if (lastUpdate > 0 && diffMs < oneDayMs) {
        const hoursLeft = Math.ceil((oneDayMs - diffMs) / (1000 * 60 * 60));
        toast.error(`Atenção: Por diretrizes de gamificação e ritmo de estudo cognitivo, você só pode registrar progresso de leitura a cada 24 horas para cada obra. Tente novamente em ${hoursLeft}h! ⏳`);
        return;
      }

      // 2. Cálculo seguro de moedas baseado no recorde maxPageRead
      const maxPage = book.maxPageRead || 0;
      const pagesToReward = Math.max(0, page - maxPage);
      
      const updates: Partial<NexusBook> = { 
        currentPage: page,
        lastProgressUpdateAt: Date.now(),
        maxPageRead: Math.max(maxPage, page)
      };
      
      // Se terminou (chegou no total), muda para "finalizado"
      if (book.totalPages && page >= book.totalPages) {
        updates.status = 'finished';
      } else if (page > 0) {
        updates.status = 'reading';
      } else {
        updates.status = undefined;
      }

      await updateBookDetails(bookId, updates);

      // Registra a atividade se houve progresso positivo e concede HubCoins
      if (pagesToReward > 0) {
        await get().addActivityLog({
          type: 'reading',
          bookId,
          pagesRead: pagesToReward,
          timestamp: Date.now()
        });

        const uid = get().uid;
        if (uid) {
          try {
            await useArenaStore.getState().addArenaCredits(uid, pagesToReward);
            toast.success(`Você ganhou +${pagesToReward} HubCoins por ler ${pagesToReward} páginas novas! 🪙`);
          } catch (err) {
            Logger.error('[NexusStore] Falha ao conceder HubCoins por leitura:', err);
          }
        }
      } else if (page > oldPage) {
        toast.info(`Progresso de leitura salvo! Você já havia recebido HubCoins pelas páginas lidas até a página ${maxPage}. 📖`);
      }

      // Sincronização com o Clube de Leitura correspondente (Biblioteca ➡️ Clube)
      const uid = get().uid;
      if (uid) {
        try {
          const profileRef = doc(db, 'profiles', uid);
          const profileSnap = await getDoc(profileRef);
          if (profileSnap.exists()) {
            const orgId = profileSnap.data().orgId;
            if (orgId) {
              const clubsColRef = collection(db, 'organizations', orgId, 'readingClubs');
              const clubsSnap = await getDocs(clubsColRef);
              
              // Localiza o clube correspondente
              const matchingClubDoc = clubsSnap.docs.find(d => {
                const data = d.data();
                return data.bookId === book.id || 
                       data.bookId === book.originalBookId ||
                       (book.originalBookId && data.bookId === book.originalBookId) ||
                       data.bookTitle.toLowerCase().trim() === book.title.toLowerCase().trim();
              });

              if (matchingClubDoc) {
                const clubData = matchingClubDoc.data();
                const clubRef = doc(db, 'organizations', orgId, 'readingClubs', matchingClubDoc.id);
                
                // Só atualiza se o progresso gravado for estritamente divergente
                const currentClubPage = clubData.progress?.[uid] || 0;
                if (currentClubPage !== page) {
                  const newProgressMap = {
                    ...clubData.progress,
                    [uid]: page
                  };

                  const targetPages = Number(clubData.targetPages) || 200;
                  const participantsList = (clubData.participants as string[]) || [];
                  const totalTarget: number = targetPages * Math.max(1, participantsList.length);
                  const currentRead: number = Object.values(newProgressMap).reduce((acc: number, p: any) => acc + (parseInt(p) || 0), 0) as number;
                  const metaCompleted = currentRead >= totalTarget;

                  await updateDoc(clubRef, {
                    progress: newProgressMap,
                    metaCompleted
                  });
                  Logger.info('[NexusStore] Progresso sincronizado com o Clube de Leitura corporativo.');
                }
              }
            }
          }
        } catch (err) {
          Logger.error('[NexusStore] Falha ao sincronizar progresso com o Clube de Leitura:', err);
        }
      }

      // 📚 Sincronização e Reatividade de Trilhas de Conhecimento
      if (uid && book.learningPathId && updates.status === 'finished' && book.status !== 'finished') {
        try {
          const profileRef = doc(db, 'profiles', uid);
          const profileSnap = await getDoc(profileRef);
          if (profileSnap.exists()) {
            const orgId = profileSnap.data().orgId;
            if (orgId) {
              const pathRef = doc(db, 'organizations', orgId, 'learningPaths', book.learningPathId);
              const pathSnap = await getDoc(pathRef);
              
              if (pathSnap.exists()) {
                const pathData = pathSnap.data();
                const progressRef = doc(db, 'organizations', orgId, 'users', uid, 'learningPaths', book.learningPathId);
                const progressSnap = await getDoc(progressRef);
                
                if (progressSnap.exists()) {
                  const progressData = progressSnap.data();
                  const completedBookIds = progressData.completedBookIds || [];
                  const bookOriginalId = book.originalBookId || book.id;
                  
                  if (!completedBookIds.includes(bookOriginalId)) {
                    const newCompletedList = [...completedBookIds, bookOriginalId];
                    const totalBooks = pathData.bookIds?.length || 1;
                    const progressPercentage = Math.min(Math.round((newCompletedList.length / totalBooks) * 100), 100);
                    const isCompleted = progressPercentage >= 100;
                    
                    const progressUpdate: any = {
                      completedBookIds: newCompletedList,
                      progressPercentage,
                      status: isCompleted ? 'COMPLETED' : 'ACTIVE'
                    };
                    
                    if (isCompleted) {
                      progressUpdate.completedAt = Date.now();
                    }
                    
                    await updateDoc(progressRef, progressUpdate);
                    
                    // Se concluiu a trilha agora
                    if (isCompleted && progressData.status !== 'COMPLETED') {
                      const reward = pathData.hubCoinReward || 200;
                      await useArenaStore.getState().addArenaCredits(uid, reward);
                      toast.success(`🎉 TRILHA CONCLUÍDA! Você finalizou a trilha "${pathData.name}" e faturou +${reward} HubCoins! 🪙`, {
                        duration: 8000
                      });
                    } else {
                      toast.success(`Livro concluído! Progresso na trilha "${pathData.name}": ${progressPercentage}% 📚`);
                    }
                  }
                }
              }
            }
          }
        } catch (err) {
          Logger.error('[NexusStore] Falha ao sincronizar progresso com a Trilha de Conhecimento:', err);
        }
      }
    }
  },

  // =============================================
  // NOTAS — Operações via Subcoleção Firestore
  // =============================================
  addNote: async (noteData: Omit<NexusNote, 'id'> & { bookId?: string }) => {
    const { uid } = get();
    if (!uid) {
      Logger.error('[NexusStore] Falha ao criar nota: UID não encontrado');
      return null;
    }

    try {
      const notesColRef = collection(db, 'profiles', uid, 'notes');
      const data = {
        ...noteData,
        title: noteData.title || 'Sem título',
        folderId: noteData.folderId || '',
        updatedAt: Date.now()
      };
      
      // Remove o bookId do objeto que vai para a coleção de notas para não poluir o schema se não for desejado
      // ou mantenha se quiser que a nota saiba do livro. Vou manter para facilitar backlinks futuros.
      
      Logger.info('[NexusStore] Criando nova nota...', { folderId: data.folderId });
      
      const docRef = await addDoc(notesColRef, data);
      
      // Registra a atividade de criação de nota
      await get().addActivityLog({
        type: 'note',
        noteId: docRef.id,
        folderId: data.folderId,
        bookId: noteData.bookId,
        timestamp: Date.now()
      });

      Logger.info('[NexusStore] Nota criada com sucesso:', { id: docRef.id });
      return docRef.id;
    } catch (err) {
      Logger.error('[NexusStore] Falha ao criar nota no Firestore', err);
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

  addNoteFolder: async (folderData) => {
    const { noteFolders, setNoteFolders } = get();
    const newFolder: NoteFolder = {
      ...folderData,
      id: crypto.randomUUID()
    };
    await setNoteFolders([...noteFolders, newFolder]);
  },

  updateNoteFolder: async (id, data) => {
    const { noteFolders, setNoteFolders } = get();
    const updated = noteFolders.map(f => f.id === id ? { ...f, ...data } : f);
    await setNoteFolders(updated);
  },

  deleteNoteFolder: async (id) => {
    const { noteFolders, setNoteFolders, notes, updateNote } = get();
    const updatedFolders = noteFolders.filter(f => f.id !== id);
    // Move notas da pasta excluída para a raiz
    for (const note of notes.filter(n => n.folderId === id)) {
      await updateNote(note.id, { folderId: undefined });
    }
    await setNoteFolders(updatedFolders);
  },

  // =============================================
  // ANALYTICS & LOGS
  // =============================================
  addActivityLog: async (logData) => {
    const { uid } = get();
    if (!uid) return;

    try {
      const logsColRef = collection(db, 'profiles', uid, 'activity_logs');
      await addDoc(logsColRef, {
        ...logData,
        timestamp: Date.now()
      });
    } catch (err) {
      Logger.error('[NexusStore] Falha ao registrar atividade', err);
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
}), {
  name: 'hubcrm-nexus-storage',
  version: 5, // v5: removido books do persist (vem do Firestore em tempo real)
  partialize: (state) => ({
    bookCategories: state.bookCategories,
    bookAnimationMode: state.bookAnimationMode
  }),
  merge: (persistedState: any, currentState) => ({
    ...currentState,
    ...(persistedState || {}),
    bookCategories: persistedState?.bookCategories || DEFAULT_BOOK_CATEGORIES,
    bookAnimationMode: persistedState?.bookAnimationMode === 'legacy' ? 'zoom' : (persistedState?.bookAnimationMode || 'new')
  })
}));
