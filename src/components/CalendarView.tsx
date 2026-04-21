import React, { useState, useEffect } from 'react';
import { 
  format, 
  addMonths, 
  subMonths, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  isToday,
  parseISO
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, DollarSign, Package, Calendar as CalendarIcon, X, AlertTriangle, Users } from 'lucide-react';
import { getPlanPrice } from '../helpers';
import { Client, UserProfile } from '../types';
import { VacationPeriod } from '../types/people';
import { useCRM } from '../contexts/CRMContext';
import { usePermissions } from '../hooks/usePermissions';

interface CalendarViewProps {
  clients: Client[];
  onClientClick: (client: Client) => void;
  role?: string;
}

type CalendarMode = 'finance' | 'production' | 'people';

interface Holiday {
  date: string;
  name: string;
  type: string;
}

export default function CalendarView({ clients, onClientClick, role }: CalendarViewProps) {
  const { vacations, teamProfiles } = useCRM();
  const { hasPermission } = usePermissions();
  const canSeeFinance = hasPermission('MANAGE_FINANCE');
  const canSeePeople = hasPermission('MANAGE_TEAM');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [mode, setMode] = useState<CalendarMode>(canSeeFinance ? 'finance' : 'production');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [holidays, setHolidays] = useState<Holiday[]>([]);

  // Fetch holidays from BrasilAPI when year changes
  useEffect(() => {
    const year = currentDate.getFullYear();
    fetch(`https://brasilapi.com.br/api/feriados/v1/${year}`)
      .then(r => r.json())
      .then((data: Holiday[]) => {
        if (Array.isArray(data)) setHolidays(data);
      })
      .catch(() => setHolidays([]));
  }, [currentDate.getFullYear()]);

  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Get events for a specific day based on the current mode
  const getEventsForDay = (day: Date) => {
    const dayString = format(day, 'yyyy-MM-dd');
    if (mode === 'finance') {
      return clients.filter(client => client.nextDueDate === dayString);
    } else if (mode === 'production') {
      return clients.filter(client => client.deliveryDate === dayString);
    } else {
      // People Mode combine vacations and anniversaries
      return []; // We handle this separately in render because they are different types
    }
  };

  const getDayPeopleEvents = (day: Date) => {
    // Normaliza para garantir que comparamos apenas data local, sem risco de deslocamento UTC
    const dayOfMonth = day.getDate();
    const month = day.getMonth() + 1;
    const monthDayStr = `${month.toString().padStart(2, '0')}-${dayOfMonth.toString().padStart(2, '0')}`;
    const dayStr = format(day, 'yyyy-MM-dd');
    
    const dayVacations = vacations.filter(v => v.status === 'Aprovado' && dayStr >= v.start && dayStr <= v.end);
    
    const dayAnniversaries = teamProfiles.filter(p => {
      if (!p.birthDate) return false;
      // Garante que pegamos os últimos 5 caracteres (MM-DD) independente do prefixo
      const bDate = p.birthDate.includes('/') ? p.birthDate.split('/').reverse().join('-') : p.birthDate;
      return bDate.endsWith(monthDayStr);
    });

    const dayWorkAnniversaries = teamProfiles.filter(p => {
      if (!p.startDate) return false;
      const sDate = p.startDate.includes('/') ? p.startDate.split('/').reverse().join('-') : p.startDate;
      // Compara MM-dd e ignora o ano da contratação (só mostra se não for o ano atual)
      return sDate.endsWith(monthDayStr) && sDate.substring(0, 4) !== format(day, 'yyyy');
    });
    
    return { vacations: dayVacations, anniversaries: dayAnniversaries, workAnniversaries: dayWorkAnniversaries };
  };

  const getHolidayForDay = (day: Date): Holiday | undefined => {
    const dayStr = format(day, 'yyyy-MM-dd');
    return holidays.find(h => h.date === dayStr);
  };

  const renderDaySummary = (day: Date, dayEvents: Client[]) => {
    const { vacations: dayVacations, anniversaries, workAnniversaries } = getDayPeopleEvents(day);
    const hasPeopleEvents = dayVacations.length > 0 || anniversaries.length > 0 || workAnniversaries.length > 0;

    if (mode === 'finance') {
      const expected = dayEvents.reduce((acc, c) => acc + getPlanPrice(c.plan, c.billingCycle, c.customMonthlyPrice, c.customSetupPrice), 0);
      const paid = dayEvents.reduce((acc, c) => acc + (c.paymentStatus === 'RECEIVED' ? getPlanPrice(c.plan, c.billingCycle, c.customMonthlyPrice, c.customSetupPrice) : 0), 0);
      const percentage = expected > 0 ? Math.round((paid / expected) * 100) : 0;

      return (
        <div className="mt-2 flex flex-col gap-1.5 w-full">
          {hasPeopleEvents && (
            <div className="flex gap-1 mb-1 px-1">
              {anniversaries.length > 0 && <span title="Aniversário do Time" className="text-xs">🎂</span>}
              {workAnniversaries.length > 0 && <span title="Membro do Time faz anos de empresa" className="text-xs">🚀</span>}
              {dayVacations.length > 0 && <span title="Colaborador Ausente" className="text-xs">🏖️</span>}
            </div>
          )}
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
          {getHolidayForDay(day) && (
            <div className="flex items-center gap-1 mt-1 text-[10px] text-amber-600 dark:text-amber-400 font-medium">
              <AlertTriangle size={10} />
              <span>Feriado!</span>
            </div>
          )}
        </div>
      );
    } else if (mode === 'production') {
      const emDesenvolvimento = dayEvents.filter(c => c.status === 'Em Desenvolvimento').length;
      const ativos = dayEvents.filter(c => c.status === 'Ativo').length;

      return (
        <div className="mt-2 flex flex-col gap-1.5 w-full">
          {hasPeopleEvents && (
            <div className="flex gap-1 mb-1 px-1">
              {anniversaries.length > 0 && <span title="Aniversário do Time" className="text-xs">🎂</span>}
              {workAnniversaries.length > 0 && <span title="Membro do Time faz anos de empresa" className="text-xs">🚀</span>}
              {dayVacations.length > 0 && <span title="Colaborador Ausente" className="text-xs">🏖️</span>}
            </div>
          )}
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
    } else {
      // People mode summary
      if (dayVacations.length === 0 && anniversaries.length === 0 && workAnniversaries.length === 0) return null;

      return (
        <div className="mt-2 flex flex-col gap-1 w-full">
          {anniversaries.map((p, i) => (
            <div key={`anniv-${i}`} className="text-[10px] font-bold text-pink-600 dark:text-pink-400 bg-pink-100 dark:bg-pink-900/30 px-1.5 py-0.5 rounded-md truncate" title={`Aniversário de ${p.displayName}`}>
              🎂 {p.displayName.split(' ')[0]}
            </div>
          ))}
          {workAnniversaries.map((p, i) => (
            <div key={`work-anniv-${i}`} className="text-[10px] font-bold text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30 px-1.5 py-0.5 rounded-md truncate" title={`Aniversário de Empresa: ${p.displayName}`}>
              🚀 {p.displayName.split(' ')[0]}
            </div>
          ))}
          {dayVacations.map((v, i) => {
             const user = teamProfiles.find(p => p.uid === v.userId);
             let typeIcon = '⚠️';
             if (v.type === 'Férias') typeIcon = '🏖️';
             else if (v.reason === 'Falta') typeIcon = '❌';
             else if (v.reason === 'Motivo Médico') typeIcon = '🏥';
             else if (v.reason === 'Licença Maternidade/Paternidade') typeIcon = '👶';
             else if (v.type === 'Folga') typeIcon = '🏠';

             const displayName = !canSeePeople && v.type !== 'Férias' ? 'Indisponível' : (user?.displayName.split(' ')[0] || 'Membro');
             return (
               <div key={`vac-${i}`} className="text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/30 px-1.5 py-0.5 rounded-md truncate" title={`${v.type}: ${user?.displayName}`}>
                 {typeIcon} {displayName}
               </div>
             );
          })}
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
              Visão geral de {mode === 'finance' ? 'recebimentos e cobranças' : mode === 'production' ? 'entregas e produção' : 'férias e aniversários da equipe'}
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-4">
          {/* Mode Toggle - Highly Visible */}
          {canSeeFinance && (
            <div className="flex bg-gray-100 dark:bg-white/5 p-1.5 rounded-xl w-full sm:w-auto">
              <button
                onClick={() => setMode('finance')}
                className={`flex-1 sm:flex-none flex items-center justify-center space-x-2 px-5 py-2.5 rounded-lg text-sm font-bold transition-all ${
                  mode === 'finance' 
                    ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/30' 
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-primary-500/20'
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
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-primary-500/20'
                }`}
              >
                <Package size={18} />
                <span>Produção</span>
              </button>
              {canSeePeople && (
                <button
                  onClick={() => setMode('people')}
                  className={`flex-1 sm:flex-none flex items-center justify-center space-x-2 px-5 py-2.5 rounded-lg text-sm font-bold transition-all ${
                    mode === 'people' 
                      ? 'bg-pink-500 text-white shadow-lg shadow-pink-500/30' 
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-primary-500/20'
                  }`}
                >
                  <Users size={18} />
                  <span>People</span>
                </button>
              )}
            </div>
          )}

          {/* Month Navigation */}
          <div className="flex items-center space-x-2 bg-gray-100 dark:bg-white/5 p-1.5 rounded-xl">
            <button 
              onClick={prevMonth}
              className="p-2 rounded-lg hover:bg-white dark:hover:bg-primary-500/20 text-gray-600 dark:text-gray-300 shadow-sm transition-all"
            >
              <ChevronLeft size={20} />
            </button>
            <button 
              onClick={() => setCurrentDate(new Date())}
              className="px-4 py-2 text-sm font-bold rounded-lg hover:bg-white dark:hover:bg-primary-500/20 text-gray-700 dark:text-gray-200 shadow-sm transition-all"
            >
              Hoje
            </button>
            <button 
              onClick={nextMonth}
              className="p-2 rounded-lg hover:bg-white dark:hover:bg-primary-500/20 text-gray-600 dark:text-gray-300 shadow-sm transition-all"
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
            const { vacations: dayVacations, anniversaries, workAnniversaries } = getDayPeopleEvents(day);
            const isCurrentDay = isToday(day);
            const hasEvents = mode === 'people' ? (dayVacations.length > 0 || anniversaries.length > 0 || workAnniversaries.length > 0) : dayEvents.length > 0;
            
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
                  {(() => {
                    const holiday = getHolidayForDay(day);
                    return holiday ? (
                      <span className="text-[9px] font-bold text-red-500 dark:text-red-400 bg-red-100 dark:bg-red-900/30 px-1.5 py-0.5 rounded-md truncate max-w-[90px]" title={holiday.name}>
                        🏖️ {holiday.name}
                      </span>
                    ) : null;
                  })()}
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
                  {mode === 'finance' ? 'Cobranças' : mode === 'people' ? 'Eventos de Equipe' : 'Entregas'}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {format(selectedDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                </p>
              </div>
              <button onClick={() => setSelectedDate(null)} className="p-2 bg-gray-100 dark:bg-white/5 rounded-full text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors"><X size={20} /></button>
            </div>
            
            <div className="p-6 overflow-y-auto custom-scrollbar flex flex-col gap-3">
              {(() => {
                const deliveryEvents = getEventsForDay(selectedDate);
                const { vacations: dayVacations, anniversaries, workAnniversaries } = getDayPeopleEvents(selectedDate);
                const hasNoEvents = deliveryEvents.length === 0 && dayVacations.length === 0 && anniversaries.length === 0 && workAnniversaries.length === 0;

                if (hasNoEvents) {
                  return <div className="text-center text-gray-500 py-8">Nenhum registro para este dia.</div>;
                }

                return (
                  <>
                    {/* People Events Section */}
                    {(anniversaries.length > 0 || workAnniversaries.length > 0 || dayVacations.length > 0) && (
                      <div className="flex flex-col gap-2 mb-4">
                        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">People & Culture</h4>
                        {anniversaries.map((p, i) => (
                          <div key={`anniv-modal-${i}`} className="flex items-center gap-3 p-3 rounded-xl bg-pink-100/50 dark:bg-pink-900/20 border border-pink-200 dark:border-pink-800/30">
                            <span className="text-xl">🎂</span>
                            <div>
                              <div className="font-bold text-pink-700 dark:text-pink-300">Aniversário: {p.displayName}</div>
                              <div className="text-xs text-pink-600/70 dark:text-pink-400/70">Parabéns pelo seu dia! 🎉</div>
                            </div>
                          </div>
                        ))}
                        {workAnniversaries.map((p, i) => (
                          <div key={`work-anniv-modal-${i}`} className="flex items-center gap-3 p-3 rounded-xl bg-blue-100/50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/30">
                            <span className="text-xl">🚀</span>
                            <div>
                              <div className="font-bold text-blue-700 dark:text-blue-300">Aniversário de Empresa: {p.displayName}</div>
                              <div className="text-xs text-blue-600/70 dark:text-blue-400/70">Celebrando mais um ano de jornada!</div>
                            </div>
                          </div>
                        ))}
                        {dayVacations.map((v, i) => {
                          const user = teamProfiles.find(p => p.uid === v.userId);
                          const typeIcon = v.type === 'Férias' ? '🏖️' : v.reason === 'Falta' ? '❌' : v.reason === 'Motivo Médico' ? '🏥' : '⚠️';
                          return (
                            <div key={`vac-modal-${i}`} className="flex items-center gap-3 p-3 rounded-xl bg-amber-100/50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/30">
                              <span className="text-xl">{typeIcon}</span>
                              <div>
                                <div className="font-bold text-amber-700 dark:text-amber-300">{v.type}: {user?.displayName || 'Membro'}</div>
                                <div className="text-xs text-amber-600/70 dark:text-amber-400/70">{v.status} • Até {format(parseISO(v.end), 'dd/MM', { locale: ptBR })}</div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Deliveries/Finance Section */}
                    {deliveryEvents.length > 0 && (
                      <div className="flex flex-col gap-2">
                        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">
                          {mode === 'finance' ? 'Financeiro' : 'Operacional'}
                        </h4>
                        {deliveryEvents.map(client => (
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
                                <div className="font-bold text-gray-900 dark:text-white text-lg">R$ {getPlanPrice(client.plan, client.billingCycle, client.customMonthlyPrice, client.customSetupPrice).toFixed(2)}</div>
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
                        ))}
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
