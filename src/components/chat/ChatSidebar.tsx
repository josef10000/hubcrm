import React, { useState } from 'react';
import { Search, Plus, MessageCircle, User, Users, Star, Bookmark, Calendar, BellOff, Bell, Trash2, ShieldOff, Hash, Compass } from 'lucide-react';
import { db } from '../../lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { toast } from 'sonner';
import { Chat } from '../../types/chat.types';
import { formatChatTime } from '../../helpers/chatHelpers';
import { useAuth } from '../../contexts/AuthContext';
import { useCRM } from '../../contexts/CRMContext';
import CreateGroupModal from './CreateGroupModal';
import NewChatModal from './NewChatModal';
import UserStatusSelector from './UserStatusSelector';
import { useBookmarks } from '../../hooks/useBookmarks';
import CreateChannelModal from './CreateChannelModal';
import ExploreChannelsModal from './ExploreChannelsModal';

interface ChatSidebarProps {
  chats: Chat[];
  loading: boolean;
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export default function ChatSidebar({ chats, loading, selectedId, onSelect }: ChatSidebarProps) {
  const { userProfile } = useAuth();
  const { teamProfiles } = useCRM();
  const [searchTerm, setSearchTerm] = useState('');
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [isNewChatModalOpen, setIsNewChatModalOpen] = useState(false);
  const [activeTab, setActiveTab ] = useState<'chats' | 'channels' | 'saved'>('chats');
  const [selectedCategory, setSelectedCategory] = useState<string>('todos');
  const { bookmarks, loading: bookmarksLoading, updateBookmark } = useBookmarks();
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, chatId: string } | null>(null);
  const { effectiveOrgId } = useCRM();
  const [isChannelModalOpen, setIsChannelModalOpen] = useState(false);
  const [isExploreOpen, setIsExploreOpen] = useState(false);

  const categories = ['todos', ...new Set(bookmarks.filter(b => b.category).map(b => b.category!))];

  const filteredChats = chats.filter(c => 
    c.type !== 'channel' && c.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredChannels = chats.filter(c => 
    c.type === 'channel' && c.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const isAdmin = userProfile?.role?.id === 'ROLE_ADMIN' || userProfile?.role?.level === 0;

  const handleToggleMute = async (chat: Chat) => {
    if (!userProfile?.uid || !effectiveOrgId) return;
    
    const isMuted = chat.muted?.[userProfile.uid] || false;
    try {
      await updateDoc(doc(db, 'organizations', effectiveOrgId, 'chats', chat.id), {
        [`muted.${userProfile.uid}`]: !isMuted
      });
      toast.success(isMuted ? 'Notificações ativadas' : 'Conversa silenciada');
    } catch (error) {
      toast.error('Erro ao alterar notificações');
    }
    setContextMenu(null);
  };

  return (
    <div className="w-80 border-r border-gray-100 dark:border-white/10 flex flex-col bg-gray-50/50 dark:bg-black/20">
      {/* Header da Sidebar */}
      <div className="p-6">
        <div className="mb-6">
          <UserStatusSelector />
        </div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white uppercase tracking-tighter">Mensagens</h2>
          <div className="flex gap-2">
            <button 
              onClick={() => setIsNewChatModalOpen(true)}
              title="Nova Conversa 1:1"
              className="p-2 bg-white dark:bg-white/10 text-gray-600 dark:text-white border border-gray-200 dark:border-white/10 rounded-xl shadow-sm hover:scale-105 transition-transform"
            >
              <MessageCircle size={18} />
            </button>
            <button 
              onClick={() => setIsGroupModalOpen(true)}
              title="Criar Novo Grupo"
              className="p-2 bg-primary-500 text-white rounded-xl shadow-lg shadow-primary-500/20 hover:scale-105 transition-transform"
            >
              <Plus size={18} />
            </button>
          </div>
        </div>

        {/* Busca */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input 
            type="text" 
            placeholder="Buscar conversas..."
            className="w-full bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 pl-10 pr-4 py-2.5 rounded-2xl text-sm focus:outline-none focus:border-primary-500 transition-all dark:text-white"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="px-6 pb-2 flex gap-4 border-b border-gray-100 dark:border-white/5 mb-2">
        <button 
          onClick={() => setActiveTab('chats')}
          className={`pb-2 text-xs font-bold uppercase tracking-widest transition-all relative ${
            activeTab === 'chats' ? 'text-primary-500' : 'text-gray-400 hover:text-gray-600'
          }`}
        >
          Conversas
          {activeTab === 'chats' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-500 rounded-full" />}
        </button>
        <button 
          onClick={() => setActiveTab('saved')}
          className={`pb-2 text-xs font-bold uppercase tracking-widest transition-all relative ${
            activeTab === 'saved' ? 'text-primary-500' : 'text-gray-400 hover:text-gray-600'
          }`}
        >
          Salvos
          {activeTab === 'saved' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-500 rounded-full" />}
        </button>
        <button 
          onClick={() => setActiveTab('channels')}
          className={`pb-2 text-xs font-bold uppercase tracking-widest transition-all relative ${
            activeTab === 'channels' ? 'text-violet-500' : 'text-gray-400 hover:text-gray-600'
          }`}
        >
          Canais
          {activeTab === 'channels' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-violet-500 rounded-full" />}
        </button>
      </div>

      {/* Lista de Chats */}
      <div className="flex-1 overflow-y-auto custom-scrollbar px-3 space-y-1">
        {activeTab === 'chats' ? (
          filteredChats.length === 0 ? (
            <div className="p-8 text-center opacity-40">
              <MessageCircle size={32} className="mx-auto mb-2" />
              <p className="text-xs font-medium">Nenhuma conversa encontrada</p>
            </div>
          ) : (
            filteredChats.map(chat => {
              const isSelected = selectedId === chat.id;
              const unread = chat.unreadCount?.[userProfile?.uid || ''] || 0;
              const mention = chat.unreadMentions?.[userProfile?.uid || ''] || 0;

              // Lógica de Identidade do Chat
              let displayName = chat.name;
              let displayPhoto = '';
              
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
              
              return (
                <button
                  key={chat.id}
                  onClick={() => onSelect(chat.id)}
                  className={`w-full flex items-center gap-3 p-3 rounded-2xl transition-all relative group ${
                    isSelected 
                      ? 'bg-primary-500 text-white shadow-xl shadow-primary-500/20 scale-[1.02]' 
                      : 'hover:bg-white dark:hover:bg-white/5 text-gray-600 dark:text-gray-400'
                  }`}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    setContextMenu({ x: e.clientX, y: e.clientY, chatId: chat.id });
                  }}
                >
                  {/* Avatar */}
                  <div className="relative shrink-0">
                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center border border-gray-100 dark:border-white/10 overflow-hidden ${
                      isSelected ? 'bg-white/20' : 'bg-white dark:bg-white/10 shadow-sm'
                    }`}>
                      {displayPhoto ? (
                        <img src={displayPhoto} alt="" className="w-full h-full object-cover" />
                      ) : chat.type === 'self' ? (
                        <Star size={18} className={isSelected ? 'text-white' : 'text-amber-500'} />
                      ) : chat.type === 'direct' ? (
                        <User size={18} />
                      ) : (
                        <Users size={18} />
                      )}
                    </div>

                    {/* Indicador de Silenciado */}
                    {chat.muted?.[userProfile?.uid || ''] && (
                      <div className={`absolute -top-1 -left-1 w-4 h-4 rounded-full flex items-center justify-center border-2 shadow-sm z-20 ${
                        isSelected ? 'bg-white text-primary-500 border-primary-500' : 'bg-gray-400 text-white border-gray-50 dark:border-zinc-900'
                      }`}>
                        <BellOff size={8} />
                      </div>
                    )}
                    
                    {chat.type === 'direct' && (
                      <div className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 ${isSelected ? 'border-primary-500' : 'border-gray-50 dark:border-zinc-900'} ${
                        (() => {
                          const otherUserId = chat.members.find(id => id !== userProfile?.uid);
                          const otherUser = teamProfiles.find(p => p.uid === otherUserId);
                          const status = otherUser?.presenceStatus || 'offline';
                          const lastSeen = otherUser?.lastSeen;
                          const isOnline = status === 'online' && (Date.now() - (lastSeen || 0) < 120000);
                          
                          return isOnline ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 
                                 status === 'away' ? 'bg-amber-500' : 
                                 status === 'lunch' ? 'bg-rose-500' :
                                 status === 'meeting' ? 'bg-blue-500' :
                                 'bg-gray-500';
                        })()
                      }`} title={(() => {
                          const otherUserId = chat.members.find(id => id !== userProfile?.uid);
                          const otherUser = teamProfiles.find(p => p.uid === otherUserId);
                          const status = otherUser?.presenceStatus || 'offline';
                          const lastSeen = otherUser?.lastSeen;
                          const isOnline = status === 'online' && (Date.now() - (lastSeen || 0) < 120000);
                          return isOnline ? 'Online' : 
                                 status === 'away' ? 'Ausente' : 
                                 status === 'lunch' ? 'Em Almoço' :
                                 status === 'meeting' ? 'Em Reunião' :
                                 'Offline';
                      })()} />
                    )}
                  </div>

                  {/* Conteúdo */}
                  <div className="flex-1 text-left min-w-0">
                    <div className="flex justify-between items-start mb-0.5">
                      <div className="flex items-center gap-2 min-w-0">
                        <h3 className={`text-base font-semibold truncate ${isSelected ? 'text-white' : 'text-gray-900 dark:text-white'}`}>
                          {displayName}
                        </h3>
                        {chat.type === 'direct' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              const otherUserId = chat.members.find(id => id !== userProfile?.uid);
                              if (otherUserId) window.location.href = `/profile/${otherUserId}?tab=availability`;
                            }}
                            className={`p-1 rounded-lg transition-colors ${isSelected ? 'text-white/40 hover:text-white/80 hover:bg-white/10' : 'text-gray-400 hover:text-primary-500 hover:bg-primary-500/10'}`}
                            title="Ver Disponibilidade"
                          >
                            <Calendar size={14} />
                          </button>
                        )}
                      </div>
                      <span className={`text-xs font-medium shrink-0 ${isSelected ? 'text-white/60' : 'text-gray-400'}`}>
                        {chat.lastMessage?.createdAt?.toMillis ? formatChatTime(chat.lastMessage.createdAt?.toMillis ? chat.lastMessage.createdAt.toMillis() : 0) : ''}
                      </span>
                    </div>
                    <p className={`text-sm truncate leading-tight ${isSelected ? 'text-white/80' : 'text-gray-500 dark:text-gray-400'}`}>
                      {chat.lastMessage ? (
                        <>
                          <span className="font-bold mr-1">{chat.lastMessage.senderId === userProfile?.uid ? 'Você:' : chat.lastMessage.senderName.split(' ')[0] + ':'}</span>
                          {chat.lastMessage.text}
                        </>
                      ) : 'Nenhuma mensagem'}
                    </p>
                  </div>

                  {/* Badges de Notificação */}
                  {(unread > 0 || mention > 0) && !isSelected && (
                    <div className="flex flex-col gap-1 absolute right-2 top-1/2 -translate-y-1/2">
                      {mention > 0 && (
                        <div className="h-5 min-w-[20px] px-1 bg-red-500 text-white text-[10px] font-black rounded-full flex items-center justify-center shadow-lg animate-pulse border-2 border-white dark:border-zinc-900">
                          @
                        </div>
                      )}
                      {unread > 0 && (
                        <div className="bg-primary-500 text-white text-xs font-black px-1.5 py-0.5 rounded-md shadow-lg shadow-primary-500/20">
                          {unread > 9 ? '9+' : unread}
                        </div>
                      )}
                    </div>
                  )}
                </button>
              );
            })
          )
        ) : activeTab === 'channels' ? (
          <div className="space-y-2 px-1">
            {/* Ações do Canal */}
            <div className="flex gap-2 mb-3">
              {isAdmin && (
                <button
                  onClick={() => setIsChannelModalOpen(true)}
                  className="flex-1 flex items-center justify-center gap-2 p-3 bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-violet-500/20 hover:scale-[1.02] active:scale-95 transition-all"
                >
                  <Plus size={14} />
                  Criar Canal
                </button>
              )}
              <button
                onClick={() => setIsExploreOpen(true)}
                className="flex-1 flex items-center justify-center gap-2 p-3 bg-white dark:bg-white/5 text-gray-700 dark:text-gray-300 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-gray-200 dark:border-white/10 hover:border-violet-500/30 hover:scale-[1.02] active:scale-95 transition-all"
              >
                <Compass size={14} />
                Explorar
              </button>
            </div>

            {filteredChannels.length === 0 ? (
              <div className="p-8 text-center opacity-40">
                <Hash size={32} className="mx-auto mb-2" />
                <p className="text-xs font-medium">Nenhum canal encontrado</p>
                <p className="text-[10px] mt-1">Explore para encontrar canais disponíveis</p>
              </div>
            ) : (
              filteredChannels.map(channel => {
                const isSelected = selectedId === channel.id;
                const unread = channel.unreadCount?.[userProfile?.uid || ''] || 0;

                return (
                  <button
                    key={channel.id}
                    onClick={() => onSelect(channel.id)}
                    className={`w-full flex items-center gap-3 p-3 rounded-2xl transition-all relative group ${
                      isSelected 
                        ? 'bg-violet-500 text-white shadow-xl shadow-violet-500/20 scale-[1.02]' 
                        : 'hover:bg-white dark:hover:bg-white/5 text-gray-600 dark:text-gray-400'
                    }`}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      setContextMenu({ x: e.clientX, y: e.clientY, chatId: channel.id });
                    }}
                  >
                    {/* Avatar do Canal */}
                    <div className="relative shrink-0">
                      <div className={`w-10 h-10 rounded-2xl flex items-center justify-center border overflow-hidden ${
                        isSelected ? 'bg-white/20 border-white/20' : 'bg-white dark:bg-white/10 border-gray-100 dark:border-white/10 shadow-sm'
                      }`}>
                        {channel.avatarUrl ? (
                          <img src={channel.avatarUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-xl">{channel.icon || '📢'}</span>
                        )}
                      </div>

                      {/* Indicador de Silenciado */}
                      {channel.muted?.[userProfile?.uid || ''] && (
                        <div className={`absolute -top-1 -left-1 w-4 h-4 rounded-full flex items-center justify-center border-2 shadow-sm z-20 ${
                          isSelected ? 'bg-white text-violet-500 border-violet-500' : 'bg-gray-400 text-white border-gray-50 dark:border-zinc-900'
                        }`}>
                          <BellOff size={8} />
                        </div>
                      )}
                    </div>

                    {/* Conteúdo */}
                    <div className="flex-1 min-w-0 text-left">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className={`text-sm font-black tracking-tight truncate ${isSelected ? 'text-white' : 'text-gray-900 dark:text-white'}`}>
                          #{channel.name}
                        </span>
                        {channel.category && (
                          <span className={`text-[7px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-full ${
                            isSelected ? 'bg-white/20 text-white' : 'bg-violet-500/10 text-violet-500'
                          }`}>
                            {channel.category}
                          </span>
                        )}
                      </div>
                      <p className={`text-[11px] truncate ${isSelected ? 'text-white/70' : 'text-gray-500'}`}>
                        {channel.lastMessage ? channel.lastMessage.text : (channel.description || `${channel.members.length} membros`)}
                      </p>
                    </div>

                    {/* Badges */}
                    {unread > 0 && (
                      <div className="bg-violet-500 text-white text-xs font-black px-1.5 py-0.5 rounded-md shadow-lg shadow-violet-500/20">
                        {unread > 9 ? '9+' : unread}
                      </div>
                    )}
                  </button>
                );
              })
            )}
          </div>
        ) : (
          <div className="space-y-1">
            {bookmarksLoading ? (
              <div className="p-8 text-center animate-pulse">
                <div className="w-12 h-12 bg-gray-200 dark:bg-white/10 rounded-full mx-auto mb-3" />
                <p className="text-[10px] uppercase font-bold text-gray-400">Carregando salvos...</p>
              </div>
            ) : bookmarks.length === 0 ? (
              <div className="p-8 text-center opacity-40">
                <Bookmark size={32} className="mx-auto mb-2" />
                <p className="text-xs font-medium uppercase tracking-widest">Itens Salvos</p>
                <p className="text-[10px] mt-2 leading-relaxed">Você ainda não salvou nenhuma mensagem para acesso rápido.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Filtro de Categorias */}
                {categories.length > 1 && (
                  <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar-hide">
                    {categories.map(cat => (
                      <button
                        key={cat}
                        onClick={() => setSelectedCategory(cat)}
                        className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap border ${
                          selectedCategory === cat 
                            ? 'bg-primary-500 text-white border-primary-500 shadow-lg shadow-primary-500/20' 
                            : 'bg-white dark:bg-white/5 text-gray-400 border-gray-100 dark:border-white/10 hover:border-primary-500/30'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                )}

                {bookmarks
                  .filter(b => selectedCategory === 'todos' || b.category === selectedCategory)
                  .map((b) => (
                    <div 
                      key={b.id}
                      className="p-3 bg-white dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-2xl hover:border-primary-500/30 transition-all group cursor-pointer relative"
                      onClick={() => onSelect(b.chatId)}
                    >
                      {b.category && (
                        <div 
                          className="absolute top-3 right-3 w-2 h-2 rounded-full shadow-sm"
                          style={{ backgroundColor: b.categoryColor || '#3B82F6' }}
                          title={b.category}
                        />
                      )}
                      <div className="flex justify-between items-start mb-1 pr-4">
                        <span className="text-sm font-bold text-primary-500 uppercase tracking-tighter">{b.senderName}</span>
                        <span className="text-xs text-gray-400">{b.savedAt ? formatChatTime(b.savedAt.toDate()) : '...'}</span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 leading-tight">
                        {b.text}
                      </p>
                      
                      {/* Ações Rápidas (Categoria) */}
                      <div className="mt-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                         {['Urgente', 'Regra', 'Ideia'].map(cat => (
                           <button
                             key={cat}
                             onClick={(e) => {
                               e.stopPropagation();
                               updateBookmark(b.id, { 
                                 category: cat, 
                                 categoryColor: cat === 'Urgente' ? '#EF4444' : cat === 'Regra' ? '#10B981' : '#F59E0B'
                               });
                             }}
                             className="text-[9px] font-bold px-2 py-0.5 rounded-md bg-gray-100 dark:bg-white/10 hover:bg-primary-500 hover:text-white transition-colors"
                           >
                             + {cat}
                           </button>
                         ))}
                      </div>
                    </div>
                  ))
                }
              </div>
            )}
          </div>
        )}
      </div>

      <NewChatModal
        isOpen={isNewChatModalOpen}
        onClose={() => setIsNewChatModalOpen(false)}
        onSelect={onSelect}
      />

      <CreateGroupModal 
        isOpen={isGroupModalOpen} 
        onClose={() => setIsGroupModalOpen(false)} 
        onSuccess={onSelect}
      />

      <CreateChannelModal
        isOpen={isChannelModalOpen}
        onClose={() => setIsChannelModalOpen(false)}
        onSuccess={onSelect}
      />

      <ExploreChannelsModal
        isOpen={isExploreOpen}
        onClose={() => setIsExploreOpen(false)}
        onJoin={onSelect}
        currentChats={chats}
      />

      {/* Menu de Contexto */}
      {contextMenu && (
        <>
          <div className="fixed inset-0 z-[110]" onClick={() => setContextMenu(null)} onContextMenu={(e) => { e.preventDefault(); setContextMenu(null); }} />
          <div 
            className="fixed z-[120] w-56 bg-white dark:bg-zinc-900 border border-gray-100 dark:border-white/10 rounded-2xl shadow-2xl py-2 animate-in fade-in zoom-in-95 duration-200"
            style={{ left: contextMenu.x, top: contextMenu.y }}
          >
            {(() => {
              const chat = chats.find(c => c.id === contextMenu.chatId);
              if (!chat) return null;
              const isMuted = chat.muted?.[userProfile?.uid || ''] || false;

              return (
                <>
                  <div className="px-4 py-2 mb-1 border-b border-gray-100 dark:border-white/5">
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Opções de Conversa</p>
                  </div>
                  <button 
                    onClick={() => handleToggleMute(chat)}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-bold text-gray-700 dark:text-gray-300 hover:bg-primary-500 hover:text-white transition-colors"
                  >
                    {isMuted ? <Bell size={16} /> : <BellOff size={16} />}
                    {isMuted ? 'Ativar Notificações' : 'Silenciar Notificações'}
                  </button>
                  <button className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-bold text-gray-700 dark:text-gray-300 hover:bg-primary-500 hover:text-white transition-colors">
                    <Star size={16} />
                    Favoritar Conversa
                  </button>
                  <div className="h-px bg-gray-100 dark:bg-white/5 my-1" />
                  <button className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-bold text-red-500 hover:bg-red-500 hover:text-white transition-colors">
                    <Trash2 size={16} />
                    Apagar Histórico
                  </button>
                </>
              );
            })()}
          </div>
        </>
      )}
    </div>
  );
}
