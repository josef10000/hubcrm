import React from 'react';
import { motion, useMotionValue, useTransform, useSpring } from 'framer-motion';
import { useNexusStore } from '@store/useNexusStore';
import type { NexusBook } from '@store/useNexusStore';

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

  return (
    <div className="group relative" style={{ perspective: is3DEnabled ? '1200px' : undefined }}>
      <motion.div 
        onClick={() => onView(book.id)}
        onMouseMove={animationMode === 'new' ? handleMouseMove : undefined}
        onMouseLeave={animationMode === 'new' ? handleMouseLeave : undefined}
        style={{ 
          rotateY: animationMode === 'new' ? rotateY : 0, 
          rotateX: animationMode === 'new' ? rotateX : 0,
          transformStyle: is3DEnabled ? 'preserve-3d' : undefined
        }}
        whileHover={
          animationMode === 'fixed_3d' 
            ? { scale: 1.05, rotateY: -25, rotateX: 5 } 
            : animationMode === 'zoom' || animationMode === 'new'
              ? { scale: 1.05 } 
              : undefined
        }
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
        className="aspect-[3/4] relative cursor-pointer"
      >
        {/* Book Spine (Lombada) - Apenas visível no hover 3D */}
        {is3DEnabled && (
          <div 
            className="absolute inset-y-0 left-0 w-[30px] bg-gradient-to-r from-primary-900 to-primary-700 origin-left z-10 rounded-l-sm"
            style={{ 
              transform: 'rotateY(-90deg)',
              boxShadow: 'inset -5px 0 10px rgba(0,0,0,0.5)'
            }}
          >
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

        {/* Front Cover (Capa) */}
        <div 
          className="absolute inset-0 z-20 rounded-r-sm overflow-hidden border border-white/10 shadow-2xl bg-[#1a1c23]"
          style={{ 
            transform: is3DEnabled ? 'translateZ(25px)' : undefined,
            backfaceVisibility: is3DEnabled ? 'hidden' : undefined
          }}
        >
          {/* Glossy Overlay (Dinâmico com Tilt) */}
          {animationMode === 'new' && (
            <motion.div 
              style={{
                background: useTransform(
                  mouseXSpring, 
                  [-0.5, 0.5], 
                  ["linear-gradient(120deg, rgba(255,255,255,0.15) 0%, transparent 50%)", "linear-gradient(240deg, rgba(255,255,255,0.15) 0%, transparent 50%)"]
                )
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
            <div className="absolute top-3 right-3 px-2 py-1 bg-primary-500/80 backdrop-blur-md rounded-lg text-[7px] font-black text-white uppercase tracking-tighter z-40 shadow-lg">
              {book.category}
            </div>
          )}

          {/* Favorite Button */}
          <button
            onClick={(e) => { e.stopPropagation(); onToggleFavorite(book.id); }}
            className={`absolute top-3 left-4 p-1.5 rounded-lg z-40 transition-all ${
              book.isFavorite ? 'bg-amber-500 text-white shadow-lg' : 'bg-black/40 text-white/40 hover:bg-black/60 hover:text-white'
            }`}
          >
            <i className={`ph-bold ${book.isFavorite ? 'ph-star-fill' : 'ph-star'}`} />
          </button>

          {/* Format Badge */}
          <div className="absolute top-3 left-14 flex gap-1 z-40">
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
            <div className={`absolute bottom-3 left-4 px-2 py-1 ${statusColors[book.status]} rounded-lg text-[7px] font-black text-white uppercase tracking-widest z-40 shadow-lg`}>
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
            <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center gap-4 bg-gradient-to-br from-white/5 to-white/[0.02]">
              <i className="ph-duotone ph-book text-5xl text-primary-500/40" />
              <span className="text-[10px] font-bold uppercase tracking-widest leading-tight opacity-40">{book.title}</span>
            </div>
          )}
          
          {/* Progress Bar (Visual) */}
          {progress > 0 && (
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/10 z-40">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                className={`h-full ${progress === 100 ? 'bg-emerald-500' : 'bg-primary-500'}`} 
              />
            </div>
          )}

          <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4 z-30">
             <motion.div 
                whileHover={{ scale: 1.1 }}
                className="w-12 h-12 bg-primary-500 rounded-full flex items-center justify-center text-white text-xl shadow-xl shadow-primary-500/40"
             >
               <i className="ph-bold ph-play" />
             </motion.div>
          </div>
        </div>

        {/* Dynamic Shadow (Sombra projetada) */}
        {animationMode === 'new' ? (
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
