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
  Sliders,
  SkipBack,
  SkipForward,
  LogOut,
  Chrome,
  ExternalLink
} from 'lucide-react';

export default function RadioPlayer() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const youtubeIframeRef = useRef<HTMLIFrameElement | null>(null);
  
  // Instância do Player do Spotify SDK
  const [spotifyPlayer, setSpotifyPlayer] = useState<any>(null);
  const [spotifyPlayerReady, setSpotifyPlayerReady] = useState(false);
  const [spotifyKillKey, setSpotifyKillKey] = useState(Date.now());
  const [trackProgress, setTrackProgress] = useState(0);

  const {
    isPlaying,
    volume,
    isMuted,
    currentStation,
    activeTab,
    isMinimized,
    spotifyAccessToken,
    spotifyDeviceId,
    spotifyPlaybackState,
    spotifyIsPremium,
    spotifyMode,
    togglePlay,
    setVolume,
    toggleMute,
    toggleMinimize,
    setActiveTab,
    setPlayingState,
    setSpotifyAccessToken,
    setSpotifyDeviceId,
    setSpotifyPlaybackState,
    setSpotifyIsPremium,
    setSpotifyMode
  } = useRadioStore();

  const callStatus = useCallStore((state) => state.callStatus);
  const wasPlayingBeforeCallRef = useRef(false);

  // 1. CAPTURAR O TOKEN DO SPOTIFY NA URL (Implicit Grant Flow)
  useEffect(() => {
    const hash = window.location.hash;
    if (hash) {
      const params = new URLSearchParams(hash.substring(1));
      const token = params.get('access_token');
      if (token) {
        setSpotifyAccessToken(token);
        setSpotifyIsPremium(true); // O SDK validará em seguida se é premium
        setSpotifyMode('sdk'); // Ativa o modo SDK na hora
        setActiveTab('spotify');
        // Limpa a URL para estética perfeita
        window.history.replaceState(null, '', window.location.pathname + window.location.search);
      }
    }
  }, [setSpotifyAccessToken, setSpotifyIsPremium, setSpotifyMode, setActiveTab]);

  // 2. MONITORAMENTO DE PROGRESSO DA FAIXA DO SPOTIFY SDK
  useEffect(() => {
    if (!spotifyPlaybackState || spotifyPlaybackState.paused) return;
    
    // Sincroniza o progresso local a cada segundo
    setTrackProgress(spotifyPlaybackState.position);
    
    const interval = setInterval(() => {
      setTrackProgress((prev) => {
        const next = prev + 1000;
        return next > spotifyPlaybackState.duration ? spotifyPlaybackState.duration : next;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [spotifyPlaybackState]);

  // Sincroniza o progresso quando o estado de reprodução geral muda
  useEffect(() => {
    if (spotifyPlaybackState) {
      setTrackProgress(spotifyPlaybackState.position);
    }
  }, [spotifyPlaybackState]);

  // 3. CARREGAMENTO E GERENCIAMENTO DO SPOTIFY WEB PLAYBACK SDK
  useEffect(() => {
    if (!spotifyAccessToken || spotifyMode !== 'sdk') {
      if (spotifyPlayer) {
        spotifyPlayer.disconnect();
        setSpotifyPlayer(null);
        setSpotifyPlayerReady(false);
        setSpotifyDeviceId(null);
        setSpotifyPlaybackState(null);
      }
      return;
    }

    // Função de Inicialização do SDK
    const initSpotifySDK = () => {
      // Evita duplicar se o player já estiver instanciado
      if ((window as any).Spotify && !spotifyPlayer) {
        const player = new (window as any).Spotify.Player({
          name: 'Hub Focus CRM Player',
          getOAuthToken: (cb: any) => { cb(spotifyAccessToken); },
          volume: isMuted ? 0 : volume
        });

        // Eventos do SDK
        player.addListener('ready', ({ device_id }: { device_id: string }) => {
          setSpotifyDeviceId(device_id);
          setSpotifyPlayerReady(true);
          setSpotifyIsPremium(true);
        });

        player.addListener('not_ready', ({ device_id }: { device_id: string }) => {
          setSpotifyDeviceId(null);
          setSpotifyPlayerReady(false);
        });

        player.addListener('player_state_changed', (state: any) => {
          if (!state) return;
          setSpotifyPlaybackState(state);
          setPlayingState(!state.paused);
        });

        player.addListener('authentication_error', () => {
          // Token expirou ou é inválido
          setSpotifyAccessToken(null);
          setSpotifyDeviceId(null);
          setSpotifyPlaybackState(null);
          setSpotifyPlayerReady(false);
        });

        player.addListener('account_error', () => {
          // Conta Free/Não-Premium disparará este erro
          setSpotifyIsPremium(false);
          setSpotifyMode('embed'); // Força a volta ao Iframe clássico gratuito
          setSpotifyDeviceId(null);
          setSpotifyPlayerReady(false);
        });

        player.connect().then((success: boolean) => {
          if (success) {
            setSpotifyPlayer(player);
          }
        });
      }
    };

    // Carrega o script oficial do SDK se ele não estiver no DOM
    if (!document.getElementById('spotify-player-script')) {
      const script = document.createElement('script');
      script.id = 'spotify-player-script';
      script.src = 'https://sdk.scdn.co/spotify-player.js';
      script.async = true;
      document.body.appendChild(script);
      (window as any).onSpotifyWebPlaybackSDKReady = initSpotifySDK;
    } else {
      initSpotifySDK();
    }

    return () => {
      // Limpeza ao desmontar
      if (spotifyPlayer) {
        spotifyPlayer.disconnect();
        setSpotifyPlayer(null);
        setSpotifyPlayerReady(false);
        setSpotifyDeviceId(null);
        setSpotifyPlaybackState(null);
      }
    };
  }, [spotifyAccessToken, spotifyMode]);

  // 4. CONTROLE DE VOLUME DO SPOTIFY SDK
  useEffect(() => {
    if (spotifyPlayer && spotifyPlayerReady) {
      const targetVolume = isMuted ? 0 : volume;
      spotifyPlayer.setVolume(targetVolume).catch((err: any) => {
        console.warn('Erro ao ajustar volume do Spotify SDK:', err);
      });
    }
  }, [volume, isMuted, spotifyPlayer, spotifyPlayerReady]);

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
        
        // Se for Spotify SDK, pausa explicitamente
        if (spotifyPlayer && spotifyPlayerReady) {
          spotifyPlayer.pause();
        }
      }
    } else if (callStatus === 'idle' || !callStatus) {
      if (wasPlayingBeforeCallRef.current) {
        wasPlayingBeforeCallRef.current = false;
        setPlayingState(true);
        
        // Se for Spotify SDK, retoma
        if (spotifyPlayer && spotifyPlayerReady) {
          spotifyPlayer.resume();
        }
      }
    }
  }, [callStatus, isPlaying, setPlayingState, spotifyPlayer, spotifyPlayerReady]);

  // EFEITO DE CORREÇÃO DO SPOTIFY EMBED (IFRAME)
  useEffect(() => {
    if (currentStation?.type === 'spotify' && spotifyMode === 'embed') {
      if (isMuted || volume === 0 || callStatus === 'ringing' || callStatus === 'connected') {
        setSpotifyKillKey(Date.now());
      }
    }
  }, [isMuted, volume, callStatus, currentStation, spotifyMode]);

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

  // 9. FUNÇÃO DE LOGIN DO SPOTIFY
  const handleSpotifyLogin = () => {
    const scopes = [
      'streaming',
      'user-read-email',
      'user-read-private',
      'user-read-playback-state',
      'user-modify-playback-state'
    ].join(' ');

    const authUrl = `https://accounts.spotify.com/authorize?client_id=f1cc76d9b28b41149a0c296f0760970a&redirect_uri=${encodeURIComponent(
      'https://hubcrm.hubsymples.com.br/'
    )}&response_type=token&scope=${encodeURIComponent(scopes)}&show_dialog=true`;

    window.location.href = authUrl;
  };

  // 10. REQUISITAR REPRODUÇÃO DA PLAYLIST NO SPOTIFY SDK VIA API
  const playSpotifyPlaylist = async (playlistUrl: string) => {
    if (!spotifyAccessToken || !spotifyDeviceId) return;
    
    let spotifyUri = '';
    const playlistMatch = playlistUrl.match(/playlist\/([a-zA-Z0-9]+)/);
    const trackMatch = playlistUrl.match(/track\/([a-zA-Z0-9]+)/);
    const albumMatch = playlistUrl.match(/album\/([a-zA-Z0-9]+)/);
    
    if (playlistMatch) spotifyUri = `spotify:playlist:${playlistMatch[1]}`;
    else if (trackMatch) spotifyUri = `spotify:track:${trackMatch[1]}`;
    else if (albumMatch) spotifyUri = `spotify:album:${albumMatch[1]}`;
    
    if (!spotifyUri) return;
    
    try {
      const body: any = {};
      if (spotifyUri.startsWith('spotify:track')) {
        body.uris = [spotifyUri];
      } else {
        body.context_uri = spotifyUri;
      }
      
      await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${spotifyDeviceId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${spotifyAccessToken}`
        },
        body: JSON.stringify(body)
      });
      setPlayingState(true);
    } catch (err) {
      console.error('Erro ao transferir reprodução do Spotify:', err);
    }
  };

  // Inicia a música ao selecionar uma playlist do Spotify
  useEffect(() => {
    if (currentStation?.type === 'spotify' && spotifyMode === 'sdk' && spotifyPlayerReady && isPlaying) {
      // Evita disparar loop se a playlist já for a mesma tocando no state do SDK
      const currentTrackUri = spotifyPlaybackState?.track_window?.current_track?.uri;
      if (!currentTrackUri) {
        playSpotifyPlaylist(currentStation.url);
      }
    }
  }, [currentStation, spotifyMode, spotifyPlayerReady]);

  // FLAGS DE DOM KILL SWITCH
  const shouldRenderSpotifyEmbed = 
    currentStation?.type === 'spotify' && 
    spotifyMode === 'embed' &&
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
            <button 
              onClick={toggleMinimize}
              className="text-white/40 hover:text-white p-1 rounded-lg hover:bg-white/5 transition-all"
              title="Minimizar"
            >
              <Minus className="w-4 h-4" />
            </button>
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
                    : `🎵 Spotify ${spotifyMode === 'sdk' ? 'SDK Premium' : 'Embed Gratuito'}`}
              </div>
              <div className="text-xs font-bold text-white truncate pr-1">
                {currentStation?.name || 'Selecione uma playlist'}
              </div>
            </div>
          </div>

          {/* ================= CONTROLE CONDICIONAL DE REPRODUTORES ================= */}
          
          {/* A: SPOTIFY PLAYER (HÍBRIDO) */}
          {currentStation?.type === 'spotify' && (
            <div className="space-y-1.5 relative z-10 animate-fade-in">
              {/* Seletor de Modo no Topo do Widget do Spotify */}
              <div className="flex bg-black/40 border border-white/5 p-0.5 rounded-lg text-[9px] font-bold tracking-wider font-mono">
                <button
                  onClick={() => setSpotifyMode('embed')}
                  className={`flex-1 py-1 rounded transition-all ${
                    spotifyMode === 'embed' ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white'
                  }`}
                >
                  Modo Gratuito (Embed)
                </button>
                <button
                  onClick={() => setSpotifyMode('sdk')}
                  className={`flex-1 py-1 rounded transition-all ${
                    spotifyMode === 'sdk' ? 'bg-emerald-500/20 text-emerald-400' : 'text-white/40 hover:text-white'
                  }`}
                >
                  Modo Premium (SDK)
                </button>
              </div>

              {/* MODO 1: SPOTIFY EMBED (IFRAME) */}
              {spotifyMode === 'embed' && (
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
                  <div className="text-[8px] text-white/30 text-center leading-normal p-1.5 border-t border-white/5 font-mono">
                    💡 Clique no botão de Play do Spotify acima.
                  </div>
                </div>
              )}

              {/* MODO 2: SPOTIFY SDK PREMIUM (CONTROLE INTEGRADO) */}
              {spotifyMode === 'sdk' && (
                <div className="w-full bg-black/45 border border-white/5 rounded-xl p-3 flex flex-col gap-2.5 min-h-[200px] justify-center">
                  {!spotifyAccessToken ? (
                    /* Tela de Login */
                    <div className="text-center py-4 flex flex-col items-center gap-2">
                      <Music className="w-8 h-8 text-emerald-400 animate-bounce" />
                      <span className="text-xs font-bold text-white font-mono">Spotify SDK Premium</span>
                      <span className="text-[10px] text-white/40 leading-normal px-2">
                        Conecte seu Spotify Premium para habilitar o controle total de volume e faixa direto no CRM.
                      </span>
                      <button
                        onClick={handleSpotifyLogin}
                        className="mt-1.5 w-full bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold py-2 px-4 rounded-xl flex items-center justify-center gap-1.5 transition-all hover:scale-[1.02]"
                      >
                        <Chrome className="w-4 h-4" /> Conectar Spotify Premium
                      </button>
                    </div>
                  ) : !spotifyPlayerReady ? (
                    /* Aguardando Dispositivo do SDK */
                    <div className="text-center py-6 flex flex-col items-center gap-2">
                      <div className="w-6 h-6 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
                      <span className="text-xs font-bold text-emerald-400 font-mono">INICIALIZANDO PLAYER...</span>
                      <span className="text-[9px] text-white/40 leading-normal px-2">
                        Se demorar, verifique se seu Spotify oficial está aberto em outro dispositivo para sincronizar.
                      </span>
                    </div>
                  ) : spotifyPlaybackState?.track_window?.current_track ? (
                    /* Player Nativo Ativo */
                    <div className="flex flex-col gap-2 animate-fade-in">
                      {/* Meta da Faixa Tocando */}
                      <div className="flex gap-2.5 items-center">
                        <img 
                          src={spotifyPlaybackState.track_window.current_track.album.images[0]?.url} 
                          alt="Capa" 
                          className="w-10 h-10 rounded-lg object-cover border border-white/10 shrink-0" 
                        />
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-bold text-white truncate select-text">
                            {spotifyPlaybackState.track_window.current_track.name}
                          </div>
                          <div className="text-[10px] text-white/50 truncate select-text">
                            {spotifyPlaybackState.track_window.current_track.artists.map((a: any) => a.name).join(', ')}
                          </div>
                        </div>
                      </div>

                      {/* Barra de Progresso da Música */}
                      <div className="space-y-0.5">
                        <div className="flex justify-between text-[8px] text-white/40 font-mono">
                          <span>{formatTime(trackProgress)}</span>
                          <span>{formatTime(spotifyPlaybackState.duration)}</span>
                        </div>
                        <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-emerald-400 transition-all duration-300"
                            style={{ width: `${(trackProgress / spotifyPlaybackState.duration) * 100}%` }}
                          />
                        </div>
                      </div>

                      {/* Botões do Controle do Spotify */}
                      <div className="flex items-center justify-center gap-4 mt-1 bg-white/5 border border-white/5 p-1 rounded-lg">
                        <button 
                          onClick={() => spotifyPlayer.previousTrack()}
                          className="text-white/60 hover:text-white p-1 hover:bg-white/5 rounded transition-all"
                        >
                          <SkipBack className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={togglePlay}
                          className="w-8 h-8 rounded-full bg-white text-slate-900 flex items-center justify-center hover:scale-105 active:scale-95 transition-all"
                        >
                          {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
                        </button>
                        <button 
                          onClick={() => spotifyPlayer.nextTrack()}
                          className="text-white/60 hover:text-white p-1 hover:bg-white/5 rounded transition-all"
                        >
                          <SkipForward className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Slider de Volume Premium */}
                      <div className="flex items-center gap-2 mt-0.5 px-1 bg-white/5 p-1.5 rounded-lg border border-white/5">
                        <button onClick={toggleMute} className="text-white/50 hover:text-white transition-all shrink-0">
                          {isMuted || volume === 0 ? <VolumeX className="w-3.5 h-3.5 text-red-400" /> : <Volume2 className="w-3.5 h-3.5" />}
                        </button>
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.05"
                          value={isMuted ? 0 : volume}
                          onChange={(e) => setVolume(parseFloat(e.target.value))}
                          className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-emerald-400 transition-all outline-none"
                          style={{
                            background: `linear-gradient(to right, #10b981 ${(isMuted ? 0 : volume) * 100}%, rgba(255,255,255,0.1) ${(isMuted ? 0 : volume) * 100}%)`,
                          }}
                        />
                      </div>
                    </div>
                  ) : (
                    /* Sincronizando Reprodução */
                    <div className="text-center py-6 flex flex-col items-center gap-2">
                      <Music className="w-8 h-8 text-emerald-400 animate-pulse" />
                      <span className="text-xs font-bold text-white font-mono">PRONTO PARA CONECTAR</span>
                      <span className="text-[9px] text-white/40 leading-normal px-2">
                        Selecione a playlist `Hub SiYmples` abaixo ou use seu aplicativo Spotify oficial e transfira a reprodução para o dispositivo `Hub Focus CRM Player`.
                      </span>
                    </div>
                  )}

                  {/* Rodapé do SDK - Botão Desconectar */}
                  {spotifyAccessToken && (
                    <button
                      onClick={() => {
                        setSpotifyAccessToken(null);
                        setSpotifyDeviceId(null);
                        setSpotifyPlaybackState(null);
                        setSpotifyPlayerReady(false);
                      }}
                      className="mt-1 w-full border border-white/5 hover:border-red-500/20 hover:bg-red-500/10 text-white/40 hover:text-red-400 text-[9px] py-1 rounded font-bold font-mono transition-all flex items-center justify-center gap-1"
                    >
                      <LogOut className="w-3 h-3" /> Desconectar Conta do CRM
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* B: YOUTUBE PLAYER */}
          {currentStation?.type === 'youtube' && (
            <div className="space-y-1.5 relative z-10 animate-fade-in">
              <div className="relative w-full overflow-hidden rounded-xl border border-white/10 bg-black/40">
                {shouldRenderYoutube ? (
                  <iframe
                    ref={youtubeIframeRef}
                    src={getYoutubeEmbedUrl(currentStation.url)}
                    width="100%"
                    height="200"
                    frameBorder="0"
                    allowFullScreen={false}
                    allow="autoplay; encrypted-media; picture-in-picture"
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
                💡 Controlado nativamente pelo CRM abaixo.
              </div>
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
                onClick={() => setActiveTab('spotify')}
                className={`flex-1 py-1 text-center text-[10px] font-bold rounded transition-all duration-300 ${
                  activeTab === 'spotify' ? 'bg-white/15 text-white' : 'text-white/40 hover:text-white'
                }`}
              >
                🎵 Spotify
              </button>
              <button
                onClick={() => setActiveTab('youtube')}
                className={`flex-1 py-1 text-center text-[10px] font-bold rounded transition-all duration-300 ${
                  activeTab === 'youtube' ? 'bg-white/15 text-white' : 'text-white/40 hover:text-white'
                }`}
              >
                📺 YouTube
              </button>
            </div>

            {/* Listas correspondentes */}
            <div className="flex-1 overflow-y-auto max-h-[190px] pr-0.5 custom-scrollbar">
              {activeTab === 'vibes' && <FocusVibesTab />}
              {activeTab === 'spotify' && <RealRadiosTab typeFilter="spotify" />}
              {activeTab === 'youtube' && <RealRadiosTab typeFilter="youtube" />}
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
m: translateY(0) scale(1);
          }
        }
      `}</style>
    </>
  );
}
