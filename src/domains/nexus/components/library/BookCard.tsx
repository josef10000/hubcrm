import React from 'react';
import { motion, useMotionValue, useTransform, useSpring } from 'framer-motion';
import { useNexusStore } from '@store/useNexusStore';
import type { NexusBook } from '@store/useNexusStore';
import { Book } from '@/shared/components/Book';

export interface BookCardProps {
  book: NexusBook;
  onView: (id: string) => void;
  onShare: (book: NexusBook) => void;
  onPublish: (book: NexusBook) => void;
  onUpdateCover: (id: string) => void;
  onEdit: (book: NexusBook) => void;
  onDelete: (id: string) => void;
  onAddToLibrary: (book: NexusBook) => void;
  onToggleFavorite: (id: string) => void;
  onUpdateProgress: (id: string, page: number) => void;
  isOwner: boolean;
  isInLibrary: boolean;
}

export const NEON_AURA_MAP: Record<string, { gradient: string; glow: string; border: string }> = {
  'acid-lime': {
    gradient: 'from-lime-400 to-emerald-500',
    glow: 'shadow-[0_0_25px_rgba(163,230,53,0.55)]',
    border: 'border-lime-400 shadow-[0_0_15px_rgba(163,230,53,0.65)]'
  },
  'cyberpunk-pink': {
    gradient: 'from-pink-500 to-rose-600',
    glow: 'shadow-[0_0_25px_rgba(244,63,94,0.55)]',
    border: 'border-pink-500 shadow-[0_0_15px_rgba(244,63,94,0.65)]'
  },
  'cobalt-wave': {
    gradient: 'from-blue-500 to-indigo-600',
    glow: 'shadow-[0_0_25px_rgba(59,130,246,0.55)]',
    border: 'border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.65)]'
  },
  'amber-gold': {
    gradient: 'from-amber-400 to-orange-500',
    glow: 'shadow-[0_0_25px_rgba(245,158,11,0.55)]',
    border: 'border-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.65)]'
  },
  'purple-haze': {
    gradient: 'from-purple-500 to-violet-600',
    glow: 'shadow-[0_0_25px_rgba(168,85,247,0.55)]',
    border: 'border-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.65)]'
  },
  'crimson-pulse': {
    gradient: 'from-red-500 to-rose-700',
    glow: 'shadow-[0_0_25px_rgba(239,68,68,0.55)]',
    border: 'border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.65)]'
  }
};

// Componente de Card Memoizado para evitar re-renderizações inúteis
export const BookCard = React.memo(({ 
  book, 
  onView, 
  onShare, 
  onPublish, 
  onUpdateCover, 
  onEdit,
  onDelete, 
  onAddToLibrary,
  onToggleFavorite,
  onUpdateProgress,
  isOwner,
  isInLibrary
}: BookCardProps) => {
  const animationMode = useNexusStore(state => state.bookAnimationMode || 'new');
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const mouseXSpring = useSpring(x);
  const mouseYSpring = useSpring(y);

  const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], ["15deg", "-15deg"]);
  const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], ["-15deg", "15deg"]);

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

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const xPct = mouseX / width - 0.5;
    const yPct = mouseY / height - 0.5;
    x.set(xPct);
    y.set(yPct);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

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
  const is3DEnabled = animationMode === 'new' || animationMode === 'fixed_3d';
  const isParallaxEnabled = animationMode === 'parallax_2.5d';

  if (animationMode === 'realist_3d') {
    const bookColor = aura ? 
      (activeNeonColor === 'cyberpunk-pink' ? '#ec4899' :
       activeNeonColor === 'cobalt-wave' ? '#3b82f6' :
       activeNeonColor === 'acid-lime' ? '#84cc16' :
       activeNeonColor === 'amber-gold' ? '#f59e0b' :
       activeNeonColor === 'purple-haze' ? '#a855f7' :
       activeNeonColor === 'crimson-pulse' ? '#ef4444' : '#6b7280')
      : (book.category === 'Tecnologia' ? '#0ea5e9' :
         book.category === 'Filosofia' ? '#8b5cf6' :
         book.category === 'Negócios & Finanças' ? '#10b981' :
         book.category === 'Não-Ficção' ? '#64748b' :
         book.category === 'Fantasia' ? '#f59e0b' :
         book.category === 'Ficção' ? '#ec4899' : '#3b82f6');

    return (
      <div className="group relative">
        <div className="flex justify-center items-center py-4 aspect-[3/4] relative cursor-pointer" onClick={() => onView(book.id)}>
          {aura && (
            <div 
              className={`absolute inset-4 rounded-r-md ${aura.glow} opacity-60 group-hover:opacity-90 transition-all duration-500 animate-pulse -z-10`}
            />
          )}

          <Book
            title={book.title}
            author={book.author}
            pages={book.totalPages || 120}
            color={bookColor}
            bookmark={book.isFavorite}
            bookmarkColor="#fbbf24"
            spineText={book.category}
            variant="default"
            animation="hover"
            className="shadow-2xl"
            illustration={
              book.coverUrl ? (
                <img 
                  src={book.coverUrl} 
                  alt={book.title} 
                  className="w-full h-full object-cover rounded-[3px]" 
                  loading="lazy"
                />
              ) : undefined
            }
          />
          
          <div className="absolute top-4 left-6 flex gap-1.5 z-30 opacity-0 group-hover:opacity-100 transition-opacity">
            {book.format === 'kindle' && (
              <div className="px-1.5 py-0.5 bg-amber-500/80 backdrop-blur-md rounded text-[6.5px] font-black text-white uppercase tracking-wider">
                Kindle
              </div>
            )}
            {book.format === 'physical' && (
              <div className="px-1.5 py-0.5 bg-emerald-500/80 backdrop-blur-md rounded text-[6.5px] font-black text-white uppercase tracking-wider">
                Físico
              </div>
            )}
            {book.format === 'pdf' && (
              <div className="px-1.5 py-0.5 bg-blue-500/80 backdrop-blur-md rounded text-[6.5px] font-black text-white uppercase tracking-wider">
                PDF
              </div>
            )}
          </div>

          {progress > 0 && (
            <div className="absolute bottom-5 left-6 right-6 h-1 bg-white/10 rounded-full overflow-hidden z-30 opacity-80">
              <div 
                className={`h-full ${progress === 100 ? 'bg-emerald-500' : 'bg-primary-500'}`}
                style={{ width: `${progress}%` }}
              />
            </div>
          )}

          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-30 pointer-events-none">
            <div className="w-10 h-10 bg-primary-500 text-white rounded-full flex items-center justify-center text-lg shadow-xl shadow-primary-500/30">
              <i className="ph-bold ph-play" />
            </div>
          </div>
        </div>

        <div className="mt-3 px-1 flex justify-between items-start">
          <div className="min-w-0">
            <h4 className="text-xs font-black text-white truncate uppercase tracking-widest leading-none">{book.title}</h4>
            <p className="text-[9px] font-medium text-gray-500 uppercase mt-1">
              {book.sharedBy ? `Enviado por ${book.sharedBy.name}` : book.isCommunity ? 'Comunidade' : book.format === 'kindle' ? 'Livro Kindle' : book.format === 'physical' ? 'Livro Físico' : 'Documento PDF'}
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
    );
  }

  return (
    <div className="group relative" style={{ perspective: is3DEnabled || isParallaxEnabled ? '1200px' : undefined }}>
      <motion.div 
        onClick={() => onView(book.id)}
        onMouseMove={animationMode === 'new' || isParallaxEnabled ? handleMouseMove : undefined}
        onMouseLeave={animationMode === 'new' || isParallaxEnabled ? handleMouseLeave : undefined}
        style={{ 
          rotateY: animationMode === 'new' || isParallaxEnabled ? rotateY : 0, 
          rotateX: animationMode === 'new' || isParallaxEnabled ? rotateX : 0,
          transformStyle: is3DEnabled || isParallaxEnabled ? 'preserve-3d' : undefined
        }}
        whileHover={
          animationMode === 'fixed_3d' 
            ? { scale: 1.05, rotateY: -25, rotateX: 5 } 
            : animationMode === 'zoom' || animationMode === 'new' || isParallaxEnabled
              ? { scale: 1.05 } 
              : undefined
        }
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
        className="aspect-[3/4] relative cursor-pointer"
      >
        {/* Book Spine (Lombada) - Apenas visível no hover 3D */}
        {is3DEnabled && (
          <div 
            className={`absolute inset-y-0 left-0 w-[30px] bg-gradient-to-r origin-left z-10 rounded-l-sm ${
              aura ? `from-slate-900 to-slate-800 border-l border-t border-b ${aura.border}` : 'from-primary-900 to-primary-700'
            }`}
            style={{ 
              transform: 'rotateY(-90deg)',
              boxShadow: 'inset -5px 0 10px rgba(0,0,0,0.5)'
            }}
          >
            {aura && (
              <div className={`absolute inset-0 bg-gradient-to-r ${aura.gradient} opacity-20`} />
            )}
            <div className="absolute inset-0 bg-white/5 opacity-20" />
          </div>
        )}

        {/* Book Pages (Lado Direito - Miolo) */}
        {is3DEnabled && (
          <div 
            className="absolute inset-y-[2%] right-0 w-[25px] bg-[#fdfbf0] origin-right z-0 rounded-r-sm shadow-inner"
            style={{ 
              transform: 'rotateY(90deg) translateZ(-1px)',
              backgroundImage: 'repeating-linear-gradient(transparent, transparent 1px, rgba(0,0,0,0.05) 1px, rgba(0,0,0,0.05) 2px)'
            }}
          />
        )}

        {/* Bottom Pages (Base) */}
        {is3DEnabled && (
          <div 
            className="absolute inset-x-0 bottom-0 h-[25px] bg-[#fdfbf0] origin-bottom z-0 rounded-b-sm"
            style={{ 
              transform: 'rotateX(-90deg)',
              backgroundImage: 'repeating-linear-gradient(90deg, transparent, transparent 1px, rgba(0,0,0,0.05) 1px, rgba(0,0,0,0.05) 2px)'
            }}
          />
        )}

        {/* Neon Glow Pulsante de Fundo (Apenas para livros vinculados à trilha ativa) */}
        {aura && (
          <div 
            className={`absolute inset-0 rounded-r-sm ${aura.glow} opacity-70 group-hover:opacity-100 transition-opacity duration-500 animate-pulse`}
            style={{ 
              transform: is3DEnabled ? 'translateZ(23px)' : isParallaxEnabled ? 'translateZ(13px)' : undefined,
              zIndex: 15
            }}
          />
        )}

        {/* Front Cover (Capa) */}
        <div 
          className={`absolute inset-0 z-20 rounded-r-sm overflow-hidden border shadow-2xl bg-[#1a1c23] ${
            aura ? `${aura.border} border-[2.5px]` : 'border-white/10'
          }`}
          style={{ 
            transform: is3DEnabled ? 'translateZ(25px)' : isParallaxEnabled ? 'translateZ(15px)' : undefined,
            transformStyle: isParallaxEnabled ? 'preserve-3d' : undefined,
            backfaceVisibility: is3DEnabled || isParallaxEnabled ? 'hidden' : undefined
          }}
        >
          {/* Glossy Overlay (Dinâmico com Tilt/Vidro) */}
          {(animationMode === 'new' || isParallaxEnabled) && (
            <motion.div 
              style={{
                background: useTransform(
                  mouseXSpring, 
                  [-0.5, 0.5], 
                  [
                    "linear-gradient(120deg, rgba(255,255,255,0.2) 0%, transparent 50%)", 
                    "linear-gradient(240deg, rgba(255,255,255,0.2) 0%, transparent 50%)"
                  ]
                ),
                transform: isParallaxEnabled ? 'translateZ(40px)' : undefined
              }}
              className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-30" 
            />
          )}

          {animationMode === 'fixed_3d' && (
            <div 
              className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-white/10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-30" 
            />
          )}
          
          {/* Book Crease (Dobra da Capa) */}
          <div className="absolute inset-y-0 left-[5px] w-[2px] bg-black/20 z-40" />

          {/* Category Badge */}
          {book.category && (
            <div 
              className="absolute top-3 right-3 px-2 py-1 bg-primary-500/80 backdrop-blur-md rounded-lg text-[7px] font-black text-white uppercase tracking-tighter z-40 shadow-lg"
              style={{ transform: isParallaxEnabled ? 'translateZ(30px)' : undefined }}
            >
              {book.category}
            </div>
          )}

          {/* Favorite Button */}
          <button
            onClick={(e) => { e.stopPropagation(); onToggleFavorite(book.id); }}
            className={`absolute top-3 left-4 p-1.5 rounded-lg z-40 transition-all ${
              book.isFavorite ? 'bg-amber-500 text-white shadow-lg' : 'bg-black/40 text-white/40 hover:bg-black/60 hover:text-white'
            }`}
            style={{ transform: isParallaxEnabled ? 'translateZ(30px)' : undefined }}
          >
            <i className={`ph-bold ${book.isFavorite ? 'ph-star-fill' : 'ph-star'}`} />
          </button>

          {/* Format Badge */}
          <div 
            className="absolute top-3 left-14 flex gap-1 z-40"
            style={{ transform: isParallaxEnabled ? 'translateZ(30px)' : undefined }}
          >
            {book.format === 'kindle' && (
              <div className="px-2 py-1 bg-amber-500/80 backdrop-blur-md rounded-lg text-[7px] font-black text-white uppercase tracking-widest shadow-lg flex items-center gap-1 border border-white/5">
                <i className="ph-fill ph-device-mobile" /> Kindle
              </div>
            )}
            {book.format === 'physical' && (
              <div className="px-2 py-1 bg-emerald-500/80 backdrop-blur-md rounded-lg text-[7px] font-black text-white uppercase tracking-widest shadow-lg flex items-center gap-1 border border-white/5">
                <i className="ph-fill ph-book-open" /> Físico
              </div>
            )}
            {(book.format === 'pdf' || !book.format) && (
              <div className="px-2 py-1 bg-blue-500/80 backdrop-blur-md rounded-lg text-[7px] font-black text-white uppercase tracking-widest shadow-lg flex items-center gap-1 border border-white/5">
                <i className="ph-fill ph-file-pdf" /> PDF
              </div>
            )}
          </div>

          {/* Status Badge */}
          {book.status && (
            <div 
              className={`absolute bottom-3 left-4 px-2 py-1 ${statusColors[book.status]} rounded-lg text-[7px] font-black text-white uppercase tracking-widest z-40 shadow-lg`}
              style={{ transform: isParallaxEnabled ? 'translateZ(30px)' : undefined }}
            >
              {statusLabels[book.status]}
            </div>
          )}

          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60 z-10" />
          
          {book.coverUrl ? (
            <img 
              src={book.coverUrl} 
              alt={book.title} 
              className="w-full h-full object-cover transition-transform group-hover:scale-105" 
              loading="lazy" 
            />
          ) : (
            <div className={`w-full h-full flex flex-col items-center justify-center p-6 text-center gap-4 ${
              aura ? `bg-gradient-to-br ${aura.gradient} text-slate-950` : 'bg-gradient-to-br from-white/5 to-white/[0.02]'
            }`}>
              <i className={`ph-duotone ph-book text-5xl ${aura ? 'text-slate-950/60' : 'text-primary-500/40'}`} />
              <span className={`text-[10px] font-black uppercase tracking-widest leading-tight ${aura ? 'text-slate-950/85' : 'opacity-40'}`}>{book.title}</span>
            </div>
          )}
          
          {/* Progress Bar (Visual) */}
          {progress > 0 && (
            <div 
              className="absolute bottom-0 left-0 right-0 h-1 bg-white/10 z-40"
              style={{ transform: isParallaxEnabled ? 'translateZ(30px)' : undefined }}
            >
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                className={`h-full ${progress === 100 ? 'bg-emerald-500' : 'bg-primary-500'}`} 
              />
            </div>
          )}

          <div 
            className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4 z-30"
            style={{ transform: isParallaxEnabled ? 'translateZ(35px)' : undefined }}
          >
             <motion.div 
                whileHover={{ scale: 1.1 }}
                className="w-12 h-12 bg-primary-500 rounded-full flex items-center justify-center text-white text-xl shadow-xl shadow-primary-500/40"
             >
               <i className="ph-bold ph-play" />
             </motion.div>
          </div>
        </div>

        {/* Dynamic Shadow (Sombra projetada) */}
        {animationMode === 'new' || isParallaxEnabled ? (
          <motion.div 
            style={{
              x: useTransform(mouseXSpring, [-0.5, 0.5], [20, -20]),
              y: useTransform(mouseYSpring, [-0.5, 0.5], [20, -20]),
            }}
            className="absolute inset-4 bg-black/60 blur-2xl rounded-sm -z-10 transition-all duration-300 group-hover:opacity-40 opacity-20"
          />
        ) : animationMode === 'fixed_3d' ? (
          <div className="absolute inset-4 bg-black/60 blur-2xl rounded-sm -z-10 group-hover:translate-x-[20px] group-hover:translate-y-[10px] group-hover:opacity-40 opacity-20 transition-all duration-300" />
        ) : (
          <div className="absolute inset-4 bg-black/40 blur-xl rounded-sm -z-10 opacity-0 group-hover:opacity-30 transition-opacity duration-300" />
        )}
      </motion.div>
      <div className="mt-3 px-1 flex justify-between items-start">
        <div className="min-w-0">
          <h4 className="text-xs font-black text-white truncate uppercase tracking-widest leading-none">{book.title}</h4>
          <p className="text-[9px] font-medium text-gray-500 uppercase mt-1">
            {book.sharedBy ? `Enviado por ${book.sharedBy.name}` : book.isCommunity ? 'Comunidade' : book.format === 'kindle' ? 'Livro Kindle' : book.format === 'physical' ? 'Livro Físico' : 'Documento PDF'}
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
);
});

BookCard.displayName = 'BookCard';
