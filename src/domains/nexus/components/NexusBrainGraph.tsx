import React, { useRef, useState, useEffect, useMemo } from 'react';
import { useNexusStore, NexusBook, NexusNote, PersonalLink } from '@store/useNexusStore';

// === interfaces de tipagem do grafo ===
interface GraphNode {
  id: string;
  label: string;
  type: 'book' | 'note' | 'goal' | 'link';
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  glowColor: string;
  details: any; // Armazena a referência original
}

interface GraphLink {
  source: string;
  target: string;
  type: 'note-book' | 'note-note' | 'book-goal' | 'note-goal' | 'link-folder';
}

export function NexusBrainGraph() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Elementos do Zustand Store
  const books = useNexusStore(state => state.books);
  const notes = useNexusStore(state => state.notes);
  const links = useNexusStore(state => state.links);
  const goals = useNexusStore(state => state.goals || []);

  // Estados de controle e navegação
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [filter, setFilter] = useState({
    books: true,
    notes: true,
    goals: true,
    links: true
  });

  // Estados de transformação de tela (Pan e Zoom)
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(0.95);
  const [isPanning, setIsPanning] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  
  // Controle de arrasto físico de nós
  const [draggedNode, setDraggedNode] = useState<GraphNode | null>(null);

  // Instância persistente de nós e links na memória (para física estável contínua)
  const graphDataRef = useRef<{ nodes: GraphNode[]; links: GraphLink[] }>({ nodes: [], links: [] });

  // === CONSTRUÇÃO DO GRAFO (MAPEAMENTO REATIVO DAS ENTIDADES) ===
  useEffect(() => {
    const existingNodes = new Map(graphDataRef.current.nodes.map(n => [n.id, n]));
    const nodes: GraphNode[] = [];
    const createdLinks: GraphLink[] = [];

    const centerWidth = containerRef.current?.clientWidth || 800;
    const centerHeight = containerRef.current?.clientHeight || 600;

    // Helper para gerar posições iniciais orgânicas sem reiniciar nós existentes
    const getInitialPos = (id: string, idx: number, total: number) => {
      const existing = existingNodes.get(id);
      if (existing) return { x: existing.x, y: existing.y, vx: existing.vx, vy: existing.vy };
      
      const angle = (idx / total) * Math.PI * 2;
      const radius = 180 + Math.random() * 100;
      return {
        x: centerWidth / 2 + Math.cos(angle) * radius,
        y: centerHeight / 2 + Math.sin(angle) * radius,
        vx: 0,
        vy: 0
      };
    };

    // 1. Mapear Livros
    if (filter.books) {
      books.forEach((book, idx) => {
        const id = `book-${book.id}`;
        const pos = getInitialPos(id, idx, books.length || 1);
        nodes.push({
          id,
          label: book.title,
          type: 'book',
          ...pos,
          radius: 26,
          color: book.status === 'finished' ? '#10b981' : '#3b82f6', // Verde se lido, azul se lendo
          glowColor: book.status === 'finished' ? 'rgba(16,185,129,0.35)' : 'rgba(59,130,246,0.35)',
          details: book
        });
      });
    }

    // 2. Mapear Notas
    if (filter.notes) {
      notes.forEach((note, idx) => {
        const id = `note-${note.id}`;
        const pos = getInitialPos(id, idx, notes.length || 1);
        nodes.push({
          id,
          label: note.title,
          type: 'note',
          ...pos,
          radius: 22,
          color: '#8b5cf6', // Roxo elétrico para notas
          glowColor: 'rgba(139,92,246,0.35)',
          details: note
        });

        // Conexão Nota ➔ Livro
        if (note.bookId && filter.books) {
          createdLinks.push({
            source: id,
            target: `book-${note.bookId}`,
            type: 'note-book'
          });
        }

        // Conexão Nota ➔ Nota (Backlinks dinâmicos `[[Link]]`)
        if (note.content) {
          const backlinkRegex = /\[\[(.*?)\]\]/g;
          let match;
          while ((match = backlinkRegex.exec(note.content)) !== null) {
            const targetTitle = match[1].trim();
            const targetNote = notes.find(n => n.title.toLowerCase() === targetTitle.toLowerCase());
            if (targetNote) {
              createdLinks.push({
                source: id,
                target: `note-${targetNote.id}`,
                type: 'note-note'
              });
            }
          }
        }
      });
    }

    // 3. Mapear Metas (PDI)
    if (filter.goals) {
      goals.forEach((goal, idx) => {
        const id = `goal-${goal.id}`;
        const pos = getInitialPos(id, idx, goals.length || 1);
        nodes.push({
          id,
          label: goal.title,
          type: 'goal',
          ...pos,
          radius: 28,
          color: '#d97706', // Ouro / Latão para PDI
          glowColor: 'rgba(217,119,6,0.35)',
          details: goal
        });

        // Conexão de Metas com Livros/Notas com base em tags ou títulos citados
        if (filter.books) {
          books.forEach(book => {
            if (goal.title.toLowerCase().includes(book.title.toLowerCase()) || 
                (book.category && goal.title.toLowerCase().includes(book.category.toLowerCase()))) {
              createdLinks.push({
                source: `book-${book.id}`,
                target: id,
                type: 'book-goal'
              });
            }
          });
        }
      });
    }

    // 4. Mapear Links Estratégicos
    if (filter.links) {
      links.forEach((link, idx) => {
        const id = `link-${link.id}`;
        const pos = getInitialPos(id, idx, links.length || 1);
        nodes.push({
          id,
          label: link.label,
          type: 'link',
          ...pos,
          radius: 18,
          color: '#475569', // Slate metálico
          glowColor: 'rgba(71,85,105,0.3)',
          details: link
        });

        // Conectar link a alguma nota relacionada se compartilharem palavras
        if (filter.notes) {
          notes.forEach(note => {
            if (note.title.toLowerCase().includes(link.label.toLowerCase()) || 
                link.label.toLowerCase().includes(note.title.toLowerCase())) {
              createdLinks.push({
                source: id,
                target: `note-${note.id}`,
                type: 'link-folder'
              });
            }
          });
        }
      });
    }

    // Se a constelação estiver muito solta, cria conexões lúdicas extras para formar uma teia coesa e agradável
    if (createdLinks.length === 0 && nodes.length > 1) {
      for (let i = 0; i < nodes.length - 1; i++) {
        if (nodes[i].type !== nodes[i+1].type) {
          createdLinks.push({
            source: nodes[i].id,
            target: nodes[i+1].id,
            type: 'note-book'
          });
        }
      }
    }

    graphDataRef.current = { nodes, links: createdLinks };
  }, [books, notes, links, goals, filter]);

  // === MOTOR DE FÍSICA ELÁSTICA (FORCE-DIRECTED RENDER LOOP) ===
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;

    const updatePhysicsAndDraw = () => {
      const { nodes, links } = graphDataRef.current;
      const centerWidth = canvas.width / 2;
      const centerHeight = canvas.height / 2;

      // 1. APLICAR FORÇAS FÍSICAS DE REPULSÃO E ATRAÇÃO (Efeito Mola Elástica)
      const kRepulsion = 1200; // Força de distanciamento entre nós
      const kSpring = 0.04;   // Constante de elasticidade dos links
      const lRest = 140;       // Distância de repouso confortável
      const gravity = 0.015;   // Puxão magnético centralizador suave
      const friction = 0.85;   // Dissipação de energia (amortecimento de oscilações)

      // A. Força de Repulsão (Coulomb) - Impede sobreposições
      for (let i = 0; i < nodes.length; i++) {
        const nodeA = nodes[i];
        if (nodeA === draggedNode) continue;

        for (let j = i + 1; j < nodes.length; j++) {
          const nodeB = nodes[j];

          const dx = nodeB.x - nodeA.x;
          const dy = nodeB.y - nodeA.y;
          const distSq = dx * dx + dy * dy + 0.1;
          const dist = Math.sqrt(distSq);

          if (dist < 400) {
            const force = kRepulsion / distSq;
            const ax = (dx / dist) * force;
            const ay = (dy / dist) * force;

            nodeA.vx -= ax;
            nodeA.vy -= ay;
            nodeB.vx += ax;
            nodeB.vy += ay;
          }
        }

        // B. Gravidade Centralizadora
        const dx = centerWidth - nodeA.x;
        const dy = centerHeight - nodeA.y;
        nodeA.vx += dx * gravity;
        nodeA.vy += dy * gravity;
      }

      // C. Força de Atração de Mola (Hooke) nas conexões existentes
      links.forEach(link => {
        const sourceNode = nodes.find(n => n.id === link.source);
        const targetNode = nodes.find(n => n.id === link.target);

        if (sourceNode && targetNode) {
          const dx = targetNode.x - sourceNode.x;
          const dy = targetNode.y - sourceNode.y;
          const dist = Math.sqrt(dx * dx + dy * dy) + 0.1;

          const displacement = dist - lRest;
          const force = displacement * kSpring;
          const ax = (dx / dist) * force;
          const ay = (dy / dist) * force;

          if (sourceNode !== draggedNode) {
            sourceNode.vx += ax;
            sourceNode.vy += ay;
          }
          if (targetNode !== draggedNode) {
            targetNode.vx -= ax;
            targetNode.vy -= ay;
          }
        }
      });

      // D. Atualização síncrona das posições + Inércia
      nodes.forEach(node => {
        if (node === draggedNode) return; // Nó arrastado é controlado pelo cursor
        
        node.vx *= friction;
        node.vy *= friction;
        node.x += node.vx;
        node.y += node.vy;
      });

      // 2. RENDERIZAÇÃO GRÁFICA NO CANVAS
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.save();
      
      // Aplicar transformações globais de Pan e Zoom
      ctx.translate(pan.x, pan.y);
      ctx.scale(zoom, zoom);

      // A. Desenhar as Conexões (Edges/Links)
      links.forEach(link => {
        const sourceNode = nodes.find(n => n.id === link.source);
        const targetNode = nodes.find(n => n.id === link.target);

        if (sourceNode && targetNode) {
          // Filtrar por busca (nós que combinam acendem, os outros apagam levemente)
          const isSourceMatch = !searchTerm || sourceNode.label.toLowerCase().includes(searchTerm.toLowerCase());
          const isTargetMatch = !searchTerm || targetNode.label.toLowerCase().includes(searchTerm.toLowerCase());
          const isLinkHighlighted = searchTerm ? (isSourceMatch && isTargetMatch) : true;

          ctx.beginPath();
          ctx.moveTo(sourceNode.x, sourceNode.y);
          ctx.lineTo(targetNode.x, targetNode.y);
          
          // Estilo da mola com base no tipo de conexão
          let strokeStyle = 'rgba(255,255,255,0.06)';
          if (isLinkHighlighted) {
            if (link.type === 'note-book') strokeStyle = 'rgba(59,130,246,0.22)';
            else if (link.type === 'note-note') strokeStyle = 'rgba(139,92,246,0.22)';
            else if (link.type === 'book-goal') strokeStyle = 'rgba(217,119,6,0.3)';
            else strokeStyle = 'rgba(255,255,255,0.1)';
          }

          ctx.strokeStyle = strokeStyle;
          ctx.lineWidth = isLinkHighlighted ? 1.5 : 0.6;
          ctx.stroke();
        }
      });

      // B. Desenhar os Nós (Nodes)
      nodes.forEach(node => {
        const isMatch = !searchTerm || node.label.toLowerCase().includes(searchTerm.toLowerCase());
        const opacity = isMatch ? 1.0 : 0.25;

        ctx.save();
        ctx.globalAlpha = opacity;

        // Aura brilhante neon (Glow Effect) no hover ou na busca
        const isHovered = selectedNode?.id === node.id;
        if (isHovered || (searchTerm && isMatch)) {
          ctx.shadowColor = node.color;
          ctx.shadowBlur = 15;
        }

        // Desenhar Círculo Principal do Nó
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
        
        // Gradiente interno luxuoso
        const grad = ctx.createRadialGradient(node.x, node.y, 2, node.x, node.y, node.radius);
        grad.addColorStop(0, '#11131b');
        grad.addColorStop(1, node.color);
        
        ctx.fillStyle = grad;
        ctx.fill();

        // Borda fina elegante
        ctx.strokeStyle = isHovered ? '#ffffff' : 'rgba(255,255,255,0.18)';
        ctx.lineWidth = isHovered ? 2 : 1;
        ctx.stroke();

        ctx.restore(); // Desativa o glow effect para o texto

        // Ícone estético representativo dentro do nó
        ctx.fillStyle = '#ffffff';
        ctx.font = '10px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        let icon = '📝';
        if (node.type === 'book') icon = '📘';
        else if (node.type === 'goal') icon = '🎯';
        else if (node.type === 'link') icon = '🔗';

        ctx.fillText(icon, node.x, node.y - 1);

        // Texto/Label abaixo do nó
        ctx.fillStyle = isMatch ? '#f8fafc' : '#94a3b8';
        ctx.font = isHovered ? 'bold 10px sans-serif' : '9px sans-serif';
        ctx.textAlign = 'center';
        
        // Cortar texto longo para não poluir
        const truncatedLabel = node.label.length > 15 ? node.label.substring(0, 13) + '...' : node.label;
        ctx.fillText(truncatedLabel.toUpperCase(), node.x, node.y + node.radius + 14);
      });

      ctx.restore();
      animationFrameId = requestAnimationFrame(updatePhysicsAndDraw);
    };

    updatePhysicsAndDraw();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [selectedNode, pan, zoom, draggedNode, searchTerm]);

  // === REDIMENSIONAMENTO COMPATÍVEL DO CANVAS ===
  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) return;

      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // === INTERAÇÕES DO MOUSE: DRAG, PAN E CLICK ===
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const clientY = e.clientY - rect.top;

    // Traduzir coordenadas reais da tela para coordenadas do Canvas escalado/movido
    const canvasX = (clientX - pan.x) / zoom;
    const canvasY = (clientY - pan.y) / zoom;

    // Detectar se clicou em algum nó existente
    const { nodes } = graphDataRef.current;
    let clickedNode: GraphNode | null = null;

    for (let i = nodes.length - 1; i >= 0; i--) {
      const node = nodes[i];
      const dx = canvasX - node.x;
      const dy = canvasY - node.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < node.radius + 5) {
        clickedNode = node;
        break;
      }
    }

    if (clickedNode) {
      setDraggedNode(clickedNode);
      setSelectedNode(clickedNode);
      // Fixa nó na posição do mouse temporariamente
      clickedNode.vx = 0;
      clickedNode.vy = 0;
    } else {
      setIsPanning(true);
      setDragStart({ x: e.clientX, y: e.clientY });
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (draggedNode && canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      const clientX = e.clientX - rect.left;
      const clientY = e.clientY - rect.top;

      // Arrastar nó
      draggedNode.x = (clientX - pan.x) / zoom;
      draggedNode.y = (clientY - pan.y) / zoom;
      draggedNode.vx = 0;
      draggedNode.vy = 0;
    } else if (isPanning) {
      const dx = e.clientX - dragStart.x;
      const dy = e.clientY - dragStart.y;
      setPan(prev => ({ x: prev.x + dx, y: prev.y + dy }));
      setDragStart({ x: e.clientX, y: e.clientY });
    }
  };

  const handleMouseUp = () => {
    setDraggedNode(null);
    setIsPanning(false);
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const zoomFactor = 1.05;
    if (e.deltaY < 0) {
      // Zoom In
      setZoom(prev => Math.min(prev * zoomFactor, 2.5));
    } else {
      // Zoom Out
      setZoom(prev => Math.max(prev / zoomFactor, 0.4));
    }
  };

  // Centraliza o grafo no meio da tela novamente
  const handleResetView = () => {
    setPan({ x: 0, y: 0 });
    setZoom(0.95);
  };

  return (
    <div className="w-full h-[calc(100vh-140px)] flex gap-6 relative overflow-hidden">
      
      {/* 🚀 BARRA LATERAL ESQUERDA DE FILTROS (GLASSMORPHISM) */}
      <div className="w-64 shrink-0 bg-slate-950/65 backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-6 flex flex-col gap-6 select-none">
        <div>
          <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Filtros da Constelação</span>
          <h3 className="text-xs font-black text-white uppercase tracking-widest mt-1">Conexões Ativas</h3>
        </div>

        <div className="flex flex-col gap-3">
          <label className="flex items-center justify-between bg-white/5 border border-white/5 px-4 py-3 rounded-xl cursor-pointer hover:bg-white/10 transition-all">
            <span className="text-[10px] font-bold text-gray-300 uppercase flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              Livros
            </span>
            <input 
              type="checkbox" 
              checked={filter.books} 
              onChange={() => setFilter(f => ({ ...f, books: !f.books }))} 
              className="accent-primary-500 rounded border-white/10 bg-slate-900"
            />
          </label>

          <label className="flex items-center justify-between bg-white/5 border border-white/5 px-4 py-3 rounded-xl cursor-pointer hover:bg-white/10 transition-all">
            <span className="text-[10px] font-bold text-gray-300 uppercase flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-purple-500" />
              Notas do Nexus
            </span>
            <input 
              type="checkbox" 
              checked={filter.notes} 
              onChange={() => setFilter(f => ({ ...f, notes: !f.notes }))}
              className="accent-purple-500 rounded border-white/10 bg-slate-900"
            />
          </label>

          <label className="flex items-center justify-between bg-white/5 border border-white/5 px-4 py-3 rounded-xl cursor-pointer hover:bg-white/10 transition-all">
            <span className="text-[10px] font-bold text-gray-300 uppercase flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              Metas de PDI
            </span>
            <input 
              type="checkbox" 
              checked={filter.goals} 
              onChange={() => setFilter(f => ({ ...f, goals: !f.goals }))}
              className="accent-amber-500 rounded border-white/10 bg-slate-900"
            />
          </label>

          <label className="flex items-center justify-between bg-white/5 border border-white/5 px-4 py-3 rounded-xl cursor-pointer hover:bg-white/10 transition-all">
            <span className="text-[10px] font-bold text-gray-300 uppercase flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-slate-500" />
              Links
            </span>
            <input 
              type="checkbox" 
              checked={filter.links} 
              onChange={() => setFilter(f => ({ ...f, links: !f.links }))}
              className="accent-slate-500 rounded border-white/10 bg-slate-900"
            />
          </label>
        </div>

        <button 
          onClick={handleResetView}
          className="mt-auto flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-[9px] font-black text-gray-400 hover:text-white uppercase tracking-widest py-3.5 rounded-xl transition-all cursor-pointer"
        >
          <i className="ph-bold ph-frame-corners text-sm" /> Centralizar Visão
        </button>
      </div>

      {/* 🌐 CANVAS CENTRAL DO GRAFO */}
      <div 
        ref={containerRef} 
        className="flex-1 bg-slate-950/40 border border-white/10 rounded-[2.5rem] relative overflow-hidden group/canvas"
      >
        {/* Barra de Pesquisa Neon Flutuante */}
        <div className="absolute top-6 left-6 right-6 z-20 flex items-center gap-4 pointer-events-none">
          <div className="w-80 bg-slate-950/85 backdrop-blur-md border border-white/10 hover:border-primary-500/40 focus-within:border-primary-500 focus-within:shadow-[0_0_15px_rgba(59,130,246,0.2)] rounded-full px-5 py-2.5 flex items-center gap-3 transition-all pointer-events-auto">
            <i className="ph-bold ph-magnifying-glass text-gray-500 text-sm" />
            <input 
              type="text" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="PESQUISAR NA CONSTELAÇÃO..." 
              className="w-full bg-transparent border-none text-[10px] font-bold uppercase tracking-widest text-white placeholder-gray-600 focus:outline-none focus:ring-0"
            />
            {searchTerm && (
              <button onClick={() => setSearchTerm('')} className="p-1 text-gray-500 hover:text-white transition-all">
                <i className="ph-bold ph-x" />
              </button>
            )}
          </div>
        </div>

        <canvas
          ref={canvasRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onWheel={handleWheel}
          className="w-full h-full cursor-grab active:cursor-grabbing block"
        />

        {/* HUD de Dicas */}
        <div className="absolute bottom-6 left-6 bg-slate-950/85 backdrop-blur-md border border-white/10 rounded-full px-5 py-2.5 flex items-center gap-5 text-[8px] text-gray-500 font-black uppercase tracking-widest pointer-events-none">
          <div className="flex items-center gap-1.5"><span className="w-1 h-1 rounded-full bg-primary-500" /> Arraste nós para organizar</div>
          <div className="w-px h-2 bg-white/10" />
          <div className="flex items-center gap-1.5"><span className="w-1 h-1 rounded-full bg-emerald-500" /> Clique nos nós para detalhar</div>
          <div className="w-px h-2 bg-white/10" />
          <div className="flex items-center gap-1.5"><span className="w-1 h-1 rounded-full bg-amber-500" /> Scroll do mouse para Zoom</div>
        </div>
      </div>

      {/* 💎 PAINEL LATERAL DIREITO DE DETALHES (GLASSMORPHISM PREVIEW) */}
      {selectedNode && (
        <div className="w-80 shrink-0 bg-slate-950/65 backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-6 flex flex-col gap-6 select-none animate-in slide-in-from-right duration-350">
          <div className="flex items-start justify-between">
            <div>
              <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded-md ${
                selectedNode.type === 'book' ? 'bg-blue-500/20 text-blue-400' :
                selectedNode.type === 'note' ? 'bg-purple-500/20 text-purple-400' :
                selectedNode.type === 'goal' ? 'bg-amber-500/20 text-amber-400' :
                'bg-slate-500/20 text-slate-400'
              }`}>
                {selectedNode.type === 'book' ? 'Livro / Estante' :
                 selectedNode.type === 'note' ? 'Nota / Insight' :
                 selectedNode.type === 'goal' ? 'Objetivo PDI' :
                 'Link Estratégico'}
              </span>
            </div>
            <button onClick={() => setSelectedNode(null)} className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-gray-500 hover:text-white transition-all cursor-pointer">
              <i className="ph-bold ph-x" />
            </button>
          </div>

          <div className="flex flex-col gap-2">
            <h2 className="text-sm font-black text-white uppercase tracking-wider leading-tight">{selectedNode.label}</h2>
            {selectedNode.type === 'book' && (
              <p className="text-[10px] font-bold text-gray-500 uppercase">
                Categoria: {selectedNode.details.category || 'Geral'}
              </p>
            )}
          </div>

          <div className="flex-1 bg-white/[0.02] border border-white/5 rounded-2xl p-4 overflow-y-auto max-h-[40vh] custom-scrollbar">
            {selectedNode.type === 'book' && (
              <div className="flex flex-col gap-4">
                <div className="flex justify-between items-center text-[10px] uppercase font-bold text-gray-400">
                  <span>Progresso Lido</span>
                  <span className="text-blue-400">{selectedNode.details.currentPage} / {selectedNode.details.totalPages} pág</span>
                </div>
                <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 rounded-full" style={{ width: `${Math.min(((selectedNode.details.currentPage || 0) / (selectedNode.details.totalPages || 1)) * 100, 100)}%` }} />
                </div>
                <div className="text-[9px] font-medium text-gray-500 uppercase leading-relaxed mt-2">
                  Adicionado em {selectedNode.details.addedAt ? new Date(selectedNode.details.addedAt).toLocaleDateString('pt-BR') : 'N/A'}. Formato: {selectedNode.details.format?.toUpperCase() || 'PDF'}.
                </div>
              </div>
            )}

            {selectedNode.type === 'note' && (
              <div className="flex flex-col gap-3">
                <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Conteúdo da Nota</span>
                <p className="text-[10px] font-semibold text-gray-300 leading-relaxed uppercase whitespace-pre-wrap">
                  {selectedNode.details.content ? selectedNode.details.content.replace(/\[\[(.*?)\]\]/g, '$1') : 'SEM CONTEÚDO DIGITADO.'}
                </p>
              </div>
            )}

            {selectedNode.type === 'goal' && (
              <div className="flex flex-col gap-3">
                <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Detalhes do Objetivo</span>
                <p className="text-[10px] font-semibold text-gray-300 leading-relaxed uppercase">
                  {selectedNode.details.description || 'ESTA META NÃO POSSUI DESCRIÇÃO ADICIONAL.'}
                </p>
                <div className="flex justify-between text-[8px] font-bold text-gray-500 uppercase pt-2 border-t border-white/5">
                  <span>Coluna</span>
                  <span className="text-amber-500">{selectedNode.details.status || 'PDI'}</span>
                </div>
              </div>
            )}

            {selectedNode.type === 'link' && (
              <div className="flex flex-col gap-3">
                <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest">URL do Link</span>
                <a 
                  href={selectedNode.details.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-[10px] font-bold text-blue-400 break-all hover:underline"
                >
                  {selectedNode.details.url}
                </a>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-3">
            {selectedNode.type === 'book' && (
              <div className="flex flex-col gap-2">
                <div className="text-[8px] font-black text-gray-500 uppercase tracking-widest text-center">Ações Rápidas</div>
                <a
                  href={`#viewer-${selectedNode.details.id}`}
                  className="flex items-center justify-center gap-2 bg-primary-500 hover:bg-primary-600 text-white font-black text-[9px] uppercase tracking-widest py-3.5 rounded-xl transition-all hover:scale-105 active:scale-95 shadow-lg shadow-primary-500/20 text-center cursor-pointer"
                >
                  <i className="ph-bold ph-book-open text-sm" /> Iniciar Leitura
                </a>
              </div>
            )}

            {selectedNode.type === 'note' && (
              <div className="flex flex-col gap-2">
                <div className="text-[8px] font-black text-gray-500 uppercase tracking-widest text-center">Ações Rápidas</div>
                <div className="bg-white/5 border border-white/5 p-3 rounded-xl text-center">
                  <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest">Visualização Integrada</span>
                  <p className="text-[9px] text-gray-400 font-bold uppercase mt-1">Essa nota pode ser visualizada e editada diretamente na aba de Notas.</p>
                </div>
              </div>
            )}

            {selectedNode.type === 'goal' && (
              <div className="flex flex-col gap-2">
                <div className="text-[8px] font-black text-gray-500 uppercase tracking-widest text-center">Ações Rápidas</div>
                <div className="bg-white/5 border border-white/5 p-3 rounded-xl text-center">
                  <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest">Meu PDI</span>
                  <p className="text-[9px] text-gray-400 font-bold uppercase mt-1">Gerencie, edite ou mova essa meta de coluna diretamente no Kanban do PDI.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
