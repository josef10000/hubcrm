import React, { useState, useEffect } from 'react';
import { useUI } from '@/contexts/UIContext';
import { useChatList } from '@/hooks/useChatList';
import ChatSidebar from '@chat/components/ChatSidebar';
import ChatWindow from '@chat/components/ChatWindow';
import { Chat } from '@/types/chat.types';
import { useSearchParams } from 'react-router-dom';

interface OfficeChatContext {
  agentName: string;
  role: string;
  task: string;
}

export default function ChatView() {
  const { setFocusMode, focusMode, setSidebarOpen } = useUI();
  const { chats, loading } = useChatList();
  const [searchParams] = useSearchParams();
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [officeContext, setOfficeContext] = useState<OfficeChatContext | null>(() => {
    if (!searchParams.has('officeContext')) return null;
    try {
      const value = JSON.parse(sessionStorage.getItem('hub-office-chat-context-v1') || 'null');
      return value && typeof value.agentName === 'string' && typeof value.role === 'string' && typeof value.task === 'string' ? value : null;
    } catch { return null; }
  });

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
    <div className="m-2 flex h-full flex-col overflow-hidden rounded-[2rem] border border-gray-200 bg-white shadow-2xl animate-in fade-in duration-500 dark:border-white/10 dark:bg-black/40 dark:backdrop-blur-xl">
      {officeContext && <div className="flex shrink-0 items-center gap-3 border-b border-primary-500/15 bg-primary-500/[0.06] px-4 py-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary-500/10 text-primary-400">✦</span>
        <div className="min-w-0 flex-1"><p className="text-[10px] font-semibold uppercase tracking-[.12em] text-primary-500">Contexto do Hub Office</p><p className="truncate text-xs text-text-main"><strong>{officeContext.agentName}</strong> · {officeContext.role} · {officeContext.task}</p></div>
        <button type="button" className="shrink-0 rounded-lg px-2 py-1 text-xs text-text-muted hover:bg-black/5 dark:hover:bg-white/10" onClick={() => setOfficeContext(null)}>Dispensar</button>
      </div>}
      <div className="flex min-h-0 flex-1">
        <ChatSidebar chats={chats} loading={loading} selectedId={selectedChatId} onSelect={setSelectedChatId} />
        <ChatWindow chatId={selectedChatId} chat={selectedChat} />
      </div>
    </div>
  );
}
