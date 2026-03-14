import React, { useState } from 'react';
import { 
  format, 
  addMonths, 
  subMonths, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  isToday
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, DollarSign, Package, Calendar as CalendarIcon, X } from 'lucide-react';
import { Client } from '../App';

interface CalendarViewProps {
  clients: Client[];
  onClientClick: (client: Client) => void;
}

type CalendarMode = 'finance' | 'production';

const getPlanPrice = (plan?: string) => {
  if (plan === 'Profissional') return 120;
  if (plan === 'Padrão') return 80;
  return 0;
};

export default function CalendarView({ clients, onClientClick }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [mode, setMode] = useState<CalendarMode>('finance');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Get events for a specific day based on the current mode
  const getEventsForDay = (day: Date) => {
    const dayString = format(day, 'yyyy-MM-dd');
    return clients.filter(client => {
      if (mode === 'finance') {
        return client.nextDueDate === dayString;
      } else {
        return client.deliveryDate === dayString;
      }
    });
  };

  const renderDaySummary = (day: Date, dayEvents: Client[]) => {
    if (dayEvents.length === 0) return null;

    if (mode === 'finance') {
      const expected = dayEvents.reduce((acc, c) => acc + getPlanPrice(c.plan), 0);
      const paid = dayEvents.reduce((acc, c) => acc + (c.paymentStatus === 'RECEIVED' ? getPlanPrice(c.plan) : 0), 0);
      const percentage = expected > 0 ? Math.round((paid / expected) * 100) : 0;

      return (
        <div className="mt-2 flex flex-col gap-1.5 w-full">
          <div className="text-xs font-bold text-primary-700 dark:text-primary-400 bg-primary-100 dark:bg-primary-900/30 px-2 py-1 rounded-md text-center">
            {dayEvents.length} {dayEvents.length === 1 ? 'cobrança' : 'cobranças'}
          </div>
          <div className="text-[11px] font-medium text-gray-600 dark:text-gray-300 px-1 flex justify-between">
            <span>Previsto:</span>
            <span>R$ {expected.toFixed(2)}</span>
          </div>
          <div className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 px-1 flex justify-between">
            <span>Pago:</span>
            <span>{percentage}%</span>
          </div>
          <div className="h-2 w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden mt-0.5">
            <div className="h-full bg-emerald-500 rounded-full transition-all duration-500" style={{ width: `${percentage}%` }} />
          </div>
        </div>
      );
    } else {
      const emDesenvolvimento = dayEvents.filter(c => c.status === 'Em Desenvolvimento').length;
      const ativos = dayEvents.filter(c => c.status === 'Ativo').length;

      return (
        <div className="mt-2 flex flex-col gap-1.5 w-full">
          <div className="text-xs font-bold text-blue-700 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30 px-2 py-1 rounded-md text-center">
            {dayEvents.length} {dayEvents.length === 1 ? 'entrega' : 'entregas'}
          </div>
          {emDesenvolvimento > 0 && (
            <div className="text-[11px] font-medium text-amber-600 dark:text-amber-400 px-1 flex justify-between">
              <span>Em dev:</span>
              <span>{emDesenvolvimento}</span>
            </div>
          )}
          {ativos > 0 && (
            <div className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 px-1 flex justify-between">
              <span>Ativos:</span>
              <span>{ativos}</span>
            </div>
          )}
        </div>
      );
    }
  };

  return (
    <div className="h-full flex flex-col bg-white dark:bg-[#0a0a0a] rounded-3xl border border-gray-200 dark:border-white/10 overflow-hidden relative">
      {/* Header */}
      <div className="p-6 border-b border-gray-200 dark:border-white/10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="flex items-center space-x-4">
          <div className="p-3 bg-primary-500/10 text-primary-500 rounded-xl">
            <CalendarIcon size={24} />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white capitalize">
              {format(currentDate, 'MMMM yyyy', { locale: ptBR })}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Visão geral de {mode === 'finance' ? 'recebimentos e cobranças' : 'entregas e produção'}
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-4">
          {/* Mode Toggle - Highly Visible */}
          <div className="flex bg-gray-100 dark:bg-white/5 p-1.5 rounded-xl w-full sm:w-auto">
            <button
              onClick={() => setMode('finance')}
              className={`flex-1 sm:flex-none flex items-center justify-center space-x-2 px-5 py-2.5 rounded-lg text-sm font-bold transition-all ${
                mode === 'finance' 
                  ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/30' 
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-white/10'
              }`}
            >
              <DollarSign size={18} />
              <span>Financeiro</span>
            </button>
            <button
              onClick={() => setMode('production')}
              className={`flex-1 sm:flex-none flex items-center justify-center space-x-2 px-5 py-2.5 rounded-lg text-sm font-bold transition-all ${
                mode === 'production' 
                  ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30' 
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-white/10'
              }`}
            >
              <Package size={18} />
              <span>Produção</span>
            </button>
          </div>

          {/* Month Navigation */}
          <div className="flex items-center space-x-2 bg-gray-100 dark:bg-white/5 p-1.5 rounded-xl">
            <button 
              onClick={prevMonth}
              className="p-2 rounded-lg hover:bg-white dark:hover:bg-[#1a1a1a] text-gray-600 dark:text-gray-300 shadow-sm transition-all"
            >
              <ChevronLeft size={20} />
            </button>
            <button 
              onClick={() => setCurrentDate(new Date())}
              className="px-4 py-2 text-sm font-bold rounded-lg hover:bg-white dark:hover:bg-[#1a1a1a] text-gray-700 dark:text-gray-200 shadow-sm transition-all"
            >
              Hoje
            </button>
            <button 
              onClick={nextMonth}
              className="p-2 rounded-lg hover:bg-white dark:hover:bg-[#1a1a1a] text-gray-600 dark:text-gray-300 shadow-sm transition-all"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="flex-1 overflow-auto p-6 bg-gray-50/50 dark:bg-black/20">
        <div className="grid grid-cols-7 gap-4 mb-4">
          {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
            <div key={day} className="text-center text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              {day}
            </div>
          ))}
        </div>
        
        <div className="grid grid-cols-7 gap-4 auto-rows-[minmax(140px,auto)]">
          {/* Empty cells for days before the start of the month */}
          {Array.from({ length: monthStart.getDay() }).map((_, index) => (
            <div key={`empty-${index}`} className="rounded-3xl border border-transparent p-3 opacity-50 bg-gray-100/50 dark:bg-white/[0.02]" />
          ))}

          {/* Days of the month */}
          {daysInMonth.map(day => {
            const dayEvents = getEventsForDay(day);
            const isCurrentDay = isToday(day);
            const hasEvents = dayEvents.length > 0;
            
            return (
              <div 
                key={day.toString()} 
                onClick={() => hasEvents && setSelectedDate(day)}
                className={`rounded-3xl border p-3 flex flex-col transition-all ${
                  isCurrentDay 
                    ? 'border-primary-500/50 bg-primary-500/5 dark:bg-primary-500/10 shadow-sm' 
                    : 'border-gray-200 dark:border-white/10 bg-white dark:bg-white/5'
                } ${
                  hasEvents ? 'cursor-pointer hover:border-primary-400 dark:hover:border-primary-500/50 hover:shadow-md hover:-translate-y-0.5' : ''
                }`}
              >
                <div className="flex justify-between items-start mb-1">
                  <span className={`text-sm font-bold w-8 h-8 flex items-center justify-center rounded-full ${
                    isCurrentDay 
                      ? 'bg-primary-500 text-white shadow-md shadow-primary-500/30' 
                      : 'text-gray-700 dark:text-gray-300'
                  }`}>
                    {format(day, 'd')}
                  </span>
                </div>
                
                <div className="flex-1 flex flex-col justify-center">
                  {renderDaySummary(day, dayEvents)}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Day Details Modal */}
      {selectedDate && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-md" onClick={() => setSelectedDate(null)}>
          <div className="bg-gray-100 dark:bg-[#0a0a0a] rounded-3xl shadow-2xl w-full max-w-2xl flex flex-col border border-gray-200 dark:border-white/10 overflow-hidden max-h-[85vh]" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-white/10 bg-white dark:bg-[#1a1a1a]">
              <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                  {mode === 'finance' ? 'Cobranças' : 'Entregas'}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {format(selectedDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                </p>
              </div>
              <button onClick={() => setSelectedDate(null)} className="p-2 bg-gray-100 dark:bg-white/5 rounded-full text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors"><X size={20} /></button>
            </div>
            
            <div className="p-6 overflow-y-auto custom-scrollbar flex flex-col gap-3">
              {getEventsForDay(selectedDate).length === 0 ? (
                <div className="text-center text-gray-500 py-8">Nenhum registro para este dia.</div>
              ) : (
                getEventsForDay(selectedDate).map(client => (
                  <div 
                    key={client.id} 
                    onClick={() => { setSelectedDate(null); onClientClick(client); }}
                    className="flex items-center justify-between p-4 rounded-2xl border border-gray-200 dark:border-white/10 hover:border-primary-500/50 cursor-pointer transition-all bg-white dark:bg-white/5 shadow-sm hover:shadow-md group"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-xl ${mode === 'finance' ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400 group-hover:bg-emerald-200 dark:group-hover:bg-emerald-900/50' : 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 group-hover:bg-blue-200 dark:group-hover:bg-blue-900/50'} transition-colors`}>
                        {client.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-bold text-gray-900 dark:text-white text-lg">{client.name}</div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">{client.plan} • {client.status}</div>
                      </div>
                    </div>
                    
                    {mode === 'finance' ? (
                      <div className="text-right">
                        <div className="font-bold text-gray-900 dark:text-white text-lg">R$ {getPlanPrice(client.plan).toFixed(2)}</div>
                        <div className={`text-xs font-bold px-2.5 py-1 rounded-md inline-block mt-1 ${client.paymentStatus === 'RECEIVED' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : client.paymentStatus === 'OVERDUE' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'}`}>
                          {client.paymentStatus === 'RECEIVED' ? 'Pago' : client.paymentStatus === 'OVERDUE' ? 'Atrasado' : 'Pendente'}
                        </div>
                      </div>
                    ) : (
                      <div className="text-right">
                        <div className={`text-xs font-bold px-3 py-1.5 rounded-lg inline-block ${client.status === 'Ativo' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : client.status === 'Em Desenvolvimento' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'}`}>
                          {client.status}
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
