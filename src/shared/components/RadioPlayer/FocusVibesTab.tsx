import React from 'react';
import { 
  useRadioStore, 
  FOCUS_VIBES_STATIONS, 
  Station 
} from '@/store/useRadioStore';
import { 
  Play, 
  Pause, 
  Headphones, 
  Zap, 
  CloudRain, 
  Snowflake, 
  Coffee 
} from 'lucide-react';

export default function FocusVibesTab() {
  const { currentStation, isPlaying, playStation } = useRadioStore();

  // Mapeia ícones customizados e de alto nível para cada vibe de foco
  const getVibeIcon = (vibeType?: string) => {
    switch (vibeType) {
      case 'lofi':
        return <Headphones className="w-5 h-5" />;
      case 'synthwave':
        return <Zap className="w-5 h-5" />;
      case 'nature':
        return <CloudRain className="w-5 h-5" />;
      case 'nordic':
        return <Snowflake className="w-5 h-5" />;
      case 'cafe':
        return <Coffee className="w-5 h-5" />;
      default:
        return <Headphones className="w-5 h-5" />;
    }
  };

  // Mapeia classes de cores de hover e realce baseadas no estilo da rádio de foco
  const getVibeColors = (vibeType?: string, isActive?: boolean) => {
    if (!isActive) return 'hover:bg-white/5 border-white/5';
    
    switch (vibeType) {
      case 'lofi':
        return 'bg-pink-500/10 border-pink-500/30 text-pink-400';
      case 'synthwave':
        return 'bg-purple-500/10 border-purple-500/30 text-purple-400';
      case 'nature':
        return 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400';
      case 'nordic':
        return 'bg-sky-500/10 border-sky-500/30 text-sky-400';
      case 'cafe':
        return 'bg-amber-500/10 border-amber-500/30 text-amber-400';
      default:
        return 'bg-primary/10 border-primary/30 text-primary';
    }
  };

  const handleStationClick = (station: Station) => {
    playStation(station);
  };

  return (
    <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1.5 custom-scrollbar">
      <div className="text-[11px] font-bold text-white/50 tracking-wider mb-2 px-1">
        AMBIENTES DE FOCO RECOMENDADOS
      </div>
      
      {FOCUS_VIBES_STATIONS.map((station) => {
        const isActive = currentStation?.id === station.id;
        const isCurrentPlaying = isActive && isPlaying;
        
        return (
          <button
            key={station.id}
            onClick={() => handleStationClick(station)}
            className={`w-full flex items-center justify-between p-3 rounded-xl border text-left transition-all duration-300 backdrop-blur-md group ${getVibeColors(
              station.vibeType,
              isActive
            )}`}
          >
            <div className="flex items-center gap-3">
              {/* Ícone Estilizado da Vibe */}
              <div 
                className={`p-2 rounded-lg transition-all duration-300 ${
                  isActive 
                    ? 'bg-white/10' 
                    : 'bg-white/5 text-white/60 group-hover:bg-white/10 group-hover:text-white'
                }`}
              >
                {getVibeIcon(station.vibeType)}
              </div>
              
              {/* Informações da Rádio */}
              <div>
                <div className={`text-sm font-semibold transition-colors duration-300 ${
                  isActive ? 'text-white' : 'text-white/80 group-hover:text-white'
                }`}>
                  {station.name}
                </div>
                
                {/* Badges de Tags */}
                <div className="flex flex-wrap gap-1 mt-1">
                  {station.tags?.map((tag) => (
                    <span 
                      key={tag}
                      className={`text-[9px] px-1.5 py-0.5 rounded-md font-mono ${
                        isActive 
                          ? 'bg-white/10 text-white/70' 
                          : 'bg-white/5 text-white/40'
                      }`}
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Controle de Reprodução Dinâmico no Canto Direito */}
            <div 
              className={`p-1.5 rounded-full transition-all duration-300 ${
                isActive 
                  ? 'bg-white/25 text-white' 
                  : 'bg-white/5 text-white/40 group-hover:bg-white/15 group-hover:text-white group-hover:scale-105'
              }`}
            >
              {isCurrentPlaying ? (
                <Pause className="w-4 h-4 animate-pulse" />
              ) : (
                <Play className="w-4 h-4" />
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}
