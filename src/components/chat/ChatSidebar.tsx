import React, { useState } from 'react';
import { Search, Plus, MessageCircle, User, Users, Star, Bookmark } from 'lucide-react';
import { Chat } from '../../types/chat.types';
import { formatChatTime } from '../../helpers/chatHelpers';
import { useAuth } from '../../contexts/AuthContext';
import { useCRM } from '../../contexts/CRMContext';
import CreateGroupModal from './CreateGroupModal';
import NewChatModal from './NewChatModal';
import UserStatusSelector from './UserStatusSelector';
import { useBookmarks } from '../../hooks/useBookmarks';

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
  const [activeTab, setActiveTab ] = useState<'chats' | 'saved'>('chats');
  const { bookmarks, loading: bookmarksLoading } = useBookmarks();

  const filteredChats = chats.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="w-80 border-r border-gray-100 dark:border-white/10 flex flex-col bg-gray-50/50 dark:bg-black/20">
      {/* Header da Sidebar */}
      <div className="p-6">
        <div className="mb-6">
          <UserStatusSelector />
        </div>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tighter">Mensagens</h2>
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
            className="w-full bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 pl-10 pr-4 py-2.5 rounded-2xl text-xs focus:outline-none focus:border-primary-500 transition-all dark:text-white"
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
                >
                  {/* Avatar */}
                  <div className="relative shrink-0">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border border-gray-100 dark:border-white/10 overflow-hidden ${
                      isSelected ? 'bg-white/20' : 'bg-white dark:bg-white/10 shadow-sm'
                    }`}>
                      {displayPhoto ? (
                        <img src={displayPhoto} alt="" className="w-full h-full object-cover" />
                      ) : chat.type === 'self' ? (
                        <Star size={20} className={isSelected ? 'text-white' : 'text-amber-500'} />
                      ) : chat.type === 'direct' ? (
                        <User size={20} />
                      ) : (
                        <Users size={20} />
                      )}
                    </div>
                    
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
                                 status === 'lunch' ? 'bg-blue-500' :
                                 status === 'meeting' ? 'bg-purple-500' :
                                 'bg-gray-400';
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
                      <h3 className={`text-sm font-bold truncate ${isSelected ? 'text-white' : 'text-gray-900 dark:text-white'}`}>
                        {displayName}
                      </h3>
                      <span className={`text-[10px] font-medium shrink-0 ${isSelected ? 'text-white/60' : 'text-gray-400'}`}>
                        {chat.lastMessage ? formatChatTime(chat.lastMessage.createdAt.toMillis()) : ''}
                      </span>
                    </div>
                    <p className={`text-[11px] truncate leading-tight ${isSelected ? 'text-white/80' : 'text-gray-500 dark:text-gray-400'}`}>
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
                        <div className="bg-primary-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-md shadow-lg shadow-primary-500/20">
                          {unread > 9 ? '9+' : unread}
                        </div>
                      )}
                    </div>
                  )}
                </button>
              );
            })
          )
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
              bookmarks.map((b) => (
                <div 
                  key={b.id}
                  className="p-3 bg-white dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-2xl hover:border-primary-500/30 transition-all group cursor-pointer"
                  onClick={() => onSelect(b.chatId)}
                >
                  <div className="flex justify-between items-start mb-1">
                    <span className="text-[10px] font-bold text-primary-500 uppercase tracking-tighter">{b.senderName}</span>
                    <span className="text-[9px] text-gray-400">{formatChatTime(b.savedAt.toDate())}</span>
                  </div>
                  <p className="text-[11px] text-gray-600 dark:text-gray-400 line-clamp-2 leading-tight">
                    {b.text}
                  </p>
                </div>
              ))
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
    </div>
  );
}
