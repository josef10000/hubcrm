import React, { useState } from 'react';
import { format, addDays, startOfWeek, isSameDay, isWeekend, addMinutes, isAfter, startOfToday, startOfMonth, endOfMonth, eachDayOfInterval, endOfWeek, isSameMonth, subMonths, addMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar, Clock, Lock, CheckCircle2, AlertCircle, Plus, Trash2, ChevronLeft, ChevronRight, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Appointment, AvailabilityBlock } from '../../types/people';
import { useCRM } from '../../contexts/CRMContext';
import { useAuth } from '../../contexts/AuthContext';
import { clsx } from 'clsx';

interface AvailabilityCalendarProps {
  userId: string;
  isOwner: boolean;
}

const DURATIONS = [15, 30, 60] as const;
const START_HOUR = 8;
const END_HOUR = 22; // Agora até as 21:00-21:30

export default function AvailabilityCalendar({ userId, isOwner }: AvailabilityCalendarProps) {
  const { userProfile } = useAuth();
  const { appointments, availabilityBlocks, handleRequestAppointment, handleUpdateAppointmentStatus, handleSaveAvailabilityBlock, handleDeleteAvailabilityBlock } = useCRM();
  
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [view, setView] = useState<'month' | 'day'>('month');
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [requestData, setRequestData] = useState<Partial<Appointment>>({
    duration: 30,
    meetingName: '',
  });
  const [blockData, setBlockData] = useState<Partial<AvailabilityBlock>>({
    reason: '',
    isPrivate: false
  });
  const [isBlockModalOpen, setIsBlockModalOpen] = useState(false);

  const today = startOfToday();
  
  // Datas para o mês atual
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 }); // Domingo
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
  const monthDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  // Filtrar dados do usuário selecionado
  const userAppointments = appointments.filter(a => (a.targetId === userId || a.requesterId === userId) && a.status === 'approved');
  const userBlocks = availabilityBlocks.filter(b => b.userId === userId);
  const pendingRequests = appointments.filter(a => a.targetId === userId && a.status === 'pending');

  const getTimeSlots = () => {
    const slots = [];
    for (let hour = START_HOUR; hour < END_HOUR; hour++) {
      slots.push(`${hour}:00`);
      slots.push(`${hour}:30`);
    }
    return slots;
  };

  const handleOpenSlotAction = (day: Date, time: string) => {
    const [hours, minutes] = time.split(':').map(Number);
    const slotDate = new Date(day);
    slotDate.setHours(hours, minutes, 0, 0);
    const ts = slotDate.getTime();

    if (isOwner) {
      setBlockData({
        startTime: ts,
        endTime: addMinutes(slotDate, 30).getTime(),
        reason: '',
        isPrivate: false
      });
      setIsBlockModalOpen(true);
      return;
    }
    
    // Validar antecedência de 24h para agendamentos
    const minTime = addDays(new Date(), 1);
    if (!isAfter(slotDate, minTime)) {
      alert('Respeite a antecedência mínima de 24h para novos agendamentos.');
      return;
    }

    setRequestData({
      ...requestData,
      targetId: userId,
      startTime: ts,
    });
    setIsRequestModalOpen(true);
  };

  return (
    <div className="flex flex-col gap-6 w-full">
      {/* Header do Calendário */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 bg-white/40 dark:bg-white/5 backdrop-blur-xl border border-white/20 rounded-3xl shadow-sm">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-blue-500/10 rounded-2xl">
            <Calendar className="w-6 h-6 text-blue-500" />
          </div>
          <div>
            <h3 className="text-xl font-semibold dark:text-white">
              {format(selectedDate, 'MMMM yyyy', { locale: ptBR })}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Gerencie seus horários e conecte-se com a equipe
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-gray-100 dark:bg-white/10 p-1.5 rounded-2xl">
          {view === 'month' ? (
            <>
              <button 
                onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                className="p-2 hover:bg-white/50 dark:hover:bg-white/5 rounded-xl transition-colors text-gray-500"
              >
                <ChevronLeft size={18} />
              </button>
              <button 
                onClick={() => setCurrentMonth(new Date())}
                className="px-4 py-2 text-sm font-bold text-blue-600 dark:text-blue-400 hover:bg-white/50 dark:hover:bg-white/5 rounded-xl"
              >
                Hoje
              </button>
              <button 
                onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                className="p-2 hover:bg-white/50 dark:hover:bg-white/5 rounded-xl transition-colors text-gray-500"
              >
                <ChevronRight size={18} />
              </button>
            </>
          ) : (
            <button
              onClick={() => setView('month')}
              className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-xl text-sm font-bold shadow-lg shadow-blue-500/20 hover:scale-105 transition-all"
            >
              <ArrowLeft size={16} />
              Voltar ao Mês
            </button>
          )}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {view === 'month' ? (
          <motion.div
            key="month"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="grid grid-cols-7 border border-white/20 rounded-[2.5rem] overflow-hidden bg-white/20 dark:bg-black/20 backdrop-blur-md shadow-2xl"
          >
            {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
              <div key={day} className="py-4 text-center text-[10px] uppercase font-black text-gray-400 tracking-widest border-b border-white/10 bg-white/5">
                {day}
              </div>
            ))}
            {monthDays.map(day => {
              const isCurrentMonth = isSameMonth(day, monthStart);
              const isCurrentDay = isSameDay(day, new Date());
              const isWeekendDay = isWeekend(day);
              
              // Contar agendamentos/pendentes para bolinhas indicadoras
              const dayTsRange = { 
                start: new Date(day).setHours(0,0,0,0), 
                end: new Date(day).setHours(23,59,59,999) 
              };
              const dayAppointments = userAppointments.filter(a => a.startTime >= dayTsRange.start && a.startTime <= dayTsRange.end);
              const dayBlocks = userBlocks.filter(b => b.startTime >= dayTsRange.start && b.startTime <= dayTsRange.end);

              return (
                <button
                  key={day.toISOString()}
                  onClick={() => {
                    if (!isCurrentMonth) return;
                    setSelectedDate(day);
                    setView('day');
                  }}
                  disabled={!isCurrentMonth}
                  className={clsx(
                    "h-24 p-3 border-r border-b border-white/10 flex flex-col items-start gap-1 transition-all relative group",
                    !isCurrentMonth ? "opacity-20 bg-transparent grayscale" : "hover:bg-white/10",
                    isCurrentDay && "bg-blue-500/10",
                    isWeekendDay && isCurrentMonth && "bg-gray-500/5 cursor-not-allowed"
                  )}
                >
                  <span className={clsx(
                    "text-sm font-black",
                    isCurrentDay ? "text-blue-500" : isCurrentMonth ? "dark:text-white" : "text-gray-400",
                    isWeekendDay && "text-gray-500"
                  )}>
                    {format(day, 'd')}
                  </span>
                  
                  <div className="mt-auto flex flex-wrap gap-1">
                    {dayAppointments.length > 0 && <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />}
                    {dayBlocks.length > 0 && <div className="w-1.5 h-1.5 rounded-full bg-red-500/50" />}
                  </div>

                  {isCurrentMonth && !isWeekendDay && (
                    <div className="absolute inset-0 border-2 border-blue-500/0 group-hover:border-blue-500/20 rounded-[inherit] transition-all" />
                  )}
                </button>
              );
            })}
          </motion.div>
        ) : (
          <motion.div
            key="day"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className={clsx(
              "grid border border-white/20 rounded-[2.5rem] overflow-hidden bg-white/20 dark:bg-black/20 backdrop-blur-md shadow-2xl relative grid-cols-2"
            )}
          >
        {/* Adicionando Estilos de Scrollbar Customizada */}
        <style dangerouslySetInnerHTML={{ __html: `
          .calendar-scroll::-webkit-scrollbar {
            width: 6px;
          }
          .calendar-scroll::-webkit-scrollbar-track {
            background: transparent;
          }
          .calendar-scroll::-webkit-scrollbar-thumb {
            background: rgba(59, 130, 246, 0.2);
            border-radius: 10px;
          }
          .calendar-scroll::-webkit-scrollbar-thumb:hover {
            background: rgba(59, 130, 246, 0.4);
          }
          .dark .calendar-scroll::-webkit-scrollbar-thumb {
            background: rgba(255, 255, 255, 0.1);
          }
          .dark .calendar-scroll::-webkit-scrollbar-thumb:hover {
            background: rgba(255, 255, 255, 0.2);
          }
        `}} />

        {/* Container de Scroll Único */}
        <div className="col-span-full calendar-scroll overflow-y-auto max-h-[650px] grid grid-cols-inherit">
          {/* Coluna de Horários (Sticky Left) */}
          <div className="border-r border-white/10 pt-16 flex flex-col bg-white/5 dark:bg-black/5 sticky left-0 z-10 backdrop-blur-sm">
            {getTimeSlots().map(time => (
              <div key={time} className="h-20 flex items-start justify-center border-b border-white/5 text-[10px] font-bold text-gray-400 uppercase tracking-widest pt-2">
                {time}
              </div>
            ))}
          </div>

          {/* Coluna do Dia Único */}
          <div key={selectedDate.toISOString()} className={clsx(
            "flex flex-col border-r border-white/10 last:border-r-0 bg-blue-500/5"
          )}>
            {/* Cabeçalho do Dia (Sticky) */}
            <div className="h-16 flex flex-col items-center justify-center border-b border-white/10 bg-white/80 dark:bg-black/80 backdrop-blur-md sticky top-0 z-20">
              <span className="text-[10px] uppercase font-bold text-gray-400 tracking-tighter">
                {format(selectedDate, 'EEEE', { locale: ptBR })}
              </span>
              <span className="text-lg font-black dark:text-white">
                {format(selectedDate, 'dd')}
              </span>
            </div>

            {/* Slots de Tempo */}
            {getTimeSlots().map((time) => {
              const [h, m] = time.split(':').map(Number);
              const slotDateTime = new Date(selectedDate);
              slotDateTime.setHours(h, m, 0, 0);
              const ts = slotDateTime.getTime();

              const app = userAppointments.find(a => a.startTime === ts);
              const block = userBlocks.find(b => ts >= b.startTime && ts < b.endTime);
              const pending = pendingRequests.find(a => a.startTime === ts);

              return (
                <div 
                  key={time} 
                  onClick={() => !app && !block && !pending && handleOpenSlotAction(selectedDate, time)}
                  className="h-20 border-b border-white/5 relative group cursor-pointer hover:bg-white/5 transition-colors"
                >
                  {/* Visual do Agendamento */}
                  {app && (
                    <div className="absolute inset-1 rounded-xl bg-blue-500/20 border border-blue-500/30 p-2 flex flex-col gap-1 overflow-hidden backdrop-blur-sm z-10 shadow-lg group-hover:scale-[1.02] transition-transform">
                      <div className="flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-blue-500" />
                        <span className="text-[9px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider truncate">
                          {app.meetingName}
                        </span>
                      </div>
                      <span className="text-[8px] text-gray-500 font-medium truncate italic">
                        {app.duration} min
                      </span>
                    </div>
                  )}

                  {/* Visual do Bloqueio */}
                  {block && (
                    <div className="absolute inset-1 rounded-xl bg-red-500/10 border border-red-500/20 p-2 flex items-center justify-center z-10 backdrop-blur-sm grayscale opacity-80">
                      <Lock className="w-4 h-4 text-red-500/50" />
                      {!block.isPrivate && (
                        <span className="absolute bottom-1 text-[8px] font-bold text-red-500/40 uppercase truncate px-1">
                          {block.reason || 'Ocupado'}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Requisicão Pendente */}
                  {pending && (
                    <div className="absolute inset-1 rounded-xl bg-amber-500/10 border border-amber-500/30 p-2 flex flex-col gap-1 animate-pulse z-10">
                      <div className="flex items-center gap-1">
                        <AlertCircle className="w-3 h-3 text-amber-500" />
                        <span className="text-[9px] font-bold text-amber-600 uppercase truncate">
                          Solicitação
                        </span>
                      </div>
                    </div>
                  )}

                  {!app && !block && !pending && isOwner && (
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <Lock className="w-4 h-4 text-red-500/30" />
                    </div>
                  )}

                  {!app && !block && !pending && !isOwner && isAfter(slotDateTime, addDays(new Date(), 1)) && (
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <Plus className="w-5 h-5 text-blue-500/50" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </motion.div>
      )}
    </AnimatePresence>

      {/* Modal de Solicitação (Simplificado aqui) */}
      <AnimatePresence>
        {isRequestModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white dark:bg-gray-900 w-full max-w-md rounded-[2.5rem] shadow-2xl border border-white/20 p-8"
            >
              <h2 className="text-2xl font-bold mb-6 dark:text-white flex items-center gap-2">
                <Clock className="w-6 h-6 text-blue-500" />
                Agendar Reunião
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 block">
                    Nome da Reunião
                  </label>
                  <input
                    type="text"
                    value={requestData.meetingName}
                    onChange={e => setRequestData({ ...requestData, meetingName: e.target.value })}
                    className="w-full bg-gray-100 dark:bg-white/5 border border-transparent focus:border-blue-500 rounded-2xl px-4 py-3 outline-none transition-all dark:text-white"
                    placeholder="Ex: Alinhamento de Projeto"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 block">
                    Duração
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {DURATIONS.map(d => (
                      <button
                        key={d}
                        onClick={() => setRequestData({ ...requestData, duration: d })}
                        className={clsx(
                          "py-3 rounded-2xl font-bold text-sm transition-all border",
                          requestData.duration === d 
                            ? "bg-blue-500 text-white border-blue-500 shadow-lg translate-y-[-2px]" 
                            : "bg-gray-100 dark:bg-white/5 text-gray-500 border-transparent hover:bg-gray-200"
                        )}
                      >
                        {d} min
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-4 flex gap-3">
                  <button
                    onClick={() => setIsRequestModalOpen(false)}
                    className="flex-1 py-4 text-gray-500 font-bold hover:bg-gray-100 dark:hover:bg-white/5 rounded-2xl transition-all"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={() => {
                      handleRequestAppointment(requestData);
                      setIsRequestModalOpen(false);
                    }}
                    disabled={!requestData.meetingName}
                    className="flex-1 py-4 bg-blue-600 text-white font-bold rounded-2xl hover:bg-blue-700 shadow-lg shadow-blue-600/20 transition-all disabled:opacity-50"
                  >
                    Enviar Solicitação
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* Modal de Bloqueio (Apenas Dono) */}
      <AnimatePresence>
        {isBlockModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white dark:bg-gray-900 w-full max-w-md rounded-[2.5rem] shadow-2xl border border-white/20 p-8"
            >
              <h2 className="text-2xl font-bold mb-6 dark:text-white flex items-center gap-2">
                <Lock className="w-6 h-6 text-red-500" />
                Bloquear Horário
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 block">
                    Motivo (Opcional)
                  </label>
                  <input
                    type="text"
                    value={blockData.reason}
                    onChange={e => setBlockData({ ...blockData, reason: e.target.value })}
                    className="w-full bg-gray-100 dark:bg-white/5 border border-transparent focus:border-red-500 rounded-2xl px-4 py-3 outline-none transition-all dark:text-white"
                    placeholder="Ex: Foco Profundo, Médico..."
                  />
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-100 dark:bg-white/5 rounded-2xl">
                  <div>
                    <p className="text-sm font-bold dark:text-white">Bloqueio Privado</p>
                    <p className="text-[10px] text-gray-500">Ocultar o motivo da equipe</p>
                  </div>
                  <button
                    onClick={() => setBlockData({ ...blockData, isPrivate: !blockData.isPrivate })}
                    className={clsx(
                      "w-12 h-6 rounded-full transition-all relative",
                      blockData.isPrivate ? "bg-red-500" : "bg-gray-300 dark:bg-white/10"
                    )}
                  >
                    <div className={clsx(
                      "absolute top-1 w-4 h-4 rounded-full bg-white transition-all",
                      blockData.isPrivate ? "right-1" : "left-1"
                    )} />
                  </button>
                </div>

                <div className="pt-4 flex gap-3">
                  <button
                    onClick={() => setIsBlockModalOpen(false)}
                    className="flex-1 py-4 text-gray-500 font-bold hover:bg-gray-100 dark:hover:bg-white/5 rounded-2xl transition-all"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={() => {
                      handleSaveAvailabilityBlock(blockData);
                      setIsBlockModalOpen(false);
                    }}
                    className="flex-1 py-4 bg-red-600 text-white font-bold rounded-2xl hover:bg-red-700 shadow-lg shadow-red-600/20 transition-all"
                  >
                    Bloquear Agora
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
