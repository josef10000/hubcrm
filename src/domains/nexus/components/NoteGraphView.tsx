import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { NexusNote } from '@store/useNexusStore';

interface Node {
  id: string;
  title: string;
  x: number;
  y: number;
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
  
  const { nodes, links } = useMemo(() => {
    const nodes: Node[] = [];
    const links: Link[] = [];
    
    // Distribuir nós em círculo ou aleatoriamente para visualização básica
    const radius = Math.min(400, notes.length * 40 + 100);
    
    notes.forEach((note, index) => {
      const angle = (index / notes.length) * 2 * Math.PI;
      nodes.push({
        id: note.id,
        title: note.title || 'Sem título',
        x: Math.cos(angle) * radius + 500,
        y: Math.sin(angle) * radius + 400,
      });

      // Detectar links básicos [[Título]]
      const linkMatches = note.content.match(/\[\[(.*?)\]\]/g);
      if (linkMatches) {
        linkMatches.forEach(match => {
          const targetTitle = match.slice(2, -2);
          const targetNote = notes.find(n => n.title.toLowerCase() === targetTitle.toLowerCase());
          if (targetNote) {
            links.push({ source: note.id, target: targetNote.id });
          }
        });
      }
    });

    return { nodes, links };
  }, [notes]);

  const getNodePos = (id: string) => nodes.find(n => n.id === id);

  return (
    <div className="w-full h-full bg-[#050505] rounded-[3rem] overflow-hidden relative border border-white/5 shadow-inner">
      {/* Controles */}
      <div className="absolute top-6 left-6 z-10 flex gap-2">
         <button onClick={() => setZoom(z => Math.min(2, z + 0.1))} className="w-10 h-10 bg-white/5 hover:bg-white/10 rounded-xl flex items-center justify-center border border-white/10 text-white transition-all">
            <i className="ph ph-plus" />
         </button>
         <button onClick={() => setZoom(z => Math.max(0.5, z - 0.1))} className="w-10 h-10 bg-white/5 hover:bg-white/10 rounded-xl flex items-center justify-center border border-white/10 text-white transition-all">
            <i className="ph ph-minus" />
         </button>
      </div>

      <div className="absolute top-6 right-8 z-10">
         <span className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-500">Knowledge Graph</span>
      </div>

      <svg 
        viewBox="0 0 1000 800" 
        className="w-full h-full cursor-grab active:cursor-grabbing"
        style={{ transform: `scale(${zoom})`, transformOrigin: 'center' }}
      >
        <defs>
          <radialGradient id="nodeGradient">
            <stop offset="0%" stopColor="#3b82f6" />
            <stop offset="100%" stopColor="#1e3a8a" />
          </radialGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Linhas de conexão */}
        {links.map((link, i) => {
          const s = getNodePos(link.source);
          const t = getNodePos(link.target);
          if (!s || !t) return null;
          return (
            <motion.line
              key={`link-${i}`}
              x1={s.x}
              y1={s.y}
              x2={t.x}
              y2={t.y}
              stroke="rgba(255,255,255,0.05)"
              strokeWidth="1"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ duration: 1, delay: i * 0.05 }}
            />
          );
        })}

        {/* Nós */}
        {nodes.map((node) => {
          const isSelected = selectedNoteId === node.id;
          return (
            <motion.g
              key={node.id}
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              whileHover={{ scale: 1.1 }}
              onClick={() => onSelectNote(node.id)}
              className="cursor-pointer"
            >
              <circle
                cx={node.x}
                cy={node.y}
                r={isSelected ? 10 : 6}
                fill={isSelected ? '#3b82f6' : 'rgba(255,255,255,0.1)'}
                stroke={isSelected ? 'rgba(59, 130, 246, 0.5)' : 'rgba(255,255,255,0.2)'}
                strokeWidth={isSelected ? 4 : 1}
                style={{ filter: isSelected ? 'url(#glow)' : 'none' }}
              />
              <text
                x={node.x}
                y={node.y + 20}
                textAnchor="middle"
                className="text-[10px] font-bold fill-gray-500 pointer-events-none select-none uppercase tracking-widest"
                style={{ fontSize: isSelected ? '12px' : '9px', fill: isSelected ? 'white' : '#6b7280' }}
              >
                {node.title}
              </text>
            </motion.g>
          );
        })}
      </svg>
    </div>
  );
};
