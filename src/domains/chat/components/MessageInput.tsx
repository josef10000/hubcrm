import React, { useState, useRef, useEffect } from 'react';
import { Send, Paperclip, Smile, X, Loader2, Calendar, LayoutGrid, Image as ImageIcon, Clock, Mic, MicOff, Square, Trash2, Zap, AlertTriangle, Settings } from 'lucide-react';
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
import { useChatStore } from '@/store/useChatStore';
import ManageTemplatesModal from './ManageTemplatesModal';

interface MessageInputProps {
  onSend: (
    text: string, 
    mentions: string[], 
    attachments: string[], 
    replyTo: ChatMessage['replyTo'] | null, 
    members: string[], 
    type: "text" | "poll" | "approval" | "rich_link" | "client_card" | "sticker" | "bot_response" | "checklist", 
    poll?: ChatMessage['poll'],
    approval?: ChatMessage['approval'],
    richPreview?: ChatMessage['richPreview'],
    parentMessageId?: string,
    scheduledAt?: Timestamp,
    priority?: ChatMessage['priority'],
    checklist?: ChatMessage['checklist'],
    transcription?: string
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
  onEdit?: (message: ChatMessage) => void;
}

export default function MessageInput({ 
  onSend, onTyping, replyTo, onCancelReply, editingMessage, onCancelEdit, onUpdate, members, parentMessageId, chatId, onEdit 
}: MessageInputProps) {
  const drafts = useChatStore(state => state.drafts);
  const setDraft = useChatStore(state => state.setDraft);
  const quickTemplates = useChatStore(state => state.quickTemplates);
  const messages = useChatStore(state => state.messages);

  const [priority, setPriority] = useState<'normal' | 'urgent'>('normal');
  const [showTemplates, setShowTemplates] = useState(false);
  const [isManageTemplatesOpen, setIsManageTemplatesOpen] = useState(false);

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

  // Estados para Digitação por Voz no input de texto
  const [isDictating, setIsDictating] = useState(false);
  const dictationRecognitionRef = useRef<any>(null);

  // Refs para Transcrição Silenciosa na gravação de áudio
  const audioSpeechRecognitionRef = useRef<any>(null);
  const audioTranscriptionRef = useRef<string>('');

  // Estados e Refs de Gravação de Áudio e Drag & Drop
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isDragActive, setIsDragActive] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const isCancelledRef = useRef(false);

  // Analisador de áudio para waveform em tempo real
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Limpeza de timers de gravação e animações
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      cleanupAudioAnalyser();
      if (dictationRecognitionRef.current) {
        try {
          dictationRecognitionRef.current.stop();
        } catch (e) {}
      }
      if (audioSpeechRecognitionRef.current) {
        try {
          audioSpeechRecognitionRef.current.stop();
        } catch (e) {}
      }
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

  const cleanupAudioAnalyser = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (audioContextRef.current) {
      if (audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch(() => {});
      }
      audioContextRef.current = null;
    }
    analyserRef.current = null;
  };

  const getThemeColorHex = () => {
    try {
      const classList = document.documentElement.classList;
      const isDark = classList.contains('dark');
      if (classList.contains('theme-blue')) return { primary: '#3b82f6', primary600: '#2563eb' };
      if (classList.contains('theme-green')) return { primary: '#22c55e', primary600: '#16a34a' };
      if (classList.contains('theme-purple')) return { primary: '#a855f7', primary600: '#9333ea' };
      if (classList.contains('theme-rose')) return { primary: '#f43f5e', primary600: '#e11d48' };
      if (classList.contains('theme-orange')) return { primary: '#f97316', primary600: '#ea580c' };
      if (classList.contains('theme-cyberpunk')) return { primary: '#00f3ff', primary600: '#00d8e6' };
      if (classList.contains('theme-minimalist')) {
        return isDark ? { primary: '#f9fafb', primary600: '#ffffff' } : { primary: '#111827', primary600: '#000000' };
      }
      if (classList.contains('theme-forest')) return { primary: '#10b981', primary600: '#059669' };
      if (classList.contains('theme-nordic')) return { primary: '#0ea5e9', primary600: '#0284c7' };
      if (classList.contains('theme-midnight')) return { primary: '#8b5cf6', primary600: '#7c3aed' };
      if (classList.contains('theme-barbie')) return { primary: '#f472b6', primary600: '#db2777' };
      if (classList.contains('theme-branco-elite')) return { primary: '#0f172a', primary600: '#020617' };
    } catch (e) {
      console.warn('Erro ao ler classList do documentElement:', e);
    }
    // Tenta fallback dinâmico pelo getComputedStyle
    try {
      const computed500 = getComputedStyle(document.documentElement).getPropertyValue('--primary-500').trim();
      const computed600 = getComputedStyle(document.documentElement).getPropertyValue('--primary-600').trim();
      if (computed500) {
        return { primary: computed500, primary600: computed600 || computed500 };
      }
    } catch (e) {}
    // Fallback padrão se tudo falhar (laranja)
    return { primary: '#f97316', primary600: '#ea580c' };
  };

  const drawWaveform = () => {
    if (!analyserRef.current || !canvasRef.current) {
      animationFrameRef.current = requestAnimationFrame(drawWaveform);
      return;
    }

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const analyser = analyserRef.current;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      if (!analyserRef.current || !canvasRef.current) return;
      animationFrameRef.current = requestAnimationFrame(draw);

      analyser.getByteFrequencyData(dataArray);

      const width = canvas.width;
      const height = canvas.height;
      ctx.clearRect(0, 0, width, height);

      // Desenhar barras simétricas elegantes no centro do canvas
      const barWidth = 2.5;
      const gap = 2;
      const totalBarWidth = barWidth + gap;
      const numBars = Math.floor(width / totalBarWidth);

      // Obter cor primária do tema dinâmico de forma ultra robusta
      const colors = getThemeColorHex();

      const gradient = ctx.createLinearGradient(0, 0, width, 0);
      gradient.addColorStop(0, colors.primary);
      gradient.addColorStop(1, colors.primary600);

      ctx.fillStyle = gradient;

      for (let i = 0; i < numBars; i++) {
        // Mapear o índice da barra para os dados do analisador (espelhado)
        const dataIdx = i < numBars / 2 
          ? Math.floor((i / (numBars / 2)) * (bufferLength / 2))
          : Math.floor(((numBars - i) / (numBars / 2)) * (bufferLength / 2));
        
        const value = dataArray[dataIdx] || 0;
        const percent = value / 255;
        const barHeight = Math.max(3, percent * height * 0.95);

        const x = i * totalBarWidth;
        const y = (height - barHeight) / 2; // Centralizado verticalmente

        ctx.beginPath();
        // Desenhar com cantos levemente arredondados
        if (ctx.roundRect) {
          ctx.roundRect(x, y, barWidth, barHeight, 1.25);
        } else {
          ctx.rect(x, y, barWidth, barHeight);
        }
        ctx.fill();
      }
    };

    draw();
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      isCancelledRef.current = false;
      audioTranscriptionRef.current = '';
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        cleanupAudioAnalyser();
        // Para o reconhecimento de fala silencioso
        if (audioSpeechRecognitionRef.current) {
          try { audioSpeechRecognitionRef.current.stop(); } catch (e) {}
          audioSpeechRecognitionRef.current = null;
        }
        if (isCancelledRef.current) {
          stream.getTracks().forEach(track => track.stop());
          return;
        }
        if (audioChunksRef.current.length === 0) return;
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });

        // Captura a transcrição acumulada antes de limpar
        const finalTranscription = audioTranscriptionRef.current.trim() || undefined;
        audioTranscriptionRef.current = '';

        setUploading(true);
        const id = toast.loading('Enviando mensagem de voz...');
        try {
          const file = new File([audioBlob], `audio-${Date.now()}_duration_${recordingTime}.webm`, { type: 'audio/webm' });
          const activeChatId = chatId || 'general';
          const url = await uploadFileToR2(file, activeChatId);
          onSend('Enviou uma mensagem de voz 🎙️', [], [url], null, members, "text", undefined, undefined, undefined, parentMessageId, undefined, undefined, undefined, finalTranscription);
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

      // Inicia transcrição silenciosa em paralelo (Speech-to-Text)
      try {
        const SpeechRecognitionClass = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (SpeechRecognitionClass) {
          const recognition = new SpeechRecognitionClass();
          recognition.lang = 'pt-BR';
          recognition.continuous = true;
          recognition.interimResults = false;
          recognition.maxAlternatives = 1;

          recognition.onresult = (event: any) => {
            let transcript = '';
            for (let i = event.resultIndex; i < event.results.length; i++) {
              if (event.results[i].isFinal) {
                transcript += event.results[i][0].transcript;
              }
            }
            if (transcript) {
              audioTranscriptionRef.current += (audioTranscriptionRef.current ? ' ' : '') + transcript;
            }
          };

          recognition.onerror = (event: any) => {
            if (event.error !== 'aborted' && event.error !== 'no-speech') {
              console.warn('[STT_AUDIO] Erro no reconhecimento silencioso:', event.error);
            }
          };

          recognition.onend = () => {
            // Reinicia automaticamente se ainda estiver gravando
            if (isRecording && !isCancelledRef.current && audioSpeechRecognitionRef.current) {
              try { recognition.start(); } catch (e) {}
            }
          };

          audioSpeechRecognitionRef.current = recognition;
          recognition.start();
        }
      } catch (sttErr) {
        console.warn('[STT_AUDIO] Speech Recognition não disponível:', sttErr);
      }

      // Inicia a Waveform em tempo real
      setTimeout(() => {
        try {
          const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
          if (AudioContextClass) {
            const audioCtx = new AudioContextClass();
            audioContextRef.current = audioCtx;
            const source = audioCtx.createMediaStreamSource(stream);
            const analyser = audioCtx.createAnalyser();
            analyser.fftSize = 64;
            source.connect(analyser);
            analyserRef.current = analyser;
            
            drawWaveform();
          }
        } catch (audioErr) {
          console.warn('Erro ao inicializar analisador de áudio:', audioErr);
        }
      }, 100);

    } catch (err) {
      console.error('Erro ao acessar microfone:', err);
      toast.error('Não foi possível acessar o microfone.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      // O STT silencioso será parado no onstop do mediaRecorder
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
      isCancelledRef.current = true;
      audioChunksRef.current = [];
      audioTranscriptionRef.current = '';
      
      // Para o reconhecimento de fala silencioso
      if (audioSpeechRecognitionRef.current) {
        try { audioSpeechRecognitionRef.current.stop(); } catch (e) {}
        audioSpeechRecognitionRef.current = null;
      }
      
      const recorder = mediaRecorderRef.current;
      recorder.onstop = null; // Previne que o envio ocorra ao disparar stop
      
      try {
        recorder.stop();
      } catch (e) {
        console.error('Erro ao parar recorder:', e);
      }
      
      // Garante que todas as faixas da stream sejam paradas imediatamente
      if (recorder.stream) {
        recorder.stream.getTracks().forEach(track => track.stop());
      }
      
      cleanupAudioAnalyser();
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

  // Digitação por Voz — toggle de ditado em tempo real no textarea
  const toggleDictation = () => {
    const SpeechRecognitionClass = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionClass) {
      toast.error('Reconhecimento de voz não suportado neste navegador.');
      return;
    }

    if (isDictating) {
      // Parar ditado
      if (dictationRecognitionRef.current) {
        try { dictationRecognitionRef.current.stop(); } catch (e) {}
        dictationRecognitionRef.current = null;
      }
      setIsDictating(false);
      toast.info('Ditado encerrado');
      return;
    }

    // Iniciar ditado
    const recognition = new SpeechRecognitionClass();
    recognition.lang = 'pt-BR';
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    let finalizedText = text; // O texto base no momento de iniciar o ditado

    recognition.onresult = (event: any) => {
      let interim = '';
      let newFinal = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          newFinal += transcript;
        } else {
          interim += transcript;
        }
      }
      if (newFinal) {
        finalizedText += (finalizedText ? ' ' : '') + newFinal;
      }
      const displayText = finalizedText + (interim ? ' ' + interim : '');
      setText(displayText);
      if (chatId) {
        setDraft(chatId, displayText);
      }
    };

    recognition.onerror = (event: any) => {
      if (event.error !== 'aborted' && event.error !== 'no-speech') {
        console.warn('[STT_DICTATION] Erro:', event.error);
        toast.error('Erro no reconhecimento de voz: ' + event.error);
      }
    };

    recognition.onend = () => {
      // Reinicia automaticamente se o ditado está ativo
      if (isDictating && dictationRecognitionRef.current) {
        try { recognition.start(); } catch (e) {}
      } else {
        setIsDictating(false);
      }
    };

    dictationRecognitionRef.current = recognition;
    recognition.start();
    setIsDictating(true);
    toast.success('🎤 Ditado ativado — fale agora!');
    textareaRef.current?.focus();
  };

  // Restaurar rascunho ao trocar de canal
  useEffect(() => {
    if (!editingMessage) {
      if (chatId) {
        setText(drafts[chatId] || '');
      } else {
        setText('');
      }
    }
  }, [chatId]);

  // Focus e carregar texto ao editar ou restaurar rascunho
  useEffect(() => {
    if (editingMessage) {
      setText(editingMessage.text);
      textareaRef.current?.focus();
    } else {
      setText(chatId ? drafts[chatId] || '' : '');
    }
  }, [editingMessage, chatId, drafts]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() && !uploading) return;

    if (editingMessage) {
      onUpdate(editingMessage.id, text);
      onCancelEdit();
    } else {
      // Lógica de Slash Commands manuais (ex: /pago Joao)
      if (text.startsWith('/')) {
        // Comando /checklist
        if (text.toLowerCase().startsWith('/checklist ')) {
          const itemsText = text.replace(/^\/checklist\s+/i, '');
          const items = itemsText.split(',').map(item => item.trim()).filter(item => item.length > 0);
          if (items.length > 0) {
            const checklistData = items.map(t => ({
              id: crypto.randomUUID(),
              text: t,
              completed: false
            }));
            onSend('', [], [], null, members, 'checklist', undefined, undefined, undefined, parentMessageId, scheduledAt || undefined, priority, checklistData);
            
            if (chatId) {
              setDraft(chatId, '');
            }
            setText('');
            setScheduledAt(null);
            setPriority('normal');
            onTyping(false);
            return;
          }
        }

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
      onSend(text, mentions, [], replyTo, members, "text", undefined, undefined, undefined, parentMessageId, scheduledAt || undefined, priority);
    }
    
    if (chatId) {
      setDraft(chatId, '');
    }
    setText('');
    setScheduledAt(null);
    setPriority('normal');
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
    if (chatId) {
      setDraft(chatId, '');
    }
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
    if (chatId) {
      setDraft(chatId, val);
    }
    
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
    const newVal = beforeAt + mentionText + afterAt;
    
    setText(newVal);
    if (chatId) {
      setDraft(chatId, newVal);
    }
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
      setShowTemplates(false);
    }
    if (e.key === 'ArrowUp' && !text && !showMentions && !showSlashCommands && !editingMessage) {
      e.preventDefault();
      if (onEdit && userProfile?.uid) {
        const myMsgs = messages.filter(m => m.senderId === userProfile.uid && !m.isDeleted);
        if (myMsgs.length > 0) {
          const lastMsg = myMsgs[myMsgs.length - 1];
          onEdit(lastMsg);
        }
      }
    }
  };

  const handleEmojiSelect = (emoji: string) => {
    const cursorPos = textareaRef.current?.selectionStart || text.length;
    const before = text.slice(0, cursorPos);
    const after = text.slice(cursorPos);
    const newVal = before + emoji + after;
    setText(newVal);
    if (chatId) {
      setDraft(chatId, newVal);
    }
    
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
        <div className="flex flex-wrap items-center gap-1">
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

          {/* Templates de Resposta Rápida (⚡) */}
          <div className="relative">
            <button 
              type="button" 
              onClick={() => setShowTemplates(!showTemplates)}
              className={`p-2 rounded-lg transition-all ${showTemplates ? 'text-primary-500 bg-primary-500/10' : 'text-gray-400 hover:text-primary-500 hover:bg-primary-500/10'}`}
              title="Templates Rápidos"
            >
              <Zap size={18} />
            </button>
            {showTemplates && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowTemplates(false)} />
                <div className="absolute left-0 bottom-full mb-2 w-64 bg-white dark:bg-zinc-950 border border-gray-100 dark:border-white/10 rounded-2xl shadow-2xl py-2 z-50 animate-in fade-in zoom-in-95 duration-200 max-h-48 overflow-y-auto custom-scrollbar">
                  <div className="px-3 py-1 text-[10px] font-black uppercase tracking-widest text-gray-400 border-b border-gray-100 dark:border-white/5 mb-1 flex items-center justify-between">
                    <span>Templates de Resposta</span>
                    <button 
                      type="button"
                      onClick={() => {
                        setShowTemplates(false);
                        setIsManageTemplatesOpen(true);
                      }}
                      className="p-1 hover:bg-gray-100 dark:hover:bg-white/5 rounded text-gray-400 hover:text-primary-500 transition-colors"
                      title="Gerenciar Templates"
                    >
                      <Settings size={12} />
                    </button>
                  </div>
                  {((quickTemplates && quickTemplates.length > 0) ? quickTemplates : [
                    { id: '1', title: 'Boas-vindas', text: 'Olá! Seja muito bem-vindo ao HubCRM. Como posso te ajudar hoje? 😊' },
                    { id: '2', title: 'Agradecimento', text: 'Muito obrigado pelo retorno! Estarei analisando os dados e te retorno em breve. 👍' },
                    { id: '3', title: 'Aguardando Proposta', text: 'Olá, acabei de enviar uma proposta comercial para sua aprovação no chat. Poderia verificar, por favor? 🚀' }
                  ]).map(tpl => (
                    <button
                      key={tpl.id}
                      type="button"
                      onClick={() => {
                        setText(tpl.text);
                        setShowTemplates(false);
                        textareaRef.current?.focus();
                      }}
                      className="w-full text-left px-3 py-2 text-xs font-bold text-gray-700 dark:text-gray-300 hover:bg-primary-500 hover:text-white transition-colors truncate"
                      title={tpl.text}
                    >
                      ⚡ <span className="font-semibold text-primary-500 dark:text-primary-400 mr-1">[{tpl.title}]</span> {tpl.text}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Seletor de Prioridade (🚨) */}
          <button 
            type="button" 
            onClick={() => setPriority(prev => prev === 'normal' ? 'urgent' : 'normal')}
            className={`p-2 rounded-lg transition-all ${
              priority === 'urgent' 
                ? 'text-red-500 bg-red-500/10 animate-pulse' 
                : 'text-gray-400 hover:text-red-500 hover:bg-red-500/10'
            }`}
            title="Marcar como URGENTE 🚨"
          >
            <AlertTriangle size={18} />
          </button>

          {/* Botão de Digitação por Voz (🎤 Ditar) */}
          <button 
            type="button" 
            onClick={toggleDictation}
            disabled={isRecording}
            className={`p-2 rounded-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed ${
              isDictating 
                ? 'text-emerald-500 bg-emerald-500/15 shadow-sm shadow-emerald-500/20 ring-1 ring-emerald-500/30 animate-pulse' 
                : 'text-gray-400 hover:text-emerald-500 hover:bg-emerald-500/10'
            }`}
            title={isDictating ? 'Parar Ditado' : 'Ditar por Voz'}
          >
            {isDictating ? <MicOff size={18} /> : <Mic size={18} />}
          </button>
        </div>

        {/* Área de Texto + Botão de Enviar */}
        <div className="flex items-end gap-2">
          {isRecording ? (
            <div className="flex-1 flex flex-col md:flex-row items-center gap-4 bg-white/70 dark:bg-zinc-950/65 backdrop-blur-2xl border border-white/20 dark:border-white/10 p-4 rounded-[2rem] shadow-2xl shadow-primary-500/5 animate-in fade-in zoom-in-95 duration-300 min-h-[80px]">
              <div className="flex items-center gap-3 shrink-0">
                <div className="relative flex items-center justify-center">
                  <span className="absolute inline-flex h-3.5 w-3.5 rounded-full bg-primary-500 opacity-75 animate-ping" />
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-primary-500 shadow-md shadow-primary-500/50" />
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest bg-clip-text text-transparent bg-gradient-to-r from-primary-500 to-primary-600">GRAVAÇÃO ATIVA</span>
                <span className="text-sm font-mono font-black px-3 py-1 bg-primary-500/10 dark:bg-primary-500/20 text-primary-600 dark:text-primary-400 rounded-full border border-primary-500/15 shadow-inner">
                  {formatTime(recordingTime)}
                </span>
              </div>
              
              {/* Waveform em tempo real */}
              <div className="flex-1 h-12 w-full min-w-[120px] bg-gray-50/50 dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/5 overflow-hidden p-1.5 flex items-center justify-center relative shadow-inner">
                <canvas 
                  ref={canvasRef} 
                  width={300} 
                  height={40} 
                  className="w-full h-full block relative z-10" 
                />
                
                {/* Fallback animado em CSS se a animação do canvas não rodar */}
                {(!analyserRef.current) && (
                  <div className="absolute inset-0 flex items-center justify-center gap-1 opacity-40">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16].map((idx) => {
                      const heights = ['h-3', 'h-5', 'h-8', 'h-4', 'h-6', 'h-2', 'h-7', 'h-5', 'h-3', 'h-6', 'h-8', 'h-4', 'h-3', 'h-7', 'h-5', 'h-2'];
                      const delay = `${(idx * 0.08).toFixed(2)}s`;
                      return (
                        <div 
                          key={idx} 
                          className="w-1 bg-primary-500 rounded-full h-3 animate-pulse" 
                          style={{ animationDelay: delay, animationDuration: '0.8s' }} 
                        />
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <button 
                  type="button" 
                  onClick={cancelRecording}
                  className="px-4 py-2.5 text-gray-500 hover:text-primary-500 hover:bg-primary-500/10 dark:hover:bg-primary-500/20 rounded-2xl transition-all duration-200 flex items-center gap-1.5 text-xs font-black uppercase tracking-wider hover:scale-105 active:scale-95 shadow-sm"
                  title="Cancelar gravação"
                >
                  <Trash2 size={16} />
                  Cancelar
                </button>
                <button 
                  type="button" 
                  onClick={stopRecording}
                  className="px-5 py-2.5 bg-primary-500 hover:bg-primary-600 text-white rounded-2xl shadow-lg shadow-primary-500/20 hover:shadow-primary-500/30 border border-primary-600/10 hover:scale-[1.03] active:scale-95 transition-all duration-200 flex items-center gap-2 text-xs font-black uppercase tracking-wider"
                  title="Enviar gravação"
                >
                  <Send size={14} />
                  Enviar
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
                className={`w-full p-3 pr-12 rounded-2xl text-sm focus:outline-none transition-all dark:text-white resize-none max-h-32 custom-scrollbar ${
                  priority === 'urgent'
                    ? 'bg-red-500/5 border-2 border-red-500 focus:border-red-600 shadow-[0_0_12px_rgba(239,68,68,0.2)] animate-pulse'
                    : 'bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 focus:border-primary-500'
                }`}
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
            if (chatId) {
              setDraft(chatId, '');
            }
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

      <ManageTemplatesModal 
        isOpen={isManageTemplatesOpen}
        onClose={() => setIsManageTemplatesOpen(false)}
      />
    </div>
  );
}
