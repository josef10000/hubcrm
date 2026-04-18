import React from 'react';
import { ChatMessage } from '../../types/chat.types';
import { formatChatTime } from '../../helpers/chatHelpers';
import { useAuth } from '../../contexts/AuthContext';
import { User, Paperclip, Check, CheckCheck } from 'lucide-react';

interface MessageBubbleProps {
  message: ChatMessage;
  isRead?: boolean;
}

export default function MessageBubble({ message, isRead }: MessageBubbleProps) {
  const { userProfile } = useAuth();
  const isMine = message.senderId === userProfile?.uid;

  return (
    <div className={`flex flex-col mb-4 ${isMine ? 'items-end' : 'items-start'} group animate-in fade-in slide-in-from-bottom-2 duration-300`}>
      {/* ... conteúdo anterior ... */}
      <div className={`flex items-end gap-2 max-w-[80%] ${isMine ? 'flex-row-reverse' : ''}`}>
        {/* Avatar */}
        {!isMine && (
          <div className="w-8 h-8 rounded-xl bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 overflow-hidden flex items-center justify-center shrink-0 shadow-sm mb-1">
            {message.senderPhotoURL ? <img src={message.senderPhotoURL} alt="" /> : <User size={14} className="text-gray-400" />}
          </div>
        )}

        <div className="flex flex-col flex-1">
          {/* Citação de Resposta (Reply) */}
          {message.replyTo && (
            <div className={`text-[10px] p-2 rounded-t-xl border-l-2 bg-gray-100 dark:bg-white/5 border-gray-300 dark:border-white/20 mb-[-8px] pb-3 truncate ${isMine ? 'text-right rounded-tr-none' : 'text-left rounded-tl-none'}`}>
              <span className="font-bold block mb-0.5">{message.replyTo.senderName}</span>
              {message.replyTo.text}
            </div>
          )}

          {/* Conteúdo da Mensagem */}
          <div className={`p-4 rounded-[1.5rem] shadow-sm relative ${
            isMine 
              ? 'bg-primary-500 text-white rounded-tr-none' 
              : 'bg-white dark:bg-zinc-800 text-gray-800 dark:text-gray-100 border border-gray-100 dark:border-white/10 rounded-tl-none shadow-sm'
          }`}>
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.text}</p>
            
            {/* Anexos */}
            {message.attachments && message.attachments.length > 0 && (
              <div className="mt-3 grid grid-cols-1 gap-2">
                {message.attachments.map((url, i) => (
                  <a key={i} href={url} target="_blank" rel="noreferrer" className="block rounded-xl overflow-hidden border border-black/5 hover:opacity-90 transition-opacity">
                    <img src={url} alt="Anexo" className="max-h-60 w-full object-cover" />
                  </a>
                ))}
              </div>
            )}

            {/* Hora e Status */}
            <div className={`flex items-center gap-1 mt-1 text-[9px] ${isMine ? 'text-white/60 justify-end' : 'text-gray-400'}`}>
              {formatChatTime(message.createdAt?.toMillis() || Date.now())}
              {isMine && (
                message.createdAt ? (
                  isRead ? <CheckCheck size={12} className="text-emerald-400" /> : <Check size={12} />
                ) : (
                  <div className="w-2 h-2 border border-white/40 border-t-transparent rounded-full animate-spin" />
                )
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
