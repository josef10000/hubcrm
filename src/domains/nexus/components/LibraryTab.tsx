import React from 'react';
import { useNexusStore } from '@store/useNexusStore';
import { motion, AnimatePresence } from 'framer-motion';
import type { NexusBook, ReadingStatus } from '@store/useNexusStore';
import { toast } from 'sonner';
import { uploadToCloudinary } from '@/lib/cloudinary';

interface LibraryTabProps {
  librarySubTab: 'my' | 'shared' | 'community';
  setLibrarySubTab: (tab: 'my' | 'shared' | 'community') => void;
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
  userUid: string | undefined;
}

// Componente de Card Memoizado para evitar re-renderizações inúteis
const BookCard = React.memo(({ 
  book, 
  onView, 
  onShare, 
  onPublish, 
  onUpdateCover, 
  onEdit,
  onDelete, 
  onAddToLibrary,
  onToggleFavorite,
  isOwner,
  isInLibrary
}: { 
  book: NexusBook; 
  onView: (id: string) => void;
  onShare: (book: NexusBook) => void;
  onPublish: (book: NexusBook) => void;
  onUpdateCover: (id: string) => void;
  onEdit: (book: NexusBook) => void;
  onDelete: (id: string) => void;
  onAddToLibrary: (book: NexusBook) => void;
  onToggleFavorite: (id: string) => void;
  isOwner: boolean;
  isInLibrary: boolean;
}) => {
  const progress = (book.totalPages && book.totalPages > 0) 
    ? Math.min(Math.round(((book.currentPage || 0) / book.totalPages) * 100), 100)
    : 0;

  const statusColors = {
    reading: 'bg-blue-500',
    want_to_read: 'bg-amber-500',
    finished: 'bg-emerald-500',
    dropped: 'bg-rose-500'
  };

  const statusLabels = {
    reading: 'Lendo',
    want_to_read: 'Quero Ler',
    finished: 'Lido',
    dropped: 'Parado'
  };

  return (
    <div className="group relative will-change-transform">
      <motion.div 
        onClick={() => onView(book.id)}
        whileHover={{ 
          rotateY: 10, 
          rotateX: -5, 
          scale: 1.02,
          z: 50
        }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
        className="aspect-[3/4] bg-white/5 rounded-2xl overflow-hidden border border-white/10 hover:border-primary-500/50 transition-all cursor-pointer shadow-2xl relative perspective-1000 group-hover:shadow-primary-500/10"
        style={{ transformStyle: 'preserve-3d' }}
      >
        {/* Glossy Overlay */}
        <div className="absolute inset-0 bg-gradient-to-tr from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20" />
        
        {/* Category Badge */}
        {book.category && (
          <div className="absolute top-3 right-3 px-2 py-1 bg-primary-500/80 backdrop-blur-md rounded-lg text-[7px] font-black text-white uppercase tracking-tighter z-30 shadow-lg">
            {book.category}
          </div>
        )}

        {/* Favorite Button */}
        <button
          onClick={(e) => { e.stopPropagation(); onToggleFavorite(book.id); }}
          className={`absolute top-3 left-3 p-1.5 rounded-lg z-30 transition-all ${
            book.isFavorite ? 'bg-amber-500 text-white shadow-lg' : 'bg-black/40 text-white/40 hover:bg-black/60 hover:text-white'
          }`}
        >
          <i className={`ph-bold ${book.isFavorite ? 'ph-star-fill' : 'ph-star'}`} />
        </button>

        {/* Status Badge */}
        {book.status && (
          <div className={`absolute bottom-3 left-3 px-2 py-1 ${statusColors[book.status]} rounded-lg text-[7px] font-black text-white uppercase tracking-widest z-30 shadow-lg`}>
            {statusLabels[book.status]}
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-all duration-500 z-10" />
        
        {book.coverUrl ? (
          <img 
            src={book.coverUrl} 
            alt={book.title} 
            className="w-full h-full object-cover transition-transform group-hover:scale-105" 
            loading="lazy" 
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center gap-4 bg-gradient-to-br from-white/5 to-white/[0.02]">
            <i className="ph-duotone ph-book text-5xl text-primary-500/40" />
            <span className="text-[10px] font-bold uppercase tracking-widest leading-tight opacity-40">{book.title}</span>
          </div>
        )}
        
        {/* Progress Bar (Visual) */}
        {progress > 0 && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/10 z-30">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              className={`h-full ${progress === 100 ? 'bg-emerald-500' : 'bg-primary-500'}`} 
            />
          </div>
        )}

        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4 z-20">
           <motion.div 
             initial={{ scale: 0.5, opacity: 0 }}
             whileHover={{ scale: 1.1 }}
             animate={{ scale: 1, opacity: 1 }}
             className="w-12 h-12 bg-primary-500 rounded-full flex items-center justify-center text-white text-xl shadow-xl shadow-primary-500/40"
           >
             <i className="ph-bold ph-play" />
           </motion.div>
        </div>

        {/* Subtle Reflection */}
        <div className="absolute -bottom-1/2 left-0 right-0 h-1/2 bg-gradient-to-t from-white/5 to-transparent opacity-20 pointer-events-none" />
      </motion.div>
      <div className="mt-3 px-1 flex justify-between items-start">
        <div className="min-w-0">
          <h4 className="text-xs font-black text-white truncate uppercase tracking-widest leading-none">{book.title}</h4>
          <p className="text-[9px] font-medium text-gray-500 uppercase mt-1">
            {book.sharedBy ? `Enviado por ${book.sharedBy.name}` : book.isCommunity ? 'Comunidade' : 'Documento PDF'}
          </p>
        </div>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity items-center">
          {isOwner && (
            <>
              <button onClick={(e) => { e.stopPropagation(); onEdit(book); }} className="p-1.5 hover:text-primary-400 transition-all" title="Editar Metadados"><i className="ph-bold ph-pencil-simple" /></button>
            <button onClick={(e) => { e.stopPropagation(); onShare(book); }} className="p-1.5 hover:text-primary-400 transition-all" title="Compartilhar"><i className="ph-bold ph-paper-plane-tilt" /></button>
            <button onClick={(e) => { e.stopPropagation(); onPublish(book); }} className={`p-1.5 transition-all ${book.isCommunity ? 'text-primary-400' : 'hover:text-primary-400'}`} title="Publicar na Comunidade"><i className="ph-bold ph-users-three" /></button>
            <button onClick={(e) => { e.stopPropagation(); onUpdateCover(book.id); }} className="p-1.5 hover:text-primary-400 transition-all" title="Alterar Capa"><i className="ph-bold ph-image" /></button>
          </>
        )}
        {!isOwner && !isInLibrary && (
          <button onClick={(e) => { e.stopPropagation(); onAddToLibrary(book); }} className="p-1.5 hover:text-primary-400 transition-all" title="Adicionar à minha estante"><i className="ph-bold ph-plus-circle" /></button>
        )}
        <button onClick={(e) => { e.stopPropagation(); onDelete(book.id); }} className="p-1.5 hover:text-rose-400 transition-all" title={isOwner && book.isCommunity ? "Remover da Comunidade" : "Excluir"}><i className="ph-bold ph-trash" /></button>
      </div>
    </div>
  </div>
));

const ListViewItem = React.memo(({ 
  book, 
  onView, 
  onToggleFavorite,
  isOwner 
}: { 
  book: NexusBook; 
  onView: (id: string) => void;
  onToggleFavorite: (id: string) => void;
  isOwner: boolean;
}) => {
  const progress = (book.totalPages && book.totalPages > 0) 
    ? Math.min(Math.round(((book.currentPage || 0) / book.totalPages) * 100), 100)
    : 0;

  return (
    <motion.div 
      onClick={() => onView(book.id)}
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className="group bg-white/5 border border-white/5 p-4 rounded-2xl flex items-center gap-6 hover:bg-white/10 transition-all cursor-pointer"
    >
      <div className="w-12 h-16 rounded-lg overflow-hidden bg-white/5 border border-white/10 shrink-0 shadow-lg">
        {book.coverUrl ? (
          <img src={book.coverUrl} className="w-full h-full object-cover transition-transform group-hover:scale-110" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <i className="ph ph-book text-xl opacity-20" />
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-3">
          <h4 className="text-sm font-black text-white truncate uppercase tracking-widest leading-none">{book.title}</h4>
          {book.isFavorite && <i className="ph-fill ph-star text-amber-400 text-xs" />}
        </div>
        <div className="flex items-center gap-3 mt-2">
          <span className="px-2 py-0.5 bg-primary-500/10 rounded-md text-[8px] font-black text-primary-400 uppercase tracking-tighter">
            {book.category || 'Geral'}
          </span>
          <span className="w-1 h-1 rounded-full bg-white/10" />
          <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">{book.author || 'Autor Desconhecido'}</span>
        </div>
      </div>

      <div className="hidden md:flex flex-col items-end gap-2 w-48 shrink-0">
        <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            className={`h-full ${progress === 100 ? 'bg-emerald-500' : 'bg-primary-500 shadow-[0_0_10px_rgba(100,100,255,0.5)]'}`}
          />
        </div>
        <div className="flex justify-between w-full">
          <span className="text-[8px] font-black text-gray-600 uppercase tracking-widest">{progress}% Lido</span>
          <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Pág. {book.currentPage || 0}/{book.totalPages || '?'}</span>
        </div>
      </div>

      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={(e) => { e.stopPropagation(); onToggleFavorite(book.id); }}
          className={`p-2 rounded-xl transition-all ${book.isFavorite ? 'text-amber-400 bg-amber-400/10 shadow-inner' : 'text-gray-500 hover:text-white hover:bg-white/5'}`}
          title={book.isFavorite ? 'Remover dos Favoritos' : 'Favoritar'}
        >
          <i className={`ph-bold ${book.isFavorite ? 'ph-star-fill' : 'ph-star'}`} />
        </button>
        <button className="p-2 rounded-xl bg-primary-500 text-white shadow-lg shadow-primary-500/20 hover:scale-110 transition-all active:scale-95">
          <i className="ph-bold ph-play" />
        </button>
      </div>
    </motion.div>
  );
});

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
    const myBooks = books.filter(b => b.ownerId === userUid || !b.ownerId);
    const totalPages = myBooks.reduce((acc, b) => acc + (b.currentPage || 0), 0);
    const finished = myBooks.filter(b => b.status === 'finished').length;
    const reading = myBooks.filter(b => b.status === 'reading').length;
    return { total: myBooks.length, totalPages, finished, reading };
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
    await addBookAction({ ...book, id: Date.now().toString(), addedAt: Date.now(), isCommunity: false });
    toast.success('Adicionado à sua estante!');
  }, [addBookAction]);

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
            { id: 'community', label: 'Comunidade', icon: 'ph-users-three' }
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

      {/* DASHBOARD DE ANALYTICS — PREMIUM */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total de Obras', value: stats.total, icon: 'ph-books', color: 'text-blue-400' },
          { label: 'Páginas Lidas', value: stats.totalPages, icon: 'ph-book-open', color: 'text-purple-400' },
          { label: 'Concluídos', value: stats.finished, icon: 'ph-check-circle', color: 'text-emerald-400' },
          { label: 'Lendo Agora', value: stats.reading, icon: 'ph-hourglass', color: 'text-amber-400' }
        ].map((stat, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="bg-white/5 border border-white/5 p-4 rounded-3xl flex items-center gap-4 hover:bg-white/10 transition-all cursor-default group"
          >
            <div className={`p-3 rounded-2xl bg-white/5 ${stat.color} group-hover:scale-110 transition-all`}>
              <i className={`ph-bold ${stat.icon} text-xl`} />
            </div>
            <div>
              <div className="text-[10px] font-black uppercase tracking-widest text-gray-500">{stat.label}</div>
              <div className="text-xl font-black text-white">{stat.value}</div>
            </div>
          </motion.div>
        ))}
      </div>

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

        {/* Filtro de Status */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as any)}
          className="bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-[10px] font-black uppercase tracking-widest text-white outline-none hover:border-white/20 transition-all cursor-pointer"
        >
          <option value="all" className="bg-[#0d0f16]">Todos Status</option>
          <option value="reading" className="bg-[#0d0f16]">Lendo Agora</option>
          <option value="want_to_read" className="bg-[#0d0f16]">Quero Ler</option>
          <option value="finished" className="bg-[#0d0f16]">Finalizados</option>
          <option value="dropped" className="bg-[#0d0f16]">Abandonados</option>
        </select>

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
                        isOwner={librarySubTab === 'my' || (librarySubTab === 'community' && (book as any).ownerId === userUid)}
                        isInLibrary={books.some(b => b.pdfUrl === book.pdfUrl)}
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
              className="grid grid-cols-2 md:grid-cols-5 gap-8"
            >
              {currentBooks.map((book, idx) => (
                <motion.div
                  key={book.id}
                  initial={{ opacity: 0, scale: 0.9, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
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
                    isOwner={librarySubTab === 'my' || (librarySubTab === 'community' && (book as any).ownerId === userUid)}
                    isInLibrary={books.some(b => b.pdfUrl === book.pdfUrl)}
                  />
                </motion.div>
              ))}
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
    </div>
  );
};
