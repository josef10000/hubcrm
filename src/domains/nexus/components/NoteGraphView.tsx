import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { NexusNote, PersonalGoal, NexusTask, PersonalLink } from '@store/useNexusStore';

interface Node {
  id: string;
  title: string;
  type: 'note' | 'goal' | 'task' | 'vault';
  x: number;
  y: number;
  vx: number;
  vy: number;
  fx?: number;
  fy?: number;
}

interface Link {
  source: string;
  target: string;
}

interface NoteGraphViewProps {
  notes: NexusNote[];
  goals: PersonalGoal[];
  tasks: NexusTask[];
  links: PersonalLink[];
  onSelectNode: (id: string, type: 'note' | 'goal' | 'task' | 'vault') => void;
  selectedId: string | null;
}

export const NoteGraphView: React.FC<NoteGraphViewProps> = ({ 
  notes, 
  goals, 
  tasks, 
  links: vaultLinks, 
  onSelectNode, 
  selectedId 
}) => {
  const [zoom, setZoom] = useState(1);
  const [nodes, setNodes] = useState<Node[]>([]);
  const [links, setLinks] = useState<Link[]>([]);
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const requestRef = useRef<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  // Inicializar/Sincronizar todos os tipos de entidades
  useEffect(() => {
    setNodes(prev => {
      const allEntities: { id: string, title: string, type: 'note' | 'goal' | 'task' | 'vault' }[] = [
        ...notes.map(n => ({ id: n.id, title: n.title || 'Sem título', type: 'note' as const })),
        ...goals.map(g => ({ id: g.id, title: g.label, type: 'goal' as const })),
        ...tasks.map(t => ({ id: t.id, title: t.label, type: 'task' as const })),
        ...vaultLinks.map(l => ({ id: l.id, title: l.label, type: 'vault' as const }))
      ];

      return allEntities.map(entity => {
        const existing = prev.find(p => p.id === entity.id);
        if (existing) return { ...existing, title: entity.title };
        return {
          ...entity,
          x: Math.random() * 600 + 200,
          y: Math.random() * 400 + 200,
          vx: 0,
          vy: 0,
        };
      });
    });

    const newLinks: Link[] = [];
    // Conexões via Backlinks [[Link]] nas Notas
    notes.forEach(note => {
      const linkMatches = note.content.match(/\[\[(.*?)\]\]/g);
      if (linkMatches) {
        linkMatches.forEach(match => {
          const targetTitle = match.slice(2, -2).trim().toLowerCase();
          
          // Procurar em todas as coleções
          const target = 
            notes.find(n => (n.title || '').toLowerCase() === targetTitle) ||
            goals.find(g => g.label.toLowerCase() === targetTitle) ||
            tasks.find(t => t.label.toLowerCase() === targetTitle) ||
            vaultLinks.find(l => l.label.toLowerCase() === targetTitle);

          if (target && target.id !== note.id) {
            newLinks.push({ source: note.id, target: target.id });
          }
        });
      }
    });
    setLinks(newLinks);
  }, [notes, goals, tasks, vaultLinks]);

  // Simulação de Física
  const simulate = () => {
    setNodes(prevNodes => {
      if (prevNodes.length === 0) return prevNodes;

      const nextNodes = prevNodes.map(node => ({ ...node }));
      const centerX = 500;
      const centerY = 400;
      const friction = 0.88;
      const repulsion = 1800;
      const attraction = 0.03;
      const gravity = 0.004;

      // 1. Repulsão
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

      // 2. Atração pelos links
      links.forEach(link => {
        const s = nextNodes.find(n => n.id === link.source);
        const t = nextNodes.find(n => n.id === link.target);
        if (s && t) {
          const dx = s.x - t.x;
          const dy = s.y - t.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const f = (dist - 120) * attraction;
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

  const getNodeColor = (type: Node['type']) => {
    switch (type) {
      case 'note': return '#3b82f6'; // Blue
      case 'goal': return '#10b981'; // Emerald
      case 'task': return '#f59e0b'; // Amber
      case 'vault': return '#8b5cf6'; // Violet
      default: return 'white';
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
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none" 
        style={{ 
          backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)',
          backgroundSize: `${40 * zoom}px ${40 * zoom}px`,
        }} 
      />

      {/* Legenda de Tipos */}
      <div className="absolute top-8 right-8 z-10 bg-black/40 backdrop-blur-md p-4 rounded-3xl border border-white/5 space-y-2">
         {[
           { type: 'note', label: 'Notas', color: '#3b82f6' },
           { type: 'goal', label: 'Metas', color: '#10b981' },
           { type: 'task', label: 'Tarefas', color: '#f59e0b' },
           { type: 'vault', label: 'Recursos', color: '#8b5cf6' }
         ].map(item => (
           <div key={item.type} className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
              <span className="text-[9px] font-black uppercase tracking-widest text-gray-400">{item.label}</span>
           </div>
         ))}
      </div>

      <svg 
        ref={svgRef}
        viewBox="0 0 1000 800" 
        className="w-full h-full"
      >
        <g style={{ transform: `scale(${zoom})`, transformOrigin: 'center' }}>
          {links.map((link, i) => {
            const s = getNodePos(link.source);
            const t = getNodePos(link.target);
            if (!s || !t) return null;
            return (
              <line
                key={`link-${i}`}
                x1={s.x} y1={s.y} x2={t.x} y2={t.y}
                stroke="rgba(255,255,255,0.08)"
                strokeWidth={1.5 / zoom}
              />
            );
          })}

          {nodes.map((node) => {
            const isSelected = selectedId === node.id;
            const color = getNodeColor(node.type);
            
            return (
              <g
                key={node.id}
                onMouseDown={(e) => handleMouseDown(e, node.id)}
                onClick={() => !draggingNodeId && onSelectNode(node.id, node.type)}
                className="cursor-pointer group/node"
              >
                {isSelected && (
                  <circle
                    cx={node.x}
                    cy={node.y}
                    r={18}
                    fill={color}
                    className="opacity-20 animate-pulse"
                  />
                )}
                <circle
                  cx={node.x}
                  cy={node.y}
                  r={isSelected ? 10 : 6}
                  fill={color}
                  className="transition-all duration-300 group-hover:scale-125"
                  style={{ filter: isSelected ? `drop-shadow(0 0 10px ${color})` : 'none' }}
                />
                <text
                  x={node.x}
                  y={node.y + 22}
                  textAnchor="middle"
                  className="text-[10px] font-black uppercase tracking-widest pointer-events-none select-none"
                  style={{ fill: isSelected ? 'white' : 'rgba(255,255,255,0.3)', opacity: zoom > 0.5 ? 1 : 0 }}
                >
                  {node.title}
                </text>
              </g>
            );
          })}
        </g>
      </svg>

      <div className="absolute bottom-8 left-8 z-10 flex gap-2">
         <button onClick={() => setZoom(z => Math.min(3, z + 0.2))} className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center text-white border border-white/10"><i className="ph ph-plus" /></button>
         <button onClick={() => setZoom(z => Math.max(0.3, z - 0.2))} className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center text-white border border-white/10"><i className="ph ph-minus" /></button>
      </div>
    </div>
  );
};
