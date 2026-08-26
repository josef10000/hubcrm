import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
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
  Target, StickyNote, BoxSelect, Wand2, MousePointer, Workflow, Spline,
  AlignLeft, ArrowLeftToLine, ArrowUpToLine, Focus, ChevronDown, ArrowRightLeft, ArrowUpDown, Minimize2, Compass, Scan, Map, Hand,
  Copy, MessageSquare, Bot, MessageSquareCode, Layers3, Flame, Ticket, Share2, FileSpreadsheet, UserPlus, Tag,
  GitFork, HeartHandshake, Smile, Frown, Meh, AlertOctagon
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

// ── 🧭 MAPA DE EMOÇÕES DA JORNADA DO CLIENTE ──────────────────────────────────
const EMOTION_MAP: Record<string, { label: string; emoji: string; badge: string }> = {
  delighted: { label: 'Encantado / Fã', emoji: '🤩', badge: 'bg-purple-500/10 text-purple-300 border-purple-500/30' },
  happy: { label: 'Confiante / Animado', emoji: '😄', badge: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30' },
  neutral: { label: 'Neutro / Observando', emoji: '😐', badge: 'bg-gray-500/10 text-gray-300 border-gray-500/30' },
  hesitant: { label: 'Inseguro / Com Dúvida', emoji: '🤔', badge: 'bg-amber-500/10 text-amber-300 border-amber-500/30' },
  frustrated: { label: 'Frustrado / Risco Churn', emoji: '😡', badge: 'bg-rose-500/10 text-rose-300 border-rose-500/30' },
};

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

// ── 🎯 CORES & SEMÂNTICA DAS ROTAS ──────────────────────────────────────────
const ROUTE_INTENTS: Record<string, { stroke: string; label: string; markerId: string; badge: string }> = {
  conversion: { stroke: '#10b981', label: 'Conversão Direta', markerId: 'arrow-emerald', badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' },
  recovery: { stroke: '#f59e0b', label: 'Recuperação / Abandono', markerId: 'arrow-amber', badge: 'bg-amber-500/20 text-amber-300 border-amber-500/30' },
  loop: { stroke: '#a855f7', label: 'Loop / Remarketing', markerId: 'arrow-purple', badge: 'bg-purple-500/20 text-purple-300 border-purple-500/30' },
  upsell: { stroke: '#ec4899', label: 'Upsell / Downsell', markerId: 'arrow-rose', badge: 'bg-rose-500/20 text-rose-300 border-rose-500/30' },
  neutral: { stroke: '#6366f1', label: 'Fluxo Principal', markerId: 'arrow-indigo', badge: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30' }
};

// ── 📏 DIMENSÕES DOS BLOCOS DO FUNIL ─────────────────────────────────────────
const getNodeDimensions = (subType?: string) => {
  if (subType === 'sticky_note') return { width: 256, height: 200 };
  if (subType === 'icp_persona') return { width: 240, height: 120 };
  return { width: 224, height: 90 };
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

  // Seleção e UI Múltipla
  const [selectedNodeIds, setSelectedNodeIds] = useState<string[]>([]);
  const [selectedConnectionId, setSelectedConnectionId] = useState<string | null>(null);
  const [nodeEditDraft, setNodeEditDraft] = useState<FunnelNode | null>(null);
  const [isLibraryOpen, setIsLibraryOpen] = useState(true);
  const [blockSearchQuery, setBlockSearchQuery] = useState('');
  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>({
    journey: true,
    icp: true,
    note: true,
    traffic: true,
    page: true,
    offer: true,
    affiliate: true,
    automation: true,
    b2b: true,
    cs: true,
    hr: true
  });

  // Sub-funis & Funis Vinculados
  const [availableFunnels, setAvailableFunnels] = useState<FunnelBlueprint[]>([]);
  const [previewSubFunnel, setPreviewSubFunnel] = useState<FunnelBlueprint | null>(null);
  const [loadingSubFunnel, setLoadingSubFunnel] = useState(false);

  // Clipboard (Copiar e Colar)
  const [copiedNodesBuffer, setCopiedNodesBuffer] = useState<{
    nodes: FunnelNode[];
    connections: FunnelConnection[];
  } | null>(null);

  const toggleCategory = (catKey: string) => {
    setOpenCategories(prev => ({
      ...prev,
      [catKey]: prev[catKey] === undefined ? false : !prev[catKey]
    }));
  };

  const [isInspectorOpen, setIsInspectorOpen] = useState(false);
  const [newChecklistText, setNewChecklistText] = useState('');
  const [inspectorTab, setInspectorTab] = useState<'config' | 'guide' | 'checklist'>('config');

  // Modo Foco & Destaque de Trilha Inteligente
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [focusMode, setFocusMode] = useState(false);

  // Roteamento de Linhas (Bézier vs Ortogonal)
  const [routingStyle, setRoutingStyle] = useState<'bezier' | 'orthogonal'>('bezier');

  // Ferramenta de Canvas (Pan vs Seleção por Área)
  const [canvasTool, setCanvasTool] = useState<'pan' | 'select'>('pan');
  const [isSelectingArea, setIsSelectingArea] = useState(false);
  const [selectionBox, setSelectionBox] = useState<{ startX: number; startY: number; currentX: number; currentY: number } | null>(null);

  // Modo de Conexão de Nós
  const [connectingFromNodeId, setConnectingFromNodeId] = useState<string | null>(null);

  // Zoom e Pan da Tela Infinita
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 150, y: 100 });
  const [isDraggingCanvas, setIsDraggingCanvas] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Arraste em Lote / Grupo de Nós
  const [isDraggingGroup, setIsDraggingGroup] = useState(false);
  const [draggingGroupOffsets, setDraggingGroupOffsets] = useState<Record<string, { x: number; y: number }>>({});

  // Arraste e Redimensionamento de Molduras (Frames)
  const [draggingFrameId, setDraggingFrameId] = useState<string | null>(null);
  const [frameDragOffset, setFrameDragOffset] = useState({ x: 0, y: 0 });
  const [resizingFrameId, setResizingFrameId] = useState<string | null>(null);
  const [frameResizeStart, setFrameResizeStart] = useState<{ x: number; y: number; initialWidth: number; initialHeight: number }>({ x: 0, y: 0, initialWidth: 480, initialHeight: 320 });

  // Simulador de Tráfego
  const [initialTrafficInput, setInitialTrafficInput] = useState<number>(3000);
  const [isSimulationActive, setIsSimulationActive] = useState(true);

  // Estados de Super Espaço & Navegação Avançada
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isMinimapOpen, setIsMinimapOpen] = useState(false);
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const [isDraggingMinimap, setIsDraggingMinimap] = useState(false);
  const [isHandMode, setIsHandMode] = useState(false);
  const editorContainerRef = useRef<HTMLDivElement>(null);

  const canvasRef = useRef<HTMLDivElement>(null);
  const funnelRef = useRef<FunnelBlueprint | null>(null);
  useEffect(() => {
    funnelRef.current = funnel;
  }, [funnel]);

  // O nó selecionado principal (para o inspetor lateral)
  const selectedNodeId = selectedNodeIds.length === 1 ? selectedNodeIds[0] : null;

  useEffect(() => {
    if (orgId && id) {
      loadFunnel();
    }
  }, [orgId, id]);

  const loadAvailableFunnels = async () => {
    if (!orgId) return;
    try {
      const list = await funnelService.getFunnels(orgId);
      setAvailableFunnels(list.filter(f => f.id !== id));
    } catch (e) {
      console.error('Erro ao carregar funis da organização:', e);
    }
  };

  const loadFunnel = async () => {
    if (!orgId || !id) return;
    setLoading(true);
    try {
      const data = await funnelService.getFunnel(orgId, id);
      if (data) {
        setFunnel(data);
        if (data.routingStyle) {
          setRoutingStyle(data.routingStyle);
        }
        if (data.metrics?.initialTraffic) {
          setInitialTrafficInput(data.metrics.initialTraffic);
        }
      } else {
        toast.error('Funil não encontrado.');
        navigate('/funnels');
      }
      // Carregar outros funis para vinculação
      loadAvailableFunnels();
    } catch (error) {
      console.error('Erro ao carregar funil:', error);
      toast.error('Erro ao carregar o funil.');
    } finally {
      setLoading(false);
    }
  };

  const handleInspectSubFunnel = async (targetFunnelId?: string) => {
    if (!orgId || !targetFunnelId) {
      toast.info('Nenhum funil operacional vinculado a este bloco ainda. Selecione um no painel de configurações.');
      return;
    }
    setLoadingSubFunnel(true);
    try {
      const data = await funnelService.getFunnel(orgId, targetFunnelId);
      if (data) {
        setPreviewSubFunnel(data);
      } else {
        toast.error('Sub-funil não encontrado.');
      }
    } catch (error) {
      console.error('Erro ao buscar sub-funil:', error);
      toast.error('Erro ao carregar o raio-x do sub-funil.');
    } finally {
      setLoadingSubFunnel(false);
    }
  };

  // Auto-Save Silencioso Debounced
  const autoSave = async () => {
    if (!orgId || !id || !funnel) return;
    try {
      await funnelService.updateFunnel(orgId, id, { ...funnel, routingStyle });
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
  }, [funnel, routingStyle]);

  const handleManualSave = async () => {
    if (!orgId || !id || !funnel) {
      toast.error('Dados incompletos para salvar.');
      return;
    }
    setSaving(true);
    try {
      await funnelService.updateFunnel(orgId, id, { ...funnel, routingStyle });
      toast.success('Funil salvo com sucesso!');
    } catch (error: any) {
      console.error('Erro ao salvar funil:', error);
      toast.error(`Erro ao salvar funil: ${error?.message || 'Falha de comunicação'}`);
    } finally {
      setSaving(false);
    }
  };

  // Modo Tela Cheia Imersivo (Zen Mode Híbrido CSS + Native)
  const toggleFullscreen = () => {
    const nextState = !isFullscreen;
    setIsFullscreen(nextState);
    if (nextState) {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen?.().catch(() => {});
      }
      toast.success('Modo Tela Cheia ativado! Clique no ícone de restaurar para sair.');
    } else {
      if (document.fullscreenElement) {
        document.exitFullscreen?.().catch(() => {});
      }
      toast.info('Modo Tela Cheia desativado.');
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement && isFullscreen) {
        setIsFullscreen(false);
      }
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, [isFullscreen]);

  // ── 📐 ENQUADRAR TUDO NO CANVAS (FIT TO SCREEN) ───────────────────────────
  const handleFitToScreen = () => {
    if (!funnel || funnel.nodes.length === 0 || !canvasRef.current) {
      setZoom(1);
      setPan({ x: 150, y: 100 });
      toast.info('Visualização padrão aplicada.');
      return;
    }

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    funnel.nodes.forEach(n => {
      const { width, height } = getNodeDimensions(n.subType);
      minX = Math.min(minX, n.x);
      minY = Math.min(minY, n.y);
      maxX = Math.max(maxX, n.x + width);
      maxY = Math.max(maxY, n.y + height);
    });

    (funnel.frames || []).forEach(f => {
      minX = Math.min(minX, f.x);
      minY = Math.min(minY, f.y);
      maxX = Math.max(maxX, f.x + f.width);
      maxY = Math.max(maxY, f.y + f.height);
    });

    const rect = canvasRef.current.getBoundingClientRect();
    const padding = 120;
    const availableWidth = Math.max(200, rect.width - padding * 2);
    const availableHeight = Math.max(200, rect.height - padding * 2);

    const boundsWidth = Math.max(100, maxX - minX);
    const boundsHeight = Math.max(100, maxY - minY);

    const targetZoom = Math.max(0.15, Math.min(1.2, Math.min(availableWidth / boundsWidth, availableHeight / boundsHeight)));
    
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;

    const newPanX = rect.width / 2 - centerX * targetZoom;
    const newPanY = rect.height / 2 - centerY * targetZoom;

    setZoom(Number(targetZoom.toFixed(2)));
    setPan({ x: Math.round(newPanX), y: Math.round(newPanY) });
    toast.success('Funil centralizado e enquadrado na tela!');
  };

  // ── 🗺️ NAVEGAÇÃO ARRASTÁVEL DO MINI-MAPA ──────────────────────────────────
  const handleMinimapPanTo = useCallback((clientX: number, clientY: number, svgElement: SVGSVGElement) => {
    if (!funnel) return;
    let minX = -400, minY = -400, maxX = 2400, maxY = 1800;
    if (funnel.nodes.length > 0) {
      minX = Math.min(...funnel.nodes.map(n => n.x)) - 150;
      minY = Math.min(...funnel.nodes.map(n => n.y)) - 150;
      maxX = Math.max(...funnel.nodes.map(n => n.x + 240)) + 150;
      maxY = Math.max(...funnel.nodes.map(n => n.y + 120)) + 150;
    }

    const worldWidth = Math.max(1000, maxX - minX);
    const worldHeight = Math.max(700, maxY - minY);

    const mapWidth = 208;
    const mapHeight = 128;
    const scaleX = mapWidth / worldWidth;
    const scaleY = mapHeight / worldHeight;
    const scale = Math.min(scaleX, scaleY);

    const rect = canvasRef.current?.getBoundingClientRect() || { width: window.innerWidth, height: window.innerHeight };
    const svgRect = svgElement.getBoundingClientRect();
    const clickX = Math.max(0, Math.min(mapWidth, clientX - svgRect.left));
    const clickY = Math.max(0, Math.min(mapHeight, clientY - svgRect.top));

    const targetWorldX = minX + clickX / scale;
    const targetWorldY = minY + clickY / scale;

    const newPanX = rect.width / 2 - targetWorldX * zoom;
    const newPanY = rect.height / 2 - targetWorldY * zoom;

    setPan({ x: Math.round(newPanX), y: Math.round(newPanY) });
  }, [funnel, zoom]);

  useEffect(() => {
    if (!isDraggingMinimap) return;
    const handleMove = (e: MouseEvent) => {
      const svg = document.getElementById('funnel-minimap-svg') as unknown as SVGSVGElement;
      if (svg) {
        handleMinimapPanTo(e.clientX, e.clientY, svg);
      }
    };
    const handleUp = () => {
      setIsDraggingMinimap(false);
    };
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
  }, [isDraggingMinimap, handleMinimapPanTo]);

  // ── 📍 CONVERSÃO DE COORDENADAS DE TELA PARA MUNDO DO CANVAS ────────────
  const getCanvasCoordinates = useCallback((clientX: number, clientY: number) => {
    if (!canvasRef.current) return { x: (clientX - pan.x) / zoom, y: (clientY - pan.y) / zoom };
    const rect = canvasRef.current.getBoundingClientRect();
    return {
      x: (clientX - rect.left - pan.x) / zoom,
      y: (clientY - rect.top - pan.y) / zoom
    };
  }, [pan.x, pan.y, zoom]);

  // ── 🖱️ CONTROLES DO CANVAS (SUPER ZOOM CENTRADO NO CURSOR & PAN) ─────────
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const zoomFactor = e.ctrlKey || e.metaKey ? 1.15 : 1.08;
    const newZoom = Math.max(0.1, Math.min(3.0, e.deltaY < 0 ? zoom * zoomFactor : zoom / zoomFactor));

    if (Math.abs(newZoom - zoom) < 0.001) return;

    // Fórmula matemática de Ancoragem no Cursor (Figma / Miro)
    const worldX = (mouseX - pan.x) / zoom;
    const worldY = (mouseY - pan.y) / zoom;

    const newPanX = mouseX - worldX * newZoom;
    const newPanY = mouseY - worldY * newZoom;

    setZoom(Number(newZoom.toFixed(2)));
    setPan({ x: Math.round(newPanX), y: Math.round(newPanY) });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    // Apenas responde a cliques do botão esquerdo ou do meio
    if (e.button !== 0 && e.button !== 1) return;

    // Se estiver no modo mãozinha, segurar espaço, clicar com botão do meio ou clicar no fundo do canvas
    if (isHandMode || isSpacePressed || e.button === 1 || e.target === canvasRef.current || (e.target as HTMLElement).classList.contains('canvas-background')) {
      const coords = getCanvasCoordinates(e.clientX, e.clientY);
      const canvasX = coords.x;
      const canvasY = coords.y;

      if (!isHandMode && !isSpacePressed && e.button !== 1 && (e.shiftKey || canvasTool === 'select')) {
        // Iniciar Seleção por Retângulo (Marquee)
        setIsSelectingArea(true);
        setSelectionBox({
          startX: canvasX,
          startY: canvasY,
          currentX: canvasX,
          currentY: canvasY
        });
        if (!e.shiftKey) {
          setSelectedNodeIds([]);
        }
        setSelectedConnectionId(null);
      } else {
        // Pan do Canvas
        setIsDraggingCanvas(true);
        setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
        if (!isHandMode && !isSpacePressed && !e.ctrlKey && !e.metaKey && e.button !== 1) {
          setSelectedNodeIds([]);
          setSelectedConnectionId(null);
          setConnectingFromNodeId(null);
          if (isInspectorOpen && !nodeEditDraft) {
            setIsInspectorOpen(false);
          }
        }
      }
    }
  };

  const handleCanvasDoubleClick = (e: React.MouseEvent) => {
    if (e.target === canvasRef.current || (e.target as HTMLElement).classList.contains('canvas-background')) {
      handleFitToScreen();
    }
  };

  // Listener global de mouse para movimentação, seleção em área e arraste a 60fps fluido
  useEffect(() => {
    if (!isDraggingGroup && !isDraggingCanvas && !draggingFrameId && !resizingFrameId && !isSelectingArea) return;

    let animFrameId: number;

    const handleWindowMouseMove = (e: MouseEvent) => {
      cancelAnimationFrame(animFrameId);
      animFrameId = requestAnimationFrame(() => {
        const coords = getCanvasCoordinates(e.clientX, e.clientY);
        const canvasX = coords.x;
        const canvasY = coords.y;

        if (isSelectingArea && selectionBox) {
          setSelectionBox(prev => prev ? { ...prev, currentX: canvasX, currentY: canvasY } : null);

          const minX = Math.min(selectionBox.startX, canvasX);
          const maxX = Math.max(selectionBox.startX, canvasX);
          const minY = Math.min(selectionBox.startY, canvasY);
          const maxY = Math.max(selectionBox.startY, canvasY);

          const currentFunnel = funnelRef.current;
          if (currentFunnel) {
            const boxedIds = currentFunnel.nodes.filter(n => {
              const w = n.subType === 'sticky_note' ? 256 : (n.subType === 'icp_persona' ? 240 : 224);
              const h = n.subType === 'sticky_note' ? 200 : (n.subType === 'icp_persona' ? 140 : 100);
              return n.x + w >= minX && n.x <= maxX && n.y + h >= minY && n.y <= maxY;
            }).map(n => n.id);

            setSelectedNodeIds(boxedIds);
          }
        } else if (isDraggingCanvas) {
          setPan({
            x: e.clientX - dragStart.x,
            y: e.clientY - dragStart.y
          });
        } else if (isDraggingGroup && Object.keys(draggingGroupOffsets).length > 0) {
          setFunnel(prev => {
            if (!prev) return null;
            return {
              ...prev,
              nodes: prev.nodes.map(n => {
                const offset = draggingGroupOffsets[n.id];
                if (offset) {
                  return {
                    ...n,
                    x: Math.round(canvasX - offset.x),
                    y: Math.round(canvasY - offset.y)
                  };
                }
                return n;
              })
            };
          });
        } else if (draggingFrameId) {
          const currentX = Math.round(canvasX - frameDragOffset.x);
          const currentY = Math.round(canvasY - frameDragOffset.y);

          setFunnel(prev => {
            if (!prev) return null;
            return {
              ...prev,
              frames: (prev.frames || []).map(f => f.id === draggingFrameId ? { ...f, x: currentX, y: currentY } : f)
            };
          });
        } else if (resizingFrameId) {
          const newWidth = Math.max(220, Math.round(frameResizeStart.initialWidth + (canvasX - frameResizeStart.x)));
          const newHeight = Math.max(140, Math.round(frameResizeStart.initialHeight + (canvasY - frameResizeStart.y)));

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
      setIsDraggingGroup(false);
      setDraggingGroupOffsets({});
      setDraggingFrameId(null);
      setResizingFrameId(null);
      setIsSelectingArea(false);
      setSelectionBox(null);
    };

    window.addEventListener('mousemove', handleWindowMouseMove);
    window.addEventListener('mouseup', handleWindowMouseUp);

    return () => {
      cancelAnimationFrame(animFrameId);
      window.removeEventListener('mousemove', handleWindowMouseMove);
      window.removeEventListener('mouseup', handleWindowMouseUp);
    };
  }, [isDraggingGroup, isDraggingCanvas, draggingFrameId, resizingFrameId, isSelectingArea, selectionBox, dragStart, pan, zoom, draggingGroupOffsets, frameDragOffset, frameResizeStart, getCanvasCoordinates]);

  // ── 🔲 GESTÃO DE MOLDURAS / ÁREAS VISUAIS FLEXÍVEIS ──────────────────────
  const handleAddFrame = () => {
    const canvasW = canvasRef.current?.clientWidth || 800;
    const canvasH = canvasRef.current?.clientHeight || 600;
    const newFrame: FunnelFrame = {
      id: `frame_${Date.now()}`,
      title: 'Nova Área / Fase',
      color: 'indigo',
      x: Math.round((-pan.x + canvasW / 2 - 260) / zoom),
      y: Math.round((-pan.y + canvasH / 2 - 170) / zoom),
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
    const coords = getCanvasCoordinates(e.clientX, e.clientY);
    setFrameDragOffset({
      x: coords.x - frame.x,
      y: coords.y - frame.y
    });
    setDraggingFrameId(frame.id);
  };

  const handleFrameResizeMouseDown = (e: React.MouseEvent, frame: FunnelFrame) => {
    e.stopPropagation();
    const coords = getCanvasCoordinates(e.clientX, e.clientY);
    setFrameResizeStart({
      x: coords.x,
      y: coords.y,
      initialWidth: frame.width,
      initialHeight: frame.height
    });
    setResizingFrameId(frame.id);
  };

  // ── ⚡ AUTO-ORGANIZAÇÃO SEMÂNTICA POR ESTÁGIOS DA JORNADA (SMART STAGE LAYOUT) ─
  const handleAutoLayout = () => {
    if (!funnel || funnel.nodes.length === 0) return;

    const nodes = [...funnel.nodes];

    // Matriz de Estágios Naturais da Jornada do Funil (0 a 8)
    const SUBTYPE_STAGE_MAP: Record<string, number> = {
      // 0: Estratégia / Planejamento
      icp_persona: 0,
      sticky_note: 0,

      // 1: Tráfego & Atração (Origens)
      pinterest: 1,
      tiktok: 1,
      instagram: 1,
      youtube: 1,
      google_seo: 1,
      meta_ads: 1,
      influencer_partner: 1,
      native_ads: 1,
      partners: 1,

      // 2: Consciência, Entrada & Captura de Leads
      lead_magnet: 2,
      capture_page: 2,
      quiz_page: 2,
      blog_site: 2,
      static_page: 2,
      advertorial: 2,
      bridge_page: 2,

      // 3: Nutrição, VSL & Aquecimento
      email_seq: 3,
      email_broadcast: 3,
      vsl_page: 3,
      quiz_vsl_page: 3,
      webinar_page: 3,
      whatsapp_group: 3,
      whatsapp_bot: 3,
      b2b_qualification: 3,

      // 4: Apresentação & Negociação
      sales_page: 4,
      b2b_meeting: 4,
      b2b_proposal: 4,
      application_page: 4,
      member_area: 4,

      // 5: Fechamento & Conversão Direta (WhatsApp X1 / Checkout / Lojas)
      whatsapp_x1: 5,
      live_chat: 5,
      checkout: 5,
      front_end: 5,
      tripwire_offer: 5,
      bundle_offer: 5,
      affiliate_amazon: 5,
      affiliate_shopee: 5,
      affiliate_mercadolivre: 5,
      affiliate_product: 5,

      // 6: Maximização de Ticket (Bumps / Upsells) & Recuperação
      order_bump: 6,
      upsell: 6,
      downsell: 6,
      upsell_page: 6,
      remarketing: 6,
      whatsapp_auto: 6,
      sms_transactional: 6,
      voice_bot: 6,
      pix_recovery: 6,
      tag_lead: 6,
      delay_timer: 6,
      condition_branch: 6,

      // 7: Fechamento Corporativo & Assinatura Recorrente
      contract_signing: 7,
      corporate_invoice: 7,
      subscription: 7,
      high_ticket: 7,

      // 8: Pós-Venda, Entrega & Retenção
      thank_you_page: 8,
      client_onboarding: 8,
      team_training: 8,
      support_ticket: 8,
      nps_survey: 8,
      referral_program: 8,
      testimonial_request: 8,
      contract_renewal: 8,
      hr_recruitment: 8,

      // 🧭 Jornada do Cliente (Experiência & Psicologia)
      pain_point: 0,
      customer_emotion: 0,
      hesitation_doubt: 4,
      linked_funnel: 4,
      aha_moment: 8,
      delight_touch: 8,
      friction_risk: 8
    };

    const getNodeStage = (node: FunnelNode): number => {
      if (SUBTYPE_STAGE_MAP[node.subType] !== undefined) {
        return SUBTYPE_STAGE_MAP[node.subType];
      }
      switch (node.type) {
        case 'journey':
          return 4;
        case 'icp':
        case 'note':
          return 0;
        case 'traffic':
          return 1;
        case 'page':
          return 4;
        case 'offer':
          return 5;
        case 'automation':
          return 6;
        case 'b2b':
          return 4;
        case 'cs':
        case 'hr':
          return 8;
        default:
          return 3;
      }
    };

    const journeyNodes = nodes.filter(n => n.subType !== 'sticky_note' && n.subType !== 'icp_persona');
    const strategyNodes = nodes.filter(n => n.subType === 'icp_persona');
    const stickyNotes = nodes.filter(n => n.subType === 'sticky_note');

    // 1. Identificar quais estágios estão ativos na tela
    const presentStages = Array.from(new Set(journeyNodes.map(n => getNodeStage(n)))).sort((a, b) => a - b);
    
    // Mapear cada estágio para seu índice de coluna (0, 1, 2...)
    const stageToColumnMap: Record<number, number> = {};
    presentStages.forEach((stage, idx) => {
      stageToColumnMap[stage] = idx;
    });

    // 2. Agrupar os nós da jornada por estágio
    const nodesByStage: Record<number, FunnelNode[]> = {};
    journeyNodes.forEach(node => {
      const st = getNodeStage(node);
      if (!nodesByStage[st]) nodesByStage[st] = [];
      nodesByStage[st].push(node);
    });

    // Ordenar nós dentro do mesmo estágio preservando ordem vertical anterior
    Object.keys(nodesByStage).forEach(stKey => {
      const st = Number(stKey);
      nodesByStage[st].sort((a, b) => (a.y || 0) - (b.y || 0));
    });

    // 3. Parâmetros de grade espacial
    const COLUMN_WIDTH = 340;
    const ROW_HEIGHT = 145;
    const START_X = 100;
    const CENTER_Y = 280;

    const nodePositions: Record<string, { x: number; y: number }> = {};

    // Posicionar nós da jornada em colunas progressivas da esquerda para a direita
    presentStages.forEach(st => {
      const colIndex = stageToColumnMap[st];
      const stageList = nodesByStage[st] || [];
      const colX = START_X + colIndex * COLUMN_WIDTH;
      const totalH = (stageList.length - 1) * ROW_HEIGHT;

      stageList.forEach((node, nodeIdx) => {
        const nodeY = Math.round(CENTER_Y + (nodeIdx * ROW_HEIGHT) - (totalH / 2));
        nodePositions[node.id] = { x: colX, y: nodeY };
      });
    });

    // Posicionar ICPs acima do funil
    strategyNodes.forEach((icpNode, idx) => {
      nodePositions[icpNode.id] = {
        x: START_X + idx * 260,
        y: 60
      };
    });

    // Posicionar Post-its organizados abaixo do fluxo
    const maxJourneyY = Math.max(CENTER_Y + 150, ...Object.values(nodePositions).map(p => p.y));
    stickyNotes.forEach((stickyNode, idx) => {
      nodePositions[stickyNode.id] = {
        x: START_X + (idx % 3) * 270,
        y: maxJourneyY + 180 + Math.floor(idx / 3) * 220
      };
    });

    const updatedNodes = nodes.map(node => {
      if (nodePositions[node.id]) {
        return { ...node, x: nodePositions[node.id].x, y: nodePositions[node.id].y };
      }
      return node;
    });

    setFunnel(prev => prev ? { ...prev, nodes: updatedNodes } : null);
    toast.success('⚡ Funil auto-organizado por estágios da jornada (Tráfego ➡️ Vendas ➡️ Fechamento ➡️ Pós-Venda)!');
  };

  // ── 📋 CLIPBOARD & DUPLICAÇÃO DE BLOCOS (CTRL+C / CTRL+V / CTRL+D) ─────────
  const handleCopySelection = useCallback(() => {
    if (!funnel || selectedNodeIds.length === 0) {
      toast.info('Selecione um ou mais blocos para copiar.');
      return;
    }
    const nodesToCopy = funnel.nodes.filter(n => selectedNodeIds.includes(n.id));
    const internalConnections = funnel.connections.filter(
      c => selectedNodeIds.includes(c.fromNodeId) && selectedNodeIds.includes(c.toNodeId)
    );
    setCopiedNodesBuffer({ nodes: nodesToCopy, connections: internalConnections });
    toast.info(`📋 ${nodesToCopy.length} ${nodesToCopy.length === 1 ? 'bloco copiado' : 'blocos copiados'}! Pressione Ctrl+V para colar.`);
  }, [funnel, selectedNodeIds]);

  const handlePasteSelection = useCallback((customOffset?: { x: number; y: number }) => {
    if (!funnel || !copiedNodesBuffer || copiedNodesBuffer.nodes.length === 0) {
      toast.info('Nenhum bloco copiado para colar.');
      return;
    }

    const idMap: Record<string, string> = {};
    const timestamp = Date.now();

    copiedNodesBuffer.nodes.forEach((node, idx) => {
      idMap[node.id] = `node_${timestamp}_${idx}_${Math.random().toString(36).substr(2, 5)}`;
    });

    const offsetX = customOffset?.x ?? 50;
    const offsetY = customOffset?.y ?? 50;

    const clonedNodes: FunnelNode[] = copiedNodesBuffer.nodes.map(n => ({
      ...n,
      id: idMap[n.id],
      x: n.x + offsetX,
      y: n.y + offsetY
    }));

    const clonedConnections: FunnelConnection[] = copiedNodesBuffer.connections.map((c, idx) => ({
      ...c,
      id: `conn_${timestamp}_${idx}_${Math.random().toString(36).substr(2, 5)}`,
      fromNodeId: idMap[c.fromNodeId],
      toNodeId: idMap[c.toNodeId]
    }));

    setFunnel(prev => {
      if (!prev) return null;
      return {
        ...prev,
        nodes: [...prev.nodes, ...clonedNodes],
        connections: [...prev.connections, ...clonedConnections]
      };
    });

    // Selecionar os novos nós colados para facilitar o arraste imediato
    const newSelectedIds = Object.values(idMap);
    setSelectedNodeIds(newSelectedIds);
    toast.success(`📋 ${clonedNodes.length} ${clonedNodes.length === 1 ? 'bloco colado' : 'blocos colados'} com sucesso!`);
  }, [funnel, copiedNodesBuffer]);

  const handleDuplicateSelection = useCallback(() => {
    if (!funnel || selectedNodeIds.length === 0) return;
    const nodesToCopy = funnel.nodes.filter(n => selectedNodeIds.includes(n.id));
    if (nodesToCopy.length === 0) return;

    const internalConnections = funnel.connections.filter(
      c => selectedNodeIds.includes(c.fromNodeId) && selectedNodeIds.includes(c.toNodeId)
    );
    const idMap: Record<string, string> = {};
    const timestamp = Date.now();

    nodesToCopy.forEach((node, idx) => {
      idMap[node.id] = `node_${timestamp}_${idx}_${Math.random().toString(36).substr(2, 5)}`;
    });

    const clonedNodes: FunnelNode[] = nodesToCopy.map(n => ({
      ...n,
      id: idMap[n.id],
      x: n.x + 50,
      y: n.y + 50
    }));

    const clonedConnections: FunnelConnection[] = internalConnections.map((c, idx) => ({
      ...c,
      id: `conn_${timestamp}_${idx}_${Math.random().toString(36).substr(2, 5)}`,
      fromNodeId: idMap[c.fromNodeId],
      toNodeId: idMap[c.toNodeId]
    }));

    setFunnel(prev => {
      if (!prev) return null;
      return {
        ...prev,
        nodes: [...prev.nodes, ...clonedNodes],
        connections: [...prev.connections, ...clonedConnections]
      };
    });

    setSelectedNodeIds(Object.values(idMap));
    toast.success(`✨ ${clonedNodes.length} ${clonedNodes.length === 1 ? 'bloco duplicado' : 'blocos duplicados'}!`);
  }, [funnel, selectedNodeIds]);

  // ── 🔍 DESTAQUE INTELIGENTE DE TRILHA (SMART DIMMING) ────────────────────
  const activeFocusId = hoveredNodeId || (selectedNodeIds.length === 1 ? selectedNodeIds[0] : null);

  const { connectedNodeIds, connectedConnectionIds } = useMemo(() => {
    if (!activeFocusId || !funnel) {
      return { connectedNodeIds: new Set<string>(), connectedConnectionIds: new Set<string>() };
    }
    const nodeSet = new Set<string>([activeFocusId]);
    const connSet = new Set<string>();

    funnel.connections.forEach(c => {
      if (c.fromNodeId === activeFocusId) {
        nodeSet.add(c.toNodeId);
        connSet.add(c.id);
      }
      if (c.toNodeId === activeFocusId) {
        nodeSet.add(c.fromNodeId);
        connSet.add(c.id);
      }
    });

    return { connectedNodeIds: nodeSet, connectedConnectionIds: connSet };
  }, [activeFocusId, funnel]);

  // ── 📦 GESTÃO DE GRUPOS & AÇÕES EM LOTE ───────────────────────────────────
  const handleDeleteSelectedNodes = () => {
    if (selectedNodeIds.length === 0 || !funnel) return;
    const count = selectedNodeIds.length;
    setFunnel(prev => {
      if (!prev) return null;
      return {
        ...prev,
        nodes: prev.nodes.filter(n => !selectedNodeIds.includes(n.id)),
        connections: prev.connections.filter(c => !selectedNodeIds.includes(c.fromNodeId) && !selectedNodeIds.includes(c.toNodeId))
      };
    });
    setSelectedNodeIds([]);
    setNodeEditDraft(null);
    setIsInspectorOpen(false);
    toast.success(`${count} ${count === 1 ? 'bloco removido' : 'blocos removidos'} com sucesso!`);
  };

  const handleCreateFrameAroundSelection = () => {
    if (!funnel || selectedNodeIds.length === 0) return;
    const selectedNodes = funnel.nodes.filter(n => selectedNodeIds.includes(n.id));
    if (selectedNodes.length === 0) return;

    const minX = Math.min(...selectedNodes.map(n => n.x)) - 30;
    const minY = Math.min(...selectedNodes.map(n => n.y)) - 55;
    const maxX = Math.max(...selectedNodes.map(n => n.x + (n.subType === 'sticky_note' ? 256 : 224))) + 30;
    const maxY = Math.max(...selectedNodes.map(n => n.y + (n.subType === 'sticky_note' ? 200 : 90))) + 30;

    const newFrame: FunnelFrame = {
      id: `frame_${Date.now()}`,
      title: `Área (${selectedNodes.length} blocos)`,
      color: 'indigo',
      x: Math.round(minX),
      y: Math.round(minY),
      width: Math.max(300, Math.round(maxX - minX)),
      height: Math.max(200, Math.round(maxY - minY))
    };

    setFunnel(prev => prev ? {
      ...prev,
      frames: [...(prev.frames || []), newFrame]
    } : null);

    toast.success('📦 Moldura criada automaticamente ao redor dos blocos selecionados!');
  };

  const handleAlignNodes = (type: 'horizontal' | 'vertical' | 'left' | 'top') => {
    if (!funnel || selectedNodeIds.length < 2) return;
    const selectedNodes = funnel.nodes.filter(n => selectedNodeIds.includes(n.id));
    if (selectedNodes.length < 2) return;

    const isHoriz = type === 'horizontal' || type === 'top';
    const sorted = [...selectedNodes].sort((a, b) => isHoriz ? a.x - b.x : a.y - b.y);
    const avgCross = Math.round(sorted.reduce((acc, n) => acc + (isHoriz ? n.y : n.x), 0) / sorted.length);
    let curPos = isHoriz ? sorted[0].x : sorted[0].y;
    const coords: Record<string, { x: number; y: number }> = {};

    sorted.forEach(n => {
      const size = isHoriz 
        ? (n.subType === 'sticky_note' ? 256 : (n.subType === 'icp_persona' ? 240 : 224)) 
        : (n.subType === 'sticky_note' ? 200 : (n.subType === 'icp_persona' ? 120 : 90));
      coords[n.id] = isHoriz ? { x: curPos, y: avgCross } : { x: avgCross, y: curPos };
      curPos += size + (isHoriz ? 80 : 45);
    });

    setFunnel(prev => prev ? { ...prev, nodes: prev.nodes.map(n => coords[n.id] ? { ...n, ...coords[n.id] } : n) } : null);
    toast.success(`Blocos organizados em ${isHoriz ? 'linha horizontal' : 'coluna vertical'} com espaçamento harmônico!`);
  };

  // ── 📝 EDIÇÃO DE NÓS (DRAFT BUFFER) ───────────────────────────────────────
  const handleOpenNodeEditor = (node: FunnelNode) => {
    setSelectedNodeIds([node.id]);
    setSelectedConnectionId(null);
    setNodeEditDraft(JSON.parse(JSON.stringify(node)));
    setIsInspectorOpen(true);
    setInspectorTab('config');
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
    toast.success('Alterações da etapa salvas!');
  };

  const handleCancelNodeDraft = () => {
    setNodeEditDraft(null);
    setIsInspectorOpen(false);
  };

  const updateDraftField = (field: keyof FunnelNode, value: any) => {
    setNodeEditDraft(prev => {
      const base = prev || funnel?.nodes.find(n => selectedNodeIds.includes(n.id));
      if (!base) return null;
      return {
        ...base,
        [field]: value
      };
    });
  };

  const handleAddChecklistItem = (activeNode: FunnelNode) => {
    if (!newChecklistText.trim()) return;
    const newItem: FunnelChecklistItem = {
      id: `chk-${Date.now()}`,
      text: newChecklistText.trim(),
      done: false
    };
    const currentList = activeNode.checklist || [];
    updateDraftField('checklist', [...currentList, newItem]);
    setNewChecklistText('');
  };

  const handleToggleChecklistItem = (activeNode: FunnelNode, id: string, done: boolean) => {
    const currentList = activeNode.checklist || [];
    const updated = currentList.map(item => item.id === id ? { ...item, done } : item);
    updateDraftField('checklist', updated);
  };

  const handleDeleteChecklistItem = (activeNode: FunnelNode, id: string) => {
    const currentList = activeNode.checklist || [];
    const updated = currentList.filter(item => item.id !== id);
    updateDraftField('checklist', updated);
  };

  const handleLoadTemplateChecklist = (activeNodeMeta?: BlockMeta) => {
    if (!activeNodeMeta?.checklist) return;
    const templateItems: FunnelChecklistItem[] = activeNodeMeta.checklist.map((task, i) => ({
      id: `chk-${Date.now()}-${i}`,
      text: task,
      done: false
    }));
    updateDraftField('checklist', templateItems);
    toast.success('Checklist padrão carregado com sucesso!');
  };

  // ── ➕ ADICIONAR BLOCO DO CATÁLOGO ────────────────────────────────────────
  const handleAddBlock = (blockMeta: BlockMeta) => {
    const canvasWidth = canvasRef.current?.clientWidth || window.innerWidth;
    const canvasHeight = canvasRef.current?.clientHeight || window.innerHeight;
    const canvasCenterX = Math.round((-pan.x + canvasWidth / 2) / zoom);
    const canvasCenterY = Math.round((-pan.y + canvasHeight / 2) / zoom);

    const newNode: FunnelNode = {
      id: `node-${Date.now()}`,
      type: blockMeta.type,
      subType: blockMeta.subType,
      label: blockMeta.name,
      subtitle: blockMeta.description,
      x: canvasCenterX + Math.floor(Math.random() * 60) - 30,
      y: canvasCenterY + Math.floor(Math.random() * 60) - 30,
      conversionRate: blockMeta.defaultConversionRate || 10,
      status: 'idea',
      noteColor: 'yellow',
      checklist: (blockMeta.checklist || []).map((task, i) => ({
        id: `chk-${Date.now()}-${i}`,
        text: task,
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

    setSelectedNodeIds([newNode.id]);
    toast.success(`Bloco "${blockMeta.name}" adicionado!`);
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
        const fromNode = funnel.nodes.find(n => n.id === connectingFromNodeId);
        const toNode = funnel.nodes.find(n => n.id === nodeId);
        
        let defaultIntent: 'conversion' | 'recovery' | 'loop' | 'upsell' | 'neutral' = 'neutral';
        if (fromNode?.type === 'traffic' || toNode?.type === 'offer') defaultIntent = 'conversion';
        if (fromNode?.subType === 'email_seq' || fromNode?.subType === 'remarketing') defaultIntent = 'recovery';
        if (toNode?.subType === 'upsell' || toNode?.subType === 'order_bump') defaultIntent = 'upsell';

        const newConn: FunnelConnection = {
          id: `conn-${Date.now()}`,
          fromNodeId: connectingFromNodeId,
          toNodeId: nodeId,
          style: 'solid',
          intent: defaultIntent
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

    const coords = getCanvasCoordinates(e.clientX, e.clientY);
    const canvasX = coords.x;
    const canvasY = coords.y;

    if (e.shiftKey || e.ctrlKey || e.metaKey) {
      // Multi-seleção com clique
      setSelectedNodeIds(prev => 
        prev.includes(node.id) ? prev.filter(id => id !== node.id) : [...prev, node.id]
      );
    } else {
      // Se clicou num nó já selecionado no grupo, preserva o grupo para permitir o arraste conjunto!
      let currentSelection = selectedNodeIds;
      if (!selectedNodeIds.includes(node.id)) {
        currentSelection = [node.id];
        setSelectedNodeIds([node.id]);
      }
      setSelectedConnectionId(null);

      // Prepara offsets de arraste do grupo
      if (funnel) {
        const offsets: Record<string, { x: number; y: number }> = {};
        currentSelection.forEach(nId => {
          const target = funnel.nodes.find(n => n.id === nId);
          if (target) {
            offsets[nId] = {
              x: canvasX - target.x,
              y: canvasY - target.y
            };
          }
        });
        setDraggingGroupOffsets(offsets);
        setIsDraggingGroup(true);
      }
    }
  };

  const selectedNode = useMemo(() => {
    return funnel?.nodes.find(n => n.id === selectedNodeId) || null;
  }, [funnel?.nodes, selectedNodeId]);

  // ── 📊 SIMULADOR DE TRÁFEGO & MÉTRICAS ────────────────────────────────────
  const simulationResults = useMemo(() => {
    if (!funnel) return { totalRevenue: 0, estimatedCost: 0, netProfit: 0, roas: 0, bottleneckIds: [] as string[] };

    let totalRevenue = 0;
    let estimatedCost = 0;
    const bottleneckIds: string[] = [];

    const trafficMap: Record<string, number> = {};

    const trafficNodes = funnel.nodes.filter(n => n.type === 'traffic');
    const initialPerSource = trafficNodes.length > 0 ? initialTrafficInput / trafficNodes.length : initialTrafficInput;

    trafficNodes.forEach(tNode => {
      trafficMap[tNode.id] = initialPerSource;
      if (tNode.costPerClick && tNode.costPerClick > 0) {
        estimatedCost += initialPerSource * tNode.costPerClick;
      }
    });

    funnel.connections.forEach(conn => {
      const fromTraffic = trafficMap[conn.fromNodeId] || 0;
      const fromNode = funnel.nodes.find(n => n.id === conn.fromNodeId);
      const toNode = funnel.nodes.find(n => n.id === conn.toNodeId);

      if (fromNode && toNode) {
        const convRate = (fromNode.conversionRate || 100) / 100;
        const convertedVisitors = fromTraffic * convRate;
        trafficMap[toNode.id] = (trafficMap[toNode.id] || 0) + convertedVisitors;

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

        if ((fromNode.type === 'page' || fromNode.type === 'offer') && (fromNode.conversionRate || 0) < 3.0) {
          if (!bottleneckIds.includes(fromNode.id)) {
            bottleneckIds.push(fromNode.id);
          }
        }
      }
    });

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

  // ── 📐 GERADOR DE CAMINHO DE CONEXÃO (PORTAS MAGNÉTICAS FIXAS LATERAL-A-LATERAL) ──
  const calculateConnectionPath = (fromNode: FunnelNode, toNode: FunnelNode, style: 'bezier' | 'orthogonal') => {
    const fromWidth = fromNode.subType === 'sticky_note' ? 256 : fromNode.subType === 'icp_persona' ? 240 : 224;
    const toWidth = toNode.subType === 'sticky_note' ? 256 : toNode.subType === 'icp_persona' ? 240 : 224;

    const fromHeight = fromNode.subType === 'sticky_note' ? 200 : fromNode.subType === 'icp_persona' ? 120 : 90;
    const toHeight = toNode.subType === 'sticky_note' ? 200 : toNode.subType === 'icp_persona' ? 120 : 90;

    // Portas Fixas Estáveis: Saída sempre no centro vertical da lateral direita, Entrada sempre no centro vertical da lateral esquerda
    const startX = fromNode.x + fromWidth;
    const startY = fromNode.y + fromHeight / 2;
    const endX = toNode.x;
    const endY = toNode.y + toHeight / 2;

    const isBackwards = startX >= endX - 20;

    if (isBackwards) {
      // Curva contínua de retorno elegante contornando os cards sem descolar das portas laterais
      if (style === 'orthogonal') {
        const dropY = startY <= endY ? Math.max(startY, endY) + 70 : Math.min(startY, endY) - 70;
        const outX = startX + 30;
        const inX = endX - 30;
        return `M ${startX} ${startY} L ${outX} ${startY} L ${outX} ${dropY} L ${inX} ${dropY} L ${inX} ${endY} L ${endX} ${endY}`;
      } else {
        const loopMargin = Math.max(80, Math.abs(startX - endX) * 0.4);
        const controlX1 = startX + loopMargin;
        const controlX2 = endX - loopMargin;
        const controlY1 = startY + (startY <= endY ? 80 : -80);
        const controlY2 = endY + (startY <= endY ? -80 : 80);
        return `M ${startX} ${startY} C ${controlX1} ${controlY1}, ${controlX2} ${controlY2}, ${endX} ${endY}`;
      }
    } else {
      // Fluxo normal contínuo da esquerda para a direita
      if (style === 'orthogonal') {
        const midX = (startX + endX) / 2;
        return `M ${startX} ${startY} L ${midX} ${startY} L ${midX} ${endY} L ${endX} ${endY}`;
      } else {
        const deltaX = Math.max(40, (endX - startX) * 0.5);
        return `M ${startX} ${startY} C ${startX + deltaX} ${startY}, ${endX - deltaX} ${endY}, ${endX} ${endY}`;
      }
    }
  };

  // Renderizar Ícone Dinâmico
  const renderNodeIcon = (iconName: string, size = 18) => {
    const icons: Record<string, any> = {
      Pin, Video, Instagram, PlaySquare, Search, MessageCircle,
      Magnet, FileText, CreditCard, Gift, Package, Zap, Repeat,
      Crown, Mail, Send, RefreshCw, Play, Tv, HelpCircle, Sparkles, CheckCircle2,
      ShoppingBag, Globe, Pencil,
      Calendar, PhoneCall, Briefcase, FileSignature, Receipt, Rocket, LifeBuoy,
      Star, RefreshCcw, Clock, GitBranch, Smartphone, Mic, UserCheck, GraduationCap, Inbox,
      Target, StickyNote, BoxSelect, Wand2, MousePointer, Workflow, Spline,
      MessageSquare, Bot, MessageSquareCode, Layers3, Flame, Ticket, Share2, FileSpreadsheet, UserPlus, Tag, Copy, Users,
      GitFork, HeartHandshake, Smile, Frown, Meh, AlertOctagon, Compass, Eye
    };
    const IconComp = icons[iconName] || Layers;
    return <IconComp size={size} />;
  };

  // ── ⌨️ ATALHOS DE TECLADO & NAVEGAÇÃO ESPACIAL ──────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).tagName === 'INPUT' || (e.target as HTMLElement).tagName === 'TEXTAREA') return;

      if (e.code === 'Space' && !e.repeat) {
        e.preventDefault();
        setIsSpacePressed(true);
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedNodeIds.length > 0) {
          handleDeleteSelectedNodes();
        } else if (selectedConnectionId) {
          handleDeleteSelectedConnection();
        }
      } else if (e.key === 'Escape') {
        if (isFullscreen) {
          setIsFullscreen(false);
          if (document.fullscreenElement) {
            document.exitFullscreen?.().catch(() => {});
          }
        }
        setSelectedNodeIds([]);
        setSelectedConnectionId(null);
        setConnectingFromNodeId(null);
        setIsInspectorOpen(false);
        setIsSelectingArea(false);
        setSelectionBox(null);
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'c' || e.key === 'C')) {
        if (selectedNodeIds.length > 0) {
          e.preventDefault();
          handleCopySelection();
        }
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'v' || e.key === 'V')) {
        if (copiedNodesBuffer && copiedNodesBuffer.nodes.length > 0) {
          e.preventDefault();
          handlePasteSelection();
        }
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'd' || e.key === 'D')) {
        if (selectedNodeIds.length > 0) {
          e.preventDefault();
          handleDuplicateSelection();
        }
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'a' || e.key === 'A')) {
        e.preventDefault();
        if (funnel && funnel.nodes.length > 0) {
          setSelectedNodeIds(funnel.nodes.map(n => n.id));
          toast.info(`${funnel.nodes.length} blocos selecionados.`);
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key === '0') {
        e.preventDefault();
        setZoom(1);
        setPan({ x: 150, y: 100 });
      } else if ((e.ctrlKey || e.metaKey || e.shiftKey) && (e.key === '1' || e.key === '!')) {
        e.preventDefault();
        handleFitToScreen();
      } else if (e.key === 'f' || e.key === 'F') {
        if (!e.ctrlKey && !e.metaKey && !e.altKey) {
          e.preventDefault();
          toggleFullscreen();
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setIsSpacePressed(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [selectedNodeIds, selectedConnectionId, funnel, isFullscreen, copiedNodesBuffer, handleCopySelection, handlePasteSelection, handleDuplicateSelection, handleDeleteSelectedNodes, handleDeleteSelectedConnection, handleFitToScreen, toggleFullscreen]);

  if (loading || !funnel) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-[#050914] text-white">
        <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin mb-3" />
        <p className="text-sm text-gray-400 font-medium">Carregando arquiteto de funis...</p>
      </div>
    );
  }

  const editorContent = (
    <div 
      ref={editorContainerRef}
      className={`flex flex-col bg-[#050914] text-white overflow-hidden select-none font-sans ${
        isFullscreen ? 'fixed inset-0 z-[999999] w-screen h-screen' : 'flex-1 h-full'
      }`}
    >
      
      {/* ── BARRA SUPERIOR (HEADER & CONTROLES PRINCIPAIS) ────────────────────────── */}
      <div className="h-16 border-b border-white/10 bg-[#090e1c]/90 backdrop-blur-xl px-4 flex items-center justify-between z-30 shrink-0 shadow-lg">
        
        {/* Lado Esquerdo: Voltar, Título e Categoria */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/funnels')}
            className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
            title="Voltar para a lista de funis"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div>
            <input
              type="text"
              value={funnel.title}
              onChange={(e) => setFunnel(prev => prev ? { ...prev, title: e.target.value } : null)}
              className="bg-transparent font-black text-sm lg:text-base text-white hover:bg-white/5 focus:bg-white/10 rounded-lg px-2 py-0.5 transition-colors focus:outline-none focus:ring-1 focus:ring-indigo-500 max-w-xs lg:max-w-md truncate"
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

        {/* Centro: Ferramentas de Visualização & Organização Inteligente */}
        <div className="hidden lg:flex items-center gap-2 bg-black/60 border border-white/10 p-1.5 rounded-2xl shadow-inner">
          
          {/* Alternador de Ferramenta (Pan vs Seleção por Área) */}
          <div className="flex items-center bg-white/5 rounded-xl p-0.5 border border-white/5">
            <button
              onClick={() => setCanvasTool('pan')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                canvasTool === 'pan' ? 'bg-indigo-600 text-white shadow' : 'text-gray-400 hover:text-white'
              }`}
              title="Ferramenta Mão / Arrastar Canvas"
            >
              <Move className="w-3.5 h-3.5" />
              <span>Navegar</span>
            </button>
            <button
              onClick={() => setCanvasTool('select')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                canvasTool === 'select' ? 'bg-indigo-600 text-white shadow' : 'text-gray-400 hover:text-white'
              }`}
              title="Ferramenta Seleção por Área (Marquee Box)"
            >
              <MousePointer className="w-3.5 h-3.5" />
              <span>Selecionar Área</span>
            </button>
          </div>

          <div className="w-px h-5 bg-white/10"></div>

          {/* Alternador de Estilo de Linha (Bézier vs Ortogonal) */}
          <div className="flex items-center bg-white/5 rounded-xl p-0.5 border border-white/5">
            <button
              onClick={() => setRoutingStyle('bezier')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                routingStyle === 'bezier' ? 'bg-indigo-600 text-white shadow' : 'text-gray-400 hover:text-white'
              }`}
              title="Linhas em Curvas Suaves (Bézier)"
            >
              <Spline className="w-3.5 h-3.5" />
              <span>Curvas</span>
            </button>
            <button
              onClick={() => setRoutingStyle('orthogonal')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                routingStyle === 'orthogonal' ? 'bg-indigo-600 text-white shadow' : 'text-gray-400 hover:text-white'
              }`}
              title="Linhas Ortogonais em Ângulo Reto (90° Grid)"
            >
              <Workflow className="w-3.5 h-3.5" />
              <span>Ortogonal (90°)</span>
            </button>
          </div>

          <div className="w-px h-5 bg-white/10"></div>

          {/* Modo Foco / Isolar Trilha */}
          <button
            onClick={() => setFocusMode(prev => !prev)}
            className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border ${
              focusMode ? 'bg-purple-600/30 border-purple-500 text-purple-200' : 'bg-white/5 border-white/5 text-gray-400 hover:text-white'
            }`}
            title="Isolar visualmente apenas a trilha do bloco selecionado/hover"
          >
            <Focus className="w-3.5 h-3.5" />
            <span>Modo Foco</span>
          </button>

          {/* Botão Auto-Organizar */}
          <button
            onClick={handleAutoLayout}
            className="px-3 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm"
            title="Auto-organizar todo o funil em colunas e camadas harmoniosas com 1 clique"
          >
            <Wand2 className="w-3.5 h-3.5 text-amber-400" />
            <span>Auto-Organizar</span>
          </button>
        </div>

        {/* Lado Direito: Ações Principais */}
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

          {/* Botão de Excluir Conexão Selecionada */}
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

          {/* Botão de Salvar */}
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
                placeholder="Buscar blocos..."
                value={blockSearchQuery}
                onChange={(e) => setBlockSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-black/40 border border-white/10 rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Lista de Blocos por Categoria */}
          <div className="flex-1 overflow-y-auto p-3 space-y-4 custom-scrollbar">
            {['journey', 'icp', 'note', 'traffic', 'page', 'offer', 'affiliate', 'automation', 'b2b', 'cs', 'hr'].map(catKey => {
              const blocks = FUNNEL_BLOCK_CATALOG.filter(b => {
                const matchesCat = b.type === catKey || (catKey === 'affiliate' && b.subType.startsWith('affiliate_'));
                const desc = b.strategicGuide?.description || '';
                const matchesSearch = !blockSearchQuery || 
                  b.name.toLowerCase().includes(blockSearchQuery.toLowerCase()) ||
                  desc.toLowerCase().includes(blockSearchQuery.toLowerCase());
                return matchesCat && matchesSearch;
              });

              if (blocks.length === 0) return null;

              const categoryLabels: Record<string, string> = {
                journey: '🧭 Jornada do Cliente (Psicologia & Sub-Funil)',
                icp: '🎯 Perfil de Cliente Ideal (ICP)',
                note: '📝 Anotações & Post-its',
                traffic: '🚀 Tráfego & Atração',
                page: '📄 Páginas & Etapas Web',
                offer: '💰 Ofertas & Monetização',
                affiliate: '🛍️ Afiliados & Lojas',
                automation: '⚡ E-mail & Multicanal',
                b2b: '🏢 Vendas B2B Corporativas',
                cs: '💎 Sucesso do Cliente (CS)',
                hr: '👥 RH & Equipe'
              };

                            const isOpen = openCategories[catKey] !== false;

              return (
                <div key={catKey} className="rounded-xl border border-white/5 bg-white/[0.01] overflow-hidden transition-all">
                  <button 
                    onClick={() => toggleCategory(catKey)}
                    className="w-full flex items-center justify-between p-2 px-2.5 hover:bg-white/[0.04] text-left transition-colors group cursor-pointer"
                  >
                    <span className="text-[11px] font-black text-gray-300 group-hover:text-white uppercase tracking-wider flex items-center gap-1.5 truncate">
                      {categoryLabels[catKey] || catKey}
                    </span>
                    <div className="flex items-center gap-1.5 shrink-0 ml-1">
                      <span className="text-[9px] font-bold text-gray-500 bg-white/5 px-1.5 py-0.5 rounded-md">
                        {blocks.length}
                      </span>
                      <ChevronDown className={`w-3.5 h-3.5 text-gray-400 group-hover:text-white transition-transform duration-200 ${
                        isOpen ? 'rotate-0' : '-rotate-90'
                      }`} />
                    </div>
                  </button>

                  {isOpen && (
                    <div className="p-2 pt-0 space-y-1.5">
                      {blocks.map(block => (
                        <button
                          key={block.subType}
                          onClick={() => handleAddBlock(block)}
                          className="w-full p-2 rounded-xl bg-white/[0.02] hover:bg-white/[0.07] border border-white/5 hover:border-indigo-500/40 text-left transition-colors group flex items-start gap-2.5"
                        >
                          <div className={`p-1.5 rounded-lg border shrink-0 ${block.badgeColor}`}>
                            {renderNodeIcon(block.iconName, 14)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <span className="text-xs font-bold text-gray-200 group-hover:text-white block truncate">
                              {block.name}
                            </span>
                            <span className="text-[10px] text-gray-500 block truncate">
                              {block.description}
                            </span>
                          </div>
                          <Plus className="w-3.5 h-3.5 text-gray-500 group-hover:text-indigo-400 mt-1 shrink-0" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Botão flutuante para reabrir a Biblioteca caso esteja fechada */}
        {!isLibraryOpen && (
          <button
            onClick={() => setIsLibraryOpen(true)}
            className="absolute left-4 top-4 z-20 px-3 py-2 bg-[#090e1c]/90 border border-white/10 rounded-xl text-xs font-bold text-gray-300 hover:text-white hover:bg-indigo-600 transition-all shadow-xl flex items-center gap-2 backdrop-blur-xl"
          >
            <Layers className="w-4 h-4 text-indigo-400" />
            <span>Biblioteca</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        )}

        {/* ── ÁREA INFINITA DO CANVAS (GRID INTERATIVO) ────────────────────────── */}
        <div 
          ref={canvasRef}
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onDoubleClick={handleCanvasDoubleClick}
          className={`flex-1 h-full relative overflow-hidden bg-[#050914] select-none ${
            (isHandMode || isSpacePressed) ? 'cursor-grab active:cursor-grabbing' : (
              canvasTool === 'select' ? 'cursor-crosshair' : (isDraggingCanvas ? 'cursor-grabbing' : 'cursor-grab')
            )
          }`}
          style={{
            backgroundImage: `
              radial-gradient(circle at 50% 50%, rgba(99, 102, 241, 0.04) 0%, transparent 80%),
              radial-gradient(circle, rgba(255, 255, 255, 0.07) 1px, transparent 1px)
            `,
            backgroundSize: `${32 * zoom}px ${32 * zoom}px`,
            backgroundPosition: `${pan.x}px ${pan.y}px`
          }}
        >
          {/* Container transformado por Zoom e Pan */}
          <div
            className="absolute inset-0 origin-top-left pointer-events-none"
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`
            }}
          >

            {/* ── 🔲 RENDERIZAÇÃO DE MOLDURAS (FRAMES) LIVRES ──────────────────── */}
            {(funnel.frames || []).map(frame => {
              const theme = FRAME_COLORS[frame.color] || FRAME_COLORS.indigo;
              return (
                <div
                  key={frame.id}
                  onMouseDown={(e) => handleFrameMouseDown(e, frame)}
                  style={{
                    left: `${frame.x}px`,
                    top: `${frame.y}px`,
                    width: `${frame.width}px`,
                    height: `${frame.height}px`
                  }}
                  className={`absolute rounded-3xl border-2 pointer-events-auto transition-shadow group shadow-2xl backdrop-blur-sm z-10 ${theme.border} ${theme.bg} ${
                    draggingFrameId === frame.id ? 'shadow-indigo-500/20 ring-2 ring-indigo-500/40' : ''
                  }`}
                >
                  {/* Cabeçalho da Moldura */}
                  <div className={`px-4 py-2 rounded-t-[22px] border-b flex items-center justify-between cursor-move select-none ${theme.header}`}>
                    <div className="flex items-center gap-2 flex-1 mr-3">
                      <span className={`w-2.5 h-2.5 rounded-full ${theme.activeDot} shrink-0`}></span>
                      <input
                        type="text"
                        value={frame.title}
                        onChange={(e) => handleUpdateFrame(frame.id, { title: e.target.value })}
                        onMouseDown={(e) => e.stopPropagation()}
                        className={`bg-transparent font-black text-xs uppercase tracking-wider focus:outline-none focus:ring-1 focus:ring-white/20 rounded px-1.5 py-0.5 w-full ${theme.text}`}
                        placeholder="Nome da Área..."
                      />
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      {/* Seletor de Cor da Moldura */}
                      <div className="flex items-center gap-1 bg-black/40 p-1 rounded-lg border border-white/10">
                        {Object.keys(FRAME_COLORS).map(c => (
                          <button
                            key={c}
                            onClick={(e) => { e.stopPropagation(); handleUpdateFrame(frame.id, { color: c as any }); }}
                            className={`w-2.5 h-2.5 rounded-full ${FRAME_COLORS[c].activeDot} hover:scale-125 transition-transform ${
                              frame.color === c ? 'ring-2 ring-white scale-110' : 'opacity-70'
                            }`}
                            title={FRAME_COLORS[c].label}
                          />
                        ))}
                      </div>

                      <button
                        onClick={(e) => { e.stopPropagation(); handleDeleteFrame(frame.id); }}
                        className="p-1 text-gray-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-md transition-colors"
                        title="Excluir Moldura"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Alça de Redimensionamento no Canto Inferior Direito */}
                  <div
                    onMouseDown={(e) => handleFrameResizeMouseDown(e, frame)}
                    className="absolute right-1 bottom-1 w-5 h-5 cursor-nwse-resize flex items-center justify-center opacity-60 group-hover:opacity-100 hover:scale-125 transition-all text-white/50 hover:text-white"
                    title="Arrastar para Redimensionar Área"
                  >
                    <ArrowDownRight className="w-4 h-4" />
                  </div>
                </div>
              );
            })}

            {/* ── 📐 CAMADA SVG DE CONEXÕES (LINHAS DINÂMICAS) ────────────────── */}
            <svg className="absolute inset-0 w-[50000px] h-[50000px] pointer-events-none -translate-x-[25000px] -translate-y-[25000px] overflow-visible">
              <g transform="translate(25000, 25000)">
                <defs>
                  {/* Marcadores de Seta por Intenção */}
                  <marker id="arrow-emerald" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                    <path d="M 0 1 L 10 5 L 0 9 z" fill="#10b981" />
                  </marker>
                  <marker id="arrow-amber" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                    <path d="M 0 1 L 10 5 L 0 9 z" fill="#f59e0b" />
                  </marker>
                  <marker id="arrow-purple" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                    <path d="M 0 1 L 10 5 L 0 9 z" fill="#a855f7" />
                  </marker>
                  <marker id="arrow-rose" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                    <path d="M 0 1 L 10 5 L 0 9 z" fill="#ec4899" />
                  </marker>
                  <marker id="arrow-indigo" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                    <path d="M 0 1 L 10 5 L 0 9 z" fill="#6366f1" />
                  </marker>
                  <marker id="arrow-selected" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                    <path d="M 0 1 L 10 5 L 0 9 z" fill="#f43f5e" />
                  </marker>
                </defs>

                {funnel.connections.map(conn => {
                  const fromNode = funnel.nodes.find(n => n.id === conn.fromNodeId);
                  const toNode = funnel.nodes.find(n => n.id === conn.toNodeId);
                  if (!fromNode || !toNode) return null;

                  const pathData = calculateConnectionPath(fromNode, toNode, routingStyle);
                  const isSelected = selectedConnectionId === conn.id;

                  // Dimming Inteligente: se estiver no modo foco ou houver nó selecionado/hover
                  const isTrailActive = connectedConnectionIds.has(conn.id);
                  const shouldDim = (activeFocusId || focusMode) && !isTrailActive && !isSelected;

                  const intentMeta = ROUTE_INTENTS[conn.intent || 'neutral'] || ROUTE_INTENTS.neutral;
                  const lineColor = isSelected ? '#f43f5e' : (conn.color || intentMeta.stroke);
                  const markerId = isSelected ? 'url(#arrow-selected)' : `url(#${intentMeta.markerId})`;

                  return (
                    <g 
                      key={conn.id} 
                      className={`pointer-events-auto cursor-pointer transition-opacity duration-300 ${
                        shouldDim ? 'opacity-15' : 'opacity-100'
                      }`}
                    >
                      {/* Linha invisível mais grossa para clique facilitado */}
                      <path
                        d={pathData}
                        fill="none"
                        stroke="transparent"
                        strokeWidth="24"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedConnectionId(conn.id);
                          setSelectedNodeIds([]);
                        }}
                      />
                      {/* Linha Visível */}
                      <path
                        d={pathData}
                        fill="none"
                        stroke={lineColor}
                        strokeWidth={isSelected ? '3.5' : isTrailActive ? '3' : '2'}
                        strokeDasharray={conn.intent === 'recovery' || conn.style === 'dashed' ? '6,6' : conn.intent === 'loop' || conn.style === 'animated' ? '8,4' : 'none'}
                        className={conn.style === 'animated' || isTrailActive ? 'animate-pulse' : ''}
                        markerEnd={markerId}
                        style={{
                          filter: isSelected || isTrailActive ? `drop-shadow(0 0 6px ${lineColor})` : 'none'
                        }}
                      />
                    </g>
                  );
                })}
              </g>
            </svg>

            {/* ── 🧱 RENDERIZAÇÃO DOS NÓS (CARDS) ──────────────────────────────── */}
            {funnel.nodes.map(node => {
              const meta = FUNNEL_BLOCK_CATALOG.find(b => b.subType === node.subType);
              const isSelected = selectedNodeIds.includes(node.id);
              const isConnectingSource = connectingFromNodeId === node.id;
              const isBottleneck = simulationResults.bottleneckIds.includes(node.id);
              const calculatedTraffic = simulationResults.trafficMap?.[node.id] || 0;

              // Dimming Inteligente
              const isTrailActive = connectedNodeIds.has(node.id);
              const shouldDim = (activeFocusId || focusMode) && !isTrailActive && !isSelected;

              // 📝 RENDERIZAÇÃO ESPECIAL DE POST-IT / NOTA ADESIVA
              if (node.subType === 'sticky_note') {
                const noteColor = (node.noteColor || 'yellow') as keyof typeof STICKY_COLORS;
                const style = STICKY_COLORS[noteColor] || STICKY_COLORS.yellow;
                return (
                  <div
                    key={node.id}
                    onMouseEnter={() => setHoveredNodeId(node.id)}
                    onMouseLeave={() => setHoveredNodeId(null)}
                    onMouseDown={(e) => handleNodeMouseDown(e, node)}
                    style={{ left: `${node.x}px`, top: `${node.y}px` }}
                    className={`absolute w-64 p-4 rounded-2xl pointer-events-auto cursor-grab active:cursor-grabbing shadow-xl transition-[border-color,box-shadow,opacity] duration-150 border z-20 ${style.bg} ${style.border} ${
                      isSelected ? 'ring-4 ring-indigo-500 scale-105 shadow-2xl' : 'hover:scale-[1.01]'
                    } ${shouldDim ? 'opacity-25 hover:opacity-100' : 'opacity-100'}`}
                  >
                    {/* Alfinete no Topo e Cabeçalho */}
                    <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-black/10">
                      <div className="flex items-center gap-1.5 flex-1 mr-2">
                        <Pin className="w-3.5 h-3.5 text-black/60 rotate-45 shrink-0" />
                        <input
                          type="text"
                          value={node.label || 'Post-it'}
                          onChange={(e) => {
                            const newLabel = e.target.value;
                            setFunnel(prev => prev ? { ...prev, nodes: prev.nodes.map(n => n.id === node.id ? { ...n, label: newLabel } : n) } : null);
                          }}
                          onMouseDown={(e) => e.stopPropagation()}
                          className="bg-transparent text-[11px] font-black uppercase tracking-wider text-black/80 focus:outline-none focus:ring-1 focus:ring-black/30 rounded px-1 w-full"
                          placeholder="Título do Post-it..."
                        />
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={(e) => { 
                            e.stopPropagation(); 
                            handleOpenNodeEditor(node); 
                          }}
                          className="p-1 rounded bg-black/10 hover:bg-black/20 text-black/70 transition-colors"
                          title="Abrir Editor Lateral do Post-it"
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

                    {/* Texto da Nota Editável Diretamente no Canvas */}
                    <textarea
                      value={node.notes || ''}
                      onChange={(e) => {
                        const newNotes = e.target.value;
                        setFunnel(prev => prev ? {
                          ...prev,
                          nodes: prev.nodes.map(n => n.id === node.id ? { ...n, notes: newNotes } : n)
                        } : null);
                      }}
                      onMouseDown={(e) => e.stopPropagation()}
                      placeholder="Clique aqui e digite sua anotação estratégica, metas ou tarefas..."
                      rows={5}
                      className="w-full bg-transparent border-none focus:outline-none focus:ring-1 focus:ring-black/20 rounded p-1 text-xs font-medium leading-relaxed resize-none text-black/90 placeholder:text-black/40 min-h-[90px] cursor-text"
                    />

                    {/* Cores rápidas */}
                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-black/10">
                      <div className="flex items-center gap-1.5">
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
                            className={`w-3.5 h-3.5 rounded-full ${STICKY_COLORS[c].dot} border border-black/20 hover:scale-125 transition-transform ${
                              (node.noteColor || 'yellow') === c ? 'ring-2 ring-black/40 scale-110' : ''
                            }`}
                            title={STICKY_COLORS[c].title}
                          />
                        ))}
                      </div>
                      <span className="text-[9px] text-black/50 font-bold uppercase">Post-it</span>
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
                    onMouseEnter={() => setHoveredNodeId(node.id)}
                    onMouseLeave={() => setHoveredNodeId(null)}
                    onMouseDown={(e) => handleNodeMouseDown(e, node)}
                    style={{ left: `${node.x}px`, top: `${node.y}px` }}
                    className={`absolute w-60 rounded-2xl pointer-events-auto cursor-pointer transition-[border-color,box-shadow,background-color,opacity] duration-150 select-none backdrop-blur-2xl border z-20 ${
                      isSelected
                        ? 'border-amber-400 shadow-2xl shadow-amber-500/30 ring-4 ring-amber-500/40 bg-[#161209]'
                        : isConnectingSource
                        ? 'border-amber-400 shadow-2xl shadow-amber-500/30 ring-2 ring-amber-500/40 bg-[#161209]'
                        : 'border-amber-500/30 hover:border-amber-500/60 bg-[#110d05]/95 shadow-xl'
                    } ${shouldDim ? 'opacity-25 hover:opacity-100' : 'opacity-100'}`}
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
                    </div>
                  </div>
                );
              }

              // 🏷️ RENDERIZAÇÃO ESPECIAL DE SUB-FUNIL / FUNIL VINCULADO
              if (node.subType === 'linked_funnel') {
                const linkedTarget = availableFunnels.find(f => f.id === node.linkedFunnelId);
                const stageCount = linkedTarget?.nodes?.length || 0;
                return (
                  <div
                    key={node.id}
                    onMouseEnter={() => setHoveredNodeId(node.id)}
                    onMouseLeave={() => setHoveredNodeId(null)}
                    onMouseDown={(e) => handleNodeMouseDown(e, node)}
                    style={{ left: `${node.x}px`, top: `${node.y}px` }}
                    className={`absolute w-64 rounded-2xl pointer-events-auto cursor-pointer transition-[border-color,box-shadow,background-color,opacity] duration-150 select-none backdrop-blur-2xl border z-20 ${
                      isSelected
                        ? 'border-indigo-400 shadow-2xl shadow-indigo-500/50 ring-4 ring-indigo-500/50 bg-[#0c1427] scale-[1.02]'
                        : isConnectingSource
                        ? 'border-amber-400 shadow-2xl shadow-amber-500/30 ring-2 ring-amber-500/40 bg-[#0c1427]'
                        : 'border-indigo-500/30 hover:border-indigo-500/60 bg-[#0a0f24]/95 shadow-xl'
                    } ${shouldDim ? 'opacity-25 hover:opacity-100' : 'opacity-100'}`}
                  >
                    {/* Plugs */}
                    <div className="absolute -left-1.5 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-[#090e1c] border-2 border-indigo-400/80 shadow-md pointer-events-none z-30" />
                    <div 
                      onClick={(e) => { e.stopPropagation(); handleStartConnection(e, node.id); }}
                      className="absolute -right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-indigo-500 hover:bg-indigo-400 hover:scale-125 border-2 border-white shadow-md cursor-pointer transition-transform z-30"
                      title="Puxar conexão para o próximo bloco"
                    />

                    {/* Header */}
                    <div className="p-3 border-b border-indigo-500/20 flex items-center justify-between bg-indigo-500/10">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                          <GitFork size={14} />
                        </div>
                        <span className="text-[10px] font-black text-indigo-300 uppercase tracking-wider">
                          Sub-Funil Vinculado
                        </span>
                      </div>

                      <div className="flex items-center gap-1">
                        {node.linkedFunnelId && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleInspectSubFunnel(node.linkedFunnelId);
                            }}
                            className="p-1 rounded-md bg-indigo-600/30 hover:bg-indigo-600 text-indigo-200 hover:text-white transition-colors"
                            title="Ver Raio-X do Funil"
                          >
                            <Eye className="w-3 h-3" />
                          </button>
                        )}
                        <button
                          onClick={(e) => { e.stopPropagation(); handleOpenNodeEditor(node); }}
                          className="p-1 rounded-md bg-white/5 hover:bg-indigo-600 text-gray-300 hover:text-white transition-colors"
                          title="Configurar Sub-Funil"
                        >
                          <Pencil className="w-3 h-3" />
                        </button>
                        <button
                          onClick={(e) => handleStartConnection(e, node.id)}
                          className={`p-1 rounded-md text-[10px] font-bold transition-colors ${
                            isConnectingSource ? 'bg-amber-500 text-black' : 'bg-white/5 hover:bg-indigo-600 text-gray-300 hover:text-white'
                          }`}
                        >
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    {/* Body */}
                    <div className="p-3 space-y-2">
                      <h4 className="text-xs font-black text-white line-clamp-1 flex items-center gap-1.5">
                        <Workflow className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                        {linkedTarget ? linkedTarget.title : node.label}
                      </h4>
                      <p className="text-[11px] text-gray-400 line-clamp-1">
                        {node.subtitle || (linkedTarget ? linkedTarget.description || 'Funil operacional detalhado' : 'Selecione um funil nas configurações')}
                      </p>

                      <div className="flex items-center justify-between text-[10px] pt-1.5 border-t border-indigo-500/10 font-bold">
                        <span className="text-indigo-300 bg-indigo-500/10 px-2 py-0.5 rounded-md border border-indigo-500/20">
                          {stageCount > 0 ? `${stageCount} etapas mapeadas` : 'Funil não selecionado'}
                        </span>
                        {node.linkedFunnelId ? (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              window.open(`/crm/funnels/${node.linkedFunnelId}`, '_blank');
                            }}
                            className="text-gray-400 hover:text-indigo-300 flex items-center gap-1 hover:underline cursor-pointer"
                            title="Abrir no editor em nova aba"
                          >
                            <span>Abrir</span>
                            <ExternalLink className="w-3 h-3" />
                          </button>
                        ) : null}
                      </div>
                    </div>
                  </div>
                );
              }

              // 🎭 RENDERIZAÇÃO ESPECIAL DE TERMÔMETRO EMOCIONAL
              if (node.subType === 'customer_emotion') {
                const emotionInfo = EMOTION_MAP[node.emotionLevel || 'happy'] || EMOTION_MAP.happy;
                return (
                  <div
                    key={node.id}
                    onMouseEnter={() => setHoveredNodeId(node.id)}
                    onMouseLeave={() => setHoveredNodeId(null)}
                    onMouseDown={(e) => handleNodeMouseDown(e, node)}
                    style={{ left: `${node.x}px`, top: `${node.y}px` }}
                    className={`absolute w-56 rounded-2xl pointer-events-auto cursor-pointer transition-[border-color,box-shadow,background-color,opacity] duration-150 select-none backdrop-blur-2xl border z-20 ${
                      isSelected
                        ? 'border-cyan-400 shadow-2xl shadow-cyan-500/40 ring-4 ring-cyan-500/50 bg-[#0c1427] scale-[1.02]'
                        : isConnectingSource
                        ? 'border-amber-400 shadow-2xl shadow-amber-500/30 ring-2 ring-amber-500/40 bg-[#0c1427]'
                        : 'border-cyan-500/30 hover:border-cyan-500/60 bg-[#05121b]/95 shadow-xl'
                    } ${shouldDim ? 'opacity-25 hover:opacity-100' : 'opacity-100'}`}
                  >
                    {/* Plugs */}
                    <div className="absolute -left-1.5 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-[#090e1c] border-2 border-cyan-400/80 shadow-md pointer-events-none z-30" />
                    <div 
                      onClick={(e) => { e.stopPropagation(); handleStartConnection(e, node.id); }}
                      className="absolute -right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-cyan-500 hover:bg-cyan-400 hover:scale-125 border-2 border-white shadow-md cursor-pointer transition-transform z-30"
                      title="Puxar conexão para o próximo bloco"
                    />

                    {/* Header */}
                    <div className="p-3 border-b border-cyan-500/20 flex items-center justify-between bg-cyan-500/10">
                      <div className="flex items-center gap-2">
                        <span className="text-base">{emotionInfo.emoji}</span>
                        <span className="text-[10px] font-black text-cyan-300 uppercase tracking-wider">
                          Sentimento
                        </span>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleOpenNodeEditor(node); }}
                          className="p-1 rounded-md bg-white/5 hover:bg-cyan-500 hover:text-black text-gray-300 transition-colors"
                        >
                          <Pencil className="w-3 h-3" />
                        </button>
                        <button
                          onClick={(e) => handleStartConnection(e, node.id)}
                          className={`p-1 rounded-md text-[10px] font-bold transition-colors ${
                            isConnectingSource ? 'bg-amber-500 text-black' : 'bg-white/5 hover:bg-cyan-500 hover:text-black text-gray-300'
                          }`}
                        >
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    {/* Body */}
                    <div className="p-3 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold text-white line-clamp-1">{node.label}</h4>
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${emotionInfo.badge}`}>
                          {emotionInfo.label}
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-400 line-clamp-2">
                        {node.subtitle || 'Estado emocional esperado do lead'}
                      </p>
                    </div>
                  </div>
                );
              }

              // 📦 RENDERIZAÇÃO PADRÃO DE BLOCOS (TRÁFEGO, PÁGINAS, OFERTAS, AUTOMAÇÕES, B2B, CS, RH, JORNADA)
              return (
                <div
                  key={node.id}
                  onMouseEnter={() => setHoveredNodeId(node.id)}
                  onMouseLeave={() => setHoveredNodeId(null)}
                  onMouseDown={(e) => handleNodeMouseDown(e, node)}
                  style={{
                    left: `${node.x}px`,
                    top: `${node.y}px`
                  }}
                  className={`absolute w-56 rounded-2xl pointer-events-auto cursor-pointer transition-[border-color,box-shadow,background-color,opacity] duration-150 select-none backdrop-blur-2xl border z-20 ${
                    isSelected
                      ? 'border-indigo-400 shadow-2xl shadow-indigo-500/40 ring-4 ring-indigo-500/50 bg-[#0c1427] scale-[1.02]'
                      : isConnectingSource
                      ? 'border-amber-400 shadow-2xl shadow-amber-500/30 ring-2 ring-amber-500/40 bg-[#0c1427]'
                      : 'border-white/10 hover:border-white/30 bg-[#090e1c]/90 shadow-xl'
                  } ${shouldDim ? 'opacity-25 hover:opacity-100' : 'opacity-100'}`}
                >
                  {/* Plug de Conexão de Entrada (Esquerda / Atrás) */}
                  <div className="absolute -left-1.5 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-[#090e1c] border-2 border-indigo-400/80 shadow-md pointer-events-none z-30" />

                  {/* Plug de Conexão de Saída (Direita / Frente) */}
                  <div 
                    onClick={(e) => { e.stopPropagation(); handleStartConnection(e, node.id); }}
                    className="absolute -right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-indigo-500 hover:bg-indigo-400 hover:scale-125 border-2 border-white shadow-md cursor-pointer transition-transform z-30"
                    title="Puxar conexão para o próximo bloco"
                  />

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

                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleOpenNodeEditor(node); }}
                        className="p-1 rounded-md text-[10px] font-bold bg-white/5 hover:bg-indigo-600 text-gray-300 hover:text-white transition-colors"
                      >
                        <Pencil className="w-3 h-3" />
                      </button>
                      <button
                        onClick={(e) => handleStartConnection(e, node.id)}
                        className={`p-1 rounded-md text-[10px] font-bold transition-colors ${
                          isConnectingSource ? 'bg-amber-500 text-black' : 'bg-white/5 hover:bg-indigo-600 text-gray-300 hover:text-white'
                        }`}
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
                      {node.type === 'offer' ? (
                        <span className="font-black text-emerald-400">
                          R$ {Number(node.price || 0).toFixed(2)}
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
                  </div>
                </div>
              );
            })}

            {/* ── 🟦 RETÂNGULO VISUAL DE SELEÇÃO POR ÁREA (MARQUEE BOX) ───────── */}
            {isSelectingArea && selectionBox && (() => {
              const minX = Math.min(selectionBox.startX, selectionBox.currentX);
              const maxX = Math.max(selectionBox.startX, selectionBox.currentX);
              const minY = Math.min(selectionBox.startY, selectionBox.currentY);
              const maxY = Math.max(selectionBox.startY, selectionBox.currentY);

              return (
                <div
                  style={{
                    left: `${minX}px`,
                    top: `${minY}px`,
                    width: `${maxX - minX}px`,
                    height: `${maxY - minY}px`
                  }}
                  className="absolute border-2 border-indigo-500 border-dashed bg-indigo-500/10 rounded-xl pointer-events-none z-40 backdrop-blur-[1px]"
                />
              );
            })()}

          </div>

          {/* ── ⚡ BARRA FLUTUANTE DE AÇÃO EM GRUPO (MULTI-SELECTION TOOLBAR) ────── */}
          {selectedNodeIds.length >= 2 && (
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 bg-[#0c1427]/95 border border-indigo-500/40 p-2 px-4 rounded-2xl shadow-2xl backdrop-blur-2xl animate-in fade-in slide-in-from-bottom-4">
              <span className="text-xs font-black text-indigo-300 pr-2 border-r border-white/10 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-indigo-400" />
                {selectedNodeIds.length} blocos selecionados
              </span>

              {/* Botão de Criar Moldura neste Grupo */}
              <button
                onClick={handleCreateFrameAroundSelection}
                className="px-3 py-1.5 bg-indigo-600/30 hover:bg-indigo-600 text-white border border-indigo-500/40 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm"
                title="Criar uma moldura visual ao redor dos blocos selecionados"
              >
                <BoxSelect className="w-3.5 h-3.5 text-indigo-300" />
                <span>Criar Moldura</span>
              </button>

              {/* Botão de Duplicar Seleção */}
              <button
                onClick={handleDuplicateSelection}
                className="px-2.5 py-1.5 bg-indigo-500/20 hover:bg-indigo-500/40 text-indigo-200 hover:text-white border border-indigo-500/30 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
                title="Duplicar blocos selecionados (Ctrl+D)"
              >
                <Copy className="w-3.5 h-3.5 text-indigo-300" />
                <span>Duplicar</span>
              </button>

              {/* Botão de Copiar Seleção */}
              <button
                onClick={handleCopySelection}
                className="px-2.5 py-1.5 bg-white/5 hover:bg-white/15 text-gray-300 hover:text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5"
                title="Copiar para a área de transferência (Ctrl+C)"
              >
                <Copy className="w-3.5 h-3.5 text-gray-400" />
                <span>Copiar</span>
              </button>

              {/* Alinhar em Linha Horizontal */}
              <button
                onClick={() => handleAlignNodes('horizontal')}
                className="px-2.5 py-1.5 bg-white/5 hover:bg-white/15 text-gray-300 hover:text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5"
                title="Alinhar em Linha Horizontal (com espaçamento harmônico sem sobreposição)"
              >
                <ArrowRightLeft className="w-3.5 h-3.5 text-indigo-400" />
                <span>Linha</span>
              </button>

              {/* Alinhar em Coluna Vertical */}
              <button
                onClick={() => handleAlignNodes('vertical')}
                className="px-2.5 py-1.5 bg-white/5 hover:bg-white/15 text-gray-300 hover:text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5"
                title="Alinhar em Coluna Vertical (com espaçamento harmônico sem sobreposição)"
              >
                <ArrowUpDown className="w-3.5 h-3.5 text-indigo-400" />
                <span>Coluna</span>
              </button>

              <div className="w-px h-4 bg-white/10"></div>

              {/* Excluir Grupo */}
              <button
                onClick={handleDeleteSelectedNodes}
                className="px-3 py-1.5 bg-rose-500/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/30 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
                title="Excluir todos os blocos selecionados (Delete)"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Excluir Todos</span>
              </button>

              {/* Limpar Seleção */}
              <button
                onClick={() => setSelectedNodeIds([])}
                className="p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded-xl text-xs transition-colors"
                title="Limpar Seleção (Esc)"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* ── 🗺️ MINI-MAPA DE NAVEGAÇÃO RADAR ARRASTÁVEL EM TEMPO REAL ─────────────────────────── */}
          {isMinimapOpen && funnel && (() => {
            let minX = -400, minY = -400, maxX = 2400, maxY = 1800;
            if (funnel.nodes.length > 0) {
              minX = Math.min(...funnel.nodes.map(n => n.x)) - 150;
              minY = Math.min(...funnel.nodes.map(n => n.y)) - 150;
              maxX = Math.max(...funnel.nodes.map(n => n.x + 240)) + 150;
              maxY = Math.max(...funnel.nodes.map(n => n.y + 120)) + 150;
            }

            const worldWidth = Math.max(1000, maxX - minX);
            const worldHeight = Math.max(700, maxY - minY);

            const mapWidth = 208;
            const mapHeight = 128;
            const scaleX = mapWidth / worldWidth;
            const scaleY = mapHeight / worldHeight;
            const scale = Math.min(scaleX, scaleY);

            const rect = canvasRef.current?.getBoundingClientRect() || { width: window.innerWidth, height: window.innerHeight };
            const vpX = (-pan.x / zoom - minX) * scale;
            const vpY = (-pan.y / zoom - minY) * scale;
            const vpW = Math.max(10, (rect.width / zoom) * scale);
            const vpH = Math.max(10, (rect.height / zoom) * scale);

            return (
              <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-40 w-64 bg-[#090e1c]/95 border border-indigo-500/40 rounded-2xl shadow-2xl backdrop-blur-2xl p-2.5 overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-200">
                <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-white/10 text-[10px] font-black uppercase tracking-wider text-gray-400">
                  <div className="flex items-center gap-1.5 text-indigo-400">
                    <Compass className="w-3.5 h-3.5" />
                    <span>Radar (Arraste para Mover)</span>
                  </div>
                  <button 
                    onClick={() => setIsMinimapOpen(false)}
                    className="p-0.5 hover:text-white rounded hover:bg-white/10"
                    title="Fechar Radar"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>

                <div 
                  className="relative w-full h-32 bg-black/80 rounded-xl overflow-hidden border border-white/10 cursor-grab active:cursor-grabbing select-none"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    setIsDraggingMinimap(true);
                    const svg = document.getElementById('funnel-minimap-svg') as unknown as SVGSVGElement;
                    if (svg) {
                      handleMinimapPanTo(e.clientX, e.clientY, svg);
                    }
                  }}
                >
                  <svg 
                    id="funnel-minimap-svg"
                    width={mapWidth} 
                    height={mapHeight} 
                    className="w-full h-full pointer-events-none"
                  >
                    {/* Molduras */}
                    {(funnel.frames || []).map(f => (
                      <rect
                        key={f.id}
                        x={(f.x - minX) * scale}
                        y={(f.y - minY) * scale}
                        width={Math.max(4, f.width * scale)}
                        height={Math.max(4, f.height * scale)}
                        fill="rgba(99, 102, 241, 0.15)"
                        stroke="rgba(99, 102, 241, 0.4)"
                        strokeWidth="1"
                        rx="2"
                      />
                    ))}

                    {/* Conexões */}
                    {funnel.connections.map(c => {
                      const fromN = funnel.nodes.find(n => n.id === c.fromNodeId);
                      const toN = funnel.nodes.find(n => n.id === c.toNodeId);
                      if (!fromN || !toN) return null;
                      return (
                        <line
                          key={c.id}
                          x1={(fromN.x + 100 - minX) * scale}
                          y1={(fromN.y + 40 - minY) * scale}
                          x2={(toN.x + 100 - minX) * scale}
                          y2={(toN.y + 40 - minY) * scale}
                          stroke="rgba(255, 255, 255, 0.25)"
                          strokeWidth="1"
                        />
                      );
                    })}

                    {/* Nós */}
                    {funnel.nodes.map(n => {
                      const nodeColor = n.type === 'traffic' ? '#3b82f6' : (n.type === 'offer' ? '#10b981' : (n.type === 'page' ? '#6366f1' : '#f59e0b'));
                      return (
                        <rect
                          key={n.id}
                          x={(n.x - minX) * scale}
                          y={(n.y - minY) * scale}
                          width={Math.max(4, 200 * scale)}
                          height={Math.max(3, 80 * scale)}
                          fill={nodeColor}
                          rx="1"
                        />
                      );
                    })}

                    {/* Viewport Box (Visor de Visualização Atual) */}
                    <rect
                      x={Math.max(0, vpX)}
                      y={Math.max(0, vpY)}
                      width={Math.min(mapWidth, vpW)}
                      height={Math.min(mapHeight, vpH)}
                      fill="rgba(99, 102, 241, 0.25)"
                      stroke="#60a5fa"
                      strokeWidth="2"
                      rx="3"
                    />
                  </svg>
                </div>
              </div>
            );
          })()}

          {/* ── 🎛️ DOCK FLUTUANTE DE NAVEGAÇÃO ESPACIAL COM ÍCONES COMPLETOS ────────────────────── */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-1.5 bg-[#090e1c]/95 border border-white/15 p-2 rounded-2xl shadow-2xl backdrop-blur-2xl ring-1 ring-white/10">
            {/* Modo Ponteiro */}
            <button
              onClick={() => {
                setIsHandMode(false);
                setCanvasTool('pan');
              }}
              className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                !isHandMode && canvasTool === 'pan'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/30' 
                  : 'text-gray-400 hover:text-white hover:bg-white/10'
              }`}
              title="Modo Ponteiro: Mover e Selecionar Blocos Individuais"
            >
              <MousePointer className="w-4 h-4" />
              <span className="hidden sm:inline">Ponteiro</span>
            </button>

            {/* Modo Seleção por Área (Marquee Box) */}
            <button
              onClick={() => {
                setIsHandMode(false);
                setCanvasTool('select');
              }}
              className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                !isHandMode && canvasTool === 'select'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/30' 
                  : 'text-gray-400 hover:text-white hover:bg-white/10'
              }`}
              title="Modo Seleção por Área: Arraste para selecionar múltiplos blocos (ou segure Shift)"
            >
              <BoxSelect className="w-4 h-4" />
              <span className="hidden sm:inline">Selecionar Área</span>
            </button>

            {/* Modo Mãozinha (Arrastar Canvas) */}
            <button
              onClick={() => {
                setIsHandMode(true);
              }}
              className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                isHandMode 
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/30' 
                  : 'text-gray-400 hover:text-white hover:bg-white/10'
              }`}
              title="Modo Mãozinha: Clicar e Arrastar o Canvas Livremente (ou segure Espaço)"
            >
              <Hand className="w-4 h-4" />
              <span className="hidden sm:inline">Arrastar</span>
            </button>

            <div className="w-px h-5 bg-white/15 mx-0.5"></div>

            {/* Zoom Out */}
            <button
              onClick={() => {
                const newZoom = Math.max(0.1, Number((zoom - 0.15).toFixed(2)));
                setZoom(newZoom);
              }}
              className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
              title="Diminuir Zoom"
            >
              <ZoomOut className="w-4 h-4" />
            </button>

            {/* Reset 100% */}
            <button
              onClick={() => { setZoom(1); }}
              className="text-xs font-black text-indigo-400 hover:text-white px-2 py-1 hover:bg-white/10 rounded-lg min-w-12 text-center transition-colors"
              title="Voltar para 100%"
            >
              {Math.round(zoom * 100)}%
            </button>

            {/* Zoom In */}
            <button
              onClick={() => {
                const newZoom = Math.min(3.0, Number((zoom + 0.15).toFixed(2)));
                setZoom(newZoom);
              }}
              className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
              title="Aumentar Zoom"
            >
              <ZoomIn className="w-4 h-4" />
            </button>

            <div className="w-px h-5 bg-white/15 mx-0.5"></div>

            {/* Botão Enquadrar / Centralizar Funil na Tela */}
            <button
              onClick={handleFitToScreen}
              className="px-2.5 py-1.5 bg-white/5 hover:bg-indigo-600/30 text-gray-300 hover:text-white border border-white/10 hover:border-indigo-500/40 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
              title="Centralizar e Enquadrar Todo o Funil na Tela"
            >
              <Scan className="w-4 h-4 text-indigo-400" />
              <span className="hidden sm:inline">Centralizar</span>
            </button>

            {/* Botão Abrir / Fechar Mini-Mapa Radar */}
            <button
              onClick={() => setIsMinimapOpen(prev => !prev)}
              className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                isMinimapOpen 
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/30' 
                  : 'text-gray-400 hover:text-white hover:bg-white/10 border border-white/10'
              }`}
              title="Abrir / Fechar Radar do Funil"
            >
              <Compass className="w-4 h-4" />
              <span className="hidden sm:inline">Radar</span>
            </button>

            {/* Botão Modo Tela Cheia Imersivo */}
            <button
              onClick={toggleFullscreen}
              className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                isFullscreen 
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-500/30 ring-2 ring-purple-400/50' 
                  : 'text-gray-400 hover:text-white hover:bg-white/10 border border-white/10'
              }`}
              title="Alternar Modo Tela Cheia"
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              <span className="hidden sm:inline">{isFullscreen ? 'Restaurar' : 'Tela Cheia'}</span>
            </button>
          </div>

        </div>

        {/* ── GAVETA DIREITA: INSPETOR DE PROPRIEDADES & GUIA TÁTICO ─────────── */}
        {(nodeEditDraft || selectedNodeId) && (() => {
          const activeNode = nodeEditDraft || funnel.nodes.find(n => n.id === selectedNodeId)!;
          const activeNodeMeta = FUNNEL_BLOCK_CATALOG.find(b => b.subType === activeNode.subType);

          return (
            <div className={`absolute right-0 top-0 bottom-0 z-20 w-80 lg:w-96 bg-[#090e1c]/95 border-l border-white/10 backdrop-blur-2xl flex flex-col transition-transform duration-300 ${
                isInspectorOpen ? 'translate-x-0' : 'translate-x-full'
              }`}>
              {/* Cabeçalho do Inspetor */}
              <div className="p-4 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
                <div className="flex items-center gap-2">
                  <div className={`p-1.5 rounded-lg border ${activeNodeMeta?.badgeColor || 'bg-white/5 text-white'}`}>
                    {renderNodeIcon(activeNodeMeta?.iconName || 'Layers', 16)}
                  </div>
                  <div>
                    <h3 className="text-xs font-black text-white uppercase tracking-wider">Configuração da Etapa</h3>
                    <span className="text-[10px] text-gray-400">{activeNode.type}</span>
                  </div>
                </div>
                <button onClick={handleCancelNodeDraft} className="p-1 text-gray-400 hover:text-white rounded-lg hover:bg-white/10">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Abas do Inspetor */}
              <div className="flex border-b border-white/10 bg-black/40 text-xs">
                <button
                  onClick={() => setInspectorTab('config')}
                  className={`flex-1 py-2.5 font-bold transition-colors ${inspectorTab === 'config' ? 'text-indigo-400 border-b-2 border-indigo-500 bg-white/[0.02]' : 'text-gray-400 hover:text-white'}`}
                >
                  Parâmetros
                </button>
                <button
                  onClick={() => setInspectorTab('checklist')}
                  className={`flex-1 py-2.5 font-bold transition-colors ${inspectorTab === 'checklist' ? 'text-indigo-400 border-b-2 border-indigo-500 bg-white/[0.02]' : 'text-gray-400 hover:text-white'}`}
                >
                  Tarefas ({activeNode.checklist?.filter(c => c.done).length || 0}/{activeNode.checklist?.length || 0})
                </button>
                <button
                  onClick={() => setInspectorTab('guide')}
                  className={`flex-1 py-2.5 font-bold transition-colors ${inspectorTab === 'guide' ? 'text-indigo-400 border-b-2 border-indigo-500 bg-white/[0.02]' : 'text-gray-400 hover:text-white'}`}
                >
                  Guia Tático
                </button>
              </div>

              {/* Conteúdo do Inspetor */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">

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

                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-gray-400 uppercase">Objetivo da Etapa</label>
                      <input
                        type="text"
                        value={activeNode.subtitle || ''}
                        onChange={(e) => updateDraftField('subtitle', e.target.value)}
                        placeholder="Ex: Qualificar lead ou ofertar bump"
                        className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
                      />
                    </div>

                    {activeNode.subType === 'icp_persona' && (
                      <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-2xl space-y-3">
                        <label className="text-[11px] font-black text-amber-300 uppercase flex items-center gap-1.5">
                          <Target size={14} /> Selecionar ICP do CRM
                        </label>
                        <select
                          value={activeNode.icpId || ''}
                          onChange={(e) => {
                            const icpId = e.target.value;
                            const targetICP = icps.find(i => i.id === icpId);
                            setNodeEditDraft(prev => prev ? {
                              ...prev,
                              icpId,
                              label: targetICP ? targetICP.name : 'Perfil ICP',
                              subtitle: targetICP ? `${targetICP.targetType || 'B2C'} • ${targetICP.niche || 'Geral'}` : ''
                            } : null);
                          }}
                          className="w-full px-3 py-2 bg-black/60 border border-amber-500/30 rounded-xl text-xs text-amber-200 focus:outline-none focus:border-amber-400"
                        >
                          <option value="">-- Escolha um Perfil ICP --</option>
                          {icps.map(icp => (
                            <option key={icp.id} value={icp.id}>
                              {icp.name} ({icp.targetType || 'B2C'} - {icp.niche || 'Geral'})
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {activeNode.subType === 'linked_funnel' && (
                      <div className="p-3 bg-indigo-500/10 border border-indigo-500/30 rounded-2xl space-y-3">
                        <label className="text-[11px] font-black text-indigo-300 uppercase flex items-center gap-1.5">
                          <GitFork size={14} /> Vincular Funil Operacional do CRM
                        </label>
                        <select
                          value={activeNode.linkedFunnelId || ''}
                          onChange={(e) => {
                            const fId = e.target.value;
                            const targetFunnel = availableFunnels.find(f => f.id === fId);
                            setNodeEditDraft(prev => prev ? {
                              ...prev,
                              linkedFunnelId: fId,
                              label: targetFunnel ? `Funil: ${targetFunnel.title}` : prev.label,
                              linkedFunnelTitle: targetFunnel ? targetFunnel.title : '',
                              subtitle: targetFunnel ? (targetFunnel.description || `${targetFunnel.nodes.length} etapas`) : prev.subtitle
                            } : null);
                          }}
                          className="w-full px-3 py-2 bg-black/60 border border-indigo-500/30 rounded-xl text-xs text-indigo-200 focus:outline-none focus:border-indigo-400"
                        >
                          <option value="">-- Escolha um Funil do CRM --</option>
                          {availableFunnels.map(f => (
                            <option key={f.id} value={f.id}>
                              {f.title} ({f.nodes?.length || 0} etapas - {f.category})
                            </option>
                          ))}
                        </select>

                        {activeNode.linkedFunnelId && (
                          <div className="flex items-center gap-2 pt-1">
                            <button
                              type="button"
                              onClick={() => handleInspectSubFunnel(activeNode.linkedFunnelId)}
                              className="flex-1 px-3 py-2 bg-indigo-600/40 hover:bg-indigo-600 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>Raio-X do Funil</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => window.open(`/crm/funnels/${activeNode.linkedFunnelId}`, '_blank')}
                              className="px-3 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                              title="Abrir no editor em nova aba"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    {activeNode.subType === 'vsl_page' && (
                      <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-2xl space-y-2">
                        <label className="text-[11px] font-black text-rose-300 uppercase flex items-center gap-1.5">
                          <Video size={14} /> Estúdio de Roteiro de VSL
                        </label>
                        <p className="text-[10px] text-gray-300">
                          Estruture a narrativa persuasiva, minutagem WPM, hooks A/B e ponto de delay do botão.
                        </p>
                        <button
                          type="button"
                          onClick={() => window.open(`/funnels`, '_blank')}
                          className="w-full py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-md shadow-rose-600/20"
                        >
                          <span>Acessar Estúdio de VSL</span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}

                    {(activeNode.subType === 'sales_page' || activeNode.subType === 'quiz_page') && (
                      <div className="p-3 bg-indigo-500/10 border border-indigo-500/30 rounded-2xl space-y-2">
                        <label className="text-[11px] font-black text-indigo-300 uppercase flex items-center gap-1.5">
                          <Layers size={14} /> {activeNode.subType === 'quiz_page' ? 'Construtor de Quiz Interativo' : 'Construtor de Página de Vendas'}
                        </label>
                        <p className="text-[10px] text-gray-300">
                          {activeNode.subType === 'quiz_page' 
                            ? 'Configure as perguntas, mini-VSLs, telas de análise e teste no simulador ao vivo.' 
                            : 'Monte as dobras verticais, provas sociais, box de oferta e FAQ.'}
                        </p>
                        <button
                          type="button"
                          onClick={() => window.open(`/funnels`, '_blank')}
                          className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-md shadow-indigo-600/20"
                        >
                          <span>{activeNode.subType === 'quiz_page' ? 'Acessar Construtor de Quiz' : 'Acessar Construtor de Página'}</span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}

                    {activeNode.subType === 'customer_emotion' && (
                      <div className="p-3 bg-cyan-500/10 border border-cyan-500/30 rounded-2xl space-y-3">
                        <label className="text-[11px] font-black text-cyan-300 uppercase flex items-center gap-1.5">
                          <Smile size={14} /> Selecionar Sentimento do Cliente
                        </label>
                        <div className="grid grid-cols-1 gap-1.5">
                          {Object.entries(EMOTION_MAP).map(([key, info]) => {
                            const isSelectedEmotion = (activeNode.emotionLevel || 'happy') === key;
                            return (
                              <button
                                key={key}
                                type="button"
                                onClick={() => updateDraftField('emotionLevel', key)}
                                className={`flex items-center justify-between p-2 px-3 rounded-xl border text-xs font-bold transition-all ${
                                  isSelectedEmotion 
                                    ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200 ring-2 ring-cyan-500/30' 
                                    : 'bg-black/40 border-white/10 text-gray-400 hover:text-white hover:bg-white/5'
                                }`}
                              >
                                <div className="flex items-center gap-2">
                                  <span className="text-base">{info.emoji}</span>
                                  <span>{info.label}</span>
                                </div>
                                {isSelectedEmotion && <Check className="w-3.5 h-3.5 text-cyan-400" />}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {activeNode.type === 'journey' && (
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-gray-400 uppercase">Responsável pelo Ponto de Contato</label>
                        <input
                          type="text"
                          value={activeNode.touchpointOwner || ''}
                          onChange={(e) => updateDraftField('touchpointOwner', e.target.value)}
                          placeholder="Ex: Closer WhatsApp, Suporte VIP, Tráfego, Automação"
                          className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                    )}

                    {activeNode.subType !== 'sticky_note' && activeNode.subType !== 'icp_persona' && activeNode.subType !== 'linked_funnel' && activeNode.subType !== 'customer_emotion' && (
                      <>
                        {activeNode.type === 'offer' && !activeNode.subType.startsWith('affiliate_') && (
                          <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl space-y-2">
                            <label className="text-[11px] font-bold text-indigo-300 uppercase flex items-center gap-1.5">
                              <ShoppingBag className="w-3.5 h-3.5" /> Vincular Produto / Oferta do CRM
                            </label>
                            <select
                              value={activeNode.offerId || ''}
                              onChange={(e) => {
                                const selectedOffer = offers.find(o => o.id === e.target.value);
                                if (selectedOffer) {
                                  setNodeEditDraft(prev => prev ? {
                                    ...prev,
                                    offerId: selectedOffer.id,
                                    price: selectedOffer.price,
                                    label: selectedOffer.name
                                  } : null);
                                } else {
                                  updateDraftField('offerId', '');
                                }
                              }}
                              className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                            >
                              <option value="">Produto Customizado (Preço Manual)</option>
                              {offers.map(offer => (
                                <option key={offer.id} value={offer.id}>
                                  {offer.name} - R$ {Number(offer.price || 0).toFixed(2)}
                                </option>
                              ))}
                            </select>
                          </div>
                        )}

                        {(activeNode.type === 'page' || activeNode.type === 'traffic') && (
                          <div className="space-y-1.5">
                            <label className="text-[11px] font-bold text-gray-400 uppercase">URL do destino</label>
                            <input
                              type="url"
                              value={activeNode.url || ''}
                              onChange={(e) => updateDraftField('url', e.target.value)}
                              className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                            />
                          </div>
                        )}
                      </>
                    )}
                  </>
                )}

                {inspectorTab === 'checklist' && (
                  <div className="space-y-4">
                    {/* Barra de Progresso do Checklist */}
                    {(() => {
                      const total = activeNode.checklist?.length || 0;
                      const doneCount = activeNode.checklist?.filter(c => c.done).length || 0;
                      const pct = total > 0 ? Math.round((doneCount / total) * 100) : 0;
                      return (
                        <div className="p-3 bg-white/[0.02] border border-white/5 rounded-xl space-y-2">
                          <div className="flex items-center justify-between text-xs font-bold">
                            <span className="text-gray-300">Progresso da Etapa</span>
                            <span className="text-indigo-400">{doneCount}/{total} concluídas ({pct}%)</span>
                          </div>
                          <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-gradient-to-r from-indigo-500 to-emerald-400 transition-all duration-300"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })()}

                    {/* Input de Adicionar Nova Tarefa */}
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Adicionar tarefa desta etapa..."
                        value={newChecklistText}
                        onChange={(e) => setNewChecklistText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddChecklistItem(activeNode);
                          }
                        }}
                        className="flex-1 px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
                      />
                      <button
                        onClick={() => handleAddChecklistItem(activeNode)}
                        disabled={!newChecklistText.trim()}
                        className="px-3 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:hover:bg-indigo-600 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1 shrink-0"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Adicionar</span>
                      </button>
                    </div>

                    {/* Lista de Tarefas */}
                    <div className="space-y-1.5">
                      {(activeNode.checklist || []).length === 0 ? (
                        <div className="p-6 text-center rounded-2xl border border-dashed border-white/10 space-y-3 bg-white/[0.01]">
                          <CheckCircle2 className="w-8 h-8 text-gray-600 mx-auto" />
                          <div className="space-y-1">
                            <p className="text-xs font-bold text-gray-300">Nenhuma tarefa cadastrada</p>
                            <p className="text-[10px] text-gray-500">Crie tarefas customizadas acima ou carregue o modelo padrão.</p>
                          </div>
                          {activeNodeMeta?.checklist && activeNodeMeta.checklist.length > 0 && (
                            <button
                              onClick={() => handleLoadTemplateChecklist(activeNodeMeta)}
                              className="px-3 py-1.5 bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-300 hover:text-white border border-indigo-500/30 rounded-xl text-xs font-bold transition-all inline-flex items-center gap-1.5"
                            >
                              <Sparkles className="w-3.5 h-3.5" />
                              <span>Carregar Checklist Padrão ({activeNodeMeta.checklist.length} tarefas)</span>
                            </button>
                          )}
                        </div>
                      ) : (
                        (activeNode.checklist || []).map((item) => (
                          <div 
                            key={item.id} 
                            className={`flex items-center justify-between p-2.5 rounded-xl border transition-all ${
                              item.done 
                                ? 'bg-emerald-500/5 border-emerald-500/20 text-gray-400' 
                                : 'bg-white/[0.02] hover:bg-white/[0.05] border-white/5 text-gray-200'
                            }`}
                          >
                            <label className="flex items-center gap-2.5 flex-1 min-w-0 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={item.done}
                                onChange={(e) => handleToggleChecklistItem(activeNode, item.id, e.target.checked)}
                                className="w-4 h-4 rounded border-white/20 bg-black/40 text-indigo-600 focus:ring-0 focus:ring-offset-0 cursor-pointer"
                              />
                              <span className={`text-xs select-none truncate ${item.done ? 'line-through text-gray-500' : ''}`}>
                                {item.text}
                              </span>
                            </label>
                            <button
                              onClick={() => handleDeleteChecklistItem(activeNode, item.id)}
                              className="p-1 text-gray-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors ml-2 shrink-0"
                              title="Excluir tarefa"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}

                {inspectorTab === 'guide' && activeNodeMeta && (
                  <div className="space-y-3 text-xs text-gray-300 bg-white/5 p-3 rounded-xl border border-white/10">
                    <h4 className="font-bold text-indigo-400">{activeNodeMeta.strategicGuide.title}</h4>
                    <p>{activeNodeMeta.strategicGuide.description}</p>
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

        {/* ── 🔍 MODAL DE RAIO-X / PRÉVIA DO SUB-FUNIL VINCULADO ────────────── */}
        {previewSubFunnel && (
          <div 
            onClick={() => setPreviewSubFunnel(null)}
            className="fixed inset-0 z-[99999] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 lg:p-8 animate-in fade-in"
          >
            <div 
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-4xl bg-[#090e1c] border border-indigo-500/40 rounded-3xl shadow-2xl shadow-indigo-950/80 overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95"
            >
              {/* Header do Modal */}
              <div className="p-5 bg-gradient-to-r from-indigo-950/60 via-purple-950/40 to-black/60 border-b border-indigo-500/20 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-2xl bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    <GitFork size={22} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                        Raio-X do Sub-Funil
                      </span>
                      <span className="text-[10px] font-bold text-gray-400 capitalize">
                        Categoria: {previewSubFunnel.category}
                      </span>
                    </div>
                    <h3 className="text-base font-black text-white mt-0.5">
                      {previewSubFunnel.title}
                    </h3>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => window.open(`/crm/funnels/${previewSubFunnel.id}`, '_blank')}
                    className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-lg shadow-indigo-600/30"
                  >
                    <span>Abrir Editor Completo</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setPreviewSubFunnel(null)}
                    className="p-2 text-gray-400 hover:text-white rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Métricas Rápidas do Sub-funil */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-5 border-b border-white/5 bg-white/[0.01]">
                <div className="p-3 bg-white/[0.02] border border-white/5 rounded-2xl">
                  <span className="text-[10px] font-bold text-gray-400 uppercase">Etapas Mapeadas</span>
                  <p className="text-lg font-black text-white mt-0.5">{previewSubFunnel.nodes?.length || 0}</p>
                </div>
                <div className="p-3 bg-white/[0.02] border border-white/5 rounded-2xl">
                  <span className="text-[10px] font-bold text-gray-400 uppercase">Conexões Ativas</span>
                  <p className="text-lg font-black text-indigo-400 mt-0.5">{previewSubFunnel.connections?.length || 0}</p>
                </div>
                <div className="p-3 bg-white/[0.02] border border-white/5 rounded-2xl">
                  <span className="text-[10px] font-bold text-gray-400 uppercase">Molduras / Fases</span>
                  <p className="text-lg font-black text-purple-400 mt-0.5">{previewSubFunnel.frames?.length || 0}</p>
                </div>
                <div className="p-3 bg-white/[0.02] border border-white/5 rounded-2xl">
                  <span className="text-[10px] font-bold text-gray-400 uppercase">Tráfego Projetado</span>
                  <p className="text-lg font-black text-emerald-400 mt-0.5">
                    {previewSubFunnel.metrics?.initialTraffic ? `${previewSubFunnel.metrics.initialTraffic.toLocaleString()} leads` : 'Dinâmico'}
                  </p>
                </div>
              </div>

              {/* Conteúdo: Lista de Etapas e Fluxo do Funil */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
                <h4 className="text-xs font-black text-gray-300 uppercase tracking-wider flex items-center gap-2">
                  <Layers className="w-4 h-4 text-indigo-400" />
                  Estrutura de Etapas Operacionais
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {previewSubFunnel.nodes?.map((n, idx) => {
                    const nodeMeta = FUNNEL_BLOCK_CATALOG.find(b => b.subType === n.subType);
                    return (
                      <div 
                        key={n.id} 
                        className="p-3.5 bg-black/40 border border-white/10 rounded-2xl space-y-2 hover:border-indigo-500/40 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black text-gray-500 bg-white/5 w-5 h-5 rounded-md flex items-center justify-center">
                              {idx + 1}
                            </span>
                            <div className={`p-1 rounded-md border ${nodeMeta?.badgeColor || 'bg-white/5 text-white'}`}>
                              {renderNodeIcon(nodeMeta?.iconName || 'Layers', 12)}
                            </div>
                          </div>
                          <span className="text-[9px] font-bold uppercase text-gray-400">
                            {n.type}
                          </span>
                        </div>

                        <div>
                          <h5 className="text-xs font-bold text-white line-clamp-1">{n.label}</h5>
                          {n.subtitle && (
                            <p className="text-[10px] text-gray-400 line-clamp-1 mt-0.5">{n.subtitle}</p>
                          )}
                        </div>

                        {(n.price || n.conversionRate) && (
                          <div className="flex items-center justify-between text-[10px] pt-1.5 border-t border-white/5">
                            {n.price ? (
                              <span className="text-emerald-400 font-bold">R$ {Number(n.price).toFixed(2)}</span>
                            ) : <span />}
                            {n.conversionRate ? (
                              <span className="text-indigo-300 font-bold">Conv: {n.conversionRate}%</span>
                            ) : <span />}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Footer do Modal */}
              <div className="p-4 border-t border-white/10 bg-black/40 flex items-center justify-between">
                <span className="text-xs text-gray-400">
                  Visualizando estrutura interna sem alterar a lousa principal.
                </span>
                <button
                  onClick={() => setPreviewSubFunnel(null)}
                  className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition-colors"
                >
                  Fechar Raio-X
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );

  return isFullscreen ? createPortal(editorContent, document.body) : editorContent;
}
