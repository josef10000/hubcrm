import React, { useRef, useEffect, useState } from 'react';
import { useRadioStore } from '@/store/useRadioStore';
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
  Sliders,
  Loader2
} from 'lucide-react';

export default function RadioPlayer() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const spotifyControllerRef = useRef<any>(null);
  const [isSpotifyApiReady, setIsSpotifyApiReady] = useState(false);
  
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
    setPlayingState
  } = useRadioStore();

  // Escutamos o status das chamadas de voz/vídeo para pausar e retomar a rádio de forma inteligente
  const callStatus = useCallStore((state) => state.callStatus);
  const wasPlayingBeforeCallRef = useRef(false);

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

  // Sincronização do estado global do Zustand com o elemento de áudio real do navegador
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    // Atualiza volume e mudo
    audio.volume = isMuted ? 0 : volume;
    audio.muted = isMuted;
  }, [volume, isMuted]);

  // Helper robusto para converter URLs do Spotify em URIs
  const getSpotifyUri = (url: string) => {
    if (!url) return '';
    try {
      const match = url.match(/spotify\.com\/(?:[a-zA-Z-]+\/)?(playlist|track|album|artist)\/([a-zA-Z0-9]+)/);
      if (match) {
        const [, type, id] = match;
        return `spotify:${type}:${id}`;
      }
      return url;
    } catch (e) {
      return url;
    }
  };

  // Carrega a API do Spotify Embed Iframe se não estiver carregada
  useEffect(() => {
    if ((window as any).SpotifyIFrameAPIInstance) {
      setIsSpotifyApiReady(true);
      return;
    }

    const handleReady = (IFrameAPI: any) => {
      (window as any).SpotifyIFrameAPIInstance = IFrameAPI;
      setIsSpotifyApiReady(true);
    };

    // Caso a API já esteja em carregamento ou pronta
    if ((window as any).onSpotifyIframeApiReady) {
      const oldCallback = (window as any).onSpotifyIframeApiReady;
      (window as any).onSpotifyIframeApiReady = (IFrameAPI: any) => {
        oldCallback(IFrameAPI);
        handleReady(IFrameAPI);
      };
    } else {
      (window as any).onSpotifyIframeApiReady = handleReady;
    }

    // Injeta o script se não estiver presente
    if (!document.querySelector('script[src="https://open.spotify.com/embed/iframe-api"]')) {
      const script = document.createElement('script');
      script.src = 'https://open.spotify.com/embed/iframe-api';
      script.async = true;
      document.body.appendChild(script);
    }
  }, []);

  // Gerenciamento do controlador de Embed do Spotify
  useEffect(() => {
    if (!isSpotifyApiReady || !currentStation || currentStation.type !== 'spotify') return;

    const spotifyUri = getSpotifyUri(currentStation.url);
    const api = (window as any).SpotifyIFrameAPIInstance;
    if (!api) return;

    if (spotifyControllerRef.current) {
      // Se o controlador já existe, apenas carrega a nova URI
      try {
        spotifyControllerRef.current.loadUri(spotifyUri);
      } catch (err) {
        console.warn('Erro ao carregar URI no Spotify Embed:', err);
      }
    } else {
      // Se não existe, cria o controlador no elemento target
      const element = document.getElementById('spotify-player-container');
      if (element) {
        api.createController(
          element,
          {
            uri: spotifyUri,
            width: '100%',
            height: 152
          },
          (controller: any) => {
            spotifyControllerRef.current = controller;

            // Ouvir atualizações de reprodução do Spotify em tempo real
            controller.addListener('playback_update', (e: any) => {
              const { isPaused } = e.data;
              setPlayingState(!isPaused);
            });
          }
        );
      }
    }
  }, [currentStation, isSpotifyApiReady, setPlayingState]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !currentStation) return;

    const handleSrcChange = async () => {
      // Se for Spotify, garante que a tag de áudio nativa local pare imediatamente
      if (currentStation.type === 'spotify') {
        audio.pause();
        return;
      }

      // Se trocou para vibe local, garante que o Spotify pause se estiver tocando
      if (currentStation.type === 'vibe' && spotifyControllerRef.current) {
        try {
          spotifyControllerRef.current.pause();
        } catch (e) {
          console.warn('Erro ao pausar Spotify ao mudar para rádio local:', e);
        }
      }

      // Se trocou de rádio, define a nova origem
      if (audio.src !== currentStation.url) {
        audio.src = currentStation.url;
        audio.load();
      }

      if (isPlaying) {
        try {
          await audio.play();
        } catch (err) {
          console.warn('Autoplay bloqueado pelo navegador ou rádio instável:', err);
          setPlayingState(false);
        }
      } else {
        audio.pause();
      }
    };

    handleSrcChange();
  }, [currentStation, isPlaying, setPlayingState]);

  // Lida com erros e reconexões de rede automáticas na tag de áudio (Apenas para as vibes locais)
  const handleAudioError = (e: any) => {
    console.error('Erro na transmissão do áudio:', e);
    // Se estava tocando e deu erro, pausa o estado da rádio para dar feedback ao usuário
    if (isPlaying) {
      setPlayingState(false);
    }
  };

  return (
    <>
      {/* Tag de Áudio Nativa e Oculta (Elemento HTML5 Central) */}
      <audio 
        ref={audioRef} 
        onError={handleAudioError}
        preload="auto"
      />

      {/* RENDERIZADOR DO WIDGET FLUTUANTE GLOBAL */}
      <div 
        className={`fixed bottom-6 right-6 z-50 transition-all duration-500 font-sans ${
          isMinimized 
            ? 'w-12 h-12 rounded-full cursor-pointer' 
            : 'w-80 rounded-2xl'
        }`}
      >
        {/* ================= ESTADO MINIMIZADO (DYNAMIC ISLAND CIRCLE) ================= */}
        <div 
          onClick={toggleMinimize}
          className={`w-full h-full rounded-full flex items-center justify-center border border-white/20 dark:border-white/10 shadow-2xl backdrop-blur-md transition-all duration-500 hover:scale-105 active:scale-95 group ${
            isMinimized 
              ? 'opacity-100 scale-100 pointer-events-auto' 
              : 'opacity-0 scale-95 pointer-events-none absolute inset-0'
          } ${
            isPlaying 
              ? 'bg-gradient-to-tr from-emerald-500/80 to-teal-600/80 text-white animate-spin-slow' 
              : 'bg-black/60 text-white/70 hover:bg-black/80 hover:text-white'
          }`}
          title="Abrir Central de Foco"
        >
          {/* Ícone dinâmico giratório */}
          <Headphones className={`w-5 h-5 transition-transform duration-300 ${isPlaying ? 'scale-105' : 'group-hover:rotate-12'}`} />
          
          {/* Ponto vibrante de atividade */}
          {isPlaying && (
            <span className="absolute top-0.5 right-0.5 flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
          )}
        </div>

        {/* ================= ESTADO EXPANDIDO (WIDGET COMPLETO PREMIUM) ================= */}
        <div 
          className={`w-full bg-slate-900/85 dark:bg-black/80 border border-white/10 shadow-2xl rounded-2xl p-4 flex flex-col gap-3.5 backdrop-blur-xl transition-all duration-500 origin-bottom-right ${
            !isMinimized 
              ? 'opacity-100 scale-100 pointer-events-auto relative' 
              : 'opacity-0 scale-95 pointer-events-none absolute bottom-0 right-0 w-0 h-0 overflow-hidden'
          }`}
        >
          {/* Efeitos decorativos translúcidos de fundo */}
          <div className="absolute -top-10 -right-10 w-24 h-24 bg-primary/20 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute -bottom-10 -left-10 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

          {/* Cabeçalho do Reprodutor */}
          <div className="flex items-center justify-between relative z-10">
            <div className="flex items-center gap-2">
              <Music className="w-4 h-4 text-primary animate-pulse" />
              <span className="text-xs font-bold text-white tracking-wider font-mono">HUB FOCUS STATION</span>
            </div>
            <button 
              onClick={toggleMinimize}
              className="text-white/40 hover:text-white p-1 rounded-lg hover:bg-white/5 transition-all"
              title="Minimizar"
            >
              <Minus className="w-4 h-4" />
            </button>
          </div>

          {/* Informações da Estação Atual */}
          <div className="bg-white/5 border border-white/5 p-3 rounded-xl flex items-center gap-3 relative z-10">
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
                {currentStation?.type === 'vibe' ? '🧠 Foco Ativo' : '🎵 Spotify Playlist'}
              </div>
              <div className="text-xs font-bold text-white truncate pr-1">
                {currentStation?.name || 'Selecione uma estação'}
              </div>
            </div>
          </div>

          {/* Player do Spotify (Sempre montado para manter o iframe ativo e tocando, oculto se não for Spotify) */}
          <div className={`space-y-1.5 relative z-10 ${currentStation?.type === 'spotify' ? 'block animate-fade-in' : 'hidden'}`}>
            <div className="relative w-full overflow-hidden rounded-xl border border-white/10 bg-black/40 backdrop-blur-md">
              <div 
                id="spotify-player-container" 
                className="w-full h-[152px] rounded-xl shadow-lg bg-black/20 flex items-center justify-center"
              >
                {!isSpotifyApiReady && (
                  <div className="text-[10px] text-white/40 flex items-center gap-2 font-mono">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                    Carregando Player do Spotify...
                  </div>
                )}
              </div>
            </div>
            <div className="text-[9px] text-white/40 text-center leading-normal px-1 font-mono">
              💡 Clique no botão de Play do Spotify acima. Certifique-se de estar conectado à sua conta neste navegador para ouvir faixas completas.
            </div>
          </div>

          {/* Controles do Player de Vibes Locais (Estações de Foco) */}
          <div className={currentStation?.type === 'vibe' ? 'block' : 'hidden'}>
            {/* Visualizador do Espectro Sonoro */}
            <div className="relative z-10">
              <Visualizer isPlaying={isPlaying} />
            </div>

            {/* Controles de Volume e Play/Pause */}
            <div className="flex items-center gap-3 relative z-10 bg-white/5 border border-white/5 p-2 rounded-xl mt-1.5">
              {/* Botão Play/Pause */}
              <button 
                onClick={togglePlay}
                className={`w-9 h-9 rounded-full flex items-center justify-center transition-all duration-300 shadow-lg shrink-0 ${
                  isPlaying 
                    ? 'bg-white text-slate-900 hover:scale-105 active:scale-95' 
                    : 'bg-primary text-white hover:bg-primary-hover hover:scale-105 active:scale-95'
                }`}
              >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
              </button>

              {/* Slider de Volume */}
              <div className="flex items-center gap-2 flex-1">
                <button 
                  onClick={toggleMute}
                  className="text-white/50 hover:text-white transition-all shrink-0 p-1"
                >
                  {isMuted || volume === 0 ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4" />}
                </button>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={isMuted ? 0 : volume}
                  onChange={(e) => setVolume(parseFloat(e.target.value))}
                  className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-white hover:accent-primary transition-all outline-none"
                  style={{
                    background: `linear-gradient(to right, var(--color-primary, #3b82f6) ${
                      (isMuted ? 0 : volume) * 100
                    }%, rgba(255,255,255,0.1) ${(isMuted ? 0 : volume) * 100}%)`,
                  }}
                />
              </div>
            </div>
          </div>

          {/* Abas e Listagem */}
          <div className="flex flex-col gap-2 relative z-10 flex-1">
            {/* Seleção de Abas */}
            <div className="flex border-b border-white/10 p-0.5 bg-white/5 rounded-lg">
              <button
                onClick={() => setActiveTab('vibes')}
                className={`flex-1 py-1.5 text-center text-xs font-semibold rounded-md transition-all duration-300 ${
                  activeTab === 'vibes'
                    ? 'bg-white/15 text-white font-bold'
                    : 'text-white/50 hover:text-white'
                }`}
              >
                🧠 Focus Vibes
              </button>
              <button
                onClick={() => setActiveTab('spotify')}
                className={`flex-1 py-1.5 text-center text-xs font-semibold rounded-md transition-all duration-300 ${
                  activeTab === 'spotify'
                    ? 'bg-white/15 text-white font-bold'
                    : 'text-white/50 hover:text-white'
                }`}
              >
                🎵 Spotify
              </button>
            </div>

            {/* Renderizador de Listas de Abas */}
            <div className="flex-1 mt-1">
              {activeTab === 'vibes' ? <FocusVibesTab /> : <RealRadiosTab />}
            </div>
          </div>
          
        </div>
      </div>

      {/* Estilo CSS Adicional para Animações e Scrollbars Customizados */}
      <style>{`
        .animate-spin-slow {
          animation: spin 16s linear infinite;
        }
        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
        .animate-fade-in {
          animation: fadeIn 0.3s ease-out forwards;
        }
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px) scale(0.98);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
      `}</style>
    </>
  );
}
