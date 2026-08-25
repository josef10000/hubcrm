import React, { useState, useEffect } from 'react';
import { Maximize2, Minimize2, Volume2, VolumeX, Radio, Tv, Layers, ArrowLeft } from 'lucide-react';
import { soundEffects } from '../utils/soundEffects';
import { Link } from 'react-router-dom';

interface ScreenLayoutProps {
  screenNumber: 1 | 2 | 3;
  title: string;
  subtitle: string;
  badgeColor?: string;
  children: React.ReactNode;
  headerExtra?: React.ReactNode;
}

export default function ScreenLayout({
  screenNumber,
  title,
  subtitle,
  badgeColor = 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
  children,
  headerExtra
}: ScreenLayoutProps) {
  const [time, setTime] = useState<string>('');
  const [date, setDate] = useState<string>('');
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(soundEffects.getIsMuted());

  // Relógio Digital Live
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTime(now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      setDate(now.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Monitor de Fullscreen
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.warn('Erro ao entrar em fullscreen:', err);
      });
    } else {
      document.exitFullscreen().catch(err => {
        console.warn('Erro ao sair de fullscreen:', err);
      });
    }
  };

  const handleToggleMute = () => {
    const muted = soundEffects.toggleMute();
    setIsMuted(muted);
    if (!muted) {
      soundEffects.playCashChime();
    }
  };

  return (
    <div className="min-h-screen w-screen bg-[#050811] text-gray-100 flex flex-col select-none overflow-x-hidden font-sans relative antialiased">
      {/* Luzes de Fundo Ambiente */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-40 left-1/4 w-[600px] h-[600px] bg-indigo-600/10 rounded-full blur-[140px]" />
        <div className="absolute top-1/3 -right-40 w-[600px] h-[600px] bg-cyan-600/10 rounded-full blur-[140px]" />
        <div className="absolute -bottom-40 left-1/3 w-[600px] h-[600px] bg-emerald-600/10 rounded-full blur-[140px]" />
        <div 
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `radial-gradient(circle, #ffffff 1px, transparent 1px)`,
            backgroundSize: '24px 24px'
          }}
        />
      </div>

      {/* ── CABEÇALHO DO MONITOR (KIOSK HEADER) ─────────────────────────────── */}
      <header className="h-16 px-6 bg-[#080d1a]/90 border-b border-white/10 backdrop-blur-2xl flex items-center justify-between relative z-20 shrink-0">
        {/* Lado Esquerdo: Identificação do Monitor & Título */}
        <div className="flex items-center gap-4">
          <Link
            to="/screens"
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white border border-white/10 transition-colors"
            title="Voltar para Central de Telas"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>

          <div className="flex items-center gap-3">
            <div className={`px-2.5 py-1 rounded-xl text-xs font-black uppercase tracking-wider border flex items-center gap-1.5 shadow-lg ${badgeColor}`}>
              <Tv className="w-3.5 h-3.5" />
              Monitor {screenNumber}
            </div>

            <div>
              <h1 className="text-base font-black text-white tracking-wide flex items-center gap-2">
                {title}
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  AO VIVO
                </span>
              </h1>
              <p className="text-[11px] text-gray-400 capitalize">{subtitle}</p>
            </div>
          </div>
        </div>

        {/* Centro / Extra Header */}
        {headerExtra && (
          <div className="hidden lg:flex items-center gap-4">
            {headerExtra}
          </div>
        )}

        {/* Lado Direito: Relógio Digital & Controles */}
        <div className="flex items-center gap-4">
          {/* Relógio Digital */}
          <div className="text-right">
            <div className="text-lg font-black font-mono tracking-wider text-white">
              {time || '--:--:--'}
            </div>
            <div className="text-[10px] text-gray-400 capitalize hidden sm:block">
              {date}
            </div>
          </div>

          <div className="h-6 w-px bg-white/10" />

          {/* Seletor Rápido de Monitores */}
          <div className="flex items-center bg-black/40 border border-white/10 rounded-xl p-1 gap-1">
            <Link
              to="/screen/financial"
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                screenNumber === 1 ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-400 hover:text-white'
              }`}
              title="Monitor 1: Financeiro"
            >
              M1
            </Link>
            <Link
              to="/screen/clients"
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                screenNumber === 2 ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-400 hover:text-white'
              }`}
              title="Monitor 2: Clientes"
            >
              M2
            </Link>
            <Link
              to="/screen/status"
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                screenNumber === 3 ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-400 hover:text-white'
              }`}
              title="Monitor 3: Uptime & Funis"
            >
              M3
            </Link>
          </div>

          {/* Botões de Ação do Kiosk */}
          <div className="flex items-center gap-1.5">
            {/* Toggle de Som */}
            <button
              onClick={handleToggleMute}
              className={`p-2 rounded-xl border transition-all ${
                isMuted
                  ? 'bg-rose-500/10 border-rose-500/30 text-rose-400 hover:bg-rose-500/20'
                  : 'bg-white/5 border-white/10 text-emerald-400 hover:bg-white/10'
              }`}
              title={isMuted ? 'Áudio Mudo (Clique para Ativar Som de Vendas)' : 'Áudio Ativo (Clique para Mutar)'}
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>

            {/* Toggle de Tela Cheia */}
            <button
              onClick={toggleFullscreen}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 hover:text-white transition-colors"
              title={isFullscreen ? 'Sair de Tela Cheia' : 'Modo Tela Cheia (F11)'}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </header>

      {/* ── CONTEÚDO PRINCIPAL ──────────────────────────────────────────────── */}
      <main className="flex-1 p-6 relative z-10 flex flex-col overflow-y-auto custom-scrollbar">
        {children}
      </main>
    </div>
  );
}
