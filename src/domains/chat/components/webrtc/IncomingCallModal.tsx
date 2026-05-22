import React from 'react';
import { useCallStore } from '@/store/useCallStore';
import { useWebRTC } from '@/hooks/useWebRTC';
import { Phone, PhoneOff, Video, User } from 'lucide-react';

export function IncomingCallModal() {
  const { answerCall, rejectCall } = useWebRTC();
  const otherParticipant = useCallStore((s) => s.otherParticipant);
  const callType = useCallStore((s) => s.callType);

  if (!otherParticipant) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-md animate-fade-in">
      {/* Container Principal do Modal com Glassmorphism Exuberante */}
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-white/10 bg-gray-900/85 p-8 text-center text-white shadow-2xl backdrop-blur-2xl transition-all duration-300">
        
        {/* Anéis de Pulsação de Chamada */}
        <div className="relative mx-auto flex h-24 w-24 items-center justify-center">
          <div className="absolute inset-0 animate-ping rounded-full bg-primary-500/20 duration-1000"></div>
          <div className="absolute inset-2 animate-ping rounded-full bg-primary-500/30 duration-700"></div>
          
          {/* Foto ou Avatar do Participante */}
          {otherParticipant.avatarUrl ? (
            <img
              src={otherParticipant.avatarUrl}
              alt={otherParticipant.name}
              className="relative h-20 w-20 rounded-full border-2 border-primary-500 object-cover shadow-lg"
            />
          ) : (
            <div className="relative flex h-20 w-20 items-center justify-center rounded-full border-2 border-primary-500 bg-gray-800 text-gray-400 shadow-lg">
              <User className="h-10 w-10 text-primary-400" />
            </div>
          )}
          
          {/* Tipo de Chamada Icon Tag */}
          <div className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full bg-primary-600 shadow-md">
            {callType === 'video' ? (
              <Video className="h-4 w-4 text-white" />
            ) : (
              <Phone className="h-4 w-4 text-white" />
            )}
          </div>
        </div>

        {/* Informações da Chamada */}
        <h3 className="mt-6 text-2xl font-bold tracking-tight text-white">
          {otherParticipant.name}
        </h3>
        <p className="mt-2 text-sm text-gray-400 tracking-wide animate-pulse">
          Chamando você para uma ligação de {callType === 'video' ? 'Vídeo' : 'Áudio'}...
        </p>

        {/* Botões de Ação */}
        <div className="mt-8 flex justify-center gap-6">
          {/* Botão Recusar */}
          <button
            onClick={rejectCall}
            className="group flex h-14 w-14 items-center justify-center rounded-full bg-red-600 shadow-lg shadow-red-900/30 transition-all duration-300 hover:scale-110 hover:bg-red-500 active:scale-95"
            title="Recusar"
          >
            <PhoneOff className="h-6 w-6 text-white group-hover:animate-shake" />
          </button>

          {/* Botão Atender */}
          <button
            onClick={answerCall}
            className="group flex h-14 w-14 items-center justify-center rounded-full bg-green-600 shadow-lg shadow-green-900/30 transition-all duration-300 hover:scale-110 hover:bg-green-500 active:scale-95 animate-bounce-slow"
            title="Atender"
          >
            <Phone className="h-6 w-6 text-white group-hover:rotate-12" />
          </button>
        </div>

      </div>
    </div>
  );
}
