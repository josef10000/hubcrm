import React from 'react';
import { 
  TrendingUp, 
  DollarSign, 
  Users, 
  Target, 
  ArrowUpRight, 
  Sparkles,
  Bot,
  MessageSquare,
  Play,
  Pause,
  Rocket,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  Tv,
  Globe,
  SlidersHorizontal,
  Clock,
  Layers,
  ShoppingBag,
  FolderKanban,
  FileText,
  Search,
  Bell,
  Sun,
  Shield,
  Activity,
  Cpu
} from 'lucide-react';
import { InteractiveSalesGlobe } from '../components/InteractiveSalesGlobe';
import { useNavigate } from 'react-router-dom';

export default function HubCentralCommandView() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#020617] text-white flex flex-col font-sans select-none overflow-x-hidden">
      
      {/* 🌌 BARRA SUPERIOR / HEADER CÓSMICO */}
      <header className="h-16 border-b border-cyan-950/40 bg-[#030816]/95 backdrop-blur-xl px-6 flex items-center justify-between gap-4 sticky top-0 z-50">
        
        {/* Logo Hub Central */}
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-[0_0_15px_rgba(6,182,212,0.5)]">
              <Sparkles className="w-4 h-4 text-white animate-spin-slow" />
            </div>
            <span className="absolute -inset-1 rounded-xl bg-cyan-500/20 blur-sm -z-10" />
          </div>
          <div className="flex flex-col">
            <h1 className="text-sm font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-sky-200 to-white uppercase">
              Hub Central
            </h1>
            <div className="flex items-center gap-1.5 text-[10px] text-gray-400">
              <Sun className="w-3 h-3 text-amber-400" />
              <span>Olá, José! Sua empresa, em tempo real.</span>
            </div>
          </div>
        </div>

        {/* Barra de Busca Unificada Global */}
        <div className="flex-1 max-w-xl mx-4">
          <div className="relative group">
            <Search className="w-4 h-4 text-cyan-400/60 absolute left-3.5 top-1/2 -translate-y-1/2 group-focus-within:text-cyan-400 transition-colors" />
            <input 
              type="text" 
              placeholder="Buscar clientes, produtos, campanhas, arquivos..." 
              className="w-full bg-[#081226]/80 border border-cyan-900/40 focus:border-cyan-500/60 rounded-xl pl-10 pr-4 py-1.5 text-xs text-gray-200 placeholder-gray-500 outline-none transition-all shadow-inner focus:shadow-[0_0_15px_rgba(6,182,212,0.2)]"
            />
          </div>
        </div>

        {/* Modos Rápidos & Ações da Imagem */}
        <div className="flex items-center gap-2">
          <button 
            className="px-3 py-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-semibold flex items-center gap-1.5 shadow-[0_0_12px_rgba(6,182,212,0.15)] cursor-pointer hover:bg-cyan-500/20 transition-all"
          >
            <Activity className="w-3.5 h-3.5" />
            Visão Executiva
          </button>

          <button 
            onClick={() => navigate('/screens')}
            className="px-3 py-1.5 rounded-lg bg-[#081226] border border-cyan-950 text-gray-400 hover:text-white text-xs font-medium flex items-center gap-1.5 cursor-pointer hover:border-cyan-800 transition-all"
          >
            <Tv className="w-3.5 h-3.5" />
            Centro de Comando
          </button>

          <button 
            onClick={() => navigate('/workspace')}
            className="px-3 py-1.5 rounded-lg bg-[#081226] border border-cyan-950 text-gray-400 hover:text-white text-xs font-medium flex items-center gap-1.5 cursor-pointer hover:border-cyan-800 transition-all"
          >
            <FolderKanban className="w-3.5 h-3.5" />
            Hub Office
          </button>

          <button 
            onClick={() => navigate('/growth-hub')}
            className="px-3 py-1.5 rounded-lg bg-[#081226] border border-cyan-950 text-gray-400 hover:text-white text-xs font-medium flex items-center gap-1.5 cursor-pointer hover:border-cyan-800 transition-all"
          >
            <Layers className="w-3.5 h-3.5" />
            Galeria
          </button>

          <div className="h-6 w-px bg-cyan-950/60 mx-1" />

          {/* Notificações & Avatar */}
          <button className="relative p-2 rounded-lg bg-[#081226] border border-cyan-950 text-gray-400 hover:text-white cursor-pointer">
            <Bell className="w-4 h-4" />
            <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-cyan-400" />
          </button>

          <div className="w-8 h-8 rounded-full border border-cyan-500/40 bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center font-bold text-xs text-black shadow-md cursor-pointer">
            J
          </div>
        </div>
      </header>

      {/* 🚀 CORPO PRINCIPAL COM GLOBO E CARDS (LAYOUT EXATO DA IMAGEM) */}
      <div className="flex-1 p-6 grid grid-cols-12 gap-6 max-w-[1720px] mx-auto w-full items-start">
        
        {/* COLUNA ESQUERDA (3 COLS) — VENDAS HOJE & FINANCEIRO */}
        <div className="col-span-12 lg:col-span-3 space-y-5">
          
          {/* Card: Vendas Hoje */}
          <div className="bg-[#081226]/80 backdrop-blur-xl border border-cyan-950/60 rounded-2xl p-5 shadow-[0_8px_32px_rgba(0,0,0,0.5)] relative overflow-hidden">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400">
                  <TrendingUp className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-semibold text-gray-300">Vendas hoje</h3>
                  <span className="text-[10px] text-gray-500">23 de Out de 2026 • 10:24</span>
                </div>
              </div>
            </div>

            {/* Valor Principal + Badge de Alta + Mini Curva */}
            <div className="flex items-baseline justify-between mt-3 mb-1">
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-white tracking-tight">R$ 3.482,90</span>
                <span className="text-xs font-bold text-emerald-400 flex items-center">
                  <ArrowUpRight className="w-3 h-3" /> 12%
                </span>
              </div>
              
              {/* Mini Gráfico Sparkline */}
              <div className="h-6 w-16">
                <svg className="w-full h-full" viewBox="0 0 60 20">
                  <path d="M0,18 Q15,12 25,14 T45,8 T60,2" fill="none" stroke="#38bdf8" strokeWidth="2.5" />
                </svg>
              </div>
            </div>
            <p className="text-[11px] text-gray-400 mb-4">12 pedidos aprovados</p>

            {/* Trinca de Indicadores Rápidos */}
            <div className="grid grid-cols-3 gap-2 pt-3 border-t border-cyan-950/60">
              <div className="bg-[#040915] p-2 rounded-xl border border-cyan-950/40 text-left">
                <span className="text-[9px] text-gray-400 block mb-0.5">Ticket médio</span>
                <span className="text-xs font-bold text-white block">R$ 290,24</span>
                <span className="text-[9px] font-semibold text-emerald-400">↑ 8%</span>
              </div>

              <div className="bg-[#040915] p-2 rounded-xl border border-cyan-950/40 text-left">
                <span className="text-[9px] text-gray-400 block mb-0.5">Conversão</span>
                <span className="text-xs font-bold text-white block">3,6%</span>
                <span className="text-[9px] font-semibold text-emerald-400">↑ 15%</span>
              </div>

              <div className="bg-[#040915] p-2 rounded-xl border border-cyan-950/40 text-left">
                <span className="text-[9px] text-gray-400 block mb-0.5">Novos clientes</span>
                <span className="text-xs font-bold text-white block">8</span>
                <span className="text-[9px] font-semibold text-emerald-400">↑ 33%</span>
              </div>
            </div>

            {/* Barra de Meta do Dia */}
            <div className="mt-4 pt-3 border-t border-cyan-950/60">
              <div className="flex justify-between text-[10px] text-gray-400 mb-1.5">
                <span>Meta do dia</span>
                <span className="font-semibold text-white">R$ 3.482,90 / R$ 5.000,00 <span className="text-cyan-400 font-bold ml-1">70%</span></span>
              </div>
              <div className="w-full h-1.5 bg-[#030b18] rounded-full overflow-hidden border border-cyan-950/80">
                <div className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full w-[70%]" />
              </div>
            </div>
          </div>

          {/* Card: Financeiro & Fluxo de Caixa */}
          <div className="bg-[#081226]/80 backdrop-blur-xl border border-cyan-950/60 rounded-2xl p-5 shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400">
                  <DollarSign className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-semibold text-gray-300">Financeiro</h3>
                  <span className="text-[10px] text-gray-500">Fluxo de caixa • Últimos 7 dias</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between gap-4">
              <div className="space-y-2 flex-1">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-400">Receita</span>
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-white">R$ 18.742,90</span>
                    <span className="text-[10px] text-emerald-400 font-semibold">↑ 12%</span>
                  </div>
                </div>

                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-400">Despesas</span>
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-white">R$ 6.328,40</span>
                    <span className="text-[10px] text-rose-400 font-semibold">↑ 4%</span>
                  </div>
                </div>

                <div className="flex justify-between items-center text-xs pt-1.5 border-t border-cyan-950/60">
                  <span className="text-cyan-400 font-semibold">Lucro estimado</span>
                  <div className="flex items-center gap-1.5">
                    <span className="font-extrabold text-white">R$ 12.414,50</span>
                    <span className="text-[10px] text-emerald-400 font-semibold">↑ 18%</span>
                  </div>
                </div>
              </div>

              {/* Anel de Margem de Lucro (82%) */}
              <div className="relative w-16 h-16 flex items-center justify-center shrink-0">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                  <path
                    className="text-cyan-950/60"
                    strokeWidth="3.5"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  <path
                    className="text-cyan-400"
                    strokeDasharray="82, 100"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                </svg>
                <div className="absolute flex flex-col items-center">
                  <span className="text-[8px] text-gray-400 uppercase">Margem</span>
                  <span className="text-xs font-black text-white">82%</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* COLUNA CENTRAL (6 COLS) — GLOBO 3D INTERATIVO */}
        <div className="col-span-12 lg:col-span-6 flex flex-col items-center justify-center relative min-h-[480px]">
          <InteractiveSalesGlobe />
        </div>

        {/* COLUNA DIREITA (3 COLS) — DAVINCI IA & CAMPANHAS */}
        <div className="col-span-12 lg:col-span-3 space-y-5">
          
          {/* Card: Davinci & Agentes de IA */}
          <div className="bg-[#081226]/80 backdrop-blur-xl border border-cyan-950/60 rounded-2xl p-5 shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400">
                  <Bot className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-semibold text-gray-300">Agentes de IA</h3>
                  <span className="text-[10px] text-gray-500">Davinci • Seu Agente Principal</span>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" />
                <span className="text-[10px] font-bold text-emerald-400">Online</span>
              </div>
            </div>

            {/* Balão Proativo do Davinci com Avatar Holográfico */}
            <div className="bg-[#040915] border border-cyan-950/80 rounded-xl p-3 mb-4 flex items-start gap-3">
              <div className="w-10 h-10 rounded-full border border-cyan-500/30 bg-gradient-to-tr from-cyan-600 to-indigo-600 flex items-center justify-center text-cyan-200 shrink-0 shadow-[0_0_12px_rgba(6,182,212,0.3)]">
                <Bot className="w-5 h-5" />
              </div>
              <p className="text-[11px] text-gray-300 leading-relaxed text-left">
                Estou acompanhando as vendas, o financeiro e as campanhas. Posso ajudar com algo agora?
              </p>
            </div>

            {/* Ações Rápidas do Davinci */}
            <div className="grid grid-cols-3 gap-1.5 mb-3">
              <button 
                onClick={() => navigate('/offers')}
                className="px-2 py-1.5 rounded-lg bg-[#0d1c3a] border border-cyan-900/40 text-[10px] font-semibold text-cyan-300 hover:bg-cyan-900/30 transition-all cursor-pointer truncate"
              >
                + Criar campanha
              </button>
              <button 
                onClick={() => navigate('/analytics')}
                className="px-2 py-1.5 rounded-lg bg-[#0d1c3a] border border-cyan-900/40 text-[10px] font-semibold text-cyan-300 hover:bg-cyan-900/30 transition-all cursor-pointer truncate"
              >
                Analisar resultados
              </button>
              <button 
                onClick={() => navigate('/funnels')}
                className="px-2 py-1.5 rounded-lg bg-[#0d1c3a] border border-cyan-900/40 text-[10px] font-semibold text-cyan-300 hover:bg-cyan-900/30 transition-all cursor-pointer truncate"
              >
                Otimizar funil
              </button>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-cyan-950/60 text-xs">
              <button 
                onClick={() => navigate('/chat?mode=davinci')}
                className="text-gray-400 hover:text-white flex items-center gap-1 text-[11px] cursor-pointer"
              >
                <MessageSquare className="w-3.5 h-3.5 text-cyan-400" />
                Conversar
              </button>
              <button 
                onClick={() => navigate('/settings')}
                className="text-gray-400 hover:text-white flex items-center gap-1 text-[11px] cursor-pointer"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                Configurações
              </button>
            </div>
          </div>

          {/* Card: Campanhas & Funis Ativos */}
          <div className="bg-[#081226]/80 backdrop-blur-xl border border-cyan-950/60 rounded-2xl p-5 shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400">
                  <Rocket className="w-4 h-4" />
                </div>
                <h3 className="text-xs font-semibold text-gray-300">Campanhas e Funis</h3>
              </div>
              <button 
                onClick={() => navigate('/funnels')}
                className="text-[10px] text-cyan-400 hover:underline flex items-center gap-0.5 cursor-pointer"
              >
                Ver todas <ChevronRight className="w-3 h-3" />
              </button>
            </div>

            {/* Cabeçalho de Métricas de Campanhas */}
            <div className="grid grid-cols-4 gap-1 py-2 px-1 mb-2.5 bg-[#040915] rounded-xl border border-cyan-950/60 text-center">
              <div>
                <span className="text-[8px] text-gray-500 block uppercase">Ativas</span>
                <span className="text-xs font-bold text-white">6</span>
              </div>
              <div>
                <span className="text-[8px] text-gray-500 block uppercase">Leads</span>
                <span className="text-xs font-bold text-white">1.248</span>
              </div>
              <div>
                <span className="text-[8px] text-gray-500 block uppercase">Conversões</span>
                <span className="text-xs font-bold text-emerald-400">8,4%</span>
              </div>
              <div>
                <span className="text-[8px] text-gray-500 block uppercase">Investimento</span>
                <span className="text-xs font-bold text-white">R$ 892,30</span>
              </div>
            </div>

            {/* Lista de Campanhas */}
            <div className="space-y-2">
              <div className="p-2 rounded-xl bg-[#040915]/60 border border-cyan-950/40 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Rocket className="w-3.5 h-3.5 text-cyan-400" />
                  <div className="text-left">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-semibold text-gray-200">Lançamento Produto X</span>
                      <span className="text-[8px] px-1.5 py-0.2 rounded-full bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/20">Ativa</span>
                    </div>
                    <span className="text-[9px] text-gray-500">124 leads • 8,2% conv.</span>
                  </div>
                </div>
                <span className="text-xs font-bold text-white">R$ 312,40</span>
              </div>

              <div className="p-2 rounded-xl bg-[#040915]/60 border border-cyan-950/40 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Target className="w-3.5 h-3.5 text-indigo-400" />
                  <div className="text-left">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-semibold text-gray-200">Remarketing Geral</span>
                      <span className="text-[8px] px-1.5 py-0.2 rounded-full bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/20">Ativa</span>
                    </div>
                    <span className="text-[9px] text-gray-500">523 leads • 6,1% conv.</span>
                  </div>
                </div>
                <span className="text-xs font-bold text-white">R$ 468,90</span>
              </div>

              <div className="p-2 rounded-xl bg-[#040915]/60 border border-cyan-950/40 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Layers className="w-3.5 h-3.5 text-amber-400" />
                  <div className="text-left">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-semibold text-gray-200">Público Frio - Instagram</span>
                      <span className="text-[8px] px-1.5 py-0.2 rounded-full bg-amber-500/10 text-amber-400 font-bold border border-amber-500/20">Em pausa</span>
                    </div>
                    <span className="text-[9px] text-gray-500">342 leads • 3,4% conv.</span>
                  </div>
                </div>
                <span className="text-xs font-bold text-white">R$ 110,00</span>
              </div>
            </div>
          </div>
        </div>

        {/* LINHA INFERIOR (12 COLS) — CARROSSEL EXPLORAR POR LOCAL / COLEÇÃO */}
        <div className="col-span-12 space-y-3">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2 text-xs font-bold text-gray-300">
              <Globe className="w-4 h-4 text-cyan-400" />
              <span>Explorar por local / coleção</span>
            </div>
            <button 
              onClick={() => navigate('/growth-hub')}
              className="text-[11px] text-cyan-400 hover:underline flex items-center gap-1 cursor-pointer"
            >
              Ver mapa <ChevronRight className="w-3 h-3" />
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
            {[
              { title: 'Vendas Globais', count: '12 coleções • 1.248 arquivos', icon: Globe, path: '/analytics' },
              { title: 'Marketing', count: '8 coleções • 742 arquivos', icon: Target, path: '/hub-ads' },
              { title: 'Conteúdo', count: '6 coleções • 521 arquivos', icon: FileText, path: '/growth-hub' },
              { title: 'Produtos', count: '10 coleções • 1.203 arquivos', icon: ShoppingBag, path: '/products' },
              { title: 'Clientes', count: '5 coleções • 368 arquivos', icon: Users, path: '/workspace' },
              { title: 'Marca', count: '4 coleções • 219 arquivos', icon: Sparkles, path: '/growth-hub' },
              { title: 'Galeria Completa', count: '284 coleções • 8.642 arquivos', icon: Layers, path: '/growth-hub' },
            ].map((col, idx) => (
              <div 
                key={idx}
                onClick={() => navigate(col.path)}
                className="group relative bg-[#081226]/80 hover:bg-[#0c1c3c] border border-cyan-950/60 hover:border-cyan-500/40 rounded-xl p-3.5 transition-all duration-300 cursor-pointer shadow-md text-left"
              >
                <div className="w-7 h-7 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                  <col.icon className="w-4 h-4" />
                </div>
                <h4 className="text-xs font-bold text-white group-hover:text-cyan-300 transition-colors">{col.title}</h4>
                <p className="text-[9px] text-gray-500 mt-0.5">{col.count}</p>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* 🧭 FOOTER & BARRA DE STATUS OPERACIONAL */}
      <footer className="h-12 border-t border-cyan-950/60 bg-[#030816]/95 backdrop-blur-xl px-6 flex items-center justify-between text-[11px] text-gray-400 mt-auto sticky bottom-0 z-50">
        
        {/* Status Técnico em Tempo Real */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" />
            <span className="font-semibold text-gray-300">VPS Online 99.9%</span>
          </div>

          <div className="flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-cyan-400" />
            <span>Segurança Ativa</span>
          </div>

          <div className="flex items-center gap-1.5">
            <Cpu className="w-3.5 h-3.5 text-amber-400" />
            <span>IA: 3.2k tokens/min</span>
          </div>

          <span className="text-gray-600">•</span>
          <span>13 países conectados</span>
        </div>

        {/* Tabs de Navegação Operacional Rápida */}
        <div className="hidden md:flex items-center gap-1 bg-[#040915] p-1 rounded-xl border border-cyan-950/60">
          <button className="px-3 py-1 rounded-lg bg-cyan-500/20 text-cyan-300 font-bold shadow-sm">Visão Executiva</button>
          <button onClick={() => navigate('/analytics')} className="px-3 py-1 rounded-lg hover:text-white transition-colors cursor-pointer">Vendas</button>
          <button onClick={() => navigate('/finance')} className="px-3 py-1 rounded-lg hover:text-white transition-colors cursor-pointer">Financeiro</button>
          <button onClick={() => navigate('/funnels')} className="px-3 py-1 rounded-lg hover:text-white transition-colors cursor-pointer">Funis</button>
          <button onClick={() => navigate('/growth-hub')} className="px-3 py-1 rounded-lg hover:text-white transition-colors cursor-pointer">Conteúdo</button>
          <button onClick={() => navigate('/chat?mode=davinci')} className="px-3 py-1 rounded-lg hover:text-white transition-colors cursor-pointer">Agentes</button>
          <button onClick={() => navigate('/monitoring')} className="px-3 py-1 rounded-lg hover:text-white transition-colors cursor-pointer">Infraestrutura</button>
        </div>

        {/* Data & Clima */}
        <div className="flex items-center gap-2">
          <span>23 de Out de 2026 • 10:24</span>
          <span className="flex items-center gap-1 text-amber-300 font-semibold">
            <Sun className="w-3.5 h-3.5" /> 18°C
          </span>
        </div>
      </footer>

    </div>
  );
}
