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
  Target, StickyNote, BoxSelect, Wand2, MousePointer, Workflow, Spline,
  AlignLeft, AlignTop, Focus
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

// ── 🎯 CORES & SEMÂNTICA DAS ROTAS ──────────────────────────────────────────
const ROUTE_INTENTS: Record<string, { stroke: string; label: string; markerId: string; badge: string }> = {
  conversion: { stroke: '#10b981', label: 'Conversão Direta', markerId: 'arrow-emerald', badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' },
  recovery: { stroke: '#f59e0b', label: 'Recuperação / Abandono', markerId: 'arrow-amber', badge: 'bg-amber-500/20 text-amber-300 border-amber-500/30' },
  loop: { stroke: '#a855f7', label: 'Loop / Remarketing', markerId: 'arrow-purple', badge: 'bg-purple-500/20 text-purple-300 border-purple-500/30' },
  upsell: { stroke: '#ec4899', label: 'Upsell / Downsell', markerId: 'arrow-rose', badge: 'bg-rose-500/20 text-rose-300 border-rose-500/30' },
  neutral: { stroke: '#6366f1', label: 'Fluxo Principal', markerId: 'arrow-indigo', badge: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30' }
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
  const [isInspectorOpen, setIsInspectorOpen] = useState(false);
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

  const canvasRef = useRef<HTMLDivElement>(null);

  // O nó selecionado principal (para o inspetor lateral)
  const selectedNodeId = selectedNodeIds.length === 1 ? selectedNodeIds[0] : null;

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
    } catch (error) {
      console.error('Erro ao salvar:', error);
      toast.error('Erro ao salvar alterações.');
    } finally {
      setSaving(false);
    }
  };

  // ── ⌨️ ATALHOS DE TECLADO (DELETE, ESCAPE, CTRL+A) ────────────────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).tagName === 'INPUT' || (e.target as HTMLElement).tagName === 'TEXTAREA') return;

      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedNodeIds.length > 0) {
          handleDeleteSelectedNodes();
        } else if (selectedConnectionId) {
          handleDeleteSelectedConnection();
        }
      } else if (e.key === 'Escape') {
        setSelectedNodeIds([]);
        setSelectedConnectionId(null);
        setConnectingFromNodeId(null);
        setIsInspectorOpen(false);
        setIsSelectingArea(false);
        setSelectionBox(null);
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'a' || e.key === 'A')) {
        e.preventDefault();
        if (funnel && funnel.nodes.length > 0) {
          setSelectedNodeIds(funnel.nodes.map(n => n.id));
          toast.info(`${funnel.nodes.length} blocos selecionados.`);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedNodeIds, selectedConnectionId, funnel]);

  // ── 🖱️ CONTROLES DO CANVAS (ZOOM & PAN & MARQUEE) ─────────────────────────
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
      const canvasX = (e.clientX - pan.x) / zoom;
      const canvasY = (e.clientY - pan.y) / zoom;

      if (e.shiftKey || canvasTool === 'select') {
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
        if (!e.ctrlKey && !e.metaKey) {
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

  // Listener global de mouse para movimentação, seleção em área e arraste a 60fps
  useEffect(() => {
    if (!isDraggingGroup && !isDraggingCanvas && !draggingFrameId && !resizingFrameId && !isSelectingArea) return;

    let animFrameId: number;

    const handleWindowMouseMove = (e: MouseEvent) => {
      cancelAnimationFrame(animFrameId);
      animFrameId = requestAnimationFrame(() => {
        const canvasX = (e.clientX - pan.x) / zoom;
        const canvasY = (e.clientY - pan.y) / zoom;

        if (isSelectingArea && selectionBox) {
          setSelectionBox(prev => prev ? { ...prev, currentX: canvasX, currentY: canvasY } : null);

          const minX = Math.min(selectionBox.startX, canvasX);
          const maxX = Math.max(selectionBox.startX, canvasX);
          const minY = Math.min(selectionBox.startY, canvasY);
          const maxY = Math.max(selectionBox.startY, canvasY);

          if (funnel) {
            const boxedIds = funnel.nodes.filter(n => {
              const w = n.subType === 'sticky_note' ? 256 : (n.subType === 'icp_persona' ? 240 : 224);
              const h = n.subType === 'sticky_note' ? 200 : 100;
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
  }, [isDraggingGroup, isDraggingCanvas, draggingFrameId, resizingFrameId, isSelectingArea, selectionBox, dragStart, pan, zoom, draggingGroupOffsets, frameDragOffset, frameResizeStart, funnel]);

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

  // ── ⚡ AUTO-ORGANIZAÇÃO HIERÁRQUICA EM 1-CLIQUE ───────────────────────────
  const handleAutoLayout = () => {
    if (!funnel || funnel.nodes.length === 0) return;

    const nodes = [...funnel.nodes];
    const connections = funnel.connections;

    // 1. Mapeamento de entradas (inDegree) e conexões de saída (adjList)
    const inDegree: Record<string, number> = {};
    const adjList: Record<string, string[]> = {};
    
    nodes.forEach(n => {
      inDegree[n.id] = 0;
      adjList[n.id] = [];
    });

    connections.forEach(c => {
      if (adjList[c.fromNodeId]) {
        adjList[c.fromNodeId].push(c.toNodeId);
      }
      if (inDegree[c.toNodeId] !== undefined) {
        inDegree[c.toNodeId]++;
      }
    });

    // 2. Determinação de camadas por busca em largura (BFS / Topological Layers)
    const layers: Record<number, string[]> = {};
    const nodeLayer: Record<string, number> = {};
    const queue: { id: string; layer: number }[] = [];

    // Nós raiz (entradas de tráfego ou sem pai)
    const rootNodes = nodes.filter(n => (inDegree[n.id] === 0 || n.type === 'traffic') && n.subType !== 'sticky_note');

    if (rootNodes.length === 0 && nodes.length > 0) {
      const firstNonSticky = nodes.find(n => n.subType !== 'sticky_note') || nodes[0];
      queue.push({ id: firstNonSticky.id, layer: 0 });
      nodeLayer[firstNonSticky.id] = 0;
    } else {
      rootNodes.forEach(r => {
        queue.push({ id: r.id, layer: 0 });
        nodeLayer[r.id] = 0;
      });
    }

    const visited = new Set<string>();

    while (queue.length > 0) {
      const { id, layer } = queue.shift()!;
      if (visited.has(id)) continue;
      visited.add(id);

      if (!layers[layer]) layers[layer] = [];
      if (!layers[layer].includes(id)) {
        layers[layer].push(id);
      }

      const children = adjList[id] || [];
      children.forEach(childId => {
        const nextLayer = layer + 1;
        if (nodeLayer[childId] === undefined || nodeLayer[childId] < nextLayer) {
          nodeLayer[childId] = nextLayer;
        }
        queue.push({ id: childId, layer: nodeLayer[childId] });
      });
    }

    // Nós isolados restantes
    nodes.forEach(n => {
      if (!visited.has(n.id) && n.subType !== 'sticky_note') {
        const maxLayer = Math.max(0, ...Object.keys(layers).map(Number));
        const targetLayer = maxLayer + 1;
        if (!layers[targetLayer]) layers[targetLayer] = [];
        layers[targetLayer].push(n.id);
        nodeLayer[n.id] = targetLayer;
      }
    });

    // 3. Posicionamento simétrico e espaçado
    const COLUMN_WIDTH = 340;
    const ROW_HEIGHT = 140;
    const START_X = 80;
    const START_Y = 120;

    let stickyOffsetY = 0;

    const newNodes = nodes.map(node => {
      if (node.subType === 'sticky_note') {
        const snX = START_X;
        const snY = START_Y + 500 + stickyOffsetY;
        stickyOffsetY += 220;
        return { ...node, x: snX, y: snY };
      }

      const layer = nodeLayer[node.id] ?? 0;
      const nodesInLayer = layers[layer] || [node.id];
      const indexInLayer = nodesInLayer.indexOf(node.id);

      const x = START_X + layer * COLUMN_WIDTH;
      const totalHeight = (nodesInLayer.length - 1) * ROW_HEIGHT;
      const y = START_Y + (indexInLayer * ROW_HEIGHT) - (totalHeight / 2) + 180;

      return { ...node, x, y };
    });

    setFunnel(prev => prev ? { ...prev, nodes: newNodes } : null);
    toast.success('⚡ Fluxo auto-organizado em camadas harmoniosas!');
  };

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
    const maxX = Math.max(...selectedNodes.map(n => n.x + 230)) + 30;
    const maxY = Math.max(...selectedNodes.map(n => n.y + 110)) + 30;

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

  const handleAlignNodes = (type: 'left' | 'top') => {
    if (!funnel || selectedNodeIds.length < 2) return;
    const selectedNodes = funnel.nodes.filter(n => selectedNodeIds.includes(n.id));
    
    if (type === 'left') {
      const minX = Math.min(...selectedNodes.map(n => n.x));
      setFunnel(prev => prev ? {
        ...prev,
        nodes: prev.nodes.map(n => selectedNodeIds.includes(n.id) ? { ...n, x: minX } : n)
      } : null);
      toast.success('Blocos alinhados à esquerda!');
    } else if (type === 'top') {
      const minY = Math.min(...selectedNodes.map(n => n.y));
      setFunnel(prev => prev ? {
        ...prev,
        nodes: prev.nodes.map(n => selectedNodeIds.includes(n.id) ? { ...n, y: minY } : n)
      } : null);
      toast.success('Blocos alinhados ao topo!');
    }
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
      if (!prev) return null;
      return {
        ...prev,
        [field]: value
      };
    });
  };

  // ── ➕ ADICIONAR BLOCO DO CATÁLOGO ────────────────────────────────────────
  const handleAddBlock = (blockMeta: BlockMeta) => {
    const canvasCenterX = Math.round((-pan.x + window.innerWidth / 2) / zoom);
    const canvasCenterY = Math.round((-pan.y + window.innerHeight / 2) / zoom);

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
      checklist: blockMeta.checklist.map((task, i) => ({
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

    handleOpenNodeEditor(newNode);
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

    const canvasX = (e.clientX - pan.x) / zoom;
    const canvasY = (e.clientY - pan.y) / zoom;

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

  // ── 📐 GERADOR DE CAMINHO DE CONEXÃO (BÉZIER & ORTOGONAL COM PORTAS INTELIGENTES) ──
  const calculateConnectionPath = (fromNode: FunnelNode, toNode: FunnelNode, style: 'bezier' | 'orthogonal') => {
    const isBackwards = fromNode.x >= toNode.x - 40;
    const fromWidth = fromNode.subType === 'sticky_note' ? 256 : fromNode.subType === 'icp_persona' ? 240 : 224;
    const toWidth = toNode.subType === 'sticky_note' ? 256 : toNode.subType === 'icp_persona' ? 240 : 224;

    if (isBackwards) {
      // Loop de retorno: Sai pelo topo ou base para não cruzar por cima dos cards!
      if (fromNode.y <= toNode.y) {
        // Sai por baixo do card de origem e entra por baixo do destino
        const startX = fromNode.x + fromWidth / 2;
        const startY = fromNode.y + 90;
        const endX = toNode.x + toWidth / 2;
        const endY = toNode.y + 90;

        if (style === 'orthogonal') {
          const dropY = Math.max(fromNode.y, toNode.y) + 130;
          return `M ${startX} ${startY} L ${startX} ${dropY} L ${endX} ${dropY} L ${endX} ${endY}`;
        } else {
          const controlY = Math.max(fromNode.y, toNode.y) + 160;
          return `M ${startX} ${startY} C ${startX} ${controlY}, ${endX} ${controlY}, ${endX} ${endY}`;
        }
      } else {
        // Sai por cima do card de origem e entra por cima do destino
        const startX = fromNode.x + fromWidth / 2;
        const startY = fromNode.y;
        const endX = toNode.x + toWidth / 2;
        const endY = toNode.y;

        if (style === 'orthogonal') {
          const topY = Math.min(fromNode.y, toNode.y) - 50;
          return `M ${startX} ${startY} L ${startX} ${topY} L ${endX} ${topY} L ${endX} ${endY}`;
        } else {
          const controlY = Math.min(fromNode.y, toNode.y) - 80;
          return `M ${startX} ${startY} C ${startX} ${controlY}, ${endX} ${controlY}, ${endX} ${endY}`;
        }
      }
    } else {
      // Fluxo normal da esquerda para a direita
      const startX = fromNode.x + fromWidth;
      const startY = fromNode.y + 45;
      const endX = toNode.x;
      const endY = toNode.y + 45;

      if (style === 'orthogonal') {
        const midX = (startX + endX) / 2;
        return `M ${startX} ${startY} L ${midX} ${startY} L ${midX} ${endY} L ${endX} ${endY}`;
      } else {
        const deltaX = Math.abs(endX - startX) * 0.5;
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
      Target, StickyNote, BoxSelect, Wand2, MousePointer, Workflow, Spline
    };
    const IconComp = icons[iconName] || Layers;
    return <IconComp size={size} />;
  };

  if (loading || !funnel) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-[#050914] text-white">
        <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin mb-3" />
        <p className="text-sm text-gray-400 font-medium">Carregando arquiteto de funis...</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-[#050914] text-white overflow-hidden select-none font-sans">
      
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
            {['icp', 'note', 'traffic', 'page', 'offer', 'affiliate', 'automation', 'b2b', 'cs', 'hr'].map(catKey => {
              const blocks = FUNNEL_BLOCK_CATALOG.filter(b => {
                const matchesCat = b.type === catKey || (catKey === 'affiliate' && b.subType.startsWith('affiliate_'));
                const matchesSearch = !blockSearchQuery || 
                  b.name.toLowerCase().includes(blockSearchQuery.toLowerCase()) ||
                  b.description.toLowerCase().includes(blockSearchQuery.toLowerCase());
                return matchesCat && matchesSearch;
              });

              if (blocks.length === 0) return null;

              const categoryLabels: Record<string, string> = {
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

              return (
                <div key={catKey} className="space-y-1.5">
                  <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-wider px-1">
                    {categoryLabels[catKey] || catKey}
                  </h4>
                  <div className="grid grid-cols-1 gap-1.5">
                    {blocks.map(block => (
                      <button
                        key={block.subType}
                        onClick={() => handleAddBlock(block)}
                        className="w-full p-2 rounded-xl bg-white/[0.02] hover:bg-white/[0.07] border border-white/5 hover:border-indigo-500/40 text-left transition-all group flex items-start gap-2.5"
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
          className={`flex-1 h-full relative overflow-hidden bg-[#050914] select-none ${
            canvasTool === 'select' ? 'cursor-crosshair' : (isDraggingCanvas ? 'cursor-grabbing' : 'cursor-grab')
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
                    className={`absolute w-64 p-4 rounded-2xl pointer-events-auto cursor-grab active:cursor-grabbing shadow-xl transition-all border z-20 ${style.bg} ${style.border} ${
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
                    className={`absolute w-60 rounded-2xl pointer-events-auto cursor-pointer transition-all select-none backdrop-blur-2xl border z-20 ${
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

              // 📦 RENDERIZAÇÃO PADRÃO DE BLOCOS (TRÁFEGO, PÁGINAS, OFERTAS, AUTOMAÇÕES, B2B, CS, RH)
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
                  className={`absolute w-56 rounded-2xl pointer-events-auto cursor-pointer transition-all select-none backdrop-blur-2xl border z-20 ${
                    isSelected
                      ? 'border-indigo-400 shadow-2xl shadow-indigo-500/40 ring-4 ring-indigo-500/50 bg-[#0c1427] scale-[1.02]'
                      : isConnectingSource
                      ? 'border-amber-400 shadow-2xl shadow-amber-500/30 ring-2 ring-amber-500/40 bg-[#0c1427]'
                      : 'border-white/10 hover:border-white/30 bg-[#090e1c]/90 shadow-xl'
                  } ${shouldDim ? 'opacity-25 hover:opacity-100' : 'opacity-100'}`}
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
                      {node.type === 'offer' && node.price !== undefined ? (
                        <span className="font-black text-emerald-400">
                          R$ {node.price.toFixed(2)}
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

              {/* Alinhar à Esquerda */}
              <button
                onClick={() => handleAlignNodes('left')}
                className="p-1.5 bg-white/5 hover:bg-white/15 text-gray-300 hover:text-white rounded-xl text-xs font-bold transition-colors"
                title="Alinhar blocos à esquerda"
              >
                <AlignLeft className="w-4 h-4" />
              </button>

              {/* Alinhar ao Topo */}
              <button
                onClick={() => handleAlignNodes('top')}
                className="p-1.5 bg-white/5 hover:bg-white/15 text-gray-300 hover:text-white rounded-xl text-xs font-bold transition-colors"
                title="Alinhar blocos ao topo"
              >
                <AlignTop className="w-4 h-4" />
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

          {/* ── 🎛️ CONTROLES DE ZOOM NO CANTO INFERIOR DIREITO ────────────────────── */}
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

                    {activeNode.subType !== 'sticky_note' && activeNode.subType !== 'icp_persona' && (
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
                                  {offer.name} - R$ {offer.price.toFixed(2)}
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
                  <div className="space-y-2">
                    {(activeNode.checklist || []).map((item) => (
                      <div key={item.id} className="flex items-center gap-2 p-2 bg-white/5 rounded-xl text-xs text-gray-300">
                        <input
                          type="checkbox"
                          checked={item.done}
                          onChange={(e) => {
                            const newChecklist = activeNode.checklist!.map(c => c.id === item.id ? { ...c, done: e.target.checked } : c);
                            updateDraftField('checklist', newChecklist);
                          }}
                          className="accent-indigo-500"
                        />
                        <span>{item.text}</span>
                      </div>
                    ))}
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

      </div>
    </div>
  );
}
