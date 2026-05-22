import React from 'react';

interface VisualizerProps {
  isPlaying: boolean;
}

export default function Visualizer({ isPlaying }: VisualizerProps) {
  // Número de barras verticais do espectro sonoro
  const barCount = 10;
  const bars = Array.from({ length: barCount }, (_, i) => i);

  return (
    <div className="flex items-end justify-center gap-1.5 h-16 w-full px-4 py-2 relative overflow-hidden bg-black/10 dark:bg-black/30 rounded-lg border border-white/5 backdrop-blur-sm">
      {/* Luz ambiente de fundo neon que pulsa de acordo com o estado do audio */}
      <div 
        className={`absolute inset-0 bg-gradient-to-t from-primary/10 via-transparent to-transparent transition-opacity duration-1000 ${
          isPlaying ? 'opacity-100' : 'opacity-0'
        }`}
      />
      
      {/* Renderização das barras de frequência estilizadas */}
      <div className="flex items-end gap-1 h-10 relative z-10">
        {bars.map((index) => {
          // Geramos atrasos e durações de animação ligeiramente diferentes para cada barra criar um efeito natural e rico de frequência
          const animationDelay = `${index * 0.1}s`;
          const animationDuration = `${0.6 + (index % 3) * 0.2}s`;
          
          return (
            <div
              key={index}
              className={`w-1 rounded-full transition-all duration-300 ${
                isPlaying 
                  ? 'bg-gradient-to-t from-primary via-emerald-400 to-indigo-500 animate-music-bar' 
                  : 'bg-primary/30 h-1.5'
              }`}
              style={{
                height: isPlaying ? 'auto' : '6px',
                animationDelay: isPlaying ? animationDelay : undefined,
                animationDuration: isPlaying ? animationDuration : undefined,
                // Aplicamos alturas máximas e mínimas aleatórias via CSS customizado para as barras subirem harmonicamente
                transformOrigin: 'bottom',
              }}
            />
          );
        })}
      </div>
      
      {/* Texto de status no rodapé */}
      <div className="absolute bottom-1 left-0 right-0 text-[10px] text-center text-white/40 font-mono tracking-wider">
        {isPlaying ? 'AUDIO STREAMING ACTIVE' : 'FOCUS STATION STANDBY'}
      </div>

      {/* Injeção de Estilo CSS de Animação das Barras no Componente para evitar dependências de arquivos de estilo adicionais */}
      <style>{`
        @keyframes musicBarPulse {
          0%, 100% {
            transform: scaleY(0.25);
          }
          50% {
            transform: scaleY(1);
          }
        }
        .animate-music-bar {
          animation-name: musicBarPulse;
          animation-iteration-count: infinite;
          animation-timing-function: ease-in-out;
        }
      `}</style>
    </div>
  );
}
