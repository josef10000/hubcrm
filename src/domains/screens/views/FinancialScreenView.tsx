import React, { useState, useEffect, useMemo, useRef } from 'react';
import ScreenLayout from '../layouts/ScreenLayout';
import { useTransactions } from '@/hooks/queries/useFinance';
import { useClients } from '@/hooks/queries/useClients';
import { useCRM } from '@crm/contexts/CRMContext';
import { soundEffects } from '../utils/soundEffects';
import { 
  DollarSign, 
  TrendingUp, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  QrCode, 
  CreditCard, 
  FileText, 
  Target, 
  Sparkles, 
  Zap, 
  ArrowUpRight, 
  Layers, 
  Activity,
  Edit2
} from 'lucide-react';
import { Transaction } from '@/types';

export default function FinancialScreenView() {
  const { effectiveOrgId } = useCRM();
  const { data: transactionsData = [] } = useTransactions();
  const { data: clientsData = [] } = useClients();

  // Meta diária de faturamento (Persistida no localStorage)
  const [dailyGoal, setDailyGoal] = useState<number>(() => {
    const saved = localStorage.getItem('hubcrm_daily_goal');
    return saved ? parseFloat(saved) : 5000;
  });
  const [isEditingGoal, setIsEditingGoal] = useState(false);
  const [tempGoal, setTempGoal] = useState<string>(dailyGoal.toString());

  // Rastreamento para efeito sonoro ao entrar nova venda paga
  const lastPaidTxIdRef = useRef<string | null>(null);
  const [celebrationPulse, setCelebrationPulse] = useState(false);

  // Início e Fim do Dia Atual (00:00:00 até 23:59:59)
  const todayRange = useMemo(() => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    return { start: start.getTime(), end: end.getTime() };
  }, []);

  // Filtragem de Transações de Hoje
  const todayTransactions = useMemo(() => {
    return transactionsData.filter(tx => {
      const txTime = tx.paymentDate || tx.date;
      return txTime >= todayRange.start && txTime <= todayRange.end && tx.type === 'INCOME';
    });
  }, [transactionsData, todayRange]);

  // Transações Pagas de Hoje
  const todayPaidTransactions = useMemo(() => {
    return todayTransactions.filter(tx => tx.status === 'PAID');
  }, [todayTransactions]);

  // Transações Pendentes de Hoje
  const todayPendingTransactions = useMemo(() => {
    return todayTransactions.filter(tx => tx.status === 'PENDING');
  }, [todayTransactions]);

  // Totais Financeiros do Dia
  const metrics = useMemo(() => {
    // ⚡ Valor Total Gerado (Todas as cobranças/intenções de compra emitidas hoje)
    const valorGerado = todayTransactions.reduce((acc, tx) => acc + (tx.amount || 0), 0);

    // ✅ Valor Total Pago (Efetivamente liquidado no caixa)
    const valorPago = todayPaidTransactions.reduce((acc, tx) => acc + (tx.amount || 0), 0);

    // 🔄 Pendente de Recuperação
    const pendenteRecuperacao = Math.max(0, valorGerado - valorPago);

    // 📈 Taxa de Conversão do Caixa (%)
    const taxaConversao = valorGerado > 0 ? (valorPago / valorGerado) * 100 : 0;

    // Ticket Médio Pago
    const ticketMedio = todayPaidTransactions.length > 0 ? valorPago / todayPaidTransactions.length : 0;

    // Métricas por Método de Pagamento (Classificação por Descrição / Categoria / Metadados)
    let pixGerado = 0, pixPago = 0, pixQtdGerado = 0, pixQtdPago = 0;
    let cardGerado = 0, cardPago = 0, cardQtdGerado = 0, cardQtdPago = 0;
    let boletoGerado = 0, boletoPago = 0, boletoQtdGerado = 0, boletoQtdPago = 0;

    todayTransactions.forEach(tx => {
      const desc = (tx.description || '').toLowerCase();
      const isPix = desc.includes('pix') || desc.includes('qr') || tx.notes?.toLowerCase().includes('pix');
      const isBoleto = desc.includes('boleto') || tx.notes?.toLowerCase().includes('boleto');
      const isCard = !isPix && !isBoleto; // Padrão ou cartão de crédito

      if (isPix) {
        pixGerado += tx.amount || 0;
        pixQtdGerado++;
        if (tx.status === 'PAID') {
          pixPago += tx.amount || 0;
          pixQtdPago++;
        }
      } else if (isBoleto) {
        boletoGerado += tx.amount || 0;
        boletoQtdGerado++;
        if (tx.status === 'PAID') {
          boletoPago += tx.amount || 0;
          boletoQtdPago++;
        }
      } else {
        cardGerado += tx.amount || 0;
        cardQtdGerado++;
        if (tx.status === 'PAID') {
          cardPago += tx.amount || 0;
          cardQtdPago++;
        }
      }
    });

    return {
      valorGerado,
      valorPago,
      pendenteRecuperacao,
      taxaConversao,
      ticketMedio,
      totalVendasPagas: todayPaidTransactions.length,
      totalTentativas: todayTransactions.length,
      pix: {
        gerado: pixGerado,
        pago: pixPago,
        qtdGerado: pixQtdGerado,
        qtdPago: pixQtdPago,
        taxa: pixGerado > 0 ? (pixPago / pixGerado) * 100 : 0
      },
      card: {
        gerado: cardGerado,
        pago: cardPago,
        qtdGerado: cardQtdGerado,
        qtdPago: cardQtdPago,
        taxa: cardGerado > 0 ? (cardPago / cardGerado) * 100 : 0
      },
      boleto: {
        gerado: boletoGerado,
        pago: boletoPago,
        qtdGerado: boletoQtdGerado,
        qtdPago: boletoQtdPago,
        taxa: boletoGerado > 0 ? (boletoPago / boletoGerado) * 100 : 0
      }
    };
  }, [todayTransactions, todayPaidTransactions]);

  // Efeito Sonoro ao entrar nova venda
  useEffect(() => {
    if (todayPaidTransactions.length > 0) {
      const mostRecent = todayPaidTransactions[0];
      if (lastPaidTxIdRef.current && lastPaidTxIdRef.current !== mostRecent.id) {
        soundEffects.playCashChime();
        setCelebrationPulse(true);
        setTimeout(() => setCelebrationPulse(false), 2000);
      }
      lastPaidTxIdRef.current = mostRecent.id;
    }
  }, [todayPaidTransactions]);

  // Distribuição de Faturamento por Hora (00h às 23h)
  const hourlyData = useMemo(() => {
    const hours = Array.from({ length: 24 }, (_, i) => ({
      hour: `${i.toString().padStart(2, '0')}h`,
      paid: 0,
      generated: 0
    }));

    todayTransactions.forEach(tx => {
      const txDate = new Date(tx.paymentDate || tx.date);
      const h = txDate.getHours();
      if (h >= 0 && h < 24) {
        hours[h].generated += tx.amount || 0;
        if (tx.status === 'PAID') {
          hours[h].paid += tx.amount || 0;
        }
      }
    });

    const maxAmount = Math.max(...hours.map(h => Math.max(h.paid, h.generated)), 100);
    return { hours, maxAmount };
  }, [todayTransactions]);

  // Salvar Meta
  const handleSaveGoal = () => {
    const parsed = parseFloat(tempGoal);
    if (!isNaN(parsed) && parsed > 0) {
      setDailyGoal(parsed);
      localStorage.setItem('hubcrm_daily_goal', parsed.toString());
      setIsEditingGoal(false);
    }
  };

  const goalProgress = Math.min(100, (metrics.valorPago / (dailyGoal || 1)) * 100);

  return (
    <ScreenLayout
      screenNumber={1}
      title="SALA FINANCEIRA & ASAAS REALTIME"
      subtitle="Monitoramento ao vivo de faturamento, pagamentos confirmados e taxa de conversão"
      badgeColor="text-emerald-400 bg-emerald-500/10 border-emerald-500/30"
      headerExtra={
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 text-xs">
            <span className="text-gray-400 font-bold uppercase">Total Transações:</span>
            <span className="font-mono font-black text-white px-2 py-0.5 rounded-lg bg-white/5 border border-white/10">
              {metrics.totalVendasPagas} pagas / {metrics.totalTentativas} total
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-gray-400 font-bold uppercase">Ticket Médio:</span>
            <span className="font-mono font-black text-emerald-400 px-2 py-0.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
              R$ {metrics.ticketMedio.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      }
    >
      <div className={`space-y-6 transition-all duration-500 ${celebrationPulse ? 'scale-[1.005]' : ''}`}>
        
        {/* ── 1. CARDS GIGANTES DE VALOR GERADO VS VALOR PAGO (GRID 4 COLUNAS) ─ */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Card 1: ⚡ VALOR TOTAL GERADO HOJE */}
          <div className="p-5 rounded-3xl bg-[#0b1122]/90 border border-white/10 shadow-2xl relative overflow-hidden backdrop-blur-xl group hover:border-cyan-500/40 transition-all">
            <div className="absolute -right-6 -bottom-6 w-28 h-28 bg-cyan-500/10 rounded-full blur-2xl group-hover:bg-cyan-500/20 transition-all" />
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-black uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-cyan-400" />
                Valor Gerado Hoje
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                {metrics.totalTentativas} Cobranças
              </span>
            </div>
            <div className="text-3xl lg:text-4xl font-black font-mono text-white tracking-tight">
              R$ {metrics.valorGerado.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="text-[11px] text-gray-400 mt-2 flex items-center gap-1">
              <span>Soma de todos os Pix, Boletos e Cartões gerados hoje</span>
            </p>
          </div>

          {/* Card 2: ✅ VALOR TOTAL PAGO HOJE */}
          <div className="p-5 rounded-3xl bg-gradient-to-br from-[#0c1e19]/90 to-[#07130e]/90 border-2 border-emerald-500/40 shadow-2xl relative overflow-hidden backdrop-blur-xl group hover:border-emerald-400 transition-all ring-1 ring-emerald-500/20">
            <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-emerald-500/20 rounded-full blur-2xl group-hover:bg-emerald-500/30 transition-all" />
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-black uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                Valor Pago / Caixa
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 animate-pulse">
                {metrics.totalVendasPagas} Confirmadas
              </span>
            </div>
            <div className="text-3xl lg:text-4xl font-black font-mono text-emerald-300 tracking-tight">
              R$ {metrics.valorPago.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="text-[11px] text-emerald-400/80 mt-2 font-medium">
              💰 Efetivamente liquidado na conta hoje
            </p>
          </div>

          {/* Card 3: 📈 TAXA DE CONVERSÃO DO CAIXA */}
          <div className="p-5 rounded-3xl bg-[#0b1122]/90 border border-white/10 shadow-2xl relative overflow-hidden backdrop-blur-xl group hover:border-indigo-500/40 transition-all">
            <div className="absolute -right-6 -bottom-6 w-28 h-28 bg-indigo-500/10 rounded-full blur-2xl group-hover:bg-indigo-500/20 transition-all" />
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-black uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-indigo-400" />
                Taxa de Conversão
              </span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                metrics.taxaConversao >= 70 ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20' : 'bg-amber-500/10 text-amber-300 border-amber-500/20'
              }`}>
                {metrics.taxaConversao >= 70 ? 'Alta Eficiência' : 'Em Recuperação'}
              </span>
            </div>
            <div className="text-3xl lg:text-4xl font-black font-mono text-white tracking-tight flex items-baseline gap-2">
              {metrics.taxaConversao.toFixed(1)}%
            </div>
            <div className="w-full bg-white/10 h-1.5 rounded-full mt-3 overflow-hidden">
              <div
                className="bg-gradient-to-r from-indigo-500 to-emerald-400 h-full rounded-full transition-all duration-700"
                style={{ width: `${Math.min(100, metrics.taxaConversao)}%` }}
              />
            </div>
          </div>

          {/* Card 4: 🔄 PENDENTE DE RECUPERAÇÃO */}
          <div className="p-5 rounded-3xl bg-[#140e11]/90 border border-amber-500/30 shadow-2xl relative overflow-hidden backdrop-blur-xl group hover:border-amber-400/50 transition-all">
            <div className="absolute -right-6 -bottom-6 w-28 h-28 bg-amber-500/10 rounded-full blur-2xl group-hover:bg-amber-500/20 transition-all" />
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-black uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-amber-400" />
                A Recuperar (Pix/Boleto)
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20">
                {todayPendingTransactions.length} Pendentes
              </span>
            </div>
            <div className="text-3xl lg:text-4xl font-black font-mono text-amber-300 tracking-tight">
              R$ {metrics.pendenteRecuperacao.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="text-[11px] text-amber-400/80 mt-2 font-medium">
              🔥 Dinheiro na mesa para o time recuperar no WhatsApp
            </p>
          </div>

        </div>

        {/* ── 2. BARRA DE META DIÁRIA & CONVERSÃO POR MÉTODO ──────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          
          {/* BARRA DE META DIÁRIA DE FATURAMENTO (2 COLUNAS) */}
          <div className="lg:col-span-2 p-5 rounded-3xl bg-[#080e1c]/90 border border-white/10 backdrop-blur-xl shadow-xl flex flex-col justify-between">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                  <Target className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black uppercase text-white tracking-wider flex items-center gap-2">
                    Meta Diária de Faturamento
                    <button
                      onClick={() => setIsEditingGoal(!isEditingGoal)}
                      className="p-1 rounded text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
                      title="Editar Meta do Dia"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  </h3>
                  <span className="text-[11px] text-gray-400">
                    Progresso atual do faturamento frente ao objetivo do dia
                  </span>
                </div>
              </div>

              {isEditingGoal ? (
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={tempGoal}
                    onChange={(e) => setTempGoal(e.target.value)}
                    className="w-28 px-3 py-1 bg-black/60 border border-indigo-500 rounded-xl text-xs font-mono text-white focus:outline-none"
                    placeholder="Ex: 10000"
                  />
                  <button
                    onClick={handleSaveGoal}
                    className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold"
                  >
                    Salvar
                  </button>
                </div>
              ) : (
                <div className="text-right">
                  <span className="text-xs text-gray-400 block font-bold uppercase">Objetivo:</span>
                  <span className="text-lg font-black font-mono text-indigo-300">
                    R$ {dailyGoal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              )}
            </div>

            {/* Barra de Progresso Visual */}
            <div className="space-y-2 mt-2">
              <div className="flex justify-between items-center text-xs font-bold font-mono">
                <span className="text-emerald-400">
                  R$ {metrics.valorPago.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} ({goalProgress.toFixed(1)}%)
                </span>
                <span className="text-gray-400">
                  Falta: R$ {Math.max(0, dailyGoal - metrics.valorPago).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="w-full h-4 bg-black/60 border border-white/10 rounded-full overflow-hidden p-0.5">
                <div
                  className="h-full bg-gradient-to-r from-indigo-500 via-cyan-400 to-emerald-400 rounded-full transition-all duration-1000 shadow-lg shadow-emerald-500/20 relative"
                  style={{ width: `${goalProgress}%` }}
                >
                  <div className="absolute inset-0 bg-white/20 animate-pulse rounded-full" />
                </div>
              </div>
            </div>
          </div>

          {/* EFICIÊNCIA POR FORMA DE PAGAMENTO */}
          <div className="p-5 rounded-3xl bg-[#080e1c]/90 border border-white/10 backdrop-blur-xl shadow-xl space-y-3">
            <h3 className="text-xs font-black uppercase text-gray-400 tracking-wider flex items-center justify-between">
              <span>Conversão por Método</span>
              <span className="text-[10px] text-gray-500 font-bold">Hoje</span>
            </h3>

            <div className="space-y-2.5">
              {/* PIX */}
              <div className="p-2.5 rounded-2xl bg-white/[0.02] border border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <QrCode className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">⚡ PIX</h4>
                    <span className="text-[10px] text-gray-400 font-mono">
                      {metrics.pix.qtdPago}/{metrics.pix.qtdGerado} pagos (R$ {metrics.pix.pago.toLocaleString('pt-BR')})
                    </span>
                  </div>
                </div>
                <span className="text-xs font-black font-mono text-emerald-400">
                  {metrics.pix.taxa.toFixed(0)}%
                </span>
              </div>

              {/* CARTÃO */}
              <div className="p-2.5 rounded-2xl bg-white/[0.02] border border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                    <CreditCard className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">💳 Cartão</h4>
                    <span className="text-[10px] text-gray-400 font-mono">
                      {metrics.card.qtdPago}/{metrics.card.qtdGerado} aprovados (R$ {metrics.card.pago.toLocaleString('pt-BR')})
                    </span>
                  </div>
                </div>
                <span className="text-xs font-black font-mono text-cyan-400">
                  {metrics.card.taxa.toFixed(0)}%
                </span>
              </div>

              {/* BOLETO */}
              <div className="p-2.5 rounded-2xl bg-white/[0.02] border border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">📄 Boleto</h4>
                    <span className="text-[10px] text-gray-400 font-mono">
                      {metrics.boleto.qtdPago}/{metrics.boleto.qtdGerado} compensados
                    </span>
                  </div>
                </div>
                <span className="text-xs font-black font-mono text-amber-400">
                  {metrics.boleto.taxa.toFixed(0)}%
                </span>
              </div>
            </div>
          </div>

        </div>

        {/* ── 3. LIVE TICKER DE TRANSAÇÕES + GRÁFICO HORÁRIO (2 COLUNAS) ──────── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* COLUNA ESQUERDA (7 cols): LIVE TICKER DE VENDAS ASAAS */}
          <div className="lg:col-span-7 p-6 rounded-3xl bg-[#080e1c]/90 border border-white/10 backdrop-blur-xl shadow-xl flex flex-col min-h-[380px]">
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                  <Activity className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black uppercase text-white tracking-wider flex items-center gap-2">
                    Live Feed de Transações
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  </h3>
                  <span className="text-[11px] text-gray-400">
                    Últimas movimentações recebidas e processadas hoje
                  </span>
                </div>
              </div>
              <span className="text-xs font-mono font-bold text-gray-400 bg-white/5 px-2.5 py-1 rounded-xl border border-white/10">
                {todayTransactions.length} registros
              </span>
            </div>

            {/* Lista de Transações */}
            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2.5 pt-4 max-h-[380px]">
              {todayTransactions.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center p-8 text-center text-gray-500">
                  <DollarSign className="w-10 h-10 text-gray-600 mb-2" />
                  <p className="text-sm font-bold text-gray-400">Aguardando primeiras vendas do dia...</p>
                  <p className="text-xs text-gray-600 mt-1">Os pagamentos do Asaas e do Checkout surgirão aqui em tempo real com som de caixa.</p>
                </div>
              ) : (
                todayTransactions.slice(0, 15).map(tx => {
                  const txDate = new Date(tx.paymentDate || tx.date);
                  const isPaid = tx.status === 'PAID';
                  const isPending = tx.status === 'PENDING';
                  const client = clientsData.find(c => c.id === tx.clientId);

                  return (
                    <div
                      key={tx.id}
                      className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between ${
                        isPaid
                          ? 'bg-emerald-500/[0.04] border-emerald-500/30 hover:border-emerald-500/60 shadow-lg shadow-emerald-500/5'
                          : isPending
                          ? 'bg-amber-500/[0.04] border-amber-500/30 hover:border-amber-500/60'
                          : 'bg-white/[0.02] border-white/5 hover:border-white/20'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-xl border ${
                          isPaid 
                            ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400' 
                            : isPending 
                            ? 'bg-amber-500/20 border-amber-500/40 text-amber-400'
                            : 'bg-white/5 border-white/10 text-gray-400'
                        }`}>
                          {isPaid ? <CheckCircle2 className="w-4 h-4" /> : isPending ? <Clock className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-white flex items-center gap-2">
                            {tx.description || client?.name || 'Venda Checkout'}
                            {client?.company && (
                              <span className="text-[10px] text-gray-400 font-normal">({client.company})</span>
                            )}
                          </h4>
                          <div className="flex items-center gap-2 text-[10px] text-gray-400 mt-0.5">
                            <span className="font-mono">{txDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                            <span>•</span>
                            <span className="capitalize">{tx.categoryName || 'Produto / Oferta'}</span>
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className={`text-sm font-black font-mono ${isPaid ? 'text-emerald-400' : isPending ? 'text-amber-400' : 'text-gray-400'}`}>
                          + R$ {(tx.amount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                        <span className={`text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full ${
                          isPaid ? 'bg-emerald-500/20 text-emerald-300' : isPending ? 'bg-amber-500/20 text-amber-300' : 'bg-white/10 text-gray-400'
                        }`}>
                          {isPaid ? 'Aprovado' : isPending ? 'Pix / Pendente' : tx.status}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* COLUNA DIREITA (5 cols): GRÁFICO HISTOGRAMA DE VENDAS POR HORA */}
          <div className="lg:col-span-5 p-6 rounded-3xl bg-[#080e1c]/90 border border-white/10 backdrop-blur-xl shadow-xl flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-white/10">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                    <TrendingUp className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black uppercase text-white tracking-wider">
                      Faturamento Hora a Hora
                    </h3>
                    <span className="text-[11px] text-gray-400">
                      Picos de vendas ao longo das 24 horas de hoje
                    </span>
                  </div>
                </div>
              </div>

              {/* Barras de Faturamento por Hora */}
              <div className="h-56 flex items-end gap-1.5 pt-6 pb-2 px-1">
                {hourlyData.hours.map((h, i) => {
                  const currentHour = new Date().getHours();
                  const isCurrent = i === currentHour;
                  const paidHeight = (h.paid / hourlyData.maxAmount) * 100;
                  const generatedHeight = (h.generated / hourlyData.maxAmount) * 100;

                  return (
                    <div key={i} className="flex-1 flex flex-col items-center h-full justify-end group relative">
                      {/* Tooltip on Hover */}
                      <div className="absolute -top-12 bg-black/90 border border-white/20 p-1.5 rounded-lg text-[9px] font-mono text-white opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-20 shadow-xl">
                        <div>{h.hour}</div>
                        <div className="text-emerald-400 font-bold">Pago: R$ {h.paid.toLocaleString('pt-BR')}</div>
                        <div className="text-cyan-400">Gerado: R$ {h.generated.toLocaleString('pt-BR')}</div>
                      </div>

                      {/* Barra de Valor */}
                      <div className="w-full flex items-end justify-center h-full">
                        <div
                          className={`w-full max-w-[12px] rounded-t-sm transition-all ${
                            isCurrent
                              ? 'bg-gradient-to-t from-emerald-600 to-emerald-300 ring-2 ring-emerald-400 shadow-lg shadow-emerald-500/50'
                              : h.paid > 0
                              ? 'bg-emerald-500 hover:bg-emerald-400'
                              : h.generated > 0
                              ? 'bg-cyan-600/50'
                              : 'bg-white/5'
                          }`}
                          style={{ height: `${Math.max(4, paidHeight || generatedHeight)}%` }}
                        />
                      </div>

                      {/* Rótulo de Hora */}
                      {i % 4 === 0 && (
                        <span className="text-[9px] text-gray-500 font-mono mt-1">
                          {h.hour}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Legenda do Gráfico */}
            <div className="flex items-center justify-center gap-6 pt-3 border-t border-white/10 text-xs">
              <div className="flex items-center gap-2 text-gray-400">
                <div className="w-3 h-3 rounded-sm bg-emerald-500" />
                <span>Valor Pago</span>
              </div>
              <div className="flex items-center gap-2 text-gray-400">
                <div className="w-3 h-3 rounded-sm bg-cyan-600/50" />
                <span>Valor Gerado (Intenção)</span>
              </div>
              <div className="flex items-center gap-2 text-gray-400">
                <div className="w-3 h-3 rounded-sm bg-white/5 border border-white/20" />
                <span>Sem Movimentação</span>
              </div>
            </div>

          </div>

        </div>

      </div>
    </ScreenLayout>
  );
}
