import React, { useState, useEffect, useRef } from 'react';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@auth/contexts/AuthContext';
import { useCRM } from '@crm/contexts/CRMContext';
import { useDialog } from '@auth/contexts/DialogContext';
import { toast } from 'sonner';
import { PremiumDialog } from '@shared/components/PremiumDialog';
import { format, isToday } from 'date-fns';
import { uploadImageToImgBB } from '@/lib/imgbb';
import { uploadToCloudinary } from '@/lib/cloudinary';
import { apiClient } from '@/lib/apiClient';
import { useWeather } from '@/hooks/useWeather';

// Novos Componentes Modulares
import ErrorBoundary from '@shared/components/ErrorBoundary';
import { VaultSkeleton, GoalsSkeleton, LibrarySkeleton } from '@nexus/components/NexusSkeleton';
import { NexusHub } from '@nexus/components/NexusHub';

// Imports dinâmicos para performance
const LibraryTab = React.lazy(() => import('@nexus/components/LibraryTab').then(m => ({ default: m.LibraryTab })));

import { OKRWidget } from '@nexus/components/OKRWidget';
import { KudosWall } from '@nexus/components/KudosWall';

// Interfaces importadas da Store
import { useNexusStore } from '@store/useNexusStore';
import type { PersonalLink, LinkFolder, PersonalGoal, NexusTask, NexusNote, NexusBook, BookCategory } from '@store/useNexusStore';

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
  
  // Zustand Store - Seletores
  const folders = useNexusStore(state => state.folders);
  const links = useNexusStore(state => state.links);
  const goals = useNexusStore(state => state.goals);
  const tasks = useNexusStore(state => state.tasks);
  const notes = useNexusStore(state => state.notes);
  const books = useNexusStore(state => state.books);
  const loading = useNexusStore(state => state.loading);
  const initNexus = useNexusStore(state => state.init);
  
  // Zustand Store - Ações
  const shareBookAction = useNexusStore(state => state.shareBook);
  const publishToCommunityAction = useNexusStore(state => state.publishToCommunity);
  const updateBookDetails = useNexusStore(state => state.updateBookDetails);
  const updateReadingProgress = useNexusStore(state => state.updateReadingProgress);
  const storeDeleteBook = useNexusStore(state => state.deleteBook);
  const setFolders = useNexusStore(state => state.setFolders);
  const setLinks = useNexusStore(state => state.setLinks);
  const setGoals = useNexusStore(state => state.setGoals);
  const setTasks = useNexusStore(state => state.setTasks);
  const setBooks = useNexusStore(state => state.setBooks);
  const bookCategories = useNexusStore(state => state.bookCategories);
  const addBookCategory = useNexusStore(state => state.addBookCategory);
  const updateBookCategory = useNexusStore(state => state.updateBookCategory);
  const deleteBookCategory = useNexusStore(state => state.deleteBookCategory);

  // Estados Locais
  const [activeTab, setActiveTab] = useState<'hub' | 'library' | 'culture'>('hub');
  const [librarySubTab, setLibrarySubTab] = useState<'my' | 'shared' | 'community' | 'stats'>('my');
  const [communityBooks, setCommunityBooks] = useState<NexusBook[]>([]);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [sharingBook, setSharingBook] = useState<NexusBook | null>(null);
  const [dailyQuote, setDailyQuote] = useState<{content: string, author: string} | null>(null);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [selectedBookId, setSelectedBookId] = useState<string | null>(null);
  const [viewingBookDetailsId, setViewingBookDetailsId] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [librarySearchQuery, setLibrarySearchQuery] = useState('');
  const [libraryPage, setLibraryPage] = useState(1);
  const [isAddBookLinkOpen, setIsAddBookLinkOpen] = useState(false);
  const [bookCoverResults, setBookCoverResults] = useState<{url: string, title: string, author?: string}[]>([]);
  const [selectedPreviewCover, setSelectedPreviewCover] = useState<string | null>(null);
  const { weather } = useWeather();

  // Saudação Dinâmica
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return 'Bom dia';
    if (hour >= 12 && hour < 18) return 'Boa tarde';
    return 'Boa noite';
  };
  const [modalConfig, setModalConfig] = useState<{
    isOpen: boolean;
    type: 'folder' | 'link' | 'goal' | 'task' | 'note' | 'book' | 'category';
    mode: 'add' | 'edit';
    data?: any;
  }>({ isOpen: false, type: 'folder', mode: 'add' });

  const [bookFormData, setBookFormData] = useState<Partial<NexusBook>>({
    title: '',
    author: '',
    pdfUrl: '',
    coverUrl: '',
    category: 'Ficção',
    description: '',
    publishedAt: '',
    currentPage: 0,
    totalPages: 0
  });

  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);

  // Funções Locais
  const deleteBook = async (id: string) => {
    const ok = await confirm({
      title: 'Remover Livro',
      message: 'Deseja remover este livro da sua biblioteca?',
      variant: 'danger',
      confirmText: 'Remover'
    });
    if (ok) {
      await storeDeleteBook(id);
      toast.success('Livro removido');
    }
  };

  const updateBookCover = async (bookId: string) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e: any) => {
      const file = e.target.files?.[0];
      if (!file) return;
      toast.loading('Fazendo upload da capa...');
      try {
        const url = await uploadToCloudinary(file);
        await updateBookDetails(bookId, { coverUrl: url });
        toast.dismiss();
        toast.success('Capa atualizada!');
      } catch (err) {
        toast.dismiss();
        toast.error('Erro ao fazer upload da capa');
      }
    };
    input.click();
  };

  const buscarCapasOpenLibrary = async (titulo: string) => {
    try {
      const urlBusca = `https://openlibrary.org/search.json?title=${encodeURIComponent(titulo)}&limit=12`;
      const resposta = await fetch(urlBusca);
      const dados = await resposta.json();

      const results = dados.docs
        .filter((doc: any) => doc.cover_i)
        .map((doc: any) => ({
          url: `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg`,
          title: doc.title,
          author: doc.author_name?.[0]
        }));

      return results;
    } catch (erro) {
      console.error("Erro ao buscar capas na Open Library:", erro);
      return [];
    }
  };

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

  // Efeitos
  useEffect(() => {
    if (user?.uid) {
      const unsubscribe = initNexus(user.uid);
      return () => unsubscribe();
    }
  }, [user?.uid, initNexus]);

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

  const onConfirmCategory = async (values: any) => {
    if (values.label && values.label.trim()) {
      if (modalConfig.mode === 'edit' && modalConfig.data) {
        await updateBookCategory(modalConfig.data, values.label.trim());
        toast.success('Categoria atualizada!');
      } else {
        await addBookCategory(values.label.trim());
        // Se estivermos catalogando um livro, selecionamos a nova categoria automaticamente
        if (isAddBookLinkOpen) {
          setBookFormData(prev => ({ ...prev, category: values.label.trim() }));
        }
        toast.success('Categoria criada!');
      }
    }
  };

  const handleSaveBook = async () => {
    if (!bookFormData.title || !bookFormData.pdfUrl) {
      toast.error('Título e Link são obrigatórios!');
      return;
    }

    let finalUrl = bookFormData.pdfUrl;
    if (finalUrl.includes('drive.google.com')) {
      if (finalUrl.includes('/view')) finalUrl = finalUrl.split('/view')[0].replace(/\/$/, '') + '/preview';
      else if (finalUrl.includes('/edit')) finalUrl = finalUrl.split('/edit')[0].replace(/\/$/, '') + '/preview';
      else if (!finalUrl.endsWith('/preview')) finalUrl = finalUrl.split('?')[0].replace(/\/$/, '') + '/preview';
    }

    if (modalConfig.mode === 'edit' && modalConfig.data?.id) {
      await updateBookDetails(modalConfig.data.id, { ...bookFormData, pdfUrl: finalUrl });
      toast.success('Livro atualizado!');
    } else {
      const newBook: NexusBook = {
        id: Date.now().toString(),
        addedAt: Date.now(),
        ...(bookFormData as NexusBook),
        pdfUrl: finalUrl,
        currentPage: bookFormData.currentPage || 0,
        totalPages: bookFormData.totalPages || 0
      };
      setBooks([newBook, ...books]);
      toast.success('Livro catalogado com sucesso!');
    }

    setIsAddBookLinkOpen(false);
    setBookCoverResults([]);
    setSelectedPreviewCover(null);
    setModalConfig({ ...modalConfig, isOpen: false });
  };

  const openEditBookModal = (book: NexusBook) => {
    setBookFormData({
      title: book.title,
      author: book.author || '',
      pdfUrl: book.pdfUrl,
      coverUrl: book.coverUrl || '',
      category: (book.category as any) || 'Ficção',
      description: book.description || '',
      publishedAt: book.publishedAt || '',
      currentPage: book.currentPage || 0,
      totalPages: book.totalPages || 0
    });
    setModalConfig({
      isOpen: true,
      type: 'book',
      mode: 'edit',
      data: book
    });
    setIsAddBookLinkOpen(true);
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-12">
      {/* HEADER DE BOAS VINDAS */}
      <header className="flex flex-col xl:flex-row xl:items-end justify-between gap-10 border-b border-white/5 pb-12">
        <div className="space-y-6 flex-1">
          <div className="flex items-center gap-3">
            <div className="px-3 py-1 bg-primary-500/10 border border-primary-500/20 rounded-full">
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary-400">Nexus Workspace v8.0 Intelligence Hub</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
               <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
               <span className="text-[9px] font-black uppercase tracking-[0.2em] text-emerald-400">Neural Sync Ativo</span>
            </div>
          </div>
          
          <div className="space-y-2">
            <h1 className="text-5xl font-black text-white tracking-tighter leading-tight flex items-center gap-4">
              {getGreeting()}, <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-400 to-primary-600">{userProfile?.displayName?.split(' ')[0] || user?.displayName?.split(' ')[0] || 'Hubber'}</span>.
              {weather && (
                <div className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-2xl ml-4">
                  <img src={`https://openweathermap.org/img/wn/${weather.icon}.png`} alt="weather" className="w-8 h-8" />
                  <div className="flex flex-col">
                    <span className="text-sm font-black text-white">{weather.temp}°C</span>
                    <span className="text-[8px] font-bold text-gray-500 uppercase tracking-widest">{weather.description}</span>
                  </div>
                </div>
              )}
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

        {/* NAVEGAÇÃO DE TABS SIMPLIFICADA */}
        <nav className="flex bg-[#0a0c12]/40 backdrop-blur-2xl p-1.5 rounded-[2rem] border border-white/10 shadow-2xl h-fit">
          {[
            { id: 'hub', label: 'Hub Intelligence', icon: 'ph-brain' },
            { id: 'library', label: 'Biblioteca', icon: 'ph-books' },
            { id: 'culture', label: 'Cultura', icon: 'ph-star' }
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
          <AnimatePresence mode="wait">
            {activeTab === 'hub' && (
              <motion.section key="hub" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }}>
                <NexusHub confirm={confirm} setModalConfig={setModalConfig} />
              </motion.section>
            )}

            {activeTab === 'library' && (
              <motion.section key="library" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }}>
                <React.Suspense fallback={<div className="h-full flex items-center justify-center p-20"><div className="w-12 h-12 border-4 border-primary-500/20 border-t-primary-500 rounded-full animate-spin" /></div>}>
                  {!selectedBookId ? (
                    loading && communityBooks.length === 0 ? <LibrarySkeleton /> : (
                      <LibraryTab 
                        librarySubTab={librarySubTab} setLibrarySubTab={setLibrarySubTab}
                        librarySearchQuery={librarySearchQuery} setLibrarySearchQuery={setLibrarySearchQuery}
                        libraryPage={libraryPage} setLibraryPage={setLibraryPage}
                        setViewingBookDetailsId={setViewingBookDetailsId}
                        setIsAddBookLinkOpen={(open) => {
                          if (open) {
                            setBookFormData({
                              title: '',
                              author: '',
                              pdfUrl: '',
                              coverUrl: '',
                              category: 'Ficção',
                              description: '',
                              publishedAt: '',
                              currentPage: 0,
                              totalPages: 0
                            });
                            setModalConfig({ isOpen: true, type: 'book', mode: 'add' });
                          }
                          setIsAddBookLinkOpen(open);
                        }}
                        onEditBook={openEditBookModal}
                        onAddCategory={() => setModalConfig({ isOpen: true, type: 'category', mode: 'add' })}
                        onEditCategory={(cat) => setModalConfig({ isOpen: true, type: 'category', mode: 'edit', data: cat })}
                        onDeleteCategory={async (cat) => {
                          if (await confirm({ 
                            title: 'Excluir Categoria', 
                            message: `Tem certeza que deseja excluir "${cat}"? Livros vinculados serão movidos para "Outros".` 
                          })) {
                            await deleteBookCategory(cat);
                            toast.success('Categoria removida!');
                          }
                        }}
                        setSharingBook={setSharingBook}
                        setIsShareModalOpen={setIsShareModalOpen}
                        communityBooks={communityBooks}
                        confirm={confirm}
                        orgId={userProfile?.orgId}
                        userUid={user?.uid}
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
                </React.Suspense>
              </motion.section>
            )}

            {activeTab === 'culture' && (
              <motion.section key="culture" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <OKRWidget />
                  <KudosWall />
                </div>
              </motion.section>
            )}
          </AnimatePresence>
        </ErrorBoundary>
      </main>

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
      
      <PremiumDialog
        isOpen={modalConfig.isOpen && modalConfig.type === 'category'}
        onClose={() => setModalConfig({ ...modalConfig, isOpen: false })}
        title={modalConfig.mode === 'add' ? 'Nova Categoria' : 'Editar Categoria'}
        onConfirm={onConfirmCategory}
        fields={[{ id: 'label', label: 'Nome da Categoria', defaultValue: modalConfig.mode === 'edit' ? modalConfig.data : '', placeholder: 'Ex: Literatura Clássica' }]}
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
              className="bg-[#0a0c12] border border-white/10 rounded-[3rem] w-full max-w-2xl overflow-visible shadow-2xl p-10 space-y-8 relative"
            >
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <h3 className="text-xl font-black text-white uppercase tracking-tighter">Novo Livro</h3>
                  <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">Adicionar obra à sua biblioteca</p>
                </div>
                <button onClick={() => {
                  setIsAddBookLinkOpen(false);
                  setBookCoverResults([]);
                  setSelectedPreviewCover(null);
                }} className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center text-gray-400 hover:text-white transition-all">
                  <i className="ph-bold ph-x" />
                </button>
              </div>

              <div className="space-y-6">
                <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-600">1. Link do Documento (PDF/Google Drive)</label>
                    <input 
                      type="url" 
                      placeholder="https://..." 
                      value={bookFormData.pdfUrl}
                      onChange={(e) => setBookFormData({ ...bookFormData, pdfUrl: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white focus:border-primary-500 outline-none" 
                    />
                    <p className="text-[9px] text-gray-600 font-bold uppercase tracking-tighter ml-2">Links do Drive são ajustados automaticamente para preview.</p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-600">Título</label>
                      <div className="relative group">
                        <input 
                          type="text" 
                          value={bookFormData.title}
                          onChange={(e) => setBookFormData({ ...bookFormData, title: e.target.value })}
                          className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white outline-none focus:border-primary-500 pr-12 transition-all" 
                        />
                        <button 
                          onClick={async () => {
                            if (!bookFormData.title) {
                              toast.error('Digite o título para buscar a capa');
                              return;
                            }
                            const tId = toast.loading('Buscando capas na Open Library...');
                            const covers = await buscarCapasOpenLibrary(bookFormData.title);
                            toast.dismiss(tId);
                            
                            if (covers.length > 0) {
                              setBookCoverResults(covers);
                              toast.success(`${covers.length} capas encontradas! Escolha uma abaixo.`);
                            } else {
                              setBookCoverResults([]);
                              toast.error('Não encontramos capas para este título.');
                            }
                          }}
                          className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/5 hover:bg-primary-500/20 rounded-xl flex items-center justify-center text-gray-400 hover:text-primary-500 transition-all"
                          title="Buscar na Open Library"
                        >
                          <i className="ph-bold ph-magnifying-glass" />
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2 relative">
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-600">Categoria</label>
                      <button
                        onClick={() => setIsCategoryDropdownOpen(!isCategoryDropdownOpen)}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white text-left flex items-center justify-between hover:border-white/20 transition-all"
                      >
                        <span className="text-sm font-medium">{bookFormData.category || 'Selecionar Categoria'}</span>
                        <i className={`ph-bold ph-caret-down transition-transform ${isCategoryDropdownOpen ? 'rotate-180' : ''}`} />
                      </button>
                      
                      <AnimatePresence>
                        {isCategoryDropdownOpen && (
                          <>
                            <div className="fixed inset-0 z-[120]" onClick={() => setIsCategoryDropdownOpen(false)} />
                            <motion.div
                              initial={{ opacity: 0, y: 10, scale: 0.95 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              exit={{ opacity: 0, y: 10, scale: 0.95 }}
                              className="absolute top-full left-0 right-0 mt-2 bg-[#0d0f16] border border-white/10 rounded-2xl shadow-2xl z-[130] overflow-hidden"
                            >
                              <div className="max-h-[240px] overflow-y-auto custom-scrollbar p-2">
                                {bookCategories.map(cat => (
                                  <button
                                    key={cat}
                                    onClick={() => {
                                      setBookFormData({ ...bookFormData, category: cat });
                                      setIsCategoryDropdownOpen(false);
                                    }}
                                    className={`w-full text-left px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${bookFormData.category === cat ? 'bg-primary-500 text-white' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}
                                  >
                                    {cat}
                                  </button>
                                ))}
                                <div className="h-px bg-white/5 my-2" />
                                <button
                                  onClick={() => {
                                    setModalConfig({ isOpen: true, type: 'category', mode: 'add' });
                                    setIsCategoryDropdownOpen(false);
                                  }}
                                  className="w-full text-left px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-widest text-primary-400 hover:bg-primary-500/10 transition-all flex items-center gap-2"
                                >
                                  <i className="ph-bold ph-plus" />
                                  Nova Categoria...
                                </button>
                              </div>
                            </motion.div>
                          </>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>

                  <AnimatePresence>
                    {bookCoverResults.length > 0 && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="space-y-3 overflow-hidden"
                      >
                        <div className="flex items-center justify-between">
                          <label className="text-[10px] font-black uppercase tracking-widest text-primary-500">Capas Sugeridas</label>
                          <button onClick={() => setBookCoverResults([])} className="text-[9px] font-black uppercase text-gray-500 hover:text-white">Fechar</button>
                        </div>
                        <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar">
                          {bookCoverResults.map((cover, idx) => (
                            <button
                              key={idx}
                              onClick={() => {
                                setSelectedPreviewCover(cover.url);
                                setBookFormData({
                                  ...bookFormData,
                                  coverUrl: cover.url,
                                  author: cover.author || bookFormData.author
                                });
                                toast.success('Metadados atualizados!');
                              }}
                              className={`flex-shrink-0 w-24 aspect-[2/3] rounded-xl overflow-hidden border-2 transition-all ${selectedPreviewCover === cover.url ? 'border-primary-500 scale-105 shadow-xl shadow-primary-500/20' : 'border-white/5 hover:border-white/20'}`}
                            >
                              <img src={cover.url} alt={cover.title} className="w-full h-full object-cover" />
                            </button>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-600">Autor</label>
                      <input 
                        type="text" 
                        value={bookFormData.author}
                        onChange={(e) => setBookFormData({ ...bookFormData, author: e.target.value })}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white outline-none focus:border-primary-500" 
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-600">URL da Capa (Opcional)</label>
                      <input 
                        type="text" 
                        value={bookFormData.coverUrl}
                        onChange={(e) => setBookFormData({ ...bookFormData, coverUrl: e.target.value })}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white outline-none focus:border-primary-500" 
                      />
                    </div>
                  </div>

                  {modalConfig.mode === 'add' && (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-600">Página Atual</label>
                        <input 
                          type="number" 
                          value={bookFormData.currentPage}
                          onChange={(e) => setBookFormData({ ...bookFormData, currentPage: parseInt(e.target.value) || 0 })}
                          className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white outline-none focus:border-primary-500" 
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-600">Total de Páginas</label>
                        <input 
                          type="number" 
                          value={bookFormData.totalPages}
                          onChange={(e) => setBookFormData({ ...bookFormData, totalPages: parseInt(e.target.value) || 0 })}
                          className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white outline-none focus:border-primary-500" 
                        />
                      </div>
                    </div>
                  )}
                </div>

                <button 
                  onClick={handleSaveBook}
                  className="w-full bg-primary-500 text-white py-5 rounded-[2rem] font-black uppercase tracking-[0.2em] text-xs shadow-xl shadow-primary-500/30 hover:scale-[1.02] active:scale-95 transition-all"
                >
                  {modalConfig.mode === 'edit' ? 'Salvar Alterações' : 'Confirmar Catalogação'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Quick View Book Modal */}
      <AnimatePresence>
        {viewingBookDetailsId && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setViewingBookDetailsId(null)}
              className="absolute inset-0 bg-black/90 backdrop-blur-xl"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 50 }} 
              animate={{ opacity: 1, scale: 1, y: 0 }} 
              exit={{ opacity: 0, scale: 0.9, y: 50 }}
              className="relative w-full max-w-4xl bg-[#0a0c12] border border-white/10 rounded-[3rem] shadow-2xl overflow-hidden flex flex-col md:flex-row h-full max-h-[600px]"
            >
              <button 
                onClick={() => setViewingBookDetailsId(null)}
                className="absolute top-6 right-6 w-10 h-10 bg-white/5 rounded-full flex items-center justify-center text-gray-400 hover:text-white transition-all z-50"
              >
                <i className="ph-bold ph-x" />
              </button>

              {/* Cover Side */}
                {(() => {
                  const book = books.find(b => b.id === viewingBookDetailsId) || communityBooks.find(b => b.id === viewingBookDetailsId);
                  if (!book) return null;
                  return (
                    <div 
                      className="w-full md:w-1/3 h-64 md:h-full bg-white/5 relative group overflow-hidden cursor-pointer"
                      onClick={() => updateReadingProgress(book.id, (book.currentPage || 0) + 1)}
                    >
                      {book.coverUrl ? (
                        <img src={book.coverUrl} alt={book.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-gray-600">
                          <i className="ph-duotone ph-book text-8xl opacity-20" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-all flex flex-col items-center justify-center gap-2">
                        <div className="w-12 h-12 rounded-full bg-primary-500 flex items-center justify-center text-white shadow-xl shadow-primary-500/40">
                          <i className="ph-bold ph-plus text-xl" />
                        </div>
                        <span className="text-[10px] font-black text-white uppercase tracking-widest bg-black/40 px-3 py-1 rounded-full backdrop-blur-md">Clique para +1 pág</span>
                      </div>
                      <div className="absolute inset-0 bg-gradient-to-t from-[#0a0c12] to-transparent opacity-60" />
                    </div>
                  );
                })()}

              {/* Content Side */}
              <div className="flex-1 p-10 md:p-14 overflow-y-auto custom-scrollbar flex flex-col">
                {(() => {
                  const book = books.find(b => b.id === viewingBookDetailsId) || communityBooks.find(b => b.id === viewingBookDetailsId);
                  const isMine = books.some(b => b.id === viewingBookDetailsId);
                  if (!book) return null;

                  return (
                    <>
                      <div className="space-y-4 mb-auto">
                        <div className="flex items-center gap-3">
                          <span className="px-3 py-1 bg-primary-500/10 border border-primary-500/20 rounded-full text-[10px] font-black text-primary-400 uppercase tracking-widest">
                            {book.category || 'Sem Categoria'}
                          </span>
                          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                            {book.totalPages ? `${book.totalPages} Páginas` : 'Documento'}
                          </span>
                        </div>
                        <h2 className="text-3xl font-black text-white uppercase tracking-tighter leading-none">{book.title}</h2>
                        <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">
                          {book.sharedBy ? `Enviado por ${book.sharedBy.name}` : 'Biblioteca Pessoal'}
                        </p>
                        
                         <div className="pt-8 space-y-6">
                           <div className="space-y-4">
                             <div className="flex items-center justify-between">
                               <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">Progresso de Leitura</p>
                               <span className="text-xs font-black text-primary-400">
                                 {book.currentPage ? `${Math.round((book.currentPage / (book.totalPages || 1)) * 100)}% Concluído` : 'Não Iniciado'}
                               </span>
                             </div>
                             
                             <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden border border-white/5">
                               <motion.div 
                                 initial={{ width: 0 }}
                                 animate={{ width: `${book.totalPages ? (book.currentPage / book.totalPages) * 100 : 0}%` }}
                                 className="h-full bg-primary-500 shadow-[0_0_15px_rgba(59,130,246,0.3)]"
                               />
                             </div>
                             <div className="flex items-center gap-4 bg-white/5 p-4 rounded-2xl border border-white/5">
                               <div className="flex-1 space-y-2">
                                 <label className="text-[9px] font-black text-gray-600 uppercase tracking-widest">Ajuste Rápido</label>
                                 <div className="flex items-center gap-2">
                                   <button 
                                     onClick={() => updateReadingProgress(book.id, Math.max(0, (book.currentPage || 0) - 1))}
                                     className="w-10 h-10 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center text-white hover:bg-white/10"
                                   >
                                     <i className="ph ph-minus" />
                                   </button>
                                   <input 
                                     type="number" 
                                     value={book.currentPage || 0}
                                     onChange={(e) => updateReadingProgress(book.id, parseInt(e.target.value) || 0)}
                                     className="flex-1 bg-black/20 border border-white/10 rounded-xl px-2 py-2.5 text-white font-bold text-xs outline-none focus:border-primary-500 text-center"
                                   />
                                   <button 
                                     onClick={() => updateReadingProgress(book.id, (book.currentPage || 0) + 1)}
                                     className="w-10 h-10 bg-primary-500/20 border border-primary-500/30 rounded-xl flex items-center justify-center text-primary-400 hover:bg-primary-500 hover:text-white"
                                   >
                                     <i className="ph ph-plus" />
                                   </button>
                                 </div>
                               </div>
                               <div className="w-px h-10 bg-white/5" />
                               <div className="space-y-2">
                                 <label className="text-[9px] font-black text-gray-600 uppercase tracking-widest">Total</label>
                                 <input 
                                   type="number" 
                                   value={book.totalPages || 0}
                                   onChange={(e) => updateBookDetails(book.id, { totalPages: parseInt(e.target.value) || 0 })}
                                   className="w-16 bg-white/5 border border-white/10 rounded-xl px-2 py-2.5 text-white font-bold text-xs outline-none focus:border-primary-500 text-center"
                                 />
                               </div>
                             </div>
                           </div>
                         </div>
                        
                        <div className="pt-8">
                          <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest mb-4">Ações Disponíveis</p>
                          <div className="flex flex-wrap gap-4">
                            <a 
                              href={book.pdfUrl} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="px-8 py-4 bg-white/5 border border-white/10 text-white rounded-2xl text-xs font-black uppercase tracking-widest flex items-center gap-3 hover:bg-white/10 transition-all"
                            >
                              <i className="ph-bold ph-arrow-square-out" /> Nova Aba
                            </a>
                            <button 
                              onClick={() => {
                                setSelectedBookId(book.id);
                                setViewingBookDetailsId(null);
                                // Scroll to top of viewer
                                window.scrollTo({ top: 0, behavior: 'smooth' });
                              }}
                              className="px-8 py-4 bg-primary-500 text-white rounded-2xl text-xs font-black uppercase tracking-widest flex items-center gap-3 shadow-xl shadow-primary-500/20 hover:scale-105 transition-all"
                            >
                              <i className="ph-bold ph-play" /> Ler no CRM
                            </button>
                            {isMine && (
                              <button 
                                onClick={() => { setViewingBookDetailsId(null); setSharingBook(book); setIsShareModalOpen(true); }}
                                className="w-12 h-12 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center text-gray-400 hover:text-white transition-all"
                                title="Compartilhar"
                              >
                                <i className="ph-bold ph-paper-plane-tilt" />
                              </button>
                            )}
                            {isMine && (
                              <button 
                                onClick={() => { setViewingBookDetailsId(null); openEditBookModal(book); }}
                                className="w-12 h-12 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center text-gray-400 hover:text-white transition-all"
                                title="Editar"
                              >
                                <i className="ph-bold ph-pencil-simple" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="pt-12 mt-12 border-t border-white/5 opacity-40">
                         <p className="text-[9px] font-black text-gray-500 uppercase tracking-[0.3em]">
                           ID do Recurso: {book.id} • Adicionado em {new Date().toLocaleDateString()}
                         </p>
                      </div>
                    </>
                  );
                })()}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* FOOTER DO WORKSPACE */}
      <footer className="pt-12 border-t border-white/5 flex flex-col sm:flex-row justify-between items-center gap-6 opacity-40">
        <div className="flex items-center gap-4">
          <img src="https://i.imgur.com/zCvL7xy.png" alt="Hub Central" className="h-6" />
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
