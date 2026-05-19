import React from 'react';
import { X, MessageSquareText, Hash } from 'lucide-react';
import { ChatMessage, Chat } from '@/types/chat.types';
import MessageBubble from './MessageBubble';
import MessageInput from './MessageInput';
import { useChat } from '@/hooks/useChat';
import { useAuth } from '@auth/contexts/AuthContext';
import { Timestamp } from 'firebase/firestore';

interface ThreadSidebarProps {
  parentMessage: ChatMessage;
  chat: Chat;
  onClose: () => void;
}

export default function ThreadSidebar({ parentMessage, chat, onClose }: ThreadSidebarProps) {
  const { userProfile } = useAuth();
  const { 
    messages, typing, sendMessage, setTypingStatus, deleteMessage, 
    toggleReaction, votePoll, togglePin, unpinMessage, toggleBookmark, respondApproval,
    editMessage 
  } = useChat(chat.id); // Reutilizamos useChat, mas filtraremos mensagens no render

  const [editingMessage, setEditingMessage] = React.useState<ChatMessage | null>(null);

  // Filtrar apenas mensagens que pertencem a esta thread ou a mensagem pai
  const threadMessages = messages.filter(m => m.parentMessageId === parentMessage.id);

  const handleUpdate = async (text: string) => {
    if (!editingMessage) return;
    await editMessage(editingMessage.id, text);
    setEditingMessage(null);
  };

  const handleSendReply = async (
    text: string, 
    mentions: string[], 
    attachments: string[], 
    replyTo: any, 
    members: string[], 
    type: any, 
    poll: any, 
    approval: any,
    richPreview?: any,
    parentMessageId?: string,
    scheduledAt?: Timestamp
  ) => {
    await sendMessage(
      text, 
      mentions, 
      attachments, 
      replyTo,
      members, 
      type, 
      poll, 
      approval,
      richPreview,
      parentMessageId,
      scheduledAt
    );
  };

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-[400px] lg:relative lg:inset-auto lg:z-0 border-l border-gray-100 dark:border-white/10 bg-white dark:bg-zinc-950 flex flex-col h-full shadow-2xl animate-in slide-in-from-right duration-300">
      {/* Header */}
      <div className="p-4 border-b border-gray-100 dark:border-white/10 flex justify-between items-center bg-gray-50/50 dark:bg-white/5">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-600">
            <MessageSquareText size={18} />
          </div>
          <div>
            <h4 className="text-sm font-black uppercase tracking-widest text-gray-900 dark:text-white">Tópico</h4>
            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-tighter">Conversa em {chat.name}</p>
          </div>
        </div>
        <button onClick={onClose} className="p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-full transition-colors">
          <X size={18} className="text-gray-400" />
        </button>
      </div>

      {/* Mensagem Original */}
      <div className="p-4 border-b border-gray-100 dark:border-white/10 bg-primary-500/5">
        <p className="text-[10px] font-black uppercase text-primary-600 mb-3 tracking-widest flex items-center gap-2">
          <Hash size={10} />
          Mensagem Original
        </p>
        <MessageBubble 
          message={parentMessage} 
          onDelete={async () => false} // Desativar ações na sidebar por simplicidade inicial
        />
      </div>

      {/* Lista de Respostas */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
        {threadMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 opacity-30 text-center">
            <MessageSquareText size={32} className="mb-2" />
            <p className="text-xs font-bold uppercase tracking-widest">Nenhuma resposta ainda.</p>
            <p className="text-[10px] mt-1">Seja o primeiro a responder!</p>
          </div>
        ) : (
          threadMessages.map(msg => (
            <MessageBubble 
              key={msg.id} 
              message={msg} 
              onDelete={deleteMessage}
              onReact={toggleReaction}
              onBookmark={toggleBookmark}
              onEdit={setEditingMessage}
            />
          ))
        )}
      </div>

      {/* Input de Resposta */}
      <div className="p-4 border-t border-gray-100 dark:border-white/10 bg-gray-50/50 dark:bg-white/5">
        <MessageInput 
          onSend={handleSendReply}
          onTyping={() => {}} // Opcional no thread
          members={chat.members}
          onCancelEdit={() => setEditingMessage(null)}
          onCancelReply={() => {}}
          onUpdate={handleUpdate}
          editingMessage={editingMessage}
          replyTo={null}
          parentMessageId={parentMessage.id}
          chatId={chat.id}
        />
      </div>
    </div>
  );
}
