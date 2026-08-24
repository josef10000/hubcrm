import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, ArrowRight, Save, Play, RefreshCw, Plus, Trash2, Link as LinkIcon, 
  Sparkles, CheckCircle2, AlertTriangle, HelpCircle, Layers, 
  ZoomIn, ZoomOut, Maximize2, Move, ChevronRight, ChevronLeft,
  DollarSign, Users, Eye, ArrowUpRight, ArrowDownRight,
  Pin, Video, Instagram, PlaySquare, Search, MessageCircle,
  Magnet, FileText, CreditCard, Gift, Package, Zap, Repeat,
  Crown, Mail, Send, Check, X, ExternalLink, Sliders, Tv,
  ShoppingBag, Globe
} from 'lucide-react';
import { useAuth } from '@auth/contexts/AuthContext';
import { useCRM } from '@crm/contexts/CRMContext';
import { funnelService } from '@/services/funnelService';
import { 
  FunnelBlueprint, FunnelNode, FunnelConnection, 
  FunnelNodeType, FunnelNodeSubType, FunnelChecklistItem 
} from '@/types';
import { FUNNEL_BLOCK_CATALOG, BlockMeta } from '../constants/funnelTemplates';
import { toast } from 'sonner';

export default function FunnelArchitectEditorView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  const { offers, effectiveOrgId } = useCRM();
  const orgId = userProfile?.orgId || effectiveOrgId;

  // Estado do Funil
  const [funnel, setFunnel] = useState<FunnelBlueprint | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Seleção e UI
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedConnectionId, setSelectedConnectionId] = useState<string | null>(null);
  const [isLibraryOpen, setIsLibraryOpen] = useState(true);
  const [isInspectorOpen, setIsInspectorOpen] = useState(true);
  const [inspectorTab, setInspectorTab] = useState<'config' | 'guide' | 'checklist'>('config');

  // Modo de Conexão de Nós
  const [connectingFromNodeId, setConnectingFromNodeId] = useState<string | null>(null);

  // Zoom e Pan da Tela Infinita
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 150, y: 100 });
  const [isDraggingCanvas, setIsDraggingCanvas] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Arraste de Nó
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const [nodeDragOffset, setNodeDragOffset] = useState({ x: 0, y: 0 });

  // Simulador de Tráfego
  const [initialTrafficInput, setInitialTrafficInput] = useState<number>(3000);
  const [isSimulationActive, setIsSimulationActive] = useState(true);

  const canvasRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (orgId && id) {
      loadFunnel();
    }
  }, [orgId, id]);

  const loadFunnel = async () => {
    if (!orgId || !id) return;
    setLoading(true);
    try {
      const data = await funnelService.getFunnel(orgId, id);
      if (data) {
        setFunnel(data);
        if (data.metrics?.initialTraffic) {
          setInitialTrafficInput(data.metrics.initialTraffic);
        }
      } else {
        toast.error('Funil não encontrado.');
        navigate('/funnels');
      }
    } catch (error) {
      console.error('Erro ao carregar funil:', error);
      toast.error('Erro ao carregar o funil.');
    } finally {
      setLoading(false);
    }
  };

  // Auto-Save Silencioso Debounced
  const autoSave = async () => {
    if (!orgId || !id || !funnel) return;
    try {
      await funnelService.updateFunnel(orgId, id, funnel);
    } catch (err) {
      console.error('Erro no auto-save do funil:', err);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (funnel && !loading) {
        autoSave();
      }
    }, 2000);
    return () => clearTimeout(timer);
  }, [funnel]);

  const handleManualSave = async () => {
    if (!orgId || !id || !funnel) {
      toast.error('Dados incompletos para salvar.');
      return;
    }
    setSaving(true);
    try {
      await funnelService.updateFunnel(orgId, id, funnel);
      toast.success('Funil salvo com sucesso!');
    } catch (error) {
      console.error('Erro ao salvar:', error);
      toast.error('Erro ao salvar alterações.');
    } finally {
      setSaving(false);
    }
  };

  // ── 🖱️ CONTROLES DO CANVAS (ZOOM & PAN) ──────────────────────────────────
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = 1.08;
    let newZoom = e.deltaY < 0 ? zoom * zoomFactor : zoom / zoomFactor;
    newZoom = Math.max(0.3, Math.min(2.2, newZoom));
    setZoom(newZoom);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    // Se clicar com botão do meio ou fundo da tela
    if (e.button === 1 || e.target === canvasRef.current || (e.target as HTMLElement).classList.contains('canvas-background')) {
      setIsDraggingCanvas(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
      setSelectedNodeId(null);
      setSelectedConnectionId(null);
      setConnectingFromNodeId(null);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDraggingCanvas) {
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    } else if (draggingNodeId && funnel) {
      const newX = Math.round(((e.clientX - pan.x) / zoom - nodeDragOffset.x) / 10) * 10;
      const newY = Math.round(((e.clientY - pan.y) / zoom - nodeDragOffset.y) / 10) * 10;

      setFunnel(prev => {
        if (!prev) return null;
        return {
          ...prev,
          nodes: prev.nodes.map(n => n.id === draggingNodeId ? { ...n, x: newX, y: newY } : n)
        };
      });
    }
  };

  const handleMouseUp = () => {
    setIsDraggingCanvas(false);
    setDraggingNodeId(null);
  };

  // ── 🧱 OPERAÇÕES COM NÓS E CONEXÕES ──────────────────────────────────────
  const handleAddBlock = (blockMeta: BlockMeta) => {
    if (!funnel) return;

    // Coloca no centro da visualização atual
    const viewportCenterX = Math.round((-pan.x + window.innerWidth / 2) / zoom);
    const viewportCenterY = Math.round((-pan.y + window.innerHeight / 2) / zoom);

    const newNode: FunnelNode = {
      id: `node-${Date.now()}`,
      type: blockMeta.type,
      subType: blockMeta.subType,
      label: blockMeta.name,
      subtitle: blockMeta.categoryLabel,
      x: viewportCenterX - 100 + (Math.random() * 40 - 20),
      y: viewportCenterY - 60 + (Math.random() * 40 - 20),
      conversionRate: blockMeta.defaultConversion,
      price: blockMeta.defaultPrice || (blockMeta.type === 'offer' ? 47 : undefined),
      costPerClick: blockMeta.defaultCostPerClick,
      status: 'idea',
      checklist: blockMeta.strategicGuide.actionItems.map((item, idx) => ({
        id: `chk-${idx}-${Date.now()}`,
        text: item,
        done: false
      }))
    };

    setFunnel(prev => {
      if (!prev) return null;
      return {
        ...prev,
        nodes: [...prev.nodes, newNode]
      };
    });

    setSelectedNodeId(newNode.id);
    setIsInspectorOpen(true);
    toast.success(`Bloco "${blockMeta.name}" adicionado!`);
  };

  const handleDeleteSelectedNode = () => {
    if (!selectedNodeId || !funnel) return;
    setFunnel(prev => {
      if (!prev) return null;
      return {
        ...prev,
        nodes: prev.nodes.filter(n => n.id !== selectedNodeId),
        connections: prev.connections.filter(c => c.fromNodeId !== selectedNodeId && c.toNodeId !== selectedNodeId)
      };
    });
    setSelectedNodeId(null);
    toast.success('Bloco removido!');
  };

  const handleDeleteSelectedConnection = () => {
    if (!selectedConnectionId || !funnel) return;
    setFunnel(prev => {
      if (!prev) return null;
      return {
        ...prev,
        connections: prev.connections.filter(c => c.id !== selectedConnectionId)
      };
    });
    setSelectedConnectionId(null);
    toast.success('Conexão removida!');
  };

  const handleStartConnection = (e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation();
    if (!connectingFromNodeId) {
      setConnectingFromNodeId(nodeId);
      toast.info('Clique no bloco de destino para conectar.');
    } else if (connectingFromNodeId === nodeId) {
      setConnectingFromNodeId(null);
    } else {
      // Cria a conexão
      const exists = funnel?.connections.some(
        c => c.fromNodeId === connectingFromNodeId && c.toNodeId === nodeId
      );
      if (!exists && funnel) {
        const newConn: FunnelConnection = {
          id: `conn-${Date.now()}`,
          fromNodeId: connectingFromNodeId,
          toNodeId: nodeId,
          style: 'solid'
        };
        setFunnel(prev => prev ? { ...prev, connections: [...prev.connections, newConn] } : null);
        toast.success('Blocos conectados!');
      }
      setConnectingFromNodeId(null);
    }
  };

  const handleNodeMouseDown = (e: React.MouseEvent, node: FunnelNode) => {
    e.stopPropagation();
    if (connectingFromNodeId && connectingFromNodeId !== node.id) {
      handleStartConnection(e, node.id);
      return;
    }
    setSelectedNodeId(node.id);
    setSelectedConnectionId(null);
    setDraggingNodeId(node.id);
    setNodeDragOffset({
      x: (e.clientX - pan.x) / zoom - node.x,
      y: (e.clientY - pan.y) / zoom - node.y
    });
  };

  const updateSelectedNode = (field: keyof FunnelNode, value: any) => {
    if (!selectedNodeId || !funnel) return;
    setFunnel(prev => {
      if (!prev) return null;
      return {
        ...prev,
        nodes: prev.nodes.map(n => n.id === selectedNodeId ? { ...n, [field]: value } : n)
      };
    });
  };

  const selectedNode = useMemo(() => {
    return funnel?.nodes.find(n => n.id === selectedNodeId) || null;
  }, [funnel?.nodes, selectedNodeId]);

  const selectedNodeMeta = useMemo(() => {
    if (!selectedNode) return null;
    return FUNNEL_BLOCK_CATALOG.find(b => b.subType === selectedNode.subType) || null;
  }, [selectedNode]);

  // ── 📊 SIMULADOR DE TRÁFEGO & MÉTRICAS ────────────────────────────────────
  const simulationResults = useMemo(() => {
    if (!funnel) return { totalRevenue: 0, estimatedCost: 0, netProfit: 0, roas: 0, bottleneckIds: [] as string[] };

    let totalRevenue = 0;
    let estimatedCost = 0;
    const bottleneckIds: string[] = [];

    // Calcula tráfego que chega em cada nó
    const trafficMap: Record<string, number> = {};

    // 1. Identifica nós de tráfego de entrada
    const trafficNodes = funnel.nodes.filter(n => n.type === 'traffic');
    const initialPerSource = trafficNodes.length > 0 ? initialTrafficInput / trafficNodes.length : initialTrafficInput;

    trafficNodes.forEach(tNode => {
      trafficMap[tNode.id] = initialPerSource;
      if (tNode.costPerClick && tNode.costPerClick > 0) {
        estimatedCost += initialPerSource * tNode.costPerClick;
      }
    });

    // 2. Propaga pelas conexões ordenadamente
    funnel.connections.forEach(conn => {
      const fromTraffic = trafficMap[conn.fromNodeId] || 0;
      const fromNode = funnel.nodes.find(n => n.id === conn.fromNodeId);
      const toNode = funnel.nodes.find(n => n.id === conn.toNodeId);

      if (fromNode && toNode) {
        const convRate = (fromNode.conversionRate || 100) / 100;
        const convertedVisitors = fromTraffic * convRate;
        trafficMap[toNode.id] = (trafficMap[toNode.id] || 0) + convertedVisitors;

        // Se for produto/oferta, calcula receita (ou comissão de afiliado)
        if (toNode.type === 'offer' && toNode.price) {
          const offerVisitors = trafficMap[toNode.id];
          const offerConv = (toNode.conversionRate || 100) / 100;
          if (toNode.subType.startsWith('affiliate_')) {
            const commRate = (toNode.commissionRate || 10) / 100;
            totalRevenue += offerVisitors * offerConv * (toNode.price * commRate);
          } else {
            totalRevenue += offerVisitors * offerConv * toNode.price;
          }
        }

        // Gargalo: conversão muito baixa em página/checkout
        if ((fromNode.type === 'page' || fromNode.type === 'offer') && (fromNode.conversionRate || 0) < 3.0) {
          if (!bottleneckIds.includes(fromNode.id)) {
            bottleneckIds.push(fromNode.id);
          }
        }
      }
    });

    // Se nenhuma conexão foi feita mas tem ofertas, calcula direto
    if (funnel.connections.length === 0) {
      funnel.nodes.forEach(n => {
        if (n.type === 'offer' && n.price) {
          const buyers = initialTrafficInput * ((n.conversionRate || 3) / 100);
          totalRevenue += buyers * n.price;
        }
      });
    }

    const netProfit = totalRevenue - estimatedCost;
    const roas = estimatedCost > 0 ? totalRevenue / estimatedCost : totalRevenue > 0 ? 99 : 0;

    return {
      totalRevenue,
      estimatedCost,
      netProfit,
      roas,
      bottleneckIds,
      trafficMap
    };
  }, [funnel, initialTrafficInput]);

  // Renderizar Ícone Dinâmico
  const renderNodeIcon = (iconName: string, size = 18) => {
    const icons: Record<string, any> = {
      Pin, Video, Instagram, PlaySquare, Search, MessageCircle,
      Magnet, FileText, CreditCard, Gift, Package, Zap, Repeat,
      Crown, Mail, Send, RefreshCw, Play, Tv, HelpCircle, Sparkles, CheckCircle2,
      ShoppingBag, Globe
    };
    const IconComp = icons[iconName] || Layers;
    return <IconComp size={size} />;
  };

  if (loading || !funnel) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-[#050914] text-white">
        <div className="animate-spin w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full mb-4"></div>
        <p className="text-sm text-gray-400">Carregando quadro infinito...</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-[#050914] overflow-hidden select-none relative font-sans">
      
      {/* ── TOPBAR SUPERIOR (CONTROLES GERAIS & SIMULADOR) ────────────────────────── */}
      <div className="h-16 bg-[#090e1c]/90 border-b border-white/10 px-4 flex items-center justify-between z-30 backdrop-blur-xl shrink-0">
        
        {/* Lado Esquerdo: Voltar, Título e Categoria */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/funnels')}
            className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
            title="Voltar para a lista"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div>
            <input
              type="text"
              value={funnel.title}
              onChange={(e) => setFunnel(prev => prev ? { ...prev, title: e.target.value } : null)}
              className="text-base lg:text-lg font-black text-white bg-transparent border-none focus:outline-none focus:ring-1 focus:ring-indigo-500 rounded px-1 -ml-1 w-60 sm:w-80"
              placeholder="Nome do Funil..."
            />
            <div className="flex items-center gap-2 text-[10px] text-gray-400">
              <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-bold uppercase border border-indigo-500/30">
                {funnel.category}
              </span>
              <span>• {funnel.nodes.length} blocos</span>
              <span>• {funnel.connections.length} conexões</span>
            </div>
          </div>
        </div>

        {/* Centro: Painel do Simulador de Tráfego */}
        <div className="hidden md:flex items-center gap-4 bg-black/60 border border-white/10 px-4 py-1.5 rounded-2xl shadow-inner">
          <div className="flex items-center gap-2 text-xs text-gray-400 border-r border-white/10 pr-3">
            <Users className="w-4 h-4 text-cyan-400" />
            <span className="font-bold text-gray-300">Tráfego:</span>
            <input
              type="number"
              value={initialTrafficInput}
              onChange={(e) => setInitialTrafficInput(Math.max(0, parseInt(e.target.value) || 0))}
              className="w-20 bg-white/5 border border-white/10 rounded-lg px-2 py-0.5 text-xs text-white font-bold text-center focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div className="flex items-center gap-4 text-xs">
            <div>
              <span className="text-[10px] text-gray-500 block uppercase font-bold">Faturamento Projetado</span>
              <span className="text-sm font-black text-emerald-400">
                R$ {simulationResults.totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            {simulationResults.estimatedCost > 0 && (
              <div>
                <span className="text-[10px] text-gray-500 block uppercase font-bold">ROAS Estimado</span>
                <span className="text-sm font-black text-amber-400">
                  {simulationResults.roas.toFixed(1)}x
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Lado Direito: Ações */}
        <div className="flex items-center gap-2">
          {/* Botão de Excluir Selecionado */}
          {selectedNodeId && (
            <button
              onClick={handleDeleteSelectedNode}
              className="p-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
              title="Excluir Bloco Selecionado"
            >
              <Trash2 className="w-4 h-4" />
              <span className="hidden lg:inline">Excluir Bloco</span>
            </button>
          )}

          {selectedConnectionId && (
            <button
              onClick={handleDeleteSelectedConnection}
              className="p-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
              title="Remover Conexão Selecionada"
            >
              <Trash2 className="w-4 h-4" />
              <span className="hidden lg:inline">Remover Linha</span>
            </button>
          )}

          <button
            onClick={handleManualSave}
            disabled={saving}
            className="px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-500/20 flex items-center gap-2 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Salvando...' : 'Salvar Funil'}</span>
          </button>
        </div>

      </div>

      {/* ── CORPO PRINCIPAL DO EDITOR ────────────────────────────────────────────── */}
      <div className="flex-1 flex overflow-hidden relative">

        {/* ── GAVETA ESQUERDA: BIBLIOTECA DE BLOCOS ───────────────────────────── */}
        <div 
          className={`absolute left-0 top-0 bottom-0 z-20 w-72 bg-[#090e1c]/95 border-r border-white/10 backdrop-blur-2xl flex flex-col transition-transform duration-300 ${
            isLibraryOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <div className="p-4 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
            <h3 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-400" />
              Biblioteca de Blocos
            </h3>
            <button
              onClick={() => setIsLibraryOpen(false)}
              className="p-1 text-gray-400 hover:text-white rounded-lg hover:bg-white/10"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-6">
            
            {/* Categorias de Blocos */}
            {[
              { id: 'traffic', title: '🌐 Linhas de Tráfego', subTypes: ['pinterest', 'tiktok', 'instagram', 'youtube', 'google_seo', 'whatsapp'] },
              { id: 'page', title: '📄 Páginas & Etapas', subTypes: ['blog_site', 'quiz_page', 'quiz_vsl_page', 'capture_page', 'vsl_page', 'sales_page', 'static_page', 'webinar_page', 'checkout', 'thank_you_page'] },
              { id: 'offer', title: '💰 Monetização & Ofertas Próprias', subTypes: ['lead_magnet', 'front_end', 'order_bump', 'upsell', 'downsell', 'subscription', 'high_ticket'] },
              { id: 'affiliate', title: '🛒 Afiliação & Lojas Parceiras', subTypes: ['affiliate_amazon', 'affiliate_shopee', 'affiliate_mercadolivre', 'affiliate_product'] },
              { id: 'automation', title: '🤖 Automações & Régua', subTypes: ['email_seq', 'whatsapp_auto', 'remarketing'] }
            ].map(category => (
              <div key={category.id} className="space-y-2">
                <span className="text-[11px] font-black text-gray-400 uppercase tracking-wider block px-1">
                  {category.title}
                </span>

                <div className="space-y-1.5">
                  {category.subTypes.map(st => {
                    const meta = FUNNEL_BLOCK_CATALOG.find(b => b.subType === st);
                    if (!meta) return null;

                    return (
                      <button
                        key={st}
                        onClick={() => handleAddBlock(meta)}
                        className="w-full text-left p-2.5 rounded-xl bg-white/[0.02] hover:bg-white/[0.07] border border-white/5 hover:border-indigo-500/40 transition-all flex items-center justify-between group"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className={`p-2 rounded-lg border ${meta.badgeColor}`}>
                            {renderNodeIcon(meta.iconName, 16)}
                          </div>
                          <div>
                            <h4 className="text-xs font-bold text-white group-hover:text-indigo-300 transition-colors">
                              {meta.name}
                            </h4>
                            <span className="text-[10px] text-gray-500">
                              {meta.type === 'offer' && meta.defaultPrice ? `R$ ${meta.defaultPrice.toFixed(2)}` : meta.categoryLabel}
                            </span>
                          </div>
                        </div>
                        <Plus className="w-3.5 h-3.5 text-gray-500 group-hover:text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}

          </div>
        </div>

        {/* Botão para reabrir gaveta esquerda caso fechada */}
        {!isLibraryOpen && (
          <button
            onClick={() => setIsLibraryOpen(true)}
            className="absolute left-4 top-4 z-20 p-2.5 bg-[#090e1c]/90 border border-white/10 hover:border-indigo-500/50 rounded-2xl text-white shadow-xl backdrop-blur-xl transition-all"
            title="Abrir Biblioteca de Blocos"
          >
            <Layers className="w-5 h-5 text-indigo-400" />
          </button>
        )}

        {/* ── QUADRO INFINITO (CANVAS PRINCIPAL COM PAN/ZOOM) ────────────────── */}
        <div
          ref={canvasRef}
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          className="flex-1 w-full h-full relative overflow-hidden canvas-background cursor-grab active:cursor-grabbing bg-[#050914]"
          style={{
            backgroundImage: `radial-gradient(circle, rgba(255, 255, 255, 0.07) 1px, transparent 1px)`,
            backgroundSize: `${30 * zoom}px ${30 * zoom}px`,
            backgroundPosition: `${pan.x}px ${pan.y}px`
          }}
        >
          {/* Container Transformado */}
          <div
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transformOrigin: '0 0'
            }}
            className="absolute inset-0 pointer-events-none w-[5000px] h-[5000px]"
          >
            {/* SVG DE CONEXÕES / SETAS DINÂMICAS */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none z-0 overflow-visible">
              <defs>
                <marker
                  id="arrow-solid"
                  viewBox="0 0 10 10"
                  refX="8"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 1 L 10 5 L 0 9 z" fill="#6366f1" />
                </marker>
                <marker
                  id="arrow-animated"
                  viewBox="0 0 10 10"
                  refX="8"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 1 L 10 5 L 0 9 z" fill="#10b981" />
                </marker>
              </defs>

              {funnel.connections.map(conn => {
                const fromNode = funnel.nodes.find(n => n.id === conn.fromNodeId);
                const toNode = funnel.nodes.find(n => n.id === conn.toNodeId);
                if (!fromNode || !toNode) return null;

                const startX = fromNode.x + 220; // Largura do card
                const startY = fromNode.y + 45;  // Meio vertical
                const endX = toNode.x;
                const endY = toNode.y + 45;

                const deltaX = Math.abs(endX - startX) * 0.5;
                const pathData = `M ${startX} ${startY} C ${startX + deltaX} ${startY}, ${endX - deltaX} ${endY}, ${endX} ${endY}`;
                const isSelected = selectedConnectionId === conn.id;

                return (
                  <g key={conn.id} className="pointer-events-auto cursor-pointer">
                    {/* Linha invisível mais grossa para facilitar o clique */}
                    <path
                      d={pathData}
                      fill="none"
                      stroke="transparent"
                      strokeWidth="20"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedConnectionId(conn.id);
                        setSelectedNodeId(null);
                      }}
                    />
                    {/* Linha visível */}
                    <path
                      d={pathData}
                      fill="none"
                      stroke={isSelected ? '#f43f5e' : conn.style === 'animated' ? '#10b981' : '#6366f1'}
                      strokeWidth={isSelected ? '3.5' : '2.5'}
                      strokeDasharray={conn.style === 'dashed' ? '6,6' : conn.style === 'animated' ? '8,4' : 'none'}
                      className={conn.style === 'animated' ? 'animate-pulse' : ''}
                      markerEnd={conn.style === 'animated' ? 'url(#arrow-animated)' : 'url(#arrow-solid)'}
                    />
                  </g>
                );
              })}
            </svg>

            {/* RENDERIZAÇÃO DOS NÓS (CARDS) */}
            {funnel.nodes.map(node => {
              const meta = FUNNEL_BLOCK_CATALOG.find(b => b.subType === node.subType);
              const isSelected = selectedNodeId === node.id;
              const isConnectingSource = connectingFromNodeId === node.id;
              const isBottleneck = simulationResults.bottleneckIds.includes(node.id);
              const calculatedTraffic = simulationResults.trafficMap?.[node.id] || 0;

              return (
                <div
                  key={node.id}
                  onMouseDown={(e) => handleNodeMouseDown(e, node)}
                  style={{
                    left: `${node.x}px`,
                    top: `${node.y}px`
                  }}
                  className={`absolute w-56 rounded-2xl pointer-events-auto cursor-pointer transition-shadow select-none backdrop-blur-2xl border ${
                    isSelected
                      ? 'border-indigo-400 shadow-2xl shadow-indigo-500/30 ring-2 ring-indigo-500/40 bg-[#0c1427]'
                      : isConnectingSource
                      ? 'border-amber-400 shadow-2xl shadow-amber-500/30 ring-2 ring-amber-500/40 bg-[#0c1427]'
                      : 'border-white/10 hover:border-white/25 bg-[#090e1c]/90 shadow-xl'
                  }`}
                >
                  {/* Badge de Gargalo */}
                  {isBottleneck && (
                    <div className="absolute -top-3 -right-2 px-2 py-0.5 rounded-full bg-rose-600 text-white text-[9px] font-black uppercase tracking-wider flex items-center gap-1 shadow-lg shadow-rose-600/50 animate-bounce">
                      <AlertTriangle className="w-3 h-3" />
                      Gargalo
                    </div>
                  )}

                  {/* Cabeçalho do Card */}
                  <div className="p-3 border-b border-white/10 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`p-1.5 rounded-lg border ${meta?.badgeColor || 'bg-white/5 text-white'}`}>
                        {renderNodeIcon(meta?.iconName || 'Layers', 14)}
                      </div>
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                        {node.type}
                      </span>
                    </div>

                    {/* Conector de Saída (Botão de Puxar Seta) */}
                    <button
                      onClick={(e) => handleStartConnection(e, node.id)}
                      className={`p-1 rounded-md text-[10px] font-bold transition-colors ${
                        isConnectingSource 
                          ? 'bg-amber-500 text-black' 
                          : 'bg-white/5 hover:bg-indigo-600 text-gray-300 hover:text-white'
                      }`}
                      title="Conectar a outro bloco"
                    >
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>

                  {/* Conteúdo do Card */}
                  <div className="p-3 space-y-2">
                    <h4 className="text-xs font-bold text-white line-clamp-1">
                      {node.label}
                    </h4>

                    {/* Preço ou Conversão */}
                    <div className="flex items-center justify-between text-[11px] pt-1 border-t border-white/5">
                      {node.type === 'offer' && node.price !== undefined ? (
                        <span className="font-black text-emerald-400">
                          {node.subType.startsWith('affiliate_') && node.commissionRate
                            ? `R$ ${node.price.toFixed(2)} (${node.commissionRate}%)`
                            : `R$ ${node.price.toFixed(2)}`}
                        </span>
                      ) : node.type === 'traffic' && node.costPerClick ? (
                        <span className="font-bold text-cyan-400">
                          CPC: R$ {node.costPerClick.toFixed(2)}
                        </span>
                      ) : (
                        <span className="text-gray-400 font-medium">
                          Conv: <strong className="text-indigo-300">{node.conversionRate || 0}%</strong>
                        </span>
                      )}

                      {/* Tráfego Calculado */}
                      {calculatedTraffic > 0 && (
                        <span className="text-[10px] font-bold text-gray-400 bg-white/5 px-1.5 py-0.5 rounded">
                          ~{Math.round(calculatedTraffic)} leads
                        </span>
                      )}
                    </div>

                    {/* Progresso do Checklist */}
                    {node.checklist && node.checklist.length > 0 && (
                      <div className="w-full bg-white/5 h-1 rounded-full overflow-hidden">
                        <div 
                          className="bg-indigo-500 h-full transition-all"
                          style={{
                            width: `${(node.checklist.filter(c => c.done).length / node.checklist.length) * 100}%`
                          }}
                        ></div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Mini Controles de Zoom no Canto Inferior Direito */}
          <div className="absolute right-6 bottom-6 z-20 flex items-center gap-1.5 bg-[#090e1c]/90 border border-white/10 p-1.5 rounded-2xl shadow-2xl backdrop-blur-xl">
            <button
              onClick={() => setZoom(prev => Math.min(2.2, prev + 0.15))}
              className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
              title="Zoom In"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <span className="text-xs font-bold text-gray-400 px-1 min-w-10 text-center">
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={() => setZoom(prev => Math.max(0.3, prev - 0.15))}
              className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
              title="Zoom Out"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <div className="w-px h-4 bg-white/10 my-auto"></div>
            <button
              onClick={() => { setZoom(1); setPan({ x: 150, y: 100 }); }}
              className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
              title="Resetar Visualização"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
          </div>

        </div>

        {/* ── GAVETA DIREITA: INSPETOR DE PROPRIEDADES & GUIA TÁTICO ─────────── */}
        {selectedNode && (
          <div 
            className={`absolute right-0 top-0 bottom-0 z-20 w-80 lg:w-96 bg-[#090e1c]/95 border-l border-white/10 backdrop-blur-2xl flex flex-col transition-transform duration-300 ${
              isInspectorOpen ? 'translate-x-0' : 'translate-x-full'
            }`}
          >
            {/* Cabeçalho do Inspetor */}
            <div className="p-4 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
              <div className="flex items-center gap-2">
                <div className={`p-1.5 rounded-lg border ${selectedNodeMeta?.badgeColor || 'bg-white/5 text-white'}`}>
                  {renderNodeIcon(selectedNodeMeta?.iconName || 'Layers', 16)}
                </div>
                <div>
                  <h3 className="text-xs font-black text-white uppercase tracking-wider">
                    Configuração da Etapa
                  </h3>
                  <span className="text-[10px] text-gray-400">{selectedNode.type}</span>
                </div>
              </div>
              <button
                onClick={() => setIsInspectorOpen(false)}
                className="p-1 text-gray-400 hover:text-white rounded-lg hover:bg-white/10"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Abas do Inspetor */}
            <div className="flex border-b border-white/10 bg-black/40 text-xs">
              <button
                onClick={() => setInspectorTab('config')}
                className={`flex-1 py-2.5 font-bold transition-colors ${
                  inspectorTab === 'config' ? 'text-indigo-400 border-b-2 border-indigo-500 bg-white/[0.02]' : 'text-gray-400 hover:text-white'
                }`}
              >
                Parâmetros
              </button>
              <button
                onClick={() => setInspectorTab('checklist')}
                className={`flex-1 py-2.5 font-bold transition-colors ${
                  inspectorTab === 'checklist' ? 'text-indigo-400 border-b-2 border-indigo-500 bg-white/[0.02]' : 'text-gray-400 hover:text-white'
                }`}
              >
                Tarefas ({selectedNode.checklist?.filter(c => c.done).length || 0}/{selectedNode.checklist?.length || 0})
              </button>
              <button
                onClick={() => setInspectorTab('guide')}
                className={`flex-1 py-2.5 font-bold transition-colors ${
                  inspectorTab === 'guide' ? 'text-amber-400 border-b-2 border-amber-500 bg-white/[0.02]' : 'text-gray-400 hover:text-white'
                }`}
              >
                🧠 Guia Tático
              </button>
            </div>

            {/* Conteúdo das Abas */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-5">
              
              {inspectorTab === 'config' && (
                <>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-gray-400 uppercase">Nome da Etapa</label>
                    <input
                      type="text"
                      value={selectedNode.label}
                      onChange={(e) => updateSelectedNode('label', e.target.value)}
                      className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  {/* Se for Produto de Afiliado */}
                  {selectedNode.subType.startsWith('affiliate_') && (
                    <div className="space-y-3 p-3.5 rounded-2xl bg-amber-500/5 border border-amber-500/20">
                      <div className="flex items-center gap-2 text-amber-400">
                        <ShoppingBag className="w-4 h-4" />
                        <span className="text-xs font-bold uppercase">Configuração de Afiliado</span>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-400 uppercase">Seu Link de Afiliado</label>
                        <div className="flex gap-2">
                          <input
                            type="url"
                            placeholder="https://shopee.com.br/... ou https://amzn.to/..."
                            value={selectedNode.affiliateLink || ''}
                            onChange={(e) => updateSelectedNode('affiliateLink', e.target.value)}
                            className="flex-1 px-3 py-1.5 bg-black/60 border border-white/10 rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-amber-500"
                          />
                          {selectedNode.affiliateLink && (
                            <a
                              href={selectedNode.affiliateLink}
                              target="_blank"
                              rel="noreferrer"
                              className="p-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-xl text-xs font-bold transition-colors flex items-center justify-center"
                              title="Testar Link"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          )}
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-400 uppercase">Comissão Estimada (%)</label>
                        <input
                          type="number"
                          placeholder="Ex: 10 ou 50"
                          value={selectedNode.commissionRate || ''}
                          onChange={(e) => updateSelectedNode('commissionRate', parseFloat(e.target.value) || 0)}
                          className="w-full px-3 py-1.5 bg-black/60 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                        />
                      </div>
                    </div>
                  )}

                  {/* Vínculo com Oferta Real do CRM (Apenas para ofertas próprias) */}
                  {selectedNode.type === 'offer' && !selectedNode.subType.startsWith('affiliate_') && (
                    <div className="space-y-2 p-3 rounded-2xl bg-emerald-500/5 border border-emerald-500/20">
                      <div className="flex justify-between items-center">
                        <label className="text-[11px] font-bold text-emerald-400 uppercase flex items-center gap-1.5">
                          <DollarSign className="w-3.5 h-3.5" />
                          Vincular Oferta do CRM (Opcional)
                        </label>
                        <span className="text-[9px] text-gray-500 font-medium">Livre ou Vinculado</span>
                      </div>

                      <select
                        value={selectedNode.offerId || ''}
                        onChange={(e) => {
                          const chosenOffer = offers.find(o => o.id === e.target.value);
                          if (chosenOffer) {
                            updateSelectedNode('offerId', chosenOffer.id);
                            updateSelectedNode('price', chosenOffer.price);
                            updateSelectedNode('label', chosenOffer.name);
                          } else {
                            updateSelectedNode('offerId', undefined);
                          }
                        }}
                        className="w-full px-3 py-2 bg-black/60 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                      >
                        <option value="">Produto livre (digitar dados manualmente abaixo)</option>
                        {offers.map(o => (
                          <option key={o.id} value={o.id}>
                            📦 {o.name} (R$ {o.price?.toFixed(2)})
                          </option>
                        ))}
                      </select>

                      <p className="text-[10px] text-gray-400 leading-tight">
                        💡 Você pode digitar o preço livremente abaixo sem precisar criar o produto antes no CRM.
                      </p>

                      {selectedNode.offerId && (
                        <a
                          href={`${window.location.origin}/checkout/${orgId}?offerId=${selectedNode.offerId}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[10px] font-bold text-emerald-400 hover:underline flex items-center gap-1 pt-1"
                        >
                          <ExternalLink className="w-3 h-3" />
                          Abrir Link do Checkout Transparente
                        </a>
                      )}
                    </div>
                  )}

                  {/* URL Externa / Link da Página */}
                  {(selectedNode.type === 'page' || selectedNode.type === 'traffic') && (
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-gray-400 uppercase">Link / URL da Página</label>
                      <div className="flex gap-2">
                        <input
                          type="url"
                          placeholder="https://seusite.com.br/artigo-ou-pagina"
                          value={selectedNode.url || ''}
                          onChange={(e) => updateSelectedNode('url', e.target.value)}
                          className="flex-1 px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
                        />
                        {selectedNode.url && (
                          <a
                            href={selectedNode.url}
                            target="_blank"
                            rel="noreferrer"
                            className="p-2 bg-white/5 hover:bg-white/10 text-gray-300 rounded-xl flex items-center justify-center"
                            title="Abrir URL"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Preço ou CPC */}
                  {selectedNode.type === 'offer' && (
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-gray-400 uppercase">
                        {selectedNode.subType.startsWith('affiliate_') ? 'Preço do Produto no Parceiro (R$)' : 'Preço do Produto (R$)'}
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={selectedNode.price || 0}
                        onChange={(e) => updateSelectedNode('price', parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  )}

                  {selectedNode.type === 'traffic' && (
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-gray-400 uppercase">Custo Médio por Clique - CPC (R$)</label>
                      <input
                        type="number"
                        step="0.10"
                        value={selectedNode.costPerClick || 0}
                        onChange={(e) => updateSelectedNode('costPerClick', parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  )}

                  {/* Taxa de Conversão Esperada */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center">
                      <label className="text-[11px] font-bold text-gray-400 uppercase">Taxa de Conversão Esperada</label>
                      <span className="text-xs font-bold text-indigo-400">{selectedNode.conversionRate || 0}%</span>
                    </div>
                    <input
                      type="range"
                      min="0.5"
                      max="100"
                      step="0.5"
                      value={selectedNode.conversionRate || 0}
                      onChange={(e) => updateSelectedNode('conversionRate', parseFloat(e.target.value))}
                      className="w-full accent-indigo-500 cursor-pointer"
                    />
                  </div>

                  {/* Status da Etapa */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-gray-400 uppercase">Status de Execução</label>
                    <select
                      value={selectedNode.status || 'idea'}
                      onChange={(e) => updateSelectedNode('status', e.target.value)}
                      className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                    >
                      <option value="idea">💡 Ideia / Planejamento</option>
                      <option value="in_progress">🚧 Em Construção / Gravando</option>
                      <option value="ready">✅ Pronto para Testar</option>
                      <option value="live">🚀 No Ar / Rodando</option>
                    </select>
                  </div>

                  {/* Notas & Links */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-gray-400 uppercase">Notas & Rascunho</label>
                    <textarea
                      rows={4}
                      value={selectedNode.notes || ''}
                      onChange={(e) => updateSelectedNode('notes', e.target.value)}
                      placeholder="Adicione referências, copies ou anotações desta etapa..."
                      className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 resize-none"
                    />
                  </div>
                </>
              )}

              {inspectorTab === 'checklist' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-400 uppercase">Lista de Tarefas</span>
                    <button
                      onClick={() => {
                        const text = prompt('Digite a nova tarefa:');
                        if (text && text.trim()) {
                          const updated = [...(selectedNode.checklist || []), { id: `chk-${Date.now()}`, text: text.trim(), done: false }];
                          updateSelectedNode('checklist', updated);
                        }
                      }}
                      className="text-[10px] font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" /> Adicionar
                    </button>
                  </div>

                  <div className="space-y-2">
                    {(selectedNode.checklist || []).map((item) => (
                      <div
                        key={item.id}
                        onClick={() => {
                          const updated = (selectedNode.checklist || []).map(c => c.id === item.id ? { ...c, done: !c.done } : c);
                          updateSelectedNode('checklist', updated);
                        }}
                        className={`p-2.5 rounded-xl border cursor-pointer transition-all flex items-start gap-2.5 ${
                          item.done 
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300 line-through' 
                            : 'bg-white/[0.02] border-white/10 text-gray-300 hover:bg-white/[0.05]'
                        }`}
                      >
                        <div className={`w-4 h-4 rounded mt-0.5 flex items-center justify-center border ${item.done ? 'bg-emerald-500 border-emerald-400 text-black' : 'border-white/20'}`}>
                          {item.done && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                        <span className="text-xs font-medium leading-tight flex-1">{item.text}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {inspectorTab === 'guide' && selectedNodeMeta && (
                <div className="space-y-4">
                  <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-2xl">
                    <h4 className="text-xs font-bold text-amber-300 mb-1 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" />
                      {selectedNodeMeta.strategicGuide.title}
                    </h4>
                    <p className="text-xs text-gray-300 leading-relaxed">
                      {selectedNodeMeta.strategicGuide.description}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <span className="text-[11px] font-black text-gray-400 uppercase block">Regras de Ouro</span>
                    <ul className="space-y-2 text-xs text-gray-300">
                      {selectedNodeMeta.strategicGuide.goldenRules.map((rule, i) => (
                        <li key={i} className="flex items-start gap-2 p-2 bg-white/[0.02] rounded-xl border border-white/5">
                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-1.5 shrink-0"></span>
                          <span>{rule}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

            </div>
          </div>
        )}

      </div>
    </div>
  );
}
