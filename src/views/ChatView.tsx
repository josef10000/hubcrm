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
    <div className="flex h-full m-2 bg-white dark:bg-black/40 backdrop-blur-xl border border-gray-200 dark:border-white/10 rounded-[2rem] overflow-hidden shadow-2xl animate-in fade-in duration-500">
      {/* Sidebar do Chat */}
      <ChatSidebar
        chats={chats}
        loading={loading}
        selectedId={selectedChatId}
        onSelect={setSelectedChatId}
      />

      {/* Janela de Mensagens */}
      <ChatWindow
        chatId={selectedChatId}
        chat={selectedChat}
      />
    </div>
  );
}
