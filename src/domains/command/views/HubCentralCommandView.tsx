import React, { useMemo } from 'react';
import {
  TrendingUp,
  DollarSign,
  ArrowUpRight,
  Bot,
  MessageSquare,
  Rocket,
  ChevronRight,
  Tv,
  SlidersHorizontal,
  Layers,
  Activity,
  FolderKanban,
  AlertCircle,
  LifeBuoy,
  Plus,
  BarChart3,
  GitFork,
  Bell
} from 'lucide-react';
import { InteractiveSalesGlobe } from '../components/InteractiveSalesGlobe';
import { useNavigate } from 'react-router-dom';
import { useClients } from '@/hooks/queries/useClients';
import { useTransactions } from '@/hooks/queries/useFinance';
import { useAuth } from '@auth/contexts/AuthContext';
import { useCRM } from '@crm/contexts/CRMContext';
import { getPlanPrice } from '@/helpers';

export default function HubCentralCommandView() {
  const navigate = useNavigate();
  const { userProfile, unreadAlertsCount = 0 } = useAuth();
  const { supportRequests = [] } = useCRM();

  // 1. Dados Reais de Clientes e Vendas (Firestore)
  const { data: clients = [] } = useClients();

  // 2. Dados Reais de Transações / Financeiro (Firestore)
  const { data: transactions = [] } = useTransactions();

  // 3. Cálculos 100% Reais com base nos dados do banco
  const metrics = useMemo(() => {
    const clientsList = clients || [];
    const activeClients = clientsList.filter(
      c => c.status === 'Ativo' || c.paymentStatus === 'RECEIVED'
    );
    const overdueClients = clientsList.filter(
      c => c.status === 'Inadimplente' || c.paymentStatus === 'OVERDUE'
    );

    const totalMrr = activeClients.reduce(
      (acc, c) => acc + getPlanPrice(c.plan, c.billingCycle, c),
      0
    );
    const averageTicket = activeClients.length > 0 ? totalMrr / activeClients.length : 0;

    const validTransactions = (transactions || []).filter(
      t => String(t.status || '').toUpperCase() !== 'CANCELLED'
    );

    const income = validTransactions
      .filter(t => String(t.type || '').toUpperCase() === 'INCOME')
      .reduce((acc, t) => acc + (Number(t.amount) || 0), 0);

    const expense = validTransactions
      .filter(t => String(t.type || '').toUpperCase() === 'EXPENSE')
      .reduce((acc, t) => acc + (Number(t.amount) || 0), 0);

    const overdueTransactions = validTransactions.filter(
      t => String(t.status || '').toUpperCase() === 'OVERDUE'
    );

    const openTickets = (supportRequests || []).filter(
      (s: any) => s.status === 'aberto' || s.status === 'em_analise'
    );

    const netEstimated = income - expense;
    const margin = income > 0 ? Math.round(((income - expense) / income) * 100) : 0;

    return {
      activeCount: activeClients.length,
      totalClients: clientsList.length,
      overdueCount: overdueClients.length + overdueTransactions.length,
      openTicketsCount: openTickets.length,
      mrr: totalMrr,
      averageTicket,
      income,
      expense,
      netEstimated,
      margin: Math.max(0, Math.min(100, margin))
    };
  }, [clients, transactions, supportRequests]);

  const firstName = userProfile?.displayName?.split(' ')[0] || 'Gestor';

  return (
    <div className="min-h-full bg-[#020617] text-white flex flex-col font-sans select-none overflow-x-hidden px-5 pt-3 pb-24">
      {/* BARRA COMPACTA DE MODOS RÁPIDOS (Sem duplicar o Header principal) */}
      <div className="max-w-[1720px] mx-auto w-full flex flex-wrap items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            className="px-3 py-1.5 rounded-xl bg-cyan-500/15 border border-cyan-500/35 text-cyan-300 text-xs font-semibold flex items-center gap-1.5 shadow-[0_0_12px_rgba(6,182,212,0.15)] cursor-pointer transition-all"
          >
            <Activity className="w-3.5 h-3.5" />
            Visão Executiva
          </button>

          <button
            onClick={() => navigate('/screens')}
            className="px-3 py-1.5 rounded-xl bg-[#081226]/90 border border-cyan-950/80 text-gray-400 hover:text-white text-xs font-medium flex items-center gap-1.5 cursor-pointer hover:border-cyan-700/60 transition-all"
          >
            <Tv className="w-3.5 h-3.5 text-indigo-400" />
            Sala de Comando
          </button>

          <button
            onClick={() => navigate('/workspace')}
            className="px-3 py-1.5 rounded-xl bg-[#081226]/90 border border-cyan-950/80 text-gray-400 hover:text-white text-xs font-medium flex items-center gap-1.5 cursor-pointer hover:border-cyan-700/60 transition-all"
          >
            <FolderKanban className="w-3.5 h-3.5 text-cyan-400" />
            Hub Office
          </button>

          <button
            onClick={() => navigate('/growth-hub')}
            className="px-3 py-1.5 rounded-xl bg-[#081226]/90 border border-cyan-950/80 text-gray-400 hover:text-white text-xs font-medium flex items-center gap-1.5 cursor-pointer hover:border-cyan-700/60 transition-all"
          >
            <Layers className="w-3.5 h-3.5 text-amber-400" />
            Galeria
          </button>
        </div>

        <button
          onClick={() => navigate('/notifications')}
          className="px-3 py-1.5 rounded-xl bg-[#081226]/90 border border-cyan-950/80 hover:border-cyan-700/60 text-gray-400 hover:text-white text-xs font-medium flex items-center gap-2 cursor-pointer transition-all"
          title="Central de Notificações"
        >
          <Bell className="w-3.5 h-3.5 text-cyan-400" />
          <span className="hidden sm:inline">Alertas</span>
          {unreadAlertsCount > 0 && (
            <span className="px-1.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 text-[10px] font-bold">
              {unreadAlertsCount}
            </span>
          )}
        </button>
      </div>

      {/* CORPO PRINCIPAL COM GLOBO 3D REALISTA THREE.JS E PAINÉIS LATERAIS */}
      <div className="flex-1 grid grid-cols-12 gap-5 max-w-[1720px] mx-auto w-full items-center">
        {/* COLUNA ESQUERDA (3 COLS) — VENDAS REAIS & FINANCEIRO */}
        <div className="col-span-12 lg:col-span-3 space-y-4">
          {/* Card: Receita Recorrente Real */}
          <div
            onClick={() => navigate('/billing')}
            className="bg-[#081226]/85 hover:bg-[#0a162e]/90 backdrop-blur-xl border border-cyan-950/60 hover:border-cyan-500/30 rounded-2xl p-4 shadow-[0_8px_32px_rgba(0,0,0,0.5)] relative overflow-hidden transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400">
                  <TrendingUp className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-semibold text-gray-200">Receita Recorrente (MRR)</h3>
                  <span className="text-[10px] text-gray-500">Dados reais da sua operação</span>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-cyan-400 transition-colors" />
            </div>

            {/* Valor Principal Real */}
            <div className="flex items-baseline justify-between mt-2.5 mb-1">
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

              <div className="h-6 w-14 shrink-0">
                <svg className="w-full h-full" viewBox="0 0 60 20">
                  <path
                    d="M0,18 Q15,12 25,14 T45,8 T60,2"
                    fill="none"
                    stroke="#38bdf8"
                    strokeWidth="2.5"
                  />
                </svg>
              </div>
            </div>

            <p className="text-[11px] text-gray-400 mb-3">
              {metrics.activeCount > 0 && metrics.mrr === 0
                ? `${metrics.activeCount} clientes ativos (sem plano mensal definido)`
                : `${metrics.activeCount} assinaturas / clientes ativos`}
            </p>

            {/* Indicadores Reais */}
            <div className="grid grid-cols-3 gap-2 pt-3 border-t border-cyan-950/60">
              <div className="bg-[#040915] p-2 rounded-xl border border-cyan-950/40 text-left">
                <span className="text-[9px] text-gray-400 block mb-0.5">Ticket médio</span>
                <span className="text-xs font-bold text-white block truncate">
                  {metrics.averageTicket.toLocaleString('pt-BR', {
                    style: 'currency',
                    currency: 'BRL'
                  })}
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
          <div
            onClick={() => navigate('/finance')}
            className="bg-[#081226]/85 hover:bg-[#0a162e]/90 backdrop-blur-xl border border-cyan-950/60 hover:border-cyan-500/30 rounded-2xl p-4 shadow-[0_8px_32px_rgba(0,0,0,0.5)] transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400">
                  <DollarSign className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-semibold text-gray-200">Financeiro</h3>
                  <span className="text-[10px] text-gray-500">Fluxo de caixa consolidado</span>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-cyan-400 transition-colors" />
            </div>

            <div className="flex items-center justify-between gap-4">
              <div className="space-y-2 flex-1 min-w-0">
                <div className="flex justify-between items-center text-xs gap-2">
                  <span className="text-gray-400">Receitas</span>
                  <span className="font-bold text-emerald-400 truncate">
                    {metrics.income.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </span>
                </div>

                <div className="flex justify-between items-center text-xs gap-2">
                  <span className="text-gray-400">Despesas</span>
                  <span className="font-bold text-rose-400 truncate">
                    {metrics.expense.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </span>
                </div>

                <div className="flex justify-between items-center text-xs pt-1.5 border-t border-cyan-950/60 gap-2">
                  <span className="text-cyan-400 font-semibold">Saldo</span>
                  <span className="font-extrabold text-white truncate">
                    {metrics.netEstimated.toLocaleString('pt-BR', {
                      style: 'currency',
                      currency: 'BRL'
                    })}
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
        <div className="col-span-12 lg:col-span-6 flex flex-col items-center justify-center relative">
          <InteractiveSalesGlobe clients={clients} />
        </div>

        {/* COLUNA DIREITA (3 COLS) — DAVINCI IA & ATALHOS */}
        <div className="col-span-12 lg:col-span-3 space-y-4">
          {/* Card: Davinci & Agentes de IA */}
          <div className="bg-[#081226]/85 backdrop-blur-xl border border-cyan-950/60 rounded-2xl p-4 shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400">
                  <Bot className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-semibold text-gray-200">Agentes de IA</h3>
                  <span className="text-[10px] text-gray-500">Davinci • Orquestrador</span>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" />
                <span className="text-[10px] font-bold text-emerald-400">Online</span>
              </div>
            </div>

            {/* Balão Inteligente do Davinci com Radar Operacional Real */}
            <div className="bg-[#040915] border border-cyan-950/80 rounded-xl p-3 mb-3 space-y-2">
              <div className="flex items-start gap-2.5">
                <div className="w-8 h-8 rounded-full border border-cyan-500/30 bg-gradient-to-tr from-cyan-600 to-indigo-600 flex items-center justify-center text-cyan-200 shrink-0 shadow-[0_0_12px_rgba(6,182,212,0.3)]">
                  <Bot className="w-4 h-4" />
                </div>
                <p className="text-[11px] text-gray-300 leading-relaxed text-left">
                  {metrics.activeCount === 0
                    ? `Olá, ${firstName}! Central pronta para escalar novas ofertas e funis.`
                    : `${firstName}, monitorando ${metrics.activeCount} ${
                        metrics.activeCount === 1 ? 'cliente ativo' : 'clientes ativos'
                      } e seu fluxo financeiro em tempo real.`}
                </p>
              </div>

              {(metrics.overdueCount > 0 || metrics.openTicketsCount > 0) && (
                <div className="flex flex-wrap gap-1.5 pt-2 border-t border-cyan-950/50">
                  {metrics.overdueCount > 0 && (
                    <button
                      onClick={() => navigate('/billing')}
                      className="flex items-center gap-1 px-2 py-1 rounded-lg bg-rose-500/10 border border-rose-500/30 text-[10px] font-semibold text-rose-300 hover:bg-rose-500/20 transition cursor-pointer"
                    >
                      <AlertCircle className="w-3 h-3" />
                      {metrics.overdueCount} pendência(s) financeira(s)
                    </button>
                  )}
                  {metrics.openTicketsCount > 0 && (
                    <button
                      onClick={() => navigate('/support')}
                      className="flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-500/10 border border-amber-500/30 text-[10px] font-semibold text-amber-300 hover:bg-amber-500/20 transition cursor-pointer"
                    >
                      <LifeBuoy className="w-3 h-3" />
                      {metrics.openTicketsCount} chamado(s) em aberto
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Ações Rápidas em 2 Colunas (Zero Texto Cortado) */}
            <div className="grid grid-cols-2 gap-2 mb-3">
              <button
                onClick={() => navigate('/offers')}
                className="px-2.5 py-2 rounded-xl bg-[#0d1c3a] border border-cyan-900/40 text-[11px] font-semibold text-cyan-300 hover:bg-cyan-900/30 hover:border-cyan-500/40 transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5 shrink-0" />
                <span>Nova Oferta</span>
              </button>
              <button
                onClick={() => navigate('/funnels')}
                className="px-2.5 py-2 rounded-xl bg-[#0d1c3a] border border-cyan-900/40 text-[11px] font-semibold text-cyan-300 hover:bg-cyan-900/30 hover:border-cyan-500/40 transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <GitFork className="w-3.5 h-3.5 shrink-0" />
                <span>Ver Funis</span>
              </button>
              <button
                onClick={() => navigate('/analytics')}
                className="px-2.5 py-2 rounded-xl bg-[#040915] border border-cyan-950/60 text-[11px] font-medium text-gray-300 hover:text-white hover:border-cyan-800/60 transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <BarChart3 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                <span>Analytics</span>
              </button>
              <button
                onClick={() => navigate('/chat?mode=davinci')}
                className="px-2.5 py-2 rounded-xl bg-[#040915] border border-cyan-950/60 text-[11px] font-medium text-gray-300 hover:text-white hover:border-cyan-800/60 transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <MessageSquare className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                <span>Chat Davinci</span>
              </button>
            </div>

            <div className="flex items-center justify-end pt-2 border-t border-cyan-950/60 text-xs">
              <button
                onClick={() => navigate('/settings')}
                className="text-gray-400 hover:text-white flex items-center gap-1 text-[11px] cursor-pointer transition-colors"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                Configurações
              </button>
            </div>
          </div>

          {/* Card: Atalhos de Produção Operacional */}
          <div className="bg-[#081226]/85 backdrop-blur-xl border border-cyan-950/60 rounded-2xl p-4 shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
            <div className="flex items-center justify-between mb-2.5">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400">
                  <Rocket className="w-4 h-4" />
                </div>
                <h3 className="text-xs font-semibold text-gray-200">Laboratórios de Produção</h3>
              </div>
            </div>

            <div className="space-y-2">
              <button
                onClick={() => navigate('/offers')}
                className="w-full p-2.5 rounded-xl bg-[#040915]/70 hover:bg-[#071328] border border-cyan-950/40 hover:border-cyan-500/30 flex items-center justify-between transition-all cursor-pointer text-left group"
              >
                <span className="text-xs font-medium text-gray-200 group-hover:text-white">
                  Laboratório de Ofertas
                </span>
                <ChevronRight className="w-3.5 h-3.5 text-gray-500 group-hover:text-cyan-400 transition-colors" />
              </button>

              <button
                onClick={() => navigate('/funnels')}
                className="w-full p-2.5 rounded-xl bg-[#040915]/70 hover:bg-[#071328] border border-cyan-950/40 hover:border-cyan-500/30 flex items-center justify-between transition-all cursor-pointer text-left group"
              >
                <span className="text-xs font-medium text-gray-200 group-hover:text-white">
                  Arquiteto de Funis
                </span>
                <ChevronRight className="w-3.5 h-3.5 text-gray-500 group-hover:text-cyan-400 transition-colors" />
              </button>

              <button
                onClick={() => navigate('/hub-ads')}
                className="w-full p-2.5 rounded-xl bg-[#040915]/70 hover:bg-[#071328] border border-cyan-950/40 hover:border-cyan-500/30 flex items-center justify-between transition-all cursor-pointer text-left group"
              >
                <span className="text-xs font-medium text-gray-200 group-hover:text-white">
                  Criativos & HubAds
                </span>
                <ChevronRight className="w-3.5 h-3.5 text-gray-500 group-hover:text-cyan-400 transition-colors" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
