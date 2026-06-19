import React, { useRef, useEffect, useState } from 'react';
import { useRadioStore, Station } from '@/store/useRadioStore';
import { useCallStore } from '@/store/useCallStore';
import Visualizer from './Visualizer';
import FocusVibesTab from './FocusVibesTab';
import RealRadiosTab from './RealRadiosTab';
import { 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  Music, 
  Radio, 
  Minus, 
  Maximize2,
  Headphones,
  Video,
  VideoOff
} from 'lucide-react';

export default function RadioPlayer() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const youtubeIframeRef = useRef<HTMLIFrameElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  
  const [spotifyKillKey, setSpotifyKillKey] = useState(Date.now());

  const {
    isPlaying,
    volume,
    isMuted,
    currentStation,
    activeTab,
    isMinimized,
    togglePlay,
    setVolume,
    toggleMute,
    toggleMinimize,
    setActiveTab,
    setPlayingState,
    showYoutubeVideo,
    toggleYoutubeVideo
  } = useRadioStore();

  const callStatus = useCallStore((state) => state.callStatus);
  const wasPlayingBeforeCallRef = useRef(false);



  // 5. ESCUTA DE EVENTOS SILENCIOSOS DO YOUTUBE VIA POSTMESSAGE
  useEffect(() => {
    const handleYoutubeMessages = (event: MessageEvent) => {
      if (!event.origin.includes('youtube.com')) return;
      
      try {
        const data = JSON.parse(event.data);
        
        // YouTube API envia dados em infoDelivery quando o estado do player muda
        if (data.event === 'infoDelivery' && data.info) {
          const playerState = data.info.playerState;
          // Estados: 1 = tocando, 2 = pausado, 0 = finalizado
          if (playerState === 1) {
            setPlayingState(true);
          } else if (playerState === 2 || playerState === 0) {
            setPlayingState(false);
          }
        }

        // OnStateChange clássico
        if (data.event === 'onStateChange') {
          const playerState = data.info;
          if (playerState === 1) {
            setPlayingState(true);
          } else if (playerState === 2 || playerState === 0) {
            setPlayingState(false);
          }
        }
      } catch (err) {
        // Ignora dados que não sejam do player
      }
    };

    window.addEventListener('message', handleYoutubeMessages);
    return () => window.removeEventListener('message', handleYoutubeMessages);
  }, [setPlayingState]);

  // 6. CONTROLE INTELIGENTE DE CHAMADAS DE VOZ (MUTAR/PAUSAR)
  useEffect(() => {
    if (callStatus === 'ringing' || callStatus === 'connected') {
      if (isPlaying) {
        wasPlayingBeforeCallRef.current = true;
        setPlayingState(false);
      }
    } else if (callStatus === 'idle' || !callStatus) {
      if (wasPlayingBeforeCallRef.current) {
        wasPlayingBeforeCallRef.current = false;
        setPlayingState(true);
      }
    }
  }, [callStatus, isPlaying, setPlayingState]);

  // EFEITO DE CORREÇÃO DO SPOTIFY EMBED (IFRAME)
  useEffect(() => {
    if (currentStation?.type === 'spotify') {
      if (isMuted || volume === 0 || callStatus === 'ringing' || callStatus === 'connected') {
        setSpotifyKillKey(Date.now());
      }
    }
  }, [isMuted, volume, callStatus, currentStation]);

  // 7. SINCRONIZAÇÃO DE ELEMENTO DE ÁUDIO NATIVO (FOCUS VIBES)
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = isMuted ? 0 : volume;
    audio.muted = isMuted;
  }, [volume, isMuted]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !currentStation) return;

    const handleSrcChange = async () => {
      // Pausa o áudio nativo se não for uma vibe local
      if (currentStation.type === 'spotify' || currentStation.type === 'youtube') {
        audio.pause();
        return;
      }

      if (audio.src !== currentStation.url) {
        audio.src = currentStation.url;
        audio.load();
      }

      if (isPlaying) {
        try {
          await audio.play();
        } catch (err) {
          console.warn('Autoplay bloqueado pelo navegador ou rádio offline:', err);
          setPlayingState(false);
        }
      } else {
        audio.pause();
      }
    };

    handleSrcChange();
  }, [currentStation, isPlaying, setPlayingState]);

  // 8. HELPERS DE ENDEREÇO DE EMBED E OAUTH
  const getSpotifyEmbedUrl = (url: string) => {
    if (!url) return '';
    try {
      const match = url.match(/spotify\.com\/(?:[a-zA-Z-]+\/)?(playlist|track|album|artist)\/([a-zA-Z0-9]+)/);
      if (match) {
        return `https://open.spotify.com/embed/${match[1]}/${match[2]}?utm_source=generator`;
      }
      return url.split('?')[0].replace('open.spotify.com/', 'open.spotify.com/embed/');
    } catch (e) {
      return url;
    }
  };

  const getYoutubeEmbedUrl = (url: string) => {
    if (!url) return '';
    try {
      const isPlaylist = url.includes('list=');
      if (isPlaylist) {
        const playlistMatch = url.match(/[?&]list=([^#\&\?]+)/);
        if (playlistMatch) {
          return `https://www.youtube.com/embed/videoseries?list=${playlistMatch[1]}&enablejsapi=1&autoplay=0`;
        }
      }
      
      const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
      const match = url.match(regExp);
      const videoId = (match && match[2].length === 11) ? match[2] : null;
      
      if (videoId) {
        return `https://www.youtube.com/embed/${videoId}?enablejsapi=1&autoplay=0`;
      }
      return url;
    } catch (e) {
      return url;
    }
  };

  // FLAGS DE DOM KILL SWITCH
  const shouldRenderSpotifyEmbed = 
    currentStation?.type === 'spotify' && 
    !isMuted && 
    volume > 0 && 
    callStatus !== 'ringing' && 
    callStatus !== 'connected';

  const shouldRenderYoutube = 
    currentStation?.type === 'youtube' && 
    !isMuted && 
    volume > 0 && 
    callStatus !== 'ringing' && 
    callStatus !== 'connected';

  // CONTROLE DE COMANDOS DO YOUTUBE VIA POSTMESSAGE
  useEffect(() => {
    if (shouldRenderYoutube && youtubeIframeRef.current) {
      const iframe = youtubeIframeRef.current;
      const targetVolume = isMuted ? 0 : Math.round(volume * 100);
      
      const sendVolume = () => {
        iframe.contentWindow?.postMessage(
          JSON.stringify({ event: 'command', func: 'setVolume', args: [targetVolume] }),
          '*'
        );
      };
      const timer = setTimeout(sendVolume, 500);
      return () => clearTimeout(timer);
    }
  }, [volume, isMuted, shouldRenderYoutube]);

  useEffect(() => {
    if (shouldRenderYoutube && youtubeIframeRef.current) {
      const iframe = youtubeIframeRef.current;
      const funcName = isPlaying ? 'playVideo' : 'pauseVideo';
      
      const sendPlay = () => {
        iframe.contentWindow?.postMessage(
          JSON.stringify({ event: 'command', func: funcName, args: [] }),
          '*'
        );
      };
      const timer = setTimeout(sendPlay, 500);
      return () => clearTimeout(timer);
    }
  }, [isPlaying, shouldRenderYoutube]);

  const handleAudioError = (e: any) => {
    console.error('Erro na rádio Lofi local:', e);
    if (isPlaying) setPlayingState(false);
  };

  // EFEITO PARA MINIMIZAR AO CLICAR FORA (CLICK OUTSIDE)
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!isMinimized && containerRef.current && !containerRef.current.contains(event.target as Node)) {
        toggleMinimize();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMinimized, toggleMinimize]);

  // FORMATADOR DE TEMPO (mm:ss)
  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  return (
    <>
      <audio ref={audioRef} onError={handleAudioError} preload="auto" />

      {/* RENDERIZADOR DO WIDGET FLUTUANTE GLOBAL (DESIGN LIQUID GLASS) */}
      <div 
        ref={containerRef}
        className={`fixed bottom-6 right-6 z-50 transition-all duration-500 font-sans ${
          isMinimized 
            ? 'w-12 h-12 rounded-full cursor-pointer' 
            : 'w-80 rounded-2xl'
        }`}
      >
        {/* ================= ESTADO MINIMIZADO (DYNAMIC ISLAND CIRCLE) ================= */}
        <div 
          onClick={toggleMinimize}
          className={`w-full h-full rounded-full flex items-center justify-center border border-white/20 dark:border-white/10 shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] backdrop-blur-[20px] bg-slate-900/35 transition-all duration-500 hover:scale-105 active:scale-95 group ${
            isMinimized 
              ? 'opacity-100 scale-100 pointer-events-auto' 
              : 'opacity-0 scale-95 pointer-events-none absolute inset-0'
          } ${
            isPlaying
              ? 'border-emerald-500/30 text-emerald-400 animate-spin-slow shadow-[0_0_15px_rgba(16,185,129,0.25)]' 
              : 'text-white/70 hover:bg-black/80 hover:text-white'
          }`}
          title="Abrir Central de Foco"
        >
          <Headphones className={`w-5 h-5 transition-transform duration-300 ${isPlaying ? 'scale-105' : 'group-hover:rotate-12'}`} />
          {isPlaying && (
            <span className="absolute top-0.5 right-0.5 flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
          )}
        </div>

        {/* ================= ESTADO EXPANDIDO (WIDGET COMPLETO PREMIUM LIQUID GLASS) ================= */}
        <div 
          className={`w-full bg-slate-950/40 border border-white/10 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] rounded-2xl p-4 flex flex-col gap-3.5 backdrop-blur-[24px] transition-all duration-500 origin-bottom-right ${
            !isMinimized 
              ? 'opacity-100 scale-100 pointer-events-auto relative' 
              : 'opacity-0 scale-95 pointer-events-none absolute bottom-0 right-0 w-0 h-0 overflow-hidden'
          }`}
        >
          {/* Efeitos decorativos luminosos de fundo */}
          <div className="absolute -top-10 -right-10 w-24 h-24 bg-primary/20 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute -bottom-10 -left-10 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

          {/* Cabeçalho */}
          <div className="flex items-center justify-between relative z-10">
            <div className="flex items-center gap-2">
              <Music className="w-4 h-4 text-emerald-400 animate-pulse" />
              <span className="text-xs font-bold text-white tracking-wider font-mono">HUB FOCUS STATION</span>
            </div>
            <div className="flex items-center gap-1.5">
              {currentStation?.type === 'youtube' && (
                <button
                  onClick={toggleYoutubeVideo}
                  className="text-white/40 hover:text-white p-1 rounded-lg hover:bg-white/5 transition-all"
                  title={showYoutubeVideo ? "Modo Apenas Áudio" : "Exibir Vídeo com Áudio"}
                >
                  {showYoutubeVideo ? <Video className="w-4 h-4 text-emerald-400" /> : <VideoOff className="w-4 h-4 text-white/40" />}
                </button>
              )}
              <button 
                onClick={toggleMinimize}
                className="text-white/40 hover:text-white p-1 rounded-lg hover:bg-white/5 transition-all"
                title="Minimizar"
              >
                <Minus className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Estação Ativa e Tipo */}
          <div className="bg-white/5 border border-white/5 p-3 rounded-xl flex items-center gap-3 relative z-10 backdrop-blur-md">
            <div className="w-10 h-10 rounded-lg overflow-hidden bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
              {currentStation?.favicon ? (
                <img 
                  src={currentStation.favicon} 
                  alt={currentStation.name} 
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              ) : null}
              <Radio className="w-5 h-5 text-white/40 absolute" />
            </div>
            
            <div className="min-w-0 flex-1">
              <div className="text-[10px] font-bold text-white/30 uppercase tracking-widest font-mono">
                {currentStation?.type === 'vibe' 
                  ? '🧠 Foco Ativo' 
                  : currentStation?.type === 'youtube' 
                    ? '📺 YouTube Player' 
                    : '🎵 Spotify Embed'}
              </div>
              <div className="text-xs font-bold text-white truncate pr-1">
                {currentStation?.name || 'Selecione uma playlist'}
              </div>
            </div>
          </div>

          {/* ================= CONTROLE CONDICIONAL DE REPRODUTORES ================= */}
          
          {/* A: SPOTIFY PLAYER (EMBED GRATUITO) */}
          {currentStation?.type === 'spotify' && (
            <div className="space-y-1.5 relative z-10 animate-fade-in">
              <div className="relative w-full overflow-hidden rounded-xl border border-white/10 bg-black/40">
                {shouldRenderSpotifyEmbed ? (
                  <iframe
                    key={spotifyKillKey}
                    src={getSpotifyEmbedUrl(currentStation.url)}
                    width="100%"
                    height="200"
                    frameBorder="0"
                    allowFullScreen={false}
                    allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                    loading="lazy"
                    title={currentStation.name}
                    className="rounded-xl shadow-lg"
                  />
                ) : (
                  <div className="h-[200px] w-full flex flex-col items-center justify-center text-white/40 text-center p-4">
                    <VolumeX className="w-8 h-8 text-red-400 mb-2 animate-bounce" />
                    <span className="text-xs font-bold font-mono text-red-400">PLAYER MUTADO / LIGAÇÃO ATIVA</span>
                    <span className="text-[10px] text-white/30 mt-1">O som foi interrompido para sua privacidade.</span>
                  </div>
                )}
              </div>
              <div className="text-[8px] text-white/30 text-center leading-normal px-1 font-mono">
                💡 Clique no botão de Play do Spotify acima.
              </div>
            </div>
          )}

          {/* B: YOUTUBE PLAYER */}
          {currentStation?.type === 'youtube' && (
            <div className="space-y-1.5 relative z-10 animate-fade-in">
              <div className={`relative w-full overflow-hidden rounded-xl border transition-all duration-300 ${
                showYoutubeVideo 
                  ? 'h-[200px] border-white/10 bg-black/40' 
                  : 'h-0 border-none bg-transparent'
              }`}>
                {shouldRenderYoutube ? (
                  <iframe
                    ref={youtubeIframeRef}
                    src={getYoutubeEmbedUrl(currentStation.url)}
                    width="100%"
                    height={showYoutubeVideo ? "200" : "0"}
                    frameBorder="0"
                    allowFullScreen={false}
                    allow="autoplay; encrypted-media; picture-in-picture"
                    loading="lazy"
                    title={currentStation.name}
                    className={`rounded-xl shadow-lg transition-all duration-300 ${
                      showYoutubeVideo 
                        ? 'w-full h-[200px]' 
                        : 'absolute opacity-0 pointer-events-none w-0 h-0'
                    }`}
                  />
                ) : (
                  <div className="h-[200px] w-full flex flex-col items-center justify-center text-white/40 text-center p-4">
                    <VolumeX className="w-8 h-8 text-red-400 mb-2 animate-bounce" />
                    <span className="text-xs font-bold font-mono text-red-400">PLAYER MUTADO / LIGAÇÃO ATIVA</span>
                    <span className="text-[10px] text-white/30 mt-1">O som foi interrompido para sua privacidade.</span>
                  </div>
                )}
              </div>
              {showYoutubeVideo && (
                <div className="text-[8px] text-white/30 text-center leading-normal px-1 font-mono">
                  💡 Controlado nativamente pelo CRM abaixo.
                </div>
              )}
            </div>
          )}

          {/* CONTROLES GERAIS (APENAS LOFI OU YOUTUBE) */}
          {(currentStation?.type === 'vibe' || currentStation?.type === 'youtube') && (
            <div className="animate-fade-in">
              <Visualizer isPlaying={isPlaying} />
              
              <div className="flex items-center gap-3 relative z-10 bg-white/5 border border-white/5 p-2 rounded-xl mt-1.5">
                <button 
                  onClick={togglePlay}
                  className={`w-9 h-9 rounded-full flex items-center justify-center transition-all duration-300 shadow-lg shrink-0 ${
                    isPlaying 
                      ? 'bg-white text-slate-900 hover:scale-105 active:scale-95' 
                      : 'bg-emerald-500 text-white hover:bg-emerald-600 hover:scale-105 active:scale-95'
                  }`}
                >
                  {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
                </button>

                <div className="flex items-center gap-2 flex-1">
                  <button onClick={toggleMute} className="text-white/50 hover:text-white transition-all shrink-0 p-1">
                    {isMuted || volume === 0 ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4" />}
                  </button>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={isMuted ? 0 : volume}
                    onChange={(e) => setVolume(parseFloat(e.target.value))}
                    className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-emerald-500 transition-all outline-none"
                    style={{
                      background: `linear-gradient(to right, #10b981 ${(isMuted ? 0 : volume) * 100}%, rgba(255,255,255,0.1) ${(isMuted ? 0 : volume) * 100}%)`,
                    }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* ================= SELEÇÃO DE ABAS & GERENCIADORES ================= */}
          <div className="flex flex-col gap-2 relative z-10 flex-1 min-h-0">
            {/* Seleção de Abas */}
            <div className="flex border border-white/10 p-0.5 bg-black/40 rounded-lg shrink-0 font-mono">
              <button
                onClick={() => setActiveTab('vibes')}
                className={`flex-1 py-1 text-center text-[10px] font-bold rounded transition-all duration-300 ${
                  activeTab === 'vibes' ? 'bg-white/15 text-white' : 'text-white/40 hover:text-white'
                }`}
              >
                🧠 Vibes Lofi
              </button>
              <button
                onClick={() => setActiveTab('streaming')}
                className={`flex-1 py-1 text-center text-[10px] font-bold rounded transition-all duration-300 ${
                  activeTab === 'streaming' ? 'bg-white/15 text-white' : 'text-white/40 hover:text-white'
                }`}
              >
                📺 Streaming
              </button>
            </div>

            {/* Listas correspondentes */}
            <div className="flex-1 overflow-y-auto max-h-[190px] pr-0.5 custom-scrollbar">
              {activeTab === 'vibes' && <FocusVibesTab />}
              {activeTab === 'streaming' && <RealRadiosTab />}
            </div>
          </div>
          
        </div>
      </div>

      <style>{`
        .animate-spin-slow {
          animation: spin 16s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-fade-in {
          animation: fadeIn 0.3s ease-out forwards;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.2);
        }
      `}</style>
    </>
  );
}
