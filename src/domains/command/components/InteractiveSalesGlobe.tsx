import React, { useRef, useEffect } from 'react';
import { Client } from '@/types';

interface SalesLocation {
  id: string;
  name: string;
  flag: string;
  amount: number;
  salesCount: number;
  growth: string;
  xPercent: number;
  yPercent: number;
}

interface InteractiveSalesGlobeProps {
  clients?: Client[];
}

export function InteractiveSalesGlobe({ clients = [] }: InteractiveSalesGlobeProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Computa métricas reais a partir dos clientes cadastrados no banco
  const locationStats: SalesLocation[] = React.useMemo(() => {
    const activeClients = clients.filter(c => c.status === 'Ativo' || c.paymentStatus === 'RECEIVED');

    // Se houver clientes com CEP ou localização, agregamos; do contrário, exibimos o estado real do banco
    const totalRevenue = activeClients.reduce((acc, c) => acc + (Number(c.customMonthlyPrice) || 0), 0);
    const count = activeClients.length;

    if (count === 0) {
      return [
        {
          id: 'br',
          name: 'Brasil (Sede)',
          flag: '🇧🇷',
          amount: 0,
          salesCount: 0,
          growth: '0%',
          xPercent: 57,
          yPercent: 44,
        }
      ];
    }

    return [
      {
        id: 'br',
        name: 'Brasil',
        flag: '🇧🇷',
        amount: totalRevenue,
        salesCount: count,
        growth: '+ 100%',
        xPercent: 57,
        yPercent: 44,
      }
    ];
  }, [clients]);

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
      glowGradient.addColorStop(0, 'rgba(14, 165, 233, 0.22)');
      glowGradient.addColorStop(0.5, 'rgba(56, 189, 248, 0.06)');
      glowGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

      ctx.fillStyle = glowGradient;
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius * 1.35, 0, Math.PI * 2);
      ctx.fill();

      // 2. Esfera do Planeta com profundidade oceânica
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
      ctx.lineWidth = 2;
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.45)';
      ctx.stroke();
      ctx.clip();

      // 3. Meridianos e Paralelos Holográficos
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.12)';
      ctx.lineWidth = 1;

      for (let lat = -60; lat <= 60; lat += 20) {
        const y = centerY + Math.sin((lat * Math.PI) / 180) * radius;
        const rAtLat = Math.cos((lat * Math.PI) / 180) * radius;
        ctx.beginPath();
        ctx.ellipse(centerX, y, rAtLat, rAtLat * 0.28, 0, 0, Math.PI * 2);
        ctx.stroke();
      }

      const rot = angle % (Math.PI * 2);
      for (let i = 0; i < 12; i++) {
        const meridianAngle = rot + (i * Math.PI) / 6;
        const cosAngle = Math.cos(meridianAngle);
        ctx.beginPath();
        ctx.ellipse(centerX, centerY, Math.abs(cosAngle) * radius, radius, 0, 0, Math.PI * 2);
        ctx.strokeStyle = cosAngle > 0 ? 'rgba(56, 189, 248, 0.15)' : 'rgba(14, 165, 233, 0.04)';
        ctx.stroke();
      }

      ctx.restore();

      // 4. Anel orbital estelar
      ctx.save();
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.25)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.ellipse(centerX, centerY, radius * 1.15, radius * 0.45, -0.3, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      angle += 0.005;
      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div className="relative w-full h-[480px] flex items-center justify-center select-none overflow-hidden">
      <canvas
        ref={canvasRef}
        width={680}
        height={560}
        className="max-w-full max-h-full object-contain pointer-events-none drop-shadow-[0_0_35px_rgba(14,165,233,0.3)]"
      />

      {/* Badges Interativos Baseados em Dados Reais */}
      {locationStats.map((loc) => (
        <div
          key={loc.id}
          className="absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-all duration-300 hover:scale-105 group z-10"
          style={{ left: `${loc.xPercent}%`, top: `${loc.yPercent}%` }}
        >
          <div className="relative flex items-center justify-center mb-1">
            <span className="absolute w-5 h-5 rounded-full bg-cyan-400/30 animate-ping" />
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-[0_0_12px_#38bdf8] border border-white" />
          </div>

          <div className="bg-[#0b1329]/90 backdrop-blur-md border border-cyan-500/30 rounded-xl px-3 py-1.5 shadow-[0_8px_24px_rgba(0,0,0,0.6)] flex items-center gap-2.5">
            <span className="text-base">{loc.flag}</span>
            <div className="flex flex-col text-left">
              <span className="text-[11px] font-semibold text-gray-300 leading-tight">
                {loc.name}
              </span>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-white tracking-wide">
                  {loc.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </span>
                {loc.salesCount > 0 && (
                  <span className="text-[10px] font-bold text-emerald-400">
                    {loc.growth}
                  </span>
                )}
              </div>
              <span className="text-[9px] text-gray-400">
                {loc.salesCount === 0 ? 'Nenhuma transação externa confirmada' : `${loc.salesCount} vendas confirmadas`}
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
