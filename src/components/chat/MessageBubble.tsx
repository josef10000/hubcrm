import { User, Paperclip, Check, CheckCheck, Trash2, Reply, Smile, Bookmark, Pin, CheckSquare, LifeBuoy } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface MessageBubbleProps {
  message: ChatMessage;
  isRead?: boolean;
  isPinned?: boolean;
  onDelete?: (id: string) => Promise<boolean>;
  onReply?: (message: ChatMessage) => void;
  onReact?: (id: string, emoji: string) => void;
  onVote?: (messageId: string, optionId: string) => void;
  onBookmark?: (message: ChatMessage) => void;
  onPin?: (id: string) => void;
  onUnpin?: (id: string) => void;
  onCreateTask?: (text: string) => void;
  onCreateTicket?: (text: string) => void;
  onApprove?: (id: string, status: 'approved' | 'rejected') => void;
}

const COMMON_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🔥'];

export default function MessageBubble({ 
  message, isRead, isPinned, onDelete, onReply, onReact, onVote, 
  onBookmark, onPin, onUnpin, onCreateTask, onCreateTicket, onApprove 
}: MessageBubbleProps) {
  const { userProfile } = useAuth();
  const navigate = useNavigate();
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const isMine = message.senderId === userProfile?.uid;
  const isDeleted = message.isDeleted;

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('Deseja apagar esta mensagem?')) {
      await onDelete?.(message.id);
    }
  };

  const handleReact = (emoji: string) => {
    onReact?.(message.id, emoji);
    setShowEmojiPicker(false);
  };

  return (
    <div 
      className={`flex flex-col mb-4 ${isMine ? 'items-end' : 'items-start'} group animate-in fade-in slide-in-from-bottom-2 duration-300`}
      onDoubleClick={() => !isDeleted && onReply?.(message)}
    >
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
          {/* Menu de Ações Flutuante */}
          {!isDeleted && (
            <div className={`absolute -top-8 flex items-center gap-1 opacity-0 group-hover/bubble:opacity-100 transition-all z-20 ${isMine ? 'right-0' : 'left-0'}`}>
              <div className="flex bg-white dark:bg-zinc-900 shadow-xl border border-gray-100 dark:border-white/10 rounded-full py-1 px-2 gap-1 items-center">
                {/* Botão de Reação Rápida (Emoji) */}
                <div className="relative">
                  <button 
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    className="p-1.5 text-gray-400 hover:text-amber-500 hover:bg-amber-500/10 rounded-full transition-colors"
                    title="Reagir"
                  >
                    <Smile size={14} />
                  </button>
                  
                  {showEmojiPicker && (
                    <div className="absolute bottom-full mb-2 left-0 bg-white dark:bg-zinc-900 border border-gray-100 dark:border-white/10 rounded-full shadow-2xl p-1 flex items-center gap-1 animate-in zoom-in-95 duration-200">
                      {COMMON_EMOJIS.map(emoji => (
                        <button 
                          key={emoji}
                          onClick={() => handleReact(emoji)}
                          className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-white/5 rounded-full transition-colors text-lg"
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <button 
                  onClick={() => onBookmark?.(message)}
                  className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-500/10 rounded-full transition-colors"
                  title="Salvar nos Favoritos"
                >
                  <Bookmark size={14} />
                </button>

                <button 
                  onClick={() => isPinned ? onUnpin?.(message.id) : onPin?.(message.id)}
                  className={`p-1.5 rounded-full transition-colors ${isPinned ? 'text-amber-500 bg-amber-500/10' : 'text-gray-400 hover:text-amber-500 hover:bg-amber-500/10'}`}
                  title={isPinned ? "Desafixar" : "Fixar no Topo"}
                >
                  <Pin size={14} className={isPinned ? 'fill-current' : ''} />
                </button>

                <button 
                  onClick={() => onCreateTask?.(message.text)}
                  className="p-1.5 text-gray-400 hover:text-emerald-500 hover:bg-emerald-500/10 rounded-full transition-colors"
                  title="Criar Tarefa (PDI)"
                >
                  <CheckSquare size={14} />
                </button>

                <button 
                  onClick={() => onCreateTicket?.(message.text)}
                  className="p-1.5 text-gray-400 hover:text-purple-500 hover:bg-purple-500/10 rounded-full transition-colors"
                  title="Abrir Ticket Suporte"
                >
                  <LifeBuoy size={14} />
                </button>

                {isMine && (
                  <button 
                    onClick={handleDelete}
                    className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-500/10 rounded-full transition-colors"
                    title="Apagar"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Citação de Resposta (Reply) */}
          {message.replyTo && !isDeleted && (
            <div className={`p-4 rounded-t-2xl border-l-4 bg-gray-100 dark:bg-black/20 border-gray-300 dark:border-white/20 mb-[-12px] pb-6 ${isMine ? 'text-right rounded-tr-none mr-1' : 'text-left rounded-tl-none ml-1'}`}>
              <span className="font-bold block mb-1 opacity-60 text-[14px]">{message.replyTo.senderName}</span>
              <span className="italic whitespace-pre-wrap break-words line-clamp-3 block text-[22px] leading-tight">"{message.replyTo.text}"</span>
            </div>
          )}

          {/* Conteúdo da Mensagem */}
          <div className={`p-4 rounded-[1.8rem] shadow-sm relative overflow-visible transition-all ${
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
                {message.type === 'poll' && message.poll ? (
                  <div className="space-y-4 my-2 min-w-[240px]">
                    <h4 className="font-bold text-base leading-tight">{message.poll.question}</h4>
                    <div className="space-y-2">
                      {message.poll.options.map((option) => {
                        const totalVotes = message.poll?.options.reduce((acc, opt) => acc + opt.votes.length, 0) || 0;
                        const percentage = totalVotes > 0 ? Math.round((option.votes.length / totalVotes) * 100) : 0;
                        const hasVoted = option.votes.includes(userProfile?.uid || '');

                        return (
                          <button
                            key={option.id}
                            onClick={() => onVote?.(message.id, option.id)}
                            className={`w-full relative p-3 rounded-xl border transition-all text-left overflow-hidden group ${
                              hasVoted 
                                ? 'border-primary-500 bg-primary-500/10' 
                                : 'border-gray-200 dark:border-white/10 hover:border-primary-500/50 bg-white/50 dark:bg-black/20'
                            }`}
                          >
                            {/* Barra de Progresso */}
                            <div 
                              className={`absolute inset-y-0 left-0 transition-all duration-1000 ease-out opacity-20 ${
                                hasVoted ? 'bg-primary-500' : 'bg-gray-400 dark:bg-white'
                              }`}
                              style={{ width: `${percentage}%` }}
                            />
                            
                            <div className="relative flex justify-between items-center gap-4">
                              <span className="text-sm font-medium flex-1 break-words">{option.text}</span>
                              <div className="flex items-center gap-2">
                                {hasVoted && <div className="w-1.5 h-1.5 rounded-full bg-primary-500" />}
                                <span className="text-xs font-bold opacity-60">{option.votes.length}</span>
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                    <p className="text-[10px] opacity-40 font-bold uppercase tracking-wider text-center">
                      {message.poll.options.reduce((acc, opt) => acc + opt.votes.length, 0)} votos no total • Voto Anônimo
                    </p>
                  </div>
                ) : message.type === 'approval' && message.approval ? (
                  <div className="space-y-4 my-2 min-w-[260px] bg-white/10 dark:bg-black/20 p-4 rounded-3xl border border-white/10">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-500">
                        <Check size={16} />
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-widest opacity-60">Solicitação de Aprovação</span>
                    </div>
                    
                    <h4 className="font-bold text-base leading-tight">{message.approval.question}</h4>
                    
                    {message.approval.status === 'pending' ? (
                      <div className="flex gap-2 pt-2">
                        <button 
                          onClick={() => onApprove?.(message.id, 'approved')}
                          className="flex-1 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-emerald-500/20"
                        >
                          Aprovar
                        </button>
                        <button 
                          onClick={() => onApprove?.(message.id, 'rejected')}
                          className="flex-1 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 rounded-xl text-xs font-bold transition-all"
                        >
                          Rejeitar
                        </button>
                      </div>
                    ) : (
                      <div className={`mt-4 p-3 rounded-2xl border flex items-center justify-center gap-2 ${
                        message.approval.status === 'approved' 
                          ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600' 
                          : 'bg-red-500/10 border-red-500/20 text-red-600'
                      }`}>
                        {message.approval.status === 'approved' ? <CheckCheck size={16} /> : <Trash2 size={16} />}
                        <span className="text-xs font-bold uppercase tracking-widest">
                          {message.approval.status === 'approved' ? 'Aprovado' : 'Rejeitado'}
                        </span>
                      </div>
                    )}
                  </div>
                ) : message.type === 'rich_link' && message.richPreview ? (
                   <div 
                    onClick={() => window.open(message.richPreview?.url, '_blank')}
                    className="my-2 min-w-[260px] bg-white/10 dark:bg-black/20 rounded-3xl border border-white/10 overflow-hidden cursor-pointer hover:bg-white/20 transition-all group/card"
                   >
                     {message.richPreview.image && (
                       <img src={message.richPreview.image} alt="" className="w-full h-32 object-cover" />
                     )}
                     <div className="p-4">
                       <h4 className="font-bold text-sm text-primary-500 mb-1 group-hover/card:underline">{message.richPreview.title}</h4>
                       <p className="text-[11px] opacity-70 line-clamp-2">{message.richPreview.description}</p>
                       <div className="mt-3 flex items-center justify-between">
                         <span className="text-[10px] font-black uppercase bg-primary-500/10 text-primary-600 px-2 py-0.5 rounded-full">
                           {message.richPreview.status || 'Vincular'}
                         </span>
                         <span className="text-[10px] font-bold opacity-60">{message.richPreview.value}</span>
                       </div>
                     </div>
                   </div>
                ) : (
                  <p className="text-sm leading-relaxed whitespace-pre-wrap font-medium">{message.text}</p>
                )}
                
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

            {/* Reações */}
            {message.reactions && Object.keys(message.reactions).length > 0 && !isDeleted && (
              <div className={`absolute -bottom-3 flex flex-wrap gap-1 ${isMine ? 'right-2' : 'left-2'} z-10`}>
                {Object.entries(message.reactions).map(([emoji, uids]) => {
                  if (!uids || uids.length === 0) return null;
                  const hasReacted = uids.includes(userProfile?.uid || '');
                  return (
                    <button
                      key={emoji}
                      onClick={() => handleReact(emoji)}
                      className={`flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold border transition-all ${
                        hasReacted 
                          ? 'bg-primary-500/10 border-primary-500/50 text-primary-600' 
                          : 'bg-white dark:bg-zinc-900 border-gray-100 dark:border-white/10 text-gray-500 hover:border-gray-300'
                      }`}
                      title={uids.length > 1 ? `${uids.length} pessoas reagiram` : `${uids.length} pessoa reagiu`}
                    >
                      <span>{emoji}</span>
                      {uids.length > 1 && <span>{uids.length}</span>}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
