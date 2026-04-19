import React, { useState, useRef, useEffect } from 'react';
import { ExternalLink, MoreVertical, Phone, Video, Search, MessageSquare, Megaphone, Info, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Chat, ChatMessage } from '../../types/chat.types';
import { useChat } from '../../hooks/useChat';
import { useAuth } from '../../contexts/AuthContext';
import { useCRM } from '../../contexts/CRMContext';
import MessageBubble from './MessageBubble';
import MessageInput from './MessageInput';
import GroupSettingsModal from './GroupSettingsModal';

interface ChatWindowProps {
  chatId: string | null;
  chat: Chat | null;
}

export default function ChatWindow({ chatId, chat }: ChatWindowProps) {
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  const { teamProfiles } = useCRM();
  const { messages, typing, sendMessage, setTypingStatus, loading, deleteMessage, toggleReaction, votePoll } = useChat(chatId);
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  // Filtragem de Mensagens (Busca)
  const filteredMessages = messages.filter(msg => 
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
    type: "text" | "poll" = "text",
    poll?: ChatMessage['poll']
  ) => {
    if (!chat) return;
    if (!text.trim() && attachments.length === 0 && type === 'text') return;
    
    await sendMessage(
      text, 
      mentions, 
      attachments, 
      replyTo,
      chat.members,
      type,
      poll
    );
    
    setReplyingTo(null);
  };

  return (
    <div className="flex-1 flex flex-col bg-white dark:bg-black/40">
      {/* Header do Chat */}
      <div className="p-4 border-b border-gray-100 dark:border-white/10 flex items-center justify-between min-h-[73px]">
        <div className="flex items-center gap-3">
          <div 
            onClick={() => otherUserId && navigate(`/profile/${otherUserId}`)}
            className={`w-10 h-10 rounded-xl bg-primary-500/10 flex items-center justify-center border border-primary-500/20 overflow-hidden ${otherUserId ? 'cursor-pointer hover:scale-105 transition-transform' : ''}`}
          >
            {displayPhoto ? (
              <img src={displayPhoto} alt="" className="w-full h-full object-cover" />
            ) : (
              <MessageSquare size={20} className="text-primary-500" />
            )}
          </div>
          {!isSearchOpen ? (
            <div>
              <h3 className="font-bold text-gray-900 dark:text-white leading-none mb-1">{displayName}</h3>
              {typing.length > 0 ? (
                <p className="text-[10px] text-primary-500 font-bold animate-pulse">
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
                  <p className="text-[10px] text-gray-400 font-medium uppercase tracking-widest">
                    {chat.type === 'self' ? 'Suas Anotações Privadas' : 
                     chat.type === 'direct' ? (
                       isOnline ? 'Online agora' : 
                       status === 'away' ? 'Ausente' : 
                       status === 'lunch' ? 'Em Almoço' :
                       status === 'meeting' ? 'Em Reunião' :
                       'Offline'
                     ) :
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
              <Search size={18} />
            </button>
          )}
          <button 
            onClick={() => setIsSettingsOpen(true)}
            className="p-2.5 text-gray-400 hover:text-primary-500 hover:bg-primary-500/5 rounded-xl transition-all" 
            title="Dados do Grupo"
          >
            <Info size={18} />
          </button>
          <button 
            onClick={() => window.open('/chat?standalone=true', '_blank')}
            className="p-2.5 text-gray-400 hover:text-primary-500 hover:bg-primary-500/5 rounded-xl transition-all" 
            title="Abrir em Nova Aba"
          >
            <ExternalLink size={18} />
          </button>
          <div className="relative">
            <button 
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-2.5 text-gray-400 hover:text-primary-500 hover:bg-primary-500/5 rounded-xl transition-all"
            >
              <MoreVertical size={18} />
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
            {filteredMessages.map((msg) => {
              // Calcular se a mensagem foi lida por ALGUÉM além de mim
              const isRead = Object.entries(chat.lastRead || {})
                .filter(([uid]) => uid !== userProfile?.uid)
                .some(([_, lastReadTs]) => {
                  const lrMillis = (lastReadTs as any)?.toMillis?.() || 0;
                  const msgMillis = (msg.createdAt as any)?.toMillis?.() || 0;
                  return lrMillis >= msgMillis && msgMillis > 0;
                });

              return (
                <MessageBubble 
                  key={msg.id}
                  message={msg} 
                  isRead={isRead} 
                  onDelete={deleteMessage}
                  onReply={setReplyingTo}
                  onReact={toggleReaction}
                  onVote={votePoll}
                />
              );
            })}
          </div>
        )}
      </div>

      {/* Input de Mensagem */}
      <MessageInput 
        onSend={(text, mentions, att, reply, membersList, type, poll) => handleSend(text, mentions, att, reply, membersList, type, poll)} 
        onTyping={setTypingStatus}
        replyTo={replyingTo ? { messageId: replyingTo.id, text: replyingTo.text, senderName: replyingTo.senderName } : null}
        onCancelReply={() => setReplyingTo(null)}
        members={chat.members}
      />

      <GroupSettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
        chat={chat} 
      />
    </div>
  );
}
