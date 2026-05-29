import React, { useState, useRef, useEffect } from 'react';
import { ExternalLink, MoreVertical, Phone, Video, Search, MessageSquare, Megaphone, Info, X, ChevronUp, ChevronDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Chat, ChatMessage } from '@/types/chat.types';
import { useChat } from '@/hooks/useChat';
import { useBookmarks } from '@/hooks/useBookmarks';
import { isSameDay, formatChatDividerDate } from '@/helpers/chatHelpers';
import { useAuth } from '@auth/contexts/AuthContext';
import { useCRM } from '@crm/contexts/CRMContext';
import MessageBubble from './MessageBubble';
import MessageInput from './MessageInput';
import ForwardMessageModal from './ForwardMessageModal';
import GroupSettingsModal from './GroupSettingsModal';
import SupportRequestModal from '@support/components/SupportRequestModal';
import { toast } from 'sonner';
import { Pin, ChevronRight, Bookmark, Archive, Folder, CheckSquare, Trash } from 'lucide-react';
import { Timestamp } from 'firebase/firestore';
import { doc, onSnapshot, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { AnimatePresence, motion } from 'framer-motion';
import ImageLightbox from './ImageLightbox';
import ThreadSidebar from './ThreadSidebar';

  import { useChatStore } from '@/store/useChatStore';
  import { useWebRTC } from '@/hooks/useWebRTC';
  import { useNexusStore } from '@store/useNexusStore';

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
  const { startCall } = useWebRTC();
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
  const [isTasksOpen, setIsTasksOpen] = useState(false);
  const nexusTasks = useNexusStore(state => state.tasks);
  const setNexusTasks = useNexusStore(state => state.setTasks);
  const [newTaskText, setNewTaskText] = useState('');
  const [isSupportModalOpen, setIsSupportModalOpen] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [activeThread, setActiveThread] = useState<ChatMessage | null>(null);
  const [forwardingMessage, setForwardingMessage] = useState<ChatMessage | null>(null);
  const [hasInteracted, setHasInteracted] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);

  const scrollToBottom = () => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: 'smooth'
    });
  };

  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);
  const [isForwardBatchOpen, setIsForwardBatchOpen] = useState(false);

  const isSelectionMode = useChatStore(state => state.isSelectionMode);
  const selectedMessageIds = useChatStore(state => state.selectedMessageIds);
  const clearSelection = useChatStore(state => state.clearSelection);
  const batchDelete = useChatStore(state => state.batchDelete);

  // Resetar a interação quando mudar de chat para permitir exibir o divisor de novas mensagens novamente
  useEffect(() => {
    setHasInteracted(false);
  }, [chatId]);

  // Filtragem de Mensagens (Ocultar Threads do fluxo principal)
  const mainMessages = messages.filter(m => !m.parentMessageId);
  const filteredMessages = mainMessages;

  const searchMatches = searchTerm 
    ? mainMessages.filter(msg => 
        msg.text?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        msg.senderName?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : [];

  // Foco inicial e rolagem para o primeiro match ao buscar
  useEffect(() => {
    if (searchMatches.length > 0) {
      setCurrentMatchIndex(0);
      scrollToMessage(searchMatches[0].id);
    }
  }, [searchTerm]);

  // Atalho global de teclado Ctrl+Shift+F
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        setIsSearchOpen(true);
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

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
      const orgId = effectiveOrgId;
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
  }, [liveChat?.pinnedMessages, messages, chatId, effectiveOrgId]);

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
    type: ChatMessage['type'] = "text",
    poll?: ChatMessage['poll'],
    approval?: ChatMessage['approval'],
    richPreview?: ChatMessage['richPreview'],
    parentMessageId?: string,
    scheduledAt?: Timestamp,
    priority?: ChatMessage['priority'],
    checklist?: ChatMessage['checklist'],
    transcription?: string
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
        scheduledAt,
        priority,
        checklist,
        transcription
      );
    }
    
    setReplyingTo(null);
  };

  const handleUpdate = async (messageId: string, text: string) => {
    await editMessage(messageId, text);
    setEditingMessage(null);
  };

  const handleExportConversation = () => {
    if (messages.length === 0) {
      toast.info('Não há mensagens para exportar.');
      return;
    }
    
    const formattedHistory = messages
      .map(m => {
        const date = (m.createdAt as any)?.toDate?.() || new Date();
        const formattedDate = date.toLocaleString('pt-BR');
        return `[${formattedDate}] [${m.senderName}]: ${m.text || (m.attachments && m.attachments.length > 0 ? '[Anexo]' : '[Mídia]')}`;
      })
      .join('\n');

    const blob = new Blob([formattedHistory], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `historico-chat-${displayName.replace(/[^a-zA-Z0-9]/g, '_')}-${Date.now()}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success('Histórico de conversa exportado com sucesso!');
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
      <div className="flex-1 flex flex-col bg-white dark:bg-black/40 min-w-0 relative">
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
                className="bg-transparent border-none text-xs focus:outline-none dark:text-white w-32 md:w-56"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              {searchMatches.length > 0 && (
                <div className="flex items-center gap-1 border-l border-gray-200 dark:border-white/10 pl-2 mr-2">
                  <span className="text-[10px] font-bold text-gray-500 whitespace-nowrap">
                    {currentMatchIndex + 1}/{searchMatches.length}
                  </span>
                  <button 
                    onClick={() => {
                      const nextIndex = (currentMatchIndex - 1 + searchMatches.length) % searchMatches.length;
                      setCurrentMatchIndex(nextIndex);
                      scrollToMessage(searchMatches[nextIndex].id);
                    }}
                    className="p-1 hover:bg-gray-200 dark:hover:bg-white/10 rounded-lg text-gray-500 transition-colors"
                    title="Anterior"
                  >
                    <ChevronUp size={12} />
                  </button>
                  <button 
                    onClick={() => {
                      const nextIndex = (currentMatchIndex + 1) % searchMatches.length;
                      setCurrentMatchIndex(nextIndex);
                      scrollToMessage(searchMatches[nextIndex].id);
                    }}
                    className="p-1 hover:bg-gray-200 dark:hover:bg-white/10 rounded-lg text-gray-500 transition-colors"
                    title="Próxima"
                  >
                    <ChevronDown size={12} />
                  </button>
                </div>
              )}
              <button onClick={() => { setIsSearchOpen(false); setSearchTerm(''); }} className="text-gray-400 hover:text-gray-600 transition-colors ml-1">
                <X size={14} />
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-1">
          {chat?.type === 'direct' && otherUserId && !isSearchOpen && (
            <>
              <button 
                onClick={() => startCall(otherUserId, displayName, 'audio', displayPhoto)}
                className="p-2.5 text-gray-400 hover:text-emerald-500 hover:bg-emerald-500/5 rounded-xl transition-all"
                title="Chamada de Áudio"
              >
                <Phone size={24} />
              </button>
              <button 
                onClick={() => startCall(otherUserId, displayName, 'video', displayPhoto)}
                className="p-2.5 text-gray-400 hover:text-primary-500 hover:bg-primary-500/5 rounded-xl transition-all"
                title="Chamada de Vídeo"
              >
                <Video size={24} />
              </button>
            </>
          )}
          {!isSearchOpen && (
            <button 
              onClick={() => setIsSearchOpen(true)}
              className="p-2.5 text-gray-400 hover:text-primary-500 hover:bg-primary-500/5 rounded-xl transition-all"
            >
              <Search size={24} />
            </button>
          )}
          <button 
            onClick={() => { setIsMediaOpen(!isMediaOpen); setIsTasksOpen(false); }}
            className={`p-2.5 rounded-xl transition-all ${isMediaOpen ? 'text-primary-500 bg-primary-500/10' : 'text-gray-400 hover:text-primary-500 hover:bg-primary-500/5'}`}
            title="Mídia Compartilhada"
          >
            <Folder size={24} />
          </button>
          <button 
            onClick={() => { setIsTasksOpen(!isTasksOpen); setIsMediaOpen(false); }}
            className={`p-2.5 rounded-xl transition-all ${isTasksOpen ? 'text-teal-500 bg-teal-500/10' : 'text-gray-400 hover:text-teal-500 hover:bg-teal-500/5'}`}
            title="Tarefas Rápidas"
          >
            <CheckSquare size={24} />
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
                  <button onClick={() => { handleExportConversation(); setIsMenuOpen(false); }} className="w-full text-left px-4 py-2 text-xs font-bold text-gray-700 dark:text-gray-300 hover:bg-primary-500 hover:text-white transition-colors">
                    Exportar Conversa (.txt)
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
        onScroll={(e) => {
          if (!hasInteracted) setHasInteracted(true);
          const el = e.currentTarget;
          if (el) {
            const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 350;
            setShowScrollToBottom(!isNearBottom);
          }
        }}
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
            {(() => {
              // Função ultra-segura para extrair milissegundos
              const getSafeMillis = (ts: any) => {
                if (!ts) return 0;
                if (typeof ts.toMillis === 'function') return ts.toMillis();
                if (ts.seconds) return ts.seconds * 1000;
                if (ts instanceof Date) return ts.getTime();
                if (typeof ts === 'number') return ts;
                return 0;
              };

              const myLastReadTs = chat.lastRead?.[userProfile?.uid || ''];
              const myLastReadMillis = getSafeMillis(myLastReadTs);
              let showedNewMessagesDivider = false;

              return filteredMessages.map((msg, index) => {
                // Lógica de divisor de data (Teams Style)
                const currentDate = (msg.createdAt as any)?.toDate?.() || null;
                const previousDate = index > 0 ? (filteredMessages[index - 1].createdAt as any)?.toDate?.() || null : null;
                const showDivider = index === 0 || (currentDate && previousDate && !isSameDay(currentDate, previousDate));

                const msgMillis = getSafeMillis(msg.createdAt);

                // Lógica do divisor de novas mensagens
                const isNewMessage = myLastReadMillis > 0 && msgMillis > myLastReadMillis && msg.senderId !== userProfile?.uid;
                const showNewMessagesDivider = isNewMessage && !showedNewMessagesDivider && !hasInteracted;

                if (showNewMessagesDivider) {
                  showedNewMessagesDivider = true;
                }

                // Calcular se a mensagem foi lida por ALGUÉM além de mim
                const isRead = Object.entries(chat.lastRead || {})
                  .filter(([uid]) => uid !== userProfile?.uid)
                  .some(([_, lastReadTs]) => {
                    const lrMillis = getSafeMillis(lastReadTs);
                    return lrMillis >= msgMillis && msgMillis > 0;
                  });

                // Calcular a lista de usuários específicos que leram esta mensagem
                const readByUsers = Object.entries(chat.lastRead || {})
                  .filter(([uid]) => uid !== msg.senderId)
                  .filter(([_, lastReadTs]) => {
                    const lrMillis = getSafeMillis(lastReadTs);
                    return lrMillis >= msgMillis && msgMillis > 0;
                  })
                  .map(([uid]) => {
                    const profile = teamProfiles.find(p => p.uid === uid);
                    return {
                      uid,
                      displayName: profile?.displayName || 'Membro do CRM',
                      photoURL: profile?.photoURL || ''
                    };
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
                    {showNewMessagesDivider && (
                      <div className="flex items-center gap-4 py-4 px-2 my-2 select-none animate-in fade-in duration-300">
                        <div className="h-[2px] flex-1 bg-gradient-to-r from-transparent to-red-500/50" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-red-500 bg-red-500/10 px-3 py-1 rounded-full border border-red-500/20 shadow-[0_0_8px_rgba(239,68,68,0.2)]">
                          Novas Mensagens
                        </span>
                        <div className="h-[2px] flex-1 bg-gradient-to-r from-red-500/50 to-transparent" />
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
                      onForward={setForwardingMessage}
                      onConvertToTask={async (message) => {
                        const newTask = {
                          id: crypto.randomUUID(),
                          label: `${message.text.replace(/^\[AVISO\]\s*/i, '')} (Chat de ${message.senderName})`,
                          completed: false,
                          createdAt: new Date().toISOString()
                        };
                        await setNexusTasks([...nexusTasks, newTask]);
                        toast.success("Mensagem convertida em Tarefa Rápida com sucesso!");
                        setIsTasksOpen(true);
                      }}
                      readByUsers={readByUsers}
                    />
                  </React.Fragment>
                );
              });
            })()}
          </div>
        )}
      </div>

      {/* Input de Mensagem / Barra de Seleção em Lote */}
      {isSelectionMode ? (
        <div className="bg-primary-500/10 border-t border-primary-500/20 p-4 flex items-center justify-between animate-in slide-in-from-bottom duration-300 z-10">
          <div className="flex items-center gap-3">
            <button 
              onClick={clearSelection}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
              title="Cancelar Seleção"
            >
              <X size={20} />
            </button>
            <span className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-widest">
              {selectedMessageIds.length} mensagem{selectedMessageIds.length > 1 ? 's' : ''} selecionada{selectedMessageIds.length > 1 ? 's' : ''}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => {
                const selectedTexts = messages
                  .filter(m => selectedMessageIds.includes(m.id))
                  .map(m => `[${m.senderName}]: ${m.text || '[Mídia/Anexo]'}`)
                  .join('\n');
                navigator.clipboard.writeText(selectedTexts);
                toast.success('Mensagens copiadas para a área de transferência!');
              }}
              className="px-4 py-2 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-white/10 rounded-xl text-xs font-black uppercase tracking-widest text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-zinc-700 transition-all flex items-center gap-1.5 shadow-sm"
            >
              Copiar
            </button>
            <button 
              onClick={() => setIsForwardBatchOpen(true)}
              className="px-4 py-2 bg-primary-500 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-primary-600 transition-all flex items-center gap-1.5 shadow-lg shadow-primary-500/20"
            >
              Encaminhar
            </button>
            <button 
              onClick={async () => {
                if (!effectiveOrgId) return;
                await batchDelete(effectiveOrgId, chatId!);
              }}
              className="px-4 py-2 bg-red-500 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-red-600 transition-all flex items-center gap-1.5 shadow-lg shadow-red-500/20"
            >
              Excluir
            </button>
          </div>
        </div>
      ) : (
        <MessageInput 
          onSend={(text, mentions, att, reply, membersList, type, poll, approval, richPreview, parentMessageId, scheduledAt, priority, checklist, transcription) => 
            handleSend(text, mentions, att, reply, membersList, type, poll, approval, richPreview, parentMessageId, scheduledAt, priority, checklist, transcription)
          } 
          onTyping={setTypingStatus}
          replyTo={replyingTo ? { messageId: replyingTo.id, text: replyingTo.text, senderName: replyingTo.senderName } : null}
          onCancelReply={() => setReplyingTo(null)}
          editingMessage={editingMessage}
          onCancelEdit={() => setEditingMessage(null)}
          onUpdate={handleUpdate}
          members={chat.members}
          chatId={chatId}
          onEdit={setEditingMessage}
        />
      )}

      {/* Scroll Rápido Estilo Teams */}
      <AnimatePresence>
        {showScrollToBottom && (
          <motion.button
            initial={{ opacity: 0, y: 10, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.9 }}
            onClick={scrollToBottom}
            className="absolute bottom-24 right-6 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md border border-gray-150 dark:border-white/10 px-4 py-2 rounded-full shadow-2xl hover:scale-105 active:scale-95 transition-all text-primary-500 hover:shadow-primary-500/10 flex items-center gap-1.5 z-30 font-black text-[11px] uppercase tracking-wider"
          >
            <ChevronDown size={14} className="animate-bounce" />
            Ir para o fim
          </motion.button>
        )}
      </AnimatePresence>

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

      {forwardingMessage && (
        <ForwardMessageModal 
          isOpen={!!forwardingMessage} 
          onClose={() => setForwardingMessage(null)} 
          message={forwardingMessage} 
        />
      )}

      {isForwardBatchOpen && (
        <ForwardMessageModal 
          isOpen={isForwardBatchOpen} 
          onClose={() => setIsForwardBatchOpen(false)} 
          message={null} 
          isBatch={true}
        />
      )}
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

      {/* Sidebar de Tarefas Rápidas */}
      <AnimatePresence>
        {isTasksOpen && (
          <>
            {/* Backdrop para mobile (clique fora para fechar) */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsTasksOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
            />
            <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-80 lg:relative lg:inset-auto lg:z-0 border-l border-gray-100 dark:border-white/10 bg-white/50 dark:bg-zinc-950/50 backdrop-blur-xl animate-in slide-in-from-right duration-300 flex flex-col h-full">
              <div className="p-4 border-b border-gray-100 dark:border-white/10 flex justify-between items-center bg-white/10">
                <div className="flex items-center gap-2">
                  <CheckSquare size={16} className="text-teal-500" />
                  <h4 className="text-sm font-black uppercase tracking-widest text-gray-900 dark:text-white">Tarefas Rápidas</h4>
                </div>
                <button onClick={() => setIsTasksOpen(false)} className="p-1 hover:bg-black/10 dark:hover:bg-white/10 rounded-full transition-colors">
                  <X size={16} className="text-gray-400" />
                </button>
              </div>

              {/* Input de Nova Tarefa */}
              <div className="p-4 border-b border-gray-100 dark:border-white/5 bg-white/5 flex gap-2">
                <input
                  type="text"
                  placeholder="Nova tarefa rápida..."
                  value={newTaskText}
                  onChange={(e) => setNewTaskText(e.target.value)}
                  onKeyDown={async (e) => {
                    if (e.key === 'Enter' && newTaskText.trim()) {
                      const newTask = {
                        id: crypto.randomUUID(),
                        label: newTaskText,
                        completed: false,
                        createdAt: new Date().toISOString()
                      };
                      await setNexusTasks([...nexusTasks, newTask]);
                      setNewTaskText('');
                      toast.success("Tarefa rápida adicionada!");
                    }
                  }}
                  className="flex-1 bg-white/5 border border-white/10 text-xs rounded-xl px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-teal-500/50"
                />
                <button
                  onClick={async () => {
                    if (!newTaskText.trim()) return;
                    const newTask = {
                      id: crypto.randomUUID(),
                      label: newTaskText,
                      completed: false,
                      createdAt: new Date().toISOString()
                    };
                    await setNexusTasks([...nexusTasks, newTask]);
                    setNewTaskText('');
                    toast.success("Tarefa rápida adicionada!");
                  }}
                  className="px-3 bg-teal-500 hover:bg-teal-600 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-teal-500/20"
                >
                  +
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-2">
                {nexusTasks.map((task) => (
                  <div 
                    key={task.id} 
                    className="flex items-center gap-3 p-3 rounded-2xl bg-white/5 border border-white/5 hover:border-teal-500/20 transition-all group/task"
                  >
                    <button
                      onClick={async () => {
                        const updated = nexusTasks.map(t => t.id === task.id ? { ...t, completed: !t.completed } : t);
                        await setNexusTasks(updated);
                        if (!task.completed) {
                          toast.success("Tarefa concluída! 🎉");
                        }
                      }}
                      className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-all ${
                        task.completed 
                          ? 'bg-teal-500 border-teal-500 text-white' 
                          : 'border-zinc-500/30 hover:border-teal-500/50'
                      }`}
                    >
                      {task.completed && <Check size={12} className="stroke-[3]" />}
                    </button>
                    <span 
                      className={`text-xs font-semibold flex-1 leading-tight ${
                        task.completed ? 'line-through text-zinc-500 opacity-60' : 'text-zinc-800 dark:text-zinc-200'
                      }`}
                    >
                      {task.label}
                    </span>
                    <button
                      onClick={async () => {
                        const filtered = nexusTasks.filter(t => t.id !== task.id);
                        await setNexusTasks(filtered);
                        toast.info("Tarefa removida.");
                      }}
                      className="opacity-0 group-hover/task:opacity-100 p-1.5 hover:bg-red-500/10 text-zinc-500 hover:text-red-500 rounded-lg transition-all"
                      title="Excluir"
                    >
                      <Trash size={12} />
                    </button>
                  </div>
                ))}

                {nexusTasks.length === 0 && (
                  <div className="flex flex-col items-center justify-center mt-20 opacity-30 text-center px-4">
                    <CheckSquare size={40} className="mb-4 text-zinc-400" />
                    <p className="text-xs font-bold uppercase tracking-widest leading-relaxed">Nenhuma tarefa rápida pendente.</p>
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
