import React, { useEffect, useState } from 'react';
import { useAuth } from '@auth/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { toast } from 'sonner';
import { Video, Clock, Calendar, Copy, Play, ArrowLeft, Trash2, Search, Link2, Check } from 'lucide-react';

interface MediaItem {
  id: string;
  title: string;
  description?: string;
  mediaUrl: string;
  duration: number;
  createdAt: number;
}

interface MediaLibraryProps {
  onSelect?: (media: MediaItem) => void;
  isSelectionMode?: boolean;
  onBack?: () => void;
}

export default function MediaLibrary({ onSelect, isSelectionMode = false, onBack }: MediaLibraryProps) {
  const { userProfile } = useAuth();
  const [mediaList, setMediaList] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [previewMedia, setPreviewMedia] = useState<MediaItem | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    if (!userProfile?.orgId) return;

    const ref = collection(db, 'organizations', userProfile.orgId, 'media_library');
    const q = query(ref, orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(q, (snap) => {
      const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as MediaItem));
      setMediaList(list);
      setLoading(false);
    }, (err) => {
      console.error('Erro ao ler biblioteca de mídias:', err);
      toast.error('Erro ao carregar gravações.');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [userProfile?.orgId]);

  const handleCopyLink = (media: MediaItem) => {
    navigator.clipboard.writeText(media.mediaUrl);
    setCopiedId(media.id);
    toast.success('Link do vídeo copiado para a área de transferência!');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const formatDuration = (ms: number) => {
    const totalSecs = Math.floor(ms / 1000);
    const hours = Math.floor(totalSecs / 3600);
    const minutes = Math.floor((totalSecs % 3600) / 60);
    const seconds = totalSecs % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m ${seconds}s`;
  };

  const filteredMedia = mediaList.filter(item => 
    item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (item.description && item.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className={`space-y-6 text-left ${isSelectionMode ? 'p-2' : 'p-6 md:p-10'}`}>
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {onBack && (
            <button 
              onClick={onBack}
              className="p-2 hover:bg-white/5 border border-white/10 rounded-xl transition-all"
            >
              <ArrowLeft size={18} className="text-gray-400" />
            </button>
          )}
          <div>
            <h2 className="text-2xl font-black text-white flex items-center gap-2">
              <Video className="text-rose-500" /> Biblioteca de Mídias
            </h2>
            <p className="text-xs text-gray-500">Acesse e vincule as gravações das transmissões ao vivo no Cloudflare R2.</p>
          </div>
        </div>

        {/* Search */}
        <div className="relative w-full md:w-72">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            placeholder="Pesquisar gravação..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-xs text-white outline-none focus:border-rose-500 transition-all font-medium"
          />
        </div>
      </div>

      {loading ? (
        <div className="py-24 text-center">
          <Loader2 className="w-8 h-8 text-rose-500 animate-spin mx-auto mb-2" />
          <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Carregando Mídias...</p>
        </div>
      ) : filteredMedia.length === 0 ? (
        <div className="py-20 text-center bg-white/5 border border-dashed border-white/10 rounded-[2.5rem]">
          <Video className="w-12 h-12 text-gray-700 mx-auto mb-4 animate-pulse" />
          <h3 className="font-bold text-gray-400 text-lg">Nenhuma gravação encontrada</h3>
          <p className="text-xs text-gray-600 max-w-xs mx-auto mt-1">
            Transmissões passadas marcadas para gravar e salvas no Cloudflare R2 aparecerão aqui.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredMedia.map(item => (
            <div 
              key={item.id}
              className="bg-white/5 border border-white/10 rounded-[2rem] p-6 hover:bg-white/10 hover:border-primary-500/30 transition-all flex flex-col justify-between group relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/5 blur-2xl -z-10 rounded-full group-hover:bg-rose-500/10 transition-all" />
              
              <div>
                {/* Visual Placeholder for Video Thumbnail */}
                <div 
                  onClick={() => setPreviewMedia(item)}
                  className="w-full h-36 bg-black/40 rounded-2xl border border-white/5 flex items-center justify-center relative cursor-pointer overflow-hidden group/thumb mb-4"
                >
                  <div className="w-12 h-12 rounded-full bg-rose-500/20 text-rose-500 flex items-center justify-center border border-rose-500/30 transition-all group-hover/thumb:scale-110 group-hover/thumb:bg-rose-500 group-hover/thumb:text-white group-hover/thumb:shadow-lg">
                    <Play size={20} className="fill-current ml-0.5" />
                  </div>
                  <div className="absolute bottom-3 right-3 bg-black/60 px-2 py-0.5 rounded-lg text-[9px] font-mono text-gray-400 border border-white/5">
                    {formatDuration(item.duration)}
                  </div>
                </div>

                <h3 className="font-bold text-white text-lg line-clamp-1">{item.title}</h3>
                {item.description && (
                  <p className="text-xs text-gray-500 line-clamp-2 mt-1 leading-relaxed">{item.description}</p>
                )}
              </div>

              {/* Card Footer Actions */}
              <div className="mt-6 pt-4 border-t border-white/5 flex gap-2">
                {onSelect ? (
                  <button
                    onClick={() => onSelect(item)}
                    className="flex-1 py-2.5 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                  >
                    <Check size={14} /> Selecionar
                  </button>
                ) : (
                  <>
                    <button
                      onClick={() => setPreviewMedia(item)}
                      className="flex-1 py-2.5 bg-white/5 hover:bg-white/10 text-white border border-white/5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                    >
                      <Play size={14} className="fill-current" /> Assistir
                    </button>
                    <button
                      onClick={() => handleCopyLink(item)}
                      className={`p-2.5 rounded-xl transition-all border ${
                        copiedId === item.id 
                          ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500'
                          : 'bg-white/5 hover:bg-white/10 border-white/5 text-gray-400 hover:text-white'
                      }`}
                      title="Copiar Link R2"
                    >
                      {copiedId === item.id ? <Check size={14} /> : <Copy size={14} />}
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Video Preview Modal */}
      {previewMedia && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md" onClick={() => setPreviewMedia(null)}>
          <div 
            className="bg-zinc-950 w-full max-w-3xl rounded-[2rem] border border-white/10 overflow-hidden shadow-2xl relative"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-6 border-b border-white/5 flex justify-between items-center bg-zinc-950">
              <h3 className="font-extrabold text-white text-lg">{previewMedia.title}</h3>
              <button 
                onClick={() => setPreviewMedia(null)}
                className="p-2 hover:bg-white/10 rounded-full transition-colors text-gray-400 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 bg-black aspect-video flex items-center justify-center">
              <video
                src={previewMedia.mediaUrl}
                controls
                autoPlay
                className="w-full h-full rounded-xl border border-white/5"
              />
            </div>

            <div className="p-6 border-t border-white/5 text-gray-500 text-xs flex flex-wrap gap-4 font-mono justify-center">
              <span className="flex items-center gap-1"><Clock size={12} /> Duração: {formatDuration(previewMedia.duration)}</span>
              <span className="flex items-center gap-1"><Calendar size={12} /> Gravado em: {new Date(previewMedia.createdAt).toLocaleDateString()}</span>
              <button 
                onClick={() => handleCopyLink(previewMedia)}
                className="flex items-center gap-1 text-rose-500 hover:underline cursor-pointer font-bold"
              >
                <Link2 size={12} /> Copiar Link do Vídeo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
export type { MediaItem };
