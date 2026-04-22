import React, { useState, useEffect } from 'react';
import { Search, X, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface GifPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (url: string) => void;
}

export function GifPickerModal({ isOpen, onClose, onSelect }: GifPickerModalProps) {
  const [search, setSearch] = useState('');
  const [gifs, setGifs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const GIPHY_API_KEY = import.meta.env.VITE_GIPHY_API_KEY;

  const fetchGifs = async (query: string) => {
    if (!GIPHY_API_KEY) return;
    setLoading(true);
    try {
      const endpoint = query 
        ? `https://api.giphy.com/v1/gifs/search?api_key=${GIPHY_API_KEY}&q=${encodeURIComponent(query)}&limit=20&rating=g`
        : `https://api.giphy.com/v1/gifs/trending?api_key=${GIPHY_API_KEY}&limit=20&rating=g`;
      
      const response = await fetch(endpoint);
      const data = await response.json();
      setGifs(data.data || []);
    } catch (error) {
      console.error("Erro ao buscar GIFs:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchGifs('');
    }
  }, [isOpen]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (isOpen) fetchGifs(search);
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm" 
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-lg bg-white dark:bg-zinc-950 rounded-[2.5rem] shadow-2xl overflow-hidden border border-gray-100 dark:border-white/10 flex flex-col max-h-[80vh]"
          >
            {/* Header */}
            <div className="p-6 border-b border-gray-100 dark:border-white/10">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-black uppercase tracking-widest text-gray-900 dark:text-white">GIFs & Stickers</h3>
                <button onClick={onClose} className="p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-full transition-colors">
                  <X size={20} className="text-gray-400" />
                </button>
              </div>
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input 
                  type="text"
                  placeholder="Pesquisar no Giphy..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 pl-12 pr-4 py-3 rounded-2xl text-sm focus:outline-none focus:border-primary-500 transition-all dark:text-white"
                />
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar min-h-[300px]">
              {!GIPHY_API_KEY ? (
                <div className="flex flex-col items-center justify-center h-full text-center p-8 opacity-50">
                  <p className="text-sm font-bold uppercase tracking-widest mb-2">Chave API Ausente</p>
                  <p className="text-xs">Configure VITE_GIPHY_API_KEY para habilitar GIFs.</p>
                </div>
              ) : loading ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 size={32} className="animate-spin text-primary-500" />
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {gifs.map((gif: any) => (
                    <button
                      key={gif.id}
                      onClick={() => onSelect(gif.images.fixed_height.url)}
                      className="relative aspect-video rounded-xl overflow-hidden hover:ring-2 hover:ring-primary-500 transition-all group"
                    >
                      <img 
                        src={gif.images.fixed_height.url} 
                        alt={gif.title}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="p-4 bg-gray-50 dark:bg-white/5 text-center">
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.2em]">Powered by Giphy</p>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
