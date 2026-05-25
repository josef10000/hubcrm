import React from 'react';
import { useNexusStore } from '@store/useNexusStore';
import { motion, AnimatePresence } from 'framer-motion';
import type { NexusBook, ReadingStatus } from '@store/useNexusStore';
import { toast } from 'sonner';
import { uploadToCloudinary } from '@/lib/cloudinary';
import { NexusStats } from './NexusStats';
import { BookCard, ListViewItem } from './library';
import { ReadingClubsPanel } from './ReadingClubsPanel';

interface LibraryTabProps {
  librarySubTab: 'my' | 'shared' | 'community' | 'stats' | 'clubs';
  setLibrarySubTab: (tab: 'my' | 'shared' | 'community' | 'stats' | 'clubs') => void;
  librarySearchQuery: string;
  setLibrarySearchQuery: (query: string) => void;
  libraryPage: number;
  setLibraryPage: (page: number | ((p: number) => number)) => void;
  setViewingBookDetailsId: (id: string | null) => void;
  setIsAddBookLinkOpen: (open: boolean) => void;
  onEditBook?: (book: NexusBook) => void;
  setSharingBook: (book: NexusBook | null) => void;
  setIsShareModalOpen: (open: boolean) => void;
  communityBooks: NexusBook[];
  onAddCategory: () => void;
  onEditCategory: (cat: string) => void;
  onDeleteCategory: (cat: string) => void;
  confirm: (options: any) => Promise<boolean>;
  orgId: string | undefined;
  userUid: string;
}


export const LibraryTab: React.FC<LibraryTabProps> = ({
  librarySubTab,
  setLibrarySubTab,
  librarySearchQuery,
  setLibrarySearchQuery,
  libraryPage,
  setLibraryPage,
  setViewingBookDetailsId,
  setIsAddBookLinkOpen,
  onEditBook,
  setSharingBook,
  setIsShareModalOpen,
  communityBooks,
  onAddCategory,
  onEditCategory,
  onDeleteCategory,
  confirm,
  orgId,
  userUid
}) => {
  const books = useNexusStore(state => state.books);
  const setBooks = useNexusStore(state => state.setBooks);
  const bookCategories = useNexusStore(state => state.bookCategories);
  const addBookCategory = useNexusStore(state => state.addBookCategory);
  const publishToCommunityAction = useNexusStore(state => state.publishToCommunity);
  const removeFromCommunityAction = useNexusStore(state => (state as any).removeFromCommunity);
  
  const toggleFavorite = useNexusStore(state => state.toggleFavorite);
  const updateBookStatus = useNexusStore(state => state.updateBookStatus);
  const updateReadingProgress = useNexusStore(state => state.updateReadingProgress);
  const updateBookDetails = useNexusStore(state => state.updateBookDetails);
  const deleteBookAction = useNexusStore(state => state.deleteBook);
  const addBookAction = useNexusStore(state => state.addBook);
  
  const [categoryFilter, setCategoryFilter] = React.useState<string>('all');
  const [statusFilter, setStatusFilter] = React.useState<ReadingStatus | 'all'>('all');
  const [favoriteFilter, setFavoriteFilter] = React.useState(false);
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = React.useState(false);
  const [viewLayout, setViewLayout] = React.useState<'grid' | 'list'>('grid');
  const [viewMode, setViewMode] = React.useState<'grid' | 'alphabetical'>('grid');
  
  const stats = React.useMemo(() => {
    const myBooks = books.filter(b => !b.ownerId || b.ownerId === userUid);
    const totalPages = myBooks.reduce((acc, b) => acc + (b.currentPage || 0), 0);
    const finished = myBooks.filter(b => b.status === 'finished').length;
    const reading = myBooks.filter(b => 
      (b.status === 'reading' && (b.currentPage || 0) > 0) || 
      ((b.currentPage || 0) > 0 && b.status !== 'finished')
    ).length;
    return { total: myBooks.length, totalPages, finished, reading };
  }, [books, userUid]);

  // Currently Reading — Todos os livros em leitura
  const readingBooks = React.useMemo(() => {
    const myBooks = books.filter(b => !b.ownerId || b.ownerId === userUid);
    return myBooks
      .filter(b => b.status === 'reading' && (b.currentPage || 0) > 0 && (b.totalPages || 0) > 0)
      .sort((a, b) => (b.currentPage || 0) - (a.currentPage || 0));
  }, [books, userUid]);

  const handlePublishBook = React.useCallback(async (book: NexusBook) => {
    if (!orgId) return;
    
    const ok = await confirm({
      title: 'Publicar na Comunidade',
      message: 'Deseja tornar este livro disponível para todos na sua organização?',
      confirmText: 'Publicar',
      variant: 'primary'
    });

    if (ok) {
      try {
        await publishToCommunityAction(book, orgId);
        toast.success('Livro publicado na comunidade!');
      } catch (err) {
        toast.error('Erro ao publicar livro');
      }
    }
  }, [orgId, confirm, publishToCommunityAction]);

  const deleteBook = React.useCallback(async (id: string) => {
    const isCommunityView = librarySubTab === 'community';
    
    const ok = await confirm({
      title: isCommunityView ? 'Remover da Comunidade' : 'Remover Livro',
      message: isCommunityView 
        ? 'Deseja remover este livro da estante da comunidade? Isso não afetará sua biblioteca pessoal.'
        : 'Deseja remover este livro da sua biblioteca? O arquivo será mantido no servidor, mas o atalho será apagado.',
      variant: 'danger',
      confirmText: 'Remover'
    });

    if (ok) {
      if (isCommunityView) {
        if (orgId) {
          try {
            await removeFromCommunityAction(id, orgId);
            toast.success('Livro removido da comunidade');
          } catch (err) {
            toast.error('Erro ao remover da comunidade');
          }
        }
      } else {
        await deleteBookAction(id);
        toast.success('Livro removido da sua estante');
      }
    }
  }, [deleteBookAction, confirm, librarySubTab, orgId, removeFromCommunityAction]);

  const updateBookCover = React.useCallback(async (bookId: string) => {
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
  }, [updateBookDetails]);

  const addToMyLibrary = React.useCallback(async (book: NexusBook) => {
    await addBookAction({ 
      ...book, 
      id: crypto.randomUUID(), 
      addedAt: Date.now(), 
      isCommunity: false,
      ownerId: userUid,
      currentPage: 0
    });
    toast.success('Adicionado à sua estante!');
  }, [addBookAction, userUid]);

  let sourceBooks = [];
  if (librarySubTab === 'my') {
    sourceBooks = books.filter(b => !b.sharedBy && !b.isCommunity);
  } else if (librarySubTab === 'shared') {
    sourceBooks = books.filter(b => b.sharedBy);
  } else {
    sourceBooks = communityBooks;
  }

  const filteredBooks = sourceBooks.filter(b => {
    const matchesSearch = b.title.toLowerCase().includes(librarySearchQuery.toLowerCase()) || 
                         b.author?.toLowerCase().includes(librarySearchQuery.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || b.category === categoryFilter;
    const matchesStatus = statusFilter === 'all' || b.status === statusFilter;
    const matchesFavorite = !favoriteFilter || b.isFavorite;
    return matchesSearch && matchesCategory && matchesStatus && matchesFavorite;
  });

  // Agrupamento A-Z se necessário
  const groupedBooks = React.useMemo(() => {
    if (viewMode !== 'alphabetical') return null;
    
    const groups: Record<string, NexusBook[]> = {};
    const sorted = [...filteredBooks].sort((a, b) => a.title.localeCompare(b.title));
    
    sorted.forEach(book => {
      const firstLetter = book.title.charAt(0).toUpperCase();
      const key = /^[A-Z]/.test(firstLetter) ? firstLetter : '#';
      if (!groups[key]) groups[key] = [];
      groups[key].push(book);
    });
    
    return Object.entries(groups).sort(([a], [b]) => {
      if (a === '#') return 1;
      if (b === '#') return -1;
      return a.localeCompare(b);
    });
  }, [filteredBooks, viewMode]);

  const itemsPerPage = 10;
  const totalPagesCount = Math.ceil(filteredBooks.length / itemsPerPage);
  const currentBooks = filteredBooks.slice((libraryPage - 1) * itemsPerPage, libraryPage * itemsPerPage);

  // Mapeamento de cores para os blobs baseado na categoria
  const blobColors: Record<string, string> = {
    'all': 'rgba(100, 100, 255, 0.15)',
    'Ficção': 'rgba(255, 100, 100, 0.15)',
    'Não-Ficção': 'rgba(100, 255, 100, 0.15)',
    'Filosofia': 'rgba(200, 100, 255, 0.15)',
    'Fantasia': 'rgba(255, 200, 100, 0.15)',
    'Tecnologia': 'rgba(0, 200, 255, 0.15)',
    'Negócios & Finanças': 'rgba(100, 150, 100, 0.15)',
  };

  const currentBlobColor = blobColors[categoryFilter] || blobColors['all'];

  return (
    <div className="space-y-8 relative overflow-hidden min-h-[600px] p-1">
      {/* Dynamic Background Blobs - Optimized */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden -z-10">
        <motion.div 
          animate={{ 
            x: [0, 30, -30, 0],
            y: [0, -30, 30, 0],
            backgroundColor: currentBlobColor
          }}
          transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
          className="absolute -top-40 -left-40 w-[600px] h-[600px] blur-[80px] rounded-full opacity-30 will-change-transform"
        />
        <motion.div 
          animate={{ 
            x: [0, -50, 50, 0],
            y: [0, 50, -50, 0],
            backgroundColor: currentBlobColor
          }}
          transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
          className="absolute -bottom-40 -right-40 w-[700px] h-[700px] blur-[100px] rounded-full opacity-20 will-change-transform"
        />
      </div>

      {/* Sub-Navegação da Biblioteca */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="flex bg-white/5 p-1 rounded-2xl border border-white/5 w-fit">
          {[
            { id: 'my', label: 'Minha Estante', icon: 'ph-book' },
            { id: 'shared', label: 'Recomendações', icon: 'ph-share-network' },
            { id: 'community', label: 'Comunidade', icon: 'ph-users-three' },
            { id: 'clubs', label: 'Clubes de Leitura', icon: 'ph-users-four' },
            { id: 'stats', label: 'Estatísticas', icon: 'ph-chart-line-up' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => { setLibrarySubTab(tab.id as any); setLibraryPage(1); }}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                librarySubTab === tab.id 
                ? 'bg-primary-500 text-white shadow-lg' 
                : 'text-gray-500 hover:text-white'
              }`}
            >
              <i className={`ph-bold ${tab.icon}`} />
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex bg-white/5 p-1 rounded-2xl border border-white/5">
          {[
            { id: 'grid', icon: 'ph-squares-four', label: 'Grade' },
            { id: 'list', icon: 'ph-list', label: 'Lista' }
          ].map(l => (
            <button
              key={l.id}
              onClick={() => setViewLayout(l.id as any)}
              className={`p-2 px-3 rounded-xl transition-all flex items-center gap-2 text-[10px] font-black uppercase tracking-widest ${
                viewLayout === l.id ? 'bg-primary-500 text-white shadow-lg' : 'text-gray-500 hover:text-white'
              }`}
            >
              <i className={`ph-bold ${l.icon}`} />
              {l.label}
            </button>
          ))}
        </div>
      </div>

      {/* MINI STATS BAR — PREMIUM */}
      <div className="flex items-center justify-between bg-white/[0.03] border border-white/5 px-6 py-3 rounded-2xl">
        {[
          { label: 'Obras', value: stats.total, icon: 'ph-books', color: 'text-blue-400' },
          { label: 'Páginas', value: stats.totalPages, icon: 'ph-book-open', color: 'text-purple-400' },
          { label: 'Concluídos', value: stats.finished, icon: 'ph-check-circle', color: 'text-emerald-400' },
          { label: 'Lendo', value: stats.reading, icon: 'ph-hourglass', color: 'text-amber-400' }
        ].map((stat, idx) => (
          <React.Fragment key={idx}>
            {idx > 0 && <div className="w-px h-8 bg-white/5" />}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="flex items-center gap-3 group cursor-default"
            >
              <i className={`ph-fill ${stat.icon} ${stat.color} text-lg group-hover:scale-125 transition-transform`} />
              <div className="flex items-baseline gap-1.5">
                <motion.span 
                  key={stat.value}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-lg font-black text-white tabular-nums"
                >
                  {stat.value.toLocaleString('pt-BR')}
                </motion.span>
                <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest">{stat.label}</span>
              </div>
            </motion.div>
          </React.Fragment>
        ))}
      </div>

      {/* HERO — CURRENTLY READING (Carrossel) */}
      {readingBooks.length > 0 && librarySubTab === 'my' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <motion.div 
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="w-2 h-2 rounded-full bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.6)]"
              />
              <span className="text-[10px] font-black text-blue-400 uppercase tracking-[0.3em]">Lendo Agora</span>
              <span className="text-[10px] font-black text-gray-600 uppercase tracking-widest ml-1">{readingBooks.length} {readingBooks.length === 1 ? 'livro' : 'livros'}</span>
            </div>
            {readingBooks.length > 2 && (
              <span className="text-[8px] font-bold text-gray-500 uppercase tracking-widest flex items-center gap-1">
                <i className="ph-bold ph-arrow-left" /> Arraste <i className="ph-bold ph-arrow-right" />
              </span>
            )}
          </div>
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory scrollbar-hide"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {readingBooks.map((book, idx) => {
              const progress = book.totalPages! > 0 
                ? Math.round(((book.currentPage || 0) / book.totalPages!) * 100) 
                : 0;
              const circumference = 2 * Math.PI * 28;
              const strokeDashoffset = circumference - (progress / 100) * circumference;

              return (
                <motion.div
                  key={book.id}
                  initial={{ opacity: 0, x: 30 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  onClick={() => setViewingBookDetailsId(book.id)}
                  className="relative min-w-[320px] md:min-w-[380px] snap-start rounded-2xl overflow-hidden border border-white/10 cursor-pointer group hover:border-white/20 transition-all flex-shrink-0"
                >
                  {/* Blurred Background */}
                  {book.coverUrl && (
                    <div className="absolute inset-0 z-0">
                      <img src={book.coverUrl} alt="" className="w-full h-full object-cover scale-110 blur-[50px] opacity-25" />
                      <div className="absolute inset-0 bg-gradient-to-r from-[#0d0f16]/95 via-[#0d0f16]/85 to-[#0d0f16]/70" />
                    </div>
                  )}

                  <div className="relative z-10 flex items-center gap-5 p-5">
                    {/* Cover */}
                    <motion.div 
                      whileHover={{ scale: 1.08 }}
                      className="w-16 h-22 rounded-lg overflow-hidden border border-white/10 shadow-xl shadow-black/40 shrink-0"
                    >
                      {book.coverUrl ? (
                        <img src={book.coverUrl} alt={book.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-primary-900 to-primary-700 flex items-center justify-center">
                          <i className="ph-duotone ph-book text-2xl text-white/30" />
                        </div>
                      )}
                    </motion.div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-black text-white uppercase tracking-wider truncate">{book.title}</h3>
                      {book.author && (
                        <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mt-0.5 truncate">{book.author}</p>
                      )}
                      <div className="flex items-center gap-3 mt-3">
                        <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest">{book.currentPage}/{book.totalPages}</span>
                        <div className="flex-1 h-1 bg-white/5 rounded-full overflow-hidden">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${progress}%` }}
                            transition={{ delay: 0.3 + idx * 0.1, duration: 0.8, ease: 'easeOut' }}
                            className="h-full bg-gradient-to-r from-blue-500 to-primary-500 rounded-full shadow-[0_0_8px_rgba(100,100,255,0.3)]"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Circular Progress */}
                    <div className="shrink-0">
                      <div className="relative w-14 h-14">
                        <svg className="w-full h-full -rotate-90" viewBox="0 0 64 64">
                          <circle cx="32" cy="32" r="28" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="4" />
                          <motion.circle 
                            cx="32" cy="32" r="28" fill="none" 
                            stroke="url(#heroGrad)" 
                            strokeWidth="4" 
                            strokeLinecap="round"
                            strokeDasharray={circumference}
                            initial={{ strokeDashoffset: circumference }}
                            animate={{ strokeDashoffset }}
                            transition={{ delay: 0.5 + idx * 0.15, duration: 1.2, ease: 'easeOut' }}
                          />
                          <defs>
                            <linearGradient id="heroGrad" x1="0" y1="0" x2="1" y2="1">
                              <stop offset="0%" stopColor="#3b82f6" />
                              <stop offset="100%" stopColor="#6366f1" />
                            </linearGradient>
                          </defs>
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-[11px] font-black text-white">{progress}%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      )}

      {librarySubTab === 'stats' ? (
        <NexusStats />
      ) : librarySubTab === 'clubs' ? (
        <ReadingClubsPanel userUid={userUid} orgId={orgId} />
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex bg-white/5 p-1 rounded-xl border border-white/5">
              <button 
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-primary-500 text-white' : 'text-gray-500 hover:text-white'}`}
                title="Visualização em Grade"
              >
                <i className="ph-bold ph-squares-four" />
              </button>
              <button 
                onClick={() => setViewMode('alphabetical')}
                className={`p-2 rounded-lg transition-all ${viewMode === 'alphabetical' ? 'bg-primary-500 text-white' : 'text-gray-500 hover:text-white'}`}
                title="Agrupamento A-Z"
              >
                <i className="ph-bold ph-sort-ascending" />
              </button>
            </div>

                        {/* Filtro de Status Segmentado */}
            <div className="flex bg-white/5 p-1 rounded-2xl border border-white/5 gap-1 shadow-inner shadow-black/40">
              {[
                { id: 'all', label: 'Todos', icon: 'ph-circles-three' },
                { id: 'reading', label: 'Lendo Agora', icon: 'ph-book-open' },
                { id: 'finished', label: 'Finalizados', icon: 'ph-check-circle' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setStatusFilter(tab.id as any)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${
                    statusFilter === tab.id 
                      ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/20' 
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <i className={`ph-bold ${tab.icon}`} />
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>

            {/* Toggle Favoritos */}
            <button
              onClick={() => setFavoriteFilter(!favoriteFilter)}
              className={`px-4 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 border transition-all ${
                favoriteFilter 
                ? 'bg-amber-500/10 border-amber-500/50 text-amber-400' 
                : 'bg-white/5 border-white/10 text-gray-500 hover:text-white'
              }`}
            >
              <i className={`ph-bold ${favoriteFilter ? 'ph-star-fill' : 'ph-star'}`} />
              Favoritos
            </button>

            <div className="relative">
              <button
                onClick={() => setIsFilterDropdownOpen(!isFilterDropdownOpen)}
                className="bg-white/5 border border-white/10 rounded-2xl px-6 py-3 text-[10px] font-black uppercase tracking-widest text-white flex items-center gap-3 hover:border-white/20 transition-all min-w-[180px] justify-between"
              >
                <span>{categoryFilter === 'all' ? 'Todas Categorias' : categoryFilter}</span>
                <i className={`ph-bold ph-caret-down transition-transform ${isFilterDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              <AnimatePresence>
                {isFilterDropdownOpen && (
                  <>
                    <div className="fixed inset-0 z-[40]" onClick={() => setIsFilterDropdownOpen(false)} />
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute top-full left-0 mt-2 w-full bg-[#0d0f16] border border-white/10 rounded-2xl shadow-2xl z-[50] overflow-hidden"
                    >
                      <div className="max-h-[240px] overflow-y-auto custom-scrollbar p-2">
                        <button
                          onClick={() => { setCategoryFilter('all'); setIsFilterDropdownOpen(false); }}
                          className={`w-full text-left px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${categoryFilter === 'all' ? 'bg-primary-500 text-white' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}
                        >
                          Todas Categorias
                        </button>
                        {bookCategories.map(cat => (
                          <div key={cat} className="group relative flex items-center">
                            <button
                              onClick={() => { setCategoryFilter(cat); setIsFilterDropdownOpen(false); }}
                              className={`flex-1 text-left px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${categoryFilter === cat ? 'bg-primary-500 text-white' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}
                            >
                              {cat}
                            </button>
                            <div className="absolute right-2 opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-all">
                              <button 
                                onClick={(e) => { e.stopPropagation(); onEditCategory(cat); setIsFilterDropdownOpen(false); }}
                                className="p-1.5 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-all"
                              >
                                <i className="ph-bold ph-pencil-simple" />
                              </button>
                              <button 
                                onClick={(e) => { e.stopPropagation(); onDeleteCategory(cat); setIsFilterDropdownOpen(false); }}
                                className="p-1.5 hover:bg-red-500/10 rounded-lg text-gray-400 hover:text-red-400 transition-all"
                              >
                                <i className="ph-bold ph-trash" />
                              </button>
                            </div>
                          </div>
                        ))}
                        <div className="h-px bg-white/5 my-2" />
                        <button
                          onClick={onAddCategory}
                          className="w-full text-left px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest text-primary-400 hover:bg-primary-500/10 transition-all flex items-center gap-2"
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

            <div className="relative flex-1 sm:w-64">
              <i className="ph-bold ph-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
              <input 
                placeholder="Buscar por título ou autor..."
                value={librarySearchQuery}
                onChange={(e) => { setLibrarySearchQuery(e.target.value); setLibraryPage(1); }}
                className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-4 py-3 text-sm text-white focus:border-primary-500 transition-all outline-none"
              />
            </div>
            <button 
              onClick={() => setIsAddBookLinkOpen(true)}
              className="flex items-center gap-3 px-6 py-3 bg-primary-500 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:scale-105 transition-all shadow-xl shadow-primary-500/20"
            >
              <i className="ph-bold ph-plus" />
              <span className="hidden sm:inline">Catalogar</span>
            </button>
          </div>

          {filteredBooks.length === 0 ? (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="py-32 bg-white/[0.02] border border-dashed border-white/5 rounded-[4rem] flex flex-col items-center justify-center text-center px-10 group"
            >
              <div className="relative mb-8">
                <motion.div 
                  animate={{ rotate: 360 }}
                  transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                  className="w-32 h-32 rounded-full border-2 border-dashed border-primary-500/20"
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <i className="ph-duotone ph-book-open text-7xl text-primary-500/30 group-hover:text-primary-500/50 transition-colors duration-500" />
                </div>
                <motion.div 
                  animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] }}
                  transition={{ duration: 4, repeat: Infinity }}
                  className="absolute -inset-4 bg-primary-500/5 blur-2xl rounded-full"
                />
              </div>
              <h3 className="text-xl font-black text-white/40 uppercase tracking-[0.3em] mb-3">Sua Estante está em branco</h3>
              <p className="text-xs text-gray-600 font-bold uppercase tracking-widest max-w-md leading-relaxed">
                Nenhum livro encontrado para os filtros atuais. <br/>
                Experimente mudar a categoria ou limpar sua busca.
              </p>
              <button 
                onClick={() => { setLibrarySearchQuery(''); setCategoryFilter('all'); }}
                className="mt-8 px-8 py-3 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-white hover:bg-white/10 transition-all"
              >
                Limpar Filtros
              </button>
            </motion.div>
          ) : (
            <div className="space-y-10">
              {viewLayout === 'list' ? (
                <div className="flex flex-col gap-4">
                  {currentBooks.map((book, idx) => (
                      <ListViewItem 
                        key={book.id}
                        book={book}
                        onView={setViewingBookDetailsId}
                        onToggleFavorite={toggleFavorite}
                        onUpdateProgress={updateReadingProgress}
                        isOwner={librarySubTab === 'my' || (librarySubTab === 'community' && (book as any).ownerId === userUid)}
                      />
                  ))}
                </div>
              ) : viewMode === 'alphabetical' && groupedBooks ? (
                <div className="space-y-12">
                  {groupedBooks.map(([letter, groupBooks]) => (
                    <div key={letter} className="space-y-6">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-primary-500/10 border border-primary-500/20 flex items-center justify-center text-xl font-black text-primary-500">
                          {letter}
                        </div>
                        <div className="h-px flex-1 bg-gradient-to-r from-white/10 to-transparent" />
                      </div>
                      <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 * groupedBooks.indexOf([letter, groupBooks]) }}
                        className="grid grid-cols-2 md:grid-cols-5 gap-8"
                      >
                        {groupBooks.map(book => (
                          <BookCard 
                            key={book.id}
                            book={book}
                            onView={setViewingBookDetailsId}
                            onShare={(b) => { setSharingBook(b); setIsShareModalOpen(true); }}
                            onPublish={handlePublishBook}
                            onUpdateCover={updateBookCover}
                            onEdit={onEditBook!}
                            onDelete={deleteBook}
                            onAddToLibrary={addToMyLibrary}
                            onToggleFavorite={toggleFavorite}
                            onUpdateProgress={updateReadingProgress}
                            isOwner={librarySubTab === 'my' || (librarySubTab === 'community' && (book as any).ownerId === userUid)}
                            isInLibrary={books.some(b => b.id === book.id || (book.pdfUrl && b.pdfUrl === book.pdfUrl))}
                          />
                        ))}
                      </motion.div>
                    </div>
                  ))}
                </div>
              ) : (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="space-y-0"
                >
                  {/* Render livros em fileiras de 5 com prateleiras */}
                  {Array.from({ length: Math.ceil(currentBooks.length / 5) }).map((_, rowIdx) => {
                    const rowBooks = currentBooks.slice(rowIdx * 5, (rowIdx + 1) * 5);
                    return (
                      <div key={rowIdx} className="relative">
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 pb-3">
                          {rowBooks.map((book, idx) => (
                            <motion.div
                              key={book.id}
                              initial={{ opacity: 0, scale: 0.9, y: 20 }}
                              animate={{ opacity: 1, scale: 1, y: 0 }}
                              transition={{ delay: (rowIdx * 5 + idx) * 0.05 }}
                            >
                              <BookCard 
                                book={book}
                                onView={setViewingBookDetailsId}
                                onShare={(b) => { setSharingBook(b); setIsShareModalOpen(true); }}
                                onPublish={handlePublishBook}
                                onUpdateCover={updateBookCover}
                                onEdit={onEditBook!}
                                onDelete={deleteBook}
                                onAddToLibrary={addToMyLibrary}
                                onToggleFavorite={toggleFavorite}
                                onUpdateProgress={updateReadingProgress}
                                isOwner={librarySubTab === 'my' || (librarySubTab === 'community' && (book as any).ownerId === userUid)}
                                isInLibrary={books.some(b => b.id === book.id || (book.pdfUrl && b.pdfUrl === book.pdfUrl))}
                              />
                            </motion.div>
                          ))}
                        </div>
                        {/* Prateleira Visual */}
                        <div className="relative h-4 -mt-1 mb-6">
                          <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-transparent via-white/[0.08] to-transparent rounded-full" />
                          <div className="absolute inset-x-[5%] top-[3px] h-[6px] bg-gradient-to-b from-white/[0.04] to-transparent rounded-b-lg" />
                          <div className="absolute inset-x-[10%] top-[3px] h-[2px] bg-gradient-to-r from-transparent via-primary-500/10 to-transparent blur-sm" />
                        </div>
                      </div>
                    );
                  })}
                </motion.div>
              )}

              {/* Paginação */}
              {totalPagesCount > 1 && (
                <div className="flex items-center justify-center gap-4 pt-8">
                  <button 
                    disabled={libraryPage === 1}
                    onClick={() => setLibraryPage(p => p - 1)}
                    className="p-3 bg-white/5 border border-white/10 rounded-xl text-gray-400 hover:text-white disabled:opacity-30 transition-all"
                  >
                    <i className="ph-bold ph-caret-left" />
                  </button>
                  <div className="flex items-center gap-2">
                    {Array.from({ length: totalPagesCount }).map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setLibraryPage(i + 1)}
                        className={`w-10 h-10 rounded-xl text-xs font-black transition-all ${
                          libraryPage === i + 1 
                          ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/20' 
                          : 'bg-white/5 text-gray-500 hover:text-white hover:bg-white/10'
                        }`}
                      >
                        {i + 1}
                      </button>
                    ))}
                  </div>
                  <button 
                    disabled={libraryPage === totalPagesCount}
                    onClick={() => setLibraryPage(p => p + 1)}
                    className="p-3 bg-white/5 border border-white/10 rounded-xl text-gray-400 hover:text-white disabled:opacity-30 transition-all"
                  >
                    <i className="ph-bold ph-caret-right" />
                  </button>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};
