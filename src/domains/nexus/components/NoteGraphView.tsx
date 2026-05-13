import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion } from 'framer-motion';
import { NexusNote } from '@store/useNexusStore';

interface Node {
  id: string;
  title: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  fx?: number; // Força externa (drag)
  fy?: number;
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
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const requestRef = useRef<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  // Inicializar/Sincronizar nós e links
  useEffect(() => {
    setNodes(prev => {
      const newNodes = notes.map(note => {
        const existing = prev.find(p => p.id === note.id);
        if (existing) return { ...existing, title: note.title || 'Sem título' };
        return {
          id: note.id,
          title: note.title || 'Sem título',
          x: Math.random() * 600 + 200,
          y: Math.random() * 400 + 200,
          vx: 0,
          vy: 0,
        };
      });
      return newNodes;
    });

    const newLinks: Link[] = [];
    notes.forEach(note => {
      const linkMatches = note.content.match(/\[\[(.*?)\]\]/g);
      if (linkMatches) {
        linkMatches.forEach(match => {
          const targetTitle = match.slice(2, -2).trim().toLowerCase();
          const targetNote = notes.find(n => (n.title || '').toLowerCase() === targetTitle);
          if (targetNote && targetNote.id !== note.id) {
            newLinks.push({ source: note.id, target: targetNote.id });
          }
        });
      }
    });
    setLinks(newLinks);
  }, [notes]);

  // Simulação de Física
  const simulate = () => {
    setNodes(prevNodes => {
      if (prevNodes.length === 0) return prevNodes;

      const nextNodes = prevNodes.map(node => ({ ...node }));
      const centerX = 500;
      const centerY = 400;
      const friction = 0.85;
      const repulsion = 1500;
      const attraction = 0.02;
      const gravity = 0.005;

      // 1. Repulsão (Coulomb's Law)
      for (let i = 0; i < nextNodes.length; i++) {
        for (let j = i + 1; j < nextNodes.length; j++) {
          const n1 = nextNodes[i];
          const n2 = nextNodes[j];
          const dx = n1.x - n2.x;
          const dy = n1.y - n2.y;
          const distSq = dx * dx + dy * dy + 1;
          const f = repulsion / distSq;
          const fx = (dx / Math.sqrt(distSq)) * f;
          const fy = (dy / Math.sqrt(distSq)) * f;
          
          if (!n1.fx) { n1.vx += fx; n1.vy += fy; }
          if (!n2.fx) { n2.vx -= fx; n2.vy -= fy; }
        }
      }

      // 2. Atração (Hooke's Law)
      links.forEach(link => {
        const s = nextNodes.find(n => n.id === link.source);
        const t = nextNodes.find(n => n.id === link.target);
        if (s && t) {
          const dx = s.x - t.x;
          const dy = s.y - t.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const f = (dist - 100) * attraction;
          const fx = (dx / dist) * f;
          const fy = (dy / dist) * f;

          if (!s.fx) { s.vx -= fx; s.vy -= fy; }
          if (!t.fx) { t.vx += fx; t.vy += fy; }
        }
      });

      // 3. Atualizar Posições
      nextNodes.forEach(node => {
        if (node.id === draggingNodeId && node.fx !== undefined && node.fy !== undefined) {
          node.x = node.fx;
          node.y = node.fy;
          node.vx = 0;
          node.vy = 0;
        } else {
          // Gravidade central
          node.vx += (centerX - node.x) * gravity;
          node.vy += (centerY - node.y) * gravity;

          node.vx *= friction;
          node.vy *= friction;
          node.x += node.vx;
          node.y += node.vy;
        }
      });

      return nextNodes;
    });

    requestRef.current = requestAnimationFrame(simulate);
  };

  useEffect(() => {
    requestRef.current = requestAnimationFrame(simulate);
    return () => { if (requestRef.current) cancelAnimationFrame(requestRef.current); };
  }, [draggingNodeId, links]);

  // Manipulação de Drag & Drop
  const handleMouseDown = (e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation();
    setDraggingNodeId(nodeId);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!draggingNodeId || !svgRef.current) return;
    
    const CTM = svgRef.current.getScreenCTM();
    if (!CTM) return;
    
    const x = (e.clientX - CTM.e) / CTM.a;
    const y = (e.clientY - CTM.f) / CTM.d;

    setNodes(prev => prev.map(n => n.id === draggingNodeId ? { ...n, fx: x, fy: y } : n));
  };

  const handleMouseUp = () => {
    if (draggingNodeId) {
      setNodes(prev => prev.map(n => n.id === draggingNodeId ? { ...n, fx: undefined, fy: undefined } : n));
      setDraggingNodeId(null);
    }
  };

  const getNodePos = (id: string) => nodes.find(n => n.id === id);

  return (
    <div 
      className="w-full h-full bg-[#030408] rounded-[3rem] overflow-hidden relative border border-white/5 shadow-2xl"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Background Grid Estilo Obsidian */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none" 
        style={{ 
          backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)',
          backgroundSize: `${40 * zoom}px ${40 * zoom}px`,
        }} 
      />

      {/* Controles */}
      <div className="absolute top-8 left-8 z-10 flex flex-col gap-2">
         <button onClick={() => setZoom(z => Math.min(3, z + 0.2))} className="w-10 h-10 bg-white/5 hover:bg-white/10 rounded-xl flex items-center justify-center border border-white/10 text-white"><i className="ph-bold ph-plus" /></button>
         <button onClick={() => setZoom(z => Math.max(0.3, z - 0.2))} className="w-10 h-10 bg-white/5 hover:bg-white/10 rounded-xl flex items-center justify-center border border-white/10 text-white"><i className="ph-bold ph-minus" /></button>
         <button onClick={() => setZoom(1)} className="w-10 h-10 bg-white/5 hover:bg-white/10 rounded-xl flex items-center justify-center border border-white/10 text-white"><i className="ph-bold ph-arrows-out" /></button>
      </div>

      <svg 
        ref={svgRef}
        viewBox="0 0 1000 800" 
        className="w-full h-full"
      >
        <g style={{ transform: `scale(${zoom})`, transformOrigin: 'center' }}>
          {/* Conexões */}
          {links.map((link, i) => {
            const s = getNodePos(link.source);
            const t = getNodePos(link.target);
            if (!s || !t) return null;
            return (
              <line
                key={`link-${i}`}
                x1={s.x} y1={s.y} x2={t.x} y2={t.y}
                stroke="rgba(255,255,255,0.1)"
                strokeWidth={1.5 / zoom}
              />
            );
          })}

          {/* Nós */}
          {nodes.map((node) => {
            const isSelected = selectedNoteId === node.id;
            const hasLinks = links.some(l => l.source === node.id || l.target === node.id);
            
            return (
              <g
                key={node.id}
                onMouseDown={(e) => handleMouseDown(e, node.id)}
                onClick={() => !draggingNodeId && onSelectNote(node.id)}
                className="cursor-pointer group/node"
              >
                <circle
                  cx={node.x}
                  cy={node.y}
                  r={isSelected ? 8 : hasLinks ? 5 : 3.5}
                  fill={isSelected ? '#3b82f6' : 'rgba(255,255,255,0.4)'}
                  className="transition-all duration-200"
                />
                <text
                  x={node.x}
                  y={node.y + 18}
                  textAnchor="middle"
                  className="text-[9px] font-bold pointer-events-none select-none uppercase tracking-widest"
                  style={{ fill: isSelected ? 'white' : 'rgba(255,255,255,0.3)', opacity: zoom > 0.6 ? 1 : 0 }}
                >
                  {node.title}
                </text>
              </g>
            );
          })}
        </g>
      </svg>
    </div>
  );
};
