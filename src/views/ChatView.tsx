import React, { useState, useEffect } from 'react';
import { useUI } from '../contexts/UIContext';
import { useChatList } from '../hooks/useChatList';
import ChatSidebar from '../components/chat/ChatSidebar';
import ChatWindow from '../components/chat/ChatWindow';
import { Chat } from '../types/chat.types';

export default function ChatView() {
  const { setFocusMode, focusMode, setSidebarOpen } = useUI();
  const { chats, loading } = useChatList();
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);

  // Ativar Modo Foco ao entrar no Chat e fechar a sidebar do CRM
  useEffect(() => {
    const originalFocus = focusMode;
    setFocusMode(true);
    setSidebarOpen(false);

    return () => {
      setFocusMode(originalFocus);
    };
  }, []);

  const selectedChat = chats.find(c => c.id === selectedChatId) || null;

  return (
    <div className="flex h-full md:m-2 bg-white dark:bg-black/40 backdrop-blur-xl md:border border-gray-200 dark:border-white/10 md:rounded-[2rem] overflow-hidden shadow-2xl animate-in fade-in duration-500">
      {/* Sidebar do Chat */}
      <div className={`flex-col ${selectedChatId ? 'hidden md:flex' : 'flex w-full md:w-80'}`}>
        <ChatSidebar
          chats={chats}
          loading={loading}
          selectedId={selectedChatId}
          onSelect={setSelectedChatId}
        />
      </div>

      {/* Janela de Mensagens */}
      <div className={`flex-1 flex-col ${selectedChatId ? 'flex' : 'hidden md:flex'}`}>
        <ChatWindow
          chatId={selectedChatId}
          chat={selectedChat}
          onBack={() => setSelectedChatId(null)}
        />
      </div>
    </div>
  );
}
