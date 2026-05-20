import { User, Paperclip, Check, CheckCheck, Trash2, Reply, Smile, Bookmark, Pin, LifeBuoy, MessageSquareText, ExternalLink, Hash, ChevronRight, Clock, Bell, Bot, FileText, Volume2, Download, Play, Video } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage } from '@/types/chat.types';
import { useAuth } from '@auth/contexts/AuthContext';
import { useDialog } from '@auth/contexts/DialogContext';
import { useCRM } from '@crm/contexts/CRMContext';
import { formatChatTime, formatChatDateTime, highlightMentions } from '@/helpers/chatHelpers';
import { ReminderModal } from './ReminderModal';

interface MessageBubbleProps {
  message: ChatMessage;
  isRead?: boolean;
  isPinned?: boolean;
  isBookmarked?: boolean;
  onDelete?: (id: string) => Promise<boolean>;
  onEdit?: (message: ChatMessage) => void;
  onReply?: (message: ChatMessage) => void;
  onReact?: (id: string, emoji: string) => void;
  onVote?: (messageId: string, optionId: string) => void;
  onBookmark?: (message: ChatMessage) => void;
  onPin?: (id: string) => void;
  onUnpin?: (id: string) => void;
  onCreateTicket?: (text: string) => void;
  onApprove?: (id: string, status: 'approved' | 'rejected') => void;
  onImageClick?: (url: string) => void;
  onThreadOpen?: (message: ChatMessage) => void;
  onSetReminder?: (message: ChatMessage, date: Date) => void;
}

const COMMON_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🔥'];

const isAudioFile = (url: string) => {
  return url.match(/\.(mp3|wav|ogg|m4a|webm)($|\?)/i) || url.includes('/audios/');
};

const isVideoFile = (url: string) => {
  return url.match(/\.(mp4|mov|webm)($|\?)/i) || url.includes('/videos/');
};

const isImageFile = (url: string) => {
  return url.match(/\.(jpeg|jpg|gif|png|webp|svg)($|\?)/i) || url.includes('/images/');
};

const getFileNameFromUrl = (url: string) => {
  try {
    const decoded = decodeURIComponent(url);
    const parts = decoded.split('/');
    const lastPart = parts[parts.length - 1];
    return lastPart.replace(/^\d+-/, '');
  } catch (e) {
    return 'Arquivo Anexo';
  }
};

const getFileExtension = (url: string) => {
  try {
    const filename = getFileNameFromUrl(url);
    const parts = filename.split('.');
    return parts.length > 1 ? parts[parts.length - 1].toUpperCase() : 'ARQUIVO';
  } catch (e) {
    return 'FILE';
  }
};

const AudioPlayer = ({ url, isMine }: { url: string; isMine: boolean }) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(() => {
    const match = url.match(/_duration_(\d+)\./);
    return match ? parseInt(match[1], 10) : 0;
  });
  const [playbackRate, setPlaybackRate] = useState(1);
  const [progress, setProgress] = useState(0);

  // Array fixo de alturas estéticas simétricas para simular a Waveform
  const waveHeights = [
    12, 16, 20, 26, 32, 28, 22, 16, 12, 18, 24, 30, 36, 40, 
    36, 30, 24, 18, 12, 16, 22, 28, 32, 26, 20, 16, 12, 8
  ];

  useEffect(() => {
    const audio = new Audio(url);
    audioRef.current = audio;

    const onTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
      const activeDuration = (audio.duration && isFinite(audio.duration)) ? audio.duration : duration;
      if (activeDuration) {
        setProgress((audio.currentTime / activeDuration) * 100);
      }
    };

    const onLoadedMetadata = () => {
      if (audio.duration === Infinity) {
        audio.currentTime = 1e9;
        const onTimeUpdateForDuration = () => {
          if (audio.duration && isFinite(audio.duration)) {
            setDuration(audio.duration);
          }
          audio.currentTime = 0;
          audio.removeEventListener('timeupdate', onTimeUpdateForDuration);
        };
        audio.addEventListener('timeupdate', onTimeUpdateForDuration);
      } else if (audio.duration && isFinite(audio.duration)) {
        setDuration(audio.duration);
      }
    };

    const onEnded = () => {
      setIsPlaying(false);
      setProgress(0);
      setCurrentTime(0);
    };

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('ended', onEnded);

    if (audio.readyState >= 1) {
      if (audio.duration === Infinity) {
        audio.currentTime = 1e9;
        const onTimeUpdateForDuration = () => {
          if (audio.duration && isFinite(audio.duration)) {
            setDuration(audio.duration);
          }
          audio.currentTime = 0;
          audio.removeEventListener('timeupdate', onTimeUpdateForDuration);
        };
        audio.addEventListener('timeupdate', onTimeUpdateForDuration);
      } else if (audio.duration && isFinite(audio.duration)) {
        setDuration(audio.duration);
      }
    }

    return () => {
      audio.pause();
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('ended', onEnded);
      audioRef.current = null;
    };
  }, [url, duration]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().then(() => {
        setIsPlaying(true);
      }).catch(err => {
        console.error("Erro ao tocar áudio:", err);
      });
    }
  };

  const handlePlaybackRateChange = () => {
    if (!audioRef.current) return;
    let nextRate = 1;
    if (playbackRate === 1) nextRate = 1.5;
    else if (playbackRate === 1.5) nextRate = 2;
    else nextRate = 1;

    setPlaybackRate(nextRate);
    audioRef.current.playbackRate = nextRate;
  };

  const handleWaveformClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const width = rect.width;
    const clickPercent = Math.min(Math.max(0, clickX / width), 1);
    
    audioRef.current.currentTime = clickPercent * duration;
    setCurrentTime(clickPercent * duration);
    setProgress(clickPercent * 100);
  };

  const formatTime = (time: number) => {
    if (isNaN(time) || !isFinite(time)) return "--:--";
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const bubbleBg = isMine 
    ? 'bg-zinc-900/95 dark:bg-zinc-950/75 border border-white/10 shadow-xl shadow-zinc-950/20 backdrop-blur-xl hover:border-white/15 transition-all duration-300' 
    : 'bg-gradient-to-r from-primary-500/10 via-primary-500/5 to-primary-500/2 dark:from-primary-500/5 dark:via-primary-500/2 dark:to-primary-500/1 border border-primary-500/15 shadow-md shadow-primary-500/5 backdrop-blur-xl hover:border-primary-500/25 transition-all duration-300';

  const textColor = isMine ? 'text-white' : 'text-gray-800 dark:text-gray-100';
  const subTextColor = isMine ? 'text-white/60' : 'text-gray-500 dark:text-gray-400';
  
  const playButtonBg = isMine 
    ? 'bg-gradient-to-tr from-white to-zinc-150 text-zinc-950 hover:scale-[1.06] hover:shadow-md hover:shadow-white/10 active:scale-95 transition-all duration-200' 
    : 'bg-gradient-to-tr from-primary-500 to-primary-600 text-white hover:scale-[1.06] hover:shadow-lg hover:shadow-primary-500/25 active:scale-95 transition-all duration-200 shadow-md';

  return (
    <div className={`p-4 rounded-[2rem] ${bubbleBg} max-w-sm w-full flex flex-col gap-3 shadow-lg animate-in fade-in duration-300 relative z-30`}>
      <div className="flex items-center gap-3">
        <button 
          onClick={togglePlay}
          className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 shadow-sm ${playButtonBg}`}
        >
          {isPlaying ? (
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4.5 h-4.5">
              <path fillRule="evenodd" d="M6.75 5.25a.75.75 0 0 1 .75-.75H9a.75.75 0 0 1 .75.75v13.5a.75.75 0 0 1-.75.75H7.5a.75.75 0 0 1-.75-.75V5.25Zm7.5 0A.75.75 0 0 1 15 4.5h1.5a.75.75 0 0 1 .75.75v13.5a.75.75 0 0 1-.75.75H15a.75.75 0 0 1-.75-.75V5.25Z" clipRule="evenodd" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4.5 h-4.5 ml-0.5 animate-pulse">
              <path fillRule="evenodd" d="M4.5 5.653c0-1.427 1.529-2.33 2.779-1.643l11.54 6.347c1.295.712 1.295 2.573 0 3.286L7.28 19.99c-1.25.687-2.779-.217-2.779-1.643V5.653Z" clipRule="evenodd" />
            </svg>
          )}
        </button>

        <div className="flex-1 min-w-0">
          <p className={`text-xs font-black truncate leading-none mb-1.5 tracking-tight ${textColor}`}>
            Mensagem de voz
          </p>
          <div className="flex items-center gap-1.5 leading-none">
            <span className={`text-[9px] font-black uppercase tracking-widest ${subTextColor}`}>
              🎙️ {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>
        </div>

        <button
          onClick={handlePlaybackRateChange}
          className={`h-6 px-2.5 text-[10px] font-black tracking-wider uppercase rounded-full shrink-0 border transition-all duration-200 active:scale-95 flex items-center justify-center ${
            playbackRate !== 1 
              ? isMine ? 'bg-white text-zinc-950 border-white shadow-md' : 'bg-gradient-to-r from-primary-500 to-primary-600 text-white border-transparent shadow-md'
              : isMine ? 'bg-transparent text-white/70 border-white/20 hover:bg-white/10' : 'bg-transparent text-gray-500 dark:text-gray-400 hover:text-primary-500 border-gray-200 dark:border-white/10 hover:border-primary-500/30'
          }`}
        >
          {playbackRate}x
        </button>
      </div>

      <div 
        onClick={handleWaveformClick}
        className="h-10 w-full flex items-center justify-between gap-[3px] px-1 cursor-pointer select-none rounded-2xl hover:bg-black/5 dark:hover:bg-white/5 transition-colors group/wave"
      >
        {waveHeights.map((ht, idx) => {
          const barPercent = (idx / waveHeights.length) * 100;
          const isActive = progress >= barPercent;

          return (
            <div 
              key={idx}
              className="w-1.5 rounded-full transition-all duration-150 hover:scale-y-110"
              style={{ 
                height: `${ht}px`,
                backgroundColor: isActive 
                  ? (isMine ? '#ffffff' : 'var(--primary-500)') 
                  : (isMine ? 'rgba(255,255,255,0.18)' : 'rgba(156,163,175,0.25)'),
                opacity: isActive ? 1 : 0.7
              }}
            />
          );
        })}
      </div>

      <div className="flex justify-end pr-1.5 leading-none">
        <a 
          href={url} 
          download 
          target="_blank" 
          rel="noreferrer"
          className={`text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 hover:underline transition-all ${subTextColor}`}
          title="Baixar arquivo de áudio"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="w-3 h-3">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
          </svg>
          Salvar
        </a>
      </div>
    </div>
  );
};

export default function MessageBubble({ 
  message, isRead, isPinned, isBookmarked, onDelete, onEdit, onReply, onReact, onVote, 
  onBookmark, onPin, onUnpin, onCreateTicket, onApprove, onImageClick, onThreadOpen, onSetReminder 
}: MessageBubbleProps) {
  const { userProfile } = useAuth();
  const { teamProfiles } = useCRM();
  const { confirm } = useDialog();
  const navigate = useNavigate();
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showReadBy, setShowReadBy] = useState(false);
  const [isReminderModalOpen, setIsReminderModalOpen] = useState(false);
  const isMine = message.senderId === userProfile?.uid;
  const isDeleted = message.isDeleted;
  const isBot = message.isBot || message.type === 'bot_response';
  
  // Se a mensagem for agendada E estiver deletada, não mostrar nada (sumir completamente)
  if (isDeleted && message.status === 'scheduled') return null;

  const isMentioned = message.mentions?.includes(userProfile?.uid || '') || message.mentionAll;

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const ok = await confirm({
      title: 'Apagar Mensagem',
      message: 'Deseja apagar esta mensagem permanentemente?',
      confirmText: 'Sim, apagar',
      variant: 'danger'
    });
    if (ok) {
      await onDelete?.(message.id);
    }
  };

  const handleReact = (emoji: string) => {
    onReact?.(message.id, emoji);
    setShowEmojiPicker(false);
  };

  return (
    <div 
      id={`msg-${message.id}`}
      className={`flex flex-col mb-4 ${isMine ? 'items-end' : 'items-start'} group animate-in fade-in slide-in-from-bottom-2 duration-300 scroll-mt-12 transition-all duration-300`}
      onDoubleClick={() => !isDeleted && onReply?.(message)}
    >
      {/* Nome do Remetente (Apenas Grupos/Outros) */}
      {!isMine && !isDeleted && (
        <span className="text-base font-semibold text-gray-500 mb-1 ml-11 tracking-tight flex items-center gap-2">
          {isBot ? (
            <>
              <span className="text-violet-500 font-black">HubBot</span>
              <span className="text-[8px] font-black uppercase tracking-widest bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white px-2 py-0.5 rounded-full shadow-sm">BOT</span>
            </>
          ) : message.senderName}
        </span>
      )}

      <div className={`flex items-end gap-2 max-w-[85%] ${isMine ? 'flex-row-reverse' : ''}`}>
        {/* Avatar */}
        {!isMine && (
          <div 
            onClick={() => !isBot && navigate(`/profile/${message.senderId}`)}
            className={`w-8 h-8 rounded-xl border overflow-hidden flex items-center justify-center shrink-0 shadow-sm mb-1 transition-transform ${
              isBot 
                ? 'bg-gradient-to-br from-violet-500 to-fuchsia-500 border-violet-500/30 shadow-violet-500/20 shadow-lg' 
                : 'bg-gray-100 dark:bg-white/5 border-gray-200 dark:border-white/10 cursor-pointer hover:scale-105'
            }`}
          >
            {isBot ? (
              <Bot size={14} className="text-white" />
            ) : message.senderPhotoURL ? (
              <img src={message.senderPhotoURL} alt="" />
            ) : (
              <User size={14} className="text-gray-400" />
            )}
          </div>
        )}

        <div className="flex flex-col flex-1 relative group/bubble">
          {/* Timestamp no Topo (Teams Style) */}
          {!isDeleted && (
            <div className={`mb-1 text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-tighter ${isMine ? 'text-right pr-4' : 'pl-4'}`}>
              {message.createdAt && (message.createdAt as any).toDate ? formatChatDateTime((message.createdAt as any).toDate()) : 'Enviando...'}
            </div>
          )}

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
                  className={`p-1.5 rounded-full transition-colors ${isBookmarked ? 'text-blue-500 bg-blue-500/10' : 'text-gray-400 hover:text-blue-500 hover:bg-blue-500/10'}`}
                  title={isBookmarked ? "Remover dos Favoritos" : "Salvar nos Favoritos"}
                >
                  <Bookmark size={14} className={isBookmarked ? 'fill-current' : ''} />
                </button>

                <button 
                  onClick={() => isPinned ? onUnpin?.(message.id) : onPin?.(message.id)}
                  className={`p-1.5 rounded-full transition-colors ${isPinned ? 'text-amber-500 bg-amber-500/10' : 'text-gray-400 hover:text-amber-500 hover:bg-amber-500/10'}`}
                  title={isPinned ? "Desafixar" : "Fixar no Topo"}
                >
                  <Pin size={14} className={isPinned ? 'fill-current' : ''} />
                </button>


                <button 
                  onClick={() => onCreateTicket?.(message.text)}
                  className="p-1.5 text-gray-400 hover:text-purple-500 hover:bg-purple-500/10 rounded-full transition-colors"
                  title="Abrir Ticket Suporte"
                >
                  <LifeBuoy size={14} />
                </button>

                <button 
                  onClick={() => setIsReminderModalOpen(true)}
                  className="p-1.5 text-gray-400 hover:text-amber-500 hover:bg-amber-500/10 rounded-full transition-colors"
                  title="Lembrar-me"
                >
                  <Bell size={14} />
                </button>

                {isMine && (
                  <>
                    <button 
                      onClick={() => onEdit?.(message)}
                      className="p-1.5 text-gray-400 hover:text-amber-500 hover:bg-amber-500/10 rounded-full transition-colors"
                      title="Editar"
                    >
                      <Check size={14} className="scale-75" />
                    </button>
                    <button 
                      onClick={handleDelete}
                      className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-500/10 rounded-full transition-colors"
                      title="Apagar"
                    >
                      <Trash2 size={14} />
                    </button>
                  </>
                )}

                <button 
                  onClick={() => onThreadOpen?.(message)}
                  className="p-1.5 text-gray-400 hover:text-emerald-500 hover:bg-emerald-500/10 rounded-full transition-colors"
                  title="Responder em Tópico (Thread)"
                >
                  <MessageSquareText size={14} />
                </button>
              </div>
            </div>
          )}

          {/* Citação de Resposta (Reply) */}
          {message.replyTo && !isDeleted && (
            <div className={`p-4 rounded-t-2xl border-l-4 bg-gray-100 dark:bg-black/20 border-gray-300 dark:border-white/20 mb-[-12px] pb-6 ${isMine ? 'text-right rounded-tr-none mr-1' : 'text-left rounded-tl-none ml-1'}`}>
              <span className="font-bold block mb-1 opacity-60 text-xs">{message.replyTo.senderName}</span>
              <span className="italic whitespace-pre-wrap break-words line-clamp-2 block text-sm leading-tight">"{message.replyTo.text}"</span>
            </div>
          )}

          {/* Conteúdo da Mensagem */}
          <div className={`p-4 rounded-[1.8rem] shadow-sm relative overflow-visible transition-all ${
            isDeleted 
              ? 'bg-gray-50 dark:bg-white/5 border border-dashed border-gray-200 dark:border-white/10 italic text-gray-400 dark:text-gray-500' 
              : isBot
                ? 'bg-gradient-to-br from-violet-500/10 to-fuchsia-500/10 dark:from-violet-500/5 dark:to-fuchsia-500/5 text-gray-800 dark:text-gray-100 border border-violet-500/20 rounded-tl-none'
              : message.type === 'sticker'
                ? 'bg-transparent shadow-none border-none !p-0'
                : message.status === 'scheduled'
                  ? 'bg-amber-500/5 dark:bg-amber-500/10 text-gray-800 dark:text-amber-100 border border-dashed border-amber-500/30'
                  : isMine 
                    ? 'bg-black dark:bg-zinc-950 text-white rounded-tr-none ring-1 ring-white/10' 
                    : 'bg-primary-500/10 dark:bg-primary-500/5 text-gray-800 dark:text-gray-100 border border-primary-500/20 rounded-tl-none'
          }`}>
            {isMentioned && !isMine && (
              <div className="absolute top-0 right-0 -mt-1 -mr-1 w-2 h-2 bg-primary-500 rounded-full ring-2 ring-white dark:ring-black/20" />
            )}
            {isDeleted ? (
              <div className="flex items-center gap-2 py-1">
                <Trash2 size={12} className="opacity-40" />
                <span className="text-xs">Mensagem apagada</span>
              </div>
            ) : (
              <>
                {message.type === 'poll' && message.poll ? (
                  <div className="space-y-4 my-2 min-w-[240px]">
                    <h4 className="font-bold text-lg leading-tight">{message.poll.question}</h4>
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
                    <p className="text-xs opacity-40 font-bold uppercase tracking-wider text-center">
                      {message.poll.options.reduce((acc, opt) => acc + opt.votes.length, 0)} votos no total • Voto Anônimo
                    </p>
                  </div>
                ) : message.type === 'approval' && message.approval ? (
                  <div className="space-y-4 my-2 min-w-[260px] bg-white/10 dark:bg-black/20 p-4 rounded-3xl border border-white/10">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-500">
                        <Check size={16} />
                      </div>
                      <span className="text-xs font-bold uppercase tracking-widest opacity-60">Solicitação de Aprovação</span>
                    </div>
                    
                    <h4 className="font-bold text-lg leading-tight">{message.approval.question}</h4>
                    
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
                ) : message.type === 'sticker' && message.attachments?.[0] ? (
                  <div 
                    onClick={() => onImageClick?.(message.attachments[0])}
                    className="cursor-pointer hover:scale-105 transition-transform"
                  >
                    <img 
                      src={message.attachments[0]} 
                      alt="Sticker" 
                      className="w-[140px] h-auto object-contain rounded-lg"
                    />
                  </div>
                ) : (
                  <p className="text-sm whitespace-pre-wrap break-words leading-relaxed font-medium">
                    {/* Renderização com Destaque de Menções */}
                    {highlightMentions(message.text).map((part, i) => {
                      const mentionRegex = /(@todos|@everyone|@[a-zA-Z0-9_\u00C0-\u017F]+)/;
                      if (mentionRegex.test(part)) {
                        return (
                          <span key={i} className={`font-black tracking-tight ${isMine ? 'text-primary-400' : 'text-primary-600'}`}>
                            {part}
                          </span>
                        );
                      }
                      return part;
                    })}
                  </p>
                )}
                
                {/* Indicador de Thread (Tópico) */}
                {message.threadReplyCount && message.threadReplyCount > 0 && (
                  <button 
                    onClick={() => onThreadOpen?.(message)}
                    className={`mt-3 flex items-center gap-2 py-1.5 px-3 rounded-xl border transition-all w-fit group/thread ${
                      isMine 
                        ? 'bg-white/10 border-white/20 hover:bg-white/20 text-white' 
                        : 'bg-primary-500/10 border-primary-500/20 hover:bg-primary-500/20 text-primary-600 dark:text-primary-400'
                    }`}
                  >
                    <MessageSquareText size={12} className="group-hover/thread:scale-110 transition-transform" />
                    <span className="text-[10px] font-black uppercase tracking-widest">
                      {message.threadReplyCount} {message.threadReplyCount === 1 ? 'Resposta' : 'Respostas'}
                    </span>
                    <ChevronRight size={12} className="opacity-40" />
                  </button>
                )}
                
                {/* Card de Cliente Vinculado */}
                {message.type === 'client_card' && message.richPreview && (
                  <div className="my-2 min-w-[280px] bg-white dark:bg-black/40 rounded-[2rem] border border-primary-500/30 overflow-hidden shadow-2xl shadow-primary-500/10">
                    <div className="bg-primary-500/10 p-4 border-b border-primary-500/10 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-primary-500 flex items-center justify-center text-white shadow-lg shadow-primary-500/20">
                          <Hash size={16} />
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-primary-600">Ficha do Cliente</span>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/50 dark:bg-black/20 border border-primary-500/20 text-primary-500">
                        {message.richPreview.status}
                      </span>
                    </div>
                    <div className="p-5">
                      <h4 className="text-xl font-black tracking-tight text-gray-900 dark:text-white mb-1">
                        {message.richPreview.title}
                      </h4>
                      <p className="text-xs text-gray-500 mb-4 line-clamp-2">
                        {message.richPreview.description}
                      </p>
                      
                      <div className="grid grid-cols-2 gap-3 mb-5">
                        <div className="p-3 bg-gray-50 dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/5">
                          <span className="text-[9px] font-bold text-gray-400 uppercase block mb-1">Nichos</span>
                          <span className="text-xs font-bold text-gray-700 dark:text-gray-300">Digital / Tech</span>
                        </div>
                        <div className="p-3 bg-gray-50 dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/5">
                          <span className="text-[9px] font-bold text-gray-400 uppercase block mb-1">Valor Mensal</span>
                          <span className="text-xs font-black text-primary-500">{message.richPreview.value}</span>
                        </div>
                      </div>

                      <button 
                        onClick={() => navigate(message.richPreview!.url)}
                        className="w-full py-3 bg-primary-500 hover:bg-primary-600 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-primary-500/20 flex items-center justify-center gap-2"
                      >
                        Abrir no CRM
                        <ExternalLink size={14} />
                      </button>
                    </div>
                  </div>
                )}
                
                {message.isEdited && (
                  <span className="text-[10px] italic opacity-50 block mt-1">(editado)</span>
                )}

                {/* Badge de Agendamento */}
                {message.status === 'scheduled' && message.scheduledAt && (
                  <div className="mt-3 py-1.5 px-3 rounded-full bg-amber-500/20 border border-amber-500/30 flex items-center gap-2 w-fit">
                    <Clock size={12} className="text-amber-600 dark:text-amber-400" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-amber-600 dark:text-amber-400">
                      Agendado para {formatChatDateTime(message.scheduledAt.toDate())}
                    </span>
                  </div>
                )}

                 {/* Anexos Multimídia (Apenas se não for sticker) */}
                 {message.type !== 'sticker' && message.attachments && message.attachments.length > 0 && (
                   <div className="mt-3 flex flex-col gap-3 max-w-full relative z-30">
                     {message.attachments.map((url, i) => {
                       if (isAudioFile(url)) {
                         return (
                           <AudioPlayer 
                             key={i} 
                             url={url} 
                             isMine={isMine} 
                           />
                         );
                       }
 
                       if (isVideoFile(url)) {
                         return (
                           <div 
                             key={i} 
                             className="flex flex-col gap-2 p-3 rounded-2xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 max-w-md shadow-sm"
                           >
                             <div className="flex items-center gap-2.5">
                               <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0">
                                 <Video size={18} />
                               </div>
                               <div className="min-w-0 flex-1">
                                 <p className="text-xs font-black truncate dark:text-white leading-tight">
                                   {getFileNameFromUrl(url)}
                                 </p>
                                 <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">
                                   Vídeo Anexo • {getFileExtension(url)}
                                 </span>
                               </div>
                               <a 
                                 href={url} 
                                 download 
                                 target="_blank" 
                                 rel="noreferrer"
                                 className="p-1.5 hover:bg-gray-200 dark:hover:bg-white/10 rounded-lg text-gray-400 hover:text-primary-500 transition-colors shrink-0"
                                 title="Baixar Vídeo"
                               >
                                 <Download size={14} />
                               </a>
                             </div>
                             <video 
                               controls 
                               src={url} 
                               className="w-full rounded-xl overflow-hidden max-h-[300px] border border-black/5 dark:border-white/10 shadow-sm" 
                             />
                           </div>
                         );
                       }
 
                       if (isImageFile(url)) {
                         return (
                           <div 
                             key={i} 
                             onClick={() => onImageClick?.(url)}
                             className="block rounded-2xl overflow-hidden border border-black/5 dark:border-white/10 hover:opacity-95 transition-all outline-none cursor-pointer max-w-md relative group/img shadow-md"
                           >
                             <div 
                               className="absolute inset-0 bg-cover bg-center blur-3xl opacity-20 scale-110"
                               style={{ backgroundImage: `url(${url})` }}
                             />
                             <img 
                               src={url} 
                               alt="Anexo" 
                               className="relative z-10 w-full h-full object-contain max-h-[400px] transition-transform duration-500 group-hover/img:scale-[1.01]"
                             />
                             <div className="absolute inset-0 bg-black/0 group-hover/img:bg-black/5 transition-colors z-20" />
                           </div>
                         );
                       }
 
                       // Caso padrão: Documentos ou outros arquivos
                       return (
                         <div 
                           key={i} 
                           className="flex items-center gap-3 p-3 rounded-2xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 max-w-sm shadow-sm"
                         >
                           <div className="w-10 h-10 rounded-xl bg-primary-500/10 text-primary-500 flex items-center justify-center shrink-0">
                             <FileText size={20} />
                           </div>
                           <div className="min-w-0 flex-1">
                             <p className="text-xs font-black truncate dark:text-white leading-tight">
                               {getFileNameFromUrl(url)}
                             </p>
                             <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">
                               Documento • {getFileExtension(url)}
                             </span>
                           </div>
                           <a 
                             href={url} 
                             download 
                             target="_blank" 
                             rel="noreferrer"
                             className="p-2 bg-white dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 rounded-xl text-gray-500 dark:text-gray-300 border border-gray-150 dark:border-white/10 shadow-sm transition-all hover:scale-105 shrink-0 flex items-center justify-center"
                             title="Baixar Arquivo"
                           >
                             <Download size={15} />
                           </a>
                         </div>
                       );
                     })}
                   </div>
                 )}
              </>
            )}

            {/* Status (Checkmarks) */}
            {isMine && !isDeleted && (
              <div className={`flex items-center justify-end mt-1`}>
                <div className="relative">
                  <button 
                    onClick={() => message.readBy && message.readBy.length > 0 && setShowReadBy(!showReadBy)}
                    className="hover:scale-110 transition-transform flex items-center"
                  >
                    {message.createdAt ? (
                      isRead || (message.readBy && message.readBy.length > 0) ? <CheckCheck size={14} className="text-emerald-400" /> : <Check size={14} className="text-white/40" />
                    ) : (
                      <div className="w-2.5 h-2.5 border border-white/40 border-t-transparent rounded-full animate-spin" />
                    )}
                  </button>
                  
                  {showReadBy && message.readBy && (
                    <div className="absolute bottom-full right-0 mb-2 bg-white dark:bg-zinc-900 border border-gray-100 dark:border-white/10 rounded-2xl shadow-2xl p-3 min-w-[200px] z-[100] animate-in zoom-in-95 overflow-hidden">
                      <p className="text-[10px] font-black uppercase text-gray-400 mb-3 px-1 tracking-widest">Visualizado por</p>
                      <div className="flex flex-col gap-2 max-h-56 overflow-y-auto custom-scrollbar">
                        {message.readBy.map(uid => {
                          const reader = teamProfiles.find(p => p.uid === uid);
                          return (
                            <div key={uid} className="flex items-center gap-3 p-1.5 rounded-xl hover:bg-gray-100 dark:hover:bg-white/5 transition-colors group/reader">
                               <div className="w-8 h-8 rounded-lg bg-primary-500/10 flex items-center justify-center overflow-hidden border border-primary-500/20 shrink-0">
                                 {reader?.photoURL ? (
                                   <img src={reader.photoURL} alt="" className="w-full h-full object-cover" />
                                 ) : (
                                   <User size={14} className="text-primary-500" />
                                 )}
                               </div>
                               <div className="flex flex-col min-w-0">
                                 <span className="text-[12px] font-bold truncate text-gray-800 dark:text-gray-100">
                                   {reader?.displayName || 'Usuário Removido'}
                                 </span>
                                 <span className="text-[9px] text-primary-500 font-bold uppercase tracking-tighter opacity-60">Lido</span>
                               </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Reações */}
            {message.reactions && Object.keys(message.reactions).length > 0 && !isDeleted && (
              <div className={`absolute -bottom-3 flex flex-wrap gap-1 ${isMine ? 'right-2' : 'left-2'} z-10`}>
                {(Object.entries(message.reactions) as [string, string[]][]).map(([emoji, uids]) => {
                  if (!uids || uids.length === 0) return null;
                  const hasReacted = uids.includes(userProfile?.uid || '');
                  return (
                    <button
                      key={emoji}
                      onClick={() => handleReact(emoji)}
                      className={`flex items-center gap-1 px-1.5 h-7 rounded-full text-sm font-bold border transition-all ${
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

      <ReminderModal 
        isOpen={isReminderModalOpen}
        onClose={() => setIsReminderModalOpen(false)}
        onConfirm={(date) => onSetReminder?.(message, date)}
        messageText={message.text}
      />
    </div>
  );
}
