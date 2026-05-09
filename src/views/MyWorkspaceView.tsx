import React, { useState, useEffect, useRef } from 'react';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { useCRM } from '../contexts/CRMContext';
import { useNexusStore } from '../store/useNexusStore';
import { useDialog } from '../contexts/DialogContext';
import { toast } from 'sonner';
import { PremiumDialog } from '../components/PremiumDialog';
import { format, isToday } from 'date-fns';
import { uploadImageToImgBB } from '../lib/imgbb';
import { uploadToCloudinary } from '../lib/cloudinary';

// Novos Componentes Modulares
import ErrorBoundary from '../components/common/ErrorBoundary';
import { VaultSkeleton, GoalsSkeleton, LibrarySkeleton } from '../components/nexus/NexusSkeleton';

// Imports dinâmicos para performance
const VaultTab = React.lazy(() => import('../components/nexus/VaultTab').then(m => ({ default: m.VaultTab })));
const GoalsTab = React.lazy(() => import('../components/nexus/GoalsTab').then(m => ({ default: m.GoalsTab })));
const TasksTab = React.lazy(() => import('../components/nexus/TasksTab').then(m => ({ default: m.TasksTab })));
const NotesTab = React.lazy(() => import('../components/nexus/NotesTab').then(m => ({ default: m.NotesTab })));
const LibraryTab = React.lazy(() => import('../components/nexus/LibraryTab').then(m => ({ default: m.LibraryTab })));

// Interfaces importadas da Store
import type { PersonalLink, LinkFolder, PersonalGoal, NexusTask, NexusNote, NexusBook } from '../store/useNexusStore';

// Helper para ícones de sites comuns
const getUrlIcon = (url: string) => {
  const u = url.toLowerCase();
  if (u.includes('google')) return 'ph-google-logo';
  if (u.includes('figma')) return 'ph-figma-logo';
  if (u.includes('whatsapp')) return 'ph-whatsapp-logo';
  if (u.includes('github')) return 'ph-github-logo';
  if (u.includes('slack')) return 'ph-slack-logo';
  if (u.includes('notion')) return 'ph-notepad';
  if (u.includes('trello')) return 'ph-trello-logo';
  if (u.includes('facebook')) return 'ph-facebook-logo';
  if (u.includes('instagram')) return 'ph-instagram-logo';
  if (u.includes('linkedin')) return 'ph-linkedin-logo';
  if (u.includes('youtube')) return 'ph-youtube-logo';
  if (u.includes('spotify')) return 'ph-spotify-logo';
  if (u.includes('drive.google')) return 'ph-hard-drive';
  if (u.includes('meet.google')) return 'ph-video-camera';
  if (u.includes('zoom')) return 'ph-video-camera';
  return 'ph-link';
};

export default function MyWorkspaceView() {
  const { userProfile, user } = useAuth();
  const { teamProfiles, vacations, appointments, leads, clients } = useCRM();
  const { confirm, alert } = useDialog();
  
  // Zustand Store
  const folders = useNexusStore(state => state.folders);
  const links = useNexusStore(state => state.links);
  const goals = useNexusStore(state => state.goals);
  const tasks = useNexusStore(state => state.tasks);
  const notes = useNexusStore(state => state.notes);
  const books = useNexusStore(state => state.books);
  const loading = useNexusStore(state => state.loading);
  const initNexus = useNexusStore(state => state.init);
  const setFolders = useNexusStore(state => state.setFolders);
  const setLinks = useNexusStore(state => state.setLinks);
  const setGoals = useNexusStore(state => state.setGoals);
  const setTasks = useNexusStore(state => state.setTasks);
  const setNotes = useNexusStore(state => state.setNotes);
  const setBooks = useNexusStore(state => state.setBooks);

  const [librarySubTab, setLibrarySubTab] = useState<'my' | 'shared' | 'community'>('my');
  const [communityBooks, setCommunityBooks] = useState<NexusBook[]>([]);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [sharingBook, setSharingBook] = useState<NexusBook | null>(null);

  // Actions from store
  const shareBookAction = useNexusStore(state => state.shareBook);
  const publishToCommunityAction = useNexusStore(state => state.publishToCommunity);

  const [activeTab, setActiveTab] = useState<'links' | 'goals' | 'notes' | 'tasks' | 'library'>('links');
  const [dailyQuote, setDailyQuote] = useState<{content: string, author: string} | null>(null);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [selectedBookId, setSelectedBookId] = useState<string | null>(null);
  const [viewingBookDetailsId, setViewingBookDetailsId] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [bookSearchTerm, setBookSearchTerm] = useState('');
  const [bookSearchResults, setBookSearchResults] = useState<any[]>([]);
  const [isSearchingBook, setIsSearchingBook] = useState(false);
  const [librarySearchQuery, setLibrarySearchQuery] = useState('');
  const [libraryPage, setLibraryPage] = useState(1);

  // Seleciona a primeira nota automaticamente se houver e nenhuma estiver selecionada
  useEffect(() => {
    if (activeTab === 'notes' && !selectedNoteId && notes.length > 0) {
      setSelectedNoteId(notes[0].id);
    }
  }, [activeTab, notes, selectedNoteId]);

  // Inicializa a Store
  useEffect(() => {
    if (user?.uid) {
      const unsubscribe = initNexus(user.uid);
      return () => unsubscribe();
    }
  }, [user?.uid, initNexus]);

  // Busca Livros da Comunidade
  useEffect(() => {
    const orgId = userProfile?.orgId;
    if (activeTab === 'library' && librarySubTab === 'community' && orgId) {
      const q = query(collection(db, 'organizations', orgId, 'communityBooks'), orderBy('addedAt', 'desc'));
      const unsubscribe = onSnapshot(q, (snap) => {
        const loaded = snap.docs.map(d => ({ ...d.data(), id: d.id } as NexusBook));
        setCommunityBooks(loaded);
      });
      return () => unsubscribe();
    }
  }, [activeTab, librarySubTab, userProfile?.orgId]);

  // Modal States
  const [modalConfig, setModalConfig] = useState<{
    isOpen: boolean;
    type: 'folder' | 'link' | 'goal' | 'task' | 'note' | 'book';
    mode: 'add' | 'edit';
    data?: any;
  }>({ isOpen: false, type: 'folder', mode: 'add' });

  const [isAddBookLinkOpen, setIsAddBookLinkOpen] = useState(false);

  // Biblioteca interna de frases premium
  const MOTIVATIONAL_QUOTES = [
    { content: "O sucesso não é o final, o fracasso não é fatal: é a coragem de continuar que conta.", author: "Winston Churchill" },
    { content: "Acredite que você pode e você estará no meio do caminho.", author: "Theodore Roosevelt" },
    { content: "Trabalhe duro em silêncio, deixe seu sucesso ser seu barulho.", author: "Frank Ocean" },
    { content: "Sonhe alto. Comece pequeno. Mas, acima de tudo, comece.", author: "Simon Sinek" },
    { content: "Não espere por oportunidades. Crie-as.", author: "Autor Desconhecido" },
    { content: "Sua única competição é quem você era ontem.", author: "Autor Desconhecido" },
    { content: "O melhor momento para plantar uma árvore foi há 20 anos. O segundo melhor é agora.", author: "Provérbio Chinês" },
    { content: "O que você faz hoje pode melhorar todos os seus amanhãs.", author: "Ralph Marston" }
  ];

  useEffect(() => {
    if (!user) return;
    const today = new Date().toISOString().split('T')[0];
    const seed = today.replace(/-/g, '') + user.uid.substring(0, 4);
    const hash = Array.from(seed).reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const index = hash % MOTIVATIONAL_QUOTES.length;
    setDailyQuote(MOTIVATIONAL_QUOTES[index]);
  }, [user]);

  const handleConfirmShare = async (targetUserId: string, targetUserName: string) => {
    if (!sharingBook || !userProfile) return;

    try {
      await shareBookAction(sharingBook, targetUserId, userProfile.displayName || 'Um Hubber');
      setIsShareModalOpen(false);
      setSharingBook(null);
      toast.success(`Livro compartilhado com ${targetUserName.split(' ')[0]}!`);
    } catch (err) {
      toast.error('Erro ao compartilhar livro');
    }
  };

  // Sincroniza abas e skeletons
  const isSyncing = loading && books.length === 0;

  // Data: Agenda & Stats
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const monthDayStr = format(new Date(), 'MM-dd');

  const todayBirthdays = teamProfiles.filter(p => {
    if (!p.birthDate) return false;
    const bDate = p.birthDate.includes('/') ? p.birthDate.split('/').reverse().join('-') : p.birthDate;
    return bDate.endsWith(monthDayStr);
  });

  const todayAbsences = vacations.filter(v => v.status === 'Aprovado' && todayStr >= v.start && todayStr <= v.end);
  const todayAppointments = appointments.filter(a => isToday(new Date(a.startTime)) && a.status === 'approved');

  const myLeads = leads.filter(l => l.assignedTo === user?.uid && !['Convertido', 'Perdido'].includes(l.status || ''));
  const myOverdueClients = clients.filter(c => c.assignedTo === user?.uid && c.paymentStatus === 'OVERDUE');

  const filteredLinks = selectedFolderId 
    ? links.filter(l => l.folderId === selectedFolderId)
    : links;

  if (isSyncing) return (
    <div className="h-full flex items-center justify-center p-20">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-primary-500/20 border-t-primary-500 rounded-full animate-spin" />
        <span className="text-xs font-black uppercase tracking-[0.4em] text-gray-500">Acessando Nexus...</span>
      </div>
    </div>
  );

  // Auxiliares para Modais (mantidos aqui por compartilharem estado complexo)
  const onConfirmFolder = (values: any) => {
    if (modalConfig.mode === 'add') {
      const newFolder: LinkFolder = {
        id: Date.now().toString(),
        label: values.label,
        icon: 'ph-folder-simple',
        color: 'primary'
      };
      setFolders([...folders, newFolder]);
    } else {
      setFolders(folders.map(f => f.id === modalConfig.data.id ? { ...f, label: values.label } : f));
    }
  };

  const onConfirmLink = (values: any) => {
    const url = values.url.startsWith('http') ? values.url : `https://${values.url}`;
    if (modalConfig.mode === 'add') {
      const newLink: PersonalLink = {
        id: Date.now().toString(),
        label: values.label,
        url,
        icon: 'ph-link',
        folderId: selectedFolderId || (folders.length > 0 ? folders[0].id : undefined)
      };
      setLinks([...links, newLink]);
    } else {
      setLinks(links.map(l => l.id === modalConfig.data.id ? { ...l, label: values.label, url } : l));
    }
  };

  const onConfirmGoal = (values: any) => {
    const target = parseInt(values.target) || 0;
    if (modalConfig.mode === 'add') {
      const newGoal: PersonalGoal = {
        id: Date.now().toString(),
        label: values.label,
        target,
        current: 0,
        unit: values.unit
      };
      setGoals([...goals, newGoal]);
    } else {
      setGoals(goals.map(g => g.id === modalConfig.data.id ? { ...g, label: values.label, target, unit: values.unit } : g));
    }
  };

  const handleAddBookByLink = (data: any) => {
    let finalUrl = data.url;
    if (finalUrl.includes('drive.google.com')) {
      finalUrl = finalUrl.replace(/\/view(\?usp=sharing)?$/, '/preview').replace(/\/edit(\?usp=sharing)?$/, '/preview');
    }
    const newBook: NexusBook = {
      id: Date.now().toString(),
      title: data.title,
      pdfUrl: finalUrl,
      author: data.author,
      publishedAt: data.publishedAt,
      coverUrl: data.coverUrl,
      description: data.description,
      currentPage: data.currentPage || 0,
      totalPages: data.totalPages || 0,
      addedAt: Date.now()
    };
    setBooks([newBook, ...books]);
    setIsAddBookLinkOpen(false);
    setBookSearchResults([]);
    setBookSearchTerm('');
    toast.success('Livro catalogado com sucesso!');
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-12">
      {/* HEADER DE BOAS VINDAS */}
      <header className="flex flex-col xl:flex-row xl:items-end justify-between gap-10 border-b border-white/5 pb-12">
        <div className="space-y-6 flex-1">
          <div className="flex items-center gap-3">
            <div className="px-3 py-1 bg-primary-500/10 border border-primary-500/20 rounded-full">
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary-400">Nexus Workspace v7.2.2</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
               <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
               <span className="text-[9px] font-black uppercase tracking-[0.2em] text-emerald-400">Sync Ativo</span>
            </div>
          </div>
          
          <div className="space-y-2">
            <h1 className="text-5xl font-black text-white tracking-tighter leading-tight">
              Olá, <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-400 to-primary-600">{userProfile?.displayName?.split(' ')[0] || user?.displayName?.split(' ')[0] || 'Hubber'}</span>.
            </h1>
            
            <div className="flex flex-wrap gap-4 mt-6">
              {/* Widget: Agenda do Dia */}
              <div className="p-4 bg-white/[0.03] border border-white/5 rounded-3xl min-w-[240px] flex-1">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-3 flex items-center gap-2">
                  <i className="ph-bold ph-calendar text-primary-500" />
                  Agenda de Hoje
                </h4>
                <div className="space-y-2">
                  {todayBirthdays.length === 0 && todayAbsences.length === 0 && todayAppointments.length === 0 && (
                    <p className="text-xs text-gray-600 font-medium italic">Nenhum evento para hoje.</p>
                  )}
                  {todayBirthdays.map(p => (
                    <div key={p.uid} className="flex items-center gap-2 text-xs font-bold text-pink-400">
                      <span>🎂</span> Aniversário: {p.displayName.split(' ')[0]}
                    </div>
                  ))}
                  {todayAbsences.map(v => (
                    <div key={v.id} className="flex items-center gap-2 text-xs font-bold text-amber-400">
                      <span>🏖️</span> {v.type}: {teamProfiles.find(tp => tp.uid === v.userId)?.displayName.split(' ')[0]}
                    </div>
                  ))}
                  {todayAppointments.map(a => (
                    <div key={a.id} className="flex items-center gap-2 text-xs font-bold text-blue-400">
                      <span>🤝</span> {format(new Date(a.startTime), 'HH:mm')} - {a.meetingName}
                    </div>
                  ))}
                </div>
              </div>


              {/* Widget: Frase do Dia */}
              {dailyQuote && (
                <div className="p-4 bg-white/[0.03] border border-white/5 rounded-3xl min-w-[300px] flex-[2]">
                   <i className="ph-duotone ph-quotes text-2xl text-primary-500/40" />
                   <p className="text-sm text-gray-300 italic font-medium leading-relaxed mt-1">"{dailyQuote.content}"</p>
                   <p className="text-[9px] font-black uppercase tracking-widest text-primary-500/60 mt-2">— {dailyQuote.author}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* NAVEGAÇÃO DE TABS */}
        <nav className="flex bg-[#0a0c12]/40 backdrop-blur-2xl p-1.5 rounded-[2rem] border border-white/10 shadow-2xl h-fit">
          {[
            { id: 'links', label: 'Vault', icon: 'ph-link' },
            { id: 'goals', label: 'Metas', icon: 'ph-target' },
            { id: 'tasks', label: 'Tarefas', icon: 'ph-checks' },
            { id: 'notes', label: 'Notas', icon: 'ph-note-pencil' },
            { id: 'library', label: 'Biblioteca', icon: 'ph-books' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-6 py-3 rounded-2xl text-sm font-black uppercase tracking-widest transition-all ${
                activeTab === tab.id 
                ? 'bg-primary-500 text-white shadow-lg' 
                : 'text-gray-500 hover:text-white hover:bg-white/5'
              }`}
            >
              <i className={`ph-duotone ${tab.icon} text-lg`} />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </nav>
      </header>

      {/* CONTEÚDO DINÂMICO COM SKELETONS E ERROR BOUNDARY */}
      <main className="min-h-[500px]">
        <ErrorBoundary>
          <React.Suspense fallback={<div className="h-full flex items-center justify-center p-20"><div className="w-12 h-12 border-4 border-primary-500/20 border-t-primary-500 rounded-full animate-spin" /></div>}>
            <AnimatePresence mode="wait">
              {activeTab === 'links' && (
                <motion.section key="links" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
                  {loading ? <VaultSkeleton /> : (
                    <VaultTab 
                      selectedFolderId={selectedFolderId} 
                      setSelectedFolderId={setSelectedFolderId}
                      setModalConfig={setModalConfig}
                      confirm={confirm}
                    />
                  )}
                </motion.section>
              )}

              {activeTab === 'goals' && (
                <motion.section key="goals" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}>
                  {loading ? <GoalsSkeleton /> : <GoalsTab setModalConfig={setModalConfig} confirm={confirm} />}
                </motion.section>
              )}

              {activeTab === 'tasks' && (
                <motion.section key="tasks" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
                  <TasksTab />
                </motion.section>
              )}

              {activeTab === 'notes' && (
                <motion.section key="notes" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
                  <NotesTab selectedNoteId={selectedNoteId} setSelectedNoteId={setSelectedNoteId} confirm={confirm} />
                </motion.section>
              )}

              {activeTab === 'library' && (
                <motion.section key="library" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }}>
                  {!selectedBookId ? (
                    loading && communityBooks.length === 0 ? <LibrarySkeleton /> : (
                      <LibraryTab 
                        librarySubTab={librarySubTab} setLibrarySubTab={setLibrarySubTab}
                        librarySearchQuery={librarySearchQuery} setLibrarySearchQuery={setLibrarySearchQuery}
                        libraryPage={libraryPage} setLibraryPage={setLibraryPage}
                        setViewingBookDetailsId={setViewingBookDetailsId}
                        setIsAddBookLinkOpen={setIsAddBookLinkOpen}
                        setSharingBook={setSharingBook}
                        setIsShareModalOpen={setIsShareModalOpen}
                        communityBooks={communityBooks}
                        confirm={confirm}
                        orgId={userProfile?.orgId}
                      />
                    )
                  ) : (
                    <div className="h-[800px] flex flex-col bg-[#0a0c12]/80 backdrop-blur-3xl border border-white/10 rounded-[3rem] overflow-hidden shadow-2xl">
                      <div className="flex items-center justify-between px-8 py-4 border-b border-white/5 bg-white/5">
                        <div className="flex items-center gap-4">
                          <button onClick={() => setSelectedBookId(null)} className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-all">
                            <i className="ph-bold ph-caret-left" />
                          </button>
                          <div>
                            <h3 className="text-sm font-black text-white uppercase tracking-widest">{books.find(b => b.id === selectedBookId)?.title}</h3>
                            <p className="text-[9px] font-medium text-gray-500 uppercase tracking-[0.2em]">Visualizador Imersivo v1.0</p>
                          </div>
                        </div>
                        <button onClick={() => window.open(books.find(b => b.id === selectedBookId)?.pdfUrl)} className="px-4 py-2 bg-white/5 rounded-xl text-[10px] font-black text-gray-400 hover:text-white transition-all uppercase tracking-widest">
                          Baixar Original
                        </button>
                      </div>
                      <iframe src={`${books.find(b => b.id === selectedBookId)?.pdfUrl}#toolbar=0`} className="flex-1 w-full border-none bg-white" title="PDF Viewer" />
                    </div>
                  )}
                </motion.section>
              )}
            </AnimatePresence>
          </React.Suspense>
        </ErrorBoundary>
      </main>

      {/* OVERLAY: DETALHES DO LIVRO */}
      <AnimatePresence>
        {viewingBookDetailsId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/90 backdrop-blur-md"
            onClick={() => setViewingBookDetailsId(null)}
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-[#0a0c12] border border-white/10 rounded-[3rem] w-full max-w-5xl overflow-hidden shadow-2xl flex flex-col md:flex-row"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Capa Ampliada */}
              <div className="md:w-2/5 aspect-[3/4] md:aspect-auto bg-white/5 relative group">
                {books.find(b => b.id === viewingBookDetailsId)?.coverUrl ? (
                  <img 
                    src={books.find(b => b.id === viewingBookDetailsId)?.coverUrl} 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-700">
                    <i className="ph-duotone ph-book text-9xl" />
                  </div>
                )}
                <div className="absolute top-6 left-6">
                  <button 
                    onClick={() => setViewingBookDetailsId(null)}
                    className="w-12 h-12 bg-black/50 backdrop-blur-xl rounded-2xl flex items-center justify-center text-white hover:scale-110 transition-all"
                  >
                    <i className="ph-bold ph-x" />
                  </button>
                </div>
              </div>

              {/* Detalhes e Ações */}
              <div className="flex-1 p-12 flex flex-col justify-between">
                <div className="space-y-8">
                  <div className="space-y-2">
                    <input 
                      value={books.find(b => b.id === viewingBookDetailsId)?.title || ''}
                      onChange={(e) => updateBookDetails(viewingBookDetailsId!, { title: e.target.value })}
                      className="bg-transparent border-none p-0 focus:ring-0 text-3xl font-black text-white uppercase tracking-tighter w-full placeholder-gray-800"
                      placeholder="Título do Livro"
                    />
                    <div className="flex items-center gap-4 text-primary-400 font-black text-xs uppercase tracking-widest">
                      <input 
                        value={books.find(b => b.id === viewingBookDetailsId)?.author || ''}
                        onChange={(e) => updateBookDetails(viewingBookDetailsId!, { author: e.target.value })}
                        className="bg-transparent border-none p-0 focus:ring-0 text-primary-400 font-black w-full placeholder-primary-900"
                        placeholder="Nome do Autor"
                      />
                      <span className="text-gray-700">•</span>
                      <input 
                            type="text"
                            value={books.find(b => b.id === viewingBookDetailsId)?.publishedAt || ''}
                            onChange={(e) => updateBookDetails(viewingBookDetailsId!, { publishedAt: e.target.value })}
                            className="bg-transparent border-none p-0 focus:ring-0 text-gray-500 font-bold w-32 placeholder-gray-800"
                            placeholder="Ano/Data"
                      />
                    </div>
                  </div>

                  {/* Reading Progress */}
                  {(() => {
                    const currentBook = books.find(b => b.id === viewingBookDetailsId);
                    if (!currentBook) return null;
                    return (
                      <div className="bg-white/5 border border-white/10 rounded-3xl p-6 space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-primary-500/10 rounded-xl flex items-center justify-center text-primary-500">
                              <i className="ph-bold ph-book-open-text text-xl" />
                            </div>
                            <div>
                              <h4 className="text-xs font-black text-white uppercase tracking-widest">Progresso de Leitura</h4>
                              <p className="text-[10px] text-gray-500 font-bold uppercase">Página {currentBook.currentPage || 0} de {currentBook.totalPages || '?'}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="text-xl font-black text-white leading-none">
                              {currentBook.totalPages ? Math.round(((currentBook.currentPage || 0) / currentBook.totalPages) * 100) : 0}%
                            </span>
                          </div>
                        </div>

                        <div className="relative w-full h-3 bg-white/5 rounded-full overflow-hidden border border-white/5">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${currentBook.totalPages ? ((currentBook.currentPage || 0) / currentBook.totalPages) * 100 : 0}%` }}
                            className="h-full bg-gradient-to-r from-primary-600 to-primary-400 shadow-[0_0_15px_rgba(59,130,246,0.5)]"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-2">Página Atual</label>
                            <input 
                              type="number" 
                              value={currentBook.currentPage || 0}
                              onChange={(e) => updateBookDetails(currentBook.id, { currentPage: parseInt(e.target.value) || 0 })}
                              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white font-bold outline-none focus:border-primary-500 transition-all text-center"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-2">Total de Páginas</label>
                            <input 
                              type="number" 
                              value={currentBook.totalPages || 0}
                              onChange={(e) => updateBookDetails(currentBook.id, { totalPages: parseInt(e.target.value) || 0 })}
                              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white font-bold outline-none focus:border-primary-500 transition-all text-center"
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  <div className="space-y-3">
                    <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-600">Descrição e Notas</h4>
                    <textarea 
                      value={books.find(b => b.id === viewingBookDetailsId)?.description || ''}
                      onChange={(e) => updateBookDetails(viewingBookDetailsId!, { description: e.target.value })}
                      className="w-full bg-white/5 border border-white/5 rounded-3xl p-6 text-gray-400 font-medium text-lg min-h-[200px] focus:border-primary-500/30 transition-all resize-none custom-scrollbar"
                      placeholder="Escreva detalhes sobre o livro, o que você aprendeu ou por que ele é importante..."
                    />
                  </div>
                </div>

                <div className="flex items-center gap-4 mt-8">
                  <button 
                    onClick={() => {
                      setSelectedBookId(viewingBookDetailsId);
                      setViewingBookDetailsId(null);
                    }}
                    className="flex-1 bg-primary-500 text-white py-5 rounded-2xl font-black uppercase tracking-widest text-sm shadow-xl shadow-primary-500/30 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3"
                  >
                    <i className="ph-bold ph-play" />
                    Ler Agora
                  </button>
                  <button 
                    onClick={() => updateBookCover(viewingBookDetailsId!)}
                    className="w-16 h-16 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-all"
                    title="Alterar Capa"
                  >
                    <i className="ph-bold ph-image" />
                  </button>
                  <button 
                    onClick={() => {
                      deleteBook(viewingBookDetailsId!);
                      setViewingBookDetailsId(null);
                    }}
                    className="w-16 h-16 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-center justify-center text-rose-500 hover:bg-rose-500 hover:text-white transition-all"
                    title="Remover"
                  >
                    <i className="ph-bold ph-trash" />
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* DIÁLOGOS PREMIUM */}
      <PremiumDialog
        isOpen={modalConfig.isOpen && modalConfig.type === 'folder'}
        onClose={() => setModalConfig({ ...modalConfig, isOpen: false })}
        title={modalConfig.mode === 'add' ? 'Nova Pasta' : 'Editar Pasta'}
        onConfirm={onConfirmFolder}
        fields={[{ id: 'label', label: 'Nome da Pasta', defaultValue: modalConfig.data?.label }]}
      />

      <PremiumDialog
        isOpen={modalConfig.isOpen && modalConfig.type === 'link'}
        onClose={() => setModalConfig({ ...modalConfig, isOpen: false })}
        title={modalConfig.mode === 'add' ? 'Adicionar Link' : 'Editar Link'}
        onConfirm={onConfirmLink}
        fields={[
          { id: 'label', label: 'Título do Link', defaultValue: modalConfig.data?.label },
          { id: 'url', label: 'URL Completa', type: 'url', defaultValue: modalConfig.data?.url }
        ]}
      />

      <PremiumDialog
        isOpen={modalConfig.isOpen && modalConfig.type === 'goal'}
        onClose={() => setModalConfig({ ...modalConfig, isOpen: false })}
        title={modalConfig.mode === 'add' ? 'Nova Meta' : 'Editar Meta'}
        onConfirm={onConfirmGoal}
        fields={[
          { id: 'label', label: 'Título da Meta', defaultValue: modalConfig.data?.label },
          { id: 'target', label: 'Valor Alvo', type: 'number', defaultValue: modalConfig.data?.target },
          { id: 'unit', label: 'Unidade (ex: leads)', defaultValue: modalConfig.data?.unit }
        ]}
      />

      <AnimatePresence>
        {isAddBookLinkOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-[#0a0c12] border border-white/10 rounded-[3rem] w-full max-w-2xl overflow-hidden shadow-2xl p-10 space-y-8"
            >
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <h3 className="text-xl font-black text-white uppercase tracking-tighter">Novo Livro</h3>
                  <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">Catalogação via Google Books API</p>
                </div>
                <button onClick={() => setIsAddBookLinkOpen(false)} className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center text-gray-400 hover:text-white transition-all">
                  <i className="ph-bold ph-x" />
                </button>
              </div>

              <div className="space-y-6">
                {/* Busca */}
                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-600">1. Buscar Obra no Catálogo Global</label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <input 
                        type="text"
                        value={bookSearchTerm}
                        placeholder="Digite título ou autor (ex: Pai Rico Pai Pobre)"
                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white focus:border-primary-500 transition-all outline-none"
                        onChange={(e) => setBookSearchTerm(e.target.value)}
                      />
                      {isSearchingBook && (
                        <div className="absolute right-6 top-1/2 -translate-y-1/2 flex items-center gap-2">
                          <span className="text-[9px] font-black text-primary-500 uppercase animate-pulse">Buscando...</span>
                          <div className="w-4 h-4 border-2 border-primary-500/20 border-t-primary-500 rounded-full animate-spin" />
                        </div>
                      )}
                    </div>
                    <button 
                      onClick={() => searchBooks(bookSearchTerm)}
                      disabled={isSearchingBook || bookSearchTerm.length < 3}
                      className="px-6 bg-white/5 border border-white/10 rounded-2xl text-gray-400 hover:text-white hover:bg-white/10 transition-all disabled:opacity-50"
                      title="Forçar Busca"
                    >
                      <i className="ph-bold ph-magnifying-glass" />
                    </button>
                  </div>

                  {/* Resultados da Busca */}
                  <AnimatePresence>
                    {bookSearchResults.length > 0 && (
                      <motion.div 
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden divide-y divide-white/5 max-h-[300px] overflow-y-auto custom-scrollbar"
                      >
                        {bookSearchResults.map((res, i) => (
                          <button 
                            key={i}
                            onClick={() => {
                              // Preencher campos e fechar lista
                              const titleInput = document.getElementById('book-title') as HTMLInputElement;
                              const authorInput = document.getElementById('book-author') as HTMLInputElement;
                              const dateInput = document.getElementById('book-date') as HTMLInputElement;
                              const descInput = document.getElementById('book-desc') as HTMLTextAreaElement;
                              const coverInput = document.getElementById('book-cover') as HTMLInputElement;
                              
                              if (titleInput) titleInput.value = res.title;
                              if (authorInput) authorInput.value = res.author;
                              if (dateInput) dateInput.value = res.publishedAt;
                              if (descInput) descInput.value = res.description;
                              if (coverInput) coverInput.value = res.coverUrl;
                              
                              setBookSearchResults([]);
                            }}
                            className="w-full p-4 flex items-center gap-4 hover:bg-white/10 transition-all text-left group"
                          >
                            <img src={res.coverUrl || 'https://via.placeholder.com/40x60'} className="w-10 aspect-[2/3] object-cover rounded-md shadow-lg" />
                            <div className="min-w-0">
                              <p className="text-sm font-black text-white truncate uppercase tracking-tighter">{res.title}</p>
                              <p className="text-[10px] text-gray-500 font-bold uppercase truncate">{res.author}</p>
                            </div>
                            <i className="ph-bold ph-plus ml-auto text-primary-500 opacity-0 group-hover:opacity-100 transition-all" />
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Campos de Link e Dados */}
                <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-600">2. Link do Documento (Google Drive)</label>
                    <input id="book-url" type="url" placeholder="https://drive.google.com/..." className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white focus:border-primary-500 outline-none" />
                    <p className="text-[9px] text-gray-600 font-bold uppercase tracking-tighter ml-2">O Hub ajustará automaticamente o link para modo preview.</p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-600">Título</label>
                      <input id="book-title" type="text" className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white outline-none" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-600">Autor</label>
                      <input id="book-author" type="text" className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white outline-none" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-600">Página Atual</label>
                      <input id="book-current-page" type="number" defaultValue="0" className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white outline-none" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-600">Total de Páginas</label>
                      <input id="book-total-pages" type="number" defaultValue="0" className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white outline-none" />
                    </div>
                  </div>

                  <input id="book-cover" type="hidden" />
                  <input id="book-date" type="hidden" />
                  <textarea id="book-desc" className="hidden" />
                </div>

                <button 
                  onClick={() => {
                    const title = (document.getElementById('book-title') as HTMLInputElement).value;
                    const url = (document.getElementById('book-url') as HTMLInputElement).value;
                    const author = (document.getElementById('book-author') as HTMLInputElement).value;
                    const publishedAt = (document.getElementById('book-date') as HTMLInputElement).value;
                    const description = (document.getElementById('book-desc') as HTMLTextAreaElement).value;
                    const coverUrl = (document.getElementById('book-cover') as HTMLInputElement).value;
                    const currentPage = parseInt((document.getElementById('book-current-page') as HTMLInputElement).value) || 0;
                    const totalPages = parseInt((document.getElementById('book-total-pages') as HTMLInputElement).value) || 0;

                    if (!title || !url) {
                      toast.error('Título e Link são obrigatórios!');
                      return;
                    }

                    handleAddBookByLink({ title, url, author, publishedAt, description, coverUrl, currentPage, totalPages });
                  }}
                  className="w-full bg-primary-500 text-white py-5 rounded-[2rem] font-black uppercase tracking-[0.2em] text-xs shadow-xl shadow-primary-500/30 hover:scale-[1.02] active:scale-95 transition-all"
                >
                  Confirmar Catalogação
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* FOOTER DO WORKSPACE */}
      <footer className="pt-12 border-t border-white/5 flex flex-col sm:flex-row justify-between items-center gap-6 opacity-40">
        <div className="flex items-center gap-4">
          <img src="https://i.imgur.com/EFBaYb5.png" alt="Hub Central" className="h-6 grayscale" />
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">Security: End-to-End Encrypted</span>
        </div>
        <div className="text-[9px] font-black uppercase tracking-[0.5em] text-gray-600">
          Last Sync: {new Date().toLocaleTimeString()}
        </div>
      </footer>
      {/* Share Book Modal */}
      <AnimatePresence>
        {isShareModalOpen && sharingBook && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsShareModalOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md bg-[#0a0c12] border border-white/10 rounded-[2.5rem] shadow-2xl overflow-hidden"
            >
              <div className="p-8 border-b border-white/5">
                <h3 className="text-xl font-black text-white uppercase tracking-widest">Compartilhar Livro</h3>
                <p className="text-sm text-gray-500 mt-1">{sharingBook.title}</p>
              </div>
              
              <div className="p-8 max-h-[400px] overflow-y-auto custom-scrollbar space-y-4">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Selecione o destinatário:</p>
                {teamProfiles.filter(p => p.uid !== user?.uid).map(profile => (
                  <button
                    key={profile.uid}
                    onClick={() => handleConfirmShare(profile.uid, profile.displayName)}
                    className="w-full flex items-center gap-4 p-4 bg-white/5 rounded-2xl border border-white/5 hover:border-primary-500/30 hover:bg-primary-500/5 transition-all text-left group"
                  >
                    <div className="w-12 h-12 rounded-xl overflow-hidden bg-white/10">
                      {profile.photoURL ? (
                        <img src={profile.photoURL} alt={profile.displayName} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xl font-black text-white/20">
                          {profile.displayName.charAt(0)}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-white group-hover:text-primary-400 transition-colors">{profile.displayName}</p>
                      <p className="text-[10px] text-gray-500 uppercase font-medium">{profile.jobTitle || 'Membro do Time'}</p>
                    </div>
                    <i className="ph-bold ph-caret-right text-gray-600 group-hover:translate-x-1 transition-transform" />
                  </button>
                ))}
              </div>
              
              <div className="p-8 bg-white/5 flex justify-end">
                <button 
                  onClick={() => setIsShareModalOpen(false)}
                  className="px-6 py-3 text-xs font-black uppercase tracking-widest text-gray-500 hover:text-white transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
