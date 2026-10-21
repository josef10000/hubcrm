import React, { useMemo } from 'react';
import { 
  TrendingUp, 
  DollarSign, 
  Users, 
  ArrowUpRight, 
  Sparkles,
  Bot,
  MessageSquare,
  Rocket,
  ChevronRight,
  Tv,
  Globe,
  SlidersHorizontal,
  Layers,
  Search,
  Bell,
  Sun,
  Activity,
  FolderKanban
} from 'lucide-react';
import { InteractiveSalesGlobe } from '../components/InteractiveSalesGlobe';
import { useNavigate } from 'react-router-dom';
import { useClients } from '@/hooks/queries/useClients';
import { useTransactions } from '@/hooks/queries/useFinance';
import { useAuth } from '@auth/contexts/AuthContext';
import { getPlanPrice } from '@/helpers';

export default function HubCentralCommandView() {
  const navigate = useNavigate();
  const { userProfile } = useAuth();

  // 1. Dados Reais de Clientes e Vendas (Firestore)
  const { data: clients = [] } = useClients();

  // 2. Dados Reais de Transações / Financeiro (Firestore)
  const { data: transactions = [] } = useTransactions();

  // 3. Cálculos 100% Reais com base nos dados do banco
  const metrics = useMemo(() => {
    const clientsList = clients || [];
    const activeClients = clientsList.filter(c => c.status === 'Ativo' || c.paymentStatus === 'RECEIVED');
    
    const totalMrr = activeClients.reduce((acc, c) => acc + getPlanPrice(c.plan, c.billingCycle, c), 0);
    const averageTicket = activeClients.length > 0 ? totalMrr / activeClients.length : 0;

    const income = (transactions || [])
      .filter(t => t.type === 'income')
      .reduce((acc, t) => acc + (Number(t.amount) || 0), 0);

    const expense = (transactions || [])
      .filter(t => t.type === 'expense')
      .reduce((acc, t) => acc + (Number(t.amount) || 0), 0);

    const netEstimated = income - expense;
    const margin = income > 0 ? Math.round(((income - expense) / income) * 100) : 0;

    return {
      activeCount: activeClients.length,
      totalClients: clientsList.length,
      mrr: totalMrr,
      averageTicket,
      income,
      expense,
      netEstimated,
      margin: Math.max(0, margin)
    };
  }, [clients, transactions]);

  const userName = userProfile?.name?.split(' ')[0] || 'Usuário';

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
              <span>Olá, {userName}! Sua empresa, em tempo real.</span>
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

        {/* Modos Rápidos & Ações */}
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
          <button 
            onClick={() => navigate('/notifications')}
            className="relative p-2 rounded-lg bg-[#081226] border border-cyan-950 text-gray-400 hover:text-white cursor-pointer"
          >
            <Bell className="w-4 h-4" />
          </button>

          <div 
            onClick={() => navigate('/settings')}
            className="w-8 h-8 rounded-full border border-cyan-500/40 bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center font-bold text-xs text-black shadow-md cursor-pointer"
          >
            {userName.charAt(0).toUpperCase()}
          </div>
        </div>
      </header>

      {/* 🚀 CORPO PRINCIPAL COM GLOBO 3D REALISTA THREE.JS E PAINÉIS LATERAIS */}
      <div className="flex-1 p-6 grid grid-cols-12 gap-6 max-w-[1720px] mx-auto w-full items-start">
        
        {/* COLUNA ESQUERDA (3 COLS) — VENDAS REAIS & FINANCEIRO */}
        <div className="col-span-12 lg:col-span-3 space-y-5">
          
          {/* Card: Receita Recorrente Real */}
          <div className="bg-[#081226]/80 backdrop-blur-xl border border-cyan-950/60 rounded-2xl p-5 shadow-[0_8px_32px_rgba(0,0,0,0.5)] relative overflow-hidden">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400">
                  <TrendingUp className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-semibold text-gray-300">Receita Recorrente (MRR)</h3>
                  <span className="text-[10px] text-gray-500">Dados reais da sua operação</span>
                </div>
              </div>
            </div>

            {/* Valor Principal Real */}
            <div className="flex items-baseline justify-between mt-3 mb-1">
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-white tracking-tight">
                  {metrics.mrr.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </span>
                {metrics.activeCount > 0 && (
                  <span className="text-xs font-bold text-emerald-400 flex items-center">
                    <ArrowUpRight className="w-3 h-3" /> Ativo
                  </span>
                )}
              </div>
              
              <div className="h-6 w-16">
                <svg className="w-full h-full" viewBox="0 0 60 20">
                  <path d="M0,18 Q15,12 25,14 T45,8 T60,2" fill="none" stroke="#38bdf8" strokeWidth="2.5" />
                </svg>
              </div>
            </div>
            <p className="text-[11px] text-gray-400 mb-4">
              {metrics.activeCount} assinaturas / clientes ativos
            </p>

            {/* Indicadores Reais */}
            <div className="grid grid-cols-3 gap-2 pt-3 border-t border-cyan-950/60">
              <div className="bg-[#040915] p-2 rounded-xl border border-cyan-950/40 text-left">
                <span className="text-[9px] text-gray-400 block mb-0.5">Ticket médio</span>
                <span className="text-xs font-bold text-white block">
                  {metrics.averageTicket.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </span>
              </div>

              <div className="bg-[#040915] p-2 rounded-xl border border-cyan-950/40 text-left">
                <span className="text-[9px] text-gray-400 block mb-0.5">Total Clientes</span>
                <span className="text-xs font-bold text-white block">{metrics.totalClients}</span>
              </div>

              <div className="bg-[#040915] p-2 rounded-xl border border-cyan-950/40 text-left">
                <span className="text-[9px] text-gray-400 block mb-0.5">Ativos</span>
                <span className="text-xs font-bold text-emerald-400 block">{metrics.activeCount}</span>
              </div>
            </div>
          </div>

          {/* Card: Fluxo de Caixa Real */}
          <div className="bg-[#081226]/80 backdrop-blur-xl border border-cyan-950/60 rounded-2xl p-5 shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400">
                  <DollarSign className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-semibold text-gray-300">Financeiro</h3>
                  <span className="text-[10px] text-gray-500">Transações confirmadas</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between gap-4">
              <div className="space-y-2 flex-1">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-400">Receitas</span>
                  <span className="font-bold text-white">
                    {metrics.income.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </span>
                </div>

                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-400">Despesas</span>
                  <span className="font-bold text-white">
                    {metrics.expense.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </span>
                </div>

                <div className="flex justify-between items-center text-xs pt-1.5 border-t border-cyan-950/60">
                  <span className="text-cyan-400 font-semibold">Saldo</span>
                  <span className="font-extrabold text-white">
                    {metrics.netEstimated.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </span>
                </div>
              </div>

              {/* Anel de Margem Real */}
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
                    strokeDasharray={`${metrics.margin}, 100`}
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                </svg>
                <div className="absolute flex flex-col items-center">
                  <span className="text-[8px] text-gray-400 uppercase">Margem</span>
                  <span className="text-xs font-black text-white">{metrics.margin}%</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* COLUNA CENTRAL (6 COLS) — GLOBO 3D REALISTA THREE.JS INTERATIVO */}
        <div className="col-span-12 lg:col-span-6 flex flex-col items-center justify-center relative min-h-[540px]">
          <InteractiveSalesGlobe clients={clients} />
        </div>

        {/* COLUNA DIREITA (3 COLS) — DAVINCI IA & ATALHOS */}
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
                  <span className="text-[10px] text-gray-500">Davinci • Orquestrador</span>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" />
                <span className="text-[10px] font-bold text-emerald-400">Pronto</span>
              </div>
            </div>

            {/* Balão Proativo do Davinci */}
            <div className="bg-[#040915] border border-cyan-950/80 rounded-xl p-3 mb-4 flex items-start gap-3">
              <div className="w-10 h-10 rounded-full border border-cyan-500/30 bg-gradient-to-tr from-cyan-600 to-indigo-600 flex items-center justify-center text-cyan-200 shrink-0 shadow-[0_0_12px_rgba(6,182,212,0.3)]">
                <Bot className="w-5 h-5" />
              </div>
              <p className="text-[11px] text-gray-300 leading-relaxed text-left">
                {metrics.activeCount === 0 
                  ? 'Central pronta. Crie e valide novas ofertas no laboratório ao lado.'
                  : `Monitorando ${metrics.activeCount} clientes ativos e o financeiro do seu negócio.`}
              </p>
            </div>

            {/* Ações Rápidas */}
            <div className="grid grid-cols-3 gap-1.5 mb-3">
              <button 
                onClick={() => navigate('/offers')}
                className="px-2 py-1.5 rounded-lg bg-[#0d1c3a] border border-cyan-900/40 text-[10px] font-semibold text-cyan-300 hover:bg-cyan-900/30 transition-all cursor-pointer truncate"
              >
                + Criar oferta
              </button>
              <button 
                onClick={() => navigate('/analytics')}
                className="px-2 py-1.5 rounded-lg bg-[#0d1c3a] border border-cyan-900/40 text-[10px] font-semibold text-cyan-300 hover:bg-cyan-900/30 transition-all cursor-pointer truncate"
              >
                Ver analytics
              </button>
              <button 
                onClick={() => navigate('/funnels')}
                className="px-2 py-1.5 rounded-lg bg-[#0d1c3a] border border-cyan-900/40 text-[10px] font-semibold text-cyan-300 hover:bg-cyan-900/30 transition-all cursor-pointer truncate"
              >
                Ver funis
              </button>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-cyan-950/60 text-xs">
              <button 
                onClick={() => navigate('/chat?mode=davinci')}
                className="text-gray-400 hover:text-white flex items-center gap-1 text-[11px] cursor-pointer"
              >
                <MessageSquare className="w-3.5 h-3.5 text-cyan-400" />
                Abrir Chat
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

          {/* Card: Atalhos de Produção Operacional */}
          <div className="bg-[#081226]/80 backdrop-blur-xl border border-cyan-950/60 rounded-2xl p-5 shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400">
                  <Rocket className="w-4 h-4" />
                </div>
                <h3 className="text-xs font-semibold text-gray-300">Laboratórios de Produção</h3>
              </div>
            </div>

            <div className="space-y-2">
              <button 
                onClick={() => navigate('/offers')}
                className="w-full p-2.5 rounded-xl bg-[#040915]/60 hover:bg-[#071328] border border-cyan-950/40 hover:border-cyan-500/30 flex items-center justify-between transition-all cursor-pointer text-left"
              >
                <span className="text-xs font-medium text-gray-200">Laboratório de Ofertas</span>
                <ChevronRight className="w-3.5 h-3.5 text-gray-500" />
              </button>

              <button 
                onClick={() => navigate('/funnels')}
                className="w-full p-2.5 rounded-xl bg-[#040915]/60 hover:bg-[#071328] border border-cyan-950/40 hover:border-cyan-500/30 flex items-center justify-between transition-all cursor-pointer text-left"
              >
                <span className="text-xs font-medium text-gray-200">Arquiteto de Funis</span>
                <ChevronRight className="w-3.5 h-3.5 text-gray-500" />
              </button>

              <button 
                onClick={() => navigate('/hub-ads')}
                className="w-full p-2.5 rounded-xl bg-[#040915]/60 hover:bg-[#071328] border border-cyan-950/40 hover:border-cyan-500/30 flex items-center justify-between transition-all cursor-pointer text-left"
              >
                <span className="text-xs font-medium text-gray-200">Criativos & HubAds</span>
                <ChevronRight className="w-3.5 h-3.5 text-gray-500" />
              </button>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
