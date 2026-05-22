import React, { useEffect, useRef } from 'react';
import { useCallStore } from '@/store/useCallStore';
import { useWebRTC } from '@/hooks/useWebRTC';
import { 
  Mic, MicOff, Video, VideoOff, PhoneOff, 
  Minimize2, Maximize2, User, Loader2, Volume2 
} from 'lucide-react';

export function CallOverlay() {
  const { endCall } = useWebRTC();
  const { 
    localStream, remoteStream, callStatus, connectionState, 
    callType, otherParticipant, isMuted, isVideoOff, isOverlayMinimized,
    toggleMute, toggleVideo, toggleMinimize 
  } = useCallStore();

  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);

  // Vincula as streams de midia aos elementos de video do HTML5
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream, isVideoOff, isOverlayMinimized]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream, isOverlayMinimized]);

  // Se nao estiver em estado ativo de ligacao, nao renderiza nada
  if (callStatus === 'idle' || callStatus === 'ringing') return null;

  // Renderizacao MINIMIZADA (Picture-in-Picture Interno)
  if (isOverlayMinimized) {
    return (
      <div className="fixed bottom-6 right-6 z-[9998] flex w-72 flex-col overflow-hidden rounded-xl border border-white/10 bg-gray-900/90 shadow-2xl backdrop-blur-xl animate-scale-up">
        {/* Top Header */}
        <div className="flex items-center justify-between bg-black/40 px-4 py-2 text-white">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 animate-pulse rounded-full bg-green-500"></div>
            <span className="text-xs font-semibold truncate max-w-[150px]">{otherParticipant?.name}</span>
          </div>
          <button 
            onClick={toggleMinimize}
            className="rounded p-1 text-gray-400 hover:bg-white/10 hover:text-white"
            title="Maximizar"
          >
            <Maximize2 className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Video or Audio body */}
        <div className="relative aspect-video w-full bg-gray-950 flex items-center justify-center">
          {callType === 'video' && remoteStream && !isVideoOff ? (
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex flex-col items-center justify-center p-4">
              {otherParticipant?.avatarUrl ? (
                <img
                  src={otherParticipant.avatarUrl}
                  alt={otherParticipant.name}
                  className="h-12 w-12 rounded-full border border-primary-500 object-cover animate-pulse"
                />
              ) : (
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-800 text-gray-400">
                  <User className="h-6 w-6" />
                </div>
              )}
              <span className="mt-2 text-[10px] text-gray-400">
                {connectionState === 'connected' ? 'Em chamada (Apenas Áudio)' : 'Ligando...'}
              </span>
            </div>
          )}

          {/* Mini Local Self-View se for video */}
          {callType === 'video' && localStream && !isVideoOff && (
            <div className="absolute bottom-2 right-2 h-12 w-16 overflow-hidden rounded border border-white/20 bg-black">
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="h-full w-full object-cover"
              />
            </div>
          )}
        </div>

        {/* Mini Controls */}
        <div className="flex items-center justify-around bg-black/30 p-2">
          <button
            onClick={toggleMute}
            className={`rounded-full p-2 text-white transition hover:bg-white/10 ${isMuted ? 'bg-red-600 hover:bg-red-500' : ''}`}
          >
            {isMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
          </button>
          
          <button
            onClick={endCall}
            className="rounded-full bg-red-600 p-2 text-white transition hover:bg-red-500"
          >
            <PhoneOff className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  // Renderizacao MAXIMIZADA (Tela Cheia / Modal Principal)
  return (
    <div className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/95 backdrop-blur-sm animate-fade-in">
      <div className="relative flex h-full w-full flex-col justify-between p-6 md:p-8">
        
        {/* Top Bar: Participant Info & Minimize */}
        <div className="flex items-center justify-between text-white z-10">
          <div className="flex items-center gap-3">
            {otherParticipant?.avatarUrl ? (
              <img
                src={otherParticipant.avatarUrl}
                alt={otherParticipant.name}
                className="h-10 w-10 rounded-full object-cover border border-white/20"
              />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-800 text-gray-400">
                <User className="h-5 w-5" />
              </div>
            )}
            <div>
              <h4 className="font-bold text-lg leading-tight">{otherParticipant?.name}</h4>
              <p className="text-xs text-gray-400">
                {connectionState === 'connected' ? (
                  <span className="flex items-center gap-1 text-green-400">
                    <span className="h-2 w-2 rounded-full bg-green-400 animate-ping"></span>
                    Chamada ativa
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 text-primary-400">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Estabelecendo conexão...
                  </span>
                )}
              </p>
            </div>
          </div>

          <button
            onClick={toggleMinimize}
            className="flex items-center justify-center rounded-full bg-white/5 p-3 text-white border border-white/10 hover:bg-white/10 hover:scale-105 active:scale-95 transition-all duration-300"
            title="Minimizar chamada"
          >
            <Minimize2 className="h-5 w-5" />
          </button>
        </div>

        {/* Main Central Media Area */}
        <div className="relative flex-1 my-6 rounded-2xl overflow-hidden bg-gray-950 border border-white/5 flex items-center justify-center">
          {callStatus === 'calling' ? (
            /* Tela de Espera (Calling) */
            <div className="flex flex-col items-center text-center p-8">
              <div className="relative flex h-28 w-28 items-center justify-center">
                <div className="absolute inset-0 animate-ping rounded-full bg-primary-600/25"></div>
                {otherParticipant?.avatarUrl ? (
                  <img
                    src={otherParticipant.avatarUrl}
                    alt={otherParticipant.name}
                    className="h-24 w-24 rounded-full border border-primary-500 object-cover shadow-2xl"
                  />
                ) : (
                  <div className="flex h-24 w-24 items-center justify-center rounded-full bg-gray-950 border border-primary-500 text-gray-400 shadow-2xl">
                    <User className="h-12 w-12 text-primary-400" />
                  </div>
                )}
              </div>
              <h3 className="mt-6 text-xl font-semibold text-white">Ligando para {otherParticipant?.name}...</h3>
              <p className="mt-2 text-sm text-gray-400">Aguardando resposta do participante</p>
            </div>
          ) : callType === 'video' ? (
            /* Tela de Video Remoto (Full-Screen) */
            <div className="relative h-full w-full">
              {remoteStream ? (
                <video
                  ref={remoteVideoRef}
                  autoPlay
                  playsInline
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900/60">
                  <Loader2 className="h-10 w-10 text-primary-500 animate-spin" />
                  <span className="mt-4 text-sm text-gray-400">Aguardando vídeo remoto...</span>
                </div>
              )}

              {/* PiP Local Video (Flutuante e compacto no canto) */}
              <div className="absolute top-4 right-4 h-32 w-44 overflow-hidden rounded-xl border border-white/20 bg-gray-950 shadow-2xl">
                {localStream && !isVideoOff ? (
                  <video
                    ref={localVideoRef}
                    autoPlay
                    playsInline
                    muted
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full flex-col items-center justify-center bg-gray-900 text-gray-400 text-center p-2">
                    <VideoOff className="h-5 w-5 mb-1" />
                    <span className="text-[10px]">Câmera desligada</span>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Tela de Audio Exclusiva (Sem Video) */
            <div className="flex flex-col md:flex-row items-center justify-center gap-12 p-8">
              {/* Meu Avatar */}
              <div className="flex flex-col items-center gap-3">
                <div className="flex h-24 w-24 items-center justify-center rounded-full bg-gray-900 border-2 border-white/10 overflow-hidden shadow-2xl">
                  {localStream ? (
                    <div className="flex items-center gap-1 animate-pulse">
                      <div className="h-4 w-1 bg-green-400 rounded-full"></div>
                      <div className="h-8 w-1 bg-green-400 rounded-full animate-bounce"></div>
                      <div className="h-4 w-1 bg-green-400 rounded-full"></div>
                    </div>
                  ) : (
                    <User className="h-10 w-10 text-gray-400" />
                  )}
                </div>
                <span className="text-xs text-gray-400 font-medium">Você</span>
              </div>

              {/* Linha Pulsante de Conexao */}
              <div className="flex items-center gap-2 text-primary-500">
                <Volume2 className="h-6 w-6 animate-pulse" />
                <span className="text-gray-600 font-bold">••••</span>
                <Volume2 className="h-6 w-6 animate-pulse" />
              </div>

              {/* Avatar do Participante */}
              <div className="flex flex-col items-center gap-3">
                <div className="relative flex h-24 w-24 items-center justify-center rounded-full bg-gray-900 border-2 border-primary-500 overflow-hidden shadow-2xl animate-pulse">
                  {otherParticipant?.avatarUrl ? (
                    <img
                      src={otherParticipant.avatarUrl}
                      alt={otherParticipant.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <User className="h-10 w-10 text-primary-400" />
                  )}
                </div>
                <span className="text-xs text-gray-400 font-medium">{otherParticipant?.name}</span>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Control Bar */}
        <div className="flex justify-center items-center gap-6 z-10">
          {/* Mute microfone */}
          <button
            onClick={toggleMute}
            className={`group flex h-14 w-14 items-center justify-center rounded-full border transition-all duration-300 ${
              isMuted 
                ? 'bg-red-600 border-red-600 text-white hover:bg-red-500' 
                : 'bg-white/5 border-white/10 text-white hover:bg-white/10 hover:scale-105 active:scale-95'
            }`}
            title={isMuted ? 'Ativar microfone' : 'Mutar microfone'}
          >
            {isMuted ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
          </button>

          {/* Desligar Chamada */}
          <button
            onClick={endCall}
            className="flex h-16 w-16 items-center justify-center rounded-full bg-red-600 text-white shadow-xl shadow-red-900/30 hover:bg-red-500 hover:scale-110 hover:rotate-[135deg] active:scale-95 transition-all duration-300"
            title="Desligar chamada"
          >
            <PhoneOff className="h-7 w-7" />
          </button>

          {/* Ocultar/Exibir video */}
          {callType === 'video' && (
            <button
              onClick={toggleVideo}
              className={`group flex h-14 w-14 items-center justify-center rounded-full border transition-all duration-300 ${
                isVideoOff 
                  ? 'bg-red-600 border-red-600 text-white hover:bg-red-500' 
                  : 'bg-white/5 border-white/10 text-white hover:bg-white/10 hover:scale-105 active:scale-95'
              }`}
              title={isVideoOff ? 'Ligar câmera' : 'Desligar câmera'}
            >
              {isVideoOff ? <VideoOff className="h-6 w-6" /> : <Video className="h-6 w-6" />}
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
