import React, { useState, useEffect } from 'react';
import { useUI } from '../contexts/UIContext';
import { useChatList } from '../hooks/useChatList';
import { useAuth } from '../contexts/AuthContext';
import { useCRM } from '../contexts/CRMContext';
import { db } from '../lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import ChatSidebar from '../components/chat/ChatSidebar';
import ChatWindow from '../components/chat/ChatWindow';
import { Chat } from '../types/chat.types';

export default function ChatView() {
  const { userProfile } = useAuth();
  const { effectiveOrgId } = useCRM();
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

  // Provisão Automática de "Meu Espaço"
  useEffect(() => {
    if (loading || !userProfile?.uid || !effectiveOrgId) return;

    const hasSelf = chats.some(c => c.type === 'self');
    if (!hasSelf) {
      const createSelfChat = async () => {
        try {
          await addDoc(collection(db, 'organizations', effectiveOrgId, 'chats'), {
            name: 'Meu Espaço',
            type: 'self',
            orgId: effectiveOrgId,
            members: [userProfile.uid],
            adminIds: [userProfile.uid],
            lastMessage: null,
            unreadCount: { [userProfile.uid]: 0 },
            unreadMentions: { [userProfile.uid]: 0 },
            lastRead: { [userProfile.uid]: serverTimestamp() },
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          });
        } catch (error) {
          console.error("Erro ao criar Meu Espaço:", error);
        }
      };
      createSelfChat();
    }
  }, [chats, loading, userProfile?.uid, effectiveOrgId]);

  const selectedChat = chats.find(c => c.id === selectedChatId) || null;

  return (
    <div className="flex h-full bg-white dark:bg-black/40 backdrop-blur-xl animate-in fade-in duration-500">
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
