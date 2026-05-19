import React, { useState, useRef, useEffect } from 'react';
import { Send, Paperclip, Smile, X, Loader2, Calendar, LayoutGrid, Image as ImageIcon, Clock, Mic, Square, Trash2 } from 'lucide-react';
import { parseMentions } from '@/helpers/chatHelpers';
import { filterCommands, findCommand, BotCommand, BotContext } from '@/helpers/botCommands';
import { useCRM } from '@crm/contexts/CRMContext';
import { useAuth } from '@auth/contexts/AuthContext';
import { ChatMessage } from '@/types/chat.types';
import MentionSuggestions from './MentionSuggestions';
import SlashCommandSuggestions from './SlashCommandSuggestions';
import { uploadImageToImgBB } from '@/lib/imgbb';
import { uploadFileToR2 } from '@/lib/r2';
import { toast } from 'sonner';
import EmojiPicker from './EmojiPicker';

import { PollCreatorModal } from './PollCreatorModal';
import { ApprovalCreatorModal } from './ApprovalCreatorModal';
import { BarChart2, CheckCircle2 } from 'lucide-react';
import { ClientSelectorModal } from './ClientSelectorModal';
import { Client } from '@/types';
import { MessageSchedulerModal } from './MessageSchedulerModal';
import { Timestamp } from 'firebase/firestore';
import { GifPickerModal } from './GifPickerModal';

interface MessageInputProps {
  onSend: (
    text: string, 
    mentions: string[], 
    attachments: string[], 
    replyTo: ChatMessage['replyTo'] | null, 
    members: string[], 
    type: "text" | "poll" | "approval" | "rich_link" | "client_card" | "sticker" | "bot_response", 
    poll?: ChatMessage['poll'],
    approval?: ChatMessage['approval'],
    richPreview?: ChatMessage['richPreview'],
    parentMessageId?: string,
    scheduledAt?: Timestamp
  ) => void;
  onTyping: (isTyping: boolean) => void;
  replyTo: ChatMessage['replyTo'] | null;
  onCancelReply: () => void;
  editingMessage: ChatMessage | null;
  onCancelEdit: () => void;
  onUpdate: (messageId: string, text: string) => void;
  members: string[];
  parentMessageId?: string; // Para enviar mensagens em Threads
  chatId?: string | null;
}

export default function MessageInput({ 
  onSend, onTyping, replyTo, onCancelReply, editingMessage, onCancelEdit, onUpdate, members, parentMessageId, chatId 
}: MessageInputProps) {
  const [isPollModalOpen, setIsPollModalOpen] = useState(false);
  const [isApprovalModalOpen, setIsApprovalModalOpen] = useState(false);
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [isSchedulerOpen, setIsSchedulerOpen] = useState(false);
  const [isGifModalOpen, setIsGifModalOpen] = useState(false);
  const [scheduledAt, setScheduledAt] = useState<Timestamp | null>(null);
  const [text, setText] = useState('');
  const [showMentions, setShowMentions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [uploading, setUploading] = useState(false);
  const { teamProfiles, orgRoles, effectiveOrgId, clients } = useCRM();
  const { userProfile } = useAuth();
  const [isEmojiOpen, setIsEmojiOpen] = useState(false);
  const [showSlashCommands, setShowSlashCommands] = useState(false);
  const [slashQuery, setSlashQuery] = useState('');
  const [processingBot, setProcessingBot] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout|null>(null);

  // Estados e Refs de Gravação de Áudio e Drag & Drop
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isDragActive, setIsDragActive] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Limpeza de timers de gravação
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragActive(true);
    } else if (e.type === "dragleave") {
      setIsDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      setUploading(true);
      const id = toast.loading(`Enviando arquivo arrastado: ${file.name}...`);
      try {
        const activeChatId = chatId || 'general';
        const url = await uploadFileToR2(file, activeChatId);
        onSend(`Enviou o arquivo: ${file.name}`, [], [url], null, members, "text");
        toast.success('Anexo enviado com sucesso!', { id });
      } catch (error: any) {
        console.error('[DRAG_DROP_UPLOAD_ERROR]', error);
        toast.error(`Erro ao enviar arquivo: ${error.message || 'tente novamente'}`, { id });
      } finally {
        setUploading(false);
      }
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        if (audioChunksRef.current.length === 0) return;
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });

        setUploading(true);
        const id = toast.loading('Enviando mensagem de voz...');
        try {
          const file = new File([audioBlob], `audio-${Date.now()}.webm`, { type: 'audio/webm' });
          const activeChatId = chatId || 'general';
          const url = await uploadFileToR2(file, activeChatId);
          onSend('Enviou uma mensagem de voz 🎙️', [], [url], null, members, "text");
          toast.success('Mensagem de voz enviada!', { id });
        } catch (error: any) {
          console.error('[AUDIO_RECORD_UPLOAD_ERROR]', error);
          toast.error(`Erro ao enviar mensagem de voz: ${error.message || 'tente novamente'}`, { id });
        } finally {
          setUploading(false);
        }

        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start(250);
      setIsRecording(true);
      setRecordingTime(0);

      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

    } catch (err) {
      console.error('Erro ao acessar microfone:', err);
      toast.error('Não foi possível acessar o microfone.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      audioChunksRef.current = [];
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      toast.info('Gravação cancelada');
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // Focus e carregar texto ao editar
  useEffect(() => {
    if (editingMessage) {
      setText(editingMessage.text);
      textareaRef.current?.focus();
    } else {
      setText('');
    }
  }, [editingMessage]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() && !uploading) return;

    if (editingMessage) {
      onUpdate(editingMessage.id, text);
      onCancelEdit();
    } else {
      // Lógica de Slash Commands manuais (ex: /pago Joao)
      if (text.startsWith('/')) {
        const parts = text.trim().split(' ');
        const cmdName = parts[0].toLowerCase();
        const args = parts.slice(1).join(' ');
        const cmd = findCommand(cmdName);
        if (cmd) {
          handleSlashCommand(cmd, args);
          return;
        }
      }

      const mentions = parseMentions(
        text, 
        teamProfiles.map(p => ({ uid: p.uid, displayName: p.displayName, roleId: p.roleId })),
        orgRoles.map(r => ({ id: r.id, name: r.name }))
      );
      onSend(text, mentions, [], replyTo, members, "text", undefined, undefined, undefined, parentMessageId, scheduledAt || undefined);
    }
    
    setText('');
    setScheduledAt(null);
    onTyping(false);
    setShowMentions(false);
    setShowSlashCommands(false);
  };

  const handleSlashCommand = async (cmd: BotCommand, args?: string) => {
    if (!effectiveOrgId || !userProfile?.uid) return;
    
    // Se selecionado da lista (sem args) e requer argumentos, apenas preenche o texto para o usuário continuar
    if (cmd.requiresArgs && !args) {
      setText(`${cmd.name} `);
      setShowSlashCommands(false);
      setTimeout(() => textareaRef.current?.focus(), 10);
      return;
    }

    setShowSlashCommands(false);
    setProcessingBot(true);
    setText('');

    // Envia o comando como mensagem do usuário
    const fullCommand = args ? `${cmd.name} ${args}` : cmd.name;
    onSend(fullCommand, [], [], null, members, 'text', undefined, undefined, undefined, parentMessageId, scheduledAt || undefined);

    const ctx: BotContext = {
      orgId: effectiveOrgId,
      userId: userProfile.uid,
      userName: userProfile.displayName || 'Membro',
      chatId: '', // será preenchido pelo hook
      members,
      teamProfiles,
      clients,
      args
    };

    try {
      const response = await cmd.handler(ctx);
      if (response) {
        // Envia a resposta do bot
        onSend(response, [], [], null, members, 'bot_response', undefined, undefined, undefined, parentMessageId);
      }
    } catch (error) {
      toast.error('Erro ao executar comando do bot.');
    } finally {
      setProcessingBot(false);
    }
  };

  const handleCreatePoll = (question: string, options: string[]) => {
    const pollData = {
      question,
      options: options.map(opt => ({
        id: crypto.randomUUID(),
        text: opt,
        votes: []
      }))
    };

    onSend('', [], [], null, members, 'poll', pollData, undefined, undefined, parentMessageId, scheduledAt || undefined);
  };

  const handleCreateApproval = (question: string, type: 'discount' | 'holiday' | 'expense' | 'other', value?: any) => {
    const approvalData: ChatMessage['approval'] = {
      question,
      type,
      status: 'pending',
      value
    };

    onSend('', [], [], null, members, 'approval', undefined, approvalData, undefined, parentMessageId, scheduledAt || undefined);
  };

  const handleSelectClient = (client: Client) => {
    const clientCardData: ChatMessage['richPreview'] = {
      title: client.name,
      description: client.notes || "Sem observações adicionais.",
      url: `/dashboard`, // No CRM atual, clicamos e abre o modal via estado global ou busca
      status: client.status,
      value: client.planPrice ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(client.planPrice) : 'N/A'
    };

    onSend(`Vinculei a ficha de ${client.name}`, [], [], null, members, 'client_card', undefined, undefined, clientCardData, parentMessageId, scheduledAt || undefined);
    // Nota: O onSend precisa aceitar richPreview ou tratamos internamente no hook. 
    // Vou ajustar o onSend para ser mais flexível se necessário.
    setIsClientModalOpen(false);
  };
  
  const handleSelectGif = (url: string, type: 'sticker') => {
    onSend('', [], [url], null, members, type, undefined, undefined, undefined, parentMessageId, scheduledAt || undefined);
    setIsGifModalOpen(false);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const id = toast.loading(`Enviando anexo: ${file.name}...`);
    try {
      const activeChatId = chatId || 'general';
      const url = await uploadFileToR2(file, activeChatId);
      onSend(`Enviou o arquivo: ${file.name}`, [], [url], null, members, "text");
      toast.success('Anexo enviado com sucesso!', { id });
    } catch (error: any) {
      console.error('[UPLOAD_ERROR]', error);
      toast.error(`Erro ao enviar anexo: ${error.message || 'tente novamente'}`, { id });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setText(val);
    
    // Lógica de Menções
    const cursorPos = e.target.selectionStart;
    const lastAtPos = val.lastIndexOf('@', cursorPos - 1);
    
    if (lastAtPos !== -1) {
      const textAfterAt = val.slice(lastAtPos + 1, cursorPos);
      if (!textAfterAt.includes(' ')) {
        setShowMentions(true);
        setMentionQuery(textAfterAt);
      } else {
        setShowMentions(false);
      }
    } else {
      setShowMentions(false);
    }

    // Lógica de Slash Commands
    if (val.startsWith('/') && !val.includes(' ')) {
      setShowSlashCommands(true);
      setSlashQuery(val);
    } else {
      setShowSlashCommands(false);
    }

    onTyping(true);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      onTyping(false);
    }, 2000);
  };

  const handleMentionSelect = (item: { uid: string; displayName: string }) => {
    const cursorPos = textareaRef.current?.selectionStart || 0;
    const lastAtPos = text.lastIndexOf('@', cursorPos - 1);
    
    const beforeAt = text.slice(0, lastAtPos);
    const afterAt = text.slice(cursorPos);
    const mentionText = `@${item.displayName.replace(/\s/g, '')} `;
    
    setText(beforeAt + mentionText + afterAt);
    setShowMentions(false);
    textareaRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !showMentions) {
      e.preventDefault();
      handleSubmit(e);
    }
    if (e.key === 'Escape') {
      setShowMentions(false);
      setShowSlashCommands(false);
      setIsEmojiOpen(false);
    }
  };

  const handleEmojiSelect = (emoji: string) => {
    const cursorPos = textareaRef.current?.selectionStart || text.length;
    const before = text.slice(0, cursorPos);
    const after = text.slice(cursorPos);
    setText(before + emoji + after);
    
    // Devolve o foco ao textarea após 10ms
    setTimeout(() => {
      textareaRef.current?.focus();
    }, 10);
  };

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, []);

  return (
    <div 
      onDragEnter={handleDrag}
      onDragOver={handleDrag}
      onDragLeave={handleDrag}
      onDrop={handleDrop}
      className={`p-4 pb-4 bg-white dark:bg-black/20 border-t border-gray-100 dark:border-white/10 relative transition-all ${
        isDragActive ? 'bg-primary-500/10 border-t-primary-500 scale-[1.01]' : ''
      }`}
    >
      {/* Overlay Visual de Arrastar Arquivo */}
      {isDragActive && (
        <div className="absolute inset-0 bg-primary-500/10 border-2 border-dashed border-primary-500 z-50 flex flex-col items-center justify-center rounded-t-2xl pointer-events-none backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-16 h-16 rounded-full bg-primary-500 text-white flex items-center justify-center shadow-lg shadow-primary-500/20 mb-3">
            <Paperclip size={28} className="animate-bounce" />
          </div>
          <p className="text-sm font-black uppercase tracking-widest text-primary-600 dark:text-primary-400">Solte para enviar arquivo direto para o R2</p>
          <p className="text-[10px] text-gray-500 font-bold mt-1">Imagens, áudios, PDFs, planilhas e mais</p>
        </div>
      )}
      {/* Indicador de Resposta */}
      {replyTo && (
        <div className="absolute bottom-full left-0 right-0 bg-gray-50 dark:bg-white/5 p-3 flex justify-between items-center border-t border-gray-200 dark:border-white/10 animate-in slide-in-from-bottom">
          <div className="flex-1">
            <span className="text-xs font-bold text-primary-500 uppercase block mb-1">Respondendo a {replyTo.senderName}</span>
            <p className="text-sm text-gray-500 break-words line-clamp-1 italic leading-tight">"{replyTo.text}"</p>
          </div>
          <button onClick={onCancelReply} className="p-1 hover:bg-gray-200 dark:hover:bg-white/10 rounded-full transition-colors">
            <X size={16} className="text-gray-400" />
          </button>
        </div>
      )}

      {/* Indicador de Edição */}
      {editingMessage && (
        <div className="absolute bottom-full left-0 right-0 bg-amber-50 dark:bg-amber-500/10 p-3 flex justify-between items-center border-t border-amber-200 dark:border-amber-500/20 animate-in slide-in-from-bottom">
          <div className="flex-1">
            <span className="text-xs font-bold text-amber-600 dark:text-amber-500 uppercase block mb-1">Editando mensagem</span>
            <p className="text-sm text-amber-700 dark:text-amber-400 break-words line-clamp-1 italic leading-tight">"{editingMessage.text}"</p>
          </div>
          <button onClick={onCancelEdit} className="p-1 hover:bg-amber-200 dark:hover:bg-white/10 rounded-full transition-colors">
            <X size={16} className="text-amber-600" />
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-3 max-w-6xl mx-auto w-full">
        <input 
          type="file" 
          ref={fileInputRef} 
          className="hidden" 
          accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.rar"
          onChange={handleFileSelect}
        />
        
        {/* Barra de Ferramentas Superior */}
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
          <button 
            type="button" 
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
            className="p-2 text-gray-400 hover:text-primary-500 hover:bg-primary-500/10 rounded-lg transition-all disabled:opacity-50"
            title="Anexar arquivo"
          >
            {uploading ? <Loader2 size={18} className="animate-spin text-primary-500" /> : <Paperclip size={18} />}
          </button>

          <button 
            type="button" 
            onClick={() => setIsPollModalOpen(true)}
            className="p-2 text-gray-400 hover:text-primary-500 hover:bg-primary-500/10 rounded-lg transition-all"
            title="Criar Enquete"
          >
            <BarChart2 size={18} />
          </button>

          <button 
            type="button" 
            onClick={() => setIsApprovalModalOpen(true)}
            className="p-2 text-gray-400 hover:text-emerald-500 hover:bg-emerald-500/10 rounded-lg transition-all"
            title="Solicitar Aprovação"
          >
            <CheckCircle2 size={18} />
          </button>

          <button 
            type="button" 
            onClick={() => setIsClientModalOpen(true)}
            className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-500/10 rounded-lg transition-all"
            title="Vincular Cliente CRM"
          >
            <LayoutGrid size={18} />
          </button>

          <button 
            type="button" 
            onClick={() => setIsGifModalOpen(true)}
            className="p-2 text-gray-400 hover:text-amber-500 hover:bg-amber-500/10 rounded-lg transition-all"
            title="GIFs e Stickers"
          >
            <ImageIcon size={18} />
          </button>
        </div>

        {/* Área de Texto + Botão de Enviar */}
        <div className="flex items-end gap-2">
          {isRecording ? (
            <div className="flex-1 flex items-center justify-between bg-red-500/10 dark:bg-red-500/5 border border-dashed border-red-500/30 p-3 rounded-2xl animate-pulse min-h-[46px]">
              <div className="flex items-center gap-3">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
                <span className="text-xs font-black uppercase tracking-widest text-red-500 dark:text-red-400">Gravando mensagem de voz...</span>
                <span className="text-xs font-black px-2 py-0.5 bg-black/10 dark:bg-white/10 rounded-lg dark:text-white">{formatTime(recordingTime)}</span>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  type="button" 
                  onClick={cancelRecording}
                  className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all"
                  title="Cancelar gravação"
                >
                  <Trash2 size={16} />
                </button>
                <button 
                  type="button" 
                  onClick={stopRecording}
                  className="p-1.5 bg-red-500 text-white rounded-xl shadow-lg shadow-red-500/20 hover:scale-105 active:scale-95 transition-all flex items-center justify-center h-8 w-8"
                  title="Enviar gravação"
                >
                  <Send size={14} />
                </button>
              </div>
            </div>
          ) : (
            <div className="flex-1 relative">
              {showMentions && (
                <MentionSuggestions 
                  query={mentionQuery} 
                  members={teamProfiles.map(p => ({ uid: p.uid, displayName: p.displayName, photoURL: p.photoURL }))} 
                  roles={orgRoles.map(r => ({ id: r.id, name: r.name }))}
                  onSelect={handleMentionSelect} 
                  onClose={() => setShowMentions(false)} 
                />
              )}
              {showSlashCommands && (
                <SlashCommandSuggestions
                  commands={filterCommands(slashQuery)}
                  onSelect={handleSlashCommand}
                  query={slashQuery}
                />
              )}
              <textarea 
                ref={textareaRef}
                rows={1}
                placeholder="Escreva uma mensagem..."
                className="w-full bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 p-3 pr-12 rounded-2xl text-sm focus:outline-none focus:border-primary-500 transition-all dark:text-white resize-none max-h-32 custom-scrollbar"
                value={text}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
              />
              <button 
                type="button" 
                onClick={() => setIsEmojiOpen(!isEmojiOpen)}
                className="absolute right-3 bottom-3 text-gray-400 hover:text-amber-500 transition-colors"
              >
                <Smile size={20} />
              </button>

              <EmojiPicker 
                isOpen={isEmojiOpen} 
                onSelect={handleEmojiSelect} 
                onClose={() => setIsEmojiOpen(false)} 
              />
            </div>
          )}

          {!isRecording && (
            <div className="flex items-center gap-1">
              <button 
                type="button" 
                onClick={startRecording}
                disabled={uploading}
                className="p-3 text-gray-400 hover:text-red-500 hover:bg-red-500/10 rounded-2xl transition-all h-[46px] w-[46px] flex items-center justify-center shrink-0 disabled:opacity-50"
                title="Gravar Mensagem de Voz"
              >
                <Mic size={20} />
              </button>

              <button 
                type="button" 
                onClick={() => setIsSchedulerOpen(true)}
                className={`p-3 rounded-2xl transition-all h-[46px] w-[46px] flex items-center justify-center shrink-0 ${
                  scheduledAt 
                    ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/20' 
                    : 'text-gray-400 hover:text-amber-500 hover:bg-amber-500/10'
                }`}
                title="Agendar Mensagem"
              >
                <Clock size={20} />
              </button>

              <button 
                type="submit" 
                disabled={!text.trim() || uploading}
                className={`p-3 rounded-2xl shadow-lg transition-all h-[46px] w-[46px] flex items-center justify-center shrink-0 ${
                  text.trim() && !uploading
                    ? editingMessage 
                      ? 'bg-amber-500 text-white shadow-amber-500/20 hover:scale-105 active:scale-95'
                      : 'bg-primary-500 text-white shadow-primary-500/20 hover:scale-105 active:scale-95' 
                    : 'bg-gray-100 dark:bg-white/5 text-gray-400 cursor-not-allowed'
                }`}
              >
                {editingMessage ? <CheckCircle2 size={20} /> : <Send size={20} />}
              </button>
            </div>
          )}
        </div>
      </form>

      <PollCreatorModal 
        isOpen={isPollModalOpen}
        onClose={() => setIsPollModalOpen(false)}
        onSelect={handleCreatePoll}
      />

      <ApprovalCreatorModal 
        isOpen={isApprovalModalOpen}
        onClose={() => setIsApprovalModalOpen(false)}
        onSelect={handleCreateApproval}
      />

      <ClientSelectorModal 
        isOpen={isClientModalOpen}
        onClose={() => setIsClientModalOpen(false)}
        onSelect={handleSelectClient}
      />

      <MessageSchedulerModal 
        isOpen={isSchedulerOpen}
        onClose={() => setIsSchedulerOpen(false)}
        onSelect={(timestamp) => {
          if (timestamp && text.trim()) {
            onSend(text, [], [], null, members, "text", undefined, undefined, undefined, parentMessageId, timestamp);
            setText('');
            setScheduledAt(null);
          } else {
            setScheduledAt(timestamp);
          }
        }}
        currentScheduledAt={scheduledAt}
      />

      <GifPickerModal 
        isOpen={isGifModalOpen}
        onClose={() => setIsGifModalOpen(false)}
        onSelect={handleSelectGif}
      />
    </div>
  );
}
