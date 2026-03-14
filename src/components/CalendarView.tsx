import React, { useState } from 'react';
import { 
  format, 
  addMonths, 
  subMonths, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  isSameMonth, 
  isSameDay, 
  isToday,
  parseISO
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, DollarSign, Package, Calendar as CalendarIcon } from 'lucide-react';
import { Client } from '../App';

interface CalendarViewProps {
  clients: Client[];
  onClientClick: (client: Client) => void;
}

type CalendarMode = 'finance' | 'production';

export default function CalendarView({ clients, onClientClick }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [mode, setMode] = useState<CalendarMode>('finance');

  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Get events for a specific day based on the current mode
  const getEventsForDay = (day: Date) => {
    return clients.filter(client => {
      if (mode === 'finance') {
        if (!client.nextDueDate) return false;
        const dueDate = parseISO(client.nextDueDate);
        return isSameDay(dueDate, day);
      } else {
        if (!client.deliveryDate) return false;
        const deliveryDate = parseISO(client.deliveryDate);
        return isSameDay(deliveryDate, day);
      }
    });
  };

  const renderEventBadge = (client: Client) => {
    if (mode === 'finance') {
      let statusColor = 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
      if (client.paymentStatus === 'RECEIVED') statusColor = 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      if (client.paymentStatus === 'OVERDUE') statusColor = 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      if (client.paymentStatus === 'PENDING') statusColor = 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';

      return (
        <div 
          key={client.id}
          onClick={(e) => { e.stopPropagation(); onClientClick(client); }}
          className={`text-xs px-2 py-1 rounded-md mb-1 truncate cursor-pointer hover:opacity-80 transition-opacity ${statusColor}`}
          title={`${client.name} - ${client.plan}`}
        >
          <div className="font-medium truncate">{client.name}</div>
          <div className="flex items-center justify-between mt-0.5">
            <span>{client.plan}</span>
            <span className="font-bold">
              {client.paymentStatus === 'RECEIVED' ? 'Pago' : 
               client.paymentStatus === 'OVERDUE' ? 'Atrasado' : 
               client.paymentStatus === 'PENDING' ? 'Pendente' : ''}
            </span>
          </div>
        </div>
      );
    } else {
      let statusColor = 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      if (client.status === 'Ativo') statusColor = 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400';
      if (client.status === 'Cancelado') statusColor = 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';

      return (
        <div 
          key={client.id}
          onClick={(e) => { e.stopPropagation(); onClientClick(client); }}
          className={`text-xs px-2 py-1 rounded-md mb-1 truncate cursor-pointer hover:opacity-80 transition-opacity ${statusColor}`}
          title={`${client.name} - Entrega`}
        >
          <div className="font-medium truncate">{client.name}</div>
          <div className="flex items-center justify-between mt-0.5">
            <span>Entrega</span>
          </div>
        </div>
      );
    }
  };

  return (
    <div className="h-full flex flex-col bg-white dark:bg-[#0a0a0a] rounded-3xl border border-gray-200 dark:border-white/10 overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-gray-200 dark:border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <div className="p-3 bg-primary-500/10 text-primary-500 rounded-xl">
            <CalendarIcon size={24} />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white capitalize">
              {format(currentDate, 'MMMM yyyy', { locale: ptBR })}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Gerencie seus prazos e recebimentos
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          {/* Mode Toggle */}
          <div className="flex bg-gray-100 dark:bg-white/5 p-1 rounded-xl">
            <button
              onClick={() => setMode('finance')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                mode === 'finance' 
                  ? 'bg-white dark:bg-[#1a1a1a] text-gray-900 dark:text-white shadow-sm' 
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:text-white'
              }`}
            >
              <DollarSign size={16} />
              <span>Financeiro</span>
            </button>
            <button
              onClick={() => setMode('production')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                mode === 'production' 
                  ? 'bg-white dark:bg-[#1a1a1a] text-gray-900 dark:text-white shadow-sm' 
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:text-white'
              }`}
            >
              <Package size={16} />
              <span>Produção</span>
            </button>
          </div>

          {/* Month Navigation */}
          <div className="flex items-center space-x-2">
            <button 
              onClick={prevMonth}
              className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-white/5 text-gray-500 dark:text-gray-400 transition-colors"
            >
              <ChevronLeft size={20} />
            </button>
            <button 
              onClick={() => setCurrentDate(new Date())}
              className="px-3 py-2 text-sm font-medium rounded-xl hover:bg-gray-100 dark:hover:bg-white/5 text-gray-700 dark:text-gray-300 transition-colors"
            >
              Hoje
            </button>
            <button 
              onClick={nextMonth}
              className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-white/5 text-gray-500 dark:text-gray-400 transition-colors"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="flex-1 overflow-auto p-6">
        <div className="grid grid-cols-7 gap-4 mb-4">
          {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
            <div key={day} className="text-center text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              {day}
            </div>
          ))}
        </div>
        
        <div className="grid grid-cols-7 gap-4 auto-rows-[minmax(120px,auto)]">
          {/* Empty cells for days before the start of the month */}
          {Array.from({ length: monthStart.getDay() }).map((_, index) => (
            <div key={`empty-${index}`} className="rounded-2xl border border-transparent p-2 opacity-50 bg-gray-50 dark:bg-white/[0.02]" />
          ))}

          {/* Days of the month */}
          {daysInMonth.map(day => {
            const dayEvents = getEventsForDay(day);
            const isCurrentDay = isToday(day);
            
            return (
              <div 
                key={day.toString()} 
                className={`rounded-2xl border p-2 flex flex-col transition-colors ${
                  isCurrentDay 
                    ? 'border-primary-500/50 bg-primary-500/5 dark:bg-primary-500/10' 
                    : 'border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 hover:border-gray-300 dark:hover:border-white/20'
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <span className={`text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full ${
                    isCurrentDay 
                      ? 'bg-primary-500 text-white' 
                      : 'text-gray-700 dark:text-gray-300'
                  }`}>
                    {format(day, 'd')}
                  </span>
                  {dayEvents.length > 0 && (
                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-white/10 px-1.5 py-0.5 rounded-md">
                      {dayEvents.length}
                    </span>
                  )}
                </div>
                
                <div className="flex-1 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                  {dayEvents.map(client => renderEventBadge(client))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
