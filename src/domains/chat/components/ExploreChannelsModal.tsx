import React, { useState, useEffect } from 'react';
import { X, Hash, Users, Search, LogIn, Check } from 'lucide-react';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, doc, updateDoc, arrayUnion, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '@auth/contexts/AuthContext';
import { useCRM } from '@crm/contexts/CRMContext';
import { Chat } from '@/types/chat.types';
import { toast } from 'sonner';

interface ExploreChannelsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onJoin?: (channelId: string) => void;
  currentChats: Chat[];
}

const CATEGORY_COLORS: { [key: string]: string } = {
  geral: 'bg-blue-500',
  vendas: 'bg-emerald-500',
  rh: 'bg-amber-500',
  financeiro: 'bg-violet-500',
  suporte: 'bg-rose-500',
  social: 'bg-pink-500',
  anuncios: 'bg-red-500',
};

export default function ExploreChannelsModal({ isOpen, onClose, onJoin, currentChats }: ExploreChannelsModalProps) {
  const { userProfile } = useAuth();
  const { effectiveOrgId } = useCRM();
  const [channels, setChannels] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [joiningId, setJoiningId] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !effectiveOrgId) return;

    const fetchChannels = async () => {
      setLoading(true);
      try {
        const q = query(
          collection(db, 'organizations', effectiveOrgId, 'chats'),
          where('type', '==', 'channel'),
          where('isPublic', '==', true)
        );
        const snap = await getDocs(q);
        const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as Chat));
        setChannels(list);
      } catch (error) {
        console.error("Erro ao buscar canais:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchChannels();
  }, [isOpen, effectiveOrgId]);

  if (!isOpen) return null;

  const handleJoin = async (channel: Chat) => {
    if (!effectiveOrgId || !userProfile?.uid) return;

    setJoiningId(channel.id);
    try {
      await updateDoc(doc(db, 'organizations', effectiveOrgId, 'chats', channel.id), {
        members: arrayUnion(userProfile.uid),
        [`unreadCount.${userProfile.uid}`]: 0,
        [`unreadMentions.${userProfile.uid}`]: 0,
        [`lastRead.${userProfile.uid}`]: serverTimestamp()
      });
      toast.success(`Você entrou em #${channel.name}!`);
      onJoin?.(channel.id);
    } catch (error) {
      toast.error('Erro ao entrar no canal.');
    } finally {
      setJoiningId(null);
    }
  };

  const filteredChannels = channels.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const isMember = (channel: Chat) => channel.members.includes(userProfile?.uid || '');

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-white dark:bg-zinc-950 w-full max-w-xl rounded-[2rem] border border-gray-100 dark:border-white/10 shadow-2xl max-h-[80vh] overflow-hidden animate-in zoom-in-95 fade-in duration-300 flex flex-col">
        {/* Header */}
        <div className="p-6 pb-4 border-b border-gray-100 dark:border-white/5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-fuchsia-500 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-violet-500/20">
              <Hash size={20} />
            </div>
            <div>
              <h2 className="text-lg font-black text-gray-900 dark:text-white uppercase tracking-tight">Explorar Canais</h2>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{channels.length} canais disponíveis</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-full transition-colors">
            <X size={20} className="text-gray-400" />
          </button>
        </div>

        {/* Busca */}
        <div className="px-6 py-3 shrink-0">
          <div className="relative">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar canais..."
              className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 pl-11 pr-4 py-3 rounded-2xl text-sm focus:outline-none focus:border-violet-500 transition-all dark:text-white"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Lista */}
        <div className="flex-1 overflow-y-auto custom-scrollbar px-6 pb-6 space-y-2">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filteredChannels.length === 0 ? (
            <div className="text-center py-12">
              <Hash size={40} className="text-gray-300 dark:text-gray-600 mx-auto mb-3" />
              <p className="text-sm text-gray-400 font-bold">Nenhum canal encontrado</p>
            </div>
          ) : (
            filteredChannels.map(channel => {
              const joined = isMember(channel);
              const catColor = CATEGORY_COLORS[channel.category || 'geral'] || 'bg-gray-500';

              return (
                <div key={channel.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/5 hover:bg-gray-100 dark:hover:bg-white/10 transition-all group">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-10 h-10 rounded-2xl flex items-center justify-center bg-white dark:bg-white/10 border border-gray-100 dark:border-white/10 overflow-hidden shadow-sm shrink-0">
                      {channel.avatarUrl ? (
                        <img src={channel.avatarUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-xl">{channel.icon || '📢'}</span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-sm font-black text-gray-900 dark:text-white tracking-tight truncate">#{channel.name}</span>
                        {channel.category && (
                          <span className={`text-[8px] font-black uppercase tracking-widest text-white px-1.5 py-0.5 rounded-full ${catColor}`}>
                            {channel.category}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-gray-500 truncate">{channel.description || 'Sem descrição'}</p>
                      <div className="flex items-center gap-1 mt-1">
                        <Users size={10} className="text-gray-400" />
                        <span className="text-[10px] text-gray-400 font-bold">{channel.members.length} membros</span>
                      </div>
                    </div>
                  </div>

                  {joined ? (
                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 text-emerald-600 rounded-xl">
                      <Check size={14} />
                      <span className="text-[10px] font-black uppercase tracking-widest">Membro</span>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleJoin(channel)}
                      disabled={joiningId === channel.id}
                      className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-violet-500/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
                    >
                      <LogIn size={14} />
                      {joiningId === channel.id ? 'Entrando...' : 'Entrar'}
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
