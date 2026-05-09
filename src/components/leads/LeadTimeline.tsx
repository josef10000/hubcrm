import React from 'react';
import { LeadActivity, LeadStatus } from '@/types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { PhoneCall, Users, MessageSquare, ArrowRight, FileText, Star } from 'lucide-react';

const STATUS_ORDER: LeadStatus[] = ['Novo', 'Em Contato', 'Proposta Enviada', 'Negociação', 'Convertido', 'Perdido'];

const ACTIVITY_ICONS: Record<string, React.ReactNode> = {
  call: <PhoneCall size={10} className="text-blue-400" />,
  meeting: <Users size={10} className="text-purple-400" />,
  note: <MessageSquare size={10} className="text-gray-400" />,
  message: <MessageSquare size={10} className="text-emerald-400" />,
  status_change: <ArrowRight size={10} className="text-primary-400" />,
};

interface LeadTimelineProps {
  activities: LeadActivity[];
  currentStatus: LeadStatus;
  createdAt: number;
}

export function LeadTimeline({ activities, currentStatus, createdAt }: LeadTimelineProps) {
  const currentIndex = STATUS_ORDER.indexOf(currentStatus);

  return (
    <div className="mt-3 space-y-2">
      {/* Mini pipeline de status */}
      <div className="flex items-center gap-0.5">
        {STATUS_ORDER.filter(s => s !== 'Perdido').map((status, idx) => {
          const reached = idx <= currentIndex && currentStatus !== 'Perdido';
          const isCurrent = status === currentStatus;
          return (
            <React.Fragment key={status}>
              <div
                title={status}
                className={`h-1.5 flex-1 rounded-full transition-all ${
                  isCurrent ? 'bg-primary-500 shadow-[0_0_6px] shadow-primary-500/60' :
                  reached ? 'bg-primary-500/40' : 'bg-white/10'
                }`}
              />
              {idx < STATUS_ORDER.filter(s => s !== 'Perdido').length - 1 && (
                <div className={`w-0.5 h-0.5 rounded-full ${reached ? 'bg-primary-500/40' : 'bg-white/10'}`} />
              )}
            </React.Fragment>
          );
        })}
        {currentStatus === 'Perdido' && (
          <div className="h-1.5 w-full rounded-full bg-red-500/50" title="Perdido" />
        )}
      </div>

      {/* Última atividade */}
      {activities && activities.length > 0 && (() => {
        const last = [...activities].sort((a, b) => b.date - a.date)[0];
        return (
          <div className="flex items-center gap-1.5 text-[10px] text-gray-500">
            <span>{ACTIVITY_ICONS[last.type] || <FileText size={10} />}</span>
            <span className="truncate max-w-[140px]">{last.text}</span>
            <span className="shrink-0">· {format(last.date, "dd/MM", { locale: ptBR })}</span>
          </div>
        );
      })()}
      {(!activities || activities.length === 0) && (
        <p className="text-[10px] text-gray-600">
          Desde {format(createdAt, "dd/MM/yy", { locale: ptBR })} · Sem atividades
        </p>
      )}
    </div>
  );
}
