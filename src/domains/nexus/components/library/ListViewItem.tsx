import React from 'react';
import { motion } from 'framer-motion';
import { useNexusStore } from '@store/useNexusStore';
import type { NexusBook } from '@store/useNexusStore';
import { NEON_AURA_MAP } from './BookCard';

export interface ListViewItemProps {
  book: NexusBook;
  onView: (id: string) => void;
  onToggleFavorite: (id: string) => void;
  onUpdateProgress: (id: string, page: number) => void;
  isOwner: boolean;
}

export const ListViewItem = React.memo(({ 
  book, 
  onView, 
  onToggleFavorite,
  onUpdateProgress,
  isOwner 
}: ListViewItemProps) => {
  const learningPaths = useNexusStore(state => state.learningPaths || []);
  const userPathsProgress = useNexusStore(state => state.userPathsProgress || {});

  const activeNeonColor = (() => {
    // 1. Se o próprio livro já tem um neon ativo associado a uma trilha na estante pessoal
    if (book.learningPathId && book.neonColor) {
      const progress = userPathsProgress[book.learningPathId];
      if (progress && progress.status === 'ACTIVE') {
        return book.neonColor;
      }
      return null;
    }
    
    // 2. Se o livro está na comunidade (ou recomendação), busca se o originalBookId (ou id) faz parte de alguma trilha ativa do usuário logado
    const bookOriginalId = book.originalBookId || book.id;
    const activePath = learningPaths.find(path => {
      const progress = userPathsProgress[path.id];
      return progress && progress.status === 'ACTIVE' && path.bookIds.includes(bookOriginalId);
    });
    
    return activePath ? activePath.neonColor : null;
  })();

  const aura = activeNeonColor && NEON_AURA_MAP[activeNeonColor] ? NEON_AURA_MAP[activeNeonColor] : null;

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
      <div className={`w-12 h-16 rounded-lg overflow-hidden shrink-0 shadow-lg transition-all ${
        aura ? `${aura.border} border-2` : 'bg-white/5 border border-white/10'
      }`}>
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

ListViewItem.displayName = 'ListViewItem';
