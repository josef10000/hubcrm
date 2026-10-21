import React, { useRef, useEffect } from 'react';

interface SalesLocation {
  id: string;
  name: string;
  flag: string;
  amount: string;
  salesCount: number;
  growth: string;
  lat: number;
  lng: number;
  xPercent: number; // Posição relativa % no canvas para renderização nítida
  yPercent: number;
}

const LOCATIONS: SalesLocation[] = [
  {
    id: 'br',
    name: 'Brasil',
    flag: '🇧🇷',
    amount: 'R$ 1.248,90',
    salesCount: 12,
    growth: '+ 18%',
    lat: -14.235,
    lng: -51.9253,
    xPercent: 57,
    yPercent: 44,
  },
  {
    id: 'us',
    name: 'Estados Unidos',
    flag: '🇺🇸',
    amount: 'R$ 489,20',
    salesCount: 5,
    growth: '+ 9%',
    lat: 37.0902,
    lng: -95.7129,
    xPercent: 36,
    yPercent: 18,
  },
  {
    id: 'eu',
    name: 'Europa',
    flag: '🇪🇺',
    amount: 'R$ 382,10',
    salesCount: 4,
    growth: '+ 6%',
    lat: 54.526,
    lng: 15.2551,
    xPercent: 64,
    yPercent: 19,
  },
  {
    id: 'ar',
    name: 'Argentina',
    flag: '🇦🇷',
    amount: 'R$ 213,50',
    salesCount: 2,
    growth: '+ 4%',
    lat: -38.4161,
    lng: -63.6167,
    xPercent: 36,
    yPercent: 56,
  },
];

export function InteractiveSalesGlobe() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let angle = 0;

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const width = canvas.width;
      const height = canvas.height;
      const centerX = width / 2;
      const centerY = height / 2;
      const radius = Math.min(centerX, centerY) * 0.78;

      // 1. Atmosfera e brilho cósmico externo
      const glowGradient = ctx.createRadialGradient(
        centerX, centerY, radius * 0.7,
        centerX, centerY, radius * 1.35
      );
      glowGradient.addColorStop(0, 'rgba(14, 165, 233, 0.25)');
      glowGradient.addColorStop(0.5, 'rgba(56, 189, 248, 0.08)');
      glowGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

      ctx.fillStyle = glowGradient;
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius * 1.35, 0, Math.PI * 2);
      ctx.fill();

      // 2. Esfera do Planeta com profundidade e relevo oceânico escuro
      const globeGradient = ctx.createRadialGradient(
        centerX - radius * 0.35, centerY - radius * 0.35, radius * 0.1,
        centerX, centerY, radius
      );
      globeGradient.addColorStop(0, '#0c2340');
      globeGradient.addColorStop(0.5, '#051329');
      globeGradient.addColorStop(0.85, '#030b18');
      globeGradient.addColorStop(1, '#020617');

      ctx.save();
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      ctx.fillStyle = globeGradient;
      ctx.fill();
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.5)';
      ctx.stroke();
      ctx.clip(); // Limitar tudo dentro do círculo do planeta

      // 3. Meridianos e Paralelos Holográficos em Rotação
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.15)';
      ctx.lineWidth = 1;

      // Paralelos de latitude
      for (let lat = -60; lat <= 60; lat += 20) {
        const y = centerY + Math.sin((lat * Math.PI) / 180) * radius;
        const rAtLat = Math.cos((lat * Math.PI) / 180) * radius;
        ctx.beginPath();
        ctx.ellipse(centerX, y, rAtLat, rAtLat * 0.28, 0, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Meridianos de longitude animados
      const rot = angle % (Math.PI * 2);
      for (let i = 0; i < 12; i++) {
        const meridianAngle = rot + (i * Math.PI) / 6;
        const cosAngle = Math.cos(meridianAngle);
        ctx.beginPath();
        ctx.ellipse(centerX, centerY, Math.abs(cosAngle) * radius, radius, 0, 0, Math.PI * 2);
        ctx.strokeStyle = cosAngle > 0 ? 'rgba(56, 189, 248, 0.18)' : 'rgba(14, 165, 233, 0.05)';
        ctx.stroke();
      }

      // 4. Polígonos de continentes estilizados (luzes noturnas da terra)
      for (let i = 0; i < 48; i++) {
        const seedAngle = rot + (i * 0.38);
        const seedRadius = radius * (0.25 + 0.65 * Math.sin(i * 1.7));
        const px = centerX + Math.cos(seedAngle) * seedRadius;
        const py = centerY + Math.sin(i * 3.1) * (radius * 0.7);

        // Somente lado visível
        if (Math.sin(seedAngle) > -0.2) {
          ctx.fillStyle = 'rgba(250, 204, 21, 0.35)';
          ctx.beginPath();
          ctx.arc(px, py, 1.2, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // 5. Arcos de Conexão Globais de Vendas (Laranja Neon Dourado e Ciano)
      const arcs = [
        { x1: centerX - radius * 0.3, y1: centerY - radius * 0.4, x2: centerX + radius * 0.1, y2: centerY - radius * 0.05 },
        { x1: centerX + radius * 0.1, y1: centerY - radius * 0.05, x2: centerX - radius * 0.2, y2: centerY + radius * 0.35 },
        { x1: centerX + radius * 0.4, y1: centerY - radius * 0.35, x2: centerX + radius * 0.1, y2: centerY - radius * 0.05 },
        { x1: centerX - radius * 0.2, y1: centerY + radius * 0.35, x2: centerX - radius * 0.35, y2: centerY - radius * 0.4 },
      ];

      arcs.forEach((arc, idx) => {
        const progress = (angle * 1.5 + idx * 0.25) % 1;
        ctx.beginPath();
        ctx.moveTo(arc.x1, arc.y1);
        const midX = (arc.x1 + arc.x2) / 2 + Math.sin(angle + idx) * 20;
        const midY = Math.min(arc.y1, arc.y2) - radius * 0.25;
        ctx.quadraticCurveTo(midX, midY, arc.x2, arc.y2);
        ctx.strokeStyle = 'rgba(245, 158, 11, 0.4)';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Ponto de luz pulsante trafegando pelo arco (transação em tempo real)
        const t = progress;
        const pulseX = (1 - t) * (1 - t) * arc.x1 + 2 * (1 - t) * t * midX + t * t * arc.x2;
        const pulseY = (1 - t) * (1 - t) * arc.y1 + 2 * (1 - t) * t * midY + t * t * arc.y2;
        ctx.fillStyle = '#fef08a';
        ctx.beginPath();
        ctx.arc(pulseX, pulseY, 2.5, 0, Math.PI * 2);
        ctx.fill();
      });

      ctx.restore();

      // 6. Halo e Anel Orbital Cósmico
      ctx.save();
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.3)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.ellipse(centerX, centerY, radius * 1.15, radius * 0.45, -0.3, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      angle += 0.006;
      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div className="relative w-full h-[480px] flex items-center justify-center select-none overflow-hidden">
      {/* Canvas 3D de alta densidade */}
      <canvas
        ref={canvasRef}
        width={680}
        height={560}
        className="max-w-full max-h-full object-contain pointer-events-none drop-shadow-[0_0_40px_rgba(14,165,233,0.35)]"
      />

      {/* Badges Interativos Flutuantes com os Países da Imagem */}
      {LOCATIONS.map((loc) => (
        <div
          key={loc.id}
          className="absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-all duration-300 hover:scale-110 group z-10"
          style={{ left: `${loc.xPercent}%`, top: `${loc.yPercent}%` }}
        >
          {/* Marcador Pulsante */}
          <div className="relative flex items-center justify-center mb-1">
            <span className="absolute w-5 h-5 rounded-full bg-amber-400/30 animate-ping" />
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shadow-[0_0_12px_#f59e0b] border border-white" />
          </div>

          {/* Card Flutuante de Vendas Exato da Imagem */}
          <div className="bg-[#0b1329]/90 backdrop-blur-md border border-cyan-500/30 rounded-xl px-3 py-1.5 shadow-[0_8px_24px_rgba(0,0,0,0.6)] flex items-center gap-2.5">
            <span className="text-base">{loc.flag}</span>
            <div className="flex flex-col text-left">
              <span className="text-[11px] font-semibold text-gray-300 leading-tight">
                {loc.name}
              </span>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-white tracking-wide">
                  {loc.amount}
                </span>
                <span className="text-[10px] font-bold text-emerald-400">
                  {loc.growth}
                </span>
              </div>
              <span className="text-[9px] text-gray-400">
                {loc.salesCount} vendas
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
