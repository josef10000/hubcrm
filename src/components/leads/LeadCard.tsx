import React from 'react';
import { Phone, Mail, GripVertical, TrendingUp, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Lead } from '../../types';

interface LeadCardProps {
  lead: Lead;
  isDragged: boolean;
  tags: any[];
  onDragStart: (lead: Lead) => void;
  onDragEnd: () => void;
  onClick: (lead: Lead) => void;
}

export function LeadCard({ lead, isDragged, tags, onDragStart, onDragEnd, onClick }: LeadCardProps) {
  return (
    <div
      draggable
      onDragStart={() => onDragStart(lead)}
      onDragEnd={onDragEnd}
      onClick={() => onClick(lead)}
      className={`p-3 bg-white/[0.04] border border-white/10 rounded-xl cursor-grab active:cursor-grabbing hover:border-white/20 hover:bg-white/[0.06] transition-all group ${isDragged ? 'opacity-40 scale-95' : ''}`}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <h4 className="text-sm font-medium text-white truncate">{lead.name}</h4>
        <GripVertical className="w-4 h-4 text-gray-600 shrink-0 group-hover:text-gray-400 transition-colors" />
      </div>
      
      {lead.whatsapp && (
        <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-1">
          <Phone className="w-3 h-3" />
          <span>{lead.whatsapp}</span>
        </div>
      )}
      
      {lead.email && (
        <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-1">
          <Mail className="w-3 h-3" />
          <span className="truncate">{lead.email}</span>
        </div>
      )}
      
      {/* Quick Actions */}
      <div className="flex items-center gap-2 mt-3 mb-2">
         <button 
            onClick={(e) => { e.stopPropagation(); /* handleQuickProposal logic if needed */ }}
            className="flex-1 flex items-center justify-center gap-2 py-1.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20 rounded-lg text-[10px] font-bold transition-all shadow-sm active:scale-95"
         >
            <TrendingUp size={12} />
            Proposta 1-Clique
         </button>
      </div>

      <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/5">
        {lead.tagIds && lead.tagIds.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {lead.tagIds.map(tagId => {
              const tag = tags.find(t => t.id === tagId);
              if (!tag) return null;
              return (
                <div 
                  key={tagId} 
                  className="w-2 h-2 rounded-full shadow-sm"
                  style={{ backgroundColor: tag.color }}
                  title={tag.name}
                />
              );
            })}
          </div>
        )}
      </div>
      
      {lead.nextFollowUp && (
        <div className={`mt-2 flex items-center gap-1.5 text-[10px] font-bold px-2 py-1 rounded-lg border ${
          new Date(lead.nextFollowUp) < new Date() 
          ? 'bg-red-500/20 text-red-500 border-red-500/30' 
          : 'bg-blue-500/20 text-blue-500 border-blue-500/30'
        }`}>
          <Calendar size={12} />
          <span>{format(new Date(lead.nextFollowUp), "dd 'de' MMM", { locale: ptBR })}</span>
          {new Date(lead.nextFollowUp) < new Date() && <span className="uppercase ml-auto">Atrasado</span>}
        </div>
      )}
    </div>
  );
}
