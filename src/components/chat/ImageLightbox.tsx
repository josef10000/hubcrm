import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, ZoomIn, ZoomOut, RotateCcw, Download, ChevronLeft, ChevronRight } from 'lucide-react';

interface ImageLightboxProps {
  url: string;
  onClose: () => void;
  onNext?: () => void;
  onPrev?: () => void;
}

export default function ImageLightbox({ url, onClose, onNext, onPrev }: ImageLightboxProps) {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  // Resetar zoom ao trocar de imagem
  useEffect(() => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  }, [url]);

  const handleWheel = (e: React.WheelEvent) => {
    const delta = e.deltaY > 0 ? -0.2 : 0.2;
    const newScale = Math.min(Math.max(scale + delta, 1), 5); // Min 1x, Max 5x
    setScale(newScale);
    
    // Se voltar pro zoom normal, reseta a posição
    if (newScale === 1) {
      setPosition({ x: 0, y: 0 });
    }
  };

  const handleReset = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };

  const handleDownload = async () => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `hubcrm-media-${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error("Erro ao baixar imagem:", error);
      // Fallback simples
      window.open(url, '_blank text');
    }
  };

  // Fechar no Esc
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight' && onNext) onNext();
      if (e.key === 'ArrowLeft' && onPrev) onPrev();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, onNext, onPrev]);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-2xl flex items-center justify-center overflow-hidden select-none"
      onClick={onClose}
    >
      {/* Barra de Topo */}
      <div className="absolute top-0 inset-x-0 p-6 flex justify-between items-start z-[110] bg-gradient-to-b from-black/80 to-transparent">
        <div className="flex items-center gap-4">
          <button 
            onClick={onClose}
            className="w-12 h-12 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center text-white transition-all border border-white/10 group"
          >
            <X size={24} className="group-hover:scale-110 transition-transform" />
          </button>
          <div>
            <h4 className="text-white font-bold tracking-tight">Visualização de Mídia</h4>
            <p className="text-[10px] text-white/40 font-black uppercase tracking-widest">Hub CRM Premium Engine</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Controles de Zoom */}
          <div className="flex items-center bg-white/10 backdrop-blur-md rounded-2xl border border-white/10 p-1.5 self-center">
            <button 
              onClick={(e) => { e.stopPropagation(); setScale(Math.max(scale - 0.5, 1)); }}
              className="p-2 hover:bg-white/10 rounded-xl text-white/80 transition-colors"
              title="Afastar"
            >
              <ZoomOut size={18} />
            </button>
            <div className="w-16 text-center">
              <span className="text-[11px] font-black text-white/80 tabular-nums">
                {Math.round(scale * 100)}%
              </span>
            </div>
            <button 
              onClick={(e) => { e.stopPropagation(); setScale(Math.min(scale + 0.5, 5)); }}
              className="p-2 hover:bg-white/10 rounded-xl text-white/80 transition-colors"
              title="Aproximar"
            >
              <ZoomIn size={18} />
            </button>
          </div>
          
          <button 
            onClick={(e) => { e.stopPropagation(); handleReset(); }} 
            className="w-12 h-12 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center text-white transition-all border border-white/10"
            title="Resetar Zoom"
          >
            <RotateCcw size={20} />
          </button>
          
          <button 
            onClick={(e) => { e.stopPropagation(); handleDownload(); }} 
            className="flex items-center gap-2 px-6 h-12 bg-primary-500 hover:bg-primary-600 rounded-2xl text-white font-bold text-sm transition-all shadow-xl shadow-primary-500/20"
          >
            <Download size={18} />
            <span>Baixar</span>
          </button>
        </div>
      </div>

      {/* Navegação */}
      {onPrev && (
        <button 
          onClick={(e) => { e.stopPropagation(); onPrev(); }}
          className="absolute left-8 top-1/2 -translate-y-1/2 w-16 h-16 bg-white/5 hover:bg-white/10 text-white rounded-full flex items-center justify-center transition-all z-[110] border border-white/5 group"
        >
          <ChevronLeft size={40} className="group-hover:-translate-x-1 transition-transform" />
        </button>
      )}
      {onNext && (
        <button 
          onClick={(e) => { e.stopPropagation(); onNext(); }}
          className="absolute right-8 top-1/2 -translate-y-1/2 w-16 h-16 bg-white/5 hover:bg-white/10 text-white rounded-full flex items-center justify-center transition-all z-[110] border border-white/5 group"
        >
          <ChevronRight size={40} className="group-hover:translate-x-1 transition-transform" />
        </button>
      )}

      {/* Área da Imagem */}
      <div 
        className="w-full h-full flex items-center justify-center cursor-grab active:cursor-grabbing p-4"
        onWheel={handleWheel}
        onClick={(e) => e.stopPropagation()}
      >
        <motion.div
          animate={{ scale, x: position.x * scale, y: position.y * scale }}
          drag={scale > 1}
          dragMomentum={false}
          onDragEnd={(_, info) => {
            // Atualiza a posição base para o próximo arraste
            setPosition(prev => ({
              x: prev.x + (info.offset.x / scale),
              y: prev.y + (info.offset.y / scale)
            }));
          }}
          transition={{ type: 'spring', stiffness: 400, damping: 40, mass: 0.8 }}
          className="flex items-center justify-center"
        >
          <img 
            src={url}
            alt=""
            className="max-w-[90vw] max-h-[90vh] object-contain shadow-[0_0_100px_rgba(0,0,0,0.5)] rounded-lg pointer-events-none"
          />
        </motion.div>
      </div>

      {/* Dica de Uso */}
      <div className="absolute bottom-10 inset-x-0 flex justify-center pointer-events-none">
        <div className="bg-white/5 backdrop-blur-xl px-6 py-3 rounded-full border border-white/10 animate-pulse">
          <p className="text-[11px] text-white/60 font-black uppercase tracking-[0.2em]">
            Use o Scroll para Zoom • Arraste para navegar nos detalhes
          </p>
        </div>
      </div>
    </motion.div>
  );
}
