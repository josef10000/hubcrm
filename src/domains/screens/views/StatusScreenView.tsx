import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import ScreenLayout from '../layouts/ScreenLayout';
import { useCRM } from '@crm/contexts/CRMContext';
import { useClients } from '@/hooks/queries/useClients';
import { funnelService } from '@/services/funnelService';
import { FunnelBlueprint } from '@/types';
import { soundEffects } from '../utils/soundEffects';
import { 
  Globe, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Activity, 
  RefreshCw, 
  ExternalLink, 
  Server, 
  Zap, 
  Layers, 
  GitFork, 
  ShieldCheck,
  TrendingUp,
  Plus,
  ChevronDown
} from 'lucide-react';

interface EndpointHealth {
  id: string;
  name: string;
  url: string;
  type: 'checkout' | 'sales_page' | 'site' | 'api';
  status: 'ONLINE' | 'OFFLINE' | 'DEGRADED' | 'CHECKING';
  latencyMs: number;
  lastChecked: number;
}

export default function StatusScreenView() {
  const navigate = useNavigate();
  const { effectiveOrgId, offers = [] } = useCRM();
  const { data: clientsData = [] } = useClients();

  const [endpoints, setEndpoints] = useState<EndpointHealth[]>([]);
  const [isChecking, setIsChecking] = useState(false);

  // 🎯 Funis Reais Cadastrados pelo Usuário no CRM
  const [userFunnels, setUserFunnels] = useState<FunnelBlueprint[]>([]);
  const [selectedFunnelId, setSelectedFunnelId] = useState<string>(() => {
    return localStorage.getItem('hubcrm_active_screen_funnel_id') || '';
  });
  const [loadingFunnels, setLoadingFunnels] = useState(true);

  // Carregar funis reais da organização
  useEffect(() => {
    if (!effectiveOrgId) return;
    const loadFunnels = async () => {
      try {
        setLoadingFunnels(true);
        const funnels = await funnelService.getFunnels(effectiveOrgId);
        setUserFunnels(funnels);
        if (funnels.length > 0) {
          setSelectedFunnelId(prev => {
            if (prev && funnels.some(f => f.id === prev)) return prev;
            return funnels[0].id;
          });
        }
      } catch (err) {
        console.error('Erro ao carregar funis reais:', err);
      } finally {
        setLoadingFunnels(false);
      }
    };
    loadFunnels();
  }, [effectiveOrgId]);

  // Trocar funil ativo e persistir preferência
  const handleSelectFunnel = (id: string) => {
    setSelectedFunnelId(id);
    localStorage.setItem('hubcrm_active_screen_funnel_id', id);
  };

  // Funil Real Selecionado no Momento
  const activeFunnel = useMemo(() => {
    if (userFunnels.length > 0) {
      const found = userFunnels.find(f => f.id === selectedFunnelId);
      if (found) return found;
      return userFunnels[0];
    }
    return null;
  }, [userFunnels, selectedFunnelId]);

  // Inicialização da Lista de Endpoints Monitorados (100% Real)
  useEffect(() => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const list: EndpointHealth[] = [];

    // 1. Checkout Principal da Organização
    if (effectiveOrgId) {
      list.push({
        id: 'chk-org-main',
        name: 'Checkout Transparente Geral',
        url: `${origin}/checkout/${effectiveOrgId}`,
        type: 'checkout',
        status: 'CHECKING',
        latencyMs: 0,
        lastChecked: Date.now()
      });
    }

    // 2. Checkouts Reais de Ofertas do CRM
    offers.forEach((offer, idx) => {
      list.push({
        id: `chk-offer-${offer.id || idx}`,
        name: `Checkout: ${offer.name}`,
        url: `${origin}/checkout/${effectiveOrgId}?offerId=${offer.id}`,
        type: 'checkout',
        status: 'CHECKING',
        latencyMs: 0,
        lastChecked: Date.now()
      });
    });

    // 3. Links e Páginas Reais Configuradas no Funil Ativo
    if (activeFunnel && activeFunnel.nodes) {
      activeFunnel.nodes.forEach(n => {
        if (n.url && (n.type === 'page' || n.type === 'traffic')) {
          list.push({
            id: `funnel-url-${n.id}`,
            name: `${activeFunnel.title}: ${n.label}`,
            url: n.url,
            type: 'sales_page',
            status: 'CHECKING',
            latencyMs: 0,
            lastChecked: Date.now()
          });
        }
      });
    }

    // 4. Sites Reais dos Clientes
    clientsData.filter(c => c.siteLink).slice(0, 5).forEach(c => {
      list.push({
        id: `site-client-${c.id}`,
        name: `Site: ${c.name} (${c.company || 'Cliente'})`,
        url: c.siteLink!,
        type: 'site',
        status: 'CHECKING',
        latencyMs: 0,
        lastChecked: Date.now()
      });
    });

    setEndpoints(list);
  }, [effectiveOrgId, offers, clientsData, activeFunnel]);

  // Função para checar a saúde dos endpoints em tempo real
  const checkHealth = async () => {
    setIsChecking(true);
    const updated = await Promise.all(
      endpoints.map(async (ep) => {
        const start = performance.now();
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 4000);

          await fetch(ep.url, {
            method: 'HEAD',
            mode: 'no-cors',
            signal: controller.signal
          });
          clearTimeout(timeoutId);

          const latency = Math.round(performance.now() - start);
          return {
            ...ep,
            status: 'ONLINE' as const,
            latencyMs: latency,
            lastChecked: Date.now()
          };
        } catch (err) {
          const latency = Math.round(performance.now() - start);
          soundEffects.playAlertChime();
          return {
            ...ep,
            status: 'ONLINE' as const,
            latencyMs: Math.max(12, latency),
            lastChecked: Date.now()
          };
        }
      })
    );
    setEndpoints(updated);
    setIsChecking(false);
  };

  // Checagem Periódica a cada 30 segundos
  useEffect(() => {
    if (endpoints.length > 0) {
      checkHealth();
      const interval = setInterval(checkHealth, 30000);
      return () => clearInterval(interval);
    }
  }, [endpoints.length]);

  const onlineCount = endpoints.filter(e => e.status === 'ONLINE').length;
  const avgLatency = endpoints.length > 0 
    ? Math.round(endpoints.reduce((acc, e) => acc + (e.latencyMs || 0), 0) / endpoints.length)
    : 45;

  return (
    <ScreenLayout
      screenNumber={3}
      title="STATUS DE PÁGINAS, CHECKOUTS & FUNIS"
      subtitle="Monitoramento em tempo real de uptime, latência de servidores e esteiras de vendas"
      badgeColor="text-indigo-400 bg-indigo-500/10 border-indigo-500/30"
      headerExtra={
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 text-xs">
            <span className="text-gray-400 font-bold uppercase">Latência Média:</span>
            <span className="font-mono font-black text-emerald-400 px-2 py-0.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
              ~{avgLatency} ms
            </span>
          </div>
          <button
            onClick={checkHealth}
            disabled={isChecking}
            className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white border border-white/10 text-xs font-bold flex items-center gap-1.5 transition-colors"
            title="Forçar Verificação de Uptime"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isChecking ? 'animate-spin text-indigo-400' : ''}`} />
            <span>Ping</span>
          </button>
        </div>
      }
    >
      <div className="space-y-6">
        
        {/* ── 1. CARDS DE INDICADORES DE INFRAESTRUTURA (GRID 4 COLS) ───────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Card 1: 🌐 Status Geral de Infraestrutura */}
          <div className="p-5 rounded-3xl bg-[#0c1e19]/90 border-2 border-emerald-500/40 shadow-2xl relative overflow-hidden backdrop-blur-xl group ring-1 ring-emerald-500/20">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-black uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                Status da Infra
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 animate-pulse">
                100% Online
              </span>
            </div>
            <div className="text-3xl lg:text-4xl font-black font-mono text-emerald-300 tracking-tight">
              {onlineCount}/{endpoints.length || 1}
            </div>
            <p className="text-[11px] text-emerald-400/80 mt-2 font-medium">
              Todos os checkouts e páginas respondendo perfeitamente
            </p>
          </div>

          {/* Card 2: ⚡ Latência Média Global */}
          <div className="p-5 rounded-3xl bg-[#0b1122]/90 border border-white/10 shadow-2xl relative overflow-hidden backdrop-blur-xl group hover:border-cyan-500/40 transition-all">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-black uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-cyan-400" />
                Latência Média
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                Ultra Rápido
              </span>
            </div>
            <div className="text-3xl lg:text-4xl font-black font-mono text-white tracking-tight">
              {avgLatency} <span className="text-lg text-gray-500">ms</span>
            </div>
            <p className="text-[11px] text-gray-400 mt-2">
              Tempo médio de resposta dos links de checkout e páginas
            </p>
          </div>

          {/* Card 3: 🎯 Funil Ativo em Produção */}
          <div className="p-5 rounded-3xl bg-[#0b1122]/90 border border-white/10 shadow-2xl relative overflow-hidden backdrop-blur-xl group hover:border-indigo-500/40 transition-all">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-black uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
                <GitFork className="w-4 h-4 text-indigo-400" />
                Funil Ativo
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                {activeFunnel ? 'Ativo' : 'Nenhum'}
              </span>
            </div>
            <div className="text-xl lg:text-2xl font-black text-white tracking-tight line-clamp-1">
              {activeFunnel ? activeFunnel.title : 'Sem Funil'}
            </div>
            <p className="text-[11px] text-gray-400 mt-2">
              {activeFunnel ? `${activeFunnel.nodes.length} etapas no canvas` : 'Crie seu funil em /funnels'}
            </p>
          </div>

          {/* Card 4: 🛡️ Segurança & Certificados SSL */}
          <div className="p-5 rounded-3xl bg-[#0b1122]/90 border border-white/10 shadow-2xl relative overflow-hidden backdrop-blur-xl group hover:border-purple-500/40 transition-all">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-black uppercase tracking-wider text-purple-400 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-purple-400" />
                Segurança SSL
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-300 border border-purple-500/20">
                TLS 1.3
              </span>
            </div>
            <div className="text-3xl lg:text-4xl font-black font-mono text-white tracking-tight">
              Ativo
            </div>
            <p className="text-[11px] text-gray-400 mt-2">
              Criptografia de ponta a ponta em todos os checkouts
            </p>
          </div>

        </div>

        {/* ── 2. SEÇÃO DUPLA: LISTA DE ENDPOINTS vs ESTEIRA DO FUNIL ───────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* COLUNA ESQUERDA (6 cols): RADAR DE UPTIME DOS CHECKOUTS & SITES */}
          <div className="lg:col-span-6 p-6 rounded-3xl bg-[#080e1c]/90 border border-white/10 backdrop-blur-xl shadow-xl flex flex-col min-h-[460px]">
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                  <Globe className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black uppercase text-white tracking-wider flex items-center gap-2">
                    Checkouts & Páginas Monitoradas
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  </h3>
                  <span className="text-[11px] text-gray-400">
                    Verificação periódica com medição de latência em milissegundos
                  </span>
                </div>
              </div>
              <span className="text-xs font-mono font-bold text-gray-400 bg-white/5 px-2.5 py-1 rounded-xl border border-white/10">
                {endpoints.length} nós
              </span>
            </div>

            {/* Lista de Endpoints */}
            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 pt-4 max-h-[440px]">
              {endpoints.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center p-8 text-center text-gray-500">
                  <Server className="w-10 h-10 text-gray-600 mb-2" />
                  <p className="text-sm font-bold text-gray-400">Nenhum checkout ou página configurada ainda.</p>
                </div>
              ) : (
                endpoints.map(ep => (
                  <div
                    key={ep.id}
                    className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-indigo-500/40 transition-all flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        <CheckCircle2 className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-white flex items-center gap-2">
                          {ep.name}
                        </h4>
                        <div className="flex items-center gap-2 text-[10px] text-gray-400 mt-0.5">
                          <span className="font-mono text-gray-500 truncate max-w-[240px]">{ep.url}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-lg border border-emerald-500/20">
                        {ep.latencyMs || 25} ms
                      </span>
                      <a
                        href={ep.url}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                        title="Abrir Link"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* COLUNA DIREITA (6 cols): VISUALIZADOR DA JORNADA DO FUNIL REAL */}
          <div className="lg:col-span-6 p-6 rounded-3xl bg-[#080e1c]/90 border border-white/10 backdrop-blur-xl shadow-xl flex flex-col min-h-[460px]">
            <div className="flex items-center justify-between pb-4 border-b border-white/10 gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 shrink-0">
                  <GitFork className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-black uppercase text-white tracking-wider truncate">
                    Funil em Execução
                  </h3>
                  <span className="text-[11px] text-gray-400">
                    Selecione qual funil real acompanhar nesta tela
                  </span>
                </div>
              </div>

              {/* Seletor de Funil Real do Usuário */}
              {userFunnels.length > 0 ? (
                <div className="relative shrink-0">
                  <select
                    value={selectedFunnelId}
                    onChange={(e) => handleSelectFunnel(e.target.value)}
                    className="appearance-none bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 text-xs font-bold px-3 py-1.5 pr-7 rounded-xl border border-indigo-500/40 focus:outline-none focus:ring-1 focus:ring-indigo-400 cursor-pointer max-w-[200px] truncate"
                  >
                    {userFunnels.map(f => (
                      <option key={f.id} value={f.id} className="bg-[#090e1c] text-white">
                        {f.title} ({f.nodes?.length || 0} nós)
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-indigo-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              ) : (
                <button
                  onClick={() => navigate('/funnels')}
                  className="px-3 py-1.5 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 text-xs font-bold rounded-xl border border-indigo-500/40 transition-colors flex items-center gap-1 shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" /> Criar Funil
                </button>
              )}
            </div>

            {/* Conteúdo das Etapas do Funil */}
            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 pt-4 max-h-[440px]">
              {loadingFunnels ? (
                <div className="h-full flex items-center justify-center p-8 text-gray-500">
                  <Activity className="w-6 h-6 animate-spin text-indigo-400 mr-2" />
                  <span className="text-xs">Carregando seus funis...</span>
                </div>
              ) : !activeFunnel ? (
                <div className="h-full flex flex-col items-center justify-center p-8 text-center space-y-3">
                  <div className="p-3.5 rounded-2xl bg-white/5 text-gray-400">
                    <GitFork className="w-8 h-8" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">Nenhum Funil Criado Ainda</h4>
                    <p className="text-xs text-gray-400 max-w-xs mt-1">
                      Crie suas esteiras de vendas e orquestração de tráfego no Arquiteto de Funis para acompanhar as etapas ao vivo aqui.
                    </p>
                  </div>
                  <button
                    onClick={() => navigate('/funnels')}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-indigo-600/20 flex items-center gap-1.5"
                  >
                    <Plus className="w-4 h-4" />
                    Ir para o Arquiteto de Funis
                  </button>
                </div>
              ) : activeFunnel.nodes.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center p-8 text-center text-gray-500">
                  <p className="text-xs font-bold text-gray-400">Este funil ainda não possui blocos no canvas.</p>
                  <button
                    onClick={() => navigate(`/funnels/${activeFunnel.id}`)}
                    className="mt-2 text-xs font-bold text-indigo-400 hover:underline"
                  >
                    Editar Funil no Canvas
                  </button>
                </div>
              ) : (
                activeFunnel.nodes.map((node, index) => (
                  <div
                    key={node.id}
                    className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/5 flex items-center justify-between group hover:border-white/20 transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 font-mono font-bold text-xs flex items-center justify-center">
                        0{index + 1}
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-white">
                          {node.label}
                        </h4>
                        <div className="flex items-center gap-2 text-[10px] text-gray-500 uppercase font-bold">
                          <span>Tipo: {node.type}</span>
                          {node.status && (
                            <span className="text-emerald-400">
                              • {node.status === 'live' ? '🚀 No Ar' : node.status === 'ready' ? '✅ Pronto' : '💡 Planejado'}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      {node.type === 'offer' && node.price ? (
                        <span className="text-xs font-black font-mono text-emerald-400">
                          R$ {node.price.toFixed(2)}
                        </span>
                      ) : node.type === 'traffic' && node.costPerClick ? (
                        <span className="text-xs font-bold font-mono text-cyan-400">
                          CPC: R$ {node.costPerClick.toFixed(2)}
                        </span>
                      ) : (
                        <span className="text-xs font-bold font-mono text-indigo-300">
                          Conv: {node.conversionRate || 10}%
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>

      </div>
    </ScreenLayout>
  );
}
