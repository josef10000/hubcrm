import React, { useState, useRef, useEffect } from 'react';
import { Video, Mic, MicOff, Square, Play, Pause, Trash2, X, Copy, Check, Send, Sparkles } from 'lucide-react';
import { useUI } from '@/contexts/UIContext';
import { useChatStore } from '@/store/useChatStore';
import { useAuth } from '@auth/contexts/AuthContext';
import { useCRM } from '@crm/contexts/CRMContext';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';

export function ScreenRecorderWidget() {
  const { isRecorderOpen, setIsRecorderOpen, recorderDefaultChannelId, setRecorderDefaultChannelId } = useUI();
  const { chats, sendMessage } = useChatStore();
  const { userProfile } = useAuth();
  const { effectiveOrgId } = useCRM();

  const [micEnabled, setMicEnabled] = useState(true);
  const [recordingState, setRecordingState] = useState<'idle' | 'recording' | 'paused' | 'uploading' | 'success'>('idle');
  const [time, setTime] = useState(0);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Monitorar o estado e gerenciar o timer
  useEffect(() => {
    if (recordingState === 'recording') {
      timerRef.current = setInterval(() => {
        setTime((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [recordingState]);

  // Se fechar o modal, resetar tudo
  useEffect(() => {
    if (!isRecorderOpen) {
      cleanupStreams();
      setRecordingState('idle');
      setTime(0);
      setVideoUrl(null);
      setCopied(false);
      setSelectedChatId(null);
    } else if (recorderDefaultChannelId) {
      setSelectedChatId(recorderDefaultChannelId);
    }
  }, [isRecorderOpen]);

  const cleanupStreams = () => {
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((track) => track.stop());
      screenStreamRef.current = null;
    }
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((track) => track.stop());
      micStreamRef.current = null;
    }
    mediaRecorderRef.current = null;
    chunksRef.current = [];
  };

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainder = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${remainder.toString().padStart(2, '0')}`;
  };

  const startRecording = async () => {
    try {
      chunksRef.current = [];
      setTime(0);

      // 1. Capturar a Tela
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          displaySurface: 'monitor',
        },
        audio: true, // Capturar áudio do sistema se disponível
      });
      screenStreamRef.current = screenStream;

      // 2. Capturar o Microfone se habilitado
      let combinedStream = screenStream;
      if (micEnabled) {
        try {
          const micStream = await navigator.mediaDevices.getUserMedia({
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
            },
          });
          micStreamRef.current = micStream;

          // Combinar trilhas
          const tracks = [...screenStream.getVideoTracks(), ...micStream.getAudioTracks()];
          // Se o displayMedia já veio com áudio de sistema, adicionamos também
          if (screenStream.getAudioTracks().length > 0) {
            tracks.push(screenStream.getAudioTracks()[0]);
          }
          combinedStream = new MediaStream(tracks);
        } catch (micErr) {
          console.warn('Erro ao obter microfone. Gravando apenas tela/áudio do sistema:', micErr);
          toast.warning('Microfone não pôde ser ativado, gravando apenas áudio do sistema.');
        }
      }

      // 3. Configurar o MediaRecorder
      const options = { mimeType: 'video/webm;codecs=vp9' };
      let recorder: MediaRecorder;
      try {
        recorder = new MediaRecorder(combinedStream, options);
      } catch (e) {
        recorder = new MediaRecorder(combinedStream, { mimeType: 'video/webm' });
      }

      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      recorder.onstop = async () => {
        await processAndUploadRecording();
      };

      // Iniciar
      recorder.start(1000); // chunk a cada 1s
      setRecordingState('recording');
      toast.success('Gravação iniciada! Mostre o que precisa no CRM.');

      // Se o usuário parar o compartilhamento de tela pelo navegador
      screenStream.getVideoTracks()[0].onended = () => {
        stopRecording();
      };

    } catch (err: any) {
      console.error('Erro ao iniciar gravação:', err);
      toast.error('Não foi possível iniciar a gravação. Verifique as permissões de tela e microfone.');
      cleanupStreams();
      setRecordingState('idle');
    }
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current && recordingState === 'recording') {
      mediaRecorderRef.current.pause();
      setRecordingState('paused');
      toast.info('Gravação pausada.');
    }
  };

  const resumeRecording = () => {
    if (mediaRecorderRef.current && recordingState === 'paused') {
      mediaRecorderRef.current.resume();
      setRecordingState('recording');
      toast.success('Gravação retomada.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && (recordingState === 'recording' || recordingState === 'paused')) {
      mediaRecorderRef.current.stop();
      setRecordingState('uploading');
    }
  };

  const discardRecording = () => {
    cleanupStreams();
    setRecordingState('idle');
    setTime(0);
    toast.info('Gravação descartada.');
  };

  const processAndUploadRecording = async () => {
    try {
      const blob = new Blob(chunksRef.current, { type: 'video/webm' });
      cleanupStreams();

      const fileName = `loom-nativo-${Date.now()}.webm`;
      const fileType = 'video/webm';
      const channelId = selectedChatId || 'global-recordings';

      // 1. Obter URL assinada para upload do R2
      const urlResponse = await fetch('/api/storage/upload-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName, fileType, channelId }),
      });

      if (!urlResponse.ok) {
        throw new Error('Falha ao assinar upload no R2');
      }

      const { presignedUrl, publicAccessUrl } = await urlResponse.json();

      // 2. Upload do blob via PUT
      const uploadResponse = await fetch(presignedUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': fileType,
        },
        body: blob,
      });

      if (!uploadResponse.ok) {
        throw new Error('Erro ao fazer upload do vídeo no Cloudflare R2');
      }

      // 3. Copiar para área de transferência automaticamente
      setVideoUrl(publicAccessUrl);
      setRecordingState('success');
      await navigator.clipboard.writeText(publicAccessUrl);
      setCopied(true);
      toast.success('Vídeo gravado e link copiado automaticamente para a área de transferência! 🚀');

    } catch (error: any) {
      console.error('Erro no processamento da gravação:', error);
      toast.error(`Erro ao salvar gravação: ${error.message || 'Erro desconhecido'}`);
      setRecordingState('idle');
    }
  };

  const copyToClipboard = async () => {
    if (videoUrl) {
      await navigator.clipboard.writeText(videoUrl);
      setCopied(true);
      toast.success('Link copiado!');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleShareToChat = async () => {
    if (!videoUrl || !selectedChatId || !effectiveOrgId || !userProfile) {
      toast.error('Não foi possível compartilhar no chat. Verifique se há uma conversa selecionada.');
      return;
    }

    try {
      // Enviar no chat usando a store
      const text = `🎥 Gravou uma demonstração rápida de tela:\n${videoUrl}`;
      await sendMessage(
        effectiveOrgId,
        selectedChatId,
        userProfile.uid,
        userProfile.displayName || 'Colaborador',
        userProfile.photoURL || '',
        text,
        [],
        [videoUrl],
        undefined,
        'text'
      );

      toast.success('Gravação compartilhada com sucesso no chat!');
      setIsRecorderOpen(false);
    } catch (err: any) {
      console.error('Erro ao compartilhar no chat:', err);
      toast.error('Erro ao enviar mensagem com a gravação.');
    }
  };

  if (!isRecorderOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
      <div className="relative w-full max-w-lg overflow-hidden bg-zinc-900/90 border border-white/10 rounded-[2.5rem] shadow-2xl shadow-rose-500/10 backdrop-blur-2xl">
        {/* Glow neon vermelho de gravação */}
        {recordingState === 'recording' && (
          <div className="absolute inset-0 border border-rose-500/30 animate-pulse pointer-events-none rounded-[2.5rem]" />
        )}

        {/* Header */}
        <div className="p-6 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-500/15 flex items-center justify-center text-rose-500 animate-pulse">
              <Video size={20} />
            </div>
            <div>
              <h3 className="text-lg font-black tracking-tight text-white uppercase">Loom Nativo CRM</h3>
              <p className="text-[10px] font-bold text-zinc-500 tracking-wider uppercase">Gravação Expressa com 1 Clique</p>
            </div>
          </div>
          <button
            onClick={() => setIsRecorderOpen(false)}
            className="p-2 text-zinc-500 hover:text-white hover:bg-white/5 rounded-full transition-all"
            disabled={recordingState === 'recording' || recordingState === 'uploading'}
          >
            <X size={20} />
          </button>
        </div>

        {/* Conteúdo */}
        <div className="p-8 flex flex-col items-center justify-center min-h-[220px]">
          {recordingState === 'idle' && (
            <div className="w-full flex flex-col items-center space-y-6">
              <div className="w-20 h-20 bg-rose-500/10 rounded-[2rem] border border-rose-500/20 flex items-center justify-center text-rose-500 shadow-lg shadow-rose-500/5">
                <Video size={36} />
              </div>
              <div className="text-center space-y-2">
                <h4 className="text-md font-bold text-white">Pronto para gravar a tela?</h4>
                <p className="text-xs text-zinc-400 max-w-xs leading-relaxed">
                  Grave sua tela com voz para dar feedbacks, explicar fluxos ou reportar melhorias instantaneamente.
                </p>
              </div>

              {/* Controles de Entrada */}
              <div className="flex items-center gap-6 p-4 bg-white/5 rounded-2xl border border-white/5 w-full max-w-sm justify-between">
                <div className="flex items-center gap-2">
                  {micEnabled ? <Mic size={16} className="text-emerald-400" /> : <MicOff size={16} className="text-rose-400" />}
                  <span className="text-xs font-bold text-zinc-300">Capturar Microfone (Voz)</span>
                </div>
                <button
                  onClick={() => setMicEnabled(!micEnabled)}
                  className={`w-10 h-6 flex items-center rounded-full p-1 cursor-pointer transition-all duration-300 ${
                    micEnabled ? 'bg-emerald-500 justify-end' : 'bg-zinc-700 justify-start'
                  }`}
                >
                  <div className="w-4 h-4 bg-white rounded-full shadow-md" />
                </button>
              </div>

              <button
                onClick={startRecording}
                className="w-full max-w-sm py-4 bg-rose-500 hover:bg-rose-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs transition-all shadow-xl shadow-rose-500/30 hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
              >
                Começar Gravação
              </button>
            </div>
          )}

          {(recordingState === 'recording' || recordingState === 'paused') && (
            <div className="w-full flex flex-col items-center space-y-6">
              <div className="relative flex items-center justify-center">
                {/* Círculo pulsante de gravação */}
                <div className="absolute inset-[-15px] bg-rose-500/20 rounded-full animate-ping" />
                <div className="w-20 h-20 bg-rose-500 rounded-[2rem] flex items-center justify-center text-white shadow-xl shadow-rose-500/40">
                  {recordingState === 'recording' ? <Video size={36} className="animate-pulse" /> : <Pause size={36} />}
                </div>
              </div>

              <div className="text-center space-y-2">
                <span className="text-3xl font-black font-mono text-white tracking-wider">{formatTime(time)}</span>
                <p className="text-[10px] font-black uppercase tracking-wider text-rose-500 flex items-center gap-1.5 justify-center">
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                  {recordingState === 'recording' ? 'Gravando Tela + Voz' : 'Gravação Pausada'}
                </p>
              </div>

              {/* Botões de Ação da Gravação */}
              <div className="flex items-center gap-3 w-full max-w-sm justify-center">
                <button
                  onClick={recordingState === 'recording' ? pauseRecording : resumeRecording}
                  className="flex-1 py-3.5 bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-2xl font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  {recordingState === 'recording' ? (
                    <>
                      <Pause size={14} /> Pausar
                    </>
                  ) : (
                    <>
                      <Play size={14} /> Retomar
                    </>
                  )}
                </button>
                <button
                  onClick={stopRecording}
                  className="flex-1 py-3.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl font-black uppercase tracking-wider text-xs transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 cursor-pointer"
                >
                  <Square size={14} className="fill-current" /> Finalizar
                </button>
                <button
                  onClick={discardRecording}
                  className="p-3.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 rounded-2xl transition-all cursor-pointer"
                  title="Descartar Gravação"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          )}

          {recordingState === 'uploading' && (
            <div className="w-full flex flex-col items-center space-y-6">
              <div className="w-16 h-16 border-4 border-rose-500 border-t-transparent rounded-full animate-spin mb-4" />
              <div className="text-center space-y-2">
                <h4 className="text-md font-bold text-white">Salvando Gravação no Cloudflare R2...</h4>
                <p className="text-xs text-zinc-400 max-w-xs leading-relaxed">
                  Processando o vídeo webm de alta definição e gerando link de visualização rápida de forma segura.
                </p>
              </div>
            </div>
          )}

          {recordingState === 'success' && videoUrl && (
            <div className="w-full flex flex-col items-center space-y-6 animate-in zoom-in-95 duration-300">
              <div className="w-20 h-20 bg-emerald-500/15 rounded-[2rem] border border-emerald-500/20 flex items-center justify-center text-emerald-400 shadow-lg shadow-emerald-500/5 relative">
                <Sparkles className="absolute -top-1 -right-1 text-amber-400 animate-bounce" size={18} />
                <Check size={36} />
              </div>
              <div className="text-center space-y-2">
                <h4 className="text-md font-bold text-white">Vídeo salvo com Sucesso!</h4>
                <p className="text-xs text-zinc-400 max-w-xs leading-relaxed">
                  O link foi copiado automaticamente. Agora você pode colar em qualquer lugar ou compartilhar rápido abaixo:
                </p>
              </div>

              {/* Input com o Link Copiado */}
              <div className="flex items-center gap-2 p-2 bg-white/5 border border-white/5 rounded-2xl w-full max-w-md">
                <input
                  type="text"
                  readOnly
                  value={videoUrl}
                  className="bg-transparent border-none text-[11px] text-zinc-300 focus:outline-none flex-1 font-mono px-2"
                />
                <button
                  onClick={copyToClipboard}
                  className="px-3.5 py-2 bg-white/10 hover:bg-white/15 text-white rounded-xl text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 transition-all"
                >
                  {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                  {copied ? 'Copiado' : 'Copiar'}
                </button>
              </div>

              {/* Compartilhamento Rápido no Chat */}
              <div className="w-full border-t border-white/5 pt-6 space-y-4">
                <h5 className="text-[10px] font-black uppercase tracking-wider text-zinc-400 text-center">Compartilhar Direto no Chat</h5>
                
                <div className="flex flex-col gap-3 max-h-40 overflow-y-auto custom-scrollbar px-1">
                  {chats.slice(0, 4).map((c) => {
                    let chatName = c.name || '';
                    if (c.type === 'direct') {
                      const otherUserId = c.members.find(id => id !== userProfile?.uid);
                      const otherUser = otherUserId ? useCRM.getState().teamProfiles.find(p => p.uid === otherUserId) : null;
                      chatName = otherUser?.displayName || 'Chat Privado';
                    } else if (c.type === 'self') {
                      chatName = 'Meu Espaço (Você)';
                    } else if (c.type === 'channel') {
                      chatName = `#${c.name}`;
                    }

                    return (
                      <button
                        key={c.id}
                        onClick={() => setSelectedChatId(c.id)}
                        className={`flex items-center justify-between p-3 rounded-xl border text-left transition-all ${
                          selectedChatId === c.id
                            ? 'bg-rose-500/10 border-rose-500/40 text-rose-300'
                            : 'bg-white/5 border-white/5 hover:border-white/10 text-zinc-300'
                        }`}
                      >
                        <span className="text-xs font-bold truncate">{chatName}</span>
                        {selectedChatId === c.id && <span className="text-[8px] font-black uppercase bg-rose-500/20 text-rose-300 px-2 py-0.5 rounded-full">Selecionado</span>}
                      </button>
                    );
                  })}
                </div>

                {selectedChatId && (
                  <button
                    onClick={handleShareToChat}
                    className="w-full py-4 bg-rose-500 hover:bg-rose-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs transition-all flex items-center justify-center gap-2 shadow-xl shadow-rose-500/20 cursor-pointer"
                  >
                    <Send size={12} className="-rotate-45" /> Compartilhar no Chat
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
