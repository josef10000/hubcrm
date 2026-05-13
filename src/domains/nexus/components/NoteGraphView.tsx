import React, { useMemo, useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { NexusNote } from '@store/useNexusStore';

interface Node {
  id: string;
  title: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
}

interface Link {
  source: string;
  target: string;
}

interface NoteGraphViewProps {
  notes: NexusNote[];
  onSelectNote: (id: string) => void;
  selectedNoteId: string | null;
}

export const NoteGraphView: React.FC<NoteGraphViewProps> = ({ notes, onSelectNote, selectedNoteId }) => {
  const [zoom, setZoom] = useState(1);
  const [nodes, setNodes] = useState<Node[]>([]);
  const [links, setLinks] = useState<Link[]>([]);
  const requestRef = useRef<number>();
  const containerRef = useRef<HTMLDivElement>(null);

  // Inicializar nós e links
  useEffect(() => {
    const initialNodes: Node[] = notes.map((note, i) => ({
      id: note.id,
      title: note.title || 'Sem título',
      x: Math.random() * 800 + 100,
      y: Math.random() * 600 + 100,
      vx: 0,
      vy: 0,
    }));

    const initialLinks: Link[] = [];
    notes.forEach(note => {
      const linkMatches = note.content.match(/\[\[(.*?)\]\]/g);
      if (linkMatches) {
        linkMatches.forEach(match => {
          const targetTitle = match.slice(2, -2);
          const targetNote = notes.find(n => n.title.toLowerCase() === targetTitle.toLowerCase());
          if (targetNote) {
            initialLinks.push({ source: note.id, target: targetNote.id });
          }
        });
      }
    });

    setNodes(initialNodes);
    setLinks(initialLinks);
  }, [notes]);

  // Simulação de Física (Force-Directed Graph)
  const simulate = () => {
    setNodes(prevNodes => {
      if (prevNodes.length === 0) return prevNodes;

      const nextNodes = prevNodes.map(node => ({ ...node }));
      const centerX = 500;
      const centerY = 400;
      const k = 0.05; // Constante de mola
      const repulsion = 2000; // Força de repulsão
      const friction = 0.92; // Atrito/Amortecimento

      // 1. Repulsão entre todos os nós
      for (let i = 0; i < nextNodes.length; i++) {
        for (let j = i + 1; j < nextNodes.length; j++) {
          const n1 = nextNodes[i];
          const n2 = nextNodes[j];
          const dx = n1.x - n2.x;
          const dy = n1.y - n2.y;
          const distSq = dx * dx + dy * dy + 0.1;
          const force = repulsion / distSq;
          const fx = (dx / Math.sqrt(distSq)) * force;
          const fy = (dy / Math.sqrt(distSq)) * force;

          n1.vx += fx;
          n1.vy += fy;
          n2.vx -= fx;
          n2.vy -= fy;
        }
      }

      // 2. Atração pelos links
      links.forEach(link => {
        const s = nextNodes.find(n => n.id === link.source);
        const t = nextNodes.find(n => n.id === link.target);
        if (s && t) {
          const dx = s.x - t.x;
          const dy = s.y - t.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const force = (dist - 100) * k;
          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;

          s.vx -= fx;
          s.vy -= fy;
          t.vx += fx;
          t.vy += fy;
        }
      });

      // 3. Gravidade central e Atualização de Posição
      nextNodes.forEach(node => {
        // Gravidade para o centro
        node.vx += (centerX - node.x) * 0.005;
        node.vy += (centerY - node.y) * 0.005;

        // Aplicar velocidade e atrito
        node.vx *= friction;
        node.vy *= friction;
        node.x += node.vx;
        node.y += node.vy;

        // Limites (opcional, mas ajuda a manter no centro)
        // node.x = Math.max(50, Math.min(950, node.x));
        // node.y = Math.max(50, Math.min(750, node.y));
      });

      return nextNodes;
    });

    requestRef.current = requestAnimationFrame(simulate);
  };

  useEffect(() => {
    requestRef.current = requestAnimationFrame(simulate);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [links]); // Reinicia se os links mudarem

  const getNodePos = (id: string) => nodes.find(n => n.id === id);

  return (
    <div 
      ref={containerRef}
      className="w-full h-full bg-[#030408] rounded-[3rem] overflow-hidden relative border border-white/5 shadow-[inset_0_0_100px_rgba(0,0,0,0.8)] group"
    >
      {/* Background Grid Estilo Obsidian */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none" 
        style={{ 
          backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)',
          backgroundSize: `${40 * zoom}px ${40 * zoom}px`,
          backgroundPosition: 'center'
        }} 
      />

      {/* Controles Flutuantes */}
      <div className="absolute top-8 left-8 z-10 flex flex-col gap-3">
         <div className="flex gap-2">
            <button onClick={() => setZoom(z => Math.min(3, z + 0.2))} className="w-10 h-10 bg-[#0a0c12]/80 backdrop-blur-xl hover:bg-primary-500 rounded-2xl flex items-center justify-center border border-white/10 text-white transition-all shadow-2xl group/btn">
                <i className="ph-bold ph-plus transition-transform group-hover/btn:scale-110" />
            </button>
            <button onClick={() => setZoom(z => Math.max(0.3, z - 0.2))} className="w-10 h-10 bg-[#0a0c12]/80 backdrop-blur-xl hover:bg-primary-500 rounded-2xl flex items-center justify-center border border-white/10 text-white transition-all shadow-2xl group/btn">
                <i className="ph-bold ph-minus transition-transform group-hover/btn:scale-110" />
            </button>
         </div>
         <button onClick={() => setZoom(1)} className="w-10 h-10 bg-[#0a0c12]/80 backdrop-blur-xl hover:bg-primary-500 rounded-2xl flex items-center justify-center border border-white/10 text-white transition-all shadow-2xl" title="Reset Zoom">
            <i className="ph-bold ph-arrows-out" />
         </button>
      </div>

      <div className="absolute top-8 right-10 z-10 text-right">
         <span className="text-[10px] font-black uppercase tracking-[0.5em] text-primary-500/50 block mb-1">Knowledge Ecosystem</span>
         <div className="flex items-center gap-2 justify-end">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[9px] font-bold text-gray-600 uppercase tracking-widest">Simulação Ativa</span>
         </div>
      </div>

      {/* Instrução de Navegação */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
         <div className="px-6 py-2 bg-white/5 backdrop-blur-md rounded-full border border-white/10 flex items-center gap-4 text-[9px] font-black uppercase tracking-widest text-gray-500">
            <span>Scroll para Zoom</span>
            <div className="w-1 h-1 rounded-full bg-gray-700" />
            <span>Arraste para navegar</span>
         </div>
      </div>

      <motion.svg 
        viewBox="0 0 1000 800" 
        className="w-full h-full cursor-grab active:cursor-grabbing"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <defs>
          <filter id="nodeGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="5" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
          <linearGradient id="linkGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="rgba(59, 130, 246, 0.2)" />
            <stop offset="100%" stopColor="rgba(59, 130, 246, 0.05)" />
          </linearGradient>
        </defs>

        <g style={{ transform: `scale(${zoom})`, transformOrigin: 'center' }}>
          {/* Linhas de conexão com efeito de pulso */}
          {links.map((link, i) => {
            const s = getNodePos(link.source);
            const t = getNodePos(link.target);
            if (!s || !t) return null;
            return (
              <line
                key={`link-${i}`}
                x1={s.x}
                y1={s.y}
                x2={t.x}
                y2={t.y}
                stroke="rgba(255,255,255,0.08)"
                strokeWidth={1 / zoom}
                className="transition-all duration-300"
              />
            );
          })}

          {/* Nós com Gravitação e Interação */}
          {nodes.map((node) => {
            const isSelected = selectedNoteId === node.id;
            const hasLinks = links.some(l => l.source === node.id || l.target === node.id);
            
            return (
              <g
                key={node.id}
                onClick={() => onSelectNote(node.id)}
                className="cursor-pointer group/node"
              >
                {/* Aura de Conexão */}
                {isSelected && (
                  <circle
                    cx={node.x}
                    cy={node.y}
                    r={25}
                    fill="rgba(59, 130, 246, 0.1)"
                    className="animate-ping"
                  />
                )}

                <circle
                  cx={node.x}
                  cy={node.y}
                  r={isSelected ? 10 : hasLinks ? 6 : 4}
                  fill={isSelected ? '#3b82f6' : hasLinks ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.1)'}
                  stroke={isSelected ? 'rgba(59, 130, 246, 0.5)' : 'rgba(255,255,255,0.1)'}
                  strokeWidth={isSelected ? 4 : 1}
                  style={{ filter: isSelected ? 'url(#nodeGlow)' : 'none' }}
                  className="transition-all duration-300 group-hover/node:fill-primary-400"
                />
                
                <text
                  x={node.x}
                  y={node.y + (isSelected ? 25 : 18)}
                  textAnchor="middle"
                  className="text-[10px] font-bold pointer-events-none select-none uppercase tracking-widest transition-all duration-300"
                  style={{ 
                    fontSize: isSelected ? '11px' : '8px', 
                    fill: isSelected ? 'white' : 'rgba(255,255,255,0.2)',
                    opacity: isSelected || zoom > 0.8 ? 1 : 0
                  }}
                >
                  {node.title}
                </text>
              </g>
            );
          })}
        </g>
      </motion.svg>
    </div>
  );
};
