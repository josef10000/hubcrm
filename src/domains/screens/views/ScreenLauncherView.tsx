import React, { useState } from 'react';
import { 
  Tv, 
  DollarSign, 
  Users, 
  Globe, 
  ExternalLink, 
  Play, 
  Sparkles, 
  Maximize2, 
  Volume2, 
  ShieldCheck,
  Zap,
  ArrowRight
} from 'lucide-react';
import { Link } from 'react-router-dom';

export default function ScreenLauncherView() {
  const screens = [
    {
      number: 1,
      id: 'financial',
      path: '/screen/financial',
      title: 'Monitor 1: Sala Financeira & ASAAS Live',
      subtitle: 'Faturamento, Valor Gerado vs Valor Pago, Conversão %, Live Ticker e Meta Diária',
      icon: DollarSign,
      color: 'emerald',
      badge: '💰 Vendas & Caixa',
      features: [
        'Valor Gerado vs Valor Pago Hoje (R$)',
        'Taxa de Conversão do Caixa e Dinheiro na Mesa',
        'Live Ticker com Áudio Sintético de Venda',
        'Meta do Dia e Histograma Horário'
      ]
    },
    {
      number: 2,
      id: 'clients',
      path: '/screen/clients',
      title: 'Monitor 2: Radar de Clientes & Recuperação',
      subtitle: 'Novos clientes criados via Asaas/Checkout, esteira de onboarding e recuperação de Pix',
      icon: Users,
      color: 'cyan',
      badge: '👥 Clientes & Leads',
      features: [
        'Cards de Clientes Criados em Tempo Real',
        'Fila de Onboarding & Kick-off',
        'Fila de Recuperação Ativa (Pix Pendente)',
        'Botão Direto de WhatsApp para Fechar Vendas'
      ]
    },
    {
      number: 3,
      id: 'status',
      path: '/screen/status',
      title: 'Monitor 3: Status de Páginas, Checkouts & Funil',
      subtitle: 'Monitoramento de uptime em tempo real, latência de servidores e fluxo do funil',
      icon: Globe,
      color: 'indigo',
      badge: '🌐 Uptime & Infra',
      features: [
        'Status Online dos Checkouts Transparentes',
        'Ping de Latência em Milissegundos',
        'Alerta Visual/Sonoro de Queda de Páginas',
        'Etapas e Conversões do Funil Ativo'
      ]
    }
  ];

  const openScreen = (path: string) => {
    window.open(path, '_blank', 'width=1440,height=900,menubar=no,toolbar=no,location=no,status=no');
  };

  const launchAllScreens = () => {
    screens.forEach((screen, index) => {
      setTimeout(() => {
        openScreen(screen.path);
      }, index * 250);
    });
  };

  return (
    <div className="flex-1 p-6 lg:p-10 max-w-7xl mx-auto space-y-8 animate-fade-in relative z-10">
      
      {/* ── CABEÇALHO DA PÁGINA ────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-6 border-b border-gray-200 dark:border-white/10">
        <div className="flex items-center gap-4">
          <div className="p-3.5 rounded-2xl bg-gradient-to-tr from-indigo-600 to-cyan-500 text-white shadow-xl shadow-indigo-500/20">
            <Tv className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-gray-900 dark:text-white tracking-wide flex items-center gap-3">
              Sala de Comando Multi-Monitores
              <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                War Room
              </span>
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Distribua métricas em tempo real em 3 telas ou TVs físicas com visualização limpa de alto contraste
            </p>
          </div>
        </div>

        <button
          onClick={launchAllScreens}
          className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-indigo-600 to-cyan-500 hover:from-indigo-700 hover:to-cyan-600 text-white font-black text-sm uppercase tracking-wider flex items-center gap-2.5 shadow-xl shadow-cyan-500/25 hover:scale-[1.02] active:scale-[0.98] transition-all"
        >
          <Play className="w-4 h-4 fill-white" />
          <span>Lançar Todos os 3 Monitores</span>
        </button>
      </div>

      {/* ── BANNER EXPLICATIVO DA ARQUITETURA MULTI-TELA ────────────────────── */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-indigo-950/60 via-[#0b142b] to-cyan-950/60 border border-indigo-500/30 text-white shadow-2xl relative overflow-hidden flex flex-col lg:flex-row items-center justify-between gap-6">
        <div className="space-y-2 text-center lg:text-left">
          <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 inline-flex items-center gap-1">
            <Zap className="w-3 h-3 text-amber-400" />
            Configuração de Alta Performance
          </span>
          <h2 className="text-lg font-black tracking-wide">
            Como posicionar o sistema no seu setup físico de 3 monitores:
          </h2>
          <p className="text-xs text-gray-300 max-w-2xl leading-relaxed">
            Ao clicar no botão de lançamento, 3 janelas independentes em modo limpo (Kiosk) serão abertas. Basta arrastar uma janela para cada tela e pressionar <strong className="text-white font-mono bg-white/10 px-1.5 py-0.5 rounded">F11</strong> para preenchimento total.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="flex items-center gap-2 text-xs font-mono text-cyan-300 bg-black/40 px-3 py-2 rounded-xl border border-white/10">
            <Maximize2 className="w-4 h-4 text-cyan-400" />
            <span>F11 = Fullscreen</span>
          </div>
          <div className="flex items-center gap-2 text-xs font-mono text-emerald-300 bg-black/40 px-3 py-2 rounded-xl border border-white/10">
            <Volume2 className="w-4 h-4 text-emerald-400" />
            <span>Som de Venda Ativo</span>
          </div>
        </div>
      </div>

      {/* ── META DIÁRIA DE FATURAMENTO ────────────────────────────────────── */}
      <div className="p-5 rounded-3xl bg-[#0a1020]/80 border border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
            <DollarSign className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xs font-black uppercase tracking-wider text-white">
              Meta Diária de Faturamento (R$)
            </h3>
            <span className="text-[11px] text-gray-400">
              Alimente o objetivo que será monitorado com a barra de progresso no Monitor 1 (Financeiro)
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs font-mono font-bold text-gray-400">R$</span>
          <input
            type="number"
            defaultValue={localStorage.getItem('hubcrm_daily_goal') || '5000'}
            onChange={(e) => {
              const val = parseFloat(e.target.value);
              if (!isNaN(val) && val >= 0) {
                localStorage.setItem('hubcrm_daily_goal', val.toString());
              }
            }}
            className="w-36 px-3.5 py-2 bg-black/60 border border-white/20 rounded-xl text-xs font-mono font-bold text-white focus:outline-none focus:border-indigo-400"
            placeholder="Ex: 5000"
          />
        </div>
      </div>

      {/* ── GRADE DOS 3 MONITORES ────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {screens.map(screen => {
          const Icon = screen.icon;
          const isEmerald = screen.color === 'emerald';
          const isCyan = screen.color === 'cyan';

          return (
            <div
              key={screen.id}
              className="p-6 rounded-3xl bg-[#090e1c] border border-white/10 hover:border-white/20 transition-all flex flex-col justify-between group shadow-xl relative overflow-hidden"
            >
              <div>
                {/* Badge & Ícone */}
                <div className="flex items-center justify-between mb-4">
                  <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full border ${
                    isEmerald 
                      ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30' 
                      : isCyan 
                      ? 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30'
                      : 'bg-indigo-500/10 text-indigo-300 border-indigo-500/30'
                  }`}>
                    {screen.badge}
                  </span>
                  <div className="p-2.5 rounded-2xl bg-white/5 text-gray-300 group-hover:text-white group-hover:bg-white/10 transition-colors">
                    <Icon className="w-5 h-5" />
                  </div>
                </div>

                {/* Título & Descrição */}
                <h3 className="text-base font-black text-white group-hover:text-indigo-300 transition-colors">
                  {screen.title}
                </h3>
                <p className="text-xs text-gray-400 mt-1.5 leading-relaxed">
                  {screen.subtitle}
                </p>

                {/* Lista de Recursos */}
                <ul className="mt-5 space-y-2 border-t border-white/5 pt-4 text-xs text-gray-300">
                  {screen.features.map((feat, idx) => (
                    <li key={idx} className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Botões de Ação */}
              <div className="mt-6 pt-4 border-t border-white/5 flex gap-2">
                <Link
                  to={screen.path}
                  className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs font-bold border border-white/10 hover:border-indigo-500/40 transition-all flex items-center justify-center gap-1.5"
                >
                  <span>Abrir Nesta Aba</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
                <button
                  onClick={() => openScreen(screen.path)}
                  className="px-3 py-2.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white text-xs font-bold border border-indigo-500/30 transition-all flex items-center justify-center"
                  title="Abrir em Nova Janela para Monitor"
                >
                  <ExternalLink className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
}
