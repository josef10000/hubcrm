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
  ShoppingBag, Globe, Pencil,
  Calendar, PhoneCall, Briefcase, FileSignature, Receipt, Rocket, LifeBuoy,
  Star, RefreshCcw, Clock, GitBranch, Smartphone, Mic, UserCheck, GraduationCap, Inbox,
  Target, StickyNote, BoxSelect
} from 'lucide-react';
import { useAuth } from '@auth/contexts/AuthContext';
import { useCRM } from '@crm/contexts/CRMContext';
import { useICPs } from '../hooks/useICPs';
import { funnelService } from '@/services/funnelService';
import { 
  FunnelBlueprint, FunnelNode, FunnelConnection, FunnelFrame,
  FunnelNodeType, FunnelNodeSubType, FunnelChecklistItem 
} from '@/types';
import { FUNNEL_BLOCK_CATALOG, BlockMeta } from '../constants/funnelTemplates';
import { toast } from 'sonner';

// ── 🎨 TEMAS VISUAIS DE MOLDURAS & POST-ITS ──────────────────────────────────
const FRAME_COLORS: Record<string, { border: string; bg: string; text: string; header: string; activeDot: string; label: string }> = {
  indigo: {
    border: 'border-indigo-500/40',
    bg: 'bg-indigo-950/20',
    text: 'text-indigo-300',
    header: 'bg-indigo-900/40 border-indigo-500/30',
    activeDot: 'bg-indigo-500',
    label: 'Índigo'
  },
  emerald: {
    border: 'border-emerald-500/40',
    bg: 'bg-emerald-950/20',
    text: 'text-emerald-300',
    header: 'bg-emerald-900/40 border-emerald-500/30',
    activeDot: 'bg-emerald-500',
    label: 'Esmeralda'
  },
  amber: {
    border: 'border-amber-500/40',
    bg: 'bg-amber-950/20',
    text: 'text-amber-300',
    header: 'bg-amber-900/40 border-amber-500/30',
    activeDot: 'bg-amber-500',
    label: 'Âmbar'
  },
  rose: {
    border: 'border-rose-500/40',
    bg: 'bg-rose-950/20',
    text: 'text-rose-300',
    header: 'bg-rose-900/40 border-rose-500/30',
    activeDot: 'bg-rose-500',
    label: 'Rosa'
  },
  cyan: {
    border: 'border-cyan-500/40',
    bg: 'bg-cyan-950/20',
    text: 'text-cyan-300',
    header: 'bg-cyan-900/40 border-cyan-500/30',
    activeDot: 'bg-cyan-500',
    label: 'Ciano'
  },
  purple: {
    border: 'border-purple-500/40',
    bg: 'bg-purple-950/20',
    text: 'text-purple-300',
    header: 'bg-purple-900/40 border-purple-500/30',
    activeDot: 'bg-purple-500',
    label: 'Roxo'
  },
  slate: {
    border: 'border-slate-500/40',
    bg: 'bg-slate-900/40',
    text: 'text-slate-300',
    header: 'bg-slate-800/50 border-slate-500/30',
    activeDot: 'bg-slate-400',
    label: 'Slate'
  }
};

const STICKY_COLORS: Record<string, { bg: string; text: string; border: string; dot: string; title: string }> = {
  yellow: {
    bg: 'bg-amber-200/95 text-amber-950',
    text: 'text-amber-950',
    border: 'border-amber-400',
    dot: 'bg-amber-400',
    title: 'Amarelo'
  },
  blue: {
    bg: 'bg-sky-200/95 text-sky-950',
    text: 'text-sky-950',
    border: 'border-sky-400',
    dot: 'bg-sky-400',
    title: 'Azul'
  },
  pink: {
    bg: 'bg-pink-200/95 text-pink-950',
    text: 'text-pink-950',
    border: 'border-pink-400',
    dot: 'bg-pink-400',
    title: 'Rosa'
  },
  green: {
    bg: 'bg-emerald-200/95 text-emerald-950',
    text: 'text-emerald-950',
    border: 'border-emerald-400',
    dot: 'bg-emerald-400',
    title: 'Verde'
  },
  purple: {
    bg: 'bg-purple-200/95 text-purple-950',
    text: 'text-purple-950',
    border: 'border-purple-400',
    dot: 'bg-purple-400',
    title: 'Roxo'
  }
};

export default function FunnelArchitectEditorView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  const { offers, effectiveOrgId } = useCRM();
  const { icps } = useICPs();
  const orgId = userProfile?.orgId || effectiveOrgId;

  // Estado do Funil
  const [funnel, setFunnel] = useState<FunnelBlueprint | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Seleção e UI
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedConnectionId, setSelectedConnectionId] = useState<string | null>(null);
  const [nodeEditDraft, setNodeEditDraft] = useState<FunnelNode | null>(null);
  const [isLibraryOpen, setIsLibraryOpen] = useState(true);
  const [blockSearchQuery, setBlockSearchQuery] = useState('');
  const [isInspectorOpen, setIsInspectorOpen] = useState(false);
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

  // Arraste e Redimensionamento de Molduras (Frames)
  const [draggingFrameId, setDraggingFrameId] = useState<string | null>(null);
  const [frameDragOffset, setFrameDragOffset] = useState({ x: 0, y: 0 });
  const [resizingFrameId, setResizingFrameId] = useState<string | null>(null);
  const [frameResizeStart, setFrameResizeStart] = useState<{ x: number; y: number; initialWidth: number; initialHeight: number }>({ x: 0, y: 0, initialWidth: 480, initialHeight: 320 });

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
      if (isInspectorOpen && !nodeEditDraft) {
        setIsInspectorOpen(false);
      }
    }
  };

  // Listener global de mouse para movimentação e arraste a 60fps com nós, molduras e linhas sincronizados
  useEffect(() => {
    if (!draggingNodeId && !isDraggingCanvas && !draggingFrameId && !resizingFrameId) return;

    let animFrameId: number;

    const handleWindowMouseMove = (e: MouseEvent) => {
      cancelAnimationFrame(animFrameId);
      animFrameId = requestAnimationFrame(() => {
        if (isDraggingCanvas) {
          setPan({
            x: e.clientX - dragStart.x,
            y: e.clientY - dragStart.y
          });
        } else if (draggingNodeId) {
          const currentX = Math.round((e.clientX - pan.x) / zoom - nodeDragOffset.x);
          const currentY = Math.round((e.clientY - pan.y) / zoom - nodeDragOffset.y);

          setFunnel(prev => {
            if (!prev) return null;
            return {
              ...prev,
              nodes: prev.nodes.map(n => n.id === draggingNodeId ? { ...n, x: currentX, y: currentY } : n)
            };
          });
        } else if (draggingFrameId) {
          const currentX = Math.round((e.clientX - pan.x) / zoom - frameDragOffset.x);
          const currentY = Math.round((e.clientY - pan.y) / zoom - frameDragOffset.y);

          setFunnel(prev => {
            if (!prev) return null;
            return {
              ...prev,
              frames: (prev.frames || []).map(f => f.id === draggingFrameId ? { ...f, x: currentX, y: currentY } : f)
            };
          });
        } else if (resizingFrameId) {
          const currentCanvasX = (e.clientX - pan.x) / zoom;
          const currentCanvasY = (e.clientY - pan.y) / zoom;
          const newWidth = Math.max(220, Math.round(frameResizeStart.initialWidth + (currentCanvasX - frameResizeStart.x)));
          const newHeight = Math.max(140, Math.round(frameResizeStart.initialHeight + (currentCanvasY - frameResizeStart.y)));

          setFunnel(prev => {
            if (!prev) return null;
            return {
              ...prev,
              frames: (prev.frames || []).map(f => f.id === resizingFrameId ? { ...f, width: newWidth, height: newHeight } : f)
            };
          });
        }
      });
    };

    const handleWindowMouseUp = () => {
      setIsDraggingCanvas(false);
      setDraggingNodeId(null);
      setDraggingFrameId(null);
      setResizingFrameId(null);
    };

    window.addEventListener('mousemove', handleWindowMouseMove);
    window.addEventListener('mouseup', handleWindowMouseUp);

    return () => {
      cancelAnimationFrame(animFrameId);
      window.removeEventListener('mousemove', handleWindowMouseMove);
      window.removeEventListener('mouseup', handleWindowMouseUp);
    };
  }, [draggingNodeId, isDraggingCanvas, draggingFrameId, resizingFrameId, dragStart, pan, zoom, nodeDragOffset, frameDragOffset, frameResizeStart]);

  // ── 🔲 GESTÃO DE MOLDURAS / ÁREAS VISUAIS FLEXÍVEIS ──────────────────────
  const handleAddFrame = () => {
    const newFrame: FunnelFrame = {
      id: `frame_${Date.now()}`,
      title: 'Nova Área / Fase',
      color: 'indigo',
      x: Math.round((-pan.x + 350) / zoom),
      y: Math.round((-pan.y + 200) / zoom),
      width: 520,
      height: 340
    };
    setFunnel(prev => {
      if (!prev) return null;
      return {
        ...prev,
        frames: [...(prev.frames || []), newFrame]
      };
    });
    toast.success('Moldura adicionada! Arraste, redimensione e altere o título livremente.');
  };

  const handleUpdateFrame = (frameId: string, updates: Partial<FunnelFrame>) => {
    setFunnel(prev => {
      if (!prev) return null;
      return {
        ...prev,
        frames: (prev.frames || []).map(f => f.id === frameId ? { ...f, ...updates } : f)
      };
    });
  };

  const handleDeleteFrame = (frameId: string) => {
    setFunnel(prev => {
      if (!prev) return null;
      return {
        ...prev,
        frames: (prev.frames || []).filter(f => f.id !== frameId)
      };
    });
    toast.success('Moldura removida.');
  };

  const handleFrameMouseDown = (e: React.MouseEvent, frame: FunnelFrame) => {
    e.stopPropagation();
    if ((e.target as HTMLElement).tagName === 'INPUT' || (e.target as HTMLElement).closest('button')) return;
    const canvasX = (e.clientX - pan.x) / zoom;
    const canvasY = (e.clientY - pan.y) / zoom;
    setFrameDragOffset({
      x: canvasX - frame.x,
      y: canvasY - frame.y
    });
    setDraggingFrameId(frame.id);
  };

  const handleFrameResizeMouseDown = (e: React.MouseEvent, frame: FunnelFrame) => {
    e.stopPropagation();
    const canvasX = (e.clientX - pan.x) / zoom;
    const canvasY = (e.clientY - pan.y) / zoom;
    setFrameResizeStart({
      x: canvasX,
      y: canvasY,
      initialWidth: frame.width,
      initialHeight: frame.height
    });
    setResizingFrameId(frame.id);
  };

  // ── 📝 EDIÇÃO DO BLOCO COM DRAFT (SALVAR / CANCELAR) ────────────────────
  const handleOpenNodeEditor = (node: FunnelNode) => {
    setSelectedNodeId(node.id);
    setSelectedConnectionId(null);
    setNodeEditDraft(JSON.parse(JSON.stringify(node)));
    setIsInspectorOpen(true);
  };

  const handleSaveNodeDraft = () => {
    if (!nodeEditDraft || !funnel) return;
    setFunnel(prev => {
      if (!prev) return null;
      return {
        ...prev,
        nodes: prev.nodes.map(n => n.id === nodeEditDraft.id ? nodeEditDraft : n)
      };
    });
    setNodeEditDraft(null);
    setIsInspectorOpen(false);
    toast.success('Alterações do bloco salvas!');
  };

  const handleCancelNodeDraft = () => {
    setNodeEditDraft(null);
    setIsInspectorOpen(false);
  };

  const updateDraftField = (field: keyof FunnelNode, value: any) => {
    setNodeEditDraft(prev => prev ? { ...prev, [field]: value } : null);
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

    handleOpenNodeEditor(newNode);
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
    setNodeEditDraft(null);
    setIsInspectorOpen(false);
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
      ShoppingBag, Globe, Pencil,
      Calendar, PhoneCall, Briefcase, FileSignature, Receipt, Rocket, LifeBuoy,
      Star, RefreshCcw, Clock, GitBranch, Smartphone, Mic, UserCheck, GraduationCap, Inbox,
      Target, StickyNote, BoxSelect
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
              {funnel.frames && funnel.frames.length > 0 && (
                <span>• {funnel.frames.length} molduras</span>
              )}
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
          {/* Botão de Adicionar Moldura / Área */}
          <button
            onClick={handleAddFrame}
            className="px-3 py-2 bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white border border-white/10 hover:border-indigo-500/40 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm"
            title="Criar uma moldura / área de agrupamento visual redimensionável"
          >
            <BoxSelect className="w-4 h-4 text-indigo-400" />
            <span className="hidden sm:inline">+ Nova Moldura</span>
          </button>

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
              title="Fechar biblioteca"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>

          {/* Barra de Busca de Blocos */}
          <div className="p-3 border-b border-white/10 bg-white/[0.01]">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar bloco ou ferramenta..."
                value={blockSearchQuery}
                onChange={(e) => setBlockSearchQuery(e.target.value)}
                className="w-full pl-8 pr-7 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition-colors"
              />
              {blockSearchQuery && (
                <button
                  onClick={() => setBlockSearchQuery('')}
                  className="p-1 text-gray-400 hover:text-white absolute right-1.5 top-1/2 -translate-y-1/2 rounded-md hover:bg-white/10"
                  title="Limpar busca"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-6">
            
            {(() => {
              const query = blockSearchQuery.trim().toLowerCase();
              const categories = [
                { id: 'icp', title: '🎯 Inteligência & Perfis ICP', subTypes: ['icp_persona'] },
                { id: 'traffic', title: '🌐 Linhas de Tráfego & Atração', subTypes: ['pinterest', 'tiktok', 'instagram', 'youtube', 'google_seo', 'whatsapp'] },
                { id: 'page', title: '📄 Páginas & Etapas Web', subTypes: ['blog_site', 'quiz_page', 'quiz_vsl_page', 'capture_page', 'vsl_page', 'sales_page', 'static_page', 'webinar_page', 'checkout', 'thank_you_page'] },
                { id: 'offer', title: '💰 Monetização & Ofertas Próprias', subTypes: ['lead_magnet', 'front_end', 'order_bump', 'upsell', 'downsell', 'subscription', 'high_ticket'] },
                { id: 'affiliate', title: '🛒 Afiliação & Lojas Parceiras', subTypes: ['affiliate_amazon', 'affiliate_shopee', 'affiliate_mercadolivre', 'affiliate_product'] },
                { id: 'automation', title: '🤖 E-mail & Automações Multicanal', subTypes: ['email_seq', 'email_broadcast', 'delay_timer', 'condition_branch', 'whatsapp_auto', 'sms_transactional', 'voice_bot', 'remarketing'] },
                { id: 'b2b', title: '🏢 Vendas B2B & Negociação Corporativa', subTypes: ['b2b_meeting', 'b2b_qualification', 'b2b_proposal', 'contract_signing', 'corporate_invoice'] },
                { id: 'cs', title: '⚙️ Pós-Venda, Sucesso do Cliente (CS) & Retenção', subTypes: ['client_onboarding', 'support_ticket', 'nps_survey', 'contract_renewal'] },
                { id: 'hr', title: '👥 RH & Processos Internos', subTypes: ['hr_recruitment', 'team_training'] },
                { id: 'note', title: '📝 Anotações & Post-its', subTypes: ['sticky_note'] }
              ];

              const filteredCategories = categories.map(cat => {
                const matchingSubTypes = cat.subTypes.filter(st => {
                  const meta = FUNNEL_BLOCK_CATALOG.find(b => b.subType === st);
                  if (!meta) return false;
                  if (!query) return true;
                  return meta.name.toLowerCase().includes(query) ||
                         meta.categoryLabel.toLowerCase().includes(query) ||
                         meta.strategicGuide.title.toLowerCase().includes(query) ||
                         meta.strategicGuide.description.toLowerCase().includes(query) ||
                         meta.subType.toLowerCase().includes(query);
                });
                return { ...cat, subTypes: matchingSubTypes };
              }).filter(cat => cat.subTypes.length > 0);

              if (filteredCategories.length === 0) {
                return (
                  <div className="p-8 text-center">
                    <Search className="w-8 h-8 text-gray-600 mx-auto mb-2" />
                    <p className="text-xs font-semibold text-gray-400">Nenhum bloco encontrado</p>
                    <p className="text-[10px] text-gray-600 mt-1">Tente buscar por "icp", "post-it", "quiz", "afiliado", "vsl", "pix", "whatsapp"...</p>
                  </div>
                );
              }

              return filteredCategories.map(category => (
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
              ));
            })()}

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
            {/* ── 🔲 RENDERIZAÇÃO DAS MOLDURAS / CAIXAS DE AGRUPAMENTO (FRAMES) ── */}
            {funnel.frames?.map(frame => {
              const frameTheme = FRAME_COLORS[frame.color] || FRAME_COLORS.indigo;
              return (
                <div
                  key={frame.id}
                  style={{
                    left: `${frame.x}px`,
                    top: `${frame.y}px`,
                    width: `${frame.width}px`,
                    height: `${frame.height}px`
                  }}
                  className={`absolute rounded-3xl border-2 ${frameTheme.border} ${frameTheme.bg} backdrop-blur-[2px] pointer-events-auto transition-colors z-0 flex flex-col`}
                >
                  {/* Cabeçalho da Moldura (Arrastável) */}
                  <div
                    onMouseDown={(e) => handleFrameMouseDown(e, frame)}
                    className={`h-10 px-3 border-b ${frameTheme.header} rounded-t-3xl flex items-center justify-between cursor-move select-none`}
                  >
                    <div className="flex items-center gap-2 flex-1 mr-2">
                      <Move className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                      <input
                        type="text"
                        value={frame.title}
                        onChange={(e) => handleUpdateFrame(frame.id, { title: e.target.value })}
                        className="bg-transparent text-xs font-black text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 rounded px-1.5 py-0.5 w-full max-w-[200px]"
                        placeholder="Nome da Área / Fase..."
                      />
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {/* Seletor de Cores da Moldura */}
                      {Object.keys(FRAME_COLORS).map(colorName => (
                        <button
                          key={colorName}
                          onClick={() => handleUpdateFrame(frame.id, { color: colorName as any })}
                          className={`w-3 h-3 rounded-full ${FRAME_COLORS[colorName].activeDot} transition-transform ${
                            frame.color === colorName ? 'scale-125 ring-2 ring-white shadow-md' : 'opacity-50 hover:opacity-100'
                          }`}
                          title={`Cor ${FRAME_COLORS[colorName].label}`}
                        />
                      ))}

                      <div className="w-px h-3 bg-white/20 mx-0.5"></div>

                      <button
                        onClick={() => handleDeleteFrame(frame.id)}
                        className="p-1 text-gray-400 hover:text-rose-400 hover:bg-rose-500/20 rounded-lg transition-colors"
                        title="Excluir Moldura"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  {/* Fundo Livre da Moldura */}
                  <div className="flex-1 relative">
                    {/* Alça de Redimensionamento no Canto Inferior Direito */}
                    <div
                      onMouseDown={(e) => handleFrameResizeMouseDown(e, frame)}
                      className="absolute right-1 bottom-1 w-6 h-6 flex items-center justify-center cursor-nwse-resize text-gray-400 hover:text-white transition-colors"
                      title="Arraste para redimensionar a moldura"
                    >
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M8 2L2 8M8 5L5 8M8 8H8.01" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                      </svg>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* SVG DE CONEXÕES / SETAS DINÂMICAS */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none z-10 overflow-visible">
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

            {/* ── 🧱 RENDERIZAÇÃO DOS NÓS (CARDS) ──────────────────────────────── */}
            {funnel.nodes.map(node => {
              const meta = FUNNEL_BLOCK_CATALOG.find(b => b.subType === node.subType);
              const isSelected = selectedNodeId === node.id;
              const isConnectingSource = connectingFromNodeId === node.id;
              const isBottleneck = simulationResults.bottleneckIds.includes(node.id);
              const calculatedTraffic = simulationResults.trafficMap?.[node.id] || 0;

              // 📝 RENDERIZAÇÃO ESPECIAL DE POST-IT / NOTA ADESIVA
              if (node.subType === 'sticky_note') {
                const noteColor = (node.noteColor || 'yellow') as keyof typeof STICKY_COLORS;
                const style = STICKY_COLORS[noteColor] || STICKY_COLORS.yellow;
                return (
                  <div
                    key={node.id}
                    onMouseDown={(e) => handleNodeMouseDown(e, node)}
                    style={{ left: `${node.x}px`, top: `${node.y}px` }}
                    className={`absolute w-60 p-4 rounded-2xl pointer-events-auto cursor-pointer shadow-xl transition-transform border z-20 ${style.bg} ${style.border} ${
                      isSelected ? 'ring-2 ring-indigo-500 scale-105 shadow-2xl' : 'hover:scale-[1.02]'
                    }`}
                  >
                    {/* Alfinete no Topo */}
                    <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-black/10">
                      <div className="flex items-center gap-1.5">
                        <Pin className="w-3.5 h-3.5 text-black/60 rotate-45" />
                        <span className="text-[10px] font-black uppercase tracking-wider text-black/70">
                          {node.label || 'Post-it'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleOpenNodeEditor(node); }}
                          className="p-1 rounded bg-black/10 hover:bg-black/20 text-black/70 transition-colors"
                          title="Editar"
                        >
                          <Pencil className="w-3 h-3" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setFunnel(prev => prev ? { ...prev, nodes: prev.nodes.filter(n => n.id !== node.id) } : null);
                          }}
                          className="p-1 rounded bg-black/10 hover:bg-rose-500 hover:text-white text-black/70 transition-colors"
                          title="Excluir Nota"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    {/* Texto da Nota */}
                    <div className="text-xs font-semibold leading-relaxed whitespace-pre-wrap select-text min-h-12 line-clamp-6">
                      {node.notes || 'Clique no lápis para escrever sua anotação estratégica, metas ou tarefas da equipe aqui...'}
                    </div>

                    {/* Cores rápidas */}
                    <div className="flex items-center gap-1.5 mt-3 pt-2 border-t border-black/10">
                      {Object.keys(STICKY_COLORS).map(c => (
                        <button
                          key={c}
                          onClick={(e) => {
                            e.stopPropagation();
                            setFunnel(prev => prev ? {
                              ...prev,
                              nodes: prev.nodes.map(n => n.id === node.id ? { ...n, noteColor: c } : n)
                            } : null);
                          }}
                          className={`w-3.5 h-3.5 rounded-full ${STICKY_COLORS[c].dot} border border-black/20 hover:scale-125 transition-transform`}
                          title={STICKY_COLORS[c].title}
                        />
                      ))}
                    </div>
                  </div>
                );
              }

              // 🎯 RENDERIZAÇÃO ESPECIAL DE PERFIL ICP / PERSONA
              if (node.subType === 'icp_persona') {
                const linkedICP = icps.find(i => i.id === node.icpId);
                return (
                  <div
                    key={node.id}
                    onMouseDown={(e) => handleNodeMouseDown(e, node)}
                    style={{ left: `${node.x}px`, top: `${node.y}px` }}
                    className={`absolute w-60 rounded-2xl pointer-events-auto cursor-pointer transition-all select-none backdrop-blur-2xl border z-20 ${
                      isSelected
                        ? 'border-amber-400 shadow-2xl shadow-amber-500/30 ring-2 ring-amber-500/40 bg-[#161209]'
                        : isConnectingSource
                        ? 'border-amber-400 shadow-2xl shadow-amber-500/30 ring-2 ring-amber-500/40 bg-[#161209]'
                        : 'border-amber-500/30 hover:border-amber-500/60 bg-[#110d05]/95 shadow-xl'
                    }`}
                  >
                    {/* Cabeçalho do Card ICP */}
                    <div className="p-3 border-b border-amber-500/20 flex items-center justify-between bg-amber-500/5">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30">
                          <Target size={14} />
                        </div>
                        <span className="text-[10px] font-black text-amber-400 uppercase tracking-wider">
                          {linkedICP?.targetType || 'ICP / Persona'}
                        </span>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleOpenNodeEditor(node); }}
                          className="p-1 rounded-md bg-white/5 hover:bg-amber-500 hover:text-black text-gray-300 transition-colors"
                          title="Selecionar / Configurar ICP"
                        >
                          <Pencil className="w-3 h-3" />
                        </button>
                        <button
                          onClick={(e) => handleStartConnection(e, node.id)}
                          className={`p-1 rounded-md text-[10px] font-bold transition-colors ${
                            isConnectingSource ? 'bg-amber-500 text-black' : 'bg-white/5 hover:bg-amber-500 hover:text-black text-gray-300'
                          }`}
                          title="Ligar ICP ao Canal de Tráfego ou Página"
                        >
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    {/* Corpo do Card ICP */}
                    <div className="p-3 space-y-2">
                      <h4 className="text-xs font-bold text-white line-clamp-1">
                        {node.label}
                      </h4>
                      <p className="text-[11px] text-gray-400 line-clamp-1">
                        {node.subtitle || 'Selecione um ICP nas configurações'}
                      </p>

                      {linkedICP?.avgTicket ? (
                        <div className="text-[10px] text-amber-300 font-bold bg-amber-500/10 px-2 py-1 rounded-lg border border-amber-500/20 flex items-center justify-between">
                          <span>Ticket Médio:</span>
                          <span className="text-emerald-400">R$ {linkedICP.avgTicket.toLocaleString('pt-BR')}</span>
                        </div>
                      ) : null}

                      {node.notes && (
                        <p className="text-[10px] text-gray-400 line-clamp-2 bg-black/40 p-1.5 rounded-lg border border-white/5 italic">
                          "{node.notes}"
                        </p>
                      )}
                    </div>
                  </div>
                );
              }

              // 📦 RENDERIZAÇÃO PADRÃO DE BLOCOS (TRÁFEGO, PÁGINAS, OFERTAS, AUTOMAÇÕES, B2B, CS, RH)
              return (
                <div
                  key={node.id}
                  onMouseDown={(e) => handleNodeMouseDown(e, node)}
                  style={{
                    left: `${node.x}px`,
                    top: `${node.y}px`
                  }}
                  className={`absolute w-56 rounded-2xl pointer-events-auto cursor-pointer transition-shadow select-none backdrop-blur-2xl border z-20 ${
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

                    {/* Ações do Card */}
                    <div className="flex items-center gap-1">
                      {/* Botão de Editar Bloco */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenNodeEditor(node);
                        }}
                        className="p-1 rounded-md text-[10px] font-bold bg-white/5 hover:bg-indigo-600 text-gray-300 hover:text-white transition-colors"
                        title="Editar parâmetros do bloco"
                      >
                        <Pencil className="w-3 h-3" />
                      </button>

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
        {(nodeEditDraft || selectedNode) && (() => {
          const activeNode = nodeEditDraft || selectedNode!;
          const activeNodeMeta = FUNNEL_BLOCK_CATALOG.find(b => b.subType === activeNode.subType);

          return (
            <div 
              className={`absolute right-0 top-0 bottom-0 z-20 w-80 lg:w-96 bg-[#090e1c]/95 border-l border-white/10 backdrop-blur-2xl flex flex-col transition-transform duration-300 ${
                isInspectorOpen ? 'translate-x-0' : 'translate-x-full'
              }`}
            >
              {/* Cabeçalho do Inspetor */}
              <div className="p-4 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
                <div className="flex items-center gap-2">
                  <div className={`p-1.5 rounded-lg border ${activeNodeMeta?.badgeColor || 'bg-white/5 text-white'}`}>
                    {renderNodeIcon(activeNodeMeta?.iconName || 'Layers', 16)}
                  </div>
                  <div>
                    <h3 className="text-xs font-black text-white uppercase tracking-wider">
                      Configuração da Etapa
                    </h3>
                    <span className="text-[10px] text-gray-400">{activeNode.type}</span>
                  </div>
                </div>
                <button
                  onClick={handleCancelNodeDraft}
                  className="p-1 text-gray-400 hover:text-white rounded-lg hover:bg-white/10"
                  title="Fechar sem salvar"
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
                  Tarefas ({activeNode.checklist?.filter(c => c.done).length || 0}/{activeNode.checklist?.length || 0})
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
                        value={activeNode.label}
                        onChange={(e) => updateDraftField('label', e.target.value)}
                        className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                      />
                    </div>

                    {/* Configuração de Perfil ICP */}
                    {activeNode.subType === 'icp_persona' && (
                      <div className="space-y-3 p-3.5 rounded-2xl bg-amber-500/5 border border-amber-500/20">
                        <div className="flex items-center justify-between">
                          <label className="text-[11px] font-bold text-amber-400 uppercase flex items-center gap-1.5">
                            <Target className="w-3.5 h-3.5" />
                            Perfil ICP do CRM
                          </label>
                          <a
                            href="/icp"
                            target="_blank"
                            rel="noreferrer"
                            className="text-[10px] text-amber-400 hover:underline flex items-center gap-1"
                          >
                            Gerenciar ICPs <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        </div>

                        <select
                          value={activeNode.icpId || ''}
                          onChange={(e) => {
                            const chosenICP = icps.find(i => i.id === e.target.value);
                            if (chosenICP) {
                              updateDraftField('icpId', chosenICP.id);
                              updateDraftField('label', chosenICP.name);
                              updateDraftField('subtitle', `${chosenICP.targetType || 'B2B'} • ${chosenICP.niche || chosenICP.decisionMakerRole || 'Perfil ICP'}`);
                              if (chosenICP.avgTicket) updateDraftField('price', chosenICP.avgTicket);
                              if (chosenICP.painPoints?.length) updateDraftField('notes', `Dores: ${chosenICP.painPoints.slice(0, 2).join('; ')}`);
                            } else {
                              updateDraftField('icpId', undefined);
                            }
                          }}
                          className="w-full px-3 py-2 bg-black/60 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                        >
                          <option value="">Selecione um ICP cadastrado...</option>
                          {icps.map(icp => (
                            <option key={icp.id} value={icp.id}>
                              {icp.name} ({icp.targetType || 'B2B'} - {icp.niche || icp.decisionMakerRole || 'Geral'})
                            </option>
                          ))}
                        </select>

                        {/* Detalhes do ICP Selecionado */}
                        {(() => {
                          const currentICP = icps.find(i => i.id === activeNode.icpId);
                          if (!currentICP) return null;
                          return (
                            <div className="space-y-2 pt-2 border-t border-white/5 text-xs text-gray-300">
                              <div className="flex items-center gap-2">
                                <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px] font-black uppercase">
                                  {currentICP.targetType || 'B2B'}
                                </span>
                                <span className="text-[11px] text-gray-400">
                                  Ticket Médio: <strong className="text-emerald-400">R$ {currentICP.avgTicket?.toLocaleString('pt-BR') || 'N/A'}</strong>
                                </span>
                              </div>

                              {currentICP.painPoints && currentICP.painPoints.length > 0 && (
                                <div>
                                  <span className="text-[10px] text-gray-500 font-bold block uppercase">Dores Principais:</span>
                                  <ul className="list-disc list-inside text-[11px] text-gray-400 space-y-0.5">
                                    {currentICP.painPoints.slice(0, 3).map((p, idx) => (
                                      <li key={idx} className="line-clamp-1">{p}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}

                              {currentICP.objections && currentICP.objections.length > 0 && (
                                <div>
                                  <span className="text-[10px] text-gray-500 font-bold block uppercase">Objeções Comuns:</span>
                                  <ul className="list-disc list-inside text-[11px] text-gray-400 space-y-0.5">
                                    {currentICP.objections.slice(0, 2).map((obj, idx) => (
                                      <li key={idx} className="line-clamp-1">{obj}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </div>
                          );
                        })()}
                      </div>
                    )}

                    {/* Configuração de Post-it / Nota Adesiva */}
                    {activeNode.subType === 'sticky_note' && (
                      <div className="space-y-3 p-3.5 rounded-2xl bg-yellow-500/5 border border-yellow-500/20">
                        <label className="text-[11px] font-bold text-yellow-300 uppercase flex items-center gap-1.5">
                          <StickyNote className="w-3.5 h-3.5" />
                          Cor do Post-it
                        </label>
                        <div className="flex items-center gap-2">
                          {Object.entries(STICKY_COLORS).map(([colorKey, colorVal]) => (
                            <button
                              key={colorKey}
                              type="button"
                              onClick={() => updateDraftField('noteColor', colorKey)}
                              className={`w-7 h-7 rounded-xl border-2 transition-transform ${colorVal.dot} ${
                                (activeNode.noteColor || 'yellow') === colorKey ? 'scale-110 border-white shadow-lg' : 'border-transparent opacity-70 hover:opacity-100'
                              }`}
                              title={colorVal.title}
                            />
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Se for Produto de Afiliado */}
                    {activeNode.subType.startsWith('affiliate_') && (
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
                              value={activeNode.affiliateLink || ''}
                              onChange={(e) => updateDraftField('affiliateLink', e.target.value)}
                              className="flex-1 px-3 py-1.5 bg-black/60 border border-white/10 rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-amber-500"
                            />
                            {activeNode.affiliateLink && (
                              <a
                                href={activeNode.affiliateLink}
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
                            value={activeNode.commissionRate || ''}
                            onChange={(e) => updateDraftField('commissionRate', parseFloat(e.target.value) || 0)}
                            className="w-full px-3 py-1.5 bg-black/60 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                          />
                        </div>
                      </div>
                    )}

                    {/* Vínculo com Oferta Real do CRM (Apenas para ofertas próprias) */}
                    {activeNode.type === 'offer' && !activeNode.subType.startsWith('affiliate_') && (
                      <div className="space-y-2 p-3 rounded-2xl bg-emerald-500/5 border border-emerald-500/20">
                        <div className="flex justify-between items-center">
                          <label className="text-[11px] font-bold text-emerald-400 uppercase flex items-center gap-1.5">
                            <DollarSign className="w-3.5 h-3.5" />
                            Vincular Oferta do CRM (Opcional)
                          </label>
                          <span className="text-[9px] text-gray-500 font-medium">Livre ou Vinculado</span>
                        </div>

                        <select
                          value={activeNode.offerId || ''}
                          onChange={(e) => {
                            const chosenOffer = offers.find(o => o.id === e.target.value);
                            if (chosenOffer) {
                              updateDraftField('offerId', chosenOffer.id);
                              updateDraftField('price', chosenOffer.price);
                              updateDraftField('label', chosenOffer.name);
                            } else {
                              updateDraftField('offerId', undefined);
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

                        {activeNode.offerId && (
                          <a
                            href={`${window.location.origin}/checkout/${orgId}?offerId=${activeNode.offerId}`}
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
                    {(activeNode.type === 'page' || activeNode.type === 'traffic') && (
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-gray-400 uppercase">Link / URL da Página</label>
                        <div className="flex gap-2">
                          <input
                            type="url"
                            placeholder="https://seusite.com.br/artigo-ou-pagina"
                            value={activeNode.url || ''}
                            onChange={(e) => updateDraftField('url', e.target.value)}
                            className="flex-1 px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
                          />
                          {activeNode.url && (
                            <a
                              href={activeNode.url}
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
                    {activeNode.type === 'offer' && (
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-gray-400 uppercase">
                          {activeNode.subType.startsWith('affiliate_') ? 'Preço do Produto no Parceiro (R$)' : 'Preço do Produto (R$)'}
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          value={activeNode.price || 0}
                          onChange={(e) => updateDraftField('price', parseFloat(e.target.value) || 0)}
                          className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                    )}

                    {activeNode.type === 'traffic' && (
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-gray-400 uppercase">Custo Médio por Clique - CPC (R$)</label>
                        <input
                          type="number"
                          step="0.10"
                          value={activeNode.costPerClick || 0}
                          onChange={(e) => updateDraftField('costPerClick', parseFloat(e.target.value) || 0)}
                          className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                    )}

                    {/* Taxa de Conversão Esperada */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center">
                        <label className="text-[11px] font-bold text-gray-400 uppercase">Taxa de Conversão Esperada</label>
                        <span className="text-xs font-bold text-indigo-400">{activeNode.conversionRate || 0}%</span>
                      </div>
                      <input
                        type="range"
                        min="0.5"
                        max="100"
                        step="0.5"
                        value={activeNode.conversionRate || 0}
                        onChange={(e) => updateDraftField('conversionRate', parseFloat(e.target.value))}
                        className="w-full accent-indigo-500 cursor-pointer"
                      />
                    </div>

                    {/* Status da Etapa */}
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-gray-400 uppercase">Status de Execução</label>
                      <select
                        value={activeNode.status || 'idea'}
                        onChange={(e) => updateDraftField('status', e.target.value)}
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
                        value={activeNode.notes || ''}
                        onChange={(e) => updateDraftField('notes', e.target.value)}
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
                            const updated = [...(activeNode.checklist || []), { id: `chk-${Date.now()}`, text: text.trim(), done: false }];
                            updateDraftField('checklist', updated);
                          }
                        }}
                        className="text-[10px] font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                      >
                        <Plus className="w-3 h-3" /> Adicionar
                      </button>
                    </div>

                    <div className="space-y-2">
                      {(activeNode.checklist || []).map((item) => (
                        <div
                          key={item.id}
                          onClick={() => {
                            const updated = (activeNode.checklist || []).map(c => c.id === item.id ? { ...c, done: !c.done } : c);
                            updateDraftField('checklist', updated);
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

                {inspectorTab === 'guide' && activeNodeMeta && (
                  <div className="space-y-4">
                    <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-2xl">
                      <h4 className="text-xs font-bold text-amber-300 mb-1 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5" />
                        {activeNodeMeta.strategicGuide.title}
                      </h4>
                      <p className="text-xs text-gray-300 leading-relaxed">
                        {activeNodeMeta.strategicGuide.description}
                      </p>
                    </div>

                    <div className="space-y-2">
                      <span className="text-[11px] font-black text-gray-400 uppercase block">Regras de Ouro</span>
                      <ul className="space-y-2 text-xs text-gray-300">
                        {activeNodeMeta.strategicGuide.goldenRules.map((rule, i) => (
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

              {/* Rodapé de Ações: Salvar / Cancelar */}
              <div className="p-4 border-t border-white/10 bg-black/40 flex items-center justify-end gap-2">
                <button
                  onClick={handleCancelNodeDraft}
                  className="px-3.5 py-2 bg-white/5 hover:bg-white/10 text-gray-300 rounded-xl text-xs font-bold transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSaveNodeDraft}
                  className="px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-500/20 flex items-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  Salvar Alterações
                </button>
              </div>
            </div>
          );
        })()}

      </div>
    </div>
  );
}
