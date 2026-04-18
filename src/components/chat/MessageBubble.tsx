import React from 'react';
import { ChatMessage } from '../../types/chat.types';
import { formatChatTime } from '../../helpers/chatHelpers';
import { useAuth } from '../../contexts/AuthContext';
import { User, Paperclip, Check, CheckCheck, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface MessageBubbleProps {
  message: ChatMessage;
  isRead?: boolean;
  onDelete?: (id: string) => Promise<boolean>;
}

export default function MessageBubble({ message, isRead, onDelete }: MessageBubbleProps) {
  const { userProfile } = useAuth();
  const navigate = useNavigate();
  const isMine = message.senderId === userProfile?.uid;
  const isDeleted = message.isDeleted;

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('Deseja apagar esta mensagem?')) {
      await onDelete?.(message.id);
    }
  };

  return (
    <div className={`flex flex-col mb-4 ${isMine ? 'items-end' : 'items-start'} group animate-in fade-in slide-in-from-bottom-2 duration-300`}>
      {/* Nome do Remetente (Apenas Grupos/Outros) */}
      {!isMine && !isDeleted && (
        <span className="text-[10px] font-bold text-gray-500 mb-1 ml-11 uppercase tracking-tighter">
          {message.senderName}
        </span>
      )}

      <div className={`flex items-end gap-2 max-w-[85%] ${isMine ? 'flex-row-reverse' : ''}`}>
        {/* Avatar */}
        {!isMine && (
          <div 
            onClick={() => navigate(`/profile/${message.senderId}`)}
            className="w-8 h-8 rounded-xl bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 overflow-hidden flex items-center justify-center shrink-0 shadow-sm mb-1 cursor-pointer hover:scale-105 transition-transform"
          >
            {message.senderPhotoURL ? <img src={message.senderPhotoURL} alt="" /> : <User size={14} className="text-gray-400" />}
          </div>
        )}

        <div className="flex flex-col flex-1 relative group/bubble">
          {/* Botão de Excluir (Apenas p/ minhas mensagens e se não deletada) */}
          {isMine && !isDeleted && (
            <button 
              onClick={handleDelete}
              className="absolute -left-10 top-1/2 -translate-y-1/2 p-2 text-gray-400 hover:text-red-500 opacity-0 group-hover/bubble:opacity-100 transition-all bg-white dark:bg-zinc-900 shadow-xl border border-gray-100 dark:border-white/10 rounded-xl"
              title="Apagar mensagem"
            >
              <Trash2 size={14} />
            </button>
          )}

          {/* Citação de Resposta (Reply) */}
          {message.replyTo && !isDeleted && (
            <div className={`text-[10px] p-2 rounded-t-2xl border-l-4 bg-gray-100 dark:bg-black/20 border-gray-300 dark:border-white/20 mb-[-12px] pb-4 truncate ${isMine ? 'text-right rounded-tr-none mr-1' : 'text-left rounded-tl-none ml-1'}`}>
              <span className="font-bold block mb-0.5 opacity-60">{message.replyTo.senderName}</span>
              <span className="italic">"{message.replyTo.text}"</span>
            </div>
          )}

          {/* Conteúdo da Mensagem */}
          <div className={`p-4 rounded-[1.8rem] shadow-sm relative overflow-hidden transition-all ${
            isDeleted 
              ? 'bg-gray-50 dark:bg-white/5 border border-dashed border-gray-200 dark:border-white/10 italic text-gray-400 dark:text-gray-500' 
              : isMine 
                ? 'bg-black dark:bg-zinc-950 text-white rounded-tr-none ring-1 ring-white/10' 
                : 'bg-primary-500/10 dark:bg-primary-500/5 text-gray-800 dark:text-gray-100 border border-primary-500/20 rounded-tl-none'
          }`}>
            {isDeleted ? (
              <div className="flex items-center gap-2 py-1">
                <Trash2 size={12} className="opacity-40" />
                <span className="text-xs">Mensagem apagada</span>
              </div>
            ) : (
              <>
                <p className="text-sm leading-relaxed whitespace-pre-wrap font-medium">{message.text}</p>
                
                {/* Anexos */}
                {message.attachments && message.attachments.length > 0 && (
                  <div className="mt-3 grid grid-cols-1 gap-2">
                    {message.attachments.map((url, i) => (
                      <a key={i} href={url} target="_blank" rel="noreferrer" className="block rounded-2xl overflow-hidden border border-black/5 hover:opacity-90 transition-opacity">
                        <img src={url} alt="Anexo" className="max-h-60 w-full object-cover" />
                      </a>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* Hora e Status */}
            <div className={`flex items-center gap-1 mt-1 text-[9px] ${isMine ? 'text-white/40 justify-end' : 'text-gray-400'}`}>
              {formatChatTime(message.createdAt?.toMillis() || Date.now())}
              {isMine && !isDeleted && (
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
