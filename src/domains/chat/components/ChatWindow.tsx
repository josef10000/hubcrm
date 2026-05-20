import React, { useState, useRef, useEffect } from 'react';
import { ExternalLink, MoreVertical, Phone, Video, Search, MessageSquare, Megaphone, Info, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Chat, ChatMessage } from '@/types/chat.types';
import { useChat } from '@/hooks/useChat';
import { useBookmarks } from '@/hooks/useBookmarks';
import { isSameDay, formatChatDividerDate } from '@/helpers/chatHelpers';
import { useAuth } from '@auth/contexts/AuthContext';
import { useCRM } from '@crm/contexts/CRMContext';
import MessageBubble from './MessageBubble';
import MessageInput from './MessageInput';
import GroupSettingsModal from './GroupSettingsModal';
import SupportRequestModal from '@support/components/SupportRequestModal';
import { toast } from 'sonner';
import { Pin, ChevronRight, Bookmark, Archive, Folder } from 'lucide-react';
import { Timestamp } from 'firebase/firestore';
import { doc, onSnapshot, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { AnimatePresence, motion } from 'framer-motion';
import ImageLightbox from './ImageLightbox';
import ThreadSidebar from './ThreadSidebar';

interface ChatWindowProps {
  chatId: string | null;
  chat: Chat | null;
}

export default function ChatWindow({ chatId, chat }: ChatWindowProps) {
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  const { teamProfiles, effectiveOrgId } = useCRM();
  const { 
    messages, typing, sendMessage, setTypingStatus, loading, deleteMessage, 
    toggleReaction, votePoll, togglePin, unpinMessage, toggleBookmark, respondApproval,
    editMessage, markMessageAsRead, setMessageReminder, sharedMedia, sendBotMessage 
  } = useChat(chatId);
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
  const [pinnedMessagesData, setPinnedMessagesData] = useState<ChatMessage[]>([]);
  const [liveChat, setLiveChat] = useState<Chat | null>(chat);
  const { bookmarks } = useBookmarks();
  const bookmarkedIds = bookmarks.map(b => b.messageId);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [initialTicketMessage, setInitialTicketMessage] = useState('');
  const [editingMessage, setEditingMessage] = useState<ChatMessage | null>(null);
  const [isMediaOpen, setIsMediaOpen] = useState(false);
  const [isSupportModalOpen, setIsSupportModalOpen] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [activeThread, setActiveThread] = useState<ChatMessage | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Filtragem de Mensagens (Busca + Ocultar Threads do fluxo principal)
  const mainMessages = messages.filter(m => !m.parentMessageId);
  const filteredMessages = mainMessages.filter(msg => 
    msg.text.toLowerCase().includes(searchTerm.toLowerCase()) ||
    msg.senderName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Lógica de Identidade do Chat
  let displayName = chat?.name || '';
  let displayPhoto = '';
  
  if (chat?.type === 'direct') {
    const otherUserId = chat.members.find(id => id !== userProfile?.uid);
    const otherUser = teamProfiles.find(p => p.uid === otherUserId);
    if (otherUser) {
      displayName = otherUser.displayName;
      displayPhoto = otherUser.photoURL || '';
    }
  } else if (chat?.type === 'self') {
    displayName = 'Meu Espaço (Você)';
    displayPhoto = userProfile?.photoURL || '';
  } else if (chat?.type === 'group') {
    displayPhoto = chat.avatarUrl || '';
  } else if (chat?.type === 'channel') {
    displayName = `#${chat.name}`;
    displayPhoto = chat.avatarUrl || '';
  }

  // Lógica de Status (Presence)
  const otherUserId = chat?.type === 'direct' ? chat.members.find(id => id !== userProfile?.uid) : null;
  const otherUser = otherUserId ? teamProfiles.find(p => p.uid === otherUserId) : null;
  const status = otherUser?.presenceStatus || 'offline';
  const lastSeen = otherUser?.lastSeen;
  const isOnline = status === 'online' && (Date.now() - (lastSeen || 0) < 120000); // 2 mins threshold

  // Auto-scroll para o final ao receber mensagens
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [messages]);

  // Assinar o chat em tempo real para pins imediatos
  useEffect(() => {
    if (!chatId || !effectiveOrgId) return;
    
    const unsubscribe = onSnapshot(doc(db, 'organizations', effectiveOrgId, 'chats', chatId), (snap: any) => {
      if (snap.exists()) {
        setLiveChat({ id: snap.id, ...snap.data() } as Chat);
      }
    });
    return () => unsubscribe();
  }, [chatId, effectiveOrgId]);

  // Sincronizar chat inicial mudado pela sidebar
  useEffect(() => {
    if (chat && (!liveChat || liveChat.id !== chat.id)) {
      setLiveChat(chat);
    }
  }, [chat]);

  // Listener para carregar TODAS as mensagens fixadas se não estiverem no buffer
  useEffect(() => {
    const pinnedList = liveChat?.pinnedMessages || [];
    
    if (pinnedList.length === 0) {
      setPinnedMessagesData([]);
      return;
    }

    const fetchPinnedMessages = async () => {
      const orgId = userProfile?.orgId;
      if (!orgId) return;

      const loaded: ChatMessage[] = [];
      for (const pid of pinnedList) {
        const msgInBuffer = messages.find(m => m.id === pid);
        if (msgInBuffer) {
          loaded.push(msgInBuffer);
        } else {
          try {
            const msgRef = doc(db, 'organizations', orgId, 'chats', chatId!, 'messages', pid);
            const snap = await getDoc(msgRef);
            if (snap.exists()) {
              loaded.push({ id: snap.id, ...snap.data() } as ChatMessage);
            }
          } catch (error) {
            console.error("Erro ao buscar mensagem fixada:", error);
          }
        }
      }
      setPinnedMessagesData(loaded);
    };

    fetchPinnedMessages();
  }, [liveChat?.pinnedMessages, messages, chatId, userProfile?.orgId]);

  const getPinnedMessageText = (msg: ChatMessage): string => {
    if (!msg) return "Carregando...";
    
    // Se for enquete
    if (msg.type === 'poll' || msg.poll) {
      return `📊 Enquete: ${msg.poll?.question || msg.text || 'Nova Enquete'}`;
    }
    
    // Se for aprovação
    if (msg.type === 'approval' || msg.approval) {
      return `🔑 Aprovação: ${msg.approval?.question || msg.text || 'Aprovação'}`;
    }
    
    // Se for resposta de bot
    if (msg.type === 'bot_response') {
      return msg.text ? `🤖 ${msg.text}` : `🤖 Resposta de Assistente`;
    }
    
    // Se tiver anexos
    if (msg.attachments && msg.attachments.length > 0) {
      const firstAttachment = msg.attachments[0];
      if (firstAttachment.match(/\.(jpeg|jpg|gif|png|webp|svg)($|\?)/i) || firstAttachment.includes('/images/')) {
        return "📷 Imagem / Foto";
      }
      if (firstAttachment.match(/\.(mp3|wav|ogg|m4a|webm)($|\?)/i) || firstAttachment.includes('/audios/')) {
        return "🎙️ Mensagem de Voz / Áudio";
      }
      if (firstAttachment.match(/\.(mp4|mov|webm)($|\?)/i) || firstAttachment.includes('/videos/')) {
        return "🎥 Vídeo Compartilhado";
      }
      return "📄 Arquivo Anexo";
    }

    if (msg.text && msg.text.trim()) {
      return msg.text;
    }

    return "Mensagem de Mídia";
  };

  const scrollToMessage = (messageId: string) => {
    const element = document.getElementById(`msg-${messageId}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      element.classList.add('animate-highlight-message');
      setTimeout(() => {
        element.classList.remove('animate-highlight-message');
      }, 2500);
    } else {
      toast.info('Mensagem muito antiga, tente rolar para cima para carregar.');
    }
  };

  if (!chatId || !chat) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-12 bg-gray-50/50 dark:bg-black/20 relative overflow-hidden">
        {/* Elementos Decorativos de Fundo */}
        <div className="absolute top-[-10%] right-[-10%] w-96 h-96 bg-primary-500/5 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-[-10%] left-[-10%] w-96 h-96 bg-amber-500/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />

        <div className="relative z-10 flex flex-col items-center">
          <div className="w-24 h-24 bg-white dark:bg-zinc-900 rounded-[2.5rem] shadow-2xl flex items-center justify-center mb-8 border border-gray-100 dark:border-white/10 group hover:scale-110 transition-transform duration-500">
            <div className="w-16 h-16 bg-primary-500 rounded-[1.5rem] flex items-center justify-center text-white shadow-xl shadow-primary-500/20 group-hover:rotate-12 transition-transform">
              <MessageSquare size={32} />
            </div>
          </div>
          
          <h2 className="text-3xl font-black text-gray-900 dark:text-white uppercase tracking-tighter mb-4 text-center">
            Bem-vindo ao <span className="text-primary-500">Hub Chat</span>
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm text-center font-medium leading-relaxed mb-10">
            Conecte-se com sua equipe em tempo real. Troque ideias, compartilhe arquivos e mantenha o foco no que importa.
          </p>

          <div className="grid grid-cols-2 gap-4 w-full max-w-md">
            <div className="p-4 bg-white dark:bg-white/5 rounded-3xl border border-gray-100 dark:border-white/5 hover:border-primary-500/30 transition-all">
              <div className="w-8 h-8 bg-emerald-500/10 text-emerald-600 rounded-xl flex items-center justify-center mb-3">
                <Megaphone size={16} />
              </div>
              <h4 className="text-xs font-bold text-gray-900 dark:text-white mb-1">Criptografado</h4>
              <p className="text-[10px] text-gray-500">Suas conversas são seguras e privadas.</p>
            </div>
            <div className="p-4 bg-white dark:bg-white/5 rounded-3xl border border-gray-100 dark:border-white/5 hover:border-primary-500/30 transition-all">
              <div className="w-8 h-8 bg-amber-500/10 text-amber-600 rounded-xl flex items-center justify-center mb-3">
                <Search size={16} />
              </div>
              <h4 className="text-xs font-bold text-gray-900 dark:text-white mb-1">Busca Rápida</h4>
              <p className="text-[10px] text-gray-500">Encontre qualquer mensagem no histórico.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const handleSend = async (
    text: string, 
    mentions: string[] = [], 
    attachments: string[] = [], 
    replyTo: ChatMessage['replyTo'] = null,
    members: string[] = [],
    type: "text" | "poll" | "approval" | "rich_link" | "client_card" | "sticker" | "bot_response" = "text",
    poll?: ChatMessage['poll'],
    approval?: ChatMessage['approval'],
    richPreview?: ChatMessage['richPreview'],
    parentMessageId?: string,
    scheduledAt?: Timestamp
  ) => {
    if (!chat) return;
    if (!text.trim() && attachments.length === 0 && type === 'text') return;
    
    if (type === 'bot_response') {
      await sendBotMessage('HubBot', text, 'bot_response', parentMessageId);
    } else {
      await sendMessage(
        text, 
        mentions, 
        attachments, 
        replyTo,
        chat.members,
        type,
        poll,
        approval,
        richPreview,
        parentMessageId,
        scheduledAt
      );
    }
    
    setReplyingTo(null);
  };

  const handleUpdate = async (messageId: string, text: string) => {
    await editMessage(messageId, text);
    setEditingMessage(null);
  };


  // Coletar todas as URLs de imagem da conversa para navegação no Lightbox
  const allConversationImages = messages
    .flatMap(m => m.attachments || [])
    .filter(url => url.match(/\.(jpeg|jpg|gif|png|webp)/i) || url.includes('firebasestorage'));

  const handleNextImage = () => {
    if (!lightboxImage) return;
    const currentIndex = allConversationImages.indexOf(lightboxImage);
    if (currentIndex < allConversationImages.length - 1) {
      setLightboxImage(allConversationImages[currentIndex + 1]);
    }
  };

  const handlePrevImage = () => {
    if (!lightboxImage) return;
    const currentIndex = allConversationImages.indexOf(lightboxImage);
    if (currentIndex > 0) {
      setLightboxImage(allConversationImages[currentIndex - 1]);
    }
  };

  return (
    <>
      <div className="flex-1 flex flex-col bg-white dark:bg-black/40 min-w-0">
      {/* Header do Chat */}
      <div className="p-4 border-b border-gray-100 dark:border-white/10 flex items-center justify-between min-h-[73px]">
        <div className="flex items-center gap-3">
          <div 
            onClick={() => otherUserId && navigate(`/profile/${otherUserId}`)}
            className={`w-10 h-10 rounded-xl flex items-center justify-center border overflow-hidden ${
              chat?.type === 'channel'
                ? 'bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 border-violet-500/20'
                : 'bg-primary-500/10 border-primary-500/20'
            } ${otherUserId ? 'cursor-pointer hover:scale-105 transition-transform' : ''}`}
          >
            {displayPhoto ? (
              <img src={displayPhoto} alt="" className="w-full h-full object-cover" />
            ) : chat?.type === 'channel' ? (
              <span className="text-xl">{chat.icon || '📢'}</span>
            ) : (
              <MessageSquare size={20} className="text-primary-500" />
            )}
          </div>
          {!isSearchOpen ? (
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white leading-none mb-1">{displayName}</h3>
              {typing.length > 0 ? (
                <p className="text-xs text-primary-500 font-bold animate-pulse">
                  {typing.map(t => t.displayName).join(', ')} {typing.length > 1 ? 'estão digitando...' : 'está digitando...'}
                </p>
              ) : (
                <div className="flex items-center gap-1.5">
                  <div className={`w-1.5 h-1.5 rounded-full ${
                    isOnline ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 
                    status === 'away' ? 'bg-amber-500' : 
                    status === 'lunch' ? 'bg-blue-500' :
                    status === 'meeting' ? 'bg-purple-500' :
                    'bg-gray-400'
                  }`} />
                  <p className="text-xs text-gray-400 font-medium uppercase tracking-widest">
                    {chat.type === 'self' ? 'Suas Anotações Privadas' : 
                     chat.type === 'direct' ? (
                       isOnline ? 'Online agora' : 
                       status === 'away' ? 'Ausente' : 
                       status === 'lunch' ? 'Em Almoço' :
                       status === 'meeting' ? 'Em Reunião' :
                       'Offline'
                     ) :
                     chat.type === 'channel' ? (chat.description || `${chat.members.length} membros • Canal ${chat.isPublic ? 'Público' : 'Privado'}`) :
                     `${chat.members.length} Membros`}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center bg-gray-100 dark:bg-white/5 rounded-xl px-3 py-1.5 animate-in slide-in-from-left-2 duration-300">
              <Search size={14} className="text-gray-400 mr-2" />
              <input 
                autoFocus
                type="text"
                placeholder="Buscar na conversa..."
                className="bg-transparent border-none text-xs focus:outline-none dark:text-white w-40 md:w-64"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <button onClick={() => { setIsSearchOpen(false); setSearchTerm(''); }} className="ml-2 text-gray-400 hover:text-gray-600">
                <X size={14} />
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-1">
          {!isSearchOpen && (
            <button 
              onClick={() => setIsSearchOpen(true)}
              className="p-2.5 text-gray-400 hover:text-primary-500 hover:bg-primary-500/5 rounded-xl transition-all"
            >
              <Search size={24} />
            </button>
          )}
          <button 
            onClick={() => setIsMediaOpen(!isMediaOpen)}
            className={`p-2.5 rounded-xl transition-all ${isMediaOpen ? 'text-primary-500 bg-primary-500/10' : 'text-gray-400 hover:text-primary-500 hover:bg-primary-500/5'}`}
            title="Mídia Compartilhada"
          >
            <Folder size={24} />
          </button>
          <button 
            onClick={() => setIsSettingsOpen(true)}
            className="p-2.5 text-gray-400 hover:text-primary-500 hover:bg-primary-500/5 rounded-xl transition-all" 
            title="Dados do Grupo"
          >
            <Info size={24} />
          </button>
          <button 
            onClick={() => window.open('/chat?standalone=true', '_blank')}
            className="p-2.5 text-gray-400 hover:text-primary-500 hover:bg-primary-500/5 rounded-xl transition-all" 
            title="Abrir em Nova Aba"
          >
            <ExternalLink size={24} />
          </button>
          <div className="relative">
            <button 
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-2.5 text-gray-400 hover:text-primary-500 hover:bg-primary-500/5 rounded-xl transition-all"
            >
              <MoreVertical size={24} />
            </button>

            {isMenuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setIsMenuOpen(false)} />
                <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-zinc-900 border border-gray-100 dark:border-white/10 rounded-2xl shadow-2xl py-2 z-50 animate-in fade-in zoom-in-95 duration-200">
                  <button onClick={() => { setIsSettingsOpen(true); setIsMenuOpen(false); }} className="w-full text-left px-4 py-2 text-xs font-bold text-gray-700 dark:text-gray-300 hover:bg-primary-500 hover:text-white transition-colors">
                    Dados do Grupo
                  </button>
                  <button onClick={() => setIsMenuOpen(false)} className="w-full text-left px-4 py-2 text-xs font-bold text-gray-700 dark:text-gray-300 hover:bg-primary-500 hover:text-white transition-colors">
                    Ver Membros
                  </button>
                  <div className="h-px bg-gray-100 dark:bg-white/5 my-1" />
                  <button onClick={() => setIsMenuOpen(false)} className="w-full text-left px-4 py-2 text-xs font-bold text-red-500 hover:bg-red-500 hover:text-white transition-colors">
                    Sair da Conversa
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Banner de Mensagens Fixadas */}
      {pinnedMessagesData.length > 0 && (
        <div className="bg-primary-500/5 border-b border-primary-500/10 px-4 py-2 flex flex-col gap-2 animate-in slide-in-from-top duration-300">
          {pinnedMessagesData.map((pinnedMsg) => (
            <div 
              key={pinnedMsg.id} 
              onClick={() => scrollToMessage(pinnedMsg.id)}
              className="flex items-center gap-3 cursor-pointer hover:bg-primary-500/10 p-1.5 rounded-xl transition-all group"
            >
              <Pin size={16} className="text-amber-500 fill-current shrink-0 group-hover:scale-110 transition-transform" />
              <div className="flex-1 overflow-hidden">
                <p className="text-[10px] font-black uppercase tracking-widest text-primary-600 mb-0.5">Mensagem Fixada</p>
                <div className="flex items-center gap-2">
                   <p className="text-[15px] font-medium text-gray-800 dark:text-gray-200 truncate max-w-md group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                     {getPinnedMessageText(pinnedMsg)}
                   </p>
                </div>
              </div>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  unpinMessage(pinnedMsg.id);
                }}
                className="p-1.5 shrink-0 hover:bg-primary-500/20 rounded-lg text-primary-400 hover:text-red-500 transition-colors"
                title="Desfixar"
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Janela de Mensagens */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto overscroll-contain p-6 custom-scrollbar bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] dark:bg-none"
      >
        {loading ? (
          <div className="flex flex-col items-center justify-center h-full opacity-20">
             <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mb-4" />
             <p className="text-xs font-bold uppercase tracking-widest">Carregando mensagens...</p>
          </div>
        ) : filteredMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center mt-20 opacity-40">
            <Search size={40} className="mb-4" />
            <p className="text-sm font-medium">{searchTerm ? 'Nenhum resultado para sua busca' : 'Nenhuma mensagem ainda...'}</p>
          </div>
        ) : (
          <div className="space-y-1">
            {filteredMessages.map((msg, index) => {
              // Lógica de divisor de data (Teams Style)
              const currentDate = (msg.createdAt as any)?.toDate?.() || null;
              const previousDate = index > 0 ? (filteredMessages[index - 1].createdAt as any)?.toDate?.() || null : null;
              const showDivider = index === 0 || (currentDate && previousDate && !isSameDay(currentDate, previousDate));

              // Função ultra-segura para extrair milissegundos (Sugerida por DeepSeek R1)
              const getSafeMillis = (ts: any) => {
                if (!ts) return 0;
                if (typeof ts.toMillis === 'function') return ts.toMillis();
                if (ts.seconds) return ts.seconds * 1000;
                if (ts instanceof Date) return ts.getTime();
                if (typeof ts === 'number') return ts;
                return 0;
              };

              // Calcular se a mensagem foi lida por ALGUÉM além de mim
              const isRead = Object.entries(chat.lastRead || {})
                .filter(([uid]) => uid !== userProfile?.uid)
                .some(([_, lastReadTs]) => {
                  const lrMillis = getSafeMillis(lastReadTs);
                  const msgMillis = getSafeMillis(msg.createdAt);
                  return lrMillis >= msgMillis && msgMillis > 0;
                });

              return (
                <React.Fragment key={msg.id}>
                  {showDivider && currentDate && (
                    <div className="flex items-center gap-4 py-6 px-2">
                      <span className="text-sm font-medium text-gray-500 dark:text-gray-400 capitalize whitespace-nowrap">
                        {formatChatDividerDate(currentDate)}
                      </span>
                    </div>
                  )}
                  <MessageBubble 
                    message={msg} 
                    isRead={isRead} 
                    isPinned={liveChat?.pinnedMessages?.includes(msg.id)}
                    isBookmarked={bookmarkedIds.includes(msg.id)}
                    onDelete={deleteMessage}
                    onReply={setReplyingTo}
                    onReact={toggleReaction}
                    onVote={votePoll}
                    onPin={togglePin}
                    onUnpin={unpinMessage}
                    onBookmark={toggleBookmark}
                    onApprove={respondApproval}
                    onEdit={setEditingMessage}
                    onCreateTicket={(text) => {
                      setInitialTicketMessage(text);
                      setIsSupportModalOpen(true);
                    }}
                    onImageClick={(url) => setLightboxImage(url)}
                    onThreadOpen={setActiveThread}
                    onSetReminder={setMessageReminder}
                  />
                </React.Fragment>
              );
            })}
          </div>
        )}
      </div>

      {/* Input de Mensagem */}
      <MessageInput 
        onSend={(text, mentions, att, reply, membersList, type, poll, approval, richPreview, parentMessageId, scheduledAt) => 
          handleSend(text, mentions, att, reply, membersList, type, poll, approval, richPreview, parentMessageId, scheduledAt)
        } 
        onTyping={setTypingStatus}
        replyTo={replyingTo ? { messageId: replyingTo.id, text: replyingTo.text, senderName: replyingTo.senderName } : null}
        onCancelReply={() => setReplyingTo(null)}
        editingMessage={editingMessage}
        onCancelEdit={() => setEditingMessage(null)}
        onUpdate={handleUpdate}
        members={chat.members}
        chatId={chatId}
      />

      <GroupSettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
        chat={chat} 
      />

      <SupportRequestModal 
        isOpen={isSupportModalOpen}
        onClose={() => setIsSupportModalOpen(false)}
        initialMessage={initialTicketMessage}
      />
    </div>

      {/* Sidebar de Mídia Compartilhada */}
      <AnimatePresence>
        {isMediaOpen && (
          <>
            {/* Backdrop para mobile (clique fora para fechar) */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMediaOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
            />
            <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-80 lg:relative lg:inset-auto lg:z-0 border-l border-gray-100 dark:border-white/10 bg-white/50 dark:bg-zinc-950/50 backdrop-blur-xl animate-in slide-in-from-right duration-300 flex flex-col h-full">
          <div className="p-4 border-b border-gray-100 dark:border-white/10 flex justify-between items-center bg-white/10">
            <h4 className="text-sm font-black uppercase tracking-widest text-gray-900 dark:text-white">Mídia & Arquivos</h4>
            <button onClick={() => setIsMediaOpen(false)} className="p-1 hover:bg-black/10 dark:hover:bg-white/10 rounded-full transition-colors">
              <X size={16} className="text-gray-400" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
            <div className="grid grid-cols-2 gap-2">
              {sharedMedia.map((msg) => (
                msg.attachments?.map((url, idx) => (
                  <div 
                    key={`${msg.id}-${idx}`} 
                    onClick={() => setLightboxImage(url)}
                    className="aspect-square rounded-xl overflow-hidden border border-gray-100 dark:border-white/5 group relative cursor-pointer"
                  >
                    <img src={url} alt="" className="w-full h-full object-cover transition-transform group-hover:scale-110" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Search size={16} className="text-white" />
                    </div>
                  </div>
                ))
              ))}
            </div>
            {sharedMedia.length === 0 && (
              <div className="flex flex-col items-center justify-center mt-20 opacity-30 text-center px-4">
                <Folder size={40} className="mb-4" />
                <p className="text-xs font-bold uppercase tracking-widest leading-relaxed">Nenhuma mídia compartilhada neste chat ainda.</p>
              </div>
            )}
          </div>
        </div>
          </>
        )}
      </AnimatePresence>

      {/* Lightbox de Imagem */}
      <AnimatePresence>
        {lightboxImage && (
          <ImageLightbox 
            url={lightboxImage} 
            onClose={() => setLightboxImage(null)}
            onNext={allConversationImages.indexOf(lightboxImage) < allConversationImages.length - 1 ? handleNextImage : undefined}
            onPrev={allConversationImages.indexOf(lightboxImage) > 0 ? handlePrevImage : undefined}
          />
        )}
      </AnimatePresence>

      {/* Sidebar de Threads */}
      <AnimatePresence>
        {activeThread && (
          <>
            {/* Backdrop para mobile (clique fora para fechar) */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setActiveThread(null)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
            />
            <ThreadSidebar 
              parentMessage={activeThread} 
              chat={chat} 
              onClose={() => setActiveThread(null)} 
            />
          </>
        )}
      </AnimatePresence>
    </>
  );
}
