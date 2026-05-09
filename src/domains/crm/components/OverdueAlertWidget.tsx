import React, { useMemo } from 'react';
import { AlertTriangle, TrendingDown, MessageSquare } from 'lucide-react';
import { Client } from '@/types';
import { useCRM } from '@crm/contexts/CRMContext';
import { useUI } from '@/contexts/UIContext';
import { differenceInDays, parseISO } from 'date-fns';
import { getPlanPrice } from '@/helpers';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

interface OverdueAlertWidgetProps {
  clients: Client[];
}

export function OverdueAlertWidget({ clients }: OverdueAlertWidgetProps) {
  const { setEditingClient } = useCRM();
  const { setIsModalOpen } = useUI();
  const navigate = useNavigate();

  // Clientes inadimplentes com mais de 30 dias
  const criticalOverdue = useMemo(() => {
    return clients
      .filter(c => c.status === 'Inadimplente' && c.nextDueDate)
      .map(c => ({
        ...c,
        daysOverdue: differenceInDays(new Date(), parseISO(c.nextDueDate!)),
        value: getPlanPrice(c.plan, c.billingCycle, c),
      }))
      .filter(c => c.daysOverdue > 30)
      .sort((a, b) => b.daysOverdue - a.daysOverdue);
  }, [clients]);

  const totalAtRisk = useMemo(() =>
    criticalOverdue.reduce((acc, c) => acc + c.value, 0),
  [criticalOverdue]);

  if (criticalOverdue.length === 0) return null;

  return (
    <div className="bg-gradient-to-br from-red-500/10 to-transparent border border-red-500/30 rounded-3xl p-5 shadow-xl shadow-red-500/10 mb-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2.5 bg-red-500/20 rounded-2xl">
          <TrendingDown size={20} className="text-red-400" />
        </div>
        <div className="flex-1">
          <h3 className="font-bold text-white text-sm">
            ⚠️ Inadimplência Crítica ({criticalOverdue.length} clientes &gt;30 dias)
          </h3>
          <p className="text-[11px] text-red-300/70">
            R$ {totalAtRisk.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} em risco
          </p>
        </div>
        <button
          onClick={() => navigate('/billing')}
          className="px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 text-red-400 text-xs font-bold rounded-xl transition-all"
        >
          Ver Cobrança
        </button>
      </div>

      <div className="space-y-2">
        {criticalOverdue.slice(0, 4).map(c => (
          <div
            key={c.id}
            className="flex items-center justify-between gap-3 p-3 bg-black/20 rounded-2xl border border-white/5 group"
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate">{c.name}</p>
              <p className="text-[10px] text-red-400/80">{c.daysOverdue} dias em atraso</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs font-bold text-red-300">
                R$ {c.value.toLocaleString('pt-BR')}
              </span>
              <button
                onClick={() => { setEditingClient(c); setIsModalOpen(true); }}
                title="Abrir cliente"
                className="p-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-all opacity-0 group-hover:opacity-100"
              >
                <AlertTriangle size={12} className="text-gray-400" />
              </button>
              <a
                href={`https://wa.me/${c.whatsapp?.replace(/\D/g, '')}`}
                rel="noopener noreferrer"
                target="_blank"
                onClick={e => e.stopPropagation()}
                className="p-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                title="Contatar via WhatsApp"
              >
                <MessageSquare size={12} className="text-emerald-400" />
              </a>
            </div>
          </div>
        ))}
        {criticalOverdue.length > 4 && (
          <button
            onClick={() => navigate('/billing')}
            className="w-full text-center text-[11px] text-gray-500 hover:text-gray-300 py-1 transition-colors"
          >
            + {criticalOverdue.length - 4} outros clientes em atraso crítico
          </button>
        )}
      </div>
    </div>
  );
}
