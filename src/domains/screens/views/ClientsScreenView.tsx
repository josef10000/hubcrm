import React, { useMemo } from 'react';
import ScreenLayout from '../layouts/ScreenLayout';
import { useClients } from '@/hooks/queries/useClients';
import { useTransactions } from '@/hooks/queries/useFinance';
import { useCRM } from '@crm/contexts/CRMContext';
import { 
  Users, 
  UserPlus, 
  Sparkles, 
  Clock, 
  MessageCircle, 
  ExternalLink, 
  CheckCircle2, 
  FileText, 
  ShieldCheck, 
  ArrowUpRight, 
  Building2, 
  Phone,
  Flame
} from 'lucide-react';
import { Client, Transaction } from '@/types';

export default function ClientsScreenView() {
  const { effectiveOrgId } = useCRM();
  const { data: clientsData = [] } = useClients();
  const { data: transactionsData = [] } = useTransactions();

  // Início e Fim do Dia Atual
  const todayRange = useMemo(() => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    return { start: start.getTime(), end: end.getTime() };
  }, []);

  // Novos Clientes Criados Hoje
  const todayClients = useMemo(() => {
    return clientsData.filter(c => {
      const createdTime = c.createdAt ? new Date(c.createdAt).getTime() : 0;
      return createdTime >= todayRange.start && createdTime <= todayRange.end;
    });
  }, [clientsData, todayRange]);

  // Clientes em Onboarding
  const onboardingClients = useMemo(() => {
    return clientsData.filter(c => (c.status as string) === 'Onboarding' || (c.status as string) === 'Novo' || !(c as any).onboardingCompleted);
  }, [clientsData]);

  // Fila de Recuperação Ativa (Transações Pendentes de Pix/Boleto nas últimas 24 horas)
  const recoveryQueue = useMemo(() => {
    const twentyFourHoursAgo = Date.now() - 24 * 60 * 60 * 1000;
    return transactionsData
      .filter(tx => tx.type === 'INCOME' && tx.status === 'PENDING' && tx.date >= twentyFourHoursAgo)
      .map(tx => {
        const client = clientsData.find(c => c.id === tx.clientId);
        return {
          tx,
          client,
          elapsedMinutes: Math.round((Date.now() - tx.date) / 60000)
        };
      })
      .sort((a, b) => b.tx.date - a.tx.date);
  }, [transactionsData, clientsData]);

  // Formatação de link de WhatsApp para recuperação
  const getWhatsAppRecoveryUrl = (client?: Client, tx?: Transaction) => {
    const phone = (client?.whatsapp || (client as any)?.phone || '').replace(/\D/g, '');
    if (!phone) return null;

    const firstName = client?.name?.split(' ')[0] || 'Cliente';
    const amount = (tx?.amount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
    const message = encodeURIComponent(
      `Olá ${firstName}! Tudo bem? Vi que você gerou um pedido de R$ ${amount} conosco. Posso te ajudar a finalizar seu pagamento por Pix para liberar seu acesso imediatamente?`
    );

    return `https://wa.me/55${phone}?text=${message}`;
  };

  return (
    <ScreenLayout
      screenNumber={2}
      title="RADAR DE CLIENTES & RECUPERAÇÃO AO VIVO"
      subtitle="Monitoramento em tempo real de novos clientes, esteira de onboarding e recuperação de vendas"
      badgeColor="text-cyan-400 bg-cyan-500/10 border-cyan-500/30"
      headerExtra={
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 text-xs">
            <span className="text-gray-400 font-bold uppercase">Clientes Ativos:</span>
            <span className="font-mono font-black text-cyan-400 px-2 py-0.5 rounded-lg bg-cyan-500/10 border border-cyan-500/20">
              {clientsData.filter(c => c.status === 'Ativo').length}
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-gray-400 font-bold uppercase">Fila de Recuperação:</span>
            <span className="font-mono font-black text-amber-400 px-2 py-0.5 rounded-lg bg-amber-500/10 border border-amber-500/20 animate-pulse">
              {recoveryQueue.length} leads
            </span>
          </div>
        </div>
      }
    >
      <div className="space-y-6">
        
        {/* ── 1. CARDS DE INDICADORES OPERACIONAIS (GRID 4 COLS) ─────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Card 1: 👥 Novos Clientes Hoje */}
          <div className="p-5 rounded-3xl bg-[#0b1122]/90 border border-white/10 shadow-2xl relative overflow-hidden backdrop-blur-xl group hover:border-cyan-500/40 transition-all">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-black uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                <UserPlus className="w-4 h-4 text-cyan-400" />
                Novos Clientes Hoje
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                Hoje
              </span>
            </div>
            <div className="text-3xl lg:text-4xl font-black font-mono text-white tracking-tight">
              {todayClients.length}
            </div>
            <p className="text-[11px] text-gray-400 mt-2">
              Cards gerados automaticamente via Asaas / Checkout
            </p>
          </div>

          {/* Card 2: 🚀 Em Onboarding / Kick-off */}
          <div className="p-5 rounded-3xl bg-[#0b1122]/90 border border-white/10 shadow-2xl relative overflow-hidden backdrop-blur-xl group hover:border-indigo-500/40 transition-all">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-black uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-indigo-400" />
                Em Onboarding
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                Fila Ativa
              </span>
            </div>
            <div className="text-3xl lg:text-4xl font-black font-mono text-indigo-300 tracking-tight">
              {onboardingClients.length}
            </div>
            <p className="text-[11px] text-gray-400 mt-2">
              Clientes aguardando ativação ou reunião de kick-off
            </p>
          </div>

          {/* Card 3: ⚡ Fila de Recuperação (Pix Pendente) */}
          <div className="p-5 rounded-3xl bg-[#140e11]/90 border border-amber-500/30 shadow-2xl relative overflow-hidden backdrop-blur-xl group hover:border-amber-400/50 transition-all">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-black uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                <Flame className="w-4 h-4 text-amber-400" />
                Fila de Recuperação
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse">
                Urgente
              </span>
            </div>
            <div className="text-3xl lg:text-4xl font-black font-mono text-amber-300 tracking-tight">
              {recoveryQueue.length}
            </div>
            <p className="text-[11px] text-amber-400/80 mt-2 font-medium">
              Pix/Boletos gerados nas últimas 24h para fechar no WhatsApp
            </p>
          </div>

          {/* Card 4: 🛡️ Total de Clientes Ativos na Base */}
          <div className="p-5 rounded-3xl bg-[#0b1122]/90 border border-white/10 shadow-2xl relative overflow-hidden backdrop-blur-xl group hover:border-emerald-500/40 transition-all">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-black uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                Base Total Ativa
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                MRR Ativo
              </span>
            </div>
            <div className="text-3xl lg:text-4xl font-black font-mono text-white tracking-tight">
              {clientsData.length}
            </div>
            <p className="text-[11px] text-gray-400 mt-2">
              Carteira total de clientes da organização
            </p>
          </div>

        </div>

        {/* ── 2. SEÇÃO DUPLA: RADAR DE NOVOS CLIENTES vs FILA DE RECUPERAÇÃO ──── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* COLUNA ESQUERDA (6 cols): RADAR DE NOVOS CLIENTES & ONBOARDING */}
          <div className="lg:col-span-6 p-6 rounded-3xl bg-[#080e1c]/90 border border-white/10 backdrop-blur-xl shadow-xl flex flex-col min-h-[460px]">
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black uppercase text-white tracking-wider flex items-center gap-2">
                    Novos Clientes & Onboarding
                    <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                  </h3>
                  <span className="text-[11px] text-gray-400">
                    Últimos cadastros integrados e status da jornada
                  </span>
                </div>
              </div>
              <span className="text-xs font-mono font-bold text-gray-400 bg-white/5 px-2.5 py-1 rounded-xl border border-white/10">
                {clientsData.slice(0, 10).length} recentes
              </span>
            </div>

            {/* Feed de Clientes */}
            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 pt-4 max-h-[440px]">
              {clientsData.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center p-8 text-center text-gray-500">
                  <Users className="w-10 h-10 text-gray-600 mb-2" />
                  <p className="text-sm font-bold text-gray-400">Nenhum cliente cadastrado ainda</p>
                </div>
              ) : (
                clientsData.slice(0, 12).map(client => {
                  const isAsaasClient = !!client.asaasCustomerId || !!client.asaasSubscriptionId;
                  const isToday = client.createdAt ? new Date(client.createdAt).getTime() >= todayRange.start : false;

                  return (
                    <div
                      key={client.id}
                      className={`p-4 rounded-2xl border transition-all flex items-center justify-between ${
                        isToday
                          ? 'bg-cyan-500/[0.04] border-cyan-500/30 hover:border-cyan-500/60 shadow-lg shadow-cyan-500/5'
                          : 'bg-white/[0.02] border-white/5 hover:border-white/20'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-cyan-500 text-white font-black flex items-center justify-center text-sm shadow-md shrink-0">
                          {client.name?.charAt(0)?.toUpperCase() || 'C'}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-xs font-bold text-white">
                              {client.name}
                            </h4>
                            {isAsaasClient && (
                              <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.2 bg-emerald-500/20 text-emerald-300 rounded border border-emerald-500/30">
                                Asaas Auto
                              </span>
                            )}
                            {isToday && (
                              <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.2 bg-cyan-500/20 text-cyan-300 rounded border border-cyan-500/30 animate-pulse">
                                Novo Hoje
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-[10px] text-gray-400 mt-1">
                            {(client.companyName || (client as any).company) && (
                              <span className="flex items-center gap-1">
                                <Building2 className="w-3 h-3 text-gray-500" />
                                {client.companyName || (client as any).company}
                              </span>
                            )}
                            {client.plan && (
                              <>
                                <span>•</span>
                                <span className="text-indigo-300 font-bold">{client.plan}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                          client.status === 'Ativo'
                            ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                            : (client.status as string) === 'Onboarding'
                            ? 'bg-indigo-500/10 text-indigo-300 border-indigo-500/30'
                            : 'bg-white/10 text-gray-300 border-white/20'
                        }`}>
                          {client.status || 'Ativo'}
                        </span>
                        {client.siteLink && (
                          <a
                            href={client.siteLink}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[10px] text-gray-400 hover:text-cyan-400 flex items-center justify-end gap-1 mt-1"
                          >
                            Site <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* COLUNA DIREITA (6 cols): FILA DE RECUPERAÇÃO ATIVA (PIX PENDENTE) */}
          <div className="lg:col-span-6 p-6 rounded-3xl bg-[#080e1c]/90 border border-white/10 backdrop-blur-xl shadow-xl flex flex-col min-h-[460px]">
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
                  <Flame className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black uppercase text-white tracking-wider flex items-center gap-2">
                    Fila de Recuperação Ativa (Pix/Boleto)
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                  </h3>
                  <span className="text-[11px] text-gray-400">
                    Cobranças geradas aguardando fechamento comercial
                  </span>
                </div>
              </div>
              <span className="text-xs font-mono font-bold text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-xl border border-amber-500/20">
                {recoveryQueue.length} pendentes
              </span>
            </div>

            {/* Lista da Fila de Recuperação */}
            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 pt-4 max-h-[440px]">
              {recoveryQueue.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center p-8 text-center text-gray-500">
                  <CheckCircle2 className="w-10 h-10 text-emerald-500 mb-2" />
                  <p className="text-sm font-bold text-emerald-400">Tudo em dia! Sem Pix pendentes de recuperação.</p>
                  <p className="text-xs text-gray-600 mt-1">Quando alguém gerar um Pix no checkout ou no Asaas e não pagar na hora, o lead aparecerá aqui com o botão de WhatsApp.</p>
                </div>
              ) : (
                recoveryQueue.map(({ tx, client, elapsedMinutes }) => {
                  const waUrl = getWhatsAppRecoveryUrl(client, tx);

                  return (
                    <div
                      key={tx.id}
                      className="p-4 rounded-2xl bg-amber-500/[0.03] border border-amber-500/20 hover:border-amber-500/50 transition-all flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 shrink-0">
                          <Clock className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-white flex items-center gap-2">
                            {client?.name || tx.description || 'Lead Interessado'}
                          </h4>
                          <div className="flex items-center gap-2 text-[10px] text-gray-400 mt-1">
                            <span className="font-mono text-amber-300 font-bold">
                              R$ {(tx.amount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </span>
                            <span>•</span>
                            <span>Gerado há {elapsedMinutes < 60 ? `${elapsedMinutes} min` : `${Math.round(elapsedMinutes / 60)}h`}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {waUrl ? (
                          <a
                            href={waUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors flex items-center gap-1.5 shadow-lg shadow-emerald-600/20"
                            title="Abrir conversa de recuperação no WhatsApp"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                            <span>Recuperar</span>
                          </a>
                        ) : (
                          <span className="text-[10px] text-gray-500 italic">
                            Sem Telefone
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

        </div>

      </div>
    </ScreenLayout>
  );
}
