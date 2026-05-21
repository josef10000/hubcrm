import React, { useState } from 'react';
import { X, Search, Send, Check, Hash, Users, Star, User } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Chat, ChatMessage } from '@/types/chat.types';
import { useChatStore } from '@store/useChatStore';
import { useAuth } from '@auth/contexts/AuthContext';
import { useCRM } from '@crm/contexts/CRMContext';

interface ForwardMessageModalProps {
  isOpen: boolean;
  onClose: () => void;
  message: ChatMessage | null;
}

export function ForwardMessageModal({ isOpen, onClose, message }: ForwardMessageModalProps) {
  const { userProfile } = useAuth();
  const { teamProfiles, effectiveOrgId } = useCRM();
  const { chats, forwardMessage } = useChatStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [sentChats, setSentChats] = useState<string[]>([]); // Guarda os IDs dos chats para os quais a mensagem já foi enviada

  if (!message || !isOpen) return null;

  const handleForward = async (chatId: string) => {
    if (!effectiveOrgId || !userProfile?.uid) return;
    
    // Evita duplicar cliques se já enviou
    if (sentChats.includes(chatId)) return;

    try {
      await forwardMessage(
        effectiveOrgId,
        chatId,
        userProfile.uid,
        userProfile.displayName || 'Membro do Time',
        userProfile.photoURL || '',
        message
      );
      setSentChats(prev => [...prev, chatId]);
    } catch (error) {
      // O toast de erro já é tratado no store
      console.error(error);
    }
  };

  // Filtra chats nos quais o usuário é membro
  const myChats = chats.filter(chat => 
    chat.members.includes(userProfile?.uid || '')
  );

  // Filtra e categoriza as conversas
  const getChatDisplayNameAndPhoto = (chat: Chat) => {
    let displayName = chat.name;
    let displayPhoto = '';
    let iconType: 'self' | 'direct' | 'group' | 'channel' = chat.type;

    if (chat.type === 'direct') {
      const otherUserId = chat.members.find(id => id !== userProfile?.uid);
      const otherUser = teamProfiles.find(p => p.uid === otherUserId);
      if (otherUser) {
        displayName = otherUser.displayName;
        displayPhoto = otherUser.photoURL || '';
      }
    } else if (chat.type === 'self') {
      displayName = 'Meu Espaço (Você)';
      displayPhoto = userProfile?.photoURL || '';
    } else if (chat.type === 'group') {
      displayPhoto = chat.avatarUrl || '';
    } else if (chat.type === 'channel') {
      displayPhoto = chat.avatarUrl || '';
    }

    return { displayName, displayPhoto, iconType, iconEmoji: chat.icon };
  };

  const formattedChats = myChats.map(chat => {
    const { displayName, displayPhoto, iconType, iconEmoji } = getChatDisplayNameAndPhoto(chat);
    return {
      ...chat,
      displayName,
      displayPhoto,
      iconType,
      iconEmoji
    };
  });

  const filteredChats = formattedChats.filter(chat => 
    chat.displayName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm" 
          />
          
          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-md bg-white dark:bg-zinc-950 rounded-[2.5rem] shadow-2xl overflow-hidden border border-gray-100 dark:border-white/10 flex flex-col max-h-[80vh]"
          >
            {/* Header */}
            <div className="p-6 border-b border-gray-100 dark:border-white/10 shrink-0">
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-primary-500/10 rounded-xl flex items-center justify-center">
                    <Send size={18} className="text-primary-500 -rotate-45" />
                  </div>
                  <h3 className="text-sm font-black uppercase tracking-widest text-gray-900 dark:text-white">Encaminhar Mensagem</h3>
                </div>
                <button onClick={onClose} className="p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-full transition-colors">
                  <X size={18} className="text-gray-400" />
                </button>
              </div>
              
              {/* Preview da Mensagem */}
              <div className="bg-gray-50 dark:bg-white/5 p-3 rounded-2xl border border-gray-100 dark:border-white/5 mb-4">
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1">
                  Enviada por {message.senderName}:
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-300 line-clamp-2 italic">
                  "{message.text || (message.type === 'poll' ? `📊 Enquete: ${message.poll?.question}` : message.type === 'approval' ? `📝 Aprovação: ${message.approval?.question}` : `[Mídia/Anexo]`)}"
                </p>
              </div>

              {/* Busca */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input 
                  type="text" 
                  placeholder="Buscar conversa..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 pl-10 pr-4 py-2.5 rounded-2xl text-sm focus:outline-none focus:border-primary-500 transition-all dark:text-white"
                />
              </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-6 space-y-2 min-h-0 custom-scrollbar">
              {filteredChats.length === 0 ? (
                <div className="text-center py-8 opacity-40">
                  <p className="text-xs font-semibold">Nenhuma conversa encontrada</p>
                </div>
              ) : (
                filteredChats.map(chat => {
                  const isSent = sentChats.includes(chat.id);
                  return (
                    <div 
                      key={chat.id}
                      className="flex items-center justify-between p-3 rounded-2xl bg-gray-50/50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 border border-transparent transition-all"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {/* Avatar */}
                        <div className="relative shrink-0">
                          <div className="w-10 h-10 rounded-2xl flex items-center justify-center border border-gray-100 dark:border-white/10 overflow-hidden bg-white dark:bg-white/10">
                            {chat.displayPhoto ? (
                              <img src={chat.displayPhoto} alt="" className="w-full h-full object-cover" />
                            ) : chat.iconType === 'self' ? (
                              <Star size={18} className="text-amber-500" />
                            ) : chat.iconType === 'direct' ? (
                              <User size={18} className="text-gray-500 dark:text-gray-400" />
                            ) : chat.iconType === 'channel' ? (
                              <span className="text-lg">{chat.iconEmoji || '📢'}</span>
                            ) : (
                              <Users size={18} className="text-gray-500 dark:text-gray-400" />
                            )}
                          </div>
                        </div>

                        {/* Informações */}
                        <div className="text-left min-w-0">
                          <h4 className="text-sm font-bold text-gray-900 dark:text-white truncate">
                            {chat.iconType === 'channel' ? `#${chat.displayName}` : chat.displayName}
                          </h4>
                          <p className="text-[10px] text-gray-400 uppercase font-medium">
                            {chat.type === 'direct' ? 'Direta' : chat.type === 'channel' ? 'Canal' : chat.type === 'self' ? 'Pessoal' : 'Grupo'}
                          </p>
                        </div>
                      </div>

                      {/* Botão de Encaminhar */}
                      <button
                        onClick={() => handleForward(chat.id)}
                        disabled={isSent}
                        className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                          isSent 
                            ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' 
                            : 'bg-primary-500 text-white shadow-lg shadow-primary-500/20 hover:scale-[1.03] active:scale-95'
                        }`}
                      >
                        {isSent ? (
                          <>
                            <Check size={14} />
                            Enviado
                          </>
                        ) : (
                          <>
                            <Send size={12} className="-rotate-45" />
                            Enviar
                          </>
                        )}
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
