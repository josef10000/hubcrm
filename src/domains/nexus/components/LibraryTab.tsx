import React from 'react';
import { useNexusStore } from '@store/useNexusStore';
import type { NexusBook } from '@store/useNexusStore';
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
  confirm: (options: any) => Promise<boolean>;
  orgId: string | undefined;
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
  isOwner: boolean;
  isInLibrary: boolean;
}) => (
  <div className="group relative">
    <div 
      onClick={() => onView(book.id)}
      className="aspect-[3/4] bg-white/5 rounded-2xl overflow-hidden border border-white/10 hover:border-primary-500/50 transition-all cursor-pointer shadow-xl relative"
    >
      {/* Progress Indicator */}
      {(book.totalPages && book.totalPages > 0) ? (
        <div className="absolute top-3 left-3 px-2 py-1 bg-black/60 backdrop-blur-md rounded-lg border border-white/10 z-10">
          <div className="flex flex-col gap-1">
            <span className="text-[8px] font-black text-white/70 uppercase leading-none">
              {Math.round(((book.currentPage || 0) / book.totalPages) * 100)}% Lido
            </span>
            <span className="text-[7px] font-bold text-gray-500 uppercase leading-none mt-0.5">
              Pág. {book.currentPage || 0} de {book.totalPages}
            </span>
          </div>
        </div>
      ) : null}

      <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-all duration-500" />
      {book.coverUrl ? (
        <img src={book.coverUrl} alt={book.title} className="w-full h-full object-cover transition-transform group-hover:scale-110" loading="lazy" />
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center gap-4 opacity-30">
          <i className="ph-duotone ph-book text-5xl" />
          <span className="text-[10px] font-bold uppercase tracking-widest leading-tight">{book.title}</span>
        </div>
      )}
      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
         <div className="w-12 h-12 bg-primary-500 rounded-full flex items-center justify-center text-white text-xl shadow-xl shadow-primary-500/40">
           <i className="ph-bold ph-play" />
         </div>
      </div>
    </div>
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
        <button onClick={(e) => { e.stopPropagation(); onDelete(book.id); }} className="p-1.5 hover:text-rose-400 transition-all" title="Excluir"><i className="ph-bold ph-trash" /></button>
      </div>
    </div>
  </div>
));

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
  confirm,
  orgId
}) => {
  const books = useNexusStore(state => state.books);
  const setBooks = useNexusStore(state => state.setBooks);
  const publishToCommunityAction = useNexusStore(state => state.publishToCommunity);
  
  const [categoryFilter, setCategoryFilter] = React.useState<string>('all');
  const [viewMode, setViewMode] = React.useState<'grid' | 'alphabetical'>('grid');
  
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
    const ok = await confirm({
      title: 'Remover Livro',
      message: 'Deseja remover este livro da sua biblioteca? O arquivo será mantido no servidor, mas o atalho será apagado.',
      variant: 'danger',
      confirmText: 'Remover'
    });
    if (ok) {
      setBooks(books.filter(b => b.id !== id));
      toast.success('Livro removido');
    }
  }, [books, setBooks, confirm]);

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
        setBooks(books.map(b => b.id === bookId ? { ...b, coverUrl: url } : b));
        toast.dismiss();
        toast.success('Capa atualizada!');
      } catch (err) {
        toast.dismiss();
        toast.error('Erro ao fazer upload da capa');
      }
    };
    input.click();
  }, [books, setBooks]);

  const addToMyLibrary = React.useCallback((book: NexusBook) => {
    setBooks([...books, { ...book, id: Date.now().toString(), addedAt: Date.now(), isCommunity: false }]);
    toast.success('Adicionado à sua estante!');
  }, [books, setBooks]);

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
    return matchesSearch && matchesCategory;
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

  return (
    <div className="space-y-8">
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

          <select 
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-[10px] font-black uppercase tracking-widest text-white outline-none focus:border-primary-500 appearance-none cursor-pointer min-w-[140px]"
          >
            <option value="all">Todas Categorias</option>
            {Array.from(new Set(sourceBooks.map(b => b.category).filter(Boolean))).sort().map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>

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
        <div className="py-20 bg-white/[0.02] border border-dashed border-white/10 rounded-[3rem] flex flex-col items-center justify-center opacity-30">
          <i className="ph-duotone ph-magnifying-glass text-6xl mb-4" />
          <p className="text-sm font-bold uppercase tracking-widest">Nenhum livro encontrado</p>
        </div>
      ) : (
        <div className="space-y-10">
          {viewMode === 'alphabetical' && groupedBooks ? (
            <div className="space-y-12">
              {groupedBooks.map(([letter, groupBooks]) => (
                <div key={letter} className="space-y-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-primary-500/10 border border-primary-500/20 flex items-center justify-center text-xl font-black text-primary-500">
                      {letter}
                    </div>
                    <div className="h-px flex-1 bg-gradient-to-r from-white/10 to-transparent" />
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
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
                        isOwner={librarySubTab === 'my'}
                        isInLibrary={books.some(b => b.pdfUrl === book.pdfUrl)}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
              {currentBooks.map(book => (
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
                  isOwner={librarySubTab === 'my'}
                  isInLibrary={books.some(b => b.pdfUrl === book.pdfUrl)}
                />
              ))}
            </div>
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
