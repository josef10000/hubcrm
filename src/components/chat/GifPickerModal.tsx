import React, { useState, useEffect } from 'react';
import { Search, X, Loader2, Plus, Upload } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import { useCRM } from '../../contexts/CRMContext';
import { db } from '../../lib/firebase';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import { uploadImageToImgBB } from '../../lib/imgbb';
import { toast } from 'sonner';

interface GifPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (url: string) => void;
}

export function GifPickerModal({ isOpen, onClose, onSelect }: GifPickerModalProps) {
  const [search, setSearch] = useState('');
  const [gifs, setGifs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [activeTab, setActiveTab] = useState<'gifs' | 'stickers' | 'custom'>('gifs');
  const [customStickers, setCustomStickers] = useState<any[]>([]);
  
  const { userProfile } = useAuth();
  const { effectiveOrgId } = useCRM();
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const GIPHY_API_KEY = import.meta.env.VITE_GIPHY_API_KEY;

  const fetchGifs = async (query: string, type: 'gifs' | 'stickers') => {
    if (!GIPHY_API_KEY) return;
    setLoading(true);
    try {
      const baseEndpoint = type === 'gifs' ? 'gifs' : 'stickers';
      const endpoint = query 
        ? `https://api.giphy.com/v1/${baseEndpoint}/search?api_key=${GIPHY_API_KEY}&q=${encodeURIComponent(query)}&limit=21&rating=g`
        : `https://api.giphy.com/v1/${baseEndpoint}/trending?api_key=${GIPHY_API_KEY}&limit=21&rating=g`;
      
      const response = await fetch(endpoint);
      const data = await response.json();
      setGifs(data.data || []);
    } catch (error) {
      console.error(`Erro ao buscar ${type}:`, error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && (activeTab === 'gifs' || activeTab === 'stickers')) {
      fetchGifs('', activeTab);
    }
  }, [isOpen, activeTab]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (isOpen && (activeTab === 'gifs' || activeTab === 'stickers')) fetchGifs(search, activeTab);
    }, 500);
    return () => clearTimeout(timer);
  }, [search, activeTab]);

  // Carregar figurinhas personalizadas
  useEffect(() => {
    if (!isOpen || !effectiveOrgId || !userProfile?.uid) return;

    const q = query(
      collection(db, 'organizations', effectiveOrgId, 'users', userProfile.uid, 'stickers'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const stickers = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setCustomStickers(stickers);
    });

    return () => unsubscribe();
  }, [isOpen, effectiveOrgId, userProfile?.uid]);

  const handleCustomUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !effectiveOrgId || !userProfile?.uid) return;

    setUploading(true);
    try {
      const url = await uploadImageToImgBB(file);
      await addDoc(collection(db, 'organizations', effectiveOrgId, 'users', userProfile.uid, 'stickers'), {
        url,
        createdAt: serverTimestamp()
      });
      toast.success('Figurinha adicionada!');
    } catch (error) {
      console.error("Erro ao subir figurinha:", error);
      toast.error('Erro ao subir figurinha');
    } finally {
      setUploading(false);
    }
  };

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
              <div className="relative mb-4">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input 
                  type="text"
                  placeholder={`Pesquisar ${activeTab === 'gifs' ? 'GIFs' : 'Stickers'} no Giphy...`}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 pl-12 pr-4 py-3 rounded-2xl text-sm focus:outline-none focus:border-primary-500 transition-all dark:text-white"
                />
              </div>

              {/* Tabs */}
              <div className="flex bg-gray-100 dark:bg-white/5 p-1 rounded-2xl">
                <button 
                  onClick={() => setActiveTab('gifs')}
                  className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${
                    activeTab === 'gifs' 
                      ? 'bg-white dark:bg-zinc-800 text-primary-500 shadow-sm' 
                      : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                  }`}
                >
                  GIFs
                </button>
                <button 
                  onClick={() => setActiveTab('stickers')}
                  className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${
                    activeTab === 'stickers' 
                      ? 'bg-white dark:bg-zinc-800 text-primary-500 shadow-sm' 
                      : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                  }`}
                >
                  Stickers
                </button>
                <button 
                  onClick={() => setActiveTab('custom')}
                  className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${
                    activeTab === 'custom' 
                      ? 'bg-white dark:bg-zinc-800 text-primary-500 shadow-sm' 
                      : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                  }`}
                >
                  Minhas
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar min-h-[300px]">
              {!GIPHY_API_KEY ? (
                <div className="flex flex-col items-center justify-center h-full text-center p-8 opacity-50">
                  <p className="text-sm font-bold uppercase tracking-widest mb-2">Chave API Ausente</p>
                  <p className="text-xs">Configure VITE_GIPHY_API_KEY para habilitar GIFs.</p>
                </div>
              ) : activeTab === 'custom' ? (
                <div className="grid grid-cols-3 gap-3">
                  {/* Botão de Upload */}
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="aspect-square rounded-2xl border-2 border-dashed border-gray-200 dark:border-white/10 flex flex-col items-center justify-center gap-2 hover:border-primary-500 hover:bg-primary-500/5 transition-all text-gray-400 hover:text-primary-500 disabled:opacity-50"
                  >
                    {uploading ? <Loader2 className="animate-spin" size={24} /> : <Plus size={24} />}
                    <span className="text-[8px] font-black uppercase tracking-widest">Nova</span>
                  </button>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    accept="image/*" 
                    onChange={handleCustomUpload} 
                  />

                  {customStickers.map((sticker) => (
                    <button
                      key={sticker.id}
                      onClick={() => onSelect(sticker.url)}
                      className="relative aspect-square rounded-2xl overflow-hidden hover:ring-2 hover:ring-primary-500 transition-all group p-2 bg-gray-50 dark:bg-white/5"
                    >
                      <img 
                        src={sticker.url} 
                        alt=""
                        className="w-full h-full object-contain"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-all" />
                    </button>
                  ))}
                </div>
              ) : (activeTab === 'gifs' || activeTab === 'stickers') && loading ? (
                <div className="flex items-center justify-center h-full min-h-[200px]">
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
